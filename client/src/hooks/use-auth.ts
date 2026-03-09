import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Merchant } from "@shared/schema";

const SESSION_KEY = "dp-session";
const SUPER_ADMIN_EMAIL = "yahiatohary@hotmail.com";

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
    console.log("[Auth] Initializing - checking localStorage session");
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const session: SessionData = JSON.parse(stored);
        if (session.uid && session.email) {
          console.log("[Auth] Found stored session:", session.email, "uid:", session.uid);
          setUser(session);
          return;
        }
      }
    } catch (e) {
      console.error("[Auth] Error reading session from localStorage:", e);
    }
    console.log("[Auth] No valid session found, setting loading=false");
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      console.log("[Auth] No user UID, clearing merchant");
      setMerchant(null);
      setLoading(false);
      return;
    }

    if (user.email === SUPER_ADMIN_EMAIL) {
      console.log("[Auth] Super admin detected, skipping merchant fetch");
      setMerchant(null);
      setLoading(false);
      return;
    }

    console.log("[Auth] Setting up Firestore listener for merchant:", user.uid);
    const merchantDocRef = doc(db, "merchants", user.uid);
    const unsub = onSnapshot(
      merchantDocRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Merchant;
          console.log("[Auth] Merchant data received:", {
            uid: data.uid,
            status: data.status,
            subscriptionStatus: data.subscriptionStatus || "none",
            subscriptionExpiry: data.subscriptionExpiry || "none",
          });

          if (
            data.subscriptionStatus === "active" &&
            data.subscriptionExpiry &&
            new Date(data.subscriptionExpiry) < new Date()
          ) {
            console.log("[Auth] Auto-expiring subscription (past expiry date)");
            const expiredData = { ...data, subscriptionStatus: "expired" as const };
            setMerchant(expiredData);
            setLoading(false);
            try {
              await updateDoc(merchantDocRef, { subscriptionStatus: "expired" });
              console.log("[Auth] Auto-expire Firestore update successful");
            } catch (e) {
              console.error("[Auth] Auto-expire update failed:", e);
            }
            return;
          }

          setMerchant(data);
        } else {
          console.log("[Auth] Merchant document not found for uid:", user.uid);
          setMerchant(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("[Auth] Merchant snapshot error:", error);
        setMerchant(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, user?.email]);

  const login = useCallback((uid: string, email: string) => {
    console.log("[Auth] login() called - uid:", uid, "email:", email);
    const session: SessionData = { uid, email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLoading(true);
    setUser(session);
    console.log("[Auth] Session stored, loading=true, user set");
  }, []);

  const logout = useCallback(() => {
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
