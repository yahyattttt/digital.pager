import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Download, Gift, Loader2 } from "lucide-react";
import { StarRatingPopup } from "@/components/star-rating-popup";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  productId?: string;
}

interface OrderData {
  orderNumber?: string;
  displayOrderId?: string;
  customerName?: string;
  items?: OrderItem[];
  total?: number;
  deliveryFee?: number;
  paymentMethod?: string;
  diningType?: string;
  createdAt?: string;
}

export default function OrderCompletedPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId") || "";
  const orderType = params.get("type") || "whatsapp";

  const [order, setOrder] = useState<OrderData | null>(null);
  const [merchantName, setMerchantName] = useState<string>("");
  const [googleMapsReviewUrl, setGoogleMapsReviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [loyaltyConfig, setLoyaltyConfig] = useState<{ is_enabled?: boolean; online_percent?: number } | null>(null);
  const [loyaltyPhone, setLoyaltyPhone] = useState<string>(() => localStorage.getItem("dp_customer_phone") || "");
  const [loyaltyConsent, setLoyaltyConsent] = useState(false);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltySubmitted, setLoyaltySubmitted] = useState(false);
  const [loyaltyReward, setLoyaltyReward] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const merchantSnap = await getDoc(doc(db, "merchants", merchantId));
        if (merchantSnap.exists()) {
          const d = merchantSnap.data();
          setMerchantName(d.storeName || "");
          setGoogleMapsReviewUrl(d.googleMapsReviewUrl || "");
          if (d.loyalty_config) {
            setLoyaltyConfig(d.loyalty_config);
          }
        }

        if (orderId) {
          const collection = orderType === "manual" ? "pagers" : "whatsappOrders";
          const orderSnap = await getDoc(doc(db, "merchants", merchantId, collection, orderId));
          if (orderSnap.exists()) {
            setOrder(orderSnap.data() as OrderData);
          }
        }
      } catch {}
      setLoading(false);
    }
    fetchData();
  }, [merchantId, orderId, orderType]);

  useEffect(() => {
    if (!loading && merchantId && !ratingDone) {
      const t = setTimeout(() => setShowRating(true), 1500);
      return () => clearTimeout(t);
    }
  }, [loading, merchantId, ratingDone]);

  async function downloadInvoice() {
    if (!order) return;
    const num = order.displayOrderId || order.orderNumber || orderId.slice(-6);
    const dateObj = order.createdAt ? new Date(order.createdAt) : new Date();
    const time = dateObj.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    const date = dateObj.toLocaleDateString("ar-SA");
    const items = order.items || [];
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = order.deliveryFee || 0;
    const total = order.total || subtotal + deliveryFee;
    const logoLetter = (merchantName || "D").charAt(0).toUpperCase();

    const diningTypeAr =
      order.diningType === "delivery" ? "توصيل" :
      order.diningType === "takeaway" ? "سفري" :
      order.diningType === "dine_in"  ? "محلي" : "محلي";

    let qrDataUrl = "";
    try {
      const qrContent = `${window.location.origin}/receipt/${orderId}?m=${merchantId}`;
      const qrRes = await fetch("/api/receipt-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: qrContent }),
      });
      if (qrRes.ok) { const d = await qrRes.json(); qrDataUrl = d.dataUrl || ""; }
    } catch {}

    const itemRows = items.map((item) => `
      <tr>
        <td class="col-name">${item.name}</td>
        <td class="col-num">${item.quantity}</td>
        <td class="col-num">${item.price.toFixed(2)}</td>
        <td class="col-total">${(item.price * item.quantity).toFixed(2)} SAR</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>فاتورة ضريبية — #${num}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#fff;color:#111;font-family:'Tajawal',Arial,sans-serif;direction:rtl;max-width:680px;margin:0 auto;padding:28px 20px;font-size:13px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .inv-header{text-align:center;padding-bottom:14px;border-bottom:2px solid #111;margin-bottom:16px}
    .inv-logo{width:64px;height:64px;border-radius:50%;background:#cc2200;color:#fff;font-size:28px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .inv-store{font-size:18px;font-weight:700;color:#111;margin-bottom:4px}
    .inv-title{font-size:15px;font-weight:900;color:#cc2200;letter-spacing:0.02em;margin-bottom:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .inv-meta-row{display:flex;justify-content:center;align-items:center;font-size:11px;color:#555;flex-wrap:wrap;gap:2px 0}
    .inv-sep{padding:0 8px;color:#bbb}
    .inv-divider{border:none;border-top:1px solid #ddd;margin:12px 0}
    .inv-table{width:100%;border-collapse:collapse;margin-bottom:14px}
    .inv-table thead tr{background:#f5f5f5;border-top:1px solid #ddd;border-bottom:1px solid #ddd}
    .inv-table thead th{padding:8px 10px;font-size:11px;font-weight:700;color:#444;letter-spacing:0.04em}
    .col-name{text-align:right}
    .col-num{text-align:center}
    .col-total{text-align:left}
    .inv-table tbody td{padding:9px 10px;font-size:13px;border-bottom:1px solid #f0f0f0}
    .inv-table tbody td.col-name{font-weight:500;color:#111;text-align:right}
    .inv-table tbody td.col-num{color:#555;text-align:center}
    .inv-table tbody td.col-total{font-weight:700;color:#111;text-align:left;white-space:nowrap}
    .inv-table tbody tr:last-child td{border-bottom:none}
    .inv-totals{border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;margin-bottom:18px;background:#fafafa}
    .inv-tot-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#666}
    .inv-tot-grand{display:flex;justify-content:space-between;align-items:center;padding:10px 0 2px;margin-top:8px;border-top:2px solid #111;font-size:19px;font-weight:900;color:#111}
    .inv-badge-row{display:flex;align-items:center;gap:10px;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:6px;padding:8px 14px;margin-bottom:18px;font-size:12px}
    .inv-badge{background:#222;color:#fff;border-radius:4px;padding:2px 10px;font-size:11px;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .inv-badge-text{color:#555}
    .inv-qr-wrap{text-align:center;margin-bottom:14px}
    .inv-qr{width:148px;height:148px;display:block;margin:0 auto 8px}
    .inv-qr-hint{font-size:11px;color:#999}
    .inv-disclaimer{text-align:center;font-size:13px;font-weight:700;color:#cc2200;padding-top:12px;border-top:1px dashed #ddd;margin-top:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @media print{body{max-width:100%;padding:10px 8px}}
    @media(max-width:480px){body{padding:14px 10px}}
  </style>
</head>
<body>
  <div class="inv-header">
    <div class="inv-logo">${logoLetter}</div>
    <div class="inv-store">${merchantName || "Digital Pager"}</div>
    <div class="inv-title">فاتورة ضريبية / TAX INVOICE</div>
    <div class="inv-meta-row">
      <span>${time}</span>
      <span class="inv-sep">|</span>
      <span>${date}</span>
      <span class="inv-sep">|</span>
      <span>#${num}</span>
    </div>
  </div>
  ${items.length > 0 ? `
  <table class="inv-table">
    <thead>
      <tr>
        <th class="col-name">الصنف</th>
        <th class="col-num">الكمية</th>
        <th class="col-num">السعر</th>
        <th class="col-total">المجموع</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="inv-totals">
    <div class="inv-tot-row"><span>مجموع الأصناف</span><span>${subtotal.toFixed(2)} SAR</span></div>
    ${deliveryFee > 0 ? `<div class="inv-tot-row"><span>رسوم التوصيل</span><span>${deliveryFee.toFixed(2)} SAR</span></div>` : ""}
    <div class="inv-tot-row"><span>ضريبة القيمة المضافة (VAT 0%)</span><span>SAR 0.00</span></div>
    <div class="inv-tot-grand"><span>الإجمالي</span><span>${total.toFixed(2)} SAR</span></div>
  </div>` : `<p style="color:#aaa;text-align:center;padding:24px 0">لا توجد تفاصيل للطلب</p>`}
  <div class="inv-badge-row">
    <span class="inv-badge">${diningTypeAr}</span>
    ${order.customerName ? `<span class="inv-badge-text">العميل: ${order.customerName}</span>` : ""}
  </div>
  <div class="inv-qr-wrap">
    ${qrDataUrl ? `<img src="${qrDataUrl}" class="inv-qr" alt="QR Code">` : ""}
    <p class="inv-qr-hint">امسح الرمز للتحقق من الطلب</p>
  </div>
  <div class="inv-disclaimer">المنصة غير خاضعة لضريبة القيمة المضافة</div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;";
    document.body.appendChild(iframe);
    iframe.contentDocument!.open();
    iframe.contentDocument!.write(html);
    iframe.contentDocument!.close();
    setTimeout(() => {
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 2500);
    }, 700);
  }

  async function handleEarnReward() {
    if (!loyaltyPhone || !loyaltyConsent || !loyaltyConfig?.is_enabled) return;
    setLoyaltyLoading(true);
    try {
      const total = order?.total || 0;
      const pct = loyaltyConfig.online_percent || 0;
      const rewardAmt = Math.round(total * pct / 100 * 100) / 100;
      if (rewardAmt <= 0) {
        setLoyaltySubmitted(true);
        setLoyaltyLoading(false);
        return;
      }
      const res = await fetch(`/api/wallet/${merchantId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loyaltyPhone.replace(/\D/g, ""), amount: rewardAmt, type: "earn_online", note: `مكافأة طلب #${order?.displayOrderId || orderId.slice(-6)}` }),
      });
      if (!res.ok) throw new Error("Failed");
      setLoyaltyReward(rewardAmt);
      setLoyaltySubmitted(true);
    } catch {
      setLoyaltyLoading(false);
    }
    setLoyaltyLoading(false);
  }

  const bg = "linear-gradient(180deg, #050000 0%, #000000 50%, #050000 100%)";

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-red-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div
      className="min-h-[100dvh] flex flex-col items-center px-5 py-10"
      style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
      data-testid="order-completed-page"
      dir="rtl"
    >
      {/* Greeting */}
      <div className="text-center mb-8">
        {merchantName && (
          <p className="text-sm mb-2" style={{ color: "#5a2020" }}>{merchantName}</p>
        )}
        <div
          className="text-5xl mb-4"
          style={{ filter: "drop-shadow(0 0 12px rgba(255,80,0,0.4))" }}
        >
          ✦
        </div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{
            color: "#ff4422",
            textShadow: "0 0 20px rgba(255,68,34,0.4)",
          }}
          data-testid="text-completed-greeting"
        >
          شكراً لتعاملك معنا
        </h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          نتطلع إلى خدمتك مجدداً
        </p>
      </div>

      {/* Invoice Download — only for online orders, not manual/QR pager orders */}
      {orderType !== "manual" && (
        <div className="w-full max-w-sm">
          <button
            onClick={downloadInvoice}
            data-testid="btn-download-invoice"
            className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl transition-all active:scale-95"
            style={{
              background: "rgba(20,5,5,0.9)",
              border: "1.5px solid #3a1010",
              color: "#cc6644",
            }}
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-semibold">تحميل الفاتورة (PDF)</span>
          </button>
        </div>
      )}

      {/* Loyalty Earn Card */}
      {orderType !== "manual" && loyaltyConfig?.is_enabled && (loyaltyConfig.online_percent || 0) > 0 && (
        <div className="w-full max-w-sm mt-4">
          {!loyaltySubmitted ? (
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{ background: "rgba(20,12,0,0.9)", border: "1.5px solid rgba(251,191,36,0.15)" }}
              data-testid="loyalty-earn-card"
              dir="rtl"
            >
              <div className="flex items-center gap-2.5">
                <Gift className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white">اكسب نقاط ولاء 🎁</p>
                  <p className="text-xs" style={{ color: "rgba(251,191,36,0.6)" }}>
                    احصل على {loyaltyConfig.online_percent}% من قيمة طلبك كرصيد في محفظتك
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>رقم جوالك</label>
                <input
                  type="tel"
                  value={loyaltyPhone}
                  onChange={(e) => setLoyaltyPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                  maxLength={10}
                  className="w-full h-10 px-3 rounded-xl text-white text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(251,191,36,0.15)" }}
                  data-testid="input-loyalty-phone"
                />
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loyaltyConsent}
                  onChange={(e) => setLoyaltyConsent(e.target.checked)}
                  className="mt-0.5 accent-amber-500"
                  data-testid="checkbox-loyalty-consent"
                />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  أوافق على استخدام رقم جوالي لبرنامج الولاء وإضافة المكافآت
                </span>
              </label>
              <button
                onClick={handleEarnReward}
                disabled={loyaltyLoading || !loyaltyPhone || loyaltyPhone.length < 9 || !loyaltyConsent}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: loyaltyLoading || !loyaltyPhone || loyaltyPhone.length < 9 || !loyaltyConsent ? "rgba(251,191,36,0.1)" : "rgba(251,191,36,0.9)", color: "#000", border: "1.5px solid rgba(251,191,36,0.3)" }}
                data-testid="button-earn-reward"
              >
                {loyaltyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                اكسب مكافأتك
              </button>
            </div>
          ) : (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: "rgba(20,12,0,0.9)", border: "1.5px solid rgba(251,191,36,0.25)" }}
              data-testid="loyalty-earn-success"
            >
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm font-bold text-white">تمت إضافة المكافأة!</p>
              {loyaltyReward > 0 && (
                <p className="text-xs mt-1" style={{ color: "rgba(251,191,36,0.7)" }}>
                  تمت إضافة {loyaltyReward.toFixed(2)} ريال لمحفظتك
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    {showRating && !ratingDone && merchantId && (
      <StarRatingPopup
        merchantId={merchantId}
        orderId={orderId}
        orderType={orderType}
        googleMapsUrl={googleMapsReviewUrl}
        onClose={() => { setShowRating(false); setRatingDone(true); }}
      />
    )}
    </>
  );
}
