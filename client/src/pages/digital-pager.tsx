import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell, Share2, Wallet, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OrderStatus = "waiting_acceptance" | "processing" | "preparing" | "ready" | "done" | "cancelled";

function getStatusFromWhatsapp(status: string): OrderStatus {
  // "pending_verification" / "awaiting_confirmation" = order created, NOT yet accepted by merchant
  if (status === "pending_verification" || status === "awaiting_confirmation") return "waiting_acceptance";
  if (status === "preparing") return "preparing";
  if (status === "ready" || status === "notified") return "ready";
  if (status === "completed" || status === "archived") return "done";
  if (status === "cancelled") return "cancelled";
  return "processing";
}

function getStatusFromPager(status: string): OrderStatus {
  if (status === "waiting") return "processing";
  if (status === "notified") return "ready";
  if (status === "completed" || status === "archived") return "done";
  if (status === "cancelled") return "cancelled";
  return "processing";
}

const DOT_COUNT = 12;
const DOT_ANGLES = Array.from({ length: DOT_COUNT }, (_, i) => (i * 360) / DOT_COUNT);
const CX = 160;
const CY = 160;
const LED_RADIUS = 118;
const BODY_RADIUS = 155;
const INNER_RADIUS = 90;

function HapticPagerSVG({ status }: { status: OrderStatus }) {
  const isReady = status === "ready" || status === "done";
  const isActive = status !== "processing";

  return (
    <svg
      width="320"
      height="320"
      viewBox="0 0 320 320"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="bodyGrad" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#2a0800" />
          <stop offset="45%" stopColor="#150200" />
          <stop offset="100%" stopColor="#060000" />
        </radialGradient>
        <radialGradient id="innerGrad" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1a0000" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <radialGradient id="domeHighlight" cx="35%" cy="28%" r="40%">
          <stop offset="0%" stopColor="rgba(255,80,40,0.10)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <filter id="ledGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="outerGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer ambient red glow for ready state */}
      {isReady && (
        <circle
          cx={CX}
          cy={CY}
          r={BODY_RADIUS + 12}
          fill="rgba(200,0,0,0.2)"
          filter="url(#outerGlow)"
          className="pager-ambient-glow"
        />
      )}

      {/* Pager body */}
      <circle cx={CX} cy={CY} r={BODY_RADIUS} fill="url(#bodyGrad)" />
      <circle
        cx={CX}
        cy={CY}
        r={BODY_RADIUS}
        fill="none"
        stroke={isReady ? "#cc1100" : "#3a0800"}
        strokeWidth={isReady ? 2.5 : 1.5}
      />
      <circle cx={CX} cy={CY} r={BODY_RADIUS} fill="url(#domeHighlight)" />

      {/* LED track groove */}
      <circle cx={CX} cy={CY} r={LED_RADIUS} fill="none" stroke="#110000" strokeWidth="16" />
      <circle cx={CX} cy={CY} r={LED_RADIUS - 9} fill="none" stroke="#0c0000" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={LED_RADIUS + 9} fill="none" stroke="#0c0000" strokeWidth="1" />

      {/* LED dots — synchronous flash group (no rotation) */}
      <g
        className={isReady ? "led-sync-flash" : isActive ? "led-breathe" : "led-dim"}
      >
        {DOT_ANGLES.map((angle, i) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          const x = CX + LED_RADIUS * Math.cos(rad);
          const y = CY + LED_RADIUS * Math.sin(rad);
          const dotColor = isReady ? "#ff2000" : "#881800";
          const dotR = isReady ? 7.5 : 5.5;

          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={dotR + 5}
                fill={isReady ? "rgba(255,32,0,0.22)" : "rgba(80,8,0,0.18)"}
              />
              <circle
                cx={x}
                cy={y}
                r={dotR}
                fill={isActive ? dotColor : "#180000"}
                stroke={isActive ? (isReady ? "#ff5533" : "#551100") : "#1e0000"}
                strokeWidth="1"
                filter={isActive ? "url(#ledGlow)" : undefined}
              />
            </g>
          );
        })}
      </g>

      {/* Inner bezel */}
      <circle cx={CX} cy={CY} r={INNER_RADIUS + 5} fill="#0a0000" />
      <circle
        cx={CX}
        cy={CY}
        r={INNER_RADIUS + 5}
        fill="none"
        stroke={isReady ? "#660000" : "#1a0000"}
        strokeWidth="2"
      />
      <circle cx={CX} cy={CY} r={INNER_RADIUS} fill="url(#innerGrad)" />
    </svg>
  );
}

function DigitalNumber({ value, isReady }: { value: string; isReady: boolean }) {
  const display = value ? value.replace(/\D/g, "").slice(-4) || "---" : "---";
  return (
    <div
      data-testid="text-order-number"
      style={{
        fontFamily: "'Courier New', 'Lucida Console', monospace",
        fontSize: display.length <= 3 ? 62 : 46,
        letterSpacing: "0.1em",
        fontWeight: "bold",
        lineHeight: 1,
        color: isReady ? "#ff3300" : "#882200",
        textShadow: isReady
          ? "0 0 6px #ff3300, 0 0 20px #ff220099, 0 0 40px #cc000055"
          : "0 0 8px #88220066",
      }}
      className={isReady ? "num-sync-flash" : "num-breathe"}
    >
      {display}
    </div>
  );
}

export default function DigitalPagerPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const merchantId = params.get("m") || "";
  const isManual = params.get("type") === "manual";
  const { toast } = useToast();

  const [status, setStatus] = useState<OrderStatus>("processing");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [merchantName, setMerchantName] = useState<string>("");
  const [merchantLogo, setMerchantLogo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertConfirmed, setAlertConfirmed] = useState(false);
  const [curbsideEnabled, setCurbsideEnabled] = useState(false);
  const [diningType, setDiningType] = useState<string>("");
  const [isWaitingOutside, setIsWaitingOutside] = useState(false);
  const [showCurbsideModal, setShowCurbsideModal] = useState(false);
  const [carPlate, setCarPlate] = useState("");
  const [curbsideSending, setCurbsideSending] = useState(false);
  const [curbsideDone, setCurbsideDone] = useState(false);
  const [isStoreActive, setIsStoreActive] = useState<boolean | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const orderNumberToastedRef = useRef(false);

  const prevStatusRef = useRef<OrderStatus>("processing");
  const alertsEnabledRef = useRef(false);
  const vibrateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Lock body scroll for the entire lifetime of this page —
    // prevents the 1-pixel "nudge" and viewport jump on mobile browsers
    const b = document.body;
    const h = document.documentElement;
    const prev = { bOverflow: b.style.overflow, bPos: b.style.position, bWidth: b.style.width, bHeight: b.style.height, bOSB: b.style.overscrollBehavior, hOverflow: h.style.overflow, hOSB: h.style.overscrollBehavior };
    b.style.overflow = "hidden";
    b.style.position = "fixed";
    b.style.width = "100%";
    b.style.height = "100%";
    b.style.overscrollBehavior = "none";
    h.style.overflow = "hidden";
    h.style.overscrollBehavior = "none";
    return () => {
      b.style.overflow = prev.bOverflow;
      b.style.position = prev.bPos;
      b.style.width = prev.bWidth;
      b.style.height = prev.bHeight;
      b.style.overscrollBehavior = prev.bOSB;
      h.style.overflow = prev.hOverflow;
      h.style.overscrollBehavior = prev.hOSB;
    };
  }, []);

  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/merchant-public/${merchantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.storeName) setMerchantName(data.storeName);
        if (data?.logoUrl) setMerchantLogo(data.logoUrl);
        if (data?.curbsideEnabled) setCurbsideEnabled(true);
        if (data?.support_whatsapp) setSupportWhatsapp(data.support_whatsapp);
        if (data?.loyalty_config?.is_enabled) setLoyaltyEnabled(true);
        // null means still loading; false means store is paused
        setIsStoreActive(data?.isStoreActive !== false);
      })
      .catch(() => { setIsStoreActive(true); });
  }, [merchantId]);

  useEffect(() => {
    if (!merchantName) return;
    const typeParam = isManual ? "&type=manual" : "";
    const cleanUrl = `${window.location.origin}${window.location.pathname}?m=${merchantId}${typeParam}`;
    document.title = merchantName;
    const setMeta = (sel: string, val: string) => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute("content", val);
    };
    setMeta('meta[property="og:title"]', merchantName);
    setMeta('meta[property="og:description"]', "تابع طلبي معك ولا تنسى تذكرني 🍔✨");
    if (merchantLogo) {
      const host = window.location.origin;
      const fullLogo = merchantLogo.startsWith("http") ? merchantLogo : `${host}${merchantLogo}`;
      setMeta('meta[property="og:image"]', fullLogo);
      setMeta('meta[name="twitter:image"]', fullLogo);
    }
    setMeta('meta[property="og:url"]', cleanUrl);
    setMeta('meta[name="twitter:title"]', merchantName);
    setMeta('meta[name="twitter:description"]', "تابع طلبي معك ولا تنسى تذكرني 🍔✨");
    return () => { document.title = "Digital Pager"; };
  }, [merchantName, merchantLogo, merchantId]);

  // Used ONLY for the activation button — unlocks browser session audio
  const playBell = useCallback(() => {
    try {
      if (!bellAudioRef.current) { bellAudioRef.current = new Audio("/silent.mp3"); bellAudioRef.current.loop = true; }
      const audio = bellAudioRef.current;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  }, []);

  // Used ONLY for status → "Order Ready" alert
  const playAlert = useCallback(() => {
    try {
      const audio = alertAudioRef.current || new Audio("/alert.mp3");
      alertAudioRef.current = audio;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  }, []);

  const startVibrateLoop = useCallback(() => {
    if (!alertsEnabledRef.current) return;
    if (vibrateIntervalRef.current) clearInterval(vibrateIntervalRef.current);
    try { navigator.vibrate([300, 150, 300, 150, 500]); } catch {}
    vibrateIntervalRef.current = setInterval(() => {
      try { navigator.vibrate([300, 150, 300, 150, 500]); } catch {}
    }, 3500);
  }, []);

  const stopVibrateLoop = useCallback(() => {
    if (vibrateIntervalRef.current) {
      clearInterval(vibrateIntervalRef.current);
      vibrateIntervalRef.current = null;
    }
    try { navigator.vibrate(0); } catch {}
  }, []);

  // Stop and reset the alert audio immediately
  const stopAlert = useCallback(() => {
    try {
      if (alertAudioRef.current) {
        alertAudioRef.current.pause();
        alertAudioRef.current.currentTime = 0;
      }
    } catch {}
  }, []);

  // Trigger alert.mp3 + vibration on status → ready; stop immediately when leaving ready
  useEffect(() => {
    if (status === "ready" && prevStatusRef.current !== "ready") {
      playAlert();
      startVibrateLoop();
    }
    if (status !== "ready") {
      stopAlert();
      stopVibrateLoop();
    }
  }, [status, playAlert, startVibrateLoop, stopAlert, stopVibrateLoop]);

  // Component unmount cleanup — kill all audio and vibration
  useEffect(() => {
    return () => {
      stopAlert();
      stopVibrateLoop();
      try {
        if (bellAudioRef.current) {
          bellAudioRef.current.pause();
          bellAudioRef.current.currentTime = 0;
        }
      } catch {}
    };
  }, [stopAlert, stopVibrateLoop]);

  // Show confirmation toast once when the order number is first received
  useEffect(() => {
    if (orderNumber && !orderNumberToastedRef.current) {
      orderNumberToastedRef.current = true;
      toast({
        description: "تم تأكيد رقم طلبك بنجاح",
        duration: 3000,
      });
    }
  }, [orderNumber, toast]);

  // Redirect to order-completed when status becomes "done"
  useEffect(() => {
    if (status === "done" && prevStatusRef.current !== "done") {
      // Explicitly kill audio and vibration before navigating away
      stopAlert();
      stopVibrateLoop();
      const type = isManual ? "manual" : "whatsapp";
      setLocation(`/order-completed/${merchantId}?orderId=${orderId}&type=${type}`);
    }
  }, [status, merchantId, orderId, isManual, setLocation, stopAlert, stopVibrateLoop]);

  useEffect(() => {
    if (!orderId || !merchantId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    if (isManual) {
      const ref = doc(db, "merchants", merchantId, "pagers", orderId);
      const unsub = onSnapshot(ref, (snap) => {
        setLoading(false);
        if (!snap.exists()) { setNotFound(true); return; }
        const data = snap.data();
        setOrderNumber(data.displayOrderId || data.orderNumber || "");
        const newStatus = getStatusFromPager(data.status || "waiting");
        prevStatusRef.current = status;
        setStatus(newStatus);
      });
      return () => unsub();
    } else {
      const ref = doc(db, "merchants", merchantId, "whatsappOrders", orderId);
      const unsub = onSnapshot(ref, (snap) => {
        setLoading(false);
        if (!snap.exists()) { setNotFound(true); return; }
        const data = snap.data();
        setOrderNumber(data.orderNumber || data.displayOrderId || "");
        setDiningType(data.diningType || "");
        setIsWaitingOutside(data.is_waiting_outside === true);
        if (data.is_waiting_outside === true && data.car_plate_number) setCurbsideDone(true);
        if (data.customerPhone) setCustomerPhone(data.customerPhone);
        const newStatus = getStatusFromWhatsapp(data.status || "pending_verification");
        prevStatusRef.current = status;
        setStatus(newStatus);
      });
      return () => unsub();
    }
  }, [orderId, merchantId, isManual]);

  // Real-time wallet balance listener for digital pager
  useEffect(() => {
    if (!loyaltyEnabled || !merchantId || !customerPhone || customerPhone.length < 9 || isManual) return;
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (!cleanPhone) return;
    const walletDocId = `${merchantId}_${cleanPhone}`;
    const unsub = onSnapshot(doc(db, "wallets", walletDocId), (snap) => {
      if (snap.exists()) {
        setWalletBalance(snap.data().balance || 0);
      } else {
        setWalletBalance(0);
      }
    });
    return () => unsub();
  }, [loyaltyEnabled, merchantId, customerPhone, isManual]);


  function handleActivateAlerts() {
    // Play silent.mp3 on button press — this unlocks the browser audio session
    try {
      if (!bellAudioRef.current) { bellAudioRef.current = new Audio("/silent.mp3"); bellAudioRef.current.loop = true; }
      const bell = bellAudioRef.current;
      bell.currentTime = 0;
      bell.play().catch(() => {});
    } catch {}
    // Set lock-screen media metadata so the OS shows the store brand
    try {
      if ("mediaSession" in navigator) {
        const logoSrc = merchantLogo || "/logo.png";
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "طلبك جاهز للإستلام ☕",
          artist: merchantName || "Digital Pager",
          album: "نقدر ذائقتكم",
          artwork: [
            { src: logoSrc, sizes: "512x512", type: "image/png" },
          ],
        });
      }
    } catch {}
    // Pre-load alert.mp3 into the ref so it's ready to fire
    try {
      if (!alertAudioRef.current) alertAudioRef.current = new Audio("/alert.mp3");
    } catch {}
    try { navigator.vibrate([100, 50, 100]); } catch {}
    alertsEnabledRef.current = true;
    setAlertsEnabled(true);
    setAlertConfirmed(true);
    setTimeout(() => setAlertConfirmed(false), 2500);
    // If order is already ready, replay alert.mp3 + vibration
    if (status === "ready" || status === "done") {
      playAlert();
      startVibrateLoop();
    }
  }

  async function handleShare() {
    const typeParam = isManual ? "&type=manual" : "";
    const cleanUrl = `${window.location.origin}${window.location.pathname}?m=${merchantId}${typeParam}&source=share_moment`;
    const storeName = merchantName || "المتجر";
    const shareText = `شارك أصدقاءك وأحبابك وخليهم يتتبعون معك الطلب بحماس\n${storeName}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: storeName, text: shareText, url: cleanUrl });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${cleanUrl}`);
        toast({ description: "تم نسخ رابط اللحظة! شاركه مع من تحب 💛", duration: 2500 });
      } catch {}
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

  async function handleCurbsideSubmit() {
    if (!carPlate.trim()) return;
    setCurbsideSending(true);
    try {
      const orderRef = doc(db, "merchants", merchantId, "whatsappOrders", orderId);
      await updateDoc(orderRef, {
        is_waiting_outside: true,
        car_plate_number: carPlate.trim().toUpperCase(),
      });
      setCurbsideDone(true);
      setShowCurbsideModal(false);
      toast({ description: "تم إرسال إشعار للمتجر، العامل في طريقه إليك الآن.", duration: 4000 });
    } catch {
      toast({ description: "حدث خطأ، حاول مجدداً", variant: "destructive" });
    } finally {
      setCurbsideSending(false);
    }
  }

  const bg = "linear-gradient(180deg, #080000 0%, #000000 50%, #080000 100%)";
  const isReady = status === "ready" || status === "done";

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-red-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 px-6" style={{ background: bg }}>
        <p className="text-red-900/60 text-lg text-center" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>
          لم يتم العثور على الطلب
        </p>
        <p className="text-red-900/30 text-sm text-center">Order not found</p>
      </div>
    );
  }

  if (isStoreActive === false) {
    return (
      <div
        className="h-[100dvh] flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
        data-testid="screen-store-paused"
      >
        {merchantLogo && (
          <img src={merchantLogo} alt="" className="w-20 h-20 rounded-2xl object-cover opacity-40" />
        )}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "rgba(80,0,0,0.4)", border: "2px solid rgba(180,0,0,0.3)" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(200,50,50,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <p className="text-xl font-bold text-red-400/90" data-testid="text-store-paused-ar">
            عذراً، المتجر متوقف حالياً
          </p>
          <p className="text-sm text-white/30" data-testid="text-store-paused-en">
            This store is currently unavailable
          </p>
        </div>
        {merchantName && (
          <p className="text-xs text-white/20">{merchantName}</p>
        )}
      </div>
    );
  }

  // ── Waiting for merchant acceptance (online orders only) ──
  if (status === "waiting_acceptance" && !isManual) {
    return (
      <div
        className="h-[100dvh] flex flex-col items-center justify-center px-6 gap-8"
        style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
        data-testid="screen-waiting-acceptance"
        dir="rtl"
      >
        {/* Merchant logo / placeholder */}
        {merchantLogo ? (
          <img src={merchantLogo} alt="" className="w-16 h-16 rounded-2xl object-cover opacity-60" />
        ) : merchantName ? (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
            style={{ background: "rgba(30,5,5,0.8)", border: "1.5px solid rgba(120,0,0,0.35)", color: "rgba(200,60,60,0.7)" }}
          >
            {merchantName.charAt(0)}
          </div>
        ) : null}

        {/* Pulsing ring animation */}
        <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
          {/* Outer pulse rings */}
          <div
            className="absolute rounded-full"
            style={{
              width: 100, height: 100,
              background: "rgba(180,30,30,0.06)",
              border: "1.5px solid rgba(180,30,30,0.15)",
              animation: "waitPulse 2s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 72, height: 72,
              background: "rgba(180,30,30,0.08)",
              border: "1.5px solid rgba(180,30,30,0.2)",
              animation: "waitPulse 2s ease-in-out infinite 0.4s",
            }}
          />
          {/* Inner circle */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(60,5,5,0.9)", border: "2px solid rgba(160,30,30,0.4)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(200,80,80,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <style>{`
            @keyframes waitPulse {
              0%, 100% { transform: scale(0.96); opacity: 0.5; }
              50% { transform: scale(1.04); opacity: 1; }
            }
          `}</style>
        </div>

        {/* Message */}
        <div className="text-center space-y-3 max-w-xs">
          <p
            className="text-lg font-bold leading-relaxed"
            style={{ color: "rgba(255,255,255,0.85)" }}
            data-testid="text-waiting-acceptance"
          >
            ننتظر قبول طلبك من قِبل المتجر..
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            فضلاً انتظر لحظات
          </p>
        </div>

        {/* Order number */}
        {orderNumber && (
          <div
            className="px-5 py-2.5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-xs text-white/30 text-center">
              رقم الطلب — <span className="font-bold text-white/50">#{orderNumber}</span>
            </p>
          </div>
        )}

        {/* Dots loader */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "rgba(180,50,50,0.6)",
                animation: `waitDot 1.2s ease-in-out infinite ${i * 0.2}s`,
              }}
            />
          ))}
          <style>{`
            @keyframes waitDot {
              0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
              40% { transform: scale(1.2); opacity: 1; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center px-6"
        style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
        data-testid="digital-pager-cancelled"
      >
        {/* Large cancel icon */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
          style={{
            background: "rgba(100,0,0,0.25)",
            border: "2px solid rgba(180,40,40,0.45)",
          }}
        >
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="24" stroke="rgba(180,40,40,0.5)" strokeWidth="1.5" />
            <path d="M17 17L35 35M35 17L17 35" stroke="rgba(220,70,70,0.95)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        {/* Main title — 24px Bold White */}
        <p
          className="font-bold text-center mb-4"
          style={{ fontSize: 24, color: "#ffffff" }}
          data-testid="text-cancelled-title"
        >
          تم إلغاء طلبك من المتجر
        </p>

        {/* Apology message — 16px Gray-200 */}
        <p
          className="text-center leading-relaxed mb-10"
          style={{ fontSize: 16, color: "#e5e7eb", lineHeight: "1.85", maxWidth: 320 }}
          dir="rtl"
          data-testid="text-cancelled-message"
        >
          نعتذر منك، تم إلغاء طلبك من قبل المتجر لظروف خارجة عن إرادتنا. يرجى التواصل معنا للمزيد من التفاصيل.
        </p>

        {/* Back to home button */}
        <button
          onClick={() => setLocation(merchantId ? `/menu/${merchantId}` : "/")}
          data-testid="btn-back-home"
          className="px-8 py-3.5 rounded-2xl font-semibold transition-all active:scale-95"
          style={{
            fontSize: 16,
            background: "rgba(40,0,0,0.6)",
            border: "1.5px solid rgba(160,30,30,0.5)",
            color: "#ff6666",
          }}
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  const statusTextAr = isReady
    ? "طلبك جاهز! استلمه الآن"
    : status === "preparing"
    ? "جاري تحضير طلبك..."
    : status === "waiting_acceptance"
    ? "ننتظر قبول طلبك..."
    : "جاري التحضير";

  return (
    <div
      className="h-[100dvh] flex flex-col items-center overflow-y-auto overflow-x-hidden"
      style={{
        background: bg,
        fontFamily: "'Tajawal','Cairo',sans-serif",
        overscrollBehavior: "none",
        WebkitOverflowScrolling: "touch",
      }}
      data-testid="digital-pager-page"
    >
      <style>{`
        /* Preparing: slow breathing pulse on entire LED group */
        .led-breathe {
          animation: ledBreathe 3s ease-in-out infinite;
        }
        @keyframes ledBreathe {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 1;   }
        }

        /* Ready: synchronous flash — all LEDs on/off together, no rotation */
        .led-sync-flash {
          animation: ledSyncFlash 0.45s ease-in-out infinite;
        }
        @keyframes ledSyncFlash {
          0%, 100% { opacity: 1;    }
          50%      { opacity: 0.08; }
        }

        .led-dim { opacity: 0.25; }

        @keyframes btnFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        /* Number animations */
        .num-breathe {
          animation: numBreathe 3s ease-in-out infinite;
        }
        @keyframes numBreathe {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1;   }
        }
        .num-sync-flash {
          animation: numSyncFlash 0.45s ease-in-out infinite;
        }
        @keyframes numSyncFlash {
          0%, 100% { opacity: 1;    }
          50%      { opacity: 0.15; }
        }

        /* Ambient glow */
        .pager-ambient-glow {
          animation: ambientPulse 0.45s ease-in-out infinite;
        }
        @keyframes ambientPulse {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.2; }
        }
      `}</style>

      {/* Header */}
      <div className="text-center pt-8 pb-0 px-5 w-full">
        <p
          className="text-[11px] font-medium uppercase mb-4"
          style={{ color: "#5a1a1a", letterSpacing: "0.45em" }}
        >
          DIGITAL PAGER
        </p>
        {merchantLogo ? (
          <img
            src={merchantLogo}
            alt=""
            className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
            style={{ border: "1px solid #3a0808" }}
            data-testid="img-store-logo"
          />
        ) : null}
        {merchantName && (
          <h1 className="font-bold text-lg" style={{ color: "rgba(255,255,255,0.8)" }} data-testid="text-store-name">
            {merchantName}
          </h1>
        )}
        {merchantName && (
          <p style={{ color: "#5a2020", fontSize: 12, marginTop: 1 }}>Guest Tracking</p>
        )}
      </div>

      {/* Pager device */}
      <div className="relative flex items-center justify-center mt-4" style={{ width: 320, height: 320, flexShrink: 0 }}>
        <HapticPagerSVG status={status} />
        <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
          <DigitalNumber value={orderNumber} isReady={isReady} />
        </div>
      </div>

      {/* Status text */}
      <div className="text-center px-6 mt-3 w-full max-w-xs">
        <p
          className="font-bold text-xl leading-tight"
          style={{
            color: isReady ? "#ff3300" : "#cc4400",
            textShadow: isReady ? "0 0 16px rgba(255,50,0,0.5)" : "none",
          }}
          data-testid="text-status-ar"
        >
          {statusTextAr}
        </p>
      </div>


      {/* Wallet balance card
          Security: Hiding balance to prevent disclosure during link sharing.
          Visible only during initial processing — strictly hidden when status
          is "waiting_acceptance", "preparing", "ready", "done", or "cancelled". */}
      {loyaltyEnabled &&
        !isManual &&
        customerPhone &&
        walletBalance !== null &&
        status !== "waiting_acceptance" &&
        status !== "preparing" &&
        status !== "ready" &&
        status !== "done" &&
        status !== "cancelled" && (
        <div className="w-full max-w-xs px-4 mt-4">
          <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1a0d00 0%, #0a0600 55%, #160800 100%)", border: "1.5px solid rgba(251,191,36,0.22)" }}
            data-testid="wallet-balance-card"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-300/70 font-semibold">محفظة الولاء</span>
              </div>
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400">نشط</span>
              </div>
            </div>
            <p className="text-xl font-black text-amber-400 leading-none mb-0.5" data-testid="text-pager-wallet-balance">{walletBalance.toFixed(2)}</p>
            <p className="text-[10px] text-white/30">ريال سعودي — رصيدك الحالي</p>
          </div>
        </div>
      )}

      {/* Curbside Pickup button — only when order is ready, curbside enabled, not delivery, not manual pager */}
      {isReady && curbsideEnabled && diningType !== "delivery" && !isManual && (
        <div className="w-full max-w-xs px-4 mt-3">
          {curbsideDone || isWaitingOutside ? (
            <div
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl"
              style={{ background: "rgba(0,120,60,0.18)", border: "1.5px solid rgba(0,200,80,0.35)", color: "rgba(80,240,120,0.9)" }}
              data-testid="status-curbside-sent"
            >
              <span className="text-sm font-semibold">✓ تم إرسال الإشعار — العامل في طريقه</span>
            </div>
          ) : (
            <button
              onClick={() => setShowCurbsideModal(true)}
              data-testid="btn-curbside-pickup"
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl transition-all active:scale-95"
              style={{
                background: "rgba(255,140,0,0.18)",
                border: "1.5px solid rgba(255,140,0,0.5)",
                color: "rgba(255,180,60,0.95)",
              }}
            >
              🚗
              <span className="text-sm font-bold">أحضر طلبي إلى سيارتي</span>
            </button>
          )}
        </div>
      )}

      {/* Curbside Modal */}
      {showCurbsideModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCurbsideModal(false); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-5"
            style={{ background: "#100808", border: "1px solid rgba(255,140,0,0.3)", fontFamily: "'Tajawal','Cairo',sans-serif" }}
            dir="rtl"
          >
            <div className="text-center">
              <p className="text-2xl mb-1">🚗</p>
              <p className="text-base font-bold text-white">استلام الطلب في السيارة</p>
              <p className="text-xs text-white/40 mt-0.5">أدخل أرقام لوحة سيارتك</p>
            </div>
            <input
              type="text"
              value={carPlate}
              onChange={(e) => setCarPlate(e.target.value.toUpperCase())}
              placeholder="مثال: ABC 1234"
              data-testid="input-car-plate"
              className="w-full py-3 px-4 rounded-2xl text-center text-lg font-bold tracking-widest outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,140,0,0.35)",
                color: "#fff",
                fontFamily: "monospace",
              }}
              autoFocus
              maxLength={12}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCurbsideModal(false)}
                className="flex-1 py-3 rounded-2xl text-sm text-white/50 transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                data-testid="btn-curbside-cancel"
              >
                إلغاء
              </button>
              <button
                onClick={handleCurbsideSubmit}
                disabled={!carPlate.trim() || curbsideSending}
                className="flex-[2] py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-30"
                style={{ background: "rgba(255,140,0,0.85)", color: "#000" }}
                data-testid="btn-curbside-confirm"
              >
                {curbsideSending ? "جاري الإرسال..." : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom action bar — sequential: bell first, share button fades in after */}
      <div
        className="mt-5 w-full max-w-xs px-4"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        {/* Phase 1 — alerts not yet enabled: show bell button */}
        {!alertsEnabled && (
          <button
            onClick={handleActivateAlerts}
            data-testid="btn-activate-alerts"
            className="flex items-center justify-center gap-2.5 w-full rounded-2xl transition-all active:scale-95"
            style={{
              background: alertConfirmed ? "rgba(22,5,5,0.9)" : "#FF6B00",
              border: alertConfirmed ? "1.5px solid #4a1010" : "none",
              color: alertConfirmed ? "#cc4422" : "#000000",
              fontWeight: "bold",
              paddingTop: "14px",
              paddingBottom: "14px",
              boxShadow: alertConfirmed ? "none" : "0 0 18px 4px rgba(255,107,0,0.45)",
            }}
          >
            <Bell className="w-4 h-4" fill="none" />
            <span className="text-sm font-bold">
              {alertConfirmed ? "تم تفعيل التنبيهات ✓" : "فعل الجرس للتنبيهات 🔔"}
            </span>
          </button>
        )}

        {/* Phase 2 — alerts enabled + order still active: share button fades in */}
        {alertsEnabled && !isReady && status !== "done" && status !== "cancelled" && (
          <button
            onClick={handleShare}
            data-testid="btn-share-tracking"
            className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-2xl active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(234,179,8,0.10) 0%, rgba(251,191,36,0.06) 50%, rgba(234,179,8,0.10) 100%)",
              border: "1.5px solid rgba(251,191,36,0.55)",
              boxShadow: "0 0 24px rgba(251,191,36,0.22), 0 0 8px rgba(251,191,36,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
              animation: "btnFadeIn 0.45s ease-out forwards",
            }}
          >
            <Share2 className="w-5 h-5 shrink-0" style={{ color: "#fbbf24" }} />
            <span className="flex flex-col items-center" dir="rtl">
              <span className="text-base font-black" style={{ fontFamily: "'Tajawal','Cairo',sans-serif", color: "#fde68a" }}>
                حفظ رابط التتبع
              </span>
              <span style={{ fontSize: "10px", color: "rgba(253,230,138,0.65)", fontFamily: "'Tajawal','Cairo',sans-serif" }}>
                تحسبا لفقدان صفحة الويب
              </span>
            </span>
          </button>
        )}
      </div>

      {supportWhatsapp.replace(/\D/g, "") && !isManual && (
        <a
          href={`https://wa.me/${supportWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`أهلاً ${merchantName}، لدي استفسار بخصوص طلبي رقم (# ${orderId})`)}`}
          target="_blank" rel="noopener noreferrer" className="wa-pulse"
          style={{ position: "fixed", bottom: "88px", right: "20px", zIndex: 9999, width: 56, height: 56, borderRadius: "50%", background: "#25d366", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
          data-testid="button-whatsapp-support" aria-label="تواصل عبر واتساب"
        >
          <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12.001 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.987-1.306A9.953 9.953 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18c-1.738 0-3.368-.474-4.769-1.299l-.342-.203-3.037.794.812-2.962-.222-.358A7.964 7.964 0 014 12c0-4.418 3.582-8 8.001-8 4.418 0 7.999 3.582 7.999 8s-3.581 8-7.999 8z"/>
          </svg>
        </a>
      )}
    </div>
  );
}
