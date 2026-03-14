import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

type PagerDoc = {
  docId: string;
  orderNumber: string;
  displayOrderId: string;
};

export default function CheckOrderPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const [pagers, setPagers] = useState<PagerDoc[]>([]);
  const [merchantName, setMerchantName] = useState<string>("");
  const [merchantLogo, setMerchantLogo] = useState<string>("");
  const [loadingMerchant, setLoadingMerchant] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPager, setPendingPager] = useState<PagerDoc | null>(null);

  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/merchant-public/${merchantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.storeName) setMerchantName(data.storeName);
        if (data?.logoUrl) setMerchantLogo(data.logoUrl);
      })
      .catch(() => {})
      .finally(() => setLoadingMerchant(false));
  }, [merchantId]);

  useEffect(() => {
    if (!merchantId) return;
    const pagersRef = collection(db, "merchants", merchantId, "pagers");
    const q = query(pagersRef, where("status", "==", "waiting"));
    const unsub = onSnapshot(q, (snap) => {
      const docs: PagerDoc[] = [];
      snap.forEach((d) => {
        const data = d.data();
        docs.push({
          docId: d.id,
          orderNumber: data.orderNumber || "",
          displayOrderId: data.displayOrderId || data.orderNumber || "",
        });
      });
      docs.sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber));
      setPagers(docs);
    });
    return () => unsub();
  }, [merchantId]);

  function handleSelect(pager: PagerDoc) {
    setPendingPager(pager);
    setConfirmOpen(true);
  }

  function handleConfirm() {
    if (!pendingPager) return;
    window.location.href = `/digital-pager/${pendingPager.docId}?m=${merchantId}&type=manual`;
  }

  function handleCancel() {
    setConfirmOpen(false);
    setPendingPager(null);
  }

  const bg = "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)";

  if (loadingMerchant) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: bg }} data-testid="check-order-page">
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
            className="text-white text-2xl font-bold"
            style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
            data-testid="text-store-name"
          >
            {merchantName}
          </h1>
        )}
        <p
          className="text-white/50 text-sm mt-4 font-medium"
          dir="rtl"
          style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
        >
          اختر رقم طلبك
        </p>
        <p className="text-white/20 text-xs mt-1">Select your order number</p>
      </div>

      <div className="flex-1 px-5 pb-10">
        {pagers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="w-8 h-8 text-white/10 animate-spin" />
            <p
              className="text-white/20 text-sm text-center"
              style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
            >
              في انتظار الطلبات...
            </p>
            <p className="text-white/10 text-xs text-center">Waiting for active orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto" data-testid="order-grid">
            {pagers.map((p) => (
              <button
                key={p.docId}
                onClick={() => handleSelect(p)}
                className="aspect-square flex items-center justify-center rounded-2xl bg-zinc-900/60 border-2 border-zinc-800/60 hover:border-red-600/40 hover:bg-red-900/10 active:scale-95 transition-all"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                data-testid={`order-btn-${p.orderNumber}`}
              >
                <span
                  className="text-white font-bold text-2xl"
                  style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
                >
                  {p.displayOrderId}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && pendingPager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-5"
          data-testid="confirm-dialog"
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-5"
            style={{
              background: "linear-gradient(160deg, #13101a 0%, #0c0c0c 100%)",
              border: "1.5px solid rgba(140,60,200,0.25)",
              boxShadow: "0 0 40px rgba(100,0,200,0.08)",
            }}
          >
            <div className="text-center" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              <p className="text-white/35 text-[11px] tracking-[0.25em] uppercase mb-3">CONFIRM ORDER</p>
              <p
                className="text-white text-lg font-bold mb-3"
                data-testid="text-confirm-question"
              >
                هل أنت متأكد من رقم طلبك؟
              </p>
              <p
                className="text-red-400 font-bold mt-2 mb-1"
                style={{ fontSize: 42, textShadow: "0 0 24px rgba(255,60,0,0.45)", letterSpacing: "0.05em" }}
                data-testid="text-confirm-order-id"
              >
                {pendingPager.displayOrderId || `#${pendingPager.orderNumber}`}
              </p>
            </div>

            <div className="flex gap-3" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              <button
                onClick={handleCancel}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.45)",
                }}
                data-testid="button-confirm-cancel"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(160,0,0,0.85)",
                  border: "1.5px solid rgba(200,40,40,0.4)",
                  color: "#fff",
                  boxShadow: "0 0 28px rgba(255,0,0,0.18)",
                }}
                data-testid="button-confirm-yes"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
