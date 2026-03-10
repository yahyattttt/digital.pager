import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store, AlertTriangle, BellOff, Clock, CheckCircle, Loader2 } from "lucide-react";
import type { WhatsAppOrder, Merchant } from "@shared/schema";

function useAlertSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  const unlock = useCallback(() => {
    if (audioUnlockedRef.current) return;
    try {
      const audio = new Audio("/alert.mp3");
      audio.loop = true;
      audio.volume = 0;
      audio.load();
      audio.play().then(() => { audio.pause(); audio.currentTime = 0; audio.volume = 1.0; }).catch(() => {});
      audioRef.current = audio;
      audioUnlockedRef.current = true;
    } catch {}
  }, []);

  const play = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/alert.mp3");
        audioRef.current.loop = true;
        audioRef.current.volume = 1.0;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }, []);

  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } };
  }, []);

  return { unlock, play, stop };
}

function useVibrationLoop() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (!("vibrate" in navigator)) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    navigator.vibrate([500, 200, 500, 200, 800]);
    intervalRef.current = setInterval(() => { navigator.vibrate([500, 200, 500, 200, 800]); }, 2200);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if ("vibrate" in navigator) navigator.vibrate(0);
  }, []);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); if ("vibrate" in navigator) navigator.vibrate(0); };
  }, []);

  return { start, stop };
}

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
  const [merchant, setMerchant] = useState<{ storeName: string; logoUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const hasPlayedAlert = useRef(false);
  const isFirstSnapshot = useRef(true);
  const prevStatusRef = useRef<string | null>(null);

  const { unlock, play, stop: stopSound } = useAlertSound();
  const { start: startVibration, stop: stopVibration } = useVibrationLoop();

  const merchantId = new URLSearchParams(window.location.search).get("m") || "";

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
    unlock();

    const docRef = doc(db, "merchants", merchantId, "whatsappOrders", orderId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
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
        status: data.status || "awaiting_confirmation",
        orderNumber: data.orderNumber || "",
        createdAt: data.createdAt || "",
      };
      setOrder(updatedOrder);

      const prevStatus = prevStatusRef.current;
      const currentStatus = updatedOrder.status;
      const firstLoad = isFirstSnapshot.current;
      isFirstSnapshot.current = false;
      prevStatusRef.current = currentStatus;

      if (
        currentStatus === "ready" &&
        !hasPlayedAlert.current &&
        !firstLoad &&
        prevStatus === "preparing"
      ) {
        hasPlayedAlert.current = true;
        setAlertActive(true);
        play();
        startVibration();
      }
    });

    return () => unsub();
  }, [orderId, merchantId, unlock, play, startVibration]);

  function handleStopAlert() {
    stopSound();
    stopVibration();
    setAlertActive(false);
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

  if (order.status === "awaiting_confirmation") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }} data-testid="tracking-awaiting-screen">
        <div className="w-full flex-shrink-0 mb-4">
          <h2 className="text-white/90 text-sm font-bold tracking-[0.3em] uppercase mb-1" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>DIGITAL PAGER</h2>
          {merchant && <p className="text-red-500/60 text-xs tracking-widest uppercase">{merchant.storeName}</p>}
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full border-2 border-amber-500/30 bg-amber-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 30px rgba(245,158,11,0.08)" }}>
            <Clock className="w-10 h-10 text-amber-500/60 animate-pulse" />
          </div>
          <div>
            <p className="text-amber-400 text-lg font-bold" dir="rtl" data-testid="text-awaiting-message">في انتظار تأكيد المتجر...</p>
            <p className="text-white/50 text-sm mt-1.5" data-testid="text-awaiting-hint">Waiting for Merchant to Confirm...</p>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/30 w-full max-w-xs text-left">
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

        {alertActive && (
          <Button size="lg" onClick={handleStopAlert} className="w-full max-w-xs h-14 font-bold text-base bg-transparent border-2 border-red-600 text-white hover:bg-red-600/20 rounded-xl" style={{ boxShadow: "0 0 20px rgba(255,0,0,0.2)" }} data-testid="button-stop-tracking-alert">
            <BellOff className="w-5 h-5 me-2" />
            <span dir="rtl">تم الاستلام</span>
            <span className="mx-1">-</span>
            <span>Received</span>
          </Button>
        )}
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

      <div className="w-full max-w-xs">
        <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/20">
          <p className="text-white/30 text-xs text-center" dir="rtl">{order.customerName} • {order.items.length} items • {order.total.toFixed(2)} SAR</p>
        </div>
      </div>
    </div>
  );
}
