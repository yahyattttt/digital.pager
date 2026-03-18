import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2, Store } from "lucide-react";
import PublicMenuPage from "./public-menu";

export default function OnlineOrderPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setError("رابط غير صحيح"); setLoading(false); return; }

    fetch(`/api/merchant-by-slug/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Store not found");
        }
        return res.json();
      })
      .then((data) => {
        setMerchantId(data.merchantId);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "حدث خطأ");
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <Store className="w-7 h-7 text-red-500" />
        </div>
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>جارٍ تحميل المتجر...</span>
        </div>
      </div>
    );
  }

  if (error || !merchantId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Store className="w-8 h-8 text-red-500/60" />
        </div>
        <div>
          <p className="text-white font-semibold text-lg mb-1">المتجر غير موجود</p>
          <p className="text-white/40 text-sm">الرابط الذي أدخلته لا يطابق أي متجر مسجّل</p>
          <p className="text-white/20 text-xs mt-2 font-mono">/online-order/{slug}</p>
        </div>
      </div>
    );
  }

  return <PublicMenuPage merchantIdOverride={merchantId} />;
}
