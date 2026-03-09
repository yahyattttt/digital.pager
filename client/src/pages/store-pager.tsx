import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Merchant, Pager } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Send, Store, AlertTriangle } from "lucide-react";

function useBeepSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.2);

      oscillator.start(ctx.currentTime);

      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.2);
      gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.25);
      gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.4);

      oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.4);
      gainNode.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.45);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

      oscillator.stop(ctx.currentTime + 1.3);
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }, []);

  return { playBeep };
}

function triggerVibration() {
  if ("vibrate" in navigator) {
    navigator.vibrate([300, 100, 300, 100, 500]);
  }
}

function WaitingScreen({ orderNumber, storeName }: { orderNumber: string; storeName: string }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8">
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-red-600/20 animate-ping" />
          <div className="absolute inset-3 rounded-full bg-red-600/30 animate-ping" style={{ animationDelay: "0.3s" }} />
          <div className="absolute inset-6 rounded-full bg-red-600/40 animate-ping" style={{ animationDelay: "0.6s" }} />
          <div className="relative w-32 h-32 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_60px_rgba(255,0,0,0.5)]">
            <span className="text-white font-bold text-2xl" data-testid="text-pager-order-number">{orderNumber}</span>
          </div>
        </div>
      </div>

      <h1 className="text-white text-xl font-bold mb-2" data-testid="text-store-name-pager">
        {storeName}
      </h1>

      <p
        className="text-red-400 text-lg font-medium leading-relaxed max-w-sm"
        dir="rtl"
        data-testid="text-waiting-message"
      >
        جاري تحضير طلبك.. سنقوم بتنبيهك فور الجاهزية
      </p>

      <p className="text-gray-500 text-sm mt-4" data-testid="text-waiting-hint">
        Your order is being prepared. We'll notify you when it's ready.
      </p>

      <div className="mt-12 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0s" }} />
        <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
        <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}

function NotifiedScreen({
  orderNumber,
  storeName,
  googleMapsReviewUrl,
  showReview,
}: {
  orderNumber: string;
  storeName: string;
  googleMapsReviewUrl: string;
  showReview: boolean;
}) {
  return (
    <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="mb-8">
        <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.4)]">
          <span className="text-red-600 font-bold text-3xl" data-testid="text-notified-order-number">{orderNumber}</span>
        </div>
      </div>

      <h1 className="text-white text-2xl font-bold mb-4" data-testid="text-notified-store">{storeName}</h1>

      <p
        className="text-white text-2xl font-bold leading-relaxed max-w-sm"
        dir="rtl"
        data-testid="text-notified-message"
      >
        طلبك جاهز! تفضل بالاستلام
      </p>

      <p className="text-white/80 text-base mt-2" data-testid="text-notified-hint">
        Your order is ready! Please pick it up.
      </p>

      {showReview && (
        <div className="mt-10 animate-in slide-in-from-bottom duration-700">
          <Button
            size="lg"
            onClick={() => window.open(googleMapsReviewUrl, "_blank")}
            className="bg-white text-red-600 hover:bg-white/90 font-bold text-lg h-16 px-8 shadow-xl"
            data-testid="button-google-review"
          >
            <Star className="w-6 h-6 me-2 fill-current" />
            قيمنا على جوجل ماب
          </Button>
          <p className="text-white/60 text-sm mt-3">Rate us on Google Maps</p>
        </div>
      )}
    </div>
  );
}

export default function StorePagerPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pagerStatus, setPagerStatus] = useState<"waiting" | "notified" | "completed">("waiting");
  const [showReview, setShowReview] = useState(false);
  const hasPlayedNotification = useRef(false);
  const { playBeep } = useBeepSound();

  useEffect(() => {
    async function fetchStore() {
      if (!storeId) return;
      try {
        const merchantDoc = await getDoc(doc(db, "merchants", storeId));
        if (merchantDoc.exists()) {
          const data = merchantDoc.data() as Merchant;
          if (data.status === "approved" && data.subscriptionStatus === "active") {
            setMerchant(data);
          } else {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, [storeId]);

  useEffect(() => {
    if (!submitted || !storeId || !orderNumber) return;

    const pagersRef = collection(db, "merchants", storeId, "pagers");
    const q = query(
      pagersRef,
      where("orderNumber", "==", orderNumber),
      where("status", "in", ["waiting", "notified"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;

      const pagerDoc = snapshot.docs[0];
      const pager = pagerDoc.data() as Pager;

      if (pager.status === "notified" && !hasPlayedNotification.current) {
        hasPlayedNotification.current = true;
        setPagerStatus("notified");
        playBeep();
        triggerVibration();

        setTimeout(() => {
          setShowReview(true);
        }, 2 * 60 * 1000);
      } else if (pager.status === "waiting") {
        setPagerStatus("waiting");
      }
    }, (error) => {
      console.error("Pager listener error:", error);
    });

    return () => unsubscribe();
  }, [submitted, storeId, orderNumber, playBeep]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    hasPlayedNotification.current = false;
    setPagerStatus("waiting");
    setShowReview(false);
    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !merchant) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="w-full max-w-sm border-red-600/20 bg-black">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2" dir="rtl" data-testid="text-store-not-found">
              المتجر غير موجود
            </h2>
            <p className="text-gray-400 text-sm" data-testid="text-store-not-found-en">
              Store not found or currently unavailable.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && pagerStatus === "notified") {
    return (
      <NotifiedScreen
        orderNumber={orderNumber}
        storeName={merchant.storeName}
        googleMapsReviewUrl={merchant.googleMapsReviewUrl}
        showReview={showReview}
      />
    );
  }

  if (submitted && pagerStatus === "waiting") {
    return <WaitingScreen orderNumber={orderNumber} storeName={merchant.storeName} />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <Card className="w-full max-w-sm border-red-600/20 bg-zinc-950">
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-8">
            {merchant.logoUrl ? (
              <img
                src={merchant.logoUrl}
                alt={merchant.storeName}
                className="w-20 h-20 rounded-full object-cover border-2 border-red-600/30 mx-auto mb-4"
                data-testid="img-store-logo"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-600/10 border-2 border-red-600/30 flex items-center justify-center mx-auto mb-4">
                <Store className="w-10 h-10 text-red-500" />
              </div>
            )}
            <h1 className="text-white text-2xl font-bold mb-1" data-testid="text-store-name-entry">
              {merchant.storeName}
            </h1>
            <p className="text-gray-400 text-sm" dir="rtl">
              أدخل رقم طلبك للانتظار
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Enter your order number to start waiting
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="رقم الطلب / Order Number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="h-16 text-center text-2xl font-bold bg-black border-red-600/30 text-white placeholder:text-gray-600 focus:border-red-500 focus:ring-red-500/20"
              dir="ltr"
              data-testid="input-order-number"
            />
            <Button
              type="submit"
              size="lg"
              disabled={!orderNumber.trim()}
              className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-30"
              data-testid="button-submit-order"
            >
              <Send className="w-5 h-5 me-2" />
              <span dir="rtl">ابدأ الانتظار</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
