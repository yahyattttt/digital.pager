import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChefHat, Truck, MapPin, CheckCircle2, Star } from "lucide-react";

type DeliveryStatus = "preparing" | "out_for_delivery" | "delivered" | "done";

function getDeliveryStatus(status: string): DeliveryStatus {
  if (
    status === "pending_verification" ||
    status === "awaiting_confirmation" ||
    status === "preparing"
  ) {
    return "preparing";
  }
  if (status === "ready") return "out_for_delivery";
  if (status === "completed" || status === "archived") return "delivered";
  return "preparing";
}

const STAGES = [
  {
    key: "preparing",
    icon: ChefHat,
    labelAr: "جاري التحضير",
    labelEn: "Preparing",
    activeColor: "#f97316",
    glowColor: "rgba(249,115,22,0.3)",
    desc: "المطبخ يحضّر طلبك الآن",
  },
  {
    key: "out_for_delivery",
    icon: Truck,
    labelAr: "في الطريق إليك",
    labelEn: "Out for Delivery",
    activeColor: "#3b82f6",
    glowColor: "rgba(59,130,246,0.3)",
    desc: "المندوب في الطريق إليك",
  },
  {
    key: "delivered",
    icon: MapPin,
    labelAr: "تم التوصيل",
    labelEn: "Delivered",
    activeColor: "#22c55e",
    glowColor: "rgba(34,197,94,0.3)",
    desc: "استمتع بطلبك! 🎉",
  },
] as const;

function TruckProgressBar({ status }: { status: DeliveryStatus }) {
  const stageOrder: DeliveryStatus[] = ["preparing", "out_for_delivery", "delivered"];
  const activeIdx = stageOrder.indexOf(status === "done" ? "delivered" : status);
  const pct = activeIdx === 0 ? 8 : activeIdx === 1 ? 50 : 92;

  return (
    <div className="w-full max-w-sm px-2 relative" style={{ marginBottom: 8 }}>
      <div
        className="relative h-2 rounded-full overflow-visible"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-2 rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #f97316, #3b82f6, #22c55e)",
            boxShadow: "0 0 10px rgba(59,130,246,0.5)",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 flex items-center justify-center"
          style={{
            left: `calc(${pct}% - 16px)`,
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "#1a1a2e",
              border: "2px solid #3b82f6",
              boxShadow: "0 0 12px rgba(59,130,246,0.6)",
              animation: status === "out_for_delivery" ? "truckBounce 0.8s ease-in-out infinite alternate" : undefined,
            }}
          >
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-2 px-1">
        <span className="text-[10px] text-white/30">المطعم</span>
        <span className="text-[10px] text-white/30">منزلك</span>
      </div>

      <style>{`
        @keyframes truckBounce {
          0% { transform: translateY(-55%) scale(1); }
          100% { transform: translateY(-45%) scale(1.08); }
        }
      `}</style>
    </div>
  );
}

function StageNode({
  stage,
  isActive,
  isDone,
}: {
  stage: (typeof STAGES)[number];
  isActive: boolean;
  isDone: boolean;
}) {
  const Icon = isDone ? CheckCircle2 : stage.icon;

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 72 }}>
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500"
        style={{
          background: isActive
            ? `radial-gradient(circle, ${stage.glowColor} 0%, rgba(0,0,0,0.8) 80%)`
            : isDone
            ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.03)",
          border: isActive
            ? `2px solid ${stage.activeColor}`
            : isDone
            ? "2px solid rgba(255,255,255,0.15)"
            : "2px solid rgba(255,255,255,0.05)",
          boxShadow: isActive ? `0 0 20px ${stage.glowColor}` : "none",
          animation: isActive ? "stagePulse 2s ease-in-out infinite" : "none",
        }}
      >
        <Icon
          className="w-6 h-6"
          style={{
            color: isActive ? stage.activeColor : isDone ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)",
          }}
        />
      </div>
      <p
        className="text-[11px] font-bold text-center leading-tight"
        style={{
          fontFamily: "'Tajawal','Cairo',sans-serif",
          color: isActive ? stage.activeColor : isDone ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)",
        }}
      >
        {stage.labelAr}
      </p>
    </div>
  );
}

export default function DeliveryTrackerPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const params = new URLSearchParams(window.location.search);
  const merchantId = params.get("m") || "";

  const [status, setStatus] = useState<DeliveryStatus>("preparing");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [merchantName, setMerchantName] = useState<string>("");
  const [merchantLogo, setMerchantLogo] = useState<string>("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  useEffect(() => {
    if (!orderId || !merchantId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    const ref = doc(db, "merchants", merchantId, "whatsappOrders", orderId);
    const unsub = onSnapshot(ref, (snap) => {
      setLoading(false);
      if (!snap.exists()) { setNotFound(true); return; }
      const data = snap.data();
      setOrderNumber(data.orderNumber || data.displayOrderId || "");
      setCustomerName(data.customerName || "");
      setStatus(getDeliveryStatus(data.status || "preparing"));
    });
    return () => unsub();
  }, [orderId, merchantId]);

  const bg = "linear-gradient(160deg, #050510 0%, #000000 50%, #050510 100%)";

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 px-6" style={{ background: bg }}>
        <Truck className="w-12 h-12 text-blue-900/50" />
        <p className="text-white/30 text-lg text-center" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>
          لم يتم العثور على الطلب
        </p>
        <p className="text-white/15 text-sm text-center">Order not found</p>
      </div>
    );
  }

  const stageOrder: DeliveryStatus[] = ["preparing", "out_for_delivery", "delivered"];
  const activeIdx = stageOrder.indexOf(status === "done" ? "delivered" : status);
  const activeStage = STAGES[activeIdx];
  const isDelivered = status === "delivered" || status === "done";

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center"
      style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
      data-testid="delivery-tracker-page"
    >
      <div className="w-full text-center pt-8 pb-3 px-5">
        <p className="text-blue-900/60 text-[11px] tracking-[0.4em] uppercase mb-3">
          DELIVERY TRACKER
        </p>
        {merchantLogo ? (
          <img
            src={merchantLogo}
            alt=""
            className="w-14 h-14 rounded-full mx-auto mb-2 object-cover border border-blue-900/30"
            data-testid="img-store-logo"
          />
        ) : null}
        {merchantName && (
          <h1 className="text-white/80 text-lg font-bold" data-testid="text-store-name">
            {merchantName}
          </h1>
        )}
        {customerName && (
          <p className="text-white/30 text-sm mt-0.5">{customerName}</p>
        )}
        {orderNumber && (
          <div
            className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 rounded-full"
            style={{
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.2)",
            }}
          >
            <span className="text-blue-400/60 text-xs">طلب رقم</span>
            <span className="text-blue-300 font-bold text-base" data-testid="text-order-number">
              #{orderNumber}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 w-full pb-8">
        <div
          className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-5"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
          }}
        >
          <TruckProgressBar status={status} />

          <div className="flex items-center justify-between w-full px-1 gap-2">
            {STAGES.map((stage, i) => (
              <StageNode
                key={stage.key}
                stage={stage}
                isActive={i === activeIdx}
                isDone={i < activeIdx}
              />
            ))}
          </div>

          {activeStage && (
            <div
              className="w-full rounded-2xl py-3 px-4 text-center"
              style={{
                background: `rgba(${
                  activeIdx === 0 ? "249,115,22" : activeIdx === 1 ? "59,130,246" : "34,197,94"
                },0.08)`,
                border: `1px solid rgba(${
                  activeIdx === 0 ? "249,115,22" : activeIdx === 1 ? "59,130,246" : "34,197,94"
                },0.2)`,
              }}
              data-testid="status-banner"
            >
              <p
                className="font-bold text-base"
                style={{ color: activeStage.activeColor }}
                data-testid="text-status-ar"
              >
                {activeStage.labelAr}
              </p>
              <p className="text-white/30 text-xs mt-0.5" data-testid="text-status-en">
                {activeStage.desc}
              </p>
            </div>
          )}
        </div>

        {isDelivered && googleMapsUrl && (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <div
              className="w-full rounded-2xl p-4 text-center"
              style={{
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.2)",
                boxShadow: "0 0 30px rgba(34,197,94,0.08)",
              }}
              data-testid="delivered-banner"
            >
              <p className="text-green-400 font-bold text-lg">تم التوصيل بنجاح! 🎉</p>
              <p className="text-green-400/50 text-sm mt-0.5">Order delivered successfully</p>
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border transition-all active:scale-95"
              style={{
                background: "rgba(234,179,8,0.06)",
                borderColor: "rgba(234,179,8,0.25)",
                color: "#eab308",
              }}
              data-testid="btn-rate"
            >
              <Star className="w-4 h-4" />
              <span className="text-sm font-medium">قيّم تجربتك على جوجل</span>
            </a>
          </div>
        )}
      </div>

      <style>{`
        @keyframes stagePulse {
          0%, 100% { box-shadow: 0 0 12px ${activeStage?.glowColor || "transparent"}; }
          50% { box-shadow: 0 0 24px ${activeStage?.glowColor || "transparent"}; }
        }
      `}</style>
    </div>
  );
}
