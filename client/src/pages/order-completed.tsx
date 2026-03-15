import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Star, Download } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch merchant info
        const merchantSnap = await getDoc(doc(db, "merchants", merchantId));
        if (merchantSnap.exists()) {
          setMerchantName(merchantSnap.data().storeName || "");
        }

        // Fetch order data
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

  async function handleSubmitRating() {
    if (rating === 0 || submittingRating) return;
    setSubmittingRating(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          stars: rating,
          rating,
          comment: feedback.trim(),
          orderId: orderId || "",
        }),
      });
    } catch {}
    setSubmittingRating(false);
    setSubmitted(true);
  }

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

    // Fetch QR code
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

    /* HEADER — centered stack */
    .inv-header{text-align:center;padding-bottom:14px;border-bottom:2px solid #111;margin-bottom:16px}
    .inv-logo{width:64px;height:64px;border-radius:50%;background:#cc2200;color:#fff;font-size:28px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .inv-store{font-size:18px;font-weight:700;color:#111;margin-bottom:4px}
    .inv-title{font-size:15px;font-weight:900;color:#cc2200;letter-spacing:0.02em;margin-bottom:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .inv-meta-row{display:flex;justify-content:center;align-items:center;font-size:11px;color:#555;flex-wrap:wrap;gap:2px 0}
    .inv-sep{padding:0 8px;color:#bbb}

    /* DIVIDER */
    .inv-divider{border:none;border-top:1px solid #ddd;margin:12px 0}

    /* TABLE */
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

    /* TOTALS */
    .inv-totals{border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;margin-bottom:18px;background:#fafafa}
    .inv-tot-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#666}
    .inv-tot-grand{display:flex;justify-content:space-between;align-items:center;padding:10px 0 2px;margin-top:8px;border-top:2px solid #111;font-size:19px;font-weight:900;color:#111}

    /* FOOTER BADGE ROW */
    .inv-badge-row{display:flex;align-items:center;gap:10px;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:6px;padding:8px 14px;margin-bottom:18px;font-size:12px}
    .inv-badge{background:#222;color:#fff;border-radius:4px;padding:2px 10px;font-size:11px;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .inv-badge-text{color:#555}

    /* QR */
    .inv-qr-wrap{text-align:center;margin-bottom:14px}
    .inv-qr{width:148px;height:148px;display:block;margin:0 auto 8px}
    .inv-qr-hint{font-size:11px;color:#999}

    /* DISCLAIMER */
    .inv-disclaimer{text-align:center;font-size:13px;font-weight:700;color:#cc2200;padding-top:12px;border-top:1px dashed #ddd;margin-top:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact}

    @media print{body{max-width:100%;padding:10px 8px}}
    @media(max-width:480px){body{padding:14px 10px}}
  </style>
</head>
<body>

  <!-- HEADER -->
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

  <!-- ITEMS TABLE -->
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

  <!-- TOTALS -->
  <div class="inv-totals">
    <div class="inv-tot-row"><span>مجموع الأصناف</span><span>${subtotal.toFixed(2)} SAR</span></div>
    ${deliveryFee > 0 ? `<div class="inv-tot-row"><span>رسوم التوصيل</span><span>${deliveryFee.toFixed(2)} SAR</span></div>` : ""}
    <div class="inv-tot-row"><span>ضريبة القيمة المضافة (VAT 0%)</span><span>SAR 0.00</span></div>
    <div class="inv-tot-grand"><span>الإجمالي</span><span>${total.toFixed(2)} SAR</span></div>
  </div>` : `<p style="color:#aaa;text-align:center;padding:24px 0">لا توجد تفاصيل للطلب</p>`}

  <!-- FOOTER BADGE -->
  <div class="inv-badge-row">
    <span class="inv-badge">${diningTypeAr}</span>
    ${order.customerName ? `<span class="inv-badge-text">العميل: ${order.customerName}</span>` : ""}
  </div>

  <!-- QR CODE -->
  <div class="inv-qr-wrap">
    ${qrDataUrl ? `<img src="${qrDataUrl}" class="inv-qr" alt="QR Code">` : ""}
    <p class="inv-qr-hint">امسح الرمز للتحقق من الطلب</p>
  </div>

  <!-- LEGAL DISCLAIMER -->
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

      {/* Star Rating Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 mb-5"
        style={{
          background: "rgba(15,2,2,0.95)",
          border: "1.5px solid #2a0808",
        }}
      >
        {!submitted ? (
          <>
            <h2
              className="text-center font-bold text-base mb-1"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              كيف كانت تجربتك؟
            </h2>
            <p className="text-center text-xs mb-4" style={{ color: "#664444" }}>
              قيّم تجربتك معنا
            </p>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-4" dir="ltr">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  data-testid={`btn-star-${star}`}
                  className="transition-transform active:scale-90 hover:scale-110"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                >
                  <Star
                    className="w-9 h-9"
                    fill={(hoverRating || rating) >= star ? "#ff4422" : "none"}
                    stroke={(hoverRating || rating) >= star ? "#ff4422" : "#5a2020"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>

            {/* Feedback text */}
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="شاركنا رأيك (اختياري)..."
              rows={3}
              data-testid="input-feedback"
              className="w-full rounded-xl text-sm resize-none outline-none px-3 py-2.5 mb-4"
              style={{
                background: "#0d0000",
                border: "1px solid #2a0808",
                color: "rgba(255,255,255,0.75)",
                fontFamily: "'Tajawal','Cairo',sans-serif",
              }}
            />

            <button
              onClick={handleSubmitRating}
              disabled={rating === 0 || submittingRating}
              data-testid="btn-submit-rating"
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{
                background: rating > 0 ? "#cc2200" : "#2a0808",
                color: rating > 0 ? "#fff" : "#5a2020",
                border: "none",
                cursor: rating > 0 && !submittingRating ? "pointer" : "not-allowed",
                opacity: submittingRating ? 0.7 : 1,
              }}
            >
              {submittingRating && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {submittingRating ? "جاري الإرسال..." : "إرسال التقييم"}
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🌟</div>
            <p className="font-bold" style={{ color: "#ff6644" }}>
              شكراً على تقييمك!
            </p>
            <div className="flex justify-center gap-1 mt-2" dir="ltr">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className="w-5 h-5"
                  fill={rating >= s ? "#ff4422" : "none"}
                  stroke={rating >= s ? "#ff4422" : "#5a2020"}
                  strokeWidth={1.5}
                />
              ))}
            </div>
          </div>
        )}
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
    </div>
  );
}
