import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Download } from "lucide-react";
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
  customerPhone?: string;
  items?: OrderItem[];
  total?: number;
  deliveryFee?: number;
  paymentMethod?: string;
  diningType?: string;
  createdAt?: string;
  loyalty_opted_in?: boolean;
  reward_applied?: boolean;
  status?: string;
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

  const [rewardEarned, setRewardEarned] = useState(0);
  const [rewardTotal, setRewardTotal] = useState(0);
  const [rewardVisible, setRewardVisible] = useState(false);

  const onlinePctRef = useRef(0);
  const rewardApplyingRef = useRef(false);
  const confettiFired = useRef(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const merchantSnap = await getDoc(doc(db, "merchants", merchantId));
        if (merchantSnap.exists()) {
          const d = merchantSnap.data();
          setMerchantName(d.storeName || "");
          setGoogleMapsReviewUrl(d.googleMapsReviewUrl || "");
          const lc = d.loyalty_config;
          if (lc?.is_enabled) onlinePctRef.current = lc.online_percent || 0;
        }

        if (orderId && orderType !== "manual") {
          const orderSnap = await getDoc(doc(db, "merchants", merchantId, "whatsappOrders", orderId));
          if (orderSnap.exists()) {
            const data = orderSnap.data() as OrderData;
            setOrder(data);
          }
        }
      } catch {}
      setLoading(false);
    }
    fetchData();
  }, [merchantId, orderId, orderType]);

  // Listen for order status → "archived" and trigger reward if not yet applied
  useEffect(() => {
    if (!orderId || orderType === "manual") return;
    const unsub = onSnapshot(
      doc(db, "merchants", merchantId, "whatsappOrders", orderId),
      async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as OrderData;
        setOrder(prev => ({ ...prev, ...data }));

        const isArchived = data.status === "archived";
        const alreadyApplied = data.reward_applied === true;
        const optedIn = data.loyalty_opted_in === true;
        const phone = data.customerPhone?.replace(/\D/g, "");
        const orderTotal = data.total || 0;
        const pct = onlinePctRef.current;

        if (isArchived && !alreadyApplied && optedIn && phone && pct > 0 && !rewardApplyingRef.current) {
          rewardApplyingRef.current = true;
          const earned = Math.round(orderTotal * pct / 100 * 100) / 100;
          if (earned > 0) {
            try {
              // Credit wallet
              const walletRes = await fetch(`/api/wallet/${merchantId}/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  phone,
                  amount: earned,
                  balance_type: "online",
                  type: "earn_online",
                  note: `مكافأة طلب #${data.displayOrderId || data.orderNumber}`,
                }),
              });
              const walletData = await walletRes.json();
              // Mark reward as applied on the order doc
              await updateDoc(doc(db, "merchants", merchantId, "whatsappOrders", orderId), {
                reward_applied: true,
              });
              setRewardEarned(earned);
              setRewardTotal(walletData.newBalance || 0);
              setRewardVisible(true);
            } catch {
              rewardApplyingRef.current = false;
            }
          }
        }

        // If already applied, just mark reward visible (e.g. page reload)
        if (isArchived && alreadyApplied && optedIn) {
          setRewardVisible(true);
        }
      }
    );
    return () => unsub();
  }, [merchantId, orderId, orderType]);

  useEffect(() => {
    if (!loading && merchantId && !ratingDone) {
      const t = setTimeout(() => setShowRating(true), 1500);
      return () => clearTimeout(t);
    }
  }, [loading, merchantId, ratingDone]);

  // Confetti when reward is earned
  useEffect(() => {
    if (!rewardVisible || confettiFired.current) return;
    confettiFired.current = true;
    const style = document.createElement("style");
    style.textContent = `
      @keyframes confetti-fall {
        0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
      .confetti-particle {
        position: fixed; top: -20px; width: 10px; height: 10px;
        border-radius: 2px; z-index: 9999; pointer-events: none;
        animation: confetti-fall linear forwards;
      }
    `;
    document.head.appendChild(style);
    const colors = ["#fbbf24","#f97316","#ef4444","#22c55e","#3b82f6","#a855f7","#ec4899"];
    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement("div");
      el.className = "confetti-particle";
      el.style.left = Math.random() * 100 + "vw";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = (2.5 + Math.random() * 2) + "s";
      el.style.animationDelay = (Math.random() * 1.5) + "s";
      el.style.width = (6 + Math.random() * 8) + "px";
      el.style.height = (6 + Math.random() * 8) + "px";
      document.body.appendChild(el);
      particles.push(el);
    }
    setTimeout(() => {
      particles.forEach(p => p.remove());
      style.remove();
    }, 6000);
  }, [rewardVisible]);

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

      {/* Loyalty Reward Notification — shown when reward is earned on this page */}
      {rewardVisible && (
        <div
          className="w-full max-w-sm mt-4 rounded-2xl p-5 text-center"
          style={{ background: "rgba(20,12,0,0.9)", border: "1.5px solid rgba(251,191,36,0.3)" }}
          data-testid="loyalty-reward-banner"
          dir="rtl"
        >
          <div className="text-3xl mb-2">🎉</div>
          {rewardEarned > 0 ? (
            <>
              <p className="text-base font-black text-amber-400" data-testid="text-reward-earned">
                مبروك! كسبت {rewardEarned.toFixed(2)} ريال
              </p>
              <p className="text-sm mt-1 text-white/70" data-testid="text-reward-total">
                مجموع رصيدك الحالي هو{" "}
                <span className="text-amber-400 font-bold">{rewardTotal.toFixed(2)} ريال</span>
              </p>
              <p className="text-xs mt-2 text-white/30">يمكن استخدام الرصيد في طلبك القادم</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-white">تمت إضافة مكافأة الولاء!</p>
              <p className="text-xs mt-1" style={{ color: "rgba(251,191,36,0.7)" }}>
                تحقق من رصيد محفظتك في طلبك القادم
              </p>
            </>
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
