import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Loader2, Banknote, Phone, MessageCircle, XCircle, Truck, MapPin, Package, Clock, Bookmark } from "lucide-react";
import { StarRatingPopup } from "@/components/star-rating-popup";
import { SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import type { WhatsAppOrder } from "@shared/schema";

function DeliveryTrackingView({
  order,
  merchant,
  merchantId,
}: {
  order: WhatsAppOrder;
  merchant: { storeName: string; logoUrl: string; googleMapsReviewUrl?: string; driverPhone?: string; support_whatsapp?: string } | null;
  merchantId: string;
}) {
  const driverPhone = merchant?.driverPhone || "";
  const isCompleted = order.status === "completed" || order.status === "archived";
  const isReady = order.status === "ready";
  const isRejected = order.status === "rejected";
  const isPreparing = order.status === "preparing";
  const [shareCopied, setShareCopied] = useState(false);
  const prevStatusRef = useRef(order.status);

  useEffect(() => {
    prevStatusRef.current = order.status;
  }, [order.status]);

  function handleWhatsAppDriver() {
    const phone = driverPhone.replace(/[^\d+]/g, "");
    const name = order.customerName || "";
    const orderNum = order.orderNumber || "";
    const msg = encodeURIComponent(`مرحباً، أنا العميل ${name}، أود تتبع طلبي رقم ${orderNum}.`);
    const url = phone
      ? `https://wa.me/${phone.startsWith("+") ? phone.slice(1) : phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  }

  async function handleShareTracking() {
    const storeName = merchant?.storeName || "المتجر";
    const baseUrl = window.location.href.split("?")[0];
    const params = new URLSearchParams(window.location.search);
    params.set("source", "share_moment");
    const shareUrl = `${baseUrl}?${params.toString()}`;
    const text = `أهلاً، هذا رابط تتبع طلبي من ${storeName}: ${shareUrl}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
    if (merchantId) {
      fetch(`/api/track/sharebuttonclick/${merchantId}`, { method: "POST" }).catch(() => {});
      const uniqueKey = `shared_this_store_${merchantId}`;
      if (!localStorage.getItem(uniqueKey)) {
        localStorage.setItem(uniqueKey, "true");
        fetch(`/api/track/uniqueshare/${merchantId}`, { method: "POST" }).catch(() => {});
      }
    }
  }

  function handleCloseAndReturn() {
    if (order.id) {
      sessionStorage.removeItem(`order_${order.id}`);
      localStorage.removeItem(`order_${order.id}`);
    }
    sessionStorage.removeItem("pager_bell_primed");
    window.location.href = `/menu/${merchantId}`;
  }

  function getStatusConfig() {
    switch (order.status) {
      case "pending_verification":
      case "awaiting_confirmation":
        return { label: "بانتظار تأكيد المتجر", labelEn: "Awaiting store confirmation", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20", icon: <Clock className="w-6 h-6 text-amber-400" />, pulse: true };
      case "preparing":
        return { label: "جاري التحضير", labelEn: "Preparing your order", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20", icon: <Package className="w-6 h-6 text-amber-400" />, pulse: true };
      case "ready":
        return { label: "جاهز للتوصيل", labelEn: "Ready for delivery", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", icon: <Truck className="w-6 h-6 text-emerald-400" />, pulse: false };
      case "completed":
      case "archived":
        return { label: "تم التوصيل", labelEn: "Delivered", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", icon: <CheckCircle className="w-6 h-6 text-emerald-400" />, pulse: false };
      case "rejected":
        return { label: "تم رفض الطلب", labelEn: "Order rejected", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/20", icon: <XCircle className="w-6 h-6 text-red-400" />, pulse: false };
      default:
        return { label: "جاري المعالجة", labelEn: "Processing", color: "text-white/60", bgColor: "bg-white/5", borderColor: "border-white/10", icon: <Loader2 className="w-6 h-6 text-white/60 animate-spin" />, pulse: true };
    }
  }

  const sc = getStatusConfig();

  return (
    <div
      className="h-[100dvh] flex flex-col items-center justify-between py-8 px-5 text-center overflow-y-auto"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      data-testid="tracking-delivery-screen"
    >
      <div className="flex flex-col items-center gap-5 w-full max-w-sm animate-in fade-in duration-700 flex-1">
        {merchant && (
          <div className="flex items-center justify-center gap-2">
            {merchant.logoUrl && (
              <img src={merchant.logoUrl} alt={merchant.storeName} className="w-8 h-8 rounded-full object-cover border border-white/10" />
            )}
            <p className="text-white/30 text-xs font-medium tracking-wide">{merchant.storeName}</p>
          </div>
        )}

        <div className="w-20 h-20 rounded-full border-2 border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(16,185,129,0.15)" }}>
          <Truck className="w-10 h-10 text-emerald-400/80" />
        </div>

        <div>
          <p className="text-emerald-400 text-xl font-bold" dir="rtl" data-testid="text-delivery-header">شكراً لطلبك</p>
          <p className="text-emerald-400/70 text-sm font-medium mt-2 leading-relaxed max-w-xs" dir="rtl" data-testid="text-delivery-subheader">
            طلبك الآن في عهدة المندوب
          </p>
        </div>

        <div className={`w-full p-4 rounded-2xl ${sc.bgColor} border ${sc.borderColor} transition-all duration-500`} data-testid="delivery-status-card">
          <div className="flex items-center justify-center gap-3 mb-2">
            {sc.icon}
            {sc.pulse && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
          <p className={`text-2xl font-bold ${sc.color}`} dir="rtl" data-testid="text-delivery-live-status">{sc.label}</p>
          <p className="text-white/40 text-xs mt-1" data-testid="text-delivery-live-status-en">{sc.labelEn}</p>
        </div>

        {order.displayOrderId && (
          <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-white/40 text-[10px] mb-0.5" dir="rtl">رقم الطلب</p>
            <p className="text-white text-lg font-bold font-mono tracking-wider" data-testid="text-delivery-order-number">{order.displayOrderId}</p>
          </div>
        )}

        {!isRejected && driverPhone && (
          <Button
            onClick={handleWhatsAppDriver}
            className="w-full h-14 font-bold text-base rounded-xl gap-3"
            style={{ background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)" }}
            data-testid="button-whatsapp-driver"
          >
            <SiWhatsapp className="w-5 h-5" />
            <span dir="rtl">مندوب التوصيل</span>
          </Button>
        )}

        {!isRejected && (
          <button
            onClick={() => { window.location.href = `/receipt/${order.id}?m=${merchantId}`; }}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-emerald-900/15 to-emerald-950/30 active:scale-[0.97] transition-all duration-200"
            style={{ padding: "14px 20px", boxShadow: "0 0 15px rgba(16,185,129,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="button-view-receipt-delivery"
          >
            <span className="text-lg flex-shrink-0">📄</span>
            <span className="text-emerald-400/90 text-[14px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>عرض إيصال الطلب</span>
          </button>
        )}

        {isPreparing && !isDelivery && (
          <button
            id="viral-share-btn-global"
            onClick={handleShareTracking}
            data-testid="button-share-tracking-delivery"
            className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 rounded-xl px-5 py-2.5 transition-all active:scale-[0.97]"
            style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.22)" }}
          >
            <span
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.12) 0%, transparent 65%)", animation: "sharePulse 2.2s ease-in-out infinite" }}
            />
            <span className="relative flex items-center gap-2.5">
              {shareCopied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-sm text-emerald-400" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>تم نسخ الرابط ✓</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 shrink-0" style={{ color: "rgba(249,115,22,0.85)" }} />
                  <span className="flex flex-col items-center">
                    <span className="font-bold text-sm" style={{ color: "rgba(249,115,22,0.85)", fontFamily: "'Tajawal','Cairo',sans-serif" }}>
                      حفظ رابط التتبع
                    </span>
                    <span style={{ fontSize: "10px", color: "rgba(249,115,22,0.65)", fontFamily: "'Tajawal','Cairo',sans-serif" }}>
                      تحسبا لفقدان صفحة الويب
                    </span>
                  </span>
                </>
              )}
            </span>
          </button>
        )}

        {!isRejected && !isCompleted && (
          <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/20 w-full">
            <p className="text-white/30 text-xs text-center" dir="rtl">{order.customerName} • {order.items.length} {order.items.length === 1 ? "منتج" : "منتجات"} • {order.total.toFixed(2)} SAR</p>
          </div>
        )}

        {!isRejected && (
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isCompleted ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            <span className="text-white/20 text-[10px]">{isCompleted ? "Completed" : "Live"}</span>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm mt-6 flex-shrink-0">
        <button
          onClick={handleCloseAndReturn}
          className="w-full py-3 text-white/30 text-sm font-medium hover:text-white/50 transition-colors underline underline-offset-4"
          data-testid="button-close-return"
          dir="rtl"
        >
          إغلاق والعودة للرئيسية
        </button>
      </div>

      {(() => {
        const waNum = merchant?.support_whatsapp?.replace(/\D/g, "") || "";
        const waId = order.displayOrderId || order.orderNumber || order.id;
        const waHref = waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(`أهلاً ${merchant?.storeName || ""}، لدي استفسار بخصوص طلبي رقم (# ${waId})`)}` : "";
        if (!waHref || (order as any).orderType === "manual") return null;
        return (
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="wa-pulse"
            style={{ position: "fixed", bottom: "24px", right: "20px", zIndex: 9999, width: 56, height: 56, borderRadius: "50%", background: "#25d366", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
            data-testid="button-whatsapp-support" aria-label="تواصل عبر واتساب"
          >
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12.001 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.987-1.306A9.953 9.953 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18c-1.738 0-3.368-.474-4.769-1.299l-.342-.203-3.037.794.812-2.962-.222-.358A7.964 7.964 0 014 12c0-4.418 3.582-8 8.001-8 4.418 0 7.999 3.582 7.999 8s-3.581 8-7.999 8z"/>
            </svg>
          </a>
        );
      })()}
    </div>
  );
}

const LED_COUNT = 10;

function BuzzerCircle({ orderNumber, active }: { orderNumber: string; active: boolean }) {
  const leds = Array.from({ length: LED_COUNT }, (_, i) => {
    const angle = (i / LED_COUNT) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const r = 44;
    const cx = 50 + r * Math.cos(rad);
    const cy = 50 + r * Math.sin(rad);
    const delay = active ? `${(i * 0.03).toFixed(3)}s` : `${(i * 0.35).toFixed(2)}s`;
    return { cx, cy, delay, i };
  });

  return (
    <div className="relative w-[260px] h-[260px] mx-auto" data-testid="buzzer-circle">
      <div
        className={`absolute inset-0 rounded-full ${active ? "buzzer-ring-active" : ""}`}
        style={{
          background: "radial-gradient(circle at 38% 32%, #222 0%, #151515 30%, #0a0a0a 55%, #050505 80%, #000 100%)",
          boxShadow: active
            ? undefined
            : "0 0 40px 8px rgba(0,0,0,0.6), inset 0 0 25px rgba(0,0,0,0.4)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{ inset: "3px", background: "linear-gradient(135deg, rgba(80,80,80,0.12) 0%, transparent 35%, transparent 65%, rgba(30,30,30,0.08) 100%)", border: "1px solid rgba(255,255,255,0.06)" }}
      />
      <div
        className="absolute rounded-full"
        style={{ inset: "8px", border: "1px solid rgba(255,255,255,0.03)", background: "radial-gradient(circle at 42% 38%, rgba(40,40,40,0.1) 0%, transparent 50%)" }}
      />
      <div
        className="absolute rounded-full"
        style={{ inset: "22px", border: active ? "1px solid rgba(255,25,0,0.1)" : "1px solid rgba(255,255,255,0.025)" }}
      />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="ot-led-glow-grad">
            <stop offset="0%" stopColor="#ff2200" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#ff1100" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className={active ? "led-ring-spinning" : ""} style={{ transformOrigin: "50px 50px" }}>
          {leds.map((led) => (
            <g key={led.i}>
              <circle cx={led.cx} cy={led.cy} r={6} fill="url(#ot-led-glow-grad)" className={active ? "led-glow-active" : "led-glow-idle"} style={{ animationDelay: led.delay }} />
              <circle cx={led.cx} cy={led.cy} r={2.6} fill="#ff2000" className={active ? "led-dot-active" : "led-dot-idle"} style={{ animationDelay: led.delay }} />
              <circle cx={led.cx} cy={led.cy} r={1.2} fill="#ff6644" opacity={active ? 0.9 : 0.25} className={active ? "led-dot-active" : "led-dot-idle"} style={{ animationDelay: led.delay }} />
            </g>
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <span
          className={`font-dseg7 tracking-wider ${active ? "buzzer-number-blink" : ""}`}
          style={{
            fontSize: "clamp(48px, 13vw, 72px)",
            color: active ? "#ff3000" : "#aa1800",
            textShadow: active
              ? "0 0 25px rgba(255,40,0,0.9), 0 0 50px rgba(255,20,0,0.5), 0 0 80px rgba(255,10,0,0.25)"
              : "0 0 12px rgba(170,24,0,0.35), 0 0 4px rgba(170,24,0,0.2)",
            lineHeight: 1,
          }}
          data-testid="text-buzzer-number text-tracking-order-number"
        >
          {orderNumber}
        </span>
      </div>
    </div>
  );
}

function getShort3Digit(order: WhatsAppOrder): string {
  const raw = order.orderNumber || order.displayOrderId || "";
  const nums = raw.replace(/\D/g, "");
  if (nums.length <= 3) return nums || "?";
  return nums.slice(-3);
}

export default function OrderTrackingPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [order, setOrder] = useState<WhatsAppOrder | null>(null);
  const [merchant, setMerchant] = useState<{ storeName: string; logoUrl: string; googleMapsReviewUrl?: string; driverPhone?: string; support_whatsapp?: string; isOrderPinRequired?: boolean } | null>(null);
  const [merchantLoaded, setMerchantLoaded] = useState(false);
  const [loading, setLoading] = useState(!!orderId);
  const [notFound, setNotFound] = useState(false);
  const [bellPrimed, setBellPrimed] = useState(false);
  const [bellPlaying, setBellPlaying] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bellPrimedRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  const ratingPopupShownRef = useRef(false);

  const { toast } = useToast();

  const merchantId = new URLSearchParams(window.location.search).get("m") || "";
  const trackingType = new URLSearchParams(window.location.search).get("type") || "";

  useEffect(() => {
    setOrder(null);
    setMerchant(null);
    setMerchantLoaded(false);
    setNotFound(false);
    setLoading(!!orderId);
    initialFetchDoneRef.current = false;
    setBellPrimed(false);
    setBellPlaying(false);
    bellPrimedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [orderId]);

  function ensureAudio() {
    if (!audioRef.current) {
      audioRef.current = new Audio("/alert.mp3");
      audioRef.current.volume = 1.0;
      audioRef.current.preload = "auto";
    }
    return audioRef.current;
  }

  function handlePrimeBell() {
    if (bellPrimedRef.current) return;
    const audio = ensureAudio();
    audio.loop = false;
    audio.currentTime = 0;
    audio.volume = 1.0;
    try {
      if (!audioContextRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AC();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch {}
    audio.play().then(() => {
      setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 500);
      bellPrimedRef.current = true;
      setBellPrimed(true);
      toast({ title: "تم تفعيل التنبيه ✅", description: "سيتم تنبيهك عند جاهزية طلبك" });
    }).catch(() => {
      toast({ title: "خطأ", description: "تعذر تشغيل الصوت", variant: "destructive" });
    });
  }

  function playFullAlert() {
    const audio = ensureAudio();
    audio.loop = true;
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play().then(() => {
      setBellPlaying(true);
      if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 800]);
      }
    }).catch(() => {});
  }

  function stopAlert() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ("vibrate" in navigator) navigator.vibrate(0);
    setBellPlaying(false);
  }

  useEffect(() => {
    if (!orderId || !merchantId) {
      if (orderId) { setNotFound(true); setLoading(false); }
      return;
    }

    initialFetchDoneRef.current = false;

    async function fetchInitial() {
      try {
        // Cache-buster: force fresh fetch every time — never use a cached response
        // (PIN state can change server-side; stale cache causes old PIN=true to persist)
        const cacheBust = `&_v=${Date.now()}`;
        const res = await fetch(
          `/api/track/${orderId}?merchantId=${merchantId}${trackingType ? `&type=${trackingType}` : ""}${cacheBust}`,
          { cache: "no-store" }
        );
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json();
        setOrder(data.order);

        const merchantData = data.merchant || null;

        // SYNC_CHECK: log the raw value straight from the server — confirm what DB actually sent
        console.log('SYNC_CHECK: Merchant PIN setting is:', data?.isOrderPinRequired);
        console.log(`[Tracking] Merchant ${merchantId} — isOrderPinRequired raw=${merchantData?.isOrderPinRequired}`);

        // Only an EXPLICIT true enables the PIN screen. Missing field = false = open access.
        const pinEnabled = merchantData?.isOrderPinRequired === true;
        console.log(`[Tracking] pinEnabled=${pinEnabled} (only true when field is explicitly true)`);

        setMerchant(merchantData);
        setMerchantLoaded(true);

        if (!pinEnabled) {
          console.log(`%c[Tracking] ✅ PIN DISABLED — customer goes straight to order screen`, "color:#22c55e;font-weight:bold;font-size:14px");
        } else {
          console.log(`%c[Tracking] 🔒 PIN ENABLED — customer must verify`, "color:#ef4444;font-weight:bold;font-size:14px");
        }
      } catch {
        setNotFound(true);
      } finally {
        initialFetchDoneRef.current = true;
        setLoading(false);
      }
    }
    fetchInitial();
  }, [orderId, merchantId, trackingType]);

  useEffect(() => {
    if (!orderId || !merchantId) return;

    let prevStatus: string | null = null;
    let isFirstSnapshot = true;

    const collectionName = trackingType === "pager" ? "pagers" : "whatsappOrders";
    const docRef = doc(db, "merchants", merchantId, collectionName, orderId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        if (initialFetchDoneRef.current) {
          setOrder(null);
          setNotFound(true);
        }
        return;
      }
      const data = snap.data();
      let updatedOrder: WhatsAppOrder;
      if (trackingType === "pager") {
        const pagerStatus = data.status || "waiting";
        const statusMap: Record<string, string> = { waiting: "preparing", notified: "ready", completed: "completed" };
        updatedOrder = {
          id: snap.id,
          merchantId: data.storeId || "",
          customerName: "",
          customerPhone: "",
          items: [],
          total: 0,
          status: (statusMap[pagerStatus] || pagerStatus) as any,
          paymentMethod: "cod",
          orderNumber: data.orderNumber || "",
          displayOrderId: data.displayOrderId || "",
          orderType: data.orderType || "manual",
          createdAt: data.createdAt || "",
        };
      } else {
        updatedOrder = {
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
          displayOrderId: data.displayOrderId || "",
          orderType: data.orderType || undefined,
          diningType: data.diningType || undefined,
          createdAt: data.createdAt || "",
        };
      }

      if (!initialFetchDoneRef.current) {
        prevStatus = updatedOrder.status;
        isFirstSnapshot = false;
        return;
      }

      setOrder(updatedOrder);

      const currentStatus = updatedOrder.status;
      if (!isFirstSnapshot && currentStatus === "ready" && prevStatus !== "ready") {
        if (bellPrimedRef.current) {
          playFullAlert();
        }
      }

      if (currentStatus === "completed" || currentStatus === "archived") {
        stopAlert();
        if (!ratingPopupShownRef.current && !ratingDone) {
          ratingPopupShownRef.current = true;
          setTimeout(() => setShowRatingPopup(true), 1500);
        }
      }

      if (isFirstSnapshot) {
        isFirstSnapshot = false;
      }

      prevStatus = currentStatus;
    }, (error) => {
      void error;
    });

    return () => unsub();
  }, [orderId, merchantId, trackingType]);

  const isOnlineOrder = order?.orderType === "online" || (!order?.orderType && !!(order?.displayOrderId && !order.displayOrderId.startsWith("MA-")));

  const _waNum = merchant?.support_whatsapp?.replace(/\D/g, "") || "";
  const _waId = order?.displayOrderId || order?.orderNumber || orderId;
  const waHref = _waNum ? `https://wa.me/${_waNum}?text=${encodeURIComponent(`أهلاً ${merchant?.storeName || ""}، لدي استفسار بخصوص طلبي رقم (# ${_waId})`)}` : "";

  const WaFloatBtn = waHref ? (
    <a href={waHref} target="_blank" rel="noopener noreferrer" className="wa-pulse"
      style={{ position: "fixed", bottom: "24px", right: "20px", zIndex: 9999, width: 56, height: 56, borderRadius: "50%", background: "#25d366", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
      data-testid="button-whatsapp-support" aria-label="تواصل عبر واتساب"
    >
      <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12.001 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.987-1.306A9.953 9.953 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18c-1.738 0-3.368-.474-4.769-1.299l-.342-.203-3.037.794.812-2.962-.222-.358A7.964 7.964 0 014 12c0-4.418 3.582-8 8.001-8 4.418 0 7.999 3.582 7.999 8s-3.581 8-7.999 8z"/>
      </svg>
    </a>
  ) : null;

  async function handleShareTracking() {
    const storeName = merchant?.storeName || "المتجر";
    const baseUrl = window.location.href.split("?")[0];
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("source", "share_moment");
    const shareUrl = `${baseUrl}?${urlParams.toString()}`;
    const text = `أهلاً، هذا رابط تتبع طلبي من ${storeName}: ${shareUrl}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
    if (merchantId) {
      fetch(`/api/track/sharebuttonclick/${merchantId}`, { method: "POST" }).catch(() => {});
      const uniqueKey = `shared_this_store_${merchantId}`;
      if (!localStorage.getItem(uniqueKey)) {
        localStorage.setItem(uniqueKey, "true");
        fetch(`/api/track/uniqueshare/${merchantId}`, { method: "POST" }).catch(() => {});
      }
    }
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

  if (order.diningType === "delivery") {
    return (
      <DeliveryTrackingView
        order={order}
        merchant={merchant}
        merchantId={merchantId}
      />
    );
  }

  if (order.status === "pending_verification" || order.status === "awaiting_confirmation") {
    // STEP 1: Wait for merchant config to load — spinner until ready
    if (!merchantLoaded) {
      return (
        <div className="h-[100dvh] flex flex-col items-center justify-center gap-3" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}>
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
          <p className="text-white/25 text-sm" dir="rtl">جاري التحميل...</p>
        </div>
      );
    }

    // STRICT CHECK: only an explicit boolean true enables PIN.
    // Missing field, undefined, null, false → all default to NO PIN (open access).
    const pinRequired = merchant?.isOrderPinRequired === true;

    // STEP 2 — VISUAL KILL:
    // If PIN is NOT required → jump straight to the preparing screen.
    // The confirm-button / identity-check block is NEVER added to the DOM.
    if (!pinRequired) {
      console.log(`%c[Tracking] ✅ RENDER: PIN OFF — showing order screen directly (isOrderPinRequired=${merchant?.isOrderPinRequired})`, "color:#22c55e;font-weight:bold;font-size:13px");
      const shortNum = getShort3Digit(order);
      return (
        <div
          className="h-[100dvh] flex flex-col items-center justify-between py-10 px-5 text-center"
          style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
          data-testid="tracking-preparing-screen"
        >
          <div className="w-full flex flex-col items-center gap-1">
            <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase">DIGITAL PAGER</p>
            {merchant && (
              <div className="flex items-center justify-center gap-2">
                {merchant.logoUrl && (
                  <img src={merchant.logoUrl} alt={merchant.storeName} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                )}
                <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-5">
            <BuzzerCircle orderNumber={shortNum} active={false} />
            <div>
              <p className="text-red-400 text-2xl font-black" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-preparing-message">
                جاري التحضير 👨‍🍳
              </p>
              <p className="text-white/40 text-sm mt-1 text-center">Your order is being prepared</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-white/20 text-[10px]" data-testid="text-live-status">Live</span>
            </div>
          </div>
          <div className="w-full max-w-xs space-y-3">
            {isOnlineOrder && (
              <button
                onClick={() => { window.location.href = `/receipt/${orderId}?m=${merchantId}`; }}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
                style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
                data-testid="button-view-receipt-pinoff"
              >
                <span className="text-lg flex-shrink-0">📄</span>
                <span className="text-red-400/90 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>عرض إيصال الطلب</span>
              </button>
            )}
          </div>
          {WaFloatBtn}
        </div>
      );
    }

    // STEP 3: PIN IS required — show awaiting-call screen
    // The <BuzzerCircle> and preparing screen are NOT in the DOM here.
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }} data-testid="tracking-awaiting-screen">
        <div className="w-full flex-shrink-0 mb-6 flex flex-col items-center gap-1">
          <p className="text-white/40 text-[14px] font-medium tracking-[0.3em] uppercase">DIGITAL PAGER</p>
          {merchant && (
            <div className="flex items-center justify-center gap-2.5">
              {merchant.logoUrl && (
                <img src={merchant.logoUrl} alt={merchant.storeName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
              )}
              <h2 className="text-white text-[26px] font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>
            </div>
          )}
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
          {isOnlineOrder && (
            <button
              onClick={() => { window.location.href = `/receipt/${orderId}?m=${merchantId}`; }}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-emerald-900/15 to-emerald-950/30 active:scale-[0.97] transition-all duration-200"
              style={{ padding: "16px 20px", boxShadow: "0 0 15px rgba(16,185,129,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
              data-testid="button-view-receipt"
            >
              <span className="text-2xl flex-shrink-0">📄</span>
              <span className="text-emerald-400/90 text-[17px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>عرض إيصال الطلب</span>
            </button>
          )}
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-white/20 text-[10px]" data-testid="text-live-status">Live</span>
          </div>
        </div>
        {WaFloatBtn}
      </div>
    );
  }

  if (order.status === "ready") {
    const shortNum = getShort3Digit(order);
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-between py-10 px-5 text-center"
        style={{ background: "linear-gradient(180deg, #0a0000 0%, #1a0000 30%, #0d0000 70%, #000 100%)" }}
        data-testid="tracking-ready-screen"
      >
        <div className="w-full flex flex-col items-center gap-1">
          <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase">DIGITAL PAGER</p>
          {merchant && (
            <div className="flex items-center justify-center gap-2">
              {merchant.logoUrl && (
                <img src={merchant.logoUrl} alt={merchant.storeName} className="w-8 h-8 rounded-full object-cover border border-white/10" />
              )}
              <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-5">
          <BuzzerCircle orderNumber={shortNum} active={true} />
          <div>
            <p className="text-red-400 text-2xl font-black" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-order-ready">
              طلبك جاهز، استلمه الآن! ✅
            </p>
            <p className="text-white/50 text-sm mt-2">Your order is ready! Please pick it up.</p>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-3">
          {bellPlaying && (
            <button
              onClick={stopAlert}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-red-500/30 bg-red-500/10 active:scale-[0.95] transition-all duration-200"
              style={{ boxShadow: "0 0 25px rgba(255,0,0,0.15)" }}
              data-testid="button-stop-alert"
            >
              <span className="text-xl">🔇</span>
              <span className="text-white text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>إيقاف التنبيه</span>
            </button>
          )}

          {!bellPlaying && !bellPrimed && (
            <button
              onClick={() => { handlePrimeBell(); setTimeout(playFullAlert, 600); }}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 active:scale-[0.95] transition-all duration-200 animate-pulse"
              style={{ boxShadow: "0 0 25px rgba(16,185,129,0.1)" }}
              data-testid="button-play-alert"
            >
              <span className="text-2xl">🔔</span>
              <span className="text-emerald-400 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>تشغيل صوت التنبيه</span>
            </button>
          )}

          {isOnlineOrder && (
            <button
              onClick={() => { window.location.href = `/receipt/${orderId}?m=${merchantId}`; }}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
              style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
              data-testid="button-view-receipt-ready"
            >
              <span className="text-lg flex-shrink-0">📄</span>
              <span className="text-red-400/90 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>عرض إيصال الطلب</span>
            </button>
          )}
        </div>
        {WaFloatBtn}
      </div>
    );
  }

  if (order.status === "rejected") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #1a0000 100%)" }} data-testid="tracking-rejected-screen">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="w-24 h-24 rounded-full border-2 border-red-500/30 bg-red-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(239,68,68,0.12)" }}>
            <XCircle className="w-12 h-12 text-red-500/80" />
          </div>
          <div>
            <p className="text-red-400 text-xl font-bold" data-testid="text-rejected-message">Order Rejected</p>
            <p className="text-red-400/80 text-xl font-bold mt-2" dir="rtl">تم رفض الطلب</p>
            <p className="text-white/50 text-sm mt-4">Sorry, the store has rejected your order.</p>
            <p className="text-white/40 text-sm mt-0.5" dir="rtl">عذراً، قام المتجر برفض طلبك</p>
          </div>
        </div>
      </div>
    );
  }

  if (order.status === "uncollected") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #1a0000 100%)" }} data-testid="tracking-uncollected-screen">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="w-24 h-24 rounded-full border-2 border-red-500/30 bg-red-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(239,68,68,0.12)" }}>
            <AlertTriangle className="w-12 h-12 text-red-500/80" />
          </div>
          <div>
            <p className="text-red-400 text-xl font-bold" data-testid="text-uncollected-message">Order Not Collected</p>
            <p className="text-red-400/80 text-xl font-bold mt-2" dir="rtl">لم يتم استلام الطلب</p>
            <p className="text-white/50 text-sm mt-4">This order was marked as not collected.</p>
            <p className="text-white/40 text-sm mt-0.5" dir="rtl">تم تسجيل عدم استلام هذا الطلب</p>
          </div>
        </div>
      </div>
    );
  }

  if (order.status === "completed" || order.status === "archived") {
    return (
      <div
        className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center gap-6"
        style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
        data-testid="tracking-completed-screen"
      >
        <div className="w-20 h-20 rounded-full border-2 border-green-500/30 bg-green-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(34,197,94,0.12)" }}>
          <CheckCircle className="w-10 h-10 text-green-500/80" />
        </div>
        <div>
          <p className="text-green-400 text-2xl font-bold" data-testid="text-completed-message">Thank You!</p>
          <p className="text-green-400/80 text-lg font-bold mt-1" dir="rtl" data-testid="text-completed-message-ar">
            شكراً لطلبك، نتطلع إلى خدمتك مجدداً
          </p>
        </div>
        {merchant?.storeName && (
          <p className="text-white/20 text-xs">{merchant.storeName}</p>
        )}
        <button
          onClick={() => { window.location.href = `/menu/${merchantId}`; }}
          className="text-white/30 text-sm font-medium hover:text-white/50 transition-colors underline underline-offset-4"
          data-testid="button-close-return"
          dir="rtl"
        >
          العودة للقائمة
        </button>
      </div>
    );
  }

  const shortNum = getShort3Digit(order);
  return (
    <>
    <div className="h-[100dvh] flex flex-col items-center justify-between py-10 px-5 text-center"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      data-testid="tracking-preparing-screen"
    >
      <div className="w-full flex flex-col items-center gap-1">
        <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase">DIGITAL PAGER</p>
        {merchant && (
          <div className="flex items-center justify-center gap-2">
            {merchant.logoUrl && (
              <img src={merchant.logoUrl} alt={merchant.storeName} className="w-8 h-8 rounded-full object-cover border border-white/10" />
            )}
            <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-5">
        <BuzzerCircle orderNumber={shortNum} active={false} />
        <div>
          <p className="text-red-400 text-2xl font-black" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-preparing-message">
            جاري التحضير 👨‍🍳
          </p>
          <p className="text-white/40 text-sm mt-1 text-center">Your order is being prepared</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-white/20 text-[10px]" data-testid="text-live-status">Live</span>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        {isOnlineOrder && (
          <button
            onClick={() => { window.location.href = `/receipt/${orderId}?m=${merchantId}`; }}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
            style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="button-view-receipt-preparing"
          >
            <span className="text-lg flex-shrink-0">📄</span>
            <span className="text-red-400/90 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>عرض إيصال الطلب</span>
          </button>
        )}

        {!isDelivery && (
          <button
            id="viral-share-btn-global"
            onClick={handleShareTracking}
            data-testid="button-share-tracking"
            className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 rounded-2xl px-5 py-2.5 transition-all active:scale-[0.97]"
            style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.22)" }}
          >
            <span
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.12) 0%, transparent 65%)", animation: "sharePulse 2.2s ease-in-out infinite" }}
            />
            <span className="relative flex items-center gap-2.5">
              {shareCopied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-sm text-emerald-400" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>تم نسخ الرابط ✓</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 shrink-0" style={{ color: "rgba(249,115,22,0.85)" }} />
                  <span className="flex flex-col items-center">
                    <span className="font-bold text-base" style={{ color: "rgba(249,115,22,0.85)", fontFamily: "'Tajawal','Cairo',sans-serif" }}>
                      حفظ رابط التتبع
                    </span>
                    <span style={{ fontSize: "10px", color: "rgba(249,115,22,0.65)", fontFamily: "'Tajawal','Cairo',sans-serif" }}>
                      تحسبا لفقدان صفحة الويب
                    </span>
                  </span>
                </>
              )}
            </span>
          </button>
        )}

        {!bellPrimed ? (
          <button
            onClick={handlePrimeBell}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-amber-900/15 to-amber-950/30 active:scale-[0.97] transition-all duration-200 animate-pulse"
            style={{ boxShadow: "0 0 20px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="button-prime-bell"
          >
            <span className="text-2xl">🔔</span>
            <span className="text-amber-400 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              ودك ننبهك بصوت الجرس؟ 🔔
            </span>
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 animate-in fade-in duration-500">
            <span className="text-base">✅</span>
            <span className="text-emerald-400/80 text-sm font-medium" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              تم تفعيل التنبيه — سنرسل لك صوت عند الجاهزية
            </span>
          </div>
        )}
      </div>
      {WaFloatBtn}
    </div>

    {showRatingPopup && !ratingDone && merchantId && (
      <StarRatingPopup
        merchantId={merchantId}
        orderId={orderId}
        orderType={order?.orderType || trackingType}
        googleMapsUrl={merchant?.googleMapsReviewUrl}
        onClose={() => { setShowRatingPopup(false); setRatingDone(true); }}
      />
    )}
    </>
  );
}
