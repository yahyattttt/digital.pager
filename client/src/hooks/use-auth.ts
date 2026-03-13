import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Merchant } from "@shared/schema";

const SESSION_KEY = "dp-session";
const PRIMARY_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || "yahiatohary@hotmail.com";
const ADMIN_EMAILS = [PRIMARY_ADMIN_EMAIL.toLowerCase(), "admin@test.com"];
function isAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

const TEST_MERCHANT_EMAIL = "merchant@test.com";
const MOCK_TEST_MERCHANT: Merchant = {
  uid: "",
  id: "",
  storeName: "Test Store",
  businessType: "restaurant",
  email: TEST_MERCHANT_EMAIL,
  logoUrl: "",
  commercialRegisterURL: "",
  googleMapsReviewUrl: "https://maps.google.com",
  status: "approved",
  subscriptionStatus: "active",
  plan: "trial",
  sharesCount: 0,
  googleMapsClicks: 0,
  qrScans: 0,
  createdAt: new Date().toISOString(),
};

interface SessionData {
  uid: string;
  email: string;
}

interface AuthContextType {
  user: SessionData | null;
  merchant: Merchant | null;
  loading: boolean;
  login: (uid: string, email: string) => void;
  logout: () => void;
  refreshMerchant: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  merchant: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshMerchant: () => {},
});

export function useAuthProvider() {
  const [user, setUser] = useState<SessionData | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[Auth] Initializing — checking localStorage session");
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const session: SessionData = JSON.parse(stored);
        if (session.uid && session.email) {
          console.log("[Auth] Restored session:", session.email);
          setUser(session);
          return;
        }
      }
    } catch (e) {
      console.warn("[Auth] Failed to parse session:", e);
    }
    console.log("[Auth] No valid session found");
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setMerchant(null);
      setLoading(false);
      return;
    }

    if (isAdminEmail(user.email)) {
      console.log("[Auth] Admin email detected — skipping merchant fetch:", user.email);
      setMerchant(null);
      setLoading(false);
      return;
    }

    if (user.email.toLowerCase() === TEST_MERCHANT_EMAIL) {
      console.log("[Auth] Test merchant account — injecting mock merchant data with uid:", user.uid);
      setMerchant({ ...MOCK_TEST_MERCHANT, uid: user.uid, id: user.uid });
      setLoading(false);
      return;
    }

    console.log("[Auth] Setting up Firestore listener for merchant uid:", user.uid);
    const merchantDocRef = doc(db, "merchants", user.uid);
    const unsub = onSnapshot(
      merchantDocRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Merchant;
          console.log("[Auth] Merchant loaded from Firestore:", data.storeName, "| status:", data.status, "| sub:", data.subscriptionStatus);

          if (
            data.subscriptionStatus === "active" &&
            data.subscriptionExpiry &&
            new Date(data.subscriptionExpiry) < new Date()
          ) {
            console.log("[Auth] Auto-expiring subscription");
            const expiredData = { ...data, uid: snap.id, id: snap.id, subscriptionStatus: "expired" as const };
            setMerchant(expiredData);
            setLoading(false);
            try {
              await updateDoc(merchantDocRef, { subscriptionStatus: "expired" });
            } catch (e) {
              console.warn("[Auth] Failed to update expired subscription:", e);
            }
            return;
          }

          setMerchant({ ...data, uid: snap.id, id: snap.id });
        } else {
          console.warn("[Auth] No merchant document found for uid:", user.uid);
          setMerchant(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("[Auth] Firestore snapshot error:", error.code, error.message);
        setMerchant(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, user?.email]);

  const login = useCallback((uid: string, email: string) => {
    console.log("[Auth] login() called for:", email, "uid:", uid);
    const session: SessionData = { uid, email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLoading(true);
    setUser(session);
  }, []);

  const logout = useCallback(() => {
    console.log("[Auth] logout()");
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setMerchant(null);
  }, []);

  function refreshMerchant() {}

  return { user, merchant, loading, login, logout, refreshMerchant };
}

export { AuthContext };

export function useAuth() {
  return useContext(AuthContext);
}
