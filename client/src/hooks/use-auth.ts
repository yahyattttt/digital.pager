import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Merchant } from "@shared/schema";

const SESSION_KEY = "dp-session";

interface SessionData {
  uid: string;
  email: string;
  isAdmin?: boolean;
  isStaff?: boolean;
  staffPermissions?: string[];
  staffName?: string;
  staffId?: string;
}

interface AuthContextType {
  user: SessionData | null;
  merchant: Merchant | null;
  loading: boolean;
  login: (uid: string, email: string, isAdmin?: boolean, isStaff?: boolean, staffPermissions?: string[], staffName?: string, staffId?: string) => void;
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
      console.warn("[Auth] Failed to parse session:", e);
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

    if (user.isAdmin) {
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

  const login = useCallback((uid: string, email: string, isAdmin?: boolean, isStaff?: boolean, staffPermissions?: string[], staffName?: string, staffId?: string) => {
    const session: SessionData = {
      uid,
      email,
      ...(isAdmin ? { isAdmin: true } : {}),
      ...(isStaff ? { isStaff: true, staffPermissions: staffPermissions || [], staffName: staffName || "", staffId: staffId || "" } : {}),
    };
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
