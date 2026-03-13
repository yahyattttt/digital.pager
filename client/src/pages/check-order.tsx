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
    window.location.href = `/digital-pager/${pager.docId}?m=${merchantId}&type=manual`;
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
    </div>
  );
}
