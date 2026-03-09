import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let messagingInstance: Messaging | null = null;

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function requestFCMToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const registration = await navigator.serviceWorker.getRegistration("/")
      || await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token;
  } catch (e) {
    console.warn("FCM token request failed:", e);
    return null;
  }
}

export default app;
