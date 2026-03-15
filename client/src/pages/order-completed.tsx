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

  function downloadInvoice() {
    if (!order) return;
    const num = order.displayOrderId || order.orderNumber || orderId.slice(-6);
    const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-SA") : new Date().toLocaleDateString("ar-SA");
    const items = order.items || [];
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = order.deliveryFee || 0;
    const total = order.total || subtotal + deliveryFee;

    const itemRows = items.map((item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a0000;color:#fff;">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a0000;color:#ccc;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a0000;color:#ff8866;text-align:left;">${(item.price * item.quantity).toFixed(2)} ر.س</td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة رقم ${num}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      color: #fff;
      font-family: 'Tajawal', 'Cairo', Arial, sans-serif;
      padding: 40px;
      direction: rtl;
    }
    .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #cc2200; padding-bottom: 20px; }
    .header h1 { font-size: 28px; color: #ff4422; margin-bottom: 6px; }
    .header p  { font-size: 14px; color: #888; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px; color: #aaa; }
    .meta span strong { color: #fff; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #1a0000; }
    thead th { padding: 10px 12px; font-size: 13px; color: #ff8866; font-weight: 700; text-align: right; }
    thead th:last-child { text-align: left; }
    .totals { border-top: 1px solid #3a0000; padding-top: 16px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 12px; font-size: 14px; color: #ccc; }
    .total-row.grand { color: #ff4422; font-size: 18px; font-weight: 700; border-top: 1px solid #cc2200; margin-top: 8px; padding-top: 10px; }
    .tax-disclaimer { text-align: center; margin-top: 10px; padding: 8px 12px; font-size: 13px; color: #aaa; border: 1px dashed #3a0000; border-radius: 6px; }
    .footer { text-align: center; margin-top: 40px; color: #555; font-size: 12px; border-top: 1px solid #1a0000; padding-top: 16px; }
    @media print {
      body { background: #fff; color: #000; }
      .header h1 { color: #cc2200; }
      .total-row.grand { color: #cc2200; }
      .tax-disclaimer { color: #444; border-color: #bbb; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${merchantName || "Digital Pager"}</h1>
    <p>فاتورة ضريبية / Tax Invoice</p>
  </div>
  <div class="meta">
    <span>رقم الطلب: <strong>#${num}</strong></span>
    <span>التاريخ: <strong>${date}</strong></span>
  </div>
  ${items.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>الصنف</th>
        <th style="text-align:center;">الكمية</th>
        <th style="text-align:left;">السعر</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    ${deliveryFee > 0 ? `
      <div class="total-row"><span>المجموع الفرعي</span><span>${subtotal.toFixed(2)} ر.س</span></div>
      <div class="total-row"><span>رسوم التوصيل</span><span>${deliveryFee.toFixed(2)} ر.س</span></div>
    ` : ""}
    <div class="total-row"><span>ضريبة القيمة المضافة (VAT)</span><span>0.00 ر.س</span></div>
    <div class="total-row grand"><span>الإجمالي</span><span>${total.toFixed(2)} ر.س</span></div>
    <div class="tax-disclaimer">المنصة غير خاضعة لضريبة القيمة المضافة</div>
  </div>
  ` : `<p style="color:#888;text-align:center;padding:24px;">لا توجد تفاصيل للطلب</p>`}
  <div class="footer">
    <p>شكراً لتعاملك معنا • ${merchantName || "Digital Pager"}</p>
    <p style="margin-top:4px;">هذه الفاتورة تم إنشاؤها إلكترونياً</p>
  </div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    document.body.appendChild(iframe);
    iframe.contentDocument!.open();
    iframe.contentDocument!.write(html);
    iframe.contentDocument!.close();
    setTimeout(() => {
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 400);
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
