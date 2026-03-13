import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ChefHat, Truck, CheckCircle2 } from "lucide-react";

type DeliveryStatus = "preparing" | "out_for_delivery" | "delivered" | "done";

function getDeliveryStatus(status: string): DeliveryStatus {
  if (status === "pending_verification" || status === "awaiting_confirmation" || status === "preparing") {
    return "preparing";
  }
  if (status === "ready") return "out_for_delivery";
  if (status === "completed" || status === "archived") return "delivered";
  return "preparing";
}

const STEPS = [
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
    key: "out_for_delivery",
    icon: Truck,
    labelAr: "في الطريق إليك",
    labelEn: "Out for Delivery",
    color: "text-orange-400",
    bg: "bg-orange-500/20",
    border: "border-orange-500/40",
    glow: "0 0 20px rgba(249,115,22,0.15)",
  },
  {
    key: "delivered",
    icon: CheckCircle2,
    labelAr: "تم التوصيل",
    labelEn: "Delivered",
    color: "text-green-400",
    bg: "bg-green-500/20",
    border: "border-green-500/40",
    glow: "0 0 20px rgba(34,197,94,0.2)",
  },
] as const;

export default function DeliveryTrackerPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const params = new URLSearchParams(window.location.search);
  const merchantId = params.get("m") || "";

  const [status, setStatus] = useState<DeliveryStatus>("preparing");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
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

    const ref = doc(db, "merchants", merchantId, "whatsappOrders", orderId);
    const unsub = onSnapshot(ref, (snap) => {
      setLoading(false);
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      const data = snap.data();
      setOrderNumber(data.orderNumber || data.displayOrderId || "");
      setCustomerName(data.customerName || "");
      setStatus(getDeliveryStatus(data.status || "preparing"));
    });
    return () => unsub();
  }, [orderId, merchantId]);

  const bg = "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #030d0a 100%)";

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
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

  const stepOrder: DeliveryStatus[] = ["preparing", "out_for_delivery", "delivered"];
  const activeIndex = stepOrder.indexOf(status);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: bg }} data-testid="delivery-tracker-page">
      <div className="text-center pt-10 pb-6 px-5">
        <p className="text-white/40 text-[11px] font-medium tracking-[0.35em] uppercase mb-3">DELIVERY TRACKER</p>
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
        {customerName && (
          <p className="text-white/40 text-sm mt-1" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
            {customerName}
          </p>
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
          const isDone = i < activeIndex;
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
                {isDone ? (
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
              {isActive && status !== "delivered" && (
                <div className="flex-shrink-0">
                  <Loader2 className={`w-5 h-5 animate-spin ${step.color}`} />
                </div>
              )}
            </div>
          );
        })}

        {status === "delivered" && (
          <div
            className="w-full max-w-sm mt-2 p-4 rounded-2xl bg-green-500/10 border-2 border-green-500/30 text-center"
            style={{ boxShadow: "0 0 30px rgba(34,197,94,0.1)" }}
            data-testid="delivered-banner"
          >
            <p
              className="text-green-400 font-bold text-lg"
              style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
            >
              تم التوصيل بنجاح! 🎉
            </p>
            <p className="text-green-400/70 text-sm mt-0.5">Order delivered successfully</p>
          </div>
        )}
      </div>
    </div>
  );
}
