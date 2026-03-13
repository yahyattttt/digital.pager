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

const crUploadDir = path.join(process.cwd(), "client", "public", "uploads", "commercial_registers");
if (!fs.existsSync(crUploadDir)) {
  fs.mkdirSync(crUploadDir, { recursive: true });
}

const crStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, crUploadDir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${randomUUID()}.pdf`);
  },
});

const crUpload = multer({
  storage: crStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

async function logSystemError(merchantId: string, errorType: string, errorMessage: string): Promise<void> {
  const baseUrl = getApiKeyBaseUrl();
  if (!baseUrl || !getApiKey()) return;

  const docId = randomUUID();
  const data = {
    fields: {
      merchantId: { stringValue: merchantId || "unknown" },
      errorType: { stringValue: errorType },
      errorMessage: { stringValue: errorMessage },
      timestamp: { stringValue: new Date().toISOString() },
      resolved: { booleanValue: false },
    },
  };

  try {
    await apikeyFetch(`${baseUrl}/system_errors/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("[ERROR-LOG] Failed to log system error:", err);
  }
}

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

async function getFirestoreAccessToken(): Promise<string | null> {
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
    return tokenRes?.token || null;
  } catch {
    return null;
  }
}

function getFirestoreBaseUrl(): string | null {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

function getApiKey(): string | null {
  return process.env.VITE_FIREBASE_API_KEY || null;
}

function getApiKeyBaseUrl(): string | null {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

async function apikeyFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Firebase API key not configured");
  const sep = url.includes("?") ? "&" : "?";
  return fetch(`${url}${sep}key=${apiKey}`, options);
}

async function generateOnlineOrderId(merchantId: string, _accessToken?: string, _baseUrl?: string): Promise<{ orderNumber: string; currentYY: string }> {
  const baseUrl = getApiKeyBaseUrl();
  if (!baseUrl) throw new Error("Firestore not configured");

  const currentYY = new Date().getFullYear().toString().slice(-2);
  const counterUrl = `${baseUrl}/merchants/${merchantId}/settings/orderCounter`;

  let currentCounter = 1;
  let existingFields: Record<string, any> = {};

  const counterRes = await apikeyFetch(counterUrl);
  if (counterRes.ok) {
    const counterDoc = await counterRes.json();
    if (counterDoc.fields) {
      existingFields = counterDoc.fields;
      const storedYear = existingFields.onlineCounterYear?.stringValue || "";
      if (storedYear === currentYY) {
        const raw = existingFields.onlineCounter?.integerValue || existingFields.nextOrderNumber?.integerValue || "1";
        currentCounter = parseInt(String(raw), 10);
        if (isNaN(currentCounter) || currentCounter < 1) currentCounter = 1;
      }
    }
  }

  const orderNum = currentCounter;
  const newFields = { ...existingFields };
  newFields.onlineCounter = { integerValue: String(orderNum + 1) };
  newFields.onlineCounterYear = { stringValue: currentYY };

  const patchRes = await apikeyFetch(counterUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: newFields }),
  });
  if (!patchRes.ok) throw new Error("Failed to update order counter");

  return { orderNumber: String(orderNum), currentYY };
}

function buildCloudOrderId(cityCode: string, yearYY: string, orderNumber: string): string {
  const paddedNum = parseInt(orderNumber, 10).toString().padStart(3, "0");
  return `${cityCode || "00"}${yearYY}${paddedNum}`;
}

function sanitizeEmailKey(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 40);
}

async function saveOtpToFirestore(email: string, code: string): Promise<boolean> {
  const baseUrl = getApiKeyBaseUrl();
  if (!baseUrl || !getApiKey()) return false;

  const docId = sanitizeEmailKey(email);
  const now = Date.now();
  const data = {
    fields: {
      email: { stringValue: email.toLowerCase().trim() },
      code: { stringValue: code },
      expiresAt: { integerValue: String(now + 10 * 60 * 1000) },
      attempts: { integerValue: "0" },
      sentAt: { integerValue: String(now) },
    },
  };

  try {
    const res = await apikeyFetch(`${baseUrl}/otps/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.error(`[OTP] Firestore save failed:`, res.status, await res.text());
      return false;
    }
    console.log(`[OTP] Saved OTP to Firestore (otps collection) for ${email}, docId: ${docId}`);
    return true;
  } catch (err) {
    console.error(`[OTP] Firestore save error:`, err);
    return false;
  }
}

async function getOtpFromFirestore(email: string): Promise<{ code: string; expiresAt: number; attempts: number; sentAt: number } | null> {
  const baseUrl = getApiKeyBaseUrl();
  if (!baseUrl || !getApiKey()) return null;

  const docId = sanitizeEmailKey(email);

  try {
    const res = await apikeyFetch(`${baseUrl}/otps/${docId}`);
    if (!res.ok) {
      console.log(`[OTP] Firestore lookup: no OTP doc found in 'otps' for ${email} (status ${res.status})`);
      return null;
    }
    const doc = await res.json();
    if (!doc.fields) return null;
    return {
      code: doc.fields.code?.stringValue || "",
      expiresAt: parseInt(doc.fields.expiresAt?.integerValue || "0"),
      attempts: parseInt(doc.fields.attempts?.integerValue || "0"),
      sentAt: parseInt(doc.fields.sentAt?.integerValue || "0"),
    };
  } catch (err) {
    console.error(`[OTP] Firestore lookup error:`, err);
    return null;
  }
}

async function updateOtpAttempts(email: string, attempts: number): Promise<void> {
  const baseUrl = getApiKeyBaseUrl();
  if (!baseUrl || !getApiKey()) return;

  const docId = sanitizeEmailKey(email);
  try {
    await apikeyFetch(`${baseUrl}/otps/${docId}?updateMask.fieldPaths=attempts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { attempts: { integerValue: String(attempts) } } }),
    });
  } catch {}
}

async function deleteOtpFromFirestore(email: string): Promise<void> {
  const baseUrl = getApiKeyBaseUrl();
  if (!baseUrl || !getApiKey()) return;

  const docId = sanitizeEmailKey(email);
  try {
    await apikeyFetch(`${baseUrl}/otps/${docId}`, { method: "DELETE" });
    console.log(`[OTP] Deleted OTP from Firestore (otps) for ${email}`);
  } catch {}
}

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
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId || !getApiKey()) return null;

  try {
    const base = getApiKeyBaseUrl()!;
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

    const res = await apikeyFetch(
      `${base}:runQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      }
    );

    if (!res.ok) return null;
    const results = await res.json();
    if (Array.isArray(results) && results.length > 0 && results[0].document) {
      const docName: string = results[0].document.name;
      const docId = docName.split("/").pop()!;
      // Always use the real Firestore document ID as the canonical UID
      return { uid: docId };
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

  app.post("/api/upload-image", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  });

  app.post("/api/upload-cr", crUpload.single("cr"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const filePath = path.join(crUploadDir, req.file.filename);
    try {
      const buffer = fs.readFileSync(filePath, { encoding: null });
      const pdfMagic = buffer.slice(0, 5).toString("ascii");
      if (pdfMagic !== "%PDF-") {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: "Invalid PDF file" });
      }
    } catch {
      return res.status(500).json({ message: "File validation failed" });
    }
    const url = `/uploads/commercial_registers/${req.file.filename}`;
    return res.json({ url });
  });

  app.post("/api/receipt-qr", async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== "string" || content.length > 500) {
        return res.status(400).json({ message: "Invalid or missing content (max 500 chars)" });
      }
      const dataUrl = await QRCode.toDataURL(content, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      });
      res.json({ dataUrl });
    } catch (error) {
      console.error("Receipt QR generation error:", error);
      res.status(500).json({ message: "Failed to generate QR" });
    }
  });

  app.patch("/api/driver-control/:merchantId/:orderId", async (req, res) => {
    try {
      const { merchantId, orderId } = req.params;
      const { action } = req.body;

      if (!action || !["delivered", "failed"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const docUrl = `${baseUrl}/merchants/${merchantId}/whatsappOrders/${orderId}`;
      const docRes = await fetch(docUrl, {
        headers: {},
      });
      if (!docRes.ok) return res.status(404).json({ message: "Order not found" });

      const doc = await docRes.json();
      const currentStatus = doc.fields?.status?.stringValue || "";
      const expiredStatuses = ["completed", "archived", "uncollected", "rejected"];
      if (expiredStatuses.includes(currentStatus)) {
        return res.status(409).json({ message: "هذا الرابط لم يعد صالحاً لأن الطلب مكتمل" });
      }

      const allowedStatuses = ["ready", "preparing", "awaiting_confirmation", "pending_verification"];
      if (!allowedStatuses.includes(currentStatus)) {
        return res.status(409).json({ message: "حالة الطلب لا تسمح بهذا الإجراء" });
      }

      const now = new Date().toISOString();
      let updateFields: Record<string, any>;

      if (action === "delivered") {
        updateFields = {
          status: { stringValue: "completed" },
          completedAt: { stringValue: now },
          driverDeliveredAt: { stringValue: now },
        };
      } else {
        updateFields = {
          status: { stringValue: "uncollected" },
          uncollectedAt: { stringValue: now },
          driverFailedAt: { stringValue: now },
        };
      }

      const patchRes = await fetch(`${docUrl}?updateMask.fieldPaths=status&updateMask.fieldPaths=${action === "delivered" ? "completedAt&updateMask.fieldPaths=driverDeliveredAt" : "uncollectedAt&updateMask.fieldPaths=driverFailedAt"}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: { ...doc.fields, ...updateFields } }),
      });

      if (!patchRes.ok) {
        return res.status(500).json({ message: "Failed to update order status" });
      }

      res.json({
        success: true,
        action,
        newStatus: action === "delivered" ? "completed" : "uncollected",
      });
    } catch (err: any) {
      console.error("Driver control error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/qr/:storeId", async (req, res) => {
    try {
      const { storeId } = req.params;
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const storeUrl = `${protocol}://${host}/check-order/${storeId}`;

      const qrBuffer = await QRCode.toBuffer(storeUrl, {
        type: "png",
        width: 512,
        margin: 4,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      });

      res.set({
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="store-qr-${storeId}.png"`,
        "Cache-Control": "no-cache",
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
        await logSystemError(req.body?.storeId || "unknown", "push_auth_failed", "Push auth token mismatch - unauthorized request");
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { token, storeName, orderNumber, storeId } = req.body;
      if (!token) {
        await logSystemError(storeId || "unknown", "invalid_token", "Missing FCM token in push request");
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
        await logSystemError(storeId || "unknown", "fcm_invalid_response", `FCM returned non-JSON response: ${response.status}`);
        return res.status(502).json({ success: false, message: "FCM returned invalid response" });
      }

      if (response.ok) {
        console.log("FCM V1 push sent successfully:", result.name);
        return res.json({ success: true, result });
      } else {
        console.error("FCM V1 send error:", result);
        await logSystemError(storeId || "unknown", "fcm_send_error", `FCM send failed (${response.status}): ${JSON.stringify(result).substring(0, 500)}`);
        return res.status(response.status).json({ success: false, error: result });
      }
    } catch (error) {
      console.error("Push notification error:", error);
      await logSystemError(req.body?.storeId || "unknown", "push_exception", `Push notification exception: ${error instanceof Error ? error.message : String(error)}`);
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

      const primaryAdmin = (process.env.SUPER_ADMIN_EMAIL || "yahiatohary@hotmail.com").toLowerCase();
      const SANDBOX_EMAILS = ["admin@test.com", "merchant@test.com", primaryAdmin];
      if (SANDBOX_EMAILS.includes(emailLower)) {
        return res.json({ success: true, message: "OTP sent" });
      }

      const existing = await getOtpFromFirestore(emailLower);
      const OTP_COOLDOWN_MS = 60 * 1000;
      if (existing && existing.sentAt && (Date.now() - existing.sentAt) < OTP_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
        return res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting a new code.` });
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));

      const saved = await saveOtpToFirestore(emailLower, code);
      if (!saved) {
        console.error(`[OTP] Failed to save OTP to Firestore for ${emailLower}`);
        return res.status(500).json({ message: "Failed to store OTP. Please try again." });
      }

      console.log(`[OTP] Generated OTP for ${emailLower}: ${code} (stored in Firestore)`);

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return res.json({ success: true, message: "OTP sent (dev mode - check server logs)" });
      }

      const { Resend } = await import("resend");
      const resend = new Resend(resendApiKey);

      console.log(`[OTP] Sending OTP email to: ${emailLower}, from: onboarding@digitalpager.net`);

    const sendResult = await resend.emails.send({
      from: "Digital Pager <onboarding@digitalpager.net>",
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
              <p style="color: #666; font-size: 12px; margin: 12px 0 0 0;">صالح لمدة 10 دقائق / Valid for 10 minutes</p>
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

      const primaryAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "yahiatohary@hotmail.com").toLowerCase();
      const SANDBOX_ACCOUNTS: Record<string, "admin" | "merchant"> = {
        "admin@test.com": "admin",
        "merchant@test.com": "merchant",
        [primaryAdminEmail]: "admin",
      };
      const sandboxRole = SANDBOX_ACCOUNTS[emailLower];
      const SANDBOX_OTP = "123456";

      if (sandboxRole && codeStr === SANDBOX_OTP) {
        if (sandboxRole === "admin") {
          const uid = generateUidFromEmail(emailLower);
          const customToken = createFirebaseCustomToken(uid);
          if (!customToken) return res.status(500).json({ message: "Failed to generate authentication token." });
          return res.json({ success: true, verified: true, customToken, uid, isNewUser: false, isAdmin: true });
        }
        const existingMerchant = await findMerchantByEmail(emailLower);
        const uid = existingMerchant?.uid || generateUidFromEmail(emailLower);
        const customToken = createFirebaseCustomToken(uid);
        if (!customToken) return res.status(500).json({ message: "Failed to generate authentication token." });
        return res.json({
          success: true,
          verified: true,
          customToken,
          uid,
          isNewUser: !existingMerchant,
          isAdmin: false,
        });
      }

      const DEV_MASTER_OTP = "123456";
      const isMasterOtp = process.env.NODE_ENV !== "production" && codeStr === DEV_MASTER_OTP;

      if (isMasterOtp) {
        console.log(`[OTP] Master OTP used for ${emailLower} — skipping Firestore check entirely`);
      } else {
        const entry = await getOtpFromFirestore(emailLower);
        console.log(`[OTP-VERIFY] Email: ${emailLower}, OTP found: ${!!entry}, Expired: ${entry ? entry.expiresAt < Date.now() : "N/A"}, Attempts: ${entry?.attempts ?? "N/A"}`);

        if (!entry) {
          return res.status(400).json({ message: "No OTP found. Please request a new one.", errorCode: "NO_OTP" });
        }

        if (entry.expiresAt < Date.now()) {
          await deleteOtpFromFirestore(emailLower);
          return res.status(400).json({ message: "OTP expired. Please request a new one.", errorCode: "OTP_EXPIRED" });
        }

        if (entry.attempts >= 5) {
          await deleteOtpFromFirestore(emailLower);
          return res.status(429).json({ message: "Too many attempts. Please request a new OTP.", errorCode: "TOO_MANY_ATTEMPTS" });
        }

        await updateOtpAttempts(emailLower, entry.attempts + 1);

        if (entry.code !== codeStr) {
          console.log(`[OTP-VERIFY] Code mismatch for ${emailLower}`);
          return res.status(400).json({ message: "Invalid OTP code.", errorCode: "INVALID_CODE" });
        }

        await deleteOtpFromFirestore(emailLower);
      }

      const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "yahiatohary@hotmail.com").toLowerCase();

      if (emailLower === SUPER_ADMIN_EMAIL) {
        const uid = generateUidFromEmail(emailLower);
        const customToken = createFirebaseCustomToken(uid);
        if (!customToken) {
          return res.status(500).json({ message: "Failed to generate authentication token." });
        }
        console.log(`[AUTH] Super admin login for ${emailLower}, uid: ${uid}`);
        return res.json({ success: true, verified: true, customToken, uid, isNewUser: false, isAdmin: true });
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

  const SUPER_ADMIN_EMAIL_GLOBAL = (process.env.SUPER_ADMIN_EMAIL || "yahiatohary@hotmail.com").toLowerCase();

  async function isAdminRequest(req: any): Promise<boolean> {
    const adminEmail = req.headers["x-admin-email"];
    if (!adminEmail || typeof adminEmail !== "string") return false;
    const emailLower = adminEmail.toLowerCase().trim();
    return emailLower === SUPER_ADMIN_EMAIL_GLOBAL || emailLower === "admin@test.com";
  }

  app.post("/api/admin/impersonate/:merchantId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { merchantId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const docRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`, {
        headers: {},
      });
      if (!docRes.ok) {
        return res.status(404).json({ message: "Merchant not found" });
      }
      const doc = await docRes.json();
      const fields = doc.fields;
      if (!fields) {
        return res.status(404).json({ message: "Merchant data missing" });
      }

      const uid = fields.uid?.stringValue || merchantId;
      const email = fields.email?.stringValue || "";

      const customToken = createFirebaseCustomToken(uid);
      if (!customToken) {
        return res.status(500).json({ message: "Failed to generate token" });
      }

      return res.json({ success: true, uid, email, customToken });
    } catch (error) {
      console.error("Impersonate error:", error);
      return res.status(500).json({ message: "Impersonation failed" });
    }
  });

  app.get("/api/admin/settings", async (_req, res) => {
    try {
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const docRes = await apikeyFetch(`${baseUrl}/systemSettings/global`, {
        headers: {},
      });

      if (!docRes.ok) {
        return res.json({
          appName: "Digital Pager",
          globalLogoUrl: "",
          supportWhatsapp: "966500000000",
          globalThemeColor: "#ef0000",
        });
      }

      const doc = await docRes.json();
      const fields = doc.fields || {};
      return res.json({
        appName: fields.appName?.stringValue || "Digital Pager",
        globalLogoUrl: fields.globalLogoUrl?.stringValue || "",
        supportWhatsapp: fields.supportWhatsapp?.stringValue || "966500000000",
        globalThemeColor: fields.globalThemeColor?.stringValue || "#ef0000",
      });
    } catch (error) {
      console.error("Get settings error:", error);
      return res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { appName, globalLogoUrl, supportWhatsapp, globalThemeColor } = req.body;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const data = {
        fields: {
          appName: { stringValue: appName || "Digital Pager" },
          globalLogoUrl: { stringValue: globalLogoUrl || "" },
          supportWhatsapp: { stringValue: supportWhatsapp || "966500000000" },
          globalThemeColor: { stringValue: globalThemeColor || "#ef0000" },
        },
      };

      const patchRes = await apikeyFetch(`${baseUrl}/systemSettings/global`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error("Settings save error:", patchRes.status, errText);
        return res.status(500).json({ message: "Failed to save settings" });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Save settings error:", error);
      return res.status(500).json({ message: "Failed to save settings" });
    }
  });

  app.post("/api/track/share/:storeId", async (req, res) => {
    try {
      const { storeId } = req.params;
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
      const docPath = `projects/${projectId}/databases/(default)/documents/merchants/${storeId}`;
      await fetch(commitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writes: [{
            transform: {
              document: docPath,
              fieldTransforms: [{
                fieldPath: "sharesCount",
                increment: { integerValue: "1" },
              }],
            },
          }],
        }),
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Track share error:", error);
      return res.status(500).json({ message: "Failed to track share" });
    }
  });

  app.post("/api/track/gmaps/:storeId", async (req, res) => {
    try {
      const { storeId } = req.params;
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
      const docPath = `projects/${projectId}/databases/(default)/documents/merchants/${storeId}`;
      await fetch(commitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writes: [{
            transform: {
              document: docPath,
              fieldTransforms: [{
                fieldPath: "googleMapsClicks",
                increment: { integerValue: "1" },
              }],
            },
          }],
        }),
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Track gmaps error:", error);
      return res.status(500).json({ message: "Failed to track gmaps click" });
    }
  });

  app.post("/api/track/qrscan/:storeId", async (req, res) => {
    try {
      const { storeId } = req.params;
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
      const docPath = `projects/${projectId}/databases/(default)/documents/merchants/${storeId}`;
      await fetch(commitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writes: [{
            transform: {
              document: docPath,
              fieldTransforms: [{
                fieldPath: "qrScans",
                increment: { integerValue: "1" },
              }],
            },
          }],
        }),
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Track QR scan error:", error);
      return res.status(500).json({ message: "Failed to track QR scan" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const query = {
        structuredQuery: {
          from: [{ collectionId: "pagers", allDescendants: true }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "status" },
                    op: "EQUAL",
                    value: { stringValue: "notified" },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "notifiedAt" },
                    op: "GREATER_THAN_OR_EQUAL",
                    value: { stringValue: todayStart.toISOString() },
                  },
                },
              ],
            },
          },
        },
      };

      const queryRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
        }
      );

      let totalAlertsToday = 0;
      if (queryRes.ok) {
        const results = await queryRes.json();
        if (Array.isArray(results)) {
          totalAlertsToday = results.filter((r: any) => r.document).length;
        }
      }

      return res.json({ totalAlertsToday });
    } catch (error) {
      console.error("Admin stats error:", error);
      return res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.post("/api/register-merchant", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { uid, storeName, businessType, ownerName, email, logoUrl, googleMapsReviewUrl, commercialRegisterURL } = req.body;
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
          commercialRegisterURL: { stringValue: commercialRegisterURL || "" },
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

  app.get("/api/admin/errors", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const query = {
        structuredQuery: {
          from: [{ collectionId: "system_errors" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "timestamp" },
              op: "GREATER_THAN_OR_EQUAL",
              value: { stringValue: twentyFourHoursAgo },
            },
          },
          orderBy: [{ field: { fieldPath: "timestamp" }, direction: "DESCENDING" }],
          limit: 100,
        },
      };

      const queryRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
        }
      );

      if (!queryRes.ok) {
        return res.status(500).json({ message: "Failed to query errors" });
      }

      const results = await queryRes.json();
      const errors: any[] = [];

      if (Array.isArray(results)) {
        for (const r of results) {
          if (r.document) {
            const fields = r.document.fields || {};
            const docName = r.document.name || "";
            const id = docName.split("/").pop() || "";
            errors.push({
              id,
              merchantId: fields.merchantId?.stringValue || "",
              errorType: fields.errorType?.stringValue || "",
              errorMessage: fields.errorMessage?.stringValue || "",
              timestamp: fields.timestamp?.stringValue || "",
              resolved: fields.resolved?.booleanValue || false,
            });
          }
        }
      }

      return res.json({ errors });
    } catch (error) {
      console.error("Get admin errors error:", error);
      return res.status(500).json({ message: "Failed to get errors" });
    }
  });

  app.post("/api/admin/errors/:errorId/resolve", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { errorId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const patchRes = await apikeyFetch(`${baseUrl}/system_errors/${errorId}?updateMask.fieldPaths=resolved`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { resolved: { booleanValue: true } } }),
      });

      if (!patchRes.ok) {
        return res.status(500).json({ message: "Failed to resolve error" });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Resolve error error:", error);
      return res.status(500).json({ message: "Failed to resolve error" });
    }
  });

  app.post("/api/store-internal-review", async (req, res) => {
    try {
      const { merchantId, stars, comment, orderNumber } = req.body;
      if (!merchantId || typeof merchantId !== "string") {
        return res.status(400).json({ message: "merchantId is required" });
      }
      if (!stars || typeof stars !== "number" || stars < 1 || stars > 5) {
        return res.status(400).json({ message: "stars must be between 1 and 5" });
      }

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const docId = randomUUID();
      const data = {
        fields: {
          merchantId: { stringValue: merchantId },
          stars: { integerValue: String(stars) },
          comment: { stringValue: comment || "" },
          orderNumber: { stringValue: orderNumber || "" },
          timestamp: { stringValue: new Date().toISOString() },
        },
      };

      const patchRes = await apikeyFetch(`${baseUrl}/store_internal_reviews/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!patchRes.ok) {
        return res.status(500).json({ message: "Failed to save review" });
      }

      return res.json({ success: true, id: docId });
    } catch (error) {
      console.error("Save internal review error:", error);
      return res.status(500).json({ message: "Failed to save review" });
    }
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const { merchantId, stars, rating: ratingField, comment, orderId: orderIdField } = req.body;
      if (!merchantId || typeof merchantId !== "string") {
        return res.status(400).json({ message: "merchantId is required" });
      }
      const resolvedStars = stars ?? ratingField;
      if (!resolvedStars || typeof resolvedStars !== "number" || resolvedStars < 1 || resolvedStars > 5) {
        return res.status(400).json({ message: "rating must be a number between 1 and 5" });
      }

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const docId = randomUUID();
      const nowIso = new Date().toISOString();
      const data = {
        fields: {
          merchantId: { stringValue: merchantId },
          stars: { integerValue: String(resolvedStars) },
          rating: { integerValue: String(resolvedStars) },
          comment: { stringValue: comment || "" },
          orderId: { stringValue: orderIdField || "" },
          timestamp: { stringValue: nowIso },
          createdAt: { stringValue: nowIso },
          read: { booleanValue: false },
        },
      };

      const patchRes = await apikeyFetch(`${baseUrl}/private_feedbacks/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!patchRes.ok) {
        return res.status(500).json({ message: "Failed to save feedback" });
      }

      return res.json({ success: true, id: docId });
    } catch (error) {
      console.error("Save feedback error:", error);
      return res.status(500).json({ message: "Failed to save feedback" });
    }
  });

  app.get("/api/feedback/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const query = {
        structuredQuery: {
          from: [{ collectionId: "private_feedbacks" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "merchantId" },
              op: "EQUAL",
              value: { stringValue: merchantId },
            },
          },
          limit: 200,
        },
      };

      const queryRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
        }
      );

      if (!queryRes.ok) {
        const errText = await queryRes.text();
        console.error("Feedback query error:", errText);
        return res.status(500).json({ message: "Failed to query feedbacks" });
      }

      const results = await queryRes.json();
      const feedbacks: any[] = [];

      if (Array.isArray(results)) {
        for (const r of results) {
          if (r.document) {
            const fields = r.document.fields || {};
            const docName = r.document.name || "";
            const id = docName.split("/").pop() || "";
            feedbacks.push({
              id,
              merchantId: fields.merchantId?.stringValue || "",
              stars: parseInt(fields.stars?.integerValue || "0"),
              comment: fields.comment?.stringValue || "",
              timestamp: fields.timestamp?.stringValue || "",
              read: fields.read?.booleanValue || false,
            });
          }
        }
      }

      feedbacks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return res.json({ feedbacks });
    } catch (error) {
      console.error("Get feedbacks error:", error);
      return res.status(500).json({ message: "Failed to get feedbacks" });
    }
  });

  app.post("/api/feedback/:feedbackId/read", async (req, res) => {
    try {
      const { feedbackId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const patchRes = await apikeyFetch(`${baseUrl}/private_feedbacks/${feedbackId}?updateMask.fieldPaths=read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { read: { booleanValue: true } } }),
      });

      if (!patchRes.ok) {
        return res.status(500).json({ message: "Failed to mark feedback as read" });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Mark feedback read error:", error);
      return res.status(500).json({ message: "Failed to mark feedback as read" });
    }
  });

  app.get("/api/admin/feedbacks", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const query = {
        structuredQuery: {
          from: [{ collectionId: "private_feedbacks" }],
          orderBy: [{ field: { fieldPath: "timestamp" }, direction: "DESCENDING" }],
          limit: 500,
        },
      };

      const queryRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
        }
      );

      if (!queryRes.ok) {
        return res.status(500).json({ message: "Failed to query feedbacks" });
      }

      const results = await queryRes.json();
      const feedbacks: any[] = [];

      if (Array.isArray(results)) {
        for (const r of results) {
          if (r.document) {
            const fields = r.document.fields || {};
            const docName = r.document.name || "";
            const id = docName.split("/").pop() || "";
            feedbacks.push({
              id,
              merchantId: fields.merchantId?.stringValue || "",
              stars: parseInt(fields.stars?.integerValue || "0"),
              comment: fields.comment?.stringValue || "",
              timestamp: fields.timestamp?.stringValue || "",
              read: fields.read?.booleanValue || false,
            });
          }
        }
      }

      return res.json({ feedbacks });
    } catch (error) {
      console.error("Get admin feedbacks error:", error);
      return res.status(500).json({ message: "Failed to get feedbacks" });
    }
  });

  app.get("/api/admin/feedbacks/:merchantId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { merchantId } = req.params;
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const query = {
        structuredQuery: {
          from: [{ collectionId: "private_feedbacks" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "merchantId" },
              op: "EQUAL",
              value: { stringValue: merchantId },
            },
          },
          limit: 200,
        },
      };

      const queryRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
        }
      );

      if (!queryRes.ok) {
        return res.status(500).json({ message: "Failed to query feedbacks" });
      }

      const results = await queryRes.json();
      const feedbacks: any[] = [];

      if (Array.isArray(results)) {
        for (const r of results) {
          if (r.document) {
            const fields = r.document.fields || {};
            const docName = r.document.name || "";
            const id = docName.split("/").pop() || "";
            feedbacks.push({
              id,
              merchantId: fields.merchantId?.stringValue || "",
              stars: parseInt(fields.stars?.integerValue || "0"),
              comment: fields.comment?.stringValue || "",
              timestamp: fields.timestamp?.stringValue || "",
              read: fields.read?.booleanValue || false,
            });
          }
        }
      }

      feedbacks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return res.json({ feedbacks });
    } catch (error) {
      console.error("Get admin merchant feedbacks error:", error);
      return res.status(500).json({ message: "Failed to get feedbacks" });
    }
  });

  app.get("/api/admin/merchant-report/:merchantId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { merchantId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!accessToken || !baseUrl || !projectId) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const docRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`, {
        headers: {},
      });
      if (!docRes.ok) {
        return res.status(404).json({ message: "Merchant not found" });
      }
      const doc = await docRes.json();
      const fields = doc.fields || {};

      const qrScans = parseInt(fields.qrScans?.integerValue || "0");
      const sharesCount = parseInt(fields.sharesCount?.integerValue || "0");
      const googleMapsClicks = parseInt(fields.googleMapsClicks?.integerValue || "0");
      const storeName = fields.storeName?.stringValue || "";
      const logoUrl = fields.logoUrl?.stringValue || "";

      const pagersQuery = {
        structuredQuery: {
          from: [{ collectionId: "pagers" }],
          select: { fields: [{ fieldPath: "status" }] },
        },
      };

      const pagersRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/merchants/${merchantId}:runQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pagersQuery),
        }
      );

      let totalNotificationsSent = 0;
      let totalCompleted = 0;
      let totalPagers = 0;

      if (pagersRes.ok) {
        const pagersResults = await pagersRes.json();
        if (Array.isArray(pagersResults)) {
          for (const r of pagersResults) {
            if (r.document) {
              totalPagers++;
              const status = r.document.fields?.status?.stringValue || "";
              if (status === "notified" || status === "completed") {
                totalNotificationsSent++;
              }
              if (status === "completed") {
                totalCompleted++;
              }
            }
          }
        }
      }

      const conversionRate = qrScans > 0 ? Math.round((totalNotificationsSent / qrScans) * 100) : 0;

      return res.json({
        storeName,
        logoUrl,
        qrScans,
        notificationsSent: totalNotificationsSent,
        shares: sharesCount,
        gmapsClicks: googleMapsClicks,
        conversionRate,
        totalPagers,
        totalCompleted,
      });
    } catch (error) {
      console.error("Merchant report error:", error);
      return res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.post("/api/admin/repair-merchant/:merchantId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { merchantId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const docRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`, {
        headers: {},
      });

      if (!docRes.ok) {
        return res.status(404).json({ message: "Merchant not found" });
      }

      const doc = await docRes.json();
      const fields = doc.fields || {};

      const updates: Record<string, any> = {};
      const missingFields: string[] = [];

      if (!fields.role?.stringValue) {
        updates["role"] = { stringValue: "merchant" };
        missingFields.push("role");
      }
      if (!fields.status?.stringValue) {
        updates["status"] = { stringValue: "approved" };
        missingFields.push("status");
      }
      if (!fields.subscriptionStatus?.stringValue) {
        updates["subscriptionStatus"] = { stringValue: "active" };
        missingFields.push("subscriptionStatus");
      }
      if (!fields.subscriptionExpiry?.stringValue) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        updates["subscriptionExpiry"] = { stringValue: expiryDate.toISOString() };
        missingFields.push("subscriptionExpiry");
      }
      if (!fields.subscriptionStartAt?.stringValue) {
        updates["subscriptionStartAt"] = { stringValue: new Date().toISOString() };
        missingFields.push("subscriptionStartAt");
      }

      if (Object.keys(updates).length === 0) {
        return res.json({ message: "All fields are present, no repair needed", fields: Object.keys(fields) });
      }

      const patchRes = await fetch(
        `${baseUrl}/merchants/${merchantId}?updateMask.fieldPaths=${Object.keys(updates).join("&updateMask.fieldPaths=")}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields: { ...fields, ...updates } }),
        }
      );

      if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error("Repair PATCH failed:", errText);
        return res.status(500).json({ message: "Failed to repair merchant" });
      }

      console.log(`Repaired merchant ${merchantId}, fixed fields: ${missingFields.join(", ")}`);
      return res.json({ message: "Merchant repaired", fixedFields: missingFields });
    } catch (error) {
      console.error("Repair merchant error:", error);
      return res.status(500).json({ message: "Failed to repair merchant" });
    }
  });

  // ===== Merchant Feature Toggles =====
  const DEFAULT_FEATURES = {
    analyticsEnabled: true,
    crmEnabled: true,
    smartRatingEnabled: true,
    printReceiptsEnabled: true,
  };

  function parseFeatures(fields: any) {
    return {
      analyticsEnabled: fields?.analyticsEnabled?.booleanValue ?? DEFAULT_FEATURES.analyticsEnabled,
      crmEnabled: fields?.crmEnabled?.booleanValue ?? DEFAULT_FEATURES.crmEnabled,
      smartRatingEnabled: fields?.smartRatingEnabled?.booleanValue ?? DEFAULT_FEATURES.smartRatingEnabled,
      printReceiptsEnabled: fields?.printReceiptsEnabled?.booleanValue ?? DEFAULT_FEATURES.printReceiptsEnabled,
    };
  }

  app.get("/api/merchant-features/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const docRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`, {
        headers: {},
      });
      if (!docRes.ok) return res.status(404).json({ message: "Merchant not found" });

      const doc = await docRes.json();
      const features = parseFeatures(doc.fields || {});
      return res.json({ features });
    } catch (error) {
      console.error("Get merchant features error:", error);
      return res.status(500).json({ message: "Failed to get features" });
    }
  });

  app.get("/api/admin/merchant-features/:merchantId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) return res.status(403).json({ message: "Unauthorized" });
      const { merchantId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const docRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`, {
        headers: {},
      });
      if (!docRes.ok) return res.status(404).json({ message: "Merchant not found" });

      const doc = await docRes.json();
      const features = parseFeatures(doc.fields || {});
      return res.json({ features });
    } catch (error) {
      console.error("Admin get merchant features error:", error);
      return res.status(500).json({ message: "Failed to get features" });
    }
  });

  app.patch("/api/admin/merchant-features/:merchantId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) return res.status(403).json({ message: "Unauthorized" });
      const { merchantId } = req.params;
      const { analyticsEnabled, crmEnabled, smartRatingEnabled, printReceiptsEnabled } = req.body;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const docRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`, {
        headers: {},
      });
      if (!docRes.ok) return res.status(404).json({ message: "Merchant not found" });

      const doc = await docRes.json();
      const existingFields = doc.fields || {};

      const updatedFields: Record<string, any> = {};
      const fieldPaths: string[] = [];

      if (typeof analyticsEnabled === "boolean") {
        updatedFields.analyticsEnabled = { booleanValue: analyticsEnabled };
        fieldPaths.push("analyticsEnabled");
      }
      if (typeof crmEnabled === "boolean") {
        updatedFields.crmEnabled = { booleanValue: crmEnabled };
        fieldPaths.push("crmEnabled");
      }
      if (typeof smartRatingEnabled === "boolean") {
        updatedFields.smartRatingEnabled = { booleanValue: smartRatingEnabled };
        fieldPaths.push("smartRatingEnabled");
      }
      if (typeof printReceiptsEnabled === "boolean") {
        updatedFields.printReceiptsEnabled = { booleanValue: printReceiptsEnabled };
        fieldPaths.push("printReceiptsEnabled");
      }

      if (fieldPaths.length === 0) return res.status(400).json({ message: "No valid feature flags provided" });

      const patchUrl = `${baseUrl}/merchants/${merchantId}?${fieldPaths.map(f => `updateMask.fieldPaths=${f}`).join("&")}`;
      const patchRes = await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { ...existingFields, ...updatedFields } }),
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error("Feature toggle PATCH failed:", errText);
        return res.status(500).json({ message: "Failed to update features" });
      }

      const updatedDoc = await patchRes.json();
      const features = parseFeatures(updatedDoc.fields || {});
      console.log(`[FEATURES] Updated merchant ${merchantId}: ${JSON.stringify(features)}`);
      return res.json({ features });
    } catch (error) {
      console.error("Admin update merchant features error:", error);
      return res.status(500).json({ message: "Failed to update features" });
    }
  });

  // ===== Merchant Analytics Endpoint =====
  app.get("/api/merchant-analytics/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const merchantEmail = req.headers["x-merchant-email"];
      if (!merchantEmail) return res.status(401).json({ message: "Authentication required" });

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const mCheck = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`, { headers: {} });
      if (!mCheck.ok) return res.status(404).json({ message: "Merchant not found" });
      const mDoc = await mCheck.json();
      const mEmail = mDoc.fields?.email?.stringValue || "";
      if (mEmail !== merchantEmail) return res.status(403).json({ message: "Unauthorized" });

      const ordersRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/whatsappOrders?pageSize=500`, {
        headers: {},
      });
      if (!ordersRes.ok) return res.json({ avgPrepTime: 0, totalOrdersToday: 0, newCustomersToday: 0, totalRevenueToday: 0, lostRevenueToday: 0, orderSources: [] });

      const data = await ordersRes.json();
      const docs = data.documents || [];

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();

      let prepTimes: number[] = [];
      let totalOrdersToday = 0;
      let totalRevenueToday = 0;
      let lostRevenueToday = 0;
      const sourceCounts: Record<string, number> = {};
      const todayPhones: Set<string> = new Set();

      for (const d of docs) {
        const f = d.fields || {};
        const createdAt = f.createdAt?.stringValue || "";
        const createdMs = new Date(createdAt).getTime();
        if (isNaN(createdMs) || createdMs < todayStartMs) continue;

        totalOrdersToday++;

        const status = f.status?.stringValue || "";
        const total = Number(f.total?.doubleValue ?? f.total?.integerValue ?? 0);
        if (status === "archived" || status === "completed") totalRevenueToday += total;
        if (status === "uncollected") lostRevenueToday += total;

        const preparingAt = f.preparingAt?.stringValue;
        const readyAt = f.readyAt?.stringValue;
        if (preparingAt && readyAt) {
          const diff = new Date(readyAt).getTime() - new Date(preparingAt).getTime();
          if (diff > 0 && diff < 3600000) prepTimes.push(diff);
        }

        const source = f.source?.stringValue || "direct";
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;

        const phone = f.customerPhone?.stringValue || "";
        if (phone) todayPhones.add(phone.replace(/[^0-9]/g, ""));
      }

      const custRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/customers?pageSize=500`, {
        headers: {},
      });
      let newCustomersToday = 0;
      if (custRes.ok) {
        const custData = await custRes.json();
        const custDocs = custData.documents || [];
        for (const cd of custDocs) {
          const cf = cd.fields || {};
          const phone = cf.phone?.stringValue || "";
          const totalOrders = parseInt(cf.totalOrders?.integerValue || "0");
          if (totalOrders === 1 && todayPhones.has(phone.replace(/[^0-9]/g, ""))) {
            newCustomersToday++;
          }
        }
      }

      const avgPrepTime = prepTimes.length > 0 ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length / 1000) : 0;
      const orderSources = Object.entries(sourceCounts).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);

      return res.json({ avgPrepTime, totalOrdersToday, newCustomersToday, totalRevenueToday, lostRevenueToday, orderSources });
    } catch (error) {
      console.error("Merchant analytics error:", error);
      return res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // ===== Subscription Payment Endpoints =====
  app.post("/api/admin/subscription-payment/:merchantId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) return res.status(403).json({ message: "Unauthorized" });
      const { merchantId } = req.params;
      const { amountReceived, startDate, endDate } = req.body;
      if (!amountReceived || !startDate || !endDate) return res.status(400).json({ message: "amountReceived, startDate, and endDate are required" });

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const docRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`, { headers: {} });
      if (!docRes.ok) return res.status(404).json({ message: "Merchant not found" });

      const paymentId = randomUUID();
      const paymentDoc = {
        fields: {
          merchantId: { stringValue: merchantId },
          amountReceived: { doubleValue: parseFloat(amountReceived) },
          startDate: { stringValue: startDate },
          endDate: { stringValue: endDate },
          createdAt: { stringValue: new Date().toISOString() },
        },
      };
      const createRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/subscriptionPayments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentDoc),
      });
      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Create payment failed:", errText);
        return res.status(500).json({ message: "Failed to record payment" });
      }

      const merchantDoc = await docRes.json();
      const existingFields = merchantDoc.fields || {};
      const updateFields = {
        ...existingFields,
        subscriptionStatus: { stringValue: "active" },
        subscriptionStartAt: { stringValue: startDate },
        subscriptionExpiry: { stringValue: endDate },
      };
      const patchUrl = `${baseUrl}/merchants/${merchantId}?updateMask.fieldPaths=subscriptionStatus&updateMask.fieldPaths=subscriptionStartAt&updateMask.fieldPaths=subscriptionExpiry`;
      const activationRes = await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: updateFields }),
      });
      if (!activationRes.ok) {
        console.error("Failed to activate subscription after payment:", await activationRes.text());
        return res.status(500).json({ message: "Payment recorded but subscription activation failed" });
      }

      console.log(`[SUBSCRIPTION] Payment recorded for merchant ${merchantId}: ${amountReceived} SAR, ${startDate} to ${endDate}`);
      return res.json({ success: true, paymentId });
    } catch (error) {
      console.error("Subscription payment error:", error);
      return res.status(500).json({ message: "Failed to record payment" });
    }
  });

  app.get("/api/admin/subscription-payments/:merchantId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) return res.status(403).json({ message: "Unauthorized" });
      const { merchantId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const paymentsRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/subscriptionPayments`, {
        headers: {},
      });
      if (!paymentsRes.ok) return res.json({ payments: [] });

      const data = await paymentsRes.json();
      const payments = (data.documents || []).map((doc: any) => {
        const f = doc.fields || {};
        return {
          id: doc.name?.split("/").pop() || "",
          amountReceived: f.amountReceived?.doubleValue ?? f.amountReceived?.integerValue ?? 0,
          startDate: f.startDate?.stringValue || "",
          endDate: f.endDate?.stringValue || "",
          createdAt: f.createdAt?.stringValue || "",
        };
      }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json({ payments });
    } catch (error) {
      console.error("Get subscription payments error:", error);
      return res.status(500).json({ message: "Failed to get payments" });
    }
  });

  // ===== Platform Finance Endpoints (Private: platform_admin_finance collection) =====
  app.get("/api/admin/platform-finance", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) return res.status(403).json({ message: "Unauthorized" });
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const expensesRes = await apikeyFetch(`${baseUrl}/platform_admin_finance/expenses/items`, {
        headers: {},
      });
      let expenses: any[] = [];
      if (expensesRes.ok) {
        const expData = await expensesRes.json();
        expenses = (expData.documents || []).map((doc: any) => {
          const f = doc.fields || {};
          return {
            id: doc.name?.split("/").pop() || "",
            name: f.name?.stringValue || "",
            amount: f.amount?.doubleValue ?? f.amount?.integerValue ?? 0,
            date: f.date?.stringValue || "",
            createdAt: f.createdAt?.stringValue || "",
          };
        }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      const merchantsRes = await apikeyFetch(`${baseUrl}/merchants`, { headers: {} });
      let totalRevenue = 0;
      const revenueByMerchant: any[] = [];

      if (merchantsRes.ok) {
        const merchData = await merchantsRes.json();
        const merchantDocs = merchData.documents || [];

        for (const mDoc of merchantDocs) {
          const mFields = mDoc.fields || {};
          const mId = mDoc.name?.split("/").pop() || "";
          const storeName = mFields.storeName?.stringValue || mFields.email?.stringValue || mId;

          const pmtRes = await apikeyFetch(`${baseUrl}/merchants/${mId}/subscriptionPayments`, {
            headers: {},
          });
          let merchantTotal = 0;
          let paymentCount = 0;
          if (pmtRes.ok) {
            const pmtData = await pmtRes.json();
            const pmts = pmtData.documents || [];
            for (const p of pmts) {
              const pf = p.fields || {};
              merchantTotal += Number(pf.amountReceived?.doubleValue ?? pf.amountReceived?.integerValue ?? 0);
              paymentCount++;
            }
          }
          if (paymentCount > 0) {
            revenueByMerchant.push({ merchantId: mId, storeName, totalPaid: merchantTotal, paymentCount });
            totalRevenue += merchantTotal;
          }
        }
      }

      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

      return res.json({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        expenses,
        revenueByMerchant: revenueByMerchant.sort((a, b) => b.totalPaid - a.totalPaid),
      });
    } catch (error) {
      console.error("Platform finance error:", error);
      return res.status(500).json({ message: "Failed to get platform finance" });
    }
  });

  app.post("/api/admin/platform-expense", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) return res.status(403).json({ message: "Unauthorized" });
      const { name, amount, date } = req.body;
      if (!name || amount === undefined || !date) return res.status(400).json({ message: "name, amount, and date are required" });

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const parentDocUrl = `${baseUrl}/platform_admin_finance/expenses`;
      const checkParent = await fetch(parentDocUrl, { headers: {} });
      if (!checkParent.ok || checkParent.status === 404) {
        await fetch(parentDocUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: { _placeholder: { booleanValue: true } } }),
        });
      }

      const expenseId = randomUUID();
      const expenseDoc = {
        fields: {
          name: { stringValue: name },
          amount: { doubleValue: parseFloat(amount) },
          date: { stringValue: date },
          createdAt: { stringValue: new Date().toISOString() },
        },
      };
      const createRes = await apikeyFetch(`${baseUrl}/platform_admin_finance/expenses/items/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseDoc),
      });
      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Create expense failed:", errText);
        return res.status(500).json({ message: "Failed to add expense" });
      }

      console.log(`[PLATFORM FINANCE] Expense added: ${name} - ${amount} SAR on ${date}`);
      return res.json({ success: true, expenseId });
    } catch (error) {
      console.error("Add expense error:", error);
      return res.status(500).json({ message: "Failed to add expense" });
    }
  });

  app.delete("/api/admin/platform-expense/:expenseId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) return res.status(403).json({ message: "Unauthorized" });
      const { expenseId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const delRes = await apikeyFetch(`${baseUrl}/platform_admin_finance/expenses/items/${expenseId}`, {
        method: "DELETE",
        headers: {},
      });
      if (!delRes.ok) return res.status(500).json({ message: "Failed to delete expense" });

      console.log(`[PLATFORM FINANCE] Expense deleted: ${expenseId}`);
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete expense error:", error);
      return res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // ===== Renewal Analytics Endpoint =====
  app.get("/api/admin/renewal-analytics", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) return res.status(403).json({ message: "Unauthorized" });
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const merchantsRes = await apikeyFetch(`${baseUrl}/merchants`, { headers: {} });
      if (!merchantsRes.ok) return res.status(500).json({ message: "Failed to fetch merchants" });
      const merchData = await merchantsRes.json();
      const merchantDocs = merchData.documents || [];

      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingExpirations: any[] = [];

      for (const doc of merchantDocs) {
        const f = doc.fields || {};
        const merchantId = doc.name?.split("/").pop() || "";
        const storeName = f.storeName?.stringValue || f.email?.stringValue || merchantId;
        const expiry = f.subscriptionExpiry?.stringValue;
        const subStatus = f.subscriptionStatus?.stringValue || "pending";

        if (expiry) {
          const expiryDate = new Date(expiry);
          const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7 && daysLeft >= 0 && subStatus === "active") {
            upcomingExpirations.push({ merchantId, storeName, expiryDate: expiry, daysLeft });
          }
        }
      }

      upcomingExpirations.sort((a, b) => a.daysLeft - b.daysLeft);
      return res.json({ upcomingExpirations });
    } catch (error) {
      console.error("Renewal analytics error:", error);
      return res.status(500).json({ message: "Failed to get renewal analytics" });
    }
  });

  // ===== Global Monitor Endpoint =====
  app.get("/api/admin/global-monitor", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) return res.status(403).json({ message: "Unauthorized" });
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const merchantsRes = await apikeyFetch(`${baseUrl}/merchants`, {
        headers: {},
      });
      if (!merchantsRes.ok) return res.status(500).json({ message: "Failed to fetch merchants" });
      const merchantsData = await merchantsRes.json();
      const merchantDocs = merchantsData.documents || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const merchantStats: any[] = [];
      let totalOrdersAllTime = 0;
      let totalOrdersToday = 0;
      let totalCollected = 0;
      let totalUncollected = 0;
      let totalPreparing = 0;
      let totalReady = 0;

      for (const doc of merchantDocs) {
        const fields = doc.fields || {};
        const merchantId = doc.name?.split("/").pop() || "";
        const storeName = fields.storeName?.stringValue || fields.email?.stringValue || merchantId;

        const ordersRes = await fetch(
          `${baseUrl}/merchants/${merchantId}/whatsappOrders`,
          { headers: {} }
        );

        let ordersToday = 0;
        let ordersTotal = 0;
        let collected = 0;
        let uncollected = 0;
        let preparing = 0;
        let ready = 0;
        let revenue = 0;

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          const orders = ordersData.documents || [];
          ordersTotal = orders.length;

          for (const o of orders) {
            const of_ = o.fields || {};
            const status = of_.status?.stringValue || "";
            const createdAt = of_.createdAt?.stringValue || "";
            const total = of_.total?.doubleValue ?? of_.total?.integerValue ?? 0;

            if (status === "archived") { collected++; revenue += Number(total); }
            if (status === "uncollected") uncollected++;
            if (status === "preparing") preparing++;
            if (status === "ready") ready++;
            if (createdAt >= todayISO) ordersToday++;
          }
        }

        merchantStats.push({
          merchantId,
          storeName,
          ordersTotal,
          ordersToday,
          collected,
          uncollected,
          preparing,
          ready,
          revenue,
        });

        totalOrdersAllTime += ordersTotal;
        totalOrdersToday += ordersToday;
        totalCollected += collected;
        totalUncollected += uncollected;
        totalPreparing += preparing;
        totalReady += ready;
      }

      merchantStats.sort((a, b) => b.ordersTotal - a.ordersTotal);

      return res.json({
        summary: {
          totalMerchants: merchantDocs.length,
          totalOrdersAllTime,
          totalOrdersToday,
          totalCollected,
          totalUncollected,
          totalPreparing,
          totalReady,
        },
        merchants: merchantStats,
      });
    } catch (error) {
      console.error("Global monitor error:", error);
      return res.status(500).json({ message: "Failed to get global monitor data" });
    }
  });

  // ===== Product Management Routes =====
  app.post("/api/products/:merchantId", upload.single("image"), async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { name, price, description, category, visible } = req.body;
      if (!name || !price) return res.status(400).json({ message: "name and price are required" });

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const docId = randomUUID();
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";
      const fields: Record<string, any> = {
        merchantId: { stringValue: merchantId },
        name: { stringValue: name },
        price: { doubleValue: parseFloat(price) },
        category: { stringValue: category || "" },
        description: { stringValue: description || "" },
        imageUrl: { stringValue: imageUrl },
        visible: { booleanValue: visible === "false" ? false : true },
        createdAt: { stringValue: new Date().toISOString() },
      };

      if (req.body.variants) {
        try {
          const variants = JSON.parse(req.body.variants);
          fields.variants = {
            arrayValue: {
              values: variants.map((v: any) => ({
                mapValue: { fields: { name: { stringValue: v.name || "" }, price: { doubleValue: v.price || 0 } } },
              })),
            },
          };
        } catch {}
      }

      if (req.body.addons) {
        try {
          const addons = JSON.parse(req.body.addons);
          fields.addons = {
            arrayValue: {
              values: addons.map((a: any) => ({
                mapValue: { fields: { name: { stringValue: a.name || "" }, price: { doubleValue: a.price || 0 } } },
              })),
            },
          };
        } catch {}
      }

      const patchRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/products/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });

      if (!patchRes.ok) return res.status(500).json({ message: "Failed to create product" });
      return res.json({ success: true, id: docId, imageUrl });
    } catch (error) {
      console.error("Create product error:", error);
      return res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.get("/api/products/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const listRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/products?pageSize=500`, {
        headers: {},
      });

      if (!listRes.ok) return res.status(500).json({ message: "Failed to list products" });
      const data = await listRes.json();
      const products = (data.documents || []).map((doc: any) => {
        const f = doc.fields || {};
        const parts = doc.name.split("/");
        const variants = (f.variants?.arrayValue?.values || []).map((v: any) => ({
          name: v.mapValue?.fields?.name?.stringValue || "",
          price: v.mapValue?.fields?.price?.doubleValue ?? parseFloat(v.mapValue?.fields?.price?.integerValue || "0"),
        }));
        const addons = (f.addons?.arrayValue?.values || []).map((a: any) => ({
          name: a.mapValue?.fields?.name?.stringValue || "",
          price: a.mapValue?.fields?.price?.doubleValue ?? parseFloat(a.mapValue?.fields?.price?.integerValue || "0"),
        }));
        return {
          id: parts[parts.length - 1],
          merchantId: f.merchantId?.stringValue || "",
          name: f.name?.stringValue || "",
          price: f.price?.doubleValue ?? parseFloat(f.price?.integerValue || "0"),
          category: f.category?.stringValue || "",
          description: f.description?.stringValue || "",
          imageUrl: f.imageUrl?.stringValue || "",
          visible: f.visible?.booleanValue !== false,
          variants: variants.length > 0 ? variants : undefined,
          addons: addons.length > 0 ? addons : undefined,
          createdAt: f.createdAt?.stringValue || "",
        };
      });

      products.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return res.json({ products });
    } catch (error) {
      console.error("List products error:", error);
      return res.status(500).json({ message: "Failed to list products" });
    }
  });

  app.patch("/api/products/:merchantId/:productId", upload.single("image"), async (req, res) => {
    try {
      const { merchantId, productId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const updateFields: Record<string, any> = {};
      const fieldPaths: string[] = [];

      if (req.body.name !== undefined) {
        updateFields.name = { stringValue: req.body.name };
        fieldPaths.push("name");
      }
      if (req.body.price !== undefined) {
        updateFields.price = { doubleValue: parseFloat(req.body.price) };
        fieldPaths.push("price");
      }
      if (req.body.description !== undefined) {
        updateFields.description = { stringValue: req.body.description };
        fieldPaths.push("description");
      }
      if (req.body.category !== undefined) {
        updateFields.category = { stringValue: req.body.category };
        fieldPaths.push("category");
      }
      if (req.body.visible !== undefined) {
        updateFields.visible = { booleanValue: req.body.visible === "true" || req.body.visible === true };
        fieldPaths.push("visible");
      }
      if (req.file) {
        updateFields.imageUrl = { stringValue: `/uploads/${req.file.filename}` };
        fieldPaths.push("imageUrl");
      }
      if (req.body.variants !== undefined) {
        try {
          const variants = JSON.parse(req.body.variants);
          updateFields.variants = {
            arrayValue: {
              values: variants.map((v: any) => ({
                mapValue: { fields: { name: { stringValue: v.name || "" }, price: { doubleValue: v.price || 0 } } },
              })),
            },
          };
          fieldPaths.push("variants");
        } catch {}
      }
      if (req.body.addons !== undefined) {
        try {
          const addons = JSON.parse(req.body.addons);
          updateFields.addons = {
            arrayValue: {
              values: addons.map((a: any) => ({
                mapValue: { fields: { name: { stringValue: a.name || "" }, price: { doubleValue: a.price || 0 } } },
              })),
            },
          };
          fieldPaths.push("addons");
        } catch {}
      }

      if (fieldPaths.length === 0) return res.status(400).json({ message: "No fields to update" });

      const maskParams = fieldPaths.map(fp => `updateMask.fieldPaths=${fp}`).join("&");
      const patchRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/products/${productId}?${maskParams}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: updateFields }),
      });

      if (!patchRes.ok) return res.status(500).json({ message: "Failed to update product" });
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
      return res.json({ success: true, imageUrl });
    } catch (error) {
      console.error("Update product error:", error);
      return res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:merchantId/:productId", async (req, res) => {
    try {
      const { merchantId, productId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const delRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/products/${productId}`, {
        method: "DELETE",
        headers: {},
      });

      if (!delRes.ok) return res.status(500).json({ message: "Failed to delete product" });
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete product error:", error);
      return res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/menu/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      const apiKey = getApiKey();
      if (!projectId || !apiKey) return res.status(500).json({ message: "Firestore not configured" });

      const base = getApiKeyBaseUrl()!;

      // Fetch merchant document — try direct path first, then fallback query by uid field
      console.log(`[MENU] Fetching merchant document for merchantId: ${merchantId}`);
      let mDoc: any = null;
      const mRes = await apikeyFetch(`${base}/merchants/${merchantId}`);
      if (mRes.ok) {
        mDoc = await mRes.json();
        console.log(`[MENU] Direct document found for merchantId: ${merchantId}`);
      } else {
        console.warn(`[MENU] Direct doc 404 for ${merchantId} — falling back to uid field query`);
        // Fallback: query merchants collection where uid == merchantId
        const queryBody = {
          structuredQuery: {
            from: [{ collectionId: "merchants" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "uid" },
                op: "EQUAL",
                value: { stringValue: merchantId },
              },
            },
            limit: 1,
          },
        };
        const dbBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
        const qRes = await apikeyFetch(`${dbBase}:runQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queryBody),
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          if (Array.isArray(qData) && qData.length > 0 && qData[0].document) {
            mDoc = qData[0].document;
            const realDocId = mDoc.name.split("/").pop();
            console.log(`[MENU] Found via uid query — real docId: ${realDocId}`);
          }
        }
        if (!mDoc) {
          console.error(`[MENU] No merchant found for merchantId: ${merchantId}`);
          return res.status(404).json({ message: "Merchant not found" });
        }
      }
      // Use the real Firestore docId for subcollection paths (may differ from URL merchantId)
      const resolvedMerchantId = mDoc.name ? mDoc.name.split("/").pop()! : merchantId;
      if (resolvedMerchantId !== merchantId) {
        console.log(`[MENU] Resolved merchantId: ${merchantId} → ${resolvedMerchantId}`);
      }
      const mf = mDoc.fields || {};

      const merchant = {
        storeName: mf.storeName?.stringValue || "",
        logoUrl: mf.logoUrl?.stringValue || "",
        whatsappNumber: mf.whatsappNumber?.stringValue || "",
        status: mf.status?.stringValue || "",
        subscriptionStatus: mf.subscriptionStatus?.stringValue || "",
        storeOpen: mf.storeOpen?.booleanValue !== false,
        onlineOrdersEnabled: mf.onlineOrdersEnabled?.booleanValue !== false,
        businessOpenTime: mf.businessOpenTime?.stringValue || "",
        businessCloseTime: mf.businessCloseTime?.stringValue || "",
        storeTermsEnabled: mf.storeTermsEnabled?.booleanValue === true,
        storeTermsText: mf.storeTermsText?.stringValue || "",
        storePrivacyText: mf.storePrivacyText?.stringValue || "",
        moyasarPublishableKey: mf.moyasarPublishableKey?.stringValue || "",
        onlinePaymentEnabled: mf.onlinePaymentEnabled?.booleanValue === true,
        codEnabled: mf.codEnabled?.booleanValue !== false,
        deliveryEnabled: mf.deliveryEnabled?.booleanValue === true,
        deliveryFee: mf.deliveryFee?.doubleValue ?? parseFloat(mf.deliveryFee?.integerValue || "0"),
        deliveryRange: mf.deliveryRange?.doubleValue ?? parseFloat(mf.deliveryRange?.integerValue || "0"),
        storeLat: mf.storeLat?.doubleValue ?? null,
        storeLng: mf.storeLng?.doubleValue ?? null,
      };

      // Fetch products via LIST using the resolved Firestore docId path
      console.log(`[MENU] Fetching products from merchants/${resolvedMerchantId}/products`);
      const listRes = await apikeyFetch(
        `${base}/merchants/${resolvedMerchantId}/products?pageSize=500`,
        { headers: {} }
      );

      let products: any[] = [];
      if (listRes.ok) {
        const listData = await listRes.json();
        console.log(`[MENU] Raw product docs returned: ${(listData.documents || []).length}`);
        const mapArray = (arr: any[]) => arr.map((v: any) => ({
          name: v.mapValue?.fields?.name?.stringValue || "",
          price: v.mapValue?.fields?.price?.doubleValue ?? parseFloat(v.mapValue?.fields?.price?.integerValue || "0"),
        }));
        const mapRemovals = (arr: any[]) => arr.map((v: any) => ({
          name: v.mapValue?.fields?.name?.stringValue || "",
        }));
        products = (listData.documents || [])
          .filter((doc: any) => {
            const f = doc.fields || {};
            // Only include visible products; accept products with matching merchantId OR no merchantId field
            const docMerchantId = f.merchantId?.stringValue || "";
            const isVisible = f.visible?.booleanValue !== false;
            const belongsToMerchant = !docMerchantId || docMerchantId === merchantId || docMerchantId === resolvedMerchantId;
            return isVisible && belongsToMerchant;
          })
          .map((doc: any) => {
            const f = doc.fields || {};
            const parts = doc.name.split("/");
            const variants = mapArray(f.variants?.arrayValue?.values || []);
            const addons = mapArray(f.addons?.arrayValue?.values || []);
            const extras = mapArray(f.extras?.arrayValue?.values || []);
            const removals = mapRemovals(f.removals?.arrayValue?.values || []);
            return {
              id: parts[parts.length - 1],
              name: f.name?.stringValue || "",
              price: f.price?.doubleValue ?? parseFloat(f.price?.integerValue || "0"),
              pricingType: f.pricingType?.stringValue || "fixed",
              category: f.category?.stringValue || "",
              description: f.description?.stringValue || "",
              imageUrl: f.imageUrl?.stringValue || "",
              visible: f.visible?.booleanValue !== false,
              variants: variants.length > 0 ? variants : undefined,
              addons: addons.length > 0 ? addons : undefined,
              extras: extras.length > 0 ? extras : undefined,
              removals: removals.length > 0 ? removals : undefined,
            };
          });
      }

      return res.json({ products, merchant });
    } catch (error) {
      console.error("Public menu error:", error);
      return res.status(500).json({ message: "Failed to load menu" });
    }
  });

  // ===== WhatsApp Order Routes =====
  app.post("/api/whatsapp-orders/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { customerName, customerPhone, items, total, paymentMethod, transactionId, diningType, customerNotes, deliveryAddress, deliveryLat, deliveryLng, deliveryMapLink } = req.body;

      if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "customerName, customerPhone, and items are required" });
      }

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const mRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`);
      if (!mRes.ok) return res.status(404).json({ message: "Merchant not found" });
      const mDoc = await mRes.json();
      const mf = mDoc.fields || {};

      if (mf.status?.stringValue !== "approved" || mf.subscriptionStatus?.stringValue !== "active") {
        return res.status(403).json({ message: "Store is not available" });
      }

      const storeOpen = mf.storeOpen?.booleanValue !== false;
      if (!storeOpen) {
        return res.status(403).json({ message: "Store is currently closed" });
      }

      if (mf.onlineOrdersEnabled?.booleanValue === false) {
        return res.status(403).json({ message: "Online ordering is currently disabled" });
      }

      const riyadhNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
      const riyadhHours = riyadhNow.getHours();
      const riyadhMinutes = riyadhNow.getMinutes();
      console.log(`[StoreStatus] Server check for ${merchantId}: storeOpen=${storeOpen}, riyadhTime=${riyadhHours}:${String(riyadhMinutes).padStart(2, "0")}`);

      const docId = randomUUID();
      const itemsArray = items.map((item: any) => ({
        mapValue: {
          fields: {
            productId: { stringValue: item.productId || "" },
            name: { stringValue: item.name || "" },
            price: { doubleValue: item.price || 0 },
            quantity: { integerValue: String(item.quantity || 1) },
          },
        },
      }));

      let finalTotal = total || 0;
      let discountAmount = 0;
      let appliedCoupon = "";

      const { couponCode } = req.body;
      if (couponCode && typeof couponCode === "string") {
        const cRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/coupons?pageSize=200`);
        if (cRes.ok) {
          const cData = await cRes.json();
          const docs = cData.documents || [];
          const match = docs.find((d: any) => {
            const cf = d.fields || {};
            return cf.code?.stringValue?.toUpperCase() === couponCode.toUpperCase() && cf.active?.booleanValue === true;
          });
          if (match) {
            const pct = match.fields.discountPercent?.integerValue || match.fields.discountPercent?.doubleValue || 0;
            discountAmount = Math.round((finalTotal * Number(pct)) / 100 * 100) / 100;
            finalTotal = Math.round((finalTotal - discountAmount) * 100) / 100;
            if (finalTotal < 0) finalTotal = 0;
            appliedCoupon = couponCode.toUpperCase();
          }
        }
      }

      let onlineId: { orderNumber: string; currentYY: string };
      try {
        onlineId = await generateOnlineOrderId(merchantId);
      } catch (err) {
        console.error("[OrderCreate] Failed to generate online order ID:", err);
        return res.status(500).json({ message: "Failed to generate order ID. Please try again." });
      }
      const cityCode = mf.cityCode?.stringValue || "00";
      const displayOrderId = buildCloudOrderId(cityCode, onlineId.currentYY, onlineId.orderNumber);

      const fields: Record<string, any> = {
        merchantId: { stringValue: merchantId },
        customerName: { stringValue: customerName },
        customerPhone: { stringValue: customerPhone },
        items: { arrayValue: { values: itemsArray } },
        total: { doubleValue: finalTotal },
        status: { stringValue: "pending_verification" },
        paymentMethod: { stringValue: (paymentMethod && typeof paymentMethod === "string" && ["cod", "credit_card", "mada", "apple_pay", "google_pay", "stc_pay"].includes(paymentMethod)) ? paymentMethod : "cod" },
        orderNumber: { stringValue: onlineId.orderNumber },
        displayOrderId: { stringValue: displayOrderId },
        orderType: { stringValue: "online" },
        createdAt: { stringValue: new Date().toISOString() },
      };

      if (appliedCoupon) {
        fields.couponCode = { stringValue: appliedCoupon };
        fields.discountAmount = { doubleValue: discountAmount };
        fields.originalTotal = { doubleValue: total || 0 };
      }

      if (transactionId && typeof transactionId === "string") {
        fields.transactionId = { stringValue: transactionId };
      }

      if (diningType && typeof diningType === "string" && ["dine_in", "takeaway", "delivery"].includes(diningType)) {
        fields.diningType = { stringValue: diningType };
      }

      if (diningType === "delivery") {
        if (mf.deliveryEnabled?.booleanValue !== true) {
          return res.status(400).json({ message: "Delivery is not available for this store" });
        }
        const merchantDeliveryFee = mf.deliveryFee?.doubleValue ?? parseFloat(mf.deliveryFee?.integerValue || "0");
        if (merchantDeliveryFee > 0) {
          fields.deliveryFee = { doubleValue: merchantDeliveryFee };
          finalTotal = Math.round((finalTotal + merchantDeliveryFee) * 100) / 100;
          fields.total = { doubleValue: finalTotal };
        }
      }

      if (customerNotes && typeof customerNotes === "string" && customerNotes.trim()) {
        fields.customerNotes = { stringValue: customerNotes.trim() };
      }

      if (diningType === "delivery") {
        if (typeof deliveryLat !== "number" || typeof deliveryLng !== "number" ||
            !Number.isFinite(deliveryLat) || !Number.isFinite(deliveryLng) ||
            deliveryLat < -90 || deliveryLat > 90 || deliveryLng < -180 || deliveryLng > 180) {
          return res.status(400).json({ message: "Valid delivery location coordinates are required for delivery orders" });
        }
        fields.deliveryLat = { doubleValue: deliveryLat };
        fields.deliveryLng = { doubleValue: deliveryLng };
        fields.deliveryMapLink = { stringValue: `https://www.google.com/maps?q=${deliveryLat.toFixed(6)},${deliveryLng.toFixed(6)}` };
        if (deliveryAddress && typeof deliveryAddress === "string" && deliveryAddress.trim()) {
          fields.deliveryAddress = { stringValue: deliveryAddress.trim().slice(0, 300) };
        }
      }

      const { source } = req.body;
      if (source && typeof source === "string") {
        fields.source = { stringValue: source };
      }

      const patchRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/whatsappOrders/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });

      if (!patchRes.ok) return res.status(500).json({ message: "Failed to create order" });

      const custPhone = customerPhone.replace(/[^0-9+]/g, "");
      const custId = custPhone.replace(/\+/g, "");
      if (custId) {
        const custUrl = `${baseUrl}/merchants/${merchantId}/customers/${custId}`;
        const existRes = await apikeyFetch(custUrl);
        let totalOrders = 1;
        if (existRes.ok) {
          const existDoc = await existRes.json();
          const ef = existDoc.fields || {};
          totalOrders = parseInt(ef.totalOrders?.integerValue || "0") + 1;
        }
        apikeyFetch(custUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              name: { stringValue: customerName },
              phone: { stringValue: customerPhone },
              totalOrders: { integerValue: String(totalOrders) },
              lastOrderDate: { stringValue: new Date().toISOString() },
            },
          }),
        }).catch(() => {});
      }

      return res.json({ success: true, orderId: docId });
    } catch (error) {
      console.error("Create WhatsApp order error:", error);
      return res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get("/api/whatsapp-orders/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const listRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/whatsappOrders?pageSize=200`, {
        headers: {},
      });

      if (!listRes.ok) return res.status(500).json({ message: "Failed to list orders" });
      const data = await listRes.json();
      const orders = (data.documents || []).map((doc: any) => {
        const f = doc.fields || {};
        const parts = doc.name.split("/");
        const items = (f.items?.arrayValue?.values || []).map((v: any) => {
          const mf = v.mapValue?.fields || {};
          return {
            productId: mf.productId?.stringValue || "",
            name: mf.name?.stringValue || "",
            price: mf.price?.doubleValue ?? parseFloat(mf.price?.integerValue || "0"),
            quantity: parseInt(mf.quantity?.integerValue || "1"),
          };
        });
        return {
          id: parts[parts.length - 1],
          merchantId: f.merchantId?.stringValue || "",
          customerName: f.customerName?.stringValue || "",
          customerPhone: f.customerPhone?.stringValue || "",
          items,
          total: f.total?.doubleValue ?? parseFloat(f.total?.integerValue || "0"),
          status: f.status?.stringValue || "pending_verification",
          paymentMethod: f.paymentMethod?.stringValue || "cod",
          orderNumber: f.orderNumber?.stringValue || "",
          createdAt: f.createdAt?.stringValue || "",
        };
      });

      orders.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return res.json({ orders });
    } catch (error) {
      console.error("List WhatsApp orders error:", error);
      return res.status(500).json({ message: "Failed to list orders" });
    }
  });

  app.patch("/api/whatsapp-orders/:merchantId/:orderId", async (req, res) => {
    try {
      const { merchantId, orderId } = req.params;
      const { status, orderNumber } = req.body;

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const updateFields: Record<string, any> = {};
      const fieldPaths: string[] = [];

      if (status) {
        updateFields.status = { stringValue: status };
        fieldPaths.push("status");
      }
      if (orderNumber) {
        updateFields.orderNumber = { stringValue: String(orderNumber) };
        fieldPaths.push("orderNumber");
      }

      const { archivedAt, preparingAt, readyAt } = req.body;
      if (archivedAt) {
        updateFields.archivedAt = { stringValue: archivedAt };
        fieldPaths.push("archivedAt");
      }
      if (preparingAt) {
        updateFields.preparingAt = { stringValue: preparingAt };
        fieldPaths.push("preparingAt");
      }
      if (readyAt) {
        updateFields.readyAt = { stringValue: readyAt };
        fieldPaths.push("readyAt");
      }

      if (fieldPaths.length === 0) return res.status(400).json({ message: "No fields to update" });

      const maskParams = fieldPaths.map(fp => `updateMask.fieldPaths=${fp}`).join("&");
      const patchRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/whatsappOrders/${orderId}?${maskParams}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: updateFields }),
      });

      if (!patchRes.ok) return res.status(500).json({ message: "Failed to update order" });

      if (status === "uncollected") {
        try {
          const orderDoc = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/whatsappOrders/${orderId}`, {
            headers: {},
          });
          if (orderDoc.ok) {
            const od = await orderDoc.json();
            const phone = od.fields?.customerPhone?.stringValue || "";
            const custId = phone.replace(/[^0-9]/g, "");
            if (custId) {
              const custUrl = `${baseUrl}/merchants/${merchantId}/customers/${custId}`;
              const custRes = await fetch(custUrl, { headers: {} });
              let noShowCount = 1;
              if (custRes.ok) {
                const cd = await custRes.json();
                noShowCount = parseInt(cd.fields?.noShowCount?.integerValue || "0") + 1;
              }
              await fetch(`${custUrl}?updateMask.fieldPaths=noShowCount`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fields: { noShowCount: { integerValue: String(noShowCount) } } }),
              }).catch(() => {});
            }
          }
        } catch (e) {
          console.error("Failed to update noShowCount:", e);
        }
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Update WhatsApp order error:", error);
      return res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.get("/api/merchant-public/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      if (!merchantId) return res.status(400).json({ message: "merchantId required" });

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const mRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`, {
        headers: {},
      });
      if (!mRes.ok) return res.status(404).json({ message: "Merchant not found" });
      const mDoc = await mRes.json();
      const mf = mDoc.fields || {};

      return res.json({
        storeName: mf.storeName?.stringValue || "",
        logoUrl: mf.logoUrl?.stringValue || "",
        googleMapsReviewUrl: mf.googleMapsReviewUrl?.stringValue || "",
      });
    } catch (error) {
      console.error("Merchant public fetch error:", error);
      return res.status(500).json({ message: "Failed to fetch merchant" });
    }
  });

  app.patch("/api/pager-feedback", async (req, res) => {
    try {
      const { merchantId, pagerId, rating, feedback } = req.body;
      if (!merchantId || !pagerId || !rating) {
        return res.status(400).json({ message: "merchantId, pagerId, and rating required" });
      }
      const ratingNum = Number(rating);
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
      }

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const docUrl = `${baseUrl}/merchants/${merchantId}/pagers/${pagerId}`;

      const getRes = await fetch(docUrl, { headers: {} });
      if (!getRes.ok) return res.status(404).json({ message: "Pager not found" });
      const pagerDoc = await getRes.json();
      const pagerStatus = pagerDoc?.fields?.status?.stringValue;
      if (!["completed", "archived", "notified"].includes(pagerStatus || "")) {
        return res.status(400).json({ message: "Feedback can only be submitted for completed orders" });
      }
      if (pagerDoc?.fields?.customerFeedback?.mapValue?.fields?.rating) {
        return res.status(400).json({ message: "Feedback already submitted" });
      }

      const updateFields: Record<string, any> = {
        "customerFeedback.rating": { integerValue: String(rating) },
        "customerFeedback.submittedAt": { stringValue: new Date().toISOString() },
      };
      if (feedback && typeof feedback === "string" && feedback.trim()) {
        updateFields["customerFeedback.text"] = { stringValue: feedback.trim() };
      }

      const patchRes = await fetch(`${docUrl}?updateMask.fieldPaths=customerFeedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            customerFeedback: {
              mapValue: {
                fields: {
                  rating: { integerValue: String(rating) },
                  text: { stringValue: (feedback || "").trim() },
                  submittedAt: { stringValue: new Date().toISOString() },
                },
              },
            },
          },
        }),
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error("Pager feedback update failed:", errText);
        return res.status(500).json({ message: "Failed to save feedback" });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Pager feedback error:", error);
      return res.status(500).json({ message: "Failed to save feedback" });
    }
  });

  app.get("/api/track/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { merchantId, type } = req.query;

      if (!merchantId || typeof merchantId !== "string") {
        return res.status(400).json({ message: "merchantId query parameter required" });
      }

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const collectionName = type === "pager" ? "pagers" : "whatsappOrders";
      const docRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/${collectionName}/${orderId}`, {
        headers: {},
      });

      if (!docRes.ok) return res.status(404).json({ message: "Order not found" });
      const doc = await docRes.json();
      const f = doc.fields || {};

      let order: any;
      if (type === "pager") {
        const pagerStatus = f.status?.stringValue || "waiting";
        const statusMap: Record<string, string> = { waiting: "preparing", notified: "ready", completed: "completed" };
        order = {
          id: orderId,
          merchantId: f.storeId?.stringValue || "",
          customerName: "",
          customerPhone: "",
          items: [],
          total: 0,
          status: statusMap[pagerStatus] || pagerStatus,
          paymentMethod: "cod",
          orderNumber: f.orderNumber?.stringValue || "",
          displayOrderId: f.displayOrderId?.stringValue || "",
          orderType: f.orderType?.stringValue || "manual",
          orderSource: f.orderSource?.stringValue || "Manual",
          createdAt: f.createdAt?.stringValue || "",
        };
      } else {
        const items = (f.items?.arrayValue?.values || []).map((v: any) => {
          const mf = v.mapValue?.fields || {};
          return {
            productId: mf.productId?.stringValue || "",
            name: mf.name?.stringValue || "",
            price: mf.price?.doubleValue ?? parseFloat(mf.price?.integerValue || "0"),
            quantity: parseInt(mf.quantity?.integerValue || "1"),
          };
        });

        order = {
          id: orderId,
          merchantId: f.merchantId?.stringValue || "",
          customerName: f.customerName?.stringValue || "",
          customerPhone: f.customerPhone?.stringValue || "",
          items,
          total: f.total?.doubleValue ?? parseFloat(f.total?.integerValue || "0"),
          status: f.status?.stringValue || "pending_verification",
          paymentMethod: f.paymentMethod?.stringValue || "cod",
          orderNumber: f.orderNumber?.stringValue || "",
          displayOrderId: f.displayOrderId?.stringValue || "",
          orderType: f.orderType?.stringValue || undefined,
          diningType: f.diningType?.stringValue || undefined,
          deliveryAddress: f.deliveryAddress?.stringValue || undefined,
          deliveryLat: f.deliveryLat?.doubleValue ?? undefined,
          deliveryLng: f.deliveryLng?.doubleValue ?? undefined,
          deliveryMapLink: f.deliveryMapLink?.stringValue || undefined,
          deliveryFee: f.deliveryFee?.doubleValue ?? (f.deliveryFee?.integerValue ? parseFloat(f.deliveryFee.integerValue) : undefined),
          customerNotes: f.customerNotes?.stringValue || undefined,
          createdAt: f.createdAt?.stringValue || "",
        };
      }

      const mRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}`, {
        headers: {},
      });
      let merchant = null;
      if (mRes.ok) {
        const mDoc = await mRes.json();
        const mf = mDoc.fields || {};
        merchant = {
          storeName: mf.storeName?.stringValue || "",
          logoUrl: mf.logoUrl?.stringValue || "",
          googleMapsReviewUrl: mf.googleMapsReviewUrl?.stringValue || "",
          driverPhone: mf.driverPhone?.stringValue || "",
        };
      }

      return res.json({ order, merchant });
    } catch (error) {
      console.error("Track order error:", error);
      return res.status(500).json({ message: "Failed to load order" });
    }
  });

  // ── Coupons CRUD ──
  app.get("/api/coupons/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const url = `${baseUrl}/merchants/${merchantId}/coupons?pageSize=200`;
      const r = await fetch(url, { headers: {} });
      if (!r.ok) return res.json({ coupons: [] });
      const data = await r.json();
      const coupons = (data.documents || []).map((d: any) => {
        const f = d.fields || {};
        const parts = d.name.split("/");
        return {
          id: parts[parts.length - 1],
          code: f.code?.stringValue || "",
          discountPercent: parseInt(f.discountPercent?.integerValue || "0") || (f.discountPercent?.doubleValue ?? 0),
          active: f.active?.booleanValue !== false,
          createdAt: f.createdAt?.stringValue || "",
        };
      });
      return res.json({ coupons });
    } catch (error) {
      console.error("List coupons error:", error);
      return res.status(500).json({ message: "Failed to load coupons" });
    }
  });

  app.post("/api/coupons/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { code, discountPercent, active } = req.body;
      if (!code || !discountPercent) return res.status(400).json({ message: "code and discountPercent are required" });

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const docId = randomUUID();
      const patchRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/coupons/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            code: { stringValue: String(code).toUpperCase() },
            discountPercent: { integerValue: String(Math.min(100, Math.max(1, parseInt(discountPercent) || 0))) },
            active: { booleanValue: active !== false },
            createdAt: { stringValue: new Date().toISOString() },
          },
        }),
      });

      if (!patchRes.ok) return res.status(500).json({ message: "Failed to create coupon" });
      return res.json({ success: true, couponId: docId });
    } catch (error) {
      console.error("Create coupon error:", error);
      return res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  app.delete("/api/coupons/:merchantId/:couponId", async (req, res) => {
    try {
      const { merchantId, couponId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const delRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/coupons/${couponId}`, {
        method: "DELETE",
        headers: {},
      });

      if (!delRes.ok) return res.status(500).json({ message: "Failed to delete coupon" });
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete coupon error:", error);
      return res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  app.patch("/api/coupons/:merchantId/:couponId", async (req, res) => {
    try {
      const { merchantId, couponId } = req.params;
      const { active } = req.body;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const patchRes = await apikeyFetch(`${baseUrl}/merchants/${merchantId}/coupons/${couponId}?updateMask.fieldPaths=active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            active: { booleanValue: !!active },
          },
        }),
      });

      if (!patchRes.ok) return res.status(500).json({ message: "Failed to update coupon" });
      return res.json({ success: true });
    } catch (error) {
      console.error("Update coupon error:", error);
      return res.status(500).json({ message: "Failed to update coupon" });
    }
  });

  app.post("/api/coupons/:merchantId/validate", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { code } = req.body;
      if (!code) return res.status(400).json({ valid: false, message: "Code is required" });

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ valid: false, message: "Firestore not configured" });

      const url = `${baseUrl}/merchants/${merchantId}/coupons?pageSize=200`;
      const r = await fetch(url, { headers: {} });
      if (!r.ok) return res.json({ valid: false });
      const data = await r.json();
      const docs = data.documents || [];
      const match = docs.find((d: any) => {
        const cf = d.fields || {};
        return cf.code?.stringValue?.toUpperCase() === String(code).toUpperCase() && cf.active?.booleanValue === true;
      });

      if (!match) return res.json({ valid: false, message: "Invalid or expired coupon" });

      const pct = parseInt(match.fields.discountPercent?.integerValue || "0") || (match.fields.discountPercent?.doubleValue ?? 0);
      return res.json({ valid: true, discountPercent: pct, code: match.fields.code?.stringValue || code });
    } catch (error) {
      console.error("Validate coupon error:", error);
      return res.status(500).json({ valid: false, message: "Failed to validate coupon" });
    }
  });

  // ── Financial ──
  app.get("/api/financial/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { period, from, to } = req.query;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const now = new Date();
      let startDate: Date;
      let endDate = now;

      if (period === "custom" && from && to) {
        startDate = new Date(from as string);
        endDate = new Date(to as string);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === "7d") {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else if (period === "30d") {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
      }

      const url = `${baseUrl}/merchants/${merchantId}/whatsappOrders?pageSize=500`;
      const r = await fetch(url, { headers: {} });
      if (!r.ok) return res.json({ totalSales: 0, collectedSales: 0, lostSales: 0, completionRate: 0, orders: [] });
      const data = await r.json();
      const allDocs = data.documents || [];

      const orders: any[] = [];
      let totalSales = 0;
      let collectedSales = 0;
      let lostSales = 0;

      for (const d of allDocs) {
        const f = d.fields || {};
        const status = f.status?.stringValue || "";
        if (status !== "archived" && status !== "completed" && status !== "uncollected") continue;

        const createdAt = f.createdAt?.stringValue || "";
        const archivedAt = f.archivedAt?.stringValue || "";
        const orderDate = new Date(archivedAt || createdAt);
        if (isNaN(orderDate.getTime())) continue;
        if (orderDate < startDate || orderDate > endDate) continue;

        const total = f.total?.doubleValue ?? parseFloat(f.total?.integerValue || "0");
        const parts = d.name.split("/");

        const order = {
          id: parts[parts.length - 1],
          customerName: f.customerName?.stringValue || "",
          customerPhone: f.customerPhone?.stringValue || "",
          orderNumber: f.orderNumber?.stringValue || "",
          total,
          status,
          createdAt,
          archivedAt,
          couponCode: f.couponCode?.stringValue || "",
          discountAmount: f.discountAmount?.doubleValue ?? 0,
          originalTotal: f.originalTotal?.doubleValue ?? 0,
        };

        orders.push(order);
        totalSales += total;

        if (status === "archived" || status === "completed") {
          collectedSales += total;
        } else if (status === "uncollected") {
          lostSales += total;
        }
      }

      const totalFinished = orders.length;
      const completedCount = orders.filter(o => o.status === "archived" || o.status === "completed").length;
      const completionRate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 0;

      orders.sort((a: any, b: any) => (b.archivedAt || b.createdAt || "").localeCompare(a.archivedAt || a.createdAt || ""));

      return res.json({ totalSales, collectedSales, lostSales, completionRate, orders });
    } catch (error) {
      console.error("Financial data error:", error);
      return res.status(500).json({ message: "Failed to load financial data" });
    }
  });

  app.get("/api/financial/:merchantId/export", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { period, from, to } = req.query;

      const url = `${req.protocol}://${req.get("host")}/api/financial/${merchantId}?period=${period || "today"}&from=${from || ""}&to=${to || ""}`;
      const r = await fetch(url);
      if (!r.ok) return res.status(500).json({ message: "Failed to fetch data" });
      const data = await r.json();

      let csv = "Order #,Customer,Phone,Total (SAR),Status,Date,Coupon,Discount\n";
      for (const o of data.orders || []) {
        const statusLabel = o.status === "uncollected" ? "Uncollected" : "Completed";
        const date = o.archivedAt || o.createdAt || "";
        const maskedPhone = o.customerPhone ? o.customerPhone.slice(0, -3) + "***" : "";
        csv += `"${o.orderNumber}","${o.customerName}","${maskedPhone}",${o.total.toFixed(2)},${statusLabel},"${date}","${o.couponCode || ""}",${(o.discountAmount || 0).toFixed(2)}\n`;
      }

      csv += `\nTotal Sales,${data.totalSales.toFixed(2)}\n`;
      csv += `Collected,${data.collectedSales.toFixed(2)}\n`;
      csv += `Lost (Uncollected),${data.lostSales.toFixed(2)}\n`;
      csv += `Completion Rate,${data.completionRate}%\n`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="financial-report-${period || "today"}.csv"`);
      return res.send("\uFEFF" + csv);
    } catch (error) {
      console.error("Financial export error:", error);
      return res.status(500).json({ message: "Failed to export" });
    }
  });

  // ── Customers ──
  app.get("/api/customers/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      const url = `${baseUrl}/merchants/${merchantId}/customers?pageSize=500`;
      const r = await fetch(url, { headers: {} });
      if (!r.ok) return res.json({ customers: [] });
      const data = await r.json();
      const customers = (data.documents || []).map((d: any) => {
        const f = d.fields || {};
        const parts = d.name.split("/");
        return {
          id: parts[parts.length - 1],
          name: f.name?.stringValue || "",
          phone: f.phone?.stringValue || "",
          totalOrders: parseInt(f.totalOrders?.integerValue || "0"),
          lastOrderDate: f.lastOrderDate?.stringValue || "",
          noShowCount: parseInt(f.noShowCount?.integerValue || "0"),
        };
      });
      return res.json({ customers });
    } catch (error) {
      console.error("List customers error:", error);
      return res.status(500).json({ message: "Failed to load customers" });
    }
  });

  app.post("/api/cleanup-online-order-ids/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const adminEmail = req.headers["x-admin-email"] as string;
      if (adminEmail !== "yahiatohamy@hotmail.com" && adminEmail !== "yahiatohary@hotmail.com") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const baseUrl = getApiKeyBaseUrl();
      if (!baseUrl || !getApiKey()) return res.status(500).json({ message: "Firestore not configured" });

      let cleaned = 0;
      const details: { orderId: string; displayOrderId: string; removedOrderNumber: string }[] = [];
      let pageToken: string | null = null;

      do {
        let listUrl = `${baseUrl}/merchants/${merchantId}/whatsappOrders?pageSize=300`;
        if (pageToken) listUrl += `&pageToken=${encodeURIComponent(pageToken)}`;

        const listRes = await fetch(listUrl, { headers: {} });
        if (!listRes.ok) break;
        const listData = await listRes.json();
        const docs = listData.documents || [];
        pageToken = listData.nextPageToken || null;

        for (const d of docs) {
          const f = d.fields || {};
          const orderType = f.orderType?.stringValue || "";
          const displayOrderId = f.displayOrderId?.stringValue || "";
          const orderNumber = f.orderNumber?.stringValue || "";

          const isOnlineOrder = orderType === "online" || (displayOrderId && !displayOrderId.startsWith("MA-") && /^\d{4,}$/.test(displayOrderId));
          if (!isOnlineOrder) continue;

          const cloudOrderNum = displayOrderId.replace(/^0+/, "") || displayOrderId;
          if (orderNumber === cloudOrderNum) continue;

          const docName = d.name as string;
          const docId = docName.split("/").pop() || "";
          const patchUrl = `${baseUrl}/merchants/${merchantId}/whatsappOrders/${docId}?updateMask.fieldPaths=orderNumber`;
          const patchRes = await fetch(patchUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: { orderNumber: { stringValue: cloudOrderNum } } }),
          });
          if (patchRes.ok) {
            cleaned++;
            details.push({ orderId: docId, displayOrderId, removedOrderNumber: orderNumber });
            console.log(`[Cleanup] Fixed online order: displayOrderId=${displayOrderId}, old orderNumber=${orderNumber} → ${cloudOrderNum}`);
          }
        }
      } while (pageToken);

      console.log(`[Cleanup] Completed for merchant ${merchantId}: ${cleaned} orders cleaned`);
      return res.json({ success: true, cleaned, details });
    } catch (error) {
      console.error("Cleanup error:", error);
      return res.status(500).json({ message: "Cleanup failed" });
    }
  });

  return httpServer;
}
