import { useState, useEffect, createContext, useContext } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Merchant } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  merchant: Merchant | null;
  loading: boolean;
  refreshMerchant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  merchant: null,
  loading: true,
  refreshMerchant: async () => {},
});

export function useAuthProvider() {
  const [user, setUser] = useState<User | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMerchant(firebaseUser: User) {
    try {
      const merchantDoc = await getDoc(doc(db, "merchants", firebaseUser.uid));
      if (merchantDoc.exists()) {
        setMerchant(merchantDoc.data() as Merchant);
      } else {
        setMerchant(null);
      }
    } catch (error) {
      console.error("Error fetching merchant data:", error);
      setMerchant(null);
    }
  }

  async function refreshMerchant() {
    if (user) {
      await fetchMerchant(user);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchMerchant(firebaseUser);
      } else {
        setMerchant(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, merchant, loading, refreshMerchant };
}

export { AuthContext };

export function useAuth() {
  return useContext(AuthContext);
}
