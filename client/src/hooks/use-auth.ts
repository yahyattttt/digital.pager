import { useState, useEffect, createContext, useContext } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Merchant } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  merchant: Merchant | null;
  loading: boolean;
  refreshMerchant: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  merchant: null,
  loading: true,
  refreshMerchant: () => {},
});

export function useAuthProvider() {
  const [user, setUser] = useState<User | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubMerchant: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubMerchant) {
        unsubMerchant();
        unsubMerchant = null;
      }

      if (firebaseUser) {
        unsubMerchant = onSnapshot(
          doc(db, "merchants", firebaseUser.uid),
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
      } else {
        setMerchant(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubMerchant) unsubMerchant();
    };
  }, []);

  function refreshMerchant() {}

  return { user, merchant, loading, refreshMerchant };
}

export { AuthContext };

export function useAuth() {
  return useContext(AuthContext);
}
