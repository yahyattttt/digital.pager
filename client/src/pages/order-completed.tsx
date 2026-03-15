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
    const date = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
    const items = order.items || [];
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = order.deliveryFee || 0;
    const total = order.total || subtotal + deliveryFee;
    const logoLetter = (merchantName || "D").charAt(0).toUpperCase();

    const diningTypeAr =
      order.diningType === "delivery" ? "توصيل 🚚" :
      order.diningType === "takeaway" ? "سفري 🛍" :
      order.diningType === "dine_in"  ? "محلي 🪑" : "—";
    const paymentAr =
      !order.paymentMethod || order.paymentMethod === "cod" ? "دفع عند الاستلام" :
      order.paymentMethod === "card"   ? "بطاقة ائتمان" :
      order.paymentMethod === "online" ? "دفع إلكتروني" : order.paymentMethod;

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
        <td class="td-name">${item.name}</td>
        <td class="td-center">${item.quantity}</td>
        <td class="td-center">${item.price.toFixed(2)}</td>
        <td class="td-total">${(item.price * item.quantity).toFixed(2)} ر.س</td>
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
    body{background:#fff;color:#111;font-family:'Tajawal',Arial,sans-serif;direction:rtl;max-width:760px;margin:0 auto;padding:36px 28px;font-size:13px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}

    /* ── Header ── */
    .inv-header{display:flex;align-items:center;gap:16px;padding-bottom:20px;border-bottom:2px solid #e8e8e8;margin-bottom:22px}
    .inv-logo{width:64px;height:64px;border-radius:50%;background:#fff0ee;border:2px solid #ffcccc;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#cc2200;flex-shrink:0}
    .inv-title-block{flex:1;text-align:center}
    .inv-main-title{font-size:28px;font-weight:900;color:#cc2200;letter-spacing:-0.5px;line-height:1.1}
    .inv-subtitle{font-size:11px;color:#aaa;letter-spacing:0.12em;text-transform:uppercase;margin-top:3px}
    .inv-store-name{font-size:15px;font-weight:700;color:#333;margin-top:6px}
    .inv-spacer{width:64px}

    /* ── Meta grid ── */
    .inv-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;margin-bottom:22px;padding:14px 18px;background:#fafafa;border:1px solid #efefef;border-radius:10px}
    .inv-meta-cell{display:flex;flex-direction:column;gap:2px}
    .inv-meta-label{font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:0.08em}
    .inv-meta-value{font-size:13px;font-weight:700;color:#111}

    /* ── Items table ── */
    .inv-table{width:100%;border-collapse:collapse;margin-bottom:20px}
    .inv-table thead tr{background:#f5f5f5}
    .inv-table thead th{padding:9px 12px;font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e8e8e8;white-space:nowrap}
    .inv-table thead th:first-child{text-align:right}
    .inv-table thead th:not(:first-child){text-align:center}
    .inv-table thead th:last-child{text-align:left}
    .td-name{padding:10px 12px;font-size:13px;color:#222;border-bottom:1px solid #f2f2f2}
    .td-center{padding:10px 12px;font-size:13px;color:#666;text-align:center;border-bottom:1px solid #f2f2f2}
    .td-total{padding:10px 12px;font-size:13px;font-weight:700;color:#111;text-align:left;border-bottom:1px solid #f2f2f2;white-space:nowrap}
    .inv-table tbody tr:last-child td{border-bottom:none}
    .inv-table tbody tr:hover{background:#fafafa}

    /* ── Totals ── */
    .inv-totals{background:#fafafa;border:1px solid #efefef;border-radius:10px;padding:14px 18px;margin-bottom:28px}
    .inv-tot-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:#666}
    .inv-tot-row.grand{margin-top:12px;padding-top:12px;border-top:2px solid #e8e8e8;font-size:20px;font-weight:900;color:#cc2200}
    .vat-badge{display:inline-block;background:#f0faf0;color:#2e7d32;border:1px solid #c8e6c9;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;margin-right:4px}

    /* ── QR + Footer ── */
    .inv-footer{text-align:center;padding-top:24px;border-top:2px dashed #e8e8e8;margin-top:4px}
    .inv-qr{width:130px;height:130px;margin:0 auto 8px;display:block}
    .inv-qr-label{font-size:11px;color:#bbb;margin-bottom:14px}
    .inv-disclaimer{display:inline-block;padding:9px 22px;background:#fff8f8;border:1.5px solid #ffcccc;border-radius:8px;font-size:14px;font-weight:700;color:#cc2200;margin-bottom:18px}
    .inv-thankyou{font-size:17px;font-weight:700;color:#111;margin-bottom:5px}
    .inv-generated{font-size:10px;color:#ccc}

    @media print{
      body{max-width:100%;padding:16px}
      .inv-logo{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .inv-disclaimer{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
    @media(max-width:480px){
      body{padding:16px 12px}
      .inv-header{flex-direction:column;text-align:center}
      .inv-spacer{display:none}
      .inv-meta{grid-template-columns:1fr}
    }
  </style>
</head>
<body>
  <div class="inv-header">
    <div class="inv-logo">${logoLetter}</div>
    <div class="inv-title-block">
      <div class="inv-main-title">فاتورة ضريبية</div>
      <div class="inv-subtitle">Tax Invoice</div>
      <div class="inv-store-name">${merchantName || "Digital Pager"}</div>
    </div>
    <div class="inv-spacer"></div>
  </div>

  <div class="inv-meta">
    <div class="inv-meta-cell">
      <span class="inv-meta-label">رقم الطلب</span>
      <span class="inv-meta-value">#${num}</span>
    </div>
    <div class="inv-meta-cell">
      <span class="inv-meta-label">التاريخ</span>
      <span class="inv-meta-value">${date}</span>
    </div>
    <div class="inv-meta-cell">
      <span class="inv-meta-label">نوع الطلب</span>
      <span class="inv-meta-value">${diningTypeAr}</span>
    </div>
    <div class="inv-meta-cell">
      <span class="inv-meta-label">طريقة الدفع</span>
      <span class="inv-meta-value">${paymentAr}</span>
    </div>
  </div>

  ${items.length > 0 ? `
  <table class="inv-table">
    <thead>
      <tr>
        <th>المنتج</th>
        <th>الكمية</th>
        <th>السعر</th>
        <th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="inv-totals">
    ${deliveryFee > 0 ? `
    <div class="inv-tot-row"><span>المجموع الفرعي</span><span>${subtotal.toFixed(2)} ر.س</span></div>
    <div class="inv-tot-row"><span>رسوم التوصيل</span><span>${deliveryFee.toFixed(2)} ر.س</span></div>` : ""}
    <div class="inv-tot-row"><span>ضريبة القيمة المضافة <span class="vat-badge">0%</span></span><span>0.00 ر.س</span></div>
    <div class="inv-tot-row grand"><span>الإجمالي الكلي</span><span>${total.toFixed(2)} ر.س</span></div>
  </div>` : `<p style="color:#aaa;text-align:center;padding:28px 0">لا توجد تفاصيل للطلب</p>`}

  <div class="inv-footer">
    ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" class="inv-qr"><p class="inv-qr-label">امسح الرمز للتحقق من الطلب</p>` : ""}
    <div class="inv-disclaimer">المنصة غير خاضعة لضريبة القيمة المضافة</div>
    <div class="inv-thankyou">شكراً لزيارتكم! 🙏</div>
    <div class="inv-generated">فاتورة ضريبية إلكترونية • Digital Pager</div>
  </div>
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
