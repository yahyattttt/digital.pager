import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell, Share2, FileText } from "lucide-react";

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

const DOT_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

function PagerCircle({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: OrderStatus;
}) {
  const isReady = status === "ready" || status === "done";
  const isProcessing = status === "processing";
  const isPreparing = status === "preparing";

  const litDots =
    status === "done" || status === "ready"
      ? DOT_ANGLES
      : status === "preparing"
      ? DOT_ANGLES.slice(0, 6)
      : DOT_ANGLES.slice(0, 2);

  const displayNumber = orderNumber
    ? orderNumber.replace(/\D/g, "").slice(-4).padStart(3, "0")
    : "---";

  const R = 130;
  const cx = 150;
  const cy = 150;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 300, height: 300 }}>
      {isReady && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(180,0,0,0.25) 0%, transparent 70%)",
          }}
        />
      )}

      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          <radialGradient id="circleGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a0000" />
            <stop offset="100%" stopColor="#0a0000" />
          </radialGradient>
          <filter id="redGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="url(#circleGrad)"
          stroke={isReady ? "#cc0000" : "#5a0000"}
          strokeWidth={isReady ? 2.5 : 1.5}
        />

        <circle
          cx={cx}
          cy={cy}
          r={R - 18}
          fill="none"
          stroke="#2a0000"
          strokeWidth="1"
        />

        {DOT_ANGLES.map((angle) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          const x = cx + R * Math.cos(rad);
          const y = cy + R * Math.sin(rad);
          const isLit = litDots.includes(angle);
          return (
            <circle
              key={angle}
              cx={x}
              cy={y}
              r={isLit ? 6 : 4.5}
              fill={isLit ? (isReady ? "#ff2200" : isPreparing ? "#cc4400" : "#661100") : "#1a0000"}
              stroke={isLit ? (isReady ? "#ff4400" : "#882200") : "#330000"}
              strokeWidth="1"
              filter={isLit ? "url(#redGlow)" : undefined}
              style={
                isReady && isLit
                  ? { animation: `dotPulse 1.2s ease-in-out infinite alternate` }
                  : undefined
              }
            />
          );
        })}
      </svg>

      <div
        className="relative z-10 flex flex-col items-center justify-center"
        style={{ width: 180, height: 180 }}
      >
        <div
          data-testid="text-order-number"
          style={{
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            fontSize: displayNumber.length <= 3 ? 68 : 52,
            letterSpacing: "0.15em",
            color: isReady ? "#ff3300" : isPreparing ? "#cc4400" : "#882200",
            textShadow: isReady
              ? "0 0 8px #ff3300, 0 0 20px #ff220066, 0 0 40px #cc000044"
              : isPreparing
              ? "0 0 8px #cc440088, 0 0 20px #aa330044"
              : "0 0 6px #88220066",
            fontWeight: "bold",
            lineHeight: 1,
          }}
        >
          {displayNumber}
        </div>

        {isProcessing && (
          <div className="mt-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-red-900"
                style={{ animation: `dotBlink 1.4s ease-in-out ${i * 0.25}s infinite` }}
              />
            ))}
          </div>
        )}
      </div>

      {isReady && (
        <div
          className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-red-900/80 border border-red-700 flex items-center justify-center"
          style={{ animation: "bellRing 0.5s ease-in-out infinite alternate" }}
        >
          <Bell className="w-6 h-6 text-red-400" fill="currentColor" />
        </div>
      )}

      <style>{`
        @keyframes dotPulse {
          0% { opacity: 0.7; r: 5; }
          100% { opacity: 1; r: 7; }
        }
        @keyframes dotBlink {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; background-color: #cc2200; }
        }
        @keyframes bellRing {
          0% { transform: rotate(-15deg) scale(1); }
          100% { transform: rotate(15deg) scale(1.05); }
        }
      `}</style>
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
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const prevStatusRef = useRef<OrderStatus>("processing");
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/merchant-public/${merchantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.storeName) setMerchantName(data.storeName);
        if (data?.logoUrl) setMerchantLogo(data.logoUrl);
        if (data?.googleMapsReviewUrl) setGoogleMapsUrl(data.googleMapsReviewUrl);
      })
      .catch(() => {});
  }, [merchantId]);

  function playBell() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.2);
    } catch {}
  }

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
        if (newStatus === "ready" && prevStatusRef.current !== "ready") playBell();
        prevStatusRef.current = newStatus;
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
        if (newStatus === "ready" && prevStatusRef.current !== "ready") playBell();
        prevStatusRef.current = newStatus;
        setStatus(newStatus);
      });
      return () => unsub();
    }
  }, [orderId, merchantId, isManual]);

  const bg = "linear-gradient(180deg, #0a0000 0%, #000000 50%, #0a0000 100%)";

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 px-6" style={{ background: bg }}>
        <p className="text-red-900/70 text-lg text-center" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>
          لم يتم العثور على الطلب
        </p>
        <p className="text-red-900/40 text-sm text-center">Order not found</p>
      </div>
    );
  }

  const isReady = status === "ready" || status === "done";

  const statusTextAr =
    status === "processing"
      ? "جاري استلام طلبك..."
      : status === "preparing"
      ? "طلبك قيد التحضير 🍽️"
      : status === "ready"
      ? "طلبك جاهز، استلمه الآن! ✅"
      : "شكراً! تم استلام طلبك ✅";

  const statusTextEn =
    status === "processing"
      ? "Receiving your order..."
      : status === "preparing"
      ? "Your order is being prepared"
      : status === "ready"
      ? "Your order is ready! Please pick it up."
      : "Thank you! Order completed.";

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: merchantName || "Digital Pager",
        text: statusTextAr,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center"
      style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
      data-testid="digital-pager-page"
    >
      <div className="text-center pt-8 pb-2 px-5 w-full">
        <p
          className="text-red-900/60 text-[11px] font-medium tracking-[0.4em] uppercase mb-3"
          style={{ letterSpacing: "0.4em" }}
        >
          DIGITAL PAGER
        </p>
        {merchantLogo ? (
          <img
            src={merchantLogo}
            alt=""
            className="w-14 h-14 rounded-full mx-auto mb-2 object-cover border border-red-900/40"
            data-testid="img-store-logo"
          />
        ) : null}
        {merchantName && (
          <h1
            className="text-white/80 text-lg font-bold"
            data-testid="text-store-name"
          >
            {merchantName}
          </h1>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 w-full pb-4">
        <PagerCircle orderNumber={orderNumber} status={status} />

        <div className="text-center px-4">
          <p
            className="font-bold text-xl leading-snug"
            style={{
              color: isReady ? "#ff4422" : "#cc4400",
              textShadow: isReady ? "0 0 12px #ff220055" : "none",
            }}
            data-testid="text-status-ar"
          >
            {statusTextAr}
          </p>
          <p className="text-white/30 text-sm mt-1" data-testid="text-status-en">
            {statusTextEn}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs px-2">
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border transition-all active:scale-95"
              style={{
                background: "rgba(40,0,0,0.8)",
                borderColor: "#5a1a1a",
                color: "#ff6644",
              }}
              data-testid="btn-view-receipt"
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">عرض إيصال الطلب</span>
            </a>
          )}

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border transition-all active:scale-95"
            style={{
              background: "rgba(40,0,0,0.8)",
              borderColor: "#5a1a1a",
              color: "#ff6644",
            }}
            data-testid="btn-share"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">مشاركة مع الأحباب</span>
          </button>
        </div>
      </div>
    </div>
  );
}
