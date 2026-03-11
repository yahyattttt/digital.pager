import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { CheckCircle, XCircle, AlertTriangle, PackageCheck, PackageX, Loader2, ShieldAlert } from "lucide-react";

const EXPIRED_STATUSES = ["completed", "archived", "uncollected", "rejected"];

export default function DriverControlPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const merchantId = new URLSearchParams(window.location.search).get("m") || "";

  const [order, setOrder] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<"delivered" | "failed" | null>(null);
  const [resultMsg, setResultMsg] = useState("");

  useEffect(() => {
    if (!orderId || !merchantId) {
      setError("رابط غير صالح");
      setLoading(false);
      return;
    }
    fetch(`/api/track/${orderId}?merchantId=${merchantId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        setOrder(data.order);
        setMerchant(data.merchant);
        setLoading(false);
      })
      .catch(() => {
        setError("تعذر تحميل بيانات الطلب");
        setLoading(false);
      });
  }, [orderId, merchantId]);

  const isExpired = order && EXPIRED_STATUSES.includes(order.status);

  async function handleAction(action: "delivered" | "failed") {
    if (submitting) return;
    setSubmitting(action);
    try {
      const res = await fetch(`/api/driver-control/${merchantId}/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ message: "حدث خطأ" }));
        setResultMsg(d.message || "حدث خطأ");
        setSubmitting(null);
        return;
      }
      if (action === "delivered") {
        setResultMsg("تم تأكيد التسليم بنجاح ✅");
      } else {
        setResultMsg("تم تسجيل عدم الاستلام ❌");
      }
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      setResultMsg("حدث خطأ في الاتصال");
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-black text-white" data-testid="driver-control-loading">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
        <p className="text-white/60 text-lg font-medium" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>جاري تحميل بيانات الطلب...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-black text-white px-6" data-testid="driver-control-error">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-red-400 text-xl font-bold text-center" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{error}</p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-black text-white px-6" data-testid="driver-control-expired">
        <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center mb-6">
          <ShieldAlert className="w-12 h-12 text-zinc-500" />
        </div>
        <p className="text-white text-2xl font-bold text-center mb-3" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
          عذراً، هذا الرابط لم يعد صالحاً
        </p>
        <p className="text-white/40 text-base text-center max-w-xs" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
          لأن الطلب مكتمل أو تم تحديث حالته مسبقاً.
        </p>
        <div className="mt-8 px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800">
          <p className="text-white/30 text-sm font-mono" data-testid="text-expired-order-id">#{order?.displayOrderId || orderId?.slice(0, 8)}</p>
        </div>
      </div>
    );
  }

  if (resultMsg) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-black text-white px-6" data-testid="driver-control-result">
        <div className="w-20 h-20 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
          {submitting === "delivered" ? (
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          ) : (
            <XCircle className="w-10 h-10 text-red-400" />
          )}
        </div>
        <p className="text-white text-xl font-bold text-center" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-result-message">
          {resultMsg}
        </p>
        <p className="text-white/30 text-sm mt-3" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>جاري تحديث الصفحة...</p>
      </div>
    );
  }

  const orderNum = order?.displayOrderId || order?.orderNumber || orderId?.slice(0, 8);

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-between py-8 px-5 bg-black text-white"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 50%, #0d0000 100%)" }}
      data-testid="driver-control-page"
    >
      <div className="w-full text-center flex-shrink-0">
        <p className="text-white/40 text-[12px] font-medium tracking-[0.3em] uppercase mb-1">DIGITAL PAGER</p>
        <p className="text-white/20 text-[10px] tracking-[0.15em] uppercase">DRIVER CONTROL</p>
        {merchant?.storeName && (
          <h2 className="text-white text-[22px] font-bold mt-3" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-driver-store-name">
            {merchant.storeName}
          </h2>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm min-h-0 gap-6">
        <div className="w-full text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
            <p className="text-white/40 text-xs" dir="rtl">رقم الطلب</p>
            <p className="text-white text-xl font-bold font-mono tracking-wider" data-testid="text-driver-order-number">#{orderNum}</p>
          </div>

          {order?.customerName && (
            <p className="text-white/50 text-sm" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-driver-customer">
              العميل: {order.customerName}
            </p>
          )}
          {order?.deliveryAddress && (
            <p className="text-white/30 text-xs mt-1 max-w-xs mx-auto" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-driver-address">
              📍 {order.deliveryAddress}
            </p>
          )}
        </div>

        <div className="w-full px-3 py-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-amber-400 text-xs font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>تنبيه مهم</p>
          </div>
          <p className="text-amber-400/60 text-[11px]" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-driver-warning">
            استخدم هذا الرابط عند باب العميل فقط. لا يمكن التراجع بعد الضغط.
          </p>
        </div>

        <div className="w-full space-y-5">
          <button
            onClick={() => handleAction("delivered")}
            disabled={!!submitting}
            className="w-full flex items-center justify-center gap-4 rounded-2xl border-2 border-emerald-500/40 active:scale-[0.96] transition-all duration-200 disabled:opacity-50"
            style={{
              padding: "28px 24px",
              background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)",
              boxShadow: "0 0 30px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
            data-testid="button-driver-delivered"
          >
            {submitting === "delivered" ? (
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            ) : (
              <PackageCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            )}
            <span className="text-emerald-400 text-[20px] font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              تم تسليم الطلب بنجاح ✅
            </span>
          </button>

          <button
            onClick={() => handleAction("failed")}
            disabled={!!submitting}
            className="w-full flex items-center justify-center gap-4 rounded-2xl border-2 border-red-500/40 active:scale-[0.96] transition-all duration-200 disabled:opacity-50"
            style={{
              padding: "28px 24px",
              background: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)",
              boxShadow: "0 0 30px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
            data-testid="button-driver-failed"
          >
            {submitting === "failed" ? (
              <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
            ) : (
              <PackageX className="w-8 h-8 text-red-400 flex-shrink-0" />
            )}
            <span className="text-red-400 text-[20px] font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              العميل لم يستلم الطلب ❌
            </span>
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 text-center mt-4">
        <p className="text-white/15 text-[10px]">Digital Pager © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
