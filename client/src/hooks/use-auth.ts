import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Merchant } from "@shared/schema";

const SESSION_KEY = "dp-session";

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
    } catch {}
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setMerchant(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "merchants", user.uid),
      (snap) => {
        if (snap.exists()) {
          setMerchant(snap.data() as Merchant);
        } else {
          setMerchant(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Merchant snapshot error:", error);
        setMerchant(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

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
