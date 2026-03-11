import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, Loader2, Star, Banknote, Phone, MessageCircle, Send, Share2, Copy, XCircle, Truck, MapPin, Package, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WhatsAppOrder } from "@shared/schema";

function SmartRatingScreen({
  merchantId,
  storeName,
  googleMapsReviewUrl,
  orderNumber,
  diningType,
  customerName,
  driverPhone,
  orderId,
}: {
  merchantId: string;
  storeName: string;
  googleMapsReviewUrl?: string;
  orderNumber: string;
  diningType?: string;
  customerName?: string;
  driverPhone?: string;
  orderId?: string;
}) {
  const isDelivery = diningType === "delivery";
  const [selectedStars, setSelectedStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [phase, setPhase] = useState<"driver" | "rating" | "feedback" | "thankyou" | "redirecting" | "done">(isDelivery ? "driver" : "rating");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleWhatsAppDriver() {
    const phone = (driverPhone || "").replace(/[^\d+]/g, "");
    const name = customerName || "";
    const orderNum = orderNumber || "";
    const msg = encodeURIComponent(`مرحباً، أنا العميل ${name}، أود تتبع طلبي رقم ${orderNum}.`);
    const url = phone
      ? `https://wa.me/${phone.startsWith("+") ? phone.slice(1) : phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  }

  function handleStarClick(star: number) {
    setSelectedStars(star);

    if (star >= 4 && googleMapsReviewUrl) {
      setPhase("redirecting");
      fetch("/api/store-internal-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, stars: star, comment: "", orderNumber }),
      }).catch(() => {});

      setTimeout(() => {
        try { fetch(`/api/track/gmaps/${merchantId}`, { method: "POST" }); } catch {}
        window.open(googleMapsReviewUrl, "_blank");
        setPhase("done");
      }, 1500);
    } else if (star >= 4) {
      fetch("/api/store-internal-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, stars: star, comment: "", orderNumber }),
      }).catch(() => {});
      setPhase("done");
    } else {
      setPhase("feedback");
    }
  }

  async function handleSubmitFeedback() {
    setSubmitting(true);
    try {
      await fetch("/api/store-internal-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, stars: selectedStars, comment: comment.trim(), orderNumber }),
      });
    } catch {}
    setSubmitting(false);
    setPhase("done");
  }

  function handleCloseAndReturn() {
    if (orderId) {
      sessionStorage.removeItem(`order_${orderId}`);
      localStorage.removeItem(`order_${orderId}`);
    }
    sessionStorage.removeItem("pager_bell_primed");
    const menuPath = `/menu/${merchantId}`;
    window.location.href = menuPath;
  }

  return (
    <div
      className="h-[100dvh] flex flex-col items-center justify-between py-8 px-5 text-center overflow-y-auto"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      data-testid="tracking-completed-screen"
    >
      <div className="flex flex-col items-center gap-5 w-full max-w-sm animate-in fade-in duration-700 flex-1">
        <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center ${isDelivery ? "border-emerald-500/30 bg-emerald-500/5" : "border-green-500/30 bg-green-500/5"}`} style={{ boxShadow: isDelivery ? "0 0 40px rgba(16,185,129,0.15)" : "0 0 40px rgba(34,197,94,0.12)" }}>
          {isDelivery ? (
            <Truck className="w-10 h-10 text-emerald-400/80" />
          ) : (
            <CheckCircle className="w-10 h-10 text-green-500/80" />
          )}
        </div>

        <div>
          {isDelivery ? (
            <>
              <p className="text-emerald-400 text-xl font-bold" data-testid="text-completed-message" dir="rtl">شكراً لطلبك</p>
              <p className="text-emerald-400/70 text-sm font-medium mt-2 leading-relaxed max-w-xs" dir="rtl" data-testid="text-delivery-message">
                طلبك الآن في عهدة المندوب.
              </p>
            </>
          ) : (
            <>
              <p className="text-green-400 text-2xl font-bold" data-testid="text-completed-message">Thank You!</p>
              <p className="text-green-400/80 text-lg font-bold mt-1" dir="rtl" data-testid="text-completed-message-ar">
                شكراً لزيارتك، قيم تجربتك معنا
              </p>
            </>
          )}
        </div>

        {isDelivery && phase === "driver" && (
          <div className="flex flex-col items-center gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button
              onClick={handleWhatsAppDriver}
              className="w-full h-14 font-bold text-base rounded-xl gap-3"
              style={{ background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)" }}
              data-testid="button-whatsapp-driver"
            >
              <MessageCircle className="w-6 h-6" />
              <span dir="rtl">تواصل مع المندوب لتتبع طلبك 🟢</span>
            </Button>

            <button
              onClick={() => setPhase("rating")}
              className="text-white/40 text-xs underline underline-offset-4 hover:text-white/60 transition-colors mt-1"
              data-testid="button-skip-to-rating"
              dir="rtl"
            >
              تقييم الخدمة ⭐
            </button>
          </div>
        )}

        {phase === "rating" && (
          <div className="flex flex-col items-center gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isDelivery && (
              <Button
                onClick={handleWhatsAppDriver}
                variant="outline"
                className="w-full h-12 font-bold text-sm rounded-xl gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 bg-transparent"
                data-testid="button-whatsapp-driver-small"
              >
                <MessageCircle className="w-5 h-5" />
                <span dir="rtl">تواصل مع المندوب 🟢</span>
              </Button>
            )}
            <Card className="w-full bg-[#111] border-white/[0.06] rounded-2xl">
              <CardContent className="p-6 flex flex-col items-center gap-4">
                <p className="text-white/80 text-sm font-medium" dir="rtl" data-testid="text-rate-prompt">تقييم الخدمة</p>
                <p className="text-white/40 text-xs" data-testid="text-rate-prompt-en">Rate your experience</p>
                <div className="flex items-center justify-center gap-3" data-testid="star-rating-widget">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-all duration-200 active:scale-90 p-1"
                      data-testid={`button-star-${star}`}
                    >
                      <Star
                        className={`w-12 h-12 sm:w-14 sm:h-14 transition-all duration-200 ${
                          star <= (hoveredStar || selectedStars)
                            ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                            : "text-zinc-700 hover:text-zinc-500"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {phase === "feedback" && (
          <div className="flex flex-col items-center gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="w-full bg-[#111] border-white/[0.06] rounded-2xl">
              <CardContent className="p-6 flex flex-col items-center gap-4">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-8 h-8 ${star <= selectedStars ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"}`}
                    />
                  ))}
                </div>
                <p className="text-white/80 text-sm font-medium" dir="rtl" data-testid="text-feedback-prompt">
                  نأسف لذلك! ما الذي يمكننا تحسينه؟
                </p>
                <p className="text-white/40 text-xs" data-testid="text-feedback-prompt-en">
                  We're sorry! What can we improve?
                </p>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="اكتب ملاحظاتك هنا... / Write your feedback here..."
                  className="w-full text-sm resize-none bg-black border-zinc-700 text-white placeholder:text-zinc-600"
                  rows={3}
                  dir="rtl"
                  data-testid="textarea-feedback"
                />
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={submitting}
                  className="w-full h-12 font-bold text-base bg-red-600 hover:bg-red-700 text-white rounded-xl"
                  data-testid="button-submit-feedback"
                >
                  {submitting ? <Loader2 className="w-5 h-5 me-2 animate-spin" /> : <Send className="w-5 h-5 me-2" />}
                  <span dir="rtl">{submitting ? "جاري الإرسال..." : "إرسال الملاحظات"}</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {phase === "redirecting" && (
          <div className="flex flex-col items-center gap-4 w-full animate-in fade-in duration-500">
            <Card className="w-full bg-[#111] border-white/[0.06] rounded-2xl">
              <CardContent className="p-6 flex flex-col items-center gap-4">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-8 h-8 ${star <= selectedStars ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"}`}
                    />
                  ))}
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
                <p className="text-white text-base font-bold" dir="rtl" data-testid="text-rating-thankyou">
                  شكراً لك! جاري تحويلك لجوجل ماب...
                </p>
                <p className="text-zinc-400 text-xs" data-testid="text-rating-redirect">
                  Thank you! Redirecting to Google Maps...
                </p>
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              </CardContent>
            </Card>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-500">
            <Card className="w-full bg-[#111] border-white/[0.06] rounded-2xl">
              <CardContent className="p-6 flex flex-col items-center gap-3">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="text-white text-lg font-bold" dir="rtl" data-testid="text-feedback-thankyou">
                  {selectedStars <= 3
                    ? "شكراً لملاحظاتك، نسعى دائماً للأفضل"
                    : "شكراً لتقييمك!"}
                </p>
                <p className="text-zinc-400 text-sm" data-testid="text-feedback-thankyou-en">
                  {selectedStars <= 3
                    ? "Thank you for your feedback, we always strive to improve"
                    : "Thank you for your rating!"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {storeName && (
          <p className="text-white/20 text-xs mt-2">{storeName}</p>
        )}
      </div>

      <div className="w-full max-w-sm mt-6 flex-shrink-0">
        <button
          onClick={handleCloseAndReturn}
          className="w-full py-3 text-white/30 text-sm font-medium hover:text-white/50 transition-colors underline underline-offset-4"
          data-testid="button-close-return"
          dir="rtl"
        >
          إغلاق والعودة للرئيسية
        </button>
      </div>
    </div>
  );
}

function DeliveryTrackingView({
  order,
  merchant,
  merchantId,
}: {
  order: WhatsAppOrder;
  merchant: { storeName: string; logoUrl: string; googleMapsReviewUrl?: string; driverPhone?: string } | null;
  merchantId: string;
}) {
  const driverPhone = merchant?.driverPhone || "";
  const isCompleted = order.status === "completed" || order.status === "archived";
  const isReady = order.status === "ready";
  const isRejected = order.status === "rejected";
  const [showRating, setShowRating] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [ratingPhase, setRatingPhase] = useState<"stars" | "feedback" | "redirecting" | "done">("stars");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const prevStatusRef = useRef(order.status);

  useEffect(() => {
    if ((isReady || isCompleted) && !showRating) {
      const timer = setTimeout(() => setShowRating(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isReady, isCompleted]);

  useEffect(() => {
    if (prevStatusRef.current !== order.status) {
      if ((order.status === "ready" || order.status === "completed" || order.status === "archived") && !showRating) {
        const timer = setTimeout(() => setShowRating(true), 1500);
        return () => clearTimeout(timer);
      }
    }
    prevStatusRef.current = order.status;
  }, [order.status]);

  function handleWhatsAppDriver() {
    const phone = driverPhone.replace(/[^\d+]/g, "");
    const name = order.customerName || "";
    const orderNum = order.orderNumber || "";
    const msg = encodeURIComponent(`مرحباً، أنا العميل ${name}، أود تتبع طلبي رقم ${orderNum}.`);
    const url = phone
      ? `https://wa.me/${phone.startsWith("+") ? phone.slice(1) : phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  }

  function handleStarClick(star: number) {
    setSelectedStars(star);
    if (star >= 4 && merchant?.googleMapsReviewUrl) {
      setRatingPhase("redirecting");
      fetch("/api/store-internal-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, stars: star, comment: "", orderNumber: order.orderNumber }),
      }).catch(() => {});
      setTimeout(() => {
        try { fetch(`/api/track/gmaps/${merchantId}`, { method: "POST" }); } catch {}
        window.open(merchant!.googleMapsReviewUrl!, "_blank");
        setRatingPhase("done");
      }, 1500);
    } else if (star >= 4) {
      fetch("/api/store-internal-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, stars: star, comment: "", orderNumber: order.orderNumber }),
      }).catch(() => {});
      setRatingPhase("done");
    } else {
      setRatingPhase("feedback");
    }
  }

  async function handleSubmitFeedback() {
    setSubmitting(true);
    try {
      await fetch("/api/store-internal-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, stars: selectedStars, comment: comment.trim(), orderNumber: order.orderNumber }),
      });
    } catch {}
    setSubmitting(false);
    setRatingPhase("done");
  }

  function handleCloseAndReturn() {
    if (order.id) {
      sessionStorage.removeItem(`order_${order.id}`);
      localStorage.removeItem(`order_${order.id}`);
    }
    sessionStorage.removeItem("pager_bell_primed");
    window.location.href = `/menu/${merchantId}`;
  }

  function getStatusConfig() {
    switch (order.status) {
      case "pending_verification":
      case "awaiting_confirmation":
        return { label: "بانتظار تأكيد المتجر", labelEn: "Awaiting store confirmation", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20", icon: <Clock className="w-6 h-6 text-amber-400" />, pulse: true };
      case "preparing":
        return { label: "جاري التحضير", labelEn: "Preparing your order", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20", icon: <Package className="w-6 h-6 text-amber-400" />, pulse: true };
      case "ready":
        return { label: "جاهز للتوصيل", labelEn: "Ready for delivery", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", icon: <Truck className="w-6 h-6 text-emerald-400" />, pulse: false };
      case "completed":
      case "archived":
        return { label: "تم التوصيل", labelEn: "Delivered", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", icon: <CheckCircle className="w-6 h-6 text-emerald-400" />, pulse: false };
      case "rejected":
        return { label: "تم رفض الطلب", labelEn: "Order rejected", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/20", icon: <XCircle className="w-6 h-6 text-red-400" />, pulse: false };
      default:
        return { label: "جاري المعالجة", labelEn: "Processing", color: "text-white/60", bgColor: "bg-white/5", borderColor: "border-white/10", icon: <Loader2 className="w-6 h-6 text-white/60 animate-spin" />, pulse: true };
    }
  }

  const sc = getStatusConfig();

  return (
    <div
      className="h-[100dvh] flex flex-col items-center justify-between py-8 px-5 text-center overflow-y-auto"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      data-testid="tracking-delivery-screen"
    >
      <div className="flex flex-col items-center gap-5 w-full max-w-sm animate-in fade-in duration-700 flex-1">
        {merchant && (
          <p className="text-white/30 text-xs font-medium tracking-wide">{merchant.storeName}</p>
        )}

        <div className="w-20 h-20 rounded-full border-2 border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(16,185,129,0.15)" }}>
          <Truck className="w-10 h-10 text-emerald-400/80" />
        </div>

        <div>
          <p className="text-emerald-400 text-xl font-bold" dir="rtl" data-testid="text-delivery-header">شكراً لطلبك</p>
          <p className="text-emerald-400/70 text-sm font-medium mt-2 leading-relaxed max-w-xs" dir="rtl" data-testid="text-delivery-subheader">
            طلبك الآن في عهدة المندوب
          </p>
        </div>

        <div className={`w-full p-4 rounded-2xl ${sc.bgColor} border ${sc.borderColor} transition-all duration-500`} data-testid="delivery-status-card">
          <div className="flex items-center justify-center gap-3 mb-2">
            {sc.icon}
            {sc.pulse && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
          <p className={`text-2xl font-bold ${sc.color}`} dir="rtl" data-testid="text-delivery-live-status">{sc.label}</p>
          <p className="text-white/40 text-xs mt-1" data-testid="text-delivery-live-status-en">{sc.labelEn}</p>
        </div>

        {order.displayOrderId && (
          <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-white/40 text-[10px] mb-0.5" dir="rtl">رقم الطلب</p>
            <p className="text-white text-lg font-bold font-mono tracking-wider" data-testid="text-delivery-order-number">{order.displayOrderId}</p>
          </div>
        )}

        {!isRejected && (
          <Button
            onClick={handleWhatsAppDriver}
            className="w-full h-14 font-bold text-base rounded-xl gap-3"
            style={{ background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)" }}
            data-testid="button-whatsapp-driver"
          >
            <MessageCircle className="w-6 h-6" />
            <span dir="rtl">تواصل مع المندوب لتتبع طلبك 🟢</span>
          </Button>
        )}

        {!isRejected && (
          <button
            onClick={() => { window.location.href = `/receipt/${order.id}?m=${merchantId}`; }}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-emerald-900/15 to-emerald-950/30 active:scale-[0.97] transition-all duration-200"
            style={{ padding: "14px 20px", boxShadow: "0 0 15px rgba(16,185,129,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="button-view-receipt-delivery"
          >
            <span className="text-lg flex-shrink-0">📄</span>
            <span className="text-emerald-400/90 text-[14px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>عرض إيصال الطلب</span>
          </button>
        )}

        {showRating && !isRejected && ratingPhase === "stars" && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="w-full bg-[#111] border-white/[0.06] rounded-2xl">
              <CardContent className="p-5 flex flex-col items-center gap-3">
                <p className="text-white/80 text-sm font-medium" dir="rtl" data-testid="text-delivery-rate-prompt">تقييم الخدمة</p>
                <p className="text-white/40 text-xs">Rate your experience</p>
                <div className="flex items-center justify-center gap-3" data-testid="star-rating-widget">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-all duration-200 active:scale-90 p-1"
                      data-testid={`button-star-${star}`}
                    >
                      <Star
                        className={`w-11 h-11 transition-all duration-200 ${
                          star <= (hoveredStar || selectedStars)
                            ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                            : "text-zinc-700 hover:text-zinc-500"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showRating && ratingPhase === "feedback" && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="w-full bg-[#111] border-white/[0.06] rounded-2xl">
              <CardContent className="p-5 flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`w-7 h-7 ${star <= selectedStars ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"}`} />
                  ))}
                </div>
                <p className="text-white/80 text-sm font-medium" dir="rtl">ما الذي يمكننا تحسينه؟</p>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="اكتب ملاحظاتك هنا..."
                  className="w-full text-sm resize-none bg-black border-zinc-700 text-white placeholder:text-zinc-600"
                  rows={3}
                  dir="rtl"
                  data-testid="textarea-delivery-feedback"
                />
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={submitting}
                  className="w-full h-11 font-bold text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl"
                  data-testid="button-submit-delivery-feedback"
                >
                  {submitting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Send className="w-4 h-4 me-2" />}
                  <span dir="rtl">{submitting ? "جاري الإرسال..." : "إرسال الملاحظات"}</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {showRating && ratingPhase === "redirecting" && (
          <div className="w-full animate-in fade-in duration-500">
            <Card className="w-full bg-[#111] border-white/[0.06] rounded-2xl">
              <CardContent className="p-5 flex flex-col items-center gap-3">
                <CheckCircle className="w-10 h-10 text-green-500" />
                <p className="text-white text-sm font-bold" dir="rtl">شكراً لك! جاري تحويلك لجوجل ماب...</p>
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              </CardContent>
            </Card>
          </div>
        )}

        {showRating && ratingPhase === "done" && (
          <div className="w-full animate-in fade-in duration-500">
            <Card className="w-full bg-[#111] border-white/[0.06] rounded-2xl">
              <CardContent className="p-5 flex flex-col items-center gap-3">
                <CheckCircle className="w-10 h-10 text-green-500" />
                <p className="text-white text-base font-bold" dir="rtl">
                  {selectedStars <= 3 ? "شكراً لملاحظاتك" : "شكراً لتقييمك!"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {!isRejected && !isCompleted && (
          <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/20 w-full">
            <p className="text-white/30 text-xs text-center" dir="rtl">{order.customerName} • {order.items.length} {order.items.length === 1 ? "منتج" : "منتجات"} • {order.total.toFixed(2)} SAR</p>
          </div>
        )}

        {!isRejected && (
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isCompleted ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            <span className="text-white/20 text-[10px]">{isCompleted ? "Completed" : "Live"}</span>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm mt-6 flex-shrink-0">
        <button
          onClick={handleCloseAndReturn}
          className="w-full py-3 text-white/30 text-sm font-medium hover:text-white/50 transition-colors underline underline-offset-4"
          data-testid="button-close-return"
          dir="rtl"
        >
          إغلاق والعودة للرئيسية
        </button>
      </div>
    </div>
  );
}

const LED_COUNT = 10;

function BuzzerCircle({ orderNumber, active }: { orderNumber: string; active: boolean }) {
  const leds = Array.from({ length: LED_COUNT }, (_, i) => {
    const angle = (i / LED_COUNT) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const r = 44;
    const cx = 50 + r * Math.cos(rad);
    const cy = 50 + r * Math.sin(rad);
    const delay = active ? `${(i * 0.03).toFixed(3)}s` : `${(i * 0.35).toFixed(2)}s`;
    return { cx, cy, delay, i };
  });

  return (
    <div className="relative w-[260px] h-[260px] mx-auto" data-testid="buzzer-circle">
      <div
        className={`absolute inset-0 rounded-full ${active ? "buzzer-ring-active" : ""}`}
        style={{
          background: "radial-gradient(circle at 38% 32%, #222 0%, #151515 30%, #0a0a0a 55%, #050505 80%, #000 100%)",
          boxShadow: active
            ? undefined
            : "0 0 40px 8px rgba(0,0,0,0.6), inset 0 0 25px rgba(0,0,0,0.4)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{ inset: "3px", background: "linear-gradient(135deg, rgba(80,80,80,0.12) 0%, transparent 35%, transparent 65%, rgba(30,30,30,0.08) 100%)", border: "1px solid rgba(255,255,255,0.06)" }}
      />
      <div
        className="absolute rounded-full"
        style={{ inset: "8px", border: "1px solid rgba(255,255,255,0.03)", background: "radial-gradient(circle at 42% 38%, rgba(40,40,40,0.1) 0%, transparent 50%)" }}
      />
      <div
        className="absolute rounded-full"
        style={{ inset: "22px", border: active ? "1px solid rgba(255,25,0,0.1)" : "1px solid rgba(255,255,255,0.025)" }}
      />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="ot-led-glow-grad">
            <stop offset="0%" stopColor="#ff2200" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#ff1100" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className={active ? "led-ring-spinning" : ""} style={{ transformOrigin: "50px 50px" }}>
          {leds.map((led) => (
            <g key={led.i}>
              <circle cx={led.cx} cy={led.cy} r={6} fill="url(#ot-led-glow-grad)" className={active ? "led-glow-active" : "led-glow-idle"} style={{ animationDelay: led.delay }} />
              <circle cx={led.cx} cy={led.cy} r={2.6} fill="#ff2000" className={active ? "led-dot-active" : "led-dot-idle"} style={{ animationDelay: led.delay }} />
              <circle cx={led.cx} cy={led.cy} r={1.2} fill="#ff6644" opacity={active ? 0.9 : 0.25} className={active ? "led-dot-active" : "led-dot-idle"} style={{ animationDelay: led.delay }} />
            </g>
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <span
          className={`font-dseg7 tracking-wider ${active ? "buzzer-number-blink" : ""}`}
          style={{
            fontSize: "clamp(48px, 13vw, 72px)",
            color: active ? "#ff3000" : "#aa1800",
            textShadow: active
              ? "0 0 25px rgba(255,40,0,0.9), 0 0 50px rgba(255,20,0,0.5), 0 0 80px rgba(255,10,0,0.25)"
              : "0 0 12px rgba(170,24,0,0.35), 0 0 4px rgba(170,24,0,0.2)",
            lineHeight: 1,
          }}
          data-testid="text-buzzer-number text-tracking-order-number"
        >
          {orderNumber}
        </span>
      </div>
    </div>
  );
}

function getShort3Digit(order: WhatsAppOrder): string {
  const raw = order.orderNumber || order.displayOrderId || "";
  const nums = raw.replace(/\D/g, "");
  if (nums.length <= 3) return nums || "?";
  return nums.slice(-3);
}

export default function OrderTrackingPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [order, setOrder] = useState<WhatsAppOrder | null>(null);
  const [merchant, setMerchant] = useState<{ storeName: string; logoUrl: string; googleMapsReviewUrl?: string; driverPhone?: string } | null>(null);
  const [loading, setLoading] = useState(!!orderId);
  const [notFound, setNotFound] = useState(false);
  const [bellPrimed, setBellPrimed] = useState(false);
  const [bellPlaying, setBellPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bellPrimedRef = useRef(false);

  const { toast } = useToast();

  const merchantId = new URLSearchParams(window.location.search).get("m") || "";
  const trackingType = new URLSearchParams(window.location.search).get("type") || "";

  function ensureAudio() {
    if (!audioRef.current) {
      audioRef.current = new Audio("/alert.mp3");
      audioRef.current.volume = 1.0;
      audioRef.current.preload = "auto";
    }
    return audioRef.current;
  }

  function handlePrimeBell() {
    if (bellPrimedRef.current) return;
    const audio = ensureAudio();
    audio.loop = false;
    audio.currentTime = 0;
    audio.volume = 1.0;
    try {
      if (!audioContextRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AC();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch {}
    audio.play().then(() => {
      setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 500);
      bellPrimedRef.current = true;
      setBellPrimed(true);
      toast({ title: "تم تفعيل التنبيه ✅", description: "سيتم تنبيهك عند جاهزية طلبك" });
    }).catch(() => {
      toast({ title: "خطأ", description: "تعذر تشغيل الصوت", variant: "destructive" });
    });
  }

  function playFullAlert() {
    const audio = ensureAudio();
    audio.loop = true;
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play().then(() => {
      setBellPlaying(true);
      if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 800]);
      }
    }).catch(() => {});
  }

  function stopAlert() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ("vibrate" in navigator) navigator.vibrate(0);
    setBellPlaying(false);
  }

  useEffect(() => {
    if (!orderId || !merchantId) {
      if (orderId) { setNotFound(true); setLoading(false); }
      return;
    }

    async function fetchInitial() {
      try {
        const res = await fetch(`/api/track/${orderId}?merchantId=${merchantId}${trackingType ? `&type=${trackingType}` : ""}`);
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json();
        setOrder(data.order);
        setMerchant(data.merchant);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchInitial();
  }, [orderId, merchantId, trackingType]);

  useEffect(() => {
    if (!orderId || !merchantId) return;

    let prevStatus: string | null = null;
    let isFirstSnapshot = true;

    const collectionName = trackingType === "pager" ? "pagers" : "whatsappOrders";
    const docRef = doc(db, "merchants", merchantId, collectionName, orderId);
    console.log("[OrderTracking] Setting up Firestore listener for:", `merchants/${merchantId}/${collectionName}/${orderId}`);
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        console.log("[OrderTracking] Document does not exist in snapshot");
        setOrder(null);
        setNotFound(true);
        return;
      }
      const data = snap.data();
      let updatedOrder: WhatsAppOrder;
      if (trackingType === "pager") {
        const pagerStatus = data.status || "waiting";
        const statusMap: Record<string, string> = { waiting: "preparing", notified: "ready", completed: "completed" };
        updatedOrder = {
          id: snap.id,
          merchantId: data.storeId || "",
          customerName: "",
          customerPhone: "",
          items: [],
          total: 0,
          status: (statusMap[pagerStatus] || pagerStatus) as any,
          paymentMethod: "cod",
          orderNumber: data.orderNumber || "",
          displayOrderId: data.displayOrderId || "",
          orderType: data.orderType || "manual",
          createdAt: data.createdAt || "",
        };
      } else {
        updatedOrder = {
          id: snap.id,
          merchantId: data.merchantId || "",
          customerName: data.customerName || "",
          customerPhone: data.customerPhone || "",
          items: (data.items || []).map((item: any) => ({
            productId: item.productId || "",
            name: item.name || "",
            price: item.price || 0,
            quantity: item.quantity || 1,
          })),
          total: data.total || 0,
          status: data.status || "pending_verification",
          paymentMethod: data.paymentMethod || "cod",
          orderNumber: data.orderNumber || "",
          displayOrderId: data.displayOrderId || "",
          orderType: data.orderType || undefined,
          diningType: data.diningType || undefined,
          createdAt: data.createdAt || "",
        };
      }
      setOrder(updatedOrder);

      const currentStatus = updatedOrder.status;
      console.log("[OrderTracking] Firestore snapshot — status:", currentStatus, "prev:", prevStatus, "firstSnap:", isFirstSnapshot);

      if (!isFirstSnapshot && currentStatus === "ready" && prevStatus !== "ready") {
        if (bellPrimedRef.current) {
          playFullAlert();
        }
      }

      if (currentStatus === "completed" || currentStatus === "archived") {
        stopAlert();
      }

      if (isFirstSnapshot) {
        isFirstSnapshot = false;
      }

      prevStatus = currentStatus;
    }, (error) => {
      console.error("[OrderTracking] Firestore listener error:", error.message);
    });

    return () => unsub();
  }, [orderId, merchantId, trackingType]);

  const isOnlineOrder = order?.orderType === "online" || (!order?.orderType && !!(order?.displayOrderId && !order.displayOrderId.startsWith("MA-")));

  async function handleShareTracking() {
    const displayId = order?.displayOrderId || "";
    const storeLabel = merchant?.storeName || "";
    const shareTitle = `تتبع طلبي من ${storeLabel}`;
    const shareText = `طلبي رقم ${displayId} جاري التحضير الآن! تابعه معي من هنا:`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast({ title: "تم نسخ الرابط", description: "تم نسخ رابط التتبع إلى الحافظة" });
      } catch {
        toast({ title: "خطأ", description: "تعذر نسخ الرابط", variant: "destructive" });
      }
    }
  }

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/30 text-xs tracking-[0.3em] uppercase">LOADING ORDER</span>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center p-6">
        <Card className="w-full max-w-sm border-red-600/20 bg-black">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2" dir="rtl" data-testid="text-order-not-found">الطلب غير موجود</h2>
            <p className="text-gray-400 text-sm" data-testid="text-order-not-found-en">Order not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (order.diningType === "delivery") {
    return (
      <DeliveryTrackingView
        order={order}
        merchant={merchant}
        merchantId={merchantId}
      />
    );
  }

  if (order.status === "pending_verification" || order.status === "awaiting_confirmation") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }} data-testid="tracking-awaiting-screen">
        <div className="w-full flex-shrink-0 mb-6">
          <p className="text-white/40 text-[14px] font-medium tracking-[0.3em] uppercase mb-0.5">DIGITAL PAGER</p>
          {merchant && <h2 className="text-white text-[26px] font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>}
        </div>

        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <div className="w-20 h-20 rounded-full border-2 border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 30px rgba(16,185,129,0.08)" }}>
            <CheckCircle className="w-10 h-10 text-emerald-500/70 animate-pulse" />
          </div>

          <div>
            <p className="text-emerald-400 text-lg font-bold" dir="rtl" data-testid="text-awaiting-message">تم إرسال طلبك..</p>
            <p className="text-white/50 text-sm mt-1.5" data-testid="text-awaiting-hint">Your order has been submitted!</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 w-full" data-testid="verification-message">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-amber-400" />
              <MessageCircle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-amber-400/90 text-sm leading-relaxed font-bold" dir="rtl">
              بانتظار اتصال المتجر للتحقق
            </p>
            <p className="text-white/40 text-[11px] mt-2">
              Waiting for the store to call and verify your order.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-medium" dir="rtl">الدفع عند الاستلام</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/30 w-full text-left">
            <p className="text-white/50 text-xs mb-2" dir="rtl">تفاصيل الطلب:</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-white/40 text-xs py-0.5">
                <span>{item.name} × {item.quantity}</span>
                <span>{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-white/70 text-sm font-bold mt-2 pt-2 border-t border-zinc-800/30">
              <span dir="rtl">المجموع</span>
              <span>{order.total.toFixed(2)} SAR</span>
            </div>
          </div>

          {isOnlineOrder && (
            <>
              <button
                onClick={() => { window.location.href = `/receipt/${orderId}?m=${merchantId}`; }}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-emerald-900/15 to-emerald-950/30 active:scale-[0.97] transition-all duration-200"
                style={{ padding: "16px 20px", boxShadow: "0 0 15px rgba(16,185,129,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
                data-testid="button-view-receipt"
              >
                <span className="text-2xl flex-shrink-0">📄</span>
                <span className="text-emerald-400/90 text-[17px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>عرض إيصال الطلب</span>
              </button>

              <button
                onClick={handleShareTracking}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
                style={{ padding: "18px 20px", boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
                data-testid="button-share-tracking-pending"
              >
                {navigator.share ? (
                  <Share2 className="w-5 h-5 text-red-400/80 flex-shrink-0" />
                ) : (
                  <Copy className="w-5 h-5 text-red-400/80 flex-shrink-0" />
                )}
                <span className="text-red-400/90 text-[18px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>شارك حالة الطلب مع أحبابك</span>
              </button>
            </>
          )}

          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-white/20 text-[10px]" data-testid="text-live-status">Live</span>
          </div>
        </div>
      </div>
    );
  }

  if (order.status === "ready") {
    const shortNum = getShort3Digit(order);
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-between py-10 px-5 text-center"
        style={{ background: "linear-gradient(180deg, #0a0000 0%, #1a0000 30%, #0d0000 70%, #000 100%)" }}
        data-testid="tracking-ready-screen"
      >
        <div className="w-full">
          <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase mb-1">DIGITAL PAGER</p>
          {merchant && <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-5">
          <BuzzerCircle orderNumber={shortNum} active={true} />
          <div>
            <p className="text-red-400 text-2xl font-black" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-order-ready">
              طلبك جاهز، استلمه الآن! ✅
            </p>
            <p className="text-white/50 text-sm mt-2">Your order is ready! Please pick it up.</p>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-3">
          {bellPlaying && (
            <button
              onClick={stopAlert}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-red-500/30 bg-red-500/10 active:scale-[0.95] transition-all duration-200"
              style={{ boxShadow: "0 0 25px rgba(255,0,0,0.15)" }}
              data-testid="button-stop-alert"
            >
              <span className="text-xl">🔇</span>
              <span className="text-white text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>إيقاف التنبيه</span>
            </button>
          )}

          {!bellPlaying && !bellPrimed && (
            <button
              onClick={() => { handlePrimeBell(); setTimeout(playFullAlert, 600); }}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 active:scale-[0.95] transition-all duration-200 animate-pulse"
              style={{ boxShadow: "0 0 25px rgba(16,185,129,0.1)" }}
              data-testid="button-play-alert"
            >
              <span className="text-2xl">🔔</span>
              <span className="text-emerald-400 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>تشغيل صوت التنبيه</span>
            </button>
          )}

          {isOnlineOrder && (
            <button
              onClick={() => { window.location.href = `/receipt/${orderId}?m=${merchantId}`; }}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
              style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
              data-testid="button-view-receipt-ready"
            >
              <span className="text-lg flex-shrink-0">📄</span>
              <span className="text-red-400/90 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>عرض إيصال الطلب</span>
            </button>
          )}
          <button
            onClick={handleShareTracking}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
            style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="button-share-tracking-ready"
          >
            {navigator.share ? (
              <Share2 className="w-5 h-5 text-red-400/80 flex-shrink-0" />
            ) : (
              <Copy className="w-5 h-5 text-red-400/80 flex-shrink-0" />
            )}
            <span className="text-red-400/90 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>مشاركة مع الأحباب 🔗</span>
          </button>
        </div>
      </div>
    );
  }

  if (order.status === "rejected") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #1a0000 100%)" }} data-testid="tracking-rejected-screen">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="w-24 h-24 rounded-full border-2 border-red-500/30 bg-red-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(239,68,68,0.12)" }}>
            <XCircle className="w-12 h-12 text-red-500/80" />
          </div>
          <div>
            <p className="text-red-400 text-xl font-bold" data-testid="text-rejected-message">Order Rejected</p>
            <p className="text-red-400/80 text-xl font-bold mt-2" dir="rtl">تم رفض الطلب</p>
            <p className="text-white/50 text-sm mt-4">Sorry, the store has rejected your order.</p>
            <p className="text-white/40 text-sm mt-0.5" dir="rtl">عذراً، قام المتجر برفض طلبك</p>
          </div>
        </div>
      </div>
    );
  }

  if (order.status === "uncollected") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #1a0000 100%)" }} data-testid="tracking-uncollected-screen">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="w-24 h-24 rounded-full border-2 border-red-500/30 bg-red-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(239,68,68,0.12)" }}>
            <AlertTriangle className="w-12 h-12 text-red-500/80" />
          </div>
          <div>
            <p className="text-red-400 text-xl font-bold" data-testid="text-uncollected-message">Order Not Collected</p>
            <p className="text-red-400/80 text-xl font-bold mt-2" dir="rtl">لم يتم استلام الطلب</p>
            <p className="text-white/50 text-sm mt-4">This order was marked as not collected.</p>
            <p className="text-white/40 text-sm mt-0.5" dir="rtl">تم تسجيل عدم استلام هذا الطلب</p>
          </div>
        </div>
      </div>
    );
  }

  if (order.status === "completed" || order.status === "archived") {
    return (
      <SmartRatingScreen
        merchantId={merchantId}
        storeName={merchant?.storeName || ""}
        googleMapsReviewUrl={merchant?.googleMapsReviewUrl}
        orderNumber={order.orderNumber}
        diningType={order.diningType}
        customerName={order.customerName}
        driverPhone={merchant?.driverPhone}
        orderId={order.id}
      />
    );
  }

  const shortNum = getShort3Digit(order);
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-between py-10 px-5 text-center"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      data-testid="tracking-preparing-screen"
    >
      <div className="w-full">
        <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase mb-1">DIGITAL PAGER</p>
        {merchant && <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-5">
        <BuzzerCircle orderNumber={shortNum} active={false} />
        <div>
          <p className="text-red-400 text-2xl font-black" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-preparing-message">
            جاري التحضير 👨‍🍳
          </p>
          <p className="text-white/40 text-sm mt-1 text-center">Your order is being prepared</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-white/20 text-[10px]" data-testid="text-live-status">Live</span>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        {isOnlineOrder && (
          <button
            onClick={() => { window.location.href = `/receipt/${orderId}?m=${merchantId}`; }}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
            style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="button-view-receipt-preparing"
          >
            <span className="text-lg flex-shrink-0">📄</span>
            <span className="text-red-400/90 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>عرض إيصال الطلب</span>
          </button>
        )}

        <button
          onClick={handleShareTracking}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
          style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
          data-testid="button-share-tracking"
        >
          {navigator.share ? (
            <Share2 className="w-5 h-5 text-red-400/80 flex-shrink-0" />
          ) : (
            <Copy className="w-5 h-5 text-red-400/80 flex-shrink-0" />
          )}
          <span className="text-red-400/90 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>مشاركة مع الأحباب 🔗</span>
        </button>

        {!bellPrimed ? (
          <button
            onClick={handlePrimeBell}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-amber-900/15 to-amber-950/30 active:scale-[0.97] transition-all duration-200 animate-pulse"
            style={{ boxShadow: "0 0 20px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="button-prime-bell"
          >
            <span className="text-2xl">🔔</span>
            <span className="text-amber-400 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              ودك ننبهك بصوت الجرس؟ 🔔
            </span>
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 animate-in fade-in duration-500">
            <span className="text-base">✅</span>
            <span className="text-emerald-400/80 text-sm font-medium" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              تم تفعيل التنبيه — سنرسل لك صوت عند الجاهزية
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
