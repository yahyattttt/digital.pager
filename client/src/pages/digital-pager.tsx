import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell } from "lucide-react";

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

// 12 LED dot angles, evenly spaced
const DOT_COUNT = 12;
const DOT_ANGLES = Array.from({ length: DOT_COUNT }, (_, i) => (i * 360) / DOT_COUNT);
const CX = 160;
const CY = 160;
const LED_RADIUS = 118;
const BODY_RADIUS = 155;
const INNER_RADIUS = 90;

function HapticPagerSVG({ status }: { status: OrderStatus }) {
  const isReady = status === "ready" || status === "done";
  const isPreparing = status === "preparing" || status === "processing";

  return (
    <svg
      width="320"
      height="320"
      viewBox="0 0 320 320"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        {/* Dome body gradient */}
        <radialGradient id="bodyGrad" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#2a0800" />
          <stop offset="45%" stopColor="#150200" />
          <stop offset="100%" stopColor="#060000" />
        </radialGradient>

        {/* Inner display gradient */}
        <radialGradient id="innerGrad" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1a0000" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>

        {/* Dome specular highlight */}
        <radialGradient id="domeHighlight" cx="35%" cy="28%" r="40%">
          <stop offset="0%" stopColor="rgba(255,80,40,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>

        {/* LED glow filter */}
        <filter id="ledGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ambient outer glow for ready state */}
        <filter id="outerGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Number glow */}
        <filter id="numGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer ambient glow when ready */}
      {isReady && (
        <circle
          cx={CX}
          cy={CY}
          r={BODY_RADIUS + 10}
          fill="rgba(200,0,0,0.18)"
          filter="url(#outerGlow)"
          className="pager-ambient-glow"
        />
      )}

      {/* Pager body */}
      <circle cx={CX} cy={CY} r={BODY_RADIUS} fill="url(#bodyGrad)" />

      {/* Body border ring */}
      <circle
        cx={CX}
        cy={CY}
        r={BODY_RADIUS}
        fill="none"
        stroke={isReady ? "#cc1100" : "#3a0800"}
        strokeWidth={isReady ? 2.5 : 1.5}
      />

      {/* Dome specular highlight */}
      <circle cx={CX} cy={CY} r={BODY_RADIUS} fill="url(#domeHighlight)" />

      {/* Outer LED track groove */}
      <circle
        cx={CX}
        cy={CY}
        r={LED_RADIUS}
        fill="none"
        stroke="#1a0000"
        strokeWidth="14"
      />

      {/* Inner track ring line */}
      <circle
        cx={CX}
        cy={CY}
        r={LED_RADIUS - 8}
        fill="none"
        stroke="#0d0000"
        strokeWidth="1"
      />
      <circle
        cx={CX}
        cy={CY}
        r={LED_RADIUS + 8}
        fill="none"
        stroke="#0d0000"
        strokeWidth="1"
      />

      {/* LED dot ring — this group spins when ready */}
      <g
        className={isReady ? "led-ring-spin" : isPreparing ? "led-ring-idle" : ""}
        style={{ transformOrigin: `${CX}px ${CY}px` }}
      >
        {DOT_ANGLES.map((angle, i) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          const x = CX + LED_RADIUS * Math.cos(rad);
          const y = CY + LED_RADIUS * Math.sin(rad);
          const isLit = isReady || isPreparing;
          const dotColor = isReady ? "#ff2200" : "#882200";
          const dotR = isReady ? 7 : 5.5;

          return (
            <g key={i}>
              {isLit && (
                <circle
                  cx={x}
                  cy={y}
                  r={dotR + 4}
                  fill={isReady ? "rgba(255,34,0,0.25)" : "rgba(100,10,0,0.2)"}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={dotR}
                fill={isLit ? dotColor : "#1a0000"}
                stroke={isLit ? (isReady ? "#ff6644" : "#661100") : "#220000"}
                strokeWidth="1"
                filter={isLit ? "url(#ledGlow)" : undefined}
              />
            </g>
          );
        })}
      </g>

      {/* Inner display bezel */}
      <circle cx={CX} cy={CY} r={INNER_RADIUS + 4} fill="#0a0000" />
      <circle
        cx={CX}
        cy={CY}
        r={INNER_RADIUS + 4}
        fill="none"
        stroke={isReady ? "#550000" : "#1a0000"}
        strokeWidth="2"
      />

      {/* Inner display surface */}
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
        fontSize: display.length <= 3 ? 62 : display.length === 4 ? 48 : 40,
        letterSpacing: "0.12em",
        fontWeight: "bold",
        lineHeight: 1,
        color: isReady ? "#ff3300" : "#882200",
        textShadow: isReady
          ? "0 0 6px #ff3300, 0 0 18px #ff220088, 0 0 40px #cc000055"
          : "0 0 8px #88220066, 0 0 18px #44100033",
      }}
      className={isReady ? "num-intense-pulse" : "num-dim-pulse"}
    >
      {display}
    </div>
  );
}

export default function DigitalPagerPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const params = new URLSearchParams(window.location.search);
  const merchantId = params.get("m") || "";
  const isManual = params.get("type") === "manual";

  const [status, setStatus] = useState<OrderStatus>("processing");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [merchantName, setMerchantName] = useState<string>("");
  const [merchantLogo, setMerchantLogo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertConfirmed, setAlertConfirmed] = useState(false);

  const prevStatusRef = useRef<OrderStatus>("processing");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertsEnabledRef = useRef(false);
  const vibrateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const playBellSound = useCallback(() => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();

      const t = ctx.currentTime;
      [880, 1320, 880, 1100].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t + i * 0.18);
        gain.gain.setValueAtTime(0, t + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.35, t + i * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.3);
        osc.start(t + i * 0.18);
        osc.stop(t + i * 0.18 + 0.35);
      });
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

  // Fire alerts when status becomes ready
  useEffect(() => {
    if (status === "ready" && prevStatusRef.current !== "ready") {
      playBellSound();
      startVibrateLoop();
    }
    if (status !== "ready" && status !== "done") {
      stopVibrateLoop();
    }
    return () => { if (status !== "ready") stopVibrateLoop(); };
  }, [status, playBellSound, startVibrateLoop, stopVibrateLoop]);

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
    // Unlock AudioContext via user gesture
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      // Play a tiny silent buffer to unlock audio
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {}

    // Trigger a brief vibration to test
    try { navigator.vibrate([100, 50, 100]); } catch {}

    alertsEnabledRef.current = true;
    setAlertsEnabled(true);
    setAlertConfirmed(true);
    setTimeout(() => setAlertConfirmed(false), 2500);

    // If already ready, start vibrating immediately
    if (status === "ready" || status === "done") {
      playBellSound();
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
    : "جاري استلام طلبك...";

  const statusTextEn = isReady
    ? "ORDER READY! Please proceed to the counter"
    : status === "preparing"
    ? "Preparing your order. We'll buzz you!"
    : "Receiving your order...";

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center"
      style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
      data-testid="digital-pager-page"
    >
      {/* Global animation styles */}
      <style>{`
        /* ── Preparing: slow dim pulse on the LED ring ── */
        .led-ring-idle {
          animation: slowDimPulse 3s ease-in-out infinite;
        }
        @keyframes slowDimPulse {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 1;   }
        }

        /* ── Ready: rapid spin + intense pulse on the LED ring ── */
        .led-ring-spin {
          animation: rapidSpin 0.65s linear infinite,
                     intensePulse 0.4s ease-in-out infinite;
        }
        @keyframes rapidSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes intensePulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.2; }
        }

        /* Number glow pulses */
        .num-dim-pulse {
          animation: numDimPulse 3s ease-in-out infinite;
        }
        @keyframes numDimPulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1;    }
        }
        .num-intense-pulse {
          animation: numIntensePulse 0.4s ease-in-out infinite;
        }
        @keyframes numIntensePulse {
          0%, 100% { opacity: 1;    }
          50%      { opacity: 0.25; }
        }

        /* Ambient glow pulse */
        .pager-ambient-glow {
          animation: ambientGlow 0.55s ease-in-out infinite;
        }
        @keyframes ambientGlow {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.3; }
        }
      `}</style>

      {/* Header */}
      <div className="text-center pt-8 pb-0 px-5 w-full">
        <p
          className="text-[11px] font-medium tracking-[0.45em] uppercase mb-4"
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
          <h1
            className="font-bold text-lg"
            style={{ color: "rgba(255,255,255,0.8)" }}
            data-testid="text-store-name"
          >
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
        {/* Number overlay — centered over the SVG */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
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
            fontFamily: "'Tajawal','Cairo',sans-serif",
          }}
          data-testid="text-status-ar"
        >
          {statusTextAr}
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: isReady ? "rgba(255,100,60,0.7)" : "rgba(255,255,255,0.3)" }}
          data-testid="text-status-en"
        >
          {statusTextEn}
        </p>

        {/* Browser disclaimer */}
        <p className="text-xs text-gray-500 mt-2 leading-relaxed" dir="rtl">
          لضمان وصول التنبيهات اليك الرجاء البقاء على نفس الصفحة بسبب قيود المتصفح
        </p>
      </div>

      {/* Activate alerts button */}
      <div className="mt-4 w-full max-w-xs px-4">
        <button
          onClick={handleActivateAlerts}
          data-testid="btn-activate-alerts"
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl transition-all active:scale-95"
          style={{
            background: alertsEnabled
              ? "rgba(30,60,0,0.85)"
              : "rgba(25,5,5,0.9)",
            border: alertsEnabled
              ? "1.5px solid rgba(80,160,0,0.5)"
              : "1.5px solid #4a1010",
            color: alertsEnabled ? "#66dd00" : "#cc4422",
          }}
        >
          <Bell className="w-4 h-4" fill={alertsEnabled ? "#66dd00" : "none"} />
          <span className="text-sm font-semibold">
            {alertConfirmed ? "تم تفعيل التنبيهات ✓" : "فعل الجرس للتنبيهات"}
          </span>
        </button>
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}
