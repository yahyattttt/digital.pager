import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Loader2, Printer, ArrowRight } from "lucide-react";
import type { WhatsAppOrder } from "@shared/schema";

export default function OrderReceiptPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId || "";
  const searchParams = new URLSearchParams(window.location.search);
  const merchantId = searchParams.get("m") || "";

  const [order, setOrder] = useState<WhatsAppOrder | null>(null);
  const [merchant, setMerchant] = useState<{ storeName: string; logoUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderId || !merchantId) { setError(true); setLoading(false); return; }
    async function load() {
      try {
        const res = await fetch(`/api/track/${orderId}?merchantId=${merchantId}`);
        if (!res.ok) { setError(true); return; }
        const data = await res.json();
        setOrder(data.order);
        setMerchant(data.merchant);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orderId, merchantId]);

  useEffect(() => {
    if (!order || !merchantId) return;
    const qrContent = `${window.location.origin}/receipt/${orderId}?m=${merchantId}`;
    fetch(`/api/receipt-qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: qrContent }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.dataUrl) setQrDataUrl(data.dataUrl); })
      .catch(() => {});
  }, [order, merchantId, orderId]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !order || !merchant) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-white gap-4 px-6">
        <p className="text-gray-600 text-lg font-bold" dir="rtl">لم يتم العثور على الطلب</p>
        <p className="text-gray-400 text-sm">Order not found</p>
        <button onClick={() => window.history.back()} className="text-blue-600 text-sm underline" data-testid="link-go-back">رجوع</button>
      </div>
    );
  }

  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const formattedDate = orderDate.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const formattedTime = orderDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true });

  const itemsSubtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = order.diningType === "delivery" ? (order.deliveryFee || 0) : 0;
  const finalTotal = order.total;

  return (
    <div className="min-h-[100dvh] bg-gray-100">
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          data-testid="button-back"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors active:scale-[0.97]"
          data-testid="button-print-receipt"
        >
          <Printer className="w-4 h-4" />
          <span>حفظ كـ PDF / طباعة</span>
        </button>
      </div>

      <div className="max-w-md mx-auto py-6 px-4">
        <div ref={receiptRef} className="bg-white rounded-xl shadow-lg overflow-hidden receipt-paper" data-testid="receipt-container">
          <div className="px-6 pt-8 pb-4 text-center border-b-2 border-dashed border-gray-200">
            {merchant.logoUrl ? (
              <img
                src={merchant.logoUrl}
                alt={merchant.storeName}
                className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-gray-100"
                data-testid="img-receipt-logo"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3" data-testid="img-receipt-logo">
                <span className="text-2xl font-bold text-gray-400">{merchant.storeName.charAt(0)}</span>
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-receipt-store-name">
              {merchant.storeName}
            </h1>
            <p className="text-gray-800 text-sm font-black tracking-wider mb-1" dir="rtl">فاتورة ضريبية</p>
            <p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mb-3">Tax Invoice</p>

            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span data-testid="text-receipt-order-id" className="font-mono font-bold text-gray-700">{order.displayOrderId || `#${orderId.slice(-6)}`}</span>
              <span className="text-gray-300">|</span>
              <span dir="rtl" data-testid="text-receipt-date">{formattedDate}</span>
              <span className="text-gray-300">|</span>
              <span dir="rtl" data-testid="text-receipt-time">{formattedTime}</span>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider pb-2 mb-2 border-b border-gray-100" dir="rtl">
              <span className="flex-1">الصنف</span>
              <span className="w-10 text-center">الكمية</span>
              <span className="w-16 text-center">السعر</span>
              <span className="w-20 text-left">المجموع</span>
            </div>

            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between py-2 border-b border-gray-50 last:border-b-0"
                dir="rtl"
                data-testid={`receipt-item-${idx}`}
              >
                <span className="flex-1 text-sm text-gray-800 font-medium leading-snug pe-2">{item.name}</span>
                <span className="w-10 text-center text-sm text-gray-500">{item.quantity}</span>
                <span className="w-16 text-center text-sm text-gray-500 font-mono">{item.price.toFixed(2)}</span>
                <span className="w-20 text-left text-sm text-gray-800 font-mono font-medium">{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t-2 border-dashed border-gray-200">
            <div className="flex justify-between text-sm text-gray-600 mb-1.5" dir="rtl">
              <span>مجموع الأصناف</span>
              <span className="font-mono">{itemsSubtotal.toFixed(2)} SAR</span>
            </div>

            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-gray-600 mb-1.5" dir="rtl" data-testid="receipt-delivery-fee">
                <span>رسوم التوصيل</span>
                <span className="font-mono">{deliveryFee.toFixed(2)} SAR</span>
              </div>
            )}

            <div className="flex justify-between text-sm text-gray-500 mb-1.5" dir="rtl">
              <span>ضريبة القيمة المضافة (VAT 0%)</span>
              <span className="font-mono">0.00 SAR</span>
            </div>
            <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-dashed border-gray-300" dir="rtl" data-testid="receipt-final-total">
              <span className="text-lg font-bold text-gray-900">الإجمالي</span>
              <span className="text-2xl font-extrabold text-gray-900 font-mono">{finalTotal.toFixed(2)} <span className="text-sm text-gray-500">SAR</span></span>
            </div>
          </div>

          {order.customerName && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100" dir="rtl">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>العميل: <span className="text-gray-700 font-medium" data-testid="text-receipt-customer">{order.customerName}</span></span>
                {order.diningType && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold" data-testid="text-receipt-dining-type">
                    {order.diningType === "delivery" ? "توصيل" : order.diningType === "takeaway" ? "سفري" : "محلي"}
                  </span>
                )}
              </div>
            </div>
          )}

          {qrDataUrl && (
            <div className="px-6 py-5 flex flex-col items-center border-t border-gray-100">
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-24 h-24 mb-2"
                data-testid="img-receipt-qr"
              />
              <p className="text-[10px] text-gray-400 text-center">امسح الرمز للتحقق من الطلب</p>
              <p className="text-[11px] text-gray-600 font-semibold text-center mt-2" dir="rtl" data-testid="text-vat-disclaimer-qr">
                المنصة غير خاضعة لضريبة القيمة المضافة
              </p>
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-600 font-semibold leading-relaxed" dir="rtl" data-testid="text-receipt-legal-note">
              المنصة غير خاضعة لضريبة القيمة المضافة
            </p>
            <p className="text-[10px] text-gray-400 mt-1" dir="rtl">
              هذه الفاتورة الضريبية تم إنشاؤها إلكترونياً
            </p>
            <p className="text-[9px] text-gray-300 mt-1.5">Digital Pager • فاتورة ضريبية إلكترونية</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .receipt-paper { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
