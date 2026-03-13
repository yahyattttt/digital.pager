import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Clock, ChefHat, CheckCircle2 } from "lucide-react";

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

const STEPS = [
  {
    key: "processing",
    icon: Clock,
    labelAr: "جاري المعالجة",
    labelEn: "Processing",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/40",
    glow: "0 0 20px rgba(234,179,8,0.15)",
  },
  {
    key: "preparing",
    icon: ChefHat,
    labelAr: "جاري التحضير",
    labelEn: "Preparing",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/40",
    glow: "0 0 20px rgba(59,130,246,0.15)",
  },
  {
    key: "ready",
    icon: CheckCircle2,
    labelAr: "جاهز للاستلام",
    labelEn: "Ready",
    color: "text-green-400",
    bg: "bg-green-500/20",
    border: "border-green-500/40",
    glow: "0 0 20px rgba(34,197,94,0.2)",
  },
] as const;

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
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = snap.data();
        setOrderNumber(data.displayOrderId || data.orderNumber || "");
        setStatus(getStatusFromPager(data.status || "waiting"));
      });
      return () => unsub();
    } else {
      const ref = doc(db, "merchants", merchantId, "whatsappOrders", orderId);
      const unsub = onSnapshot(ref, (snap) => {
        setLoading(false);
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = snap.data();
        setOrderNumber(data.orderNumber || data.displayOrderId || "");
        setStatus(getStatusFromWhatsapp(data.status || "pending_verification"));
      });
      return () => unsub();
    }
  }, [orderId, merchantId, isManual]);

  const bg = "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)";

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 px-6" style={{ background: bg }}>
        <p className="text-white/40 text-lg text-center" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
          لم يتم العثور على الطلب
        </p>
        <p className="text-white/20 text-sm text-center">Order not found</p>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === (status === "done" ? "ready" : status));
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: bg }} data-testid="digital-pager-page">
      <div className="text-center pt-10 pb-6 px-5">
        <p className="text-white/40 text-[11px] font-medium tracking-[0.35em] uppercase mb-3">DIGITAL PAGER</p>
        {merchantLogo && (
          <img
            src={merchantLogo}
            alt=""
            className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-white/10"
            data-testid="img-store-logo"
          />
        )}
        {merchantName && (
          <h1
            className="text-white text-xl font-bold mb-1"
            style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
            data-testid="text-store-name"
          >
            {merchantName}
          </h1>
        )}
        {orderNumber && (
          <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-white/50 text-xs" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              طلب رقم
            </span>
            <span className="text-white font-bold text-lg" data-testid="text-order-number">
              #{orderNumber}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 pb-10">
        {STEPS.map((step, i) => {
          const isActive = i === activeIndex;
          const isDone = i < activeIndex || status === "done";
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`w-full max-w-sm flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-500 ${
                isActive
                  ? `${step.bg} ${step.border}`
                  : isDone
                  ? "bg-white/5 border-white/10 opacity-60"
                  : "bg-zinc-900/20 border-zinc-800/20 opacity-30"
              }`}
              style={isActive ? { boxShadow: step.glow } : undefined}
              data-testid={`step-${step.key}`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isActive ? step.bg : isDone ? "bg-white/10" : "bg-zinc-900/50"
                }`}
              >
                {isDone && !isActive ? (
                  <CheckCircle2 className="w-6 h-6 text-white/40" />
                ) : (
                  <Icon className={`w-6 h-6 ${isActive ? step.color : "text-white/20"}`} />
                )}
              </div>
              <div className="flex-1" dir="rtl">
                <p
                  className={`font-bold text-base ${isActive ? step.color : isDone ? "text-white/40" : "text-white/20"}`}
                  style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
                >
                  {step.labelAr}
                </p>
                <p className={`text-xs mt-0.5 ${isActive ? "text-white/60" : "text-white/20"}`}>{step.labelEn}</p>
              </div>
              {isActive && (
                <div className="flex-shrink-0">
                  {status !== "done" && <Loader2 className={`w-5 h-5 animate-spin ${step.color}`} />}
                </div>
              )}
            </div>
          );
        })}

        {status === "ready" && (
          <div
            className="w-full max-w-sm mt-2 p-4 rounded-2xl bg-green-500/10 border-2 border-green-500/30 text-center"
            style={{ boxShadow: "0 0 30px rgba(34,197,94,0.1)" }}
            data-testid="ready-banner"
          >
            <p
              className="text-green-400 font-bold text-lg"
              style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
            >
              طلبك جاهز! 🎉
            </p>
            <p className="text-green-400/70 text-sm mt-0.5">Your order is ready for pickup</p>
          </div>
        )}

        {status === "done" && (
          <div className="w-full max-w-sm mt-2 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <p
              className="text-white/60 font-medium"
              style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
            >
              تم الانتهاء من طلبك
            </p>
            <p className="text-white/30 text-sm mt-0.5">Order completed</p>
          </div>
        )}
      </div>
    </div>
  );
}
