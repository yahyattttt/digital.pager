import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID, createHash } from "crypto";
import QRCode from "qrcode";
import { GoogleAuth } from "google-auth-library";

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

let fcmAuth: GoogleAuth | null = null;

function getFCMAuth(): GoogleAuth | null {
  if (fcmAuth) return fcmAuth;
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!saJson) return null;
  try {
    const credentials = JSON.parse(saJson);
    fcmAuth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    return fcmAuth;
  } catch (e) {
    console.error("Failed to parse service account JSON:", e);
    return null;
  }
}

const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

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

      const googleAuth = getFCMAuth();
      if (!googleAuth) {
        return res.status(500).json({ message: "Firebase service account not configured" });
      }

      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId) {
        return res.status(500).json({ message: "Firebase project ID not configured" });
      }

      const client = await googleAuth.getClient();
      const accessTokenResponse = await client.getAccessToken();
      const accessToken = accessTokenResponse?.token;
      if (!accessToken) {
        return res.status(500).json({ message: "Failed to obtain access token" });
      }

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const storeUrl = storeId ? `${protocol}://${host}/s/${storeId}` : "/";

      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title: `${storeName || "Digital Pager"} - طلبك جاهز! 🔔`,
                body: `الطلب #${orderNumber || ""} جاهز! تفضل بالاستلام - Your order is ready!`,
              },
              webpush: {
                headers: {
                  Urgency: "high",
                },
                notification: {
                  icon: "/icon-192x192.png",
                  badge: "/icon-96x96.png",
                  requireInteraction: true,
                  vibrate: [500, 200, 500, 200, 800],
                  tag: "order-ready",
                  renotify: true,
                },
                fcm_options: {
                  link: storeUrl,
                },
              },
              data: {
                url: storeUrl,
                orderNumber: orderNumber || "",
                storeId: storeId || "",
                type: "order-ready",
              },
            },
          }),
        }
      );

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error("FCM V1 non-JSON response:", response.status, responseText.substring(0, 200));
        return res.status(502).json({ success: false, message: "FCM returned invalid response" });
      }

      if (response.ok) {
        console.log("FCM V1 push sent successfully:", result.name);
        return res.json({ success: true, result });
      } else {
        console.error("FCM V1 send error:", result);
        return res.status(response.status).json({ success: false, error: result });
      }
    } catch (error) {
      console.error("Push notification error:", error);
      return res.status(500).json({ message: "Failed to send push notification" });
    }
  });

  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const emailLower = email.toLowerCase().trim();
      const existing = otpStore.get(emailLower);
      if (existing && existing.expiresAt > Date.now() && (existing.expiresAt - Date.now()) > 4 * 60 * 1000) {
        return res.status(429).json({ message: "OTP already sent. Please wait before requesting a new one." });
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      otpStore.set(emailLower, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
      });

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.log(`[DEV] OTP for ${emailLower}: ${code}`);
        return res.json({ success: true, message: "OTP sent (dev mode - check server logs)" });
      }

      const { Resend } = await import("resend");
      const resend = new Resend(resendApiKey);

      await resend.emails.send({
        from: "Digital Pager <noreply@digitalpager.app>",
        to: emailLower,
        subject: "رمز التحقق - Digital Pager Verification Code",
        html: `
          <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #000; color: #fff; padding: 40px 30px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #FF0000; font-size: 24px; margin: 0;">Digital Pager</h1>
              <p style="color: #999; font-size: 14px; margin-top: 8px;">رمز التحقق من البريد الإلكتروني</p>
            </div>
            <div style="background: #111; border: 1px solid #333; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #999; font-size: 14px; margin: 0 0 12px 0;">رمز التحقق الخاص بك</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FF0000; font-family: monospace;">${code}</div>
              <p style="color: #666; font-size: 12px; margin: 12px 0 0 0;">صالح لمدة 5 دقائق</p>
            </div>
            <p style="color: #666; font-size: 12px; text-align: center;">
              إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.
              <br />If you didn't request this code, please ignore this email.
            </p>
          </div>
        `,
      });

      return res.json({ success: true, message: "OTP sent" });
    } catch (error) {
      console.error("Send OTP error:", error);
      return res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/verify-otp", (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
      }

      const emailLower = email.toLowerCase().trim();
      const entry = otpStore.get(emailLower);

      if (!entry) {
        return res.status(400).json({ message: "No OTP found. Please request a new one." });
      }

      if (entry.expiresAt < Date.now()) {
        otpStore.delete(emailLower);
        return res.status(400).json({ message: "OTP expired. Please request a new one." });
      }

      if (entry.attempts >= 5) {
        otpStore.delete(emailLower);
        return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
      }

      entry.attempts++;

      if (entry.code !== code.trim()) {
        return res.status(400).json({ message: "Invalid OTP code." });
      }

      otpStore.delete(emailLower);
      return res.json({ success: true, verified: true });
    } catch (error) {
      console.error("Verify OTP error:", error);
      return res.status(500).json({ message: "Verification failed" });
    }
  });

  return httpServer;
}
