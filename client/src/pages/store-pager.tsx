import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db, requestFCMToken } from "@/lib/firebase";
import type { Merchant, Pager } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Store, AlertTriangle, Bell, BellOff, CheckCircle } from "lucide-react";
import { useWakeLock } from "@/hooks/use-wake-lock";
import IosInstallPrompt from "@/components/ios-install-prompt";

function useAlertSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  const unlock = useCallback(() => {
    if (audioUnlockedRef.current) return;
    try {
      const audio = new Audio("/alert.mp3");
      audio.loop = true;
      audio.volume = 1.0;
      audio.load();
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
      audioRef.current = audio;
      audioUnlockedRef.current = true;
    } catch (e) {
      console.warn("Audio unlock failed:", e);
    }
  }, []);

  const play = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/alert.mp3");
        audioRef.current.loop = true;
        audioRef.current.volume = 1.0;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        console.warn("Audio play failed:", e);
      });
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  return { unlock, play, stop };
}

function useVibrationLoop() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (!("vibrate" in navigator)) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    navigator.vibrate([500, 200, 500, 200, 800]);
    intervalRef.current = setInterval(() => {
      navigator.vibrate([500, 200, 500, 200, 800]);
    }, 2200);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if ("vibrate" in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if ("vibrate" in navigator) navigator.vibrate(0);
    };
  }, []);

  return { start, stop };
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
  alertActive,
  onStopAlert,
}: {
  orderNumber: string;
  storeName: string;
  googleMapsReviewUrl: string;
  showReview: boolean;
  alertActive: boolean;
  onStopAlert: () => void;
}) {
  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${
        alertActive ? "animate-flash-red" : "bg-red-600"
      }`}
    >
      <div className="mb-6">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.4)] ${alertActive ? "bg-white animate-pulse" : "bg-white"}`}>
          <span className="text-red-600 font-bold text-3xl" data-testid="text-notified-order-number">{orderNumber}</span>
        </div>
      </div>

      <h1 className="text-white text-2xl font-bold mb-3" data-testid="text-notified-store">{storeName}</h1>

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

      {alertActive && (
        <div className="mt-8">
          <Button
            size="lg"
            onClick={onStopAlert}
            className="bg-white text-red-600 hover:bg-white/90 font-bold text-lg h-16 px-8 shadow-xl border-2 border-white/50"
            data-testid="button-stop-alert"
          >
            <BellOff className="w-6 h-6 me-2" />
            <span dir="rtl">تم الاستلام - إيقاف التنبيه</span>
          </Button>
          <p className="text-white/60 text-sm mt-3">Received - Stop Alert</p>
        </div>
      )}

      {!alertActive && (
        <div className="mt-8">
          <div className="flex items-center justify-center gap-2 mb-6 text-white/70">
            <CheckCircle className="w-5 h-5" />
            <span dir="rtl" className="text-sm">تم إيقاف التنبيه</span>
            <span className="text-xs">/ Alert stopped</span>
          </div>
        </div>
      )}

      {showReview && (
        <div className="mt-4 animate-in slide-in-from-bottom duration-700">
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
  const [alertActive, setAlertActive] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const hasPlayedNotification = useRef(false);
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { unlock, play, stop: stopSound } = useAlertSound();
  const { start: startVibration, stop: stopVibration } = useVibrationLoop();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, requestWakeLock, releaseWakeLock } = useWakeLock(false);

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
        setAlertActive(true);
        play();
        startVibration();

        reviewTimerRef.current = setTimeout(() => {
          setShowReview(true);
        }, 2 * 60 * 1000);
      } else if (pager.status === "waiting") {
        setPagerStatus("waiting");
      }
    }, (error) => {
      console.error("Pager listener error:", error);
    });

    return () => unsubscribe();
  }, [submitted, storeId, orderNumber, play, startVibration]);

  useEffect(() => {
    return () => {
      if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
    };
  }, []);

  async function handleUnlockAndSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    unlock();
    requestWakeLock();
    hasPlayedNotification.current = false;
    setPagerStatus("waiting");
    setShowReview(false);
    setAlertActive(false);
    setSubmitted(true);

    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {}
    }

    if ("Notification" in window && Notification.permission === "granted" && storeId) {
      try {
        const token = await requestFCMToken();
        if (token) {
          const pagersRef = collection(db, "merchants", storeId, "pagers");
          const q2 = query(
            pagersRef,
            where("orderNumber", "==", orderNumber.trim()),
            where("status", "in", ["waiting", "notified"])
          );
          const unsub = onSnapshot(q2, async (snap) => {
            if (!snap.empty) {
              const pagerDoc = snap.docs[0];
              try {
                await updateDoc(pagerDoc.ref, { fcmToken: token });
              } catch {}
              unsub();
            }
          });
          setTimeout(() => { try { unsub(); } catch {} }, 30000);
        }
      } catch (e) {
        console.warn("FCM setup failed:", e);
      }
    }
  }

  function handleStopAlert() {
    stopSound();
    stopVibration();
    setAlertActive(false);
    releaseWakeLock();
  }

  let content: JSX.Element;

  if (loading) {
    content = (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  } else if (notFound || !merchant) {
    content = (
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
  } else if (submitted && pagerStatus === "notified") {
    content = (
      <NotifiedScreen
        orderNumber={orderNumber}
        storeName={merchant.storeName}
        googleMapsReviewUrl={merchant.googleMapsReviewUrl}
        showReview={showReview}
        alertActive={alertActive}
        onStopAlert={handleStopAlert}
      />
    );
  } else if (submitted && pagerStatus === "waiting") {
    content = (
      <>
        <WaitingScreen orderNumber={orderNumber} storeName={merchant.storeName} />
        {wakeLockSupported && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-full px-3 py-1.5">
            <div className={`w-2 h-2 rounded-full ${wakeLockActive ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
            <span className="text-gray-400 text-[10px]">{wakeLockActive ? "Screen stays on" : "Requesting wake lock..."}</span>
          </div>
        )}
      </>
    );
  } else if (merchant) {
    content = (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative">
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
            <form onSubmit={handleUnlockAndSubmit} className="space-y-4">
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
                <Bell className="w-5 h-5 me-2" />
                <span dir="rtl">ابدأ الانتظار واستقبل التنبيه</span>
              </Button>
              <p className="text-center text-gray-600 text-xs" dir="rtl">
                بالضغط على الزر، سيتم تفعيل الصوت والاهتزاز للتنبيه
              </p>
              <p className="text-center text-gray-700 text-[10px]">
                Pressing the button enables sound & vibration alerts
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  } else {
    content = (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <IosInstallPrompt />
      {content}
    </>
  );
}
