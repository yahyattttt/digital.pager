import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OrderStatus = "processing" | "preparing" | "ready" | "done";

function getStatusFromWhatsapp(status: string): OrderStatus {
  if (status === "pending_verification" || status === "awaiting_confirmation") return "processing";
  if (status === "preparing") return "preparing";
  if (status === "ready" || status === "notified") return "ready";
  if (status === "completed" || status === "archived") return "done";
  return "processing";
}

function getStatusFromPager(status: string): OrderStatus {
  if (status === "waiting") return "processing";
  if (status === "notified") return "ready";
  if (status === "completed" || status === "archived") return "done";
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
  const orderNumberToastedRef = useRef(false);

  const prevStatusRef = useRef<OrderStatus>("processing");
  const alertsEnabledRef = useRef(false);
  const vibrateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/merchant-public/${merchantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.storeName) setMerchantName(data.storeName);
        if (data?.logoUrl) setMerchantLogo(data.logoUrl);
      })
      .catch(() => {});
  }, [merchantId]);

  // Used ONLY for the activation button — unlocks browser session audio
  const playBell = useCallback(() => {
    try {
      const audio = bellAudioRef.current || new Audio("/bell.mp3");
      bellAudioRef.current = audio;
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
        const newStatus = getStatusFromWhatsapp(data.status || "pending_verification");
        prevStatusRef.current = status;
        setStatus(newStatus);
      });
      return () => unsub();
    }
  }, [orderId, merchantId, isManual]);

  function handleActivateAlerts() {
    // Play bell.mp3 on button press — this unlocks the browser audio session
    try {
      const bell = bellAudioRef.current || new Audio("/bell.mp3");
      bellAudioRef.current = bell;
      bell.currentTime = 0;
      bell.play().catch(() => {});
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

  const statusTextAr = isReady
    ? "طلبك جاهز! استلمه الآن"
    : status === "preparing"
    ? "جاري تحضير طلبك..."
    : "جاري التحضير";

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center"
      style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
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
        {/* Browser disclaimer */}
        <p className="flex items-start justify-center gap-1.5 text-xs text-gray-400 mt-4 mb-1 leading-relaxed px-2" dir="rtl" data-testid="text-disclaimer">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>لضمان تنبيهك فور جهوزية الطلب، يرجى إبقاء هذه الصفحة مفتوحة.</span>
        </p>
      </div>

      {/* Activate alerts button */}
      <div className="mt-5 w-full max-w-xs px-4 pb-8">
        <button
          onClick={handleActivateAlerts}
          data-testid="btn-activate-alerts"
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl transition-all active:scale-95"
          style={{
            background: alertsEnabled ? "rgba(20,50,0,0.9)" : "rgba(22,5,5,0.9)",
            border: alertsEnabled ? "1.5px solid rgba(70,150,0,0.5)" : "1.5px solid #4a1010",
            color: alertsEnabled ? "#66dd00" : "#cc4422",
          }}
        >
          <Bell className="w-4 h-4" fill={alertsEnabled ? "#66dd00" : "none"} />
          <span className="text-sm font-semibold">
            {alertConfirmed ? "تم تفعيل التنبيهات ✓" : "فعل الجرس للتنبيهات"}
          </span>
        </button>
      </div>
    </div>
  );
}
