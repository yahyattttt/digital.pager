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
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const session: SessionData = JSON.parse(stored);
        if (session.uid && session.email) {
          setUser(session);
          return;
        }
      }
    } catch (e) {
      void e;
    }
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
      setMerchant(null);
      setLoading(false);
      return;
    }

    const merchantDocRef = doc(db, "merchants", user.uid);
    const unsub = onSnapshot(
      merchantDocRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Merchant;

          if (
            data.subscriptionStatus === "active" &&
            data.subscriptionExpiry &&
            new Date(data.subscriptionExpiry) < new Date()
          ) {
            const expiredData = { ...data, subscriptionStatus: "expired" as const };
            setMerchant(expiredData);
            setLoading(false);
            try {
              await updateDoc(merchantDocRef, { subscriptionStatus: "expired" });
            } catch (e) {
              void e;
            }
            return;
          }

          setMerchant(data);
        } else {
          setMerchant(null);
        }
        setLoading(false);
      },
      (error) => {
        void error;
        setMerchant(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, user?.email]);

  const login = useCallback((uid: string, email: string) => {
    const session: SessionData = { uid, email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLoading(true);
    setUser(session);
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
