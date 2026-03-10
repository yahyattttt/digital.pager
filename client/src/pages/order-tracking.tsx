import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store, AlertTriangle, BellOff, Bell, Clock, CheckCircle, Loader2, Star, Banknote, Phone, MessageCircle } from "lucide-react";
import type { WhatsAppOrder } from "@shared/schema";

function PagerDevice({ orderNumber, isReady }: { orderNumber: string; isReady: boolean }) {
  const leds = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 360) / 12 - 90;
    const rad = (angle * Math.PI) / 180;
    const r = 47;
    return { cx: 50 + r * Math.cos(rad), cy: 50 + r * Math.sin(rad), delay: `${(i * 0.2).toFixed(1)}s` };
  });

  return (
    <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto" data-testid="pager-device">
      <div className={`absolute inset-0 rounded-full ${isReady ? "pager-neon-pulse" : ""}`} style={{ background: "radial-gradient(circle at center, rgba(30,0,0,0.6) 30%, rgba(0,0,0,0.9) 70%)" }} />
      <div className="absolute rounded-full" style={{ inset: "8%", background: "radial-gradient(circle at 40% 35%, #1a1a1a 0%, #0a0a0a 50%, #000 100%)", boxShadow: "inset 0 2px 20px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.04)" }} />
      <div className="absolute rounded-full" style={{ inset: "15%", background: "radial-gradient(circle at 45% 40%, #141414 0%, #080808 60%, #000 100%)", boxShadow: "inset 0 3px 15px rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.02)" }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ filter: isReady ? "url(#led-glow-ready-t)" : "url(#led-glow-t)" }}>
        <defs>
          <filter id="led-glow-t" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="led-glow-ready-t" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {leds.map((led, i) => (
          <circle key={i} cx={led.cx} cy={led.cy} r={isReady ? "2.2" : "1.8"} fill="#ff0000" className={isReady ? "pager-led-ready" : "pager-led-waiting"} style={{ animationDelay: led.delay }} />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-dseg7 text-red-500 tracking-wider select-none"
          style={{
            fontSize: orderNumber.length > 3 ? "2.5rem" : orderNumber.length > 2 ? "3rem" : "3.5rem",
            textShadow: "0 0 20px rgba(255,0,0,0.6), 0 0 40px rgba(255,0,0,0.3)",
          }}
          data-testid="text-tracking-order-number"
        >
          {orderNumber}
        </span>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [order, setOrder] = useState<WhatsAppOrder | null>(null);
  const [merchant, setMerchant] = useState<{ storeName: string; logoUrl: string; googleMapsReviewUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pendingAlert, setPendingAlert] = useState(false);
  const hasPlayedAlert = useRef(false);

  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const merchantId = new URLSearchParams(window.location.search).get("m") || "";
  const audioUnlockedRef = useRef(false);

  function ensureAudioElement() {
    if (!alertSoundRef.current) {
      alertSoundRef.current = new Audio("/alert.mp3");
      alertSoundRef.current.loop = true;
      alertSoundRef.current.volume = 1.0;
      alertSoundRef.current.preload = "auto";
      alertSoundRef.current.addEventListener("error", () => {
        console.warn("[OrderTracking] Alert sound file failed to load — check /alert.mp3");
      });
    }
    return alertSoundRef.current;
  }

  const pendingAlertRef = useRef(false);

  const cleanupListenersRef = useRef<(() => void) | null>(null);

  function removeUnlockListeners() {
    if (cleanupListenersRef.current) {
      cleanupListenersRef.current();
      cleanupListenersRef.current = null;
    }
  }

  const [bellFading, setBellFading] = useState(false);

  function unlockAudio(): Promise<boolean> {
    if (audioUnlockedRef.current) return Promise.resolve(true);
    const audio = ensureAudioElement();
    audio.muted = true;
    return audio.play().then(() => {
      audio.pause();
      audio.muted = false;
      audio.currentTime = 0;
      audioUnlockedRef.current = true;
      setSoundEnabled(true);
      sessionStorage.setItem("pager_audio_unlocked", "true");
      removeUnlockListeners();
      console.log("[OrderTracking] Audio unlocked successfully");
      if (pendingAlertRef.current) {
        console.log("[OrderTracking] Deferred alert detected — playing now");
        setPendingAlert(false);
        pendingAlertRef.current = false;
        playAlert();
      }
      return true;
    }).catch((e) => {
      audio.muted = false;
      return false;
    });
  }

  function handleActivateBell() {
    setBellFading(true);
    unlockAudio().then((success) => {
      if (!success) {
        setBellFading(false);
      } else {
        setTimeout(() => setBellFading(false), 400);
      }
    });
  }

  useEffect(() => {
    ensureAudioElement();
    if (sessionStorage.getItem("pager_audio_unlocked") === "true") {
      unlockAudio();
    }
    const events = ["click", "touchstart", "touchmove", "scroll", "keydown", "pointerdown"];
    function handleInteraction() {
      unlockAudio();
    }
    events.forEach(e => document.addEventListener(e, handleInteraction, { passive: true }));
    cleanupListenersRef.current = () => {
      events.forEach(e => document.removeEventListener(e, handleInteraction));
    };
    return () => removeUnlockListeners();
  }, []);

  function playAlert() {
    if (hasPlayedAlert.current) return;
    hasPlayedAlert.current = true;
    setAlertActive(true);
    console.log("[OrderTracking] Attempting to play sound... audioUnlocked:", audioUnlockedRef.current);

    const audio = ensureAudioElement();
    audio.currentTime = 0;
    audio.play().then(() => {
      console.log("[OrderTracking] Sound playing successfully");
      setSoundEnabled(true);
    }).catch((err) => {
      console.warn("[OrderTracking] Play failed:", err.message, "— showing tap-to-play fallback");
      hasPlayedAlert.current = false;
      setAlertActive(false);
      setPendingAlert(true);
      pendingAlertRef.current = true;
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      if ("vibrate" in navigator) navigator.vibrate(0);
    });

    if ("vibrate" in navigator) {
      navigator.vibrate([500, 200, 500, 200, 800]);
      vibrationIntervalRef.current = setInterval(() => {
        navigator.vibrate([500, 200, 500, 200, 800]);
      }, 2200);
    }
  }

  function stopAlert() {
    if (alertSoundRef.current) {
      alertSoundRef.current.pause();
      alertSoundRef.current.currentTime = 0;
    }
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if ("vibrate" in navigator) navigator.vibrate(0);
    setAlertActive(false);
    setPendingAlert(false);
    pendingAlertRef.current = false;
  }

  useEffect(() => {
    return () => {
      if (alertSoundRef.current) { alertSoundRef.current.pause(); alertSoundRef.current.currentTime = 0; }
      if (vibrationIntervalRef.current) clearInterval(vibrationIntervalRef.current);
      if ("vibrate" in navigator) navigator.vibrate(0);
    };
  }, []);

  useEffect(() => {
    if (!orderId || !merchantId) { setNotFound(true); setLoading(false); return; }

    async function fetchInitial() {
      try {
        const res = await fetch(`/api/track/${orderId}?merchantId=${merchantId}`);
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json();
        setOrder(data.order);
        setMerchant(data.merchant);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchInitial();
  }, [orderId, merchantId]);

  useEffect(() => {
    if (!orderId || !merchantId) return;

    let prevStatus: string | null = null;
    let isFirstSnapshot = true;

    const docRef = doc(db, "merchants", merchantId, "whatsappOrders", orderId);
    console.log("[OrderTracking] Setting up Firestore listener for:", `merchants/${merchantId}/whatsappOrders/${orderId}`);
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        console.log("[OrderTracking] Document does not exist in snapshot");
        stopAlert();
        setOrder(null);
        setNotFound(true);
        return;
      }
      const data = snap.data();
      const updatedOrder: WhatsAppOrder = {
        id: snap.id,
        merchantId: data.merchantId || "",
        customerName: data.customerName || "",
        customerPhone: data.customerPhone || "",
        items: (data.items || []).map((item: any) => ({
          productId: item.productId || "",
          name: item.name || "",
          price: item.price || 0,
          quantity: item.quantity || 1,
        })),
        total: data.total || 0,
        status: data.status || "pending_verification",
        paymentMethod: data.paymentMethod || "cod",
        orderNumber: data.orderNumber || "",
        createdAt: data.createdAt || "",
      };
      setOrder(updatedOrder);

      const currentStatus = updatedOrder.status;
      console.log("[OrderTracking] Firestore snapshot — status:", currentStatus, "prev:", prevStatus, "firstSnap:", isFirstSnapshot);

      if (isFirstSnapshot) {
        prevStatus = currentStatus;
        isFirstSnapshot = false;
        if (currentStatus === "ready") {
          console.log("[OrderTracking] Page loaded with ready status — playing alert");
          playAlert();
        }
        return;
      }

      if (currentStatus === "ready") {
        if (prevStatus !== "ready") {
          console.log("[OrderTracking] Status changed to ready — playing alert");
          hasPlayedAlert.current = false;
          playAlert();
        }
      } else {
        stopAlert();
        hasPlayedAlert.current = false;
      }

      prevStatus = currentStatus;
    }, (error) => {
      console.error("[OrderTracking] Firestore listener error:", error.message);
    });

    return () => unsub();
  }, [orderId, merchantId]);

  function handleStopAlert() {
    stopAlert();
  }

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/30 text-xs tracking-[0.3em] uppercase">LOADING ORDER</span>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center p-6">
        <Card className="w-full max-w-sm border-red-600/20 bg-black">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2" dir="rtl" data-testid="text-order-not-found">الطلب غير موجود</h2>
            <p className="text-gray-400 text-sm" data-testid="text-order-not-found-en">Order not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (order.status === "pending_verification" || order.status === "awaiting_confirmation") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }} data-testid="tracking-awaiting-screen">
        <div className="w-full flex-shrink-0 mb-6">
          <h2 className="text-white/90 text-sm font-bold tracking-[0.3em] uppercase mb-1" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>DIGITAL PAGER</h2>
          {merchant && <p className="text-red-500/60 text-xs tracking-widest uppercase">{merchant.storeName}</p>}
        </div>

        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <div className="w-20 h-20 rounded-full border-2 border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 30px rgba(16,185,129,0.08)" }}>
            <CheckCircle className="w-10 h-10 text-emerald-500/70 animate-pulse" />
          </div>

          <div>
            <p className="text-emerald-400 text-lg font-bold" dir="rtl" data-testid="text-awaiting-message">تم إرسال طلبك..</p>
            <p className="text-white/50 text-sm mt-1.5" data-testid="text-awaiting-hint">Your order has been submitted!</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 w-full" data-testid="verification-message">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-amber-400" />
              <MessageCircle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-amber-400/90 text-sm leading-relaxed font-bold" dir="rtl">
              بانتظار اتصال المتجر للتحقق
            </p>
            <p className="text-white/40 text-[11px] mt-2">
              Waiting for the store to call and verify your order.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/30 w-full">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-white/30 text-[10px] uppercase tracking-wider">Order ID</span>
            </div>
            <p className="text-white/70 text-sm font-mono text-center" data-testid="text-order-id">{orderId}</p>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-medium" dir="rtl">الدفع عند الاستلام</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/30 w-full text-left">
            <p className="text-white/50 text-xs mb-2" dir="rtl">تفاصيل الطلب:</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-white/40 text-xs py-0.5">
                <span>{item.name} × {item.quantity}</span>
                <span>{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-white/70 text-sm font-bold mt-2 pt-2 border-t border-zinc-800/30">
              <span dir="rtl">المجموع</span>
              <span>{order.total.toFixed(2)} SAR</span>
            </div>
          </div>

          {!soundEnabled && !bellFading && (
            <button
              onClick={handleActivateBell}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 active:scale-[0.97] transition-all duration-200"
              style={{ boxShadow: "0 0 20px rgba(255,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.03)" }}
              data-testid="button-activate-bell-pending"
            >
              <span className="text-lg">🔔</span>
              <span className="text-red-400/90 text-[13px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>تفعيل تنبيهات الجرس عند جاهزية الطلب</span>
            </button>
          )}
          {bellFading && (
            <div className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl animate-pulse">
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-white/40 text-xs">جارٍ التفعيل...</span>
            </div>
          )}
          {soundEnabled && !bellFading && (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5">
              <span className="text-sm">✅</span>
              <span className="text-emerald-400/80 text-xs font-medium" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>التنبيهات الصوتية مفعلة</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-white/20 text-[10px]" data-testid="text-live-status">Live</span>
          </div>
        </div>
      </div>
    );
  }

  if (order.status === "ready") {
    return (
      <div className={`h-[100dvh] flex flex-col items-center justify-between py-8 px-5 text-center overflow-hidden ${alertActive ? "pager-neon-pulse" : ""}`}
        style={{ background: alertActive ? "linear-gradient(180deg, #0a0000 0%, #1a0000 30%, #0d0000 70%, #000 100%)" : "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
        data-testid="tracking-ready-screen"
      >
        <div className="w-full">
          <h2 className="text-white/90 text-sm font-bold tracking-[0.3em] uppercase mb-1" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>DIGITAL PAGER</h2>
          {merchant && <p className="text-red-500/60 text-xs tracking-widest uppercase">{merchant.storeName}</p>}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center -mt-4">
          <PagerDevice orderNumber={order.orderNumber || "?"} isReady={true} />
          <div className="mt-8">
            <p className="text-white text-2xl font-black tracking-wide" data-testid="text-order-ready">ORDER READY!</p>
            <p className="text-red-400 text-xl font-bold mt-1" dir="rtl">طلبك جاهز!</p>
            <p className="text-white/50 text-sm mt-3">Please proceed to the counter</p>
            <p className="text-white/40 text-sm mt-0.5" dir="rtl">تفضل بالاستلام من الكاونتر</p>
          </div>
        </div>

        {pendingAlert && !alertActive && (
          <button
            onClick={handleActivateBell}
            className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 active:scale-[0.97] transition-all duration-200 animate-pulse"
            style={{ boxShadow: "0 0 20px rgba(255,0,0,0.08)" }}
            data-testid="chip-tap-for-sound"
          >
            <span className="text-base">🔔</span>
            <span className="text-red-400/90 text-sm font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>المس لسماع التنبيه</span>
          </button>
        )}
        {alertActive && (
          <Button size="lg" onClick={handleStopAlert} className="w-full max-w-xs h-14 font-bold text-base bg-transparent border-2 border-red-600 text-white hover:bg-red-600/20 rounded-xl" style={{ boxShadow: "0 0 20px rgba(255,0,0,0.2)" }} data-testid="button-stop-tracking-alert">
            <BellOff className="w-5 h-5 me-2" />
            <span dir="rtl">إيقاف التنبيه</span>
            <span className="mx-1">-</span>
            <span>Stop Alert</span>
          </Button>
        )}
      </div>
    );
  }

  if (order.status === "completed" || order.status === "archived") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }} data-testid="tracking-completed-screen">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="w-24 h-24 rounded-full border-2 border-green-500/30 bg-green-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(34,197,94,0.12)" }}>
            <CheckCircle className="w-12 h-12 text-green-500/80" />
          </div>
          <div>
            <p className="text-green-400 text-2xl font-bold" data-testid="text-completed-message">Thank You!</p>
            <p className="text-green-400/80 text-xl font-bold mt-2" dir="rtl" data-testid="text-completed-message-ar">
              شكراً لزيارتك، نتمنى لك يوماً سعيداً!
            </p>
            <p className="text-white/50 text-sm mt-4">We hope to see you again soon!</p>
            <p className="text-white/40 text-sm mt-0.5" dir="rtl">نراك قريباً!</p>
          </div>
          {merchant?.googleMapsReviewUrl && (
            <Button
              onClick={() => window.open(merchant.googleMapsReviewUrl, "_blank")}
              className="mt-2 h-12 px-6 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl font-bold text-sm gap-2"
              data-testid="button-rate-google-maps"
            >
              <Star className="w-5 h-5" />
              <span dir="rtl">قيّمنا على جوجل ماب</span>
            </Button>
          )}
          {merchant && (
            <p className="text-white/20 text-xs mt-2">{merchant.storeName}</p>
          )}
        </div>
      </div>
    );
  }

  // preparing status - show the pager in waiting mode
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-between py-8 px-5 text-center overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      data-testid="tracking-preparing-screen"
    >
      <div className="w-full flex-shrink-0">
        <h2 className="text-white/90 text-sm font-bold tracking-[0.3em] uppercase mb-1" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>DIGITAL PAGER</h2>
        {merchant && <p className="text-red-500/60 text-xs tracking-widest uppercase">{merchant.storeName}</p>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <PagerDevice orderNumber={order.orderNumber || "?"} isReady={false} />
        <div className="mt-6">
          <p className="text-red-400 text-lg font-bold" dir="rtl" data-testid="text-preparing-message">جاري التحضير...</p>
          <p className="text-white/50 text-sm mt-1.5">We'll buzz you when it's ready!</p>
          {order.orderNumber && (
            <p className="text-white/30 text-xs mt-3">Order #{order.orderNumber}</p>
          )}
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/20">
          <p className="text-white/30 text-xs text-center" dir="rtl">{order.customerName} • {order.items.length} items • {order.total.toFixed(2)} SAR</p>
        </div>

        {!soundEnabled && !bellFading && (
          <button
            onClick={handleActivateBell}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 active:scale-[0.97] transition-all duration-200"
            style={{ boxShadow: "0 0 20px rgba(255,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="button-activate-bell"
          >
            <span className="text-lg">🔔</span>
            <span className="text-red-400/90 text-[13px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>تفعيل تنبيهات الجرس عند جاهزية الطلب</span>
          </button>
        )}

        {bellFading && (
          <div className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl animate-pulse">
            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white/40 text-xs">جارٍ التفعيل...</span>
          </div>
        )}

        {soundEnabled && !bellFading && (
          <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 transition-all duration-500">
            <span className="text-sm">✅</span>
            <span className="text-emerald-400/80 text-xs font-medium" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>التنبيهات الصوتية مفعلة</span>
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-white/20 text-[10px]">Live</span>
        </div>
      </div>
    </div>
  );
}
