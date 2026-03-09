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

async function logSystemError(merchantId: string, errorType: string, errorMessage: string): Promise<void> {
  const accessToken = await getFirestoreAccessToken();
  const baseUrl = getFirestoreBaseUrl();
  if (!accessToken || !baseUrl) return;

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
    await fetch(`${baseUrl}/system_errors/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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

function sanitizeEmailKey(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 40);
}

async function saveOtpToFirestore(email: string, code: string): Promise<boolean> {
  const accessToken = await getFirestoreAccessToken();
  const baseUrl = getFirestoreBaseUrl();
  if (!accessToken || !baseUrl) return false;

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
    const res = await fetch(`${baseUrl}/otps/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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
  const accessToken = await getFirestoreAccessToken();
  const baseUrl = getFirestoreBaseUrl();
  if (!accessToken || !baseUrl) return null;

  const docId = sanitizeEmailKey(email);

  try {
    const res = await fetch(`${baseUrl}/otps/${docId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
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
  const accessToken = await getFirestoreAccessToken();
  const baseUrl = getFirestoreBaseUrl();
  if (!accessToken || !baseUrl) return;

  const docId = sanitizeEmailKey(email);
  try {
    await fetch(`${baseUrl}/otps/${docId}?updateMask.fieldPaths=attempts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ fields: { attempts: { integerValue: String(attempts) } } }),
    });
  } catch {}
}

async function deleteOtpFromFirestore(email: string): Promise<void> {
  const accessToken = await getFirestoreAccessToken();
  const baseUrl = getFirestoreBaseUrl();
  if (!accessToken || !baseUrl) return;

  const docId = sanitizeEmailKey(email);
  try {
    await fetch(`${baseUrl}/otps/${docId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
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

      const SUPER_ADMIN_EMAIL = "yahiatohary@hotmail.com";

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

  const SUPER_ADMIN_EMAIL_GLOBAL = "yahiatohary@hotmail.com";

  async function isAdminRequest(req: any): Promise<boolean> {
    const adminEmail = req.headers["x-admin-email"];
    if (!adminEmail || typeof adminEmail !== "string") return false;
    return adminEmail.toLowerCase().trim() === SUPER_ADMIN_EMAIL_GLOBAL;
  }

  app.post("/api/admin/impersonate/:merchantId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { merchantId } = req.params;
      const accessToken = await getFirestoreAccessToken();
      const baseUrl = getFirestoreBaseUrl();
      if (!accessToken || !baseUrl) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const docRes = await fetch(`${baseUrl}/merchants/${merchantId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
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
      const accessToken = await getFirestoreAccessToken();
      const baseUrl = getFirestoreBaseUrl();
      if (!accessToken || !baseUrl) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const docRes = await fetch(`${baseUrl}/systemSettings/global`, {
        headers: { Authorization: `Bearer ${accessToken}` },
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
      const accessToken = await getFirestoreAccessToken();
      const baseUrl = getFirestoreBaseUrl();
      if (!accessToken || !baseUrl) {
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

      const patchRes = await fetch(`${baseUrl}/systemSettings/global`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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
      const accessToken = await getFirestoreAccessToken();
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!accessToken || !projectId) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
      const docPath = `projects/${projectId}/databases/(default)/documents/merchants/${storeId}`;
      await fetch(commitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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
      const accessToken = await getFirestoreAccessToken();
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!accessToken || !projectId) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
      const docPath = `projects/${projectId}/databases/(default)/documents/merchants/${storeId}`;
      await fetch(commitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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
      const accessToken = await getFirestoreAccessToken();
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!accessToken || !projectId) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
      const docPath = `projects/${projectId}/databases/(default)/documents/merchants/${storeId}`;
      await fetch(commitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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

      const accessToken = await getFirestoreAccessToken();
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!accessToken || !projectId) {
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
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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

  app.get("/api/admin/errors", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const accessToken = await getFirestoreAccessToken();
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!accessToken || !projectId) {
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
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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
      const accessToken = await getFirestoreAccessToken();
      const baseUrl = getFirestoreBaseUrl();
      if (!accessToken || !baseUrl) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const patchRes = await fetch(`${baseUrl}/system_errors/${errorId}?updateMask.fieldPaths=resolved`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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

  app.get("/api/admin/merchant-report/:merchantId", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { merchantId } = req.params;
      const accessToken = await getFirestoreAccessToken();
      const baseUrl = getFirestoreBaseUrl();
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (!accessToken || !baseUrl || !projectId) {
        return res.status(500).json({ message: "Firestore not configured" });
      }

      const docRes = await fetch(`${baseUrl}/merchants/${merchantId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
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
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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

  return httpServer;
}
