import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID, createHash } from "crypto";
import QRCode from "qrcode";

const uploadDir = path.join(process.cwd(), "client", "public", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

function getFirebaseConfig() {
  const appId = process.env.VITE_FIREBASE_APP_ID || "";
  const senderIdMatch = appId.match(/^\d+:(\d+):/);
  const messagingSenderId = senderIdMatch ? senderIdMatch[1] : "";

  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
    appId,
    messagingSenderId,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/upload-logo", upload.single("logo"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  });

  app.get("/api/qr/:storeId", async (req, res) => {
    try {
      const { storeId } = req.params;
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const storeUrl = `${protocol}://${host}/s/${storeId}`;

      const qrBuffer = await QRCode.toBuffer(storeUrl, {
        type: "png",
        width: 512,
        margin: 2,
        color: {
          dark: "#FF0000",
          light: "#000000",
        },
        errorCorrectionLevel: "H",
      });

      res.set({
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="store-qr-${storeId}.png"`,
        "Cache-Control": "public, max-age=3600",
      });
      res.send(qrBuffer);
    } catch (error) {
      console.error("QR generation error:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  app.get("/api/firebase-config", (_req, res) => {
    res.json(getFirebaseConfig());
  });

  app.get("/firebase-messaging-sw.js", (_req, res) => {
    res.redirect(301, "/sw.js");
  });

  app.get("/api/push-auth", (_req, res) => {
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      return res.status(500).json({ message: "Not configured" });
    }
    const pushToken = createHash("sha256").update(sessionSecret + ":push-auth").digest("hex").substring(0, 32);
    res.json({ pushToken });
  });

  app.post("/api/send-push", async (req, res) => {
    try {
      const sessionSecret = process.env.SESSION_SECRET;
      if (!sessionSecret) {
        return res.status(500).json({ message: "Not configured" });
      }
      const expectedToken = createHash("sha256").update(sessionSecret + ":push-auth").digest("hex").substring(0, 32);
      const authHeader = req.headers["x-push-auth"];
      if (authHeader !== expectedToken) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { token, storeName, orderNumber, storeId } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Missing FCM token" });
      }

      const serverKey = process.env.FCM_SERVER_KEY;
      if (!serverKey || serverKey.length < 10) {
        return res.status(500).json({ message: "FCM server key not configured" });
      }

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const storeUrl = storeId ? `${protocol}://${host}/s/${storeId}` : undefined;

      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: `${storeName || "Digital Pager"} - طلبك جاهز! 🔔`,
            body: `الطلب #${orderNumber || ""} جاهز! تفضل بالاستلام - Your order is ready!`,
            icon: "/icon-192x192.png",
            click_action: storeUrl || "/",
          },
          data: {
            url: storeUrl || "/",
            orderNumber: orderNumber || "",
            storeId: storeId || "",
            type: "order-ready",
          },
          webpush: {
            headers: {
              Urgency: "high",
            },
            notification: {
              requireInteraction: "true",
              vibrate: [500, 200, 500, 200, 800],
              tag: "order-ready",
              renotify: "true",
            },
          },
        }),
      });

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error("FCM non-JSON response:", response.status, responseText.substring(0, 200));
        return res.status(502).json({ success: false, message: "FCM returned invalid response" });
      }

      if (response.ok) {
        return res.json({ success: true, result });
      } else {
        console.error("FCM send error:", result);
        return res.status(response.status).json({ success: false, error: result });
      }
    } catch (error) {
      console.error("Push notification error:", error);
      return res.status(500).json({ message: "Failed to send push notification" });
    }
  });

  return httpServer;
}
