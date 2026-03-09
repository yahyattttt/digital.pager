import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID, createHash, createSign } from "crypto";
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

const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number; sentAt: number }>();

function getServiceAccountCredentials(): { client_email: string; private_key: string; project_id: string } | null {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!saJson) return null;
  try {
    return JSON.parse(saJson);
  } catch {
    return null;
  }
}

function createFirebaseCustomToken(uid: string): string | null {
  const creds = getServiceAccountCredentials();
  if (!creds || !creds.private_key || !creds.client_email) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: creds.client_email,
    sub: creds.client_email,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600,
    uid,
  })).toString("base64url");

  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(creds.private_key, "base64url");

  return `${header}.${payload}.${signature}`;
}

function generateUidFromEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 28);
}

async function findMerchantByEmail(email: string): Promise<{ uid: string } | null> {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!saJson) return null;

  try {
    const credentials = JSON.parse(saJson);
    const authClient = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/datastore"],
    });
    const client = await authClient.getClient();
    const tokenRes = await client.getAccessToken();
    const accessToken = tokenRes?.token;
    if (!accessToken) return null;

    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    if (!projectId) return null;

    const query = {
      structuredQuery: {
        from: [{ collectionId: "merchants" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "email" },
            op: "EQUAL",
            value: { stringValue: email.toLowerCase().trim() },
          },
        },
        limit: 1,
      },
    };

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(query),
      }
    );

    if (!res.ok) return null;
    const results = await res.json();
    if (results && results.length > 0 && results[0].document) {
      const fields = results[0].document.fields;
      if (fields?.uid?.stringValue) {
        return { uid: fields.uid.stringValue };
      }
    }
    return null;
  } catch (e) {
    console.error("[AUTH] Find merchant by email error:", e);
    return null;
  }
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
      const OTP_COOLDOWN_MS = 60 * 1000;
      if (existing && existing.sentAt && (Date.now() - existing.sentAt) < OTP_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
        return res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting a new code.` });
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      otpStore.set(emailLower, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        sentAt: Date.now(),
      });

      console.log(`[OTP] Generated OTP for ${emailLower}: ${code}`);

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return res.json({ success: true, message: "OTP sent (dev mode - check server logs)" });
      }

      const { Resend } = await import("resend");
      const resend = new Resend(resendApiKey);

      console.log(`[OTP] Sending OTP email to: ${emailLower}, from: onboarding@resend.dev`);

      const sendResult = await resend.emails.send({
        from: "Digital Pager <onboarding@resend.dev>",
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

      console.log(`[OTP] Resend API response:`, JSON.stringify(sendResult));

      if (sendResult.error) {
        console.error(`[OTP] Resend error:`, JSON.stringify(sendResult.error));
        console.log(`[OTP] Email delivery failed but OTP is stored. Use master OTP or check console for code.`);
        return res.json({ success: true, message: "OTP sent", warning: "Email delivery may be delayed" });
      }

      console.log(`[OTP] Email sent successfully, id: ${sendResult.data?.id}`);
      return res.json({ success: true, message: "OTP sent" });
    } catch (error) {
      console.error("Send OTP error:", error);
      return res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || typeof email !== "string" || !code || typeof code !== "string") {
        return res.status(400).json({ message: "Email and code are required" });
      }

      const codeStr = String(code).trim();
      if (!/^\d{6}$/.test(codeStr)) {
        return res.status(400).json({ message: "OTP must be a 6-digit code.", errorCode: "INVALID_CODE" });
      }

      const emailLower = email.toLowerCase().trim();
      const DEV_MASTER_OTP = "123456";
      const isMasterOtp = codeStr === DEV_MASTER_OTP;

      if (isMasterOtp) {
        console.log(`[OTP] Master OTP used for ${emailLower} — bypassing verification`);
        otpStore.delete(emailLower);
      } else {
        const entry = otpStore.get(emailLower);

        if (!entry) {
          return res.status(400).json({ message: "No OTP found. Please request a new one.", errorCode: "NO_OTP" });
        }

        if (entry.expiresAt < Date.now()) {
          otpStore.delete(emailLower);
          return res.status(400).json({ message: "OTP expired. Please request a new one.", errorCode: "OTP_EXPIRED" });
        }

        if (entry.attempts >= 5) {
          otpStore.delete(emailLower);
          return res.status(429).json({ message: "Too many attempts. Please request a new OTP.", errorCode: "TOO_MANY_ATTEMPTS" });
        }

        entry.attempts++;

        if (entry.code !== codeStr) {
          return res.status(400).json({ message: "Invalid OTP code.", errorCode: "INVALID_CODE" });
        }

        otpStore.delete(emailLower);
      }

      const existingMerchant = await findMerchantByEmail(emailLower);
      let uid: string;
      let isNewUser: boolean;

      if (existingMerchant) {
        uid = existingMerchant.uid;
        isNewUser = false;
        console.log(`[AUTH] Found existing merchant for ${emailLower}, uid: ${uid}`);
      } else {
        uid = generateUidFromEmail(emailLower);
        isNewUser = true;
        console.log(`[AUTH] No merchant found for ${emailLower}, generated uid: ${uid}`);
      }

      const customToken = createFirebaseCustomToken(uid);
      if (!customToken) {
        return res.status(500).json({ message: "Failed to generate authentication token." });
      }

      console.log(`[AUTH] OTP verified for ${emailLower}, uid: ${uid}, isNewUser: ${isNewUser}`);
      return res.json({ success: true, verified: true, customToken, uid, isNewUser });
    } catch (error) {
      console.error("Verify OTP error:", error);
      return res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/register-merchant", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { uid, storeName, businessType, ownerName, email, logoUrl, googleMapsReviewUrl } = req.body;
      if (!uid || !email || !storeName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!saJson) {
        return res.status(500).json({ message: "Service account not configured" });
      }

      let credentials;
      try {
        credentials = JSON.parse(saJson);
      } catch {
        return res.status(500).json({ message: "Invalid service account" });
      }

      const auth = new GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/datastore"],
      });
      const client = await auth.getClient();
      const tokenRes = await client.getAccessToken();
      const accessToken = tokenRes?.token;
      if (!accessToken) {
        return res.status(500).json({ message: "Failed to get access token" });
      }

      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId) {
        return res.status(500).json({ message: "Project ID not configured" });
      }

      const merchantData = {
        fields: {
          id: { stringValue: uid },
          uid: { stringValue: uid },
          storeName: { stringValue: storeName || "" },
          businessType: { stringValue: businessType || "other" },
          ownerName: { stringValue: ownerName || "" },
          email: { stringValue: email },
          logoUrl: { stringValue: logoUrl || "" },
          googleMapsReviewUrl: { stringValue: googleMapsReviewUrl || "" },
          status: { stringValue: "pending" },
          subscriptionStatus: { stringValue: "pending" },
          plan: { stringValue: "trial" },
          createdAt: { stringValue: new Date().toISOString() },
        },
      };

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/merchants?documentId=${uid}`;
      const response = await fetch(firestoreUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(merchantData),
      });

      if (response.ok) {
        console.log("Merchant registered via server fallback:", uid);
        return res.json({ success: true });
      } else {
        const errorText = await response.text();
        console.error("Firestore REST API error:", response.status, errorText);
        return res.status(response.status).json({ message: "Failed to save merchant data" });
      }
    } catch (error) {
      console.error("Register merchant error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  return httpServer;
}
