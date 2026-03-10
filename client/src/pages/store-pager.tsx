import { useState, useEffect, useRef, useCallback, TouchEvent as ReactTouchEvent } from "react";
import { useParams, useLocation } from "wouter";
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db, requestFCMToken } from "@/lib/firebase";
import type { Merchant, Pager } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Store, AlertTriangle, Bell, BellOff, CheckCircle, Share2, MapPin, Copy, Send, Loader2, Navigation, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWakeLock } from "@/hooks/use-wake-lock";
import IosInstallPrompt from "@/components/ios-install-prompt";

function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const threshold = 80;

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    if (window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    if (startYRef.current === 0 || refreshing) return;
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff * 0.5, 120));
      setPulling(diff * 0.5 >= threshold);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pulling && !refreshing) {
      setRefreshing(true);
      setPullDistance(60);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    setPulling(false);
    startYRef.current = 0;
  }, [pulling, refreshing, onRefresh]);

  return { pullDistance, refreshing, pulling, handleTouchStart, handleTouchMove, handleTouchEnd };
}


function StarRatingWidget({
  storeId,
  googleMapsReviewUrl,
  variant = "dark",
  smartRatingEnabled = true,
}: {
  storeId: string;
  googleMapsReviewUrl: string;
  variant?: "dark" | "light";
  smartRatingEnabled?: boolean;
}) {
  const { toast } = useToast();
  const [selectedStars, setSelectedStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [phase, setPhase] = useState<"rating" | "feedback" | "thankyou" | "redirecting">("rating");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDark = variant === "dark";

  function handleStarClick(star: number) {
    setSelectedStars(star);

    if (smartRatingEnabled && star >= 4) {
      setPhase("redirecting");
      setTimeout(async () => {
        try {
          await fetch(`/api/track/gmaps/${storeId}`, { method: "POST" });
        } catch {}
        window.open(googleMapsReviewUrl, "_blank");
        setPhase("thankyou");
      }, 1500);
    } else {
      setPhase("feedback");
    }
  }

  async function handleSubmitFeedback() {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: storeId,
          stars: selectedStars,
          comment: comment.trim(),
          timestamp: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setPhase("thankyou");
      } else {
        toast({ title: "خطأ", description: "Failed to submit feedback", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "Failed to submit feedback", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const starElements = (
    <div className="flex items-center justify-center gap-2" data-testid="star-rating-widget">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleStarClick(star)}
          onMouseEnter={() => setHoveredStar(star)}
          onMouseLeave={() => setHoveredStar(0)}
          className="transition-transform"
          data-testid={`button-star-${star}`}
        >
          <Star
            className={`w-10 h-10 transition-colors ${
              star <= (hoveredStar || selectedStars)
                ? "fill-yellow-400 text-yellow-400"
                : isDark
                  ? "text-zinc-600"
                  : "text-white/40"
            }`}
          />
        </button>
      ))}
    </div>
  );

  if (phase === "thankyou") {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto animate-in fade-in duration-500">
        <CheckCircle className={`w-12 h-12 ${isDark ? "text-green-500" : "text-white"}`} />
        <p className={`text-lg font-bold ${isDark ? "text-white" : "text-white"}`} dir="rtl" data-testid="text-feedback-thankyou">
          شكراً لتقييمك!
        </p>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-white/70"}`} data-testid="text-feedback-thankyou-en">
          Thank you for your feedback!
        </p>
      </div>
    );
  }

  if (phase === "redirecting") {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto animate-in fade-in duration-500">
        {starElements}
        <div className="mt-2 flex flex-col items-center gap-2">
          <CheckCircle className={`w-10 h-10 ${isDark ? "text-green-500" : "text-white"}`} />
          <p className={`text-base font-bold ${isDark ? "text-white" : "text-white"}`} dir="rtl" data-testid="text-rating-thankyou">
            شكراً لك! جاري تحويلك لجوجل ماب...
          </p>
          <p className={`text-xs ${isDark ? "text-gray-400" : "text-white/70"}`} data-testid="text-rating-redirect">
            Thank you! Redirecting to Google Maps...
          </p>
          <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-gray-400" : "text-white/60"}`} />
        </div>
      </div>
    );
  }

  if (phase === "feedback") {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto animate-in fade-in duration-500">
        {starElements}
        <p
          className={`text-sm font-medium text-center mt-1 ${isDark ? "text-gray-300" : "text-white/90"}`}
          dir="rtl"
          data-testid="text-feedback-prompt"
        >
          نأسف لذلك! أخبرنا ما الذي يمكننا تحسينه
        </p>
        <p className={`text-xs text-center ${isDark ? "text-gray-500" : "text-white/60"}`} data-testid="text-feedback-prompt-en">
          We're sorry! Please tell us what went wrong so we can fix it.
        </p>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="اكتب ملاحظاتك هنا... / Write your feedback here..."
          className={`w-full text-sm resize-none ${
            isDark
              ? "bg-black border-zinc-700 text-white placeholder:text-gray-600"
              : "bg-white/10 border-white/20 text-white placeholder:text-white/40"
          }`}
          rows={3}
          dir="rtl"
          data-testid="textarea-feedback"
        />
        <Button
          size="lg"
          onClick={handleSubmitFeedback}
          disabled={!comment.trim() || submitting}
          className={`w-full font-bold text-base ${
            isDark
              ? "bg-red-600 text-white"
              : "bg-white/20 text-white border border-white/30 backdrop-blur-sm"
          }`}
          data-testid="button-submit-feedback"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 me-2 animate-spin" />
          ) : (
            <Send className="w-5 h-5 me-2" />
          )}
          <span dir="rtl">{submitting ? "جاري الإرسال..." : "إرسال الملاحظات"}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
      <p className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-white/90"}`} dir="rtl" data-testid="text-rate-prompt">
        كيف كانت تجربتك؟
      </p>
      <p className={`text-xs ${isDark ? "text-gray-500" : "text-white/60"}`} data-testid="text-rate-prompt-en">
        Rate your experience
      </p>
      {starElements}
    </div>
  );
}

function ShareAndReviewButtons({
  storeId,
  storeName,
  googleMapsReviewUrl,
  variant = "dark",
  smartRatingEnabled = true,
}: {
  storeId: string;
  storeName: string;
  googleMapsReviewUrl: string;
  variant?: "dark" | "light";
  smartRatingEnabled?: boolean;
}) {
  const { toast } = useToast();

  async function handleShare() {
    const shareUrl = `${window.location.origin}/s/${storeId}`;
    const shareData = {
      title: storeName,
      text: `Check out ${storeName} - Digital Pager`,
      url: shareUrl,
    };

    try {
      await fetch(`/api/track/share/${storeId}`, { method: "POST" });
    } catch {}

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          toast({ title: "تم نسخ الرابط", description: "Link copied to clipboard" });
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "تم نسخ الرابط", description: "Link copied to clipboard" });
      } catch {
        toast({ title: "خطأ", description: "Could not copy link", variant: "destructive" });
      }
    }
  }

  const isDark = variant === "dark";

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
      <Button
        size="lg"
        onClick={handleShare}
        className={`w-full font-bold text-base ${
          isDark
            ? "bg-zinc-800 text-white border border-zinc-700"
            : "bg-white/20 text-white border border-white/30 backdrop-blur-sm"
        }`}
        data-testid="button-share"
      >
        <Share2 className="w-5 h-5 me-2" />
        <span dir="rtl">شارك مع أصدقائك</span>
      </Button>
      {googleMapsReviewUrl && (
        <StarRatingWidget
          storeId={storeId}
          googleMapsReviewUrl={googleMapsReviewUrl}
          variant={variant}
          smartRatingEnabled={smartRatingEnabled}
        />
      )}
    </div>
  );
}

function PagerDevice({ orderNumber, isReady }: { orderNumber: string; isReady: boolean }) {
  const leds = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 360) / 12 - 90;
    const rad = (angle * Math.PI) / 180;
    const r = 47;
    const cx = 50 + r * Math.cos(rad);
    const cy = 50 + r * Math.sin(rad);
    return { cx, cy, delay: `${(i * 0.2).toFixed(1)}s` };
  });

  return (
    <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto" data-testid="pager-device">
      <div
        className={`absolute inset-0 rounded-full ${isReady ? "pager-neon-pulse" : ""}`}
        style={{
          background: "radial-gradient(circle at center, rgba(30,0,0,0.6) 30%, rgba(0,0,0,0.9) 70%)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: "8%",
          background: "radial-gradient(circle at 40% 35%, #1a1a1a 0%, #0a0a0a 50%, #000 100%)",
          boxShadow: "inset 0 2px 20px rgba(0,0,0,0.8), inset 0 -1px 10px rgba(255,255,255,0.03), 0 0 30px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: "15%",
          background: "radial-gradient(circle at 45% 40%, #141414 0%, #080808 60%, #000 100%)",
          boxShadow: "inset 0 3px 15px rgba(0,0,0,0.9), 0 0 1px rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.02)",
        }}
      />
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ filter: isReady ? "url(#led-glow-ready)" : "url(#led-glow)" }}
      >
        <defs>
          <filter id="led-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="led-glow-ready" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {leds.map((led, i) => (
          <circle
            key={i}
            cx={led.cx}
            cy={led.cy}
            r={isReady ? "2.2" : "1.8"}
            fill="#ff0000"
            className={isReady ? "pager-led-ready" : "pager-led-waiting"}
            style={{ animationDelay: led.delay }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-dseg7 text-red-500 tracking-wider select-none"
          style={{
            fontSize: orderNumber.length > 3 ? "3rem" : orderNumber.length > 2 ? "3.5rem" : "4.5rem",
            textShadow: "0 0 20px rgba(255,0,0,0.6), 0 0 40px rgba(255,0,0,0.3), 0 0 60px rgba(255,0,0,0.15)",
            letterSpacing: "0.08em",
          }}
          data-testid="text-pager-order-number"
        >
          {orderNumber}
        </span>
      </div>
    </div>
  );
}

function WaitingScreen({ orderNumber, storeName, storeId, googleMapsReviewUrl, onRefresh, pullProps, smartRatingEnabled = true }: {
  orderNumber: string;
  storeName: string;
  storeId: string;
  googleMapsReviewUrl: string;
  onRefresh?: () => Promise<void>;
  pullProps?: ReturnType<typeof usePullToRefresh>;
  smartRatingEnabled?: boolean;
}) {
  return (
    <div
      className="h-[100dvh] flex flex-col items-center justify-between py-8 px-5 text-center overflow-hidden touch-pan-y"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      onTouchStart={pullProps?.handleTouchStart}
      onTouchMove={pullProps?.handleTouchMove}
      onTouchEnd={pullProps?.handleTouchEnd}
      data-testid="pager-waiting-screen"
    >
      {pullProps && pullProps.pullDistance > 0 && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform z-50"
          style={{ transform: `translateY(${pullProps.pullDistance - 40}px)` }}
        >
          <RefreshCw className={`w-5 h-5 text-red-500 ${pullProps.refreshing ? "animate-spin" : ""} ${pullProps.pulling ? "text-red-400" : "text-red-500/40"}`} />
        </div>
      )}

      <div className="w-full flex-shrink-0">
        <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase mb-0.5" data-testid="text-pager-branding">
          DIGITAL PAGER
        </p>
        <h2
          className="text-white/90 text-[24px] font-bold"
          style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
          data-testid="text-store-name-pager"
        >
          {storeName}
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <PagerDevice orderNumber={orderNumber} isReady={false} />

        <div className="mt-6">
          <p
            className="text-red-400 text-lg font-bold"
            dir="rtl"
            data-testid="text-waiting-message"
          >
            جاري التحضير...
          </p>
          <p className="text-white/50 text-sm mt-1.5" data-testid="text-waiting-hint">
            We'll buzz you!
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-2 flex-shrink-0">
        <ShareAndReviewButtons
          storeId={storeId}
          storeName={storeName}
          googleMapsReviewUrl={googleMapsReviewUrl}
          variant="dark"
          smartRatingEnabled={smartRatingEnabled}
        />
      </div>

      <IosInstallPrompt />
    </div>
  );
}

function NotifiedScreen({
  orderNumber,
  storeName,
  storeId,
  googleMapsReviewUrl,
  showReview,
  alertActive,
  onStopAlert,
  smartRatingEnabled = true,
}: {
  orderNumber: string;
  storeName: string;
  storeId: string;
  googleMapsReviewUrl: string;
  showReview: boolean;
  alertActive: boolean;
  onStopAlert: () => void;
  smartRatingEnabled?: boolean;
}) {
  return (
    <div
      className={`h-[100dvh] flex flex-col items-center justify-between py-8 px-5 text-center overflow-hidden ${alertActive ? "pager-neon-pulse" : ""}`}
      style={{ background: alertActive
        ? "linear-gradient(180deg, #0a0000 0%, #1a0000 30%, #0d0000 70%, #000 100%)"
        : "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)"
      }}
      data-testid="pager-notified-screen"
    >
      <div className="w-full">
        <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase mb-0.5" data-testid="text-pager-branding-notified">
          DIGITAL PAGER
        </p>
        <h2
          className="text-white/90 text-[24px] font-bold"
          style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
          data-testid="text-notified-store"
        >
          {storeName}
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center -mt-4">
        <PagerDevice orderNumber={orderNumber} isReady={true} />

        <div className="mt-8">
          <p
            className="text-white text-2xl font-black tracking-wide"
            data-testid="text-notified-message"
          >
            ORDER READY!
          </p>
          <p
            className="text-red-400 text-xl font-bold mt-1"
            dir="rtl"
            data-testid="text-notified-message-ar"
          >
            طلبك جاهز!
          </p>
          <p className="text-white/50 text-sm mt-3" data-testid="text-notified-hint">
            Please proceed to the counter
          </p>
          <p className="text-white/40 text-sm mt-0.5" dir="rtl">
            تفضل بالاستلام من الكاونتر
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        {alertActive && (
          <Button
            size="lg"
            onClick={onStopAlert}
            className="w-full h-14 font-bold text-base bg-transparent border-2 border-red-600 text-white hover:bg-red-600/20 rounded-xl"
            style={{ boxShadow: "0 0 20px rgba(255,0,0,0.2), inset 0 0 20px rgba(255,0,0,0.05)" }}
            data-testid="button-stop-alert"
          >
            <BellOff className="w-5 h-5 me-2" />
            <span dir="rtl">إيقاف التنبيه</span>
            <span className="mx-1">-</span>
            <span>Stop Alert</span>
          </Button>
        )}

        {!alertActive && googleMapsReviewUrl && (
          <a
            href={googleMapsReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-14 font-bold text-base bg-transparent border-2 border-red-600/80 text-white hover:bg-red-600/20 rounded-xl transition-all"
            style={{ boxShadow: "0 0 20px rgba(255,0,0,0.15), inset 0 0 20px rgba(255,0,0,0.03)" }}
            data-testid="button-get-directions"
            onClick={() => {
              fetch(`/api/track/gmaps/${storeId}`, { method: "POST" }).catch(() => {});
            }}
          >
            <MapPin className="w-5 h-5 text-red-500" />
            <span>Get Directions</span>
            <span className="mx-1">|</span>
            <span dir="rtl">الاتجاهات</span>
          </a>
        )}

        {!alertActive && showReview && (
          <div className="pt-2 animate-in slide-in-from-bottom duration-700">
            <ShareAndReviewButtons
              storeId={storeId}
              storeName={storeName}
              googleMapsReviewUrl={googleMapsReviewUrl}
              variant="dark"
              smartRatingEnabled={smartRatingEnabled}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function OrderSelectionScreen({
  merchant,
  storeId,
  onSelectOrder,
}: {
  merchant: Merchant;
  storeId: string;
  onSelectOrder: (orderNumber: string) => void;
}) {
  const [activeOrders, setActiveOrders] = useState<{ docId: string; orderNumber: string }[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<string | null>(null);

  useEffect(() => {
    const pagersRef = collection(db, "merchants", storeId, "pagers");
    const q = query(pagersRef, where("status", "==", "waiting"));
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({
        docId: d.id,
        orderNumber: String(d.data().orderNumber),
      }));
      orders.sort((a, b) => {
        const na = parseInt(a.orderNumber, 10);
        const nb = parseInt(b.orderNumber, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.orderNumber.localeCompare(b.orderNumber);
      });
      setActiveOrders(orders);
      setOrdersLoading(false);
      setOrdersError(false);
    }, () => {
      setOrdersLoading(false);
      setOrdersError(true);
    });
    return () => unsub();
  }, [storeId]);

  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      data-testid="order-selection-screen"
    >
      <div className="flex-shrink-0 pt-8 pb-4 px-5 text-center">
        {merchant.logoUrl ? (
          <img
            src={merchant.logoUrl}
            alt={merchant.storeName}
            className="w-16 h-16 rounded-full object-cover border-2 border-red-600/30 mx-auto mb-3"
            style={{ boxShadow: "0 0 20px rgba(255,0,0,0.15)" }}
            data-testid="img-store-logo"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full bg-black border-2 border-red-600/30 flex items-center justify-center mx-auto mb-3"
            style={{ boxShadow: "0 0 20px rgba(255,0,0,0.15)" }}
          >
            <Store className="w-8 h-8 text-red-500" />
          </div>
        )}
        <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase mb-1">DIGITAL PAGER</p>
        <h1 className="text-white text-[26px] font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-store-name-entry">
          {merchant.storeName}
        </h1>
        <p className="text-white/40 text-sm mt-2" dir="rtl">اختر رقم طلبك</p>
        <p className="text-white/30 text-xs mt-0.5">Select your order number</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {ordersLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ordersError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="orders-error-state">
            <AlertTriangle className="w-10 h-10 text-red-500/50 mb-4" />
            <p className="text-white/50 text-sm" dir="rtl">حدث خطأ في تحميل الطلبات</p>
            <p className="text-white/30 text-xs mt-1">Could not load orders. Please refresh the page.</p>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-orders-state">
            <div
              className="w-20 h-20 rounded-full bg-red-600/5 border border-red-600/15 flex items-center justify-center mb-5"
              style={{ boxShadow: "0 0 30px rgba(255,0,0,0.05)" }}
            >
              <Bell className="w-9 h-9 text-red-500/40" />
            </div>
            <p className="text-white/60 text-base font-semibold mb-1" dir="rtl">
              في انتظار طلبات جديدة...
            </p>
            <p className="text-white/40 text-sm">
              Waiting for new orders to appear...
            </p>
            <p className="text-white/25 text-xs mt-4 max-w-[250px]" dir="rtl">
              يرجى مراجعة الكاونتر إذا كنت قد طلبت للتو
            </p>
            <p className="text-white/20 text-xs mt-1 max-w-[250px]">
              Please check with the counter if you just ordered
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3" data-testid="order-grid">
            {activeOrders.map((order) => (
              <button
                key={order.docId}
                onClick={() => setConfirmOrder(order.orderNumber)}
                className="aspect-square rounded-2xl border border-red-600/20 bg-black/60 flex items-center justify-center transition-all active:scale-95 hover:border-red-500/50 hover:bg-red-600/5"
                style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 10px rgba(0,0,0,0.4)" }}
                data-testid={`button-order-${order.orderNumber}`}
              >
                <span
                  className="font-dseg7 text-red-500 select-none"
                  style={{
                    fontSize: order.orderNumber.length > 3 ? "1.5rem" : order.orderNumber.length > 2 ? "2rem" : "2.5rem",
                    textShadow: "0 0 15px rgba(255,0,0,0.4), 0 0 30px rgba(255,0,0,0.2)",
                  }}
                >
                  {order.orderNumber}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {confirmOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          onClick={() => setConfirmOrder(null)}
          data-testid="confirm-order-modal"
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-red-600/30 bg-[#0a0a0a] p-6 text-center"
            style={{ boxShadow: "0 0 60px rgba(255,0,0,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-24 h-24 rounded-full border border-red-600/20 bg-black mx-auto mb-5 flex items-center justify-center"
              style={{ boxShadow: "0 0 30px rgba(255,0,0,0.1), inset 0 2px 15px rgba(0,0,0,0.8)" }}
            >
              <span
                className="font-dseg7 text-red-500"
                style={{
                  fontSize: confirmOrder.length > 3 ? "1.8rem" : "2.5rem",
                  textShadow: "0 0 20px rgba(255,0,0,0.5), 0 0 40px rgba(255,0,0,0.25)",
                }}
              >
                {confirmOrder}
              </span>
            </div>

            <p className="text-white text-lg font-bold mb-1" dir="rtl" data-testid="text-confirm-title">
              تأكيد الطلب #{confirmOrder}
            </p>
            <p className="text-white/60 text-sm mb-6" data-testid="text-confirm-title-en">
              Confirm Order #{confirmOrder}
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => onSelectOrder(confirmOrder)}
                className="w-full h-14 text-base font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl"
                style={{ boxShadow: "0 0 25px rgba(255,0,0,0.2)" }}
                data-testid="button-confirm-yes"
              >
                <CheckCircle className="w-5 h-5 me-2" />
                <span dir="rtl">نعم، هذا طلبي</span>
              </Button>
              <Button
                onClick={() => setConfirmOrder(null)}
                variant="outline"
                className="w-full h-12 text-sm font-medium border-white/10 text-white/60 hover:bg-white/5 hover:text-white rounded-xl"
                data-testid="button-confirm-cancel"
              >
                <span dir="rtl">إلغاء</span>
                <span className="mx-1">|</span>
                <span>Cancel</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompletedScreen({ storeId, storeName, googleMapsReviewUrl, navigate, smartRatingEnabled = true }: { storeId: string; storeName: string; googleMapsReviewUrl?: string; navigate: (to: string) => void; smartRatingEnabled?: boolean }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(`/s/${storeId}?new=true`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [storeId, navigate]);

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }} data-testid="pager-completed-screen">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
        <div className="w-24 h-24 rounded-full border-2 border-green-500/30 bg-green-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(34,197,94,0.12)" }}>
          <CheckCircle className="w-12 h-12 text-green-500/80" />
        </div>
        <div>
          <p className="text-green-400 text-2xl font-bold" data-testid="text-pager-completed">Thank You!</p>
          <p className="text-green-400/80 text-xl font-bold mt-2" dir="rtl" data-testid="text-pager-completed-ar">
            شكراً لزيارتك، نتمنى لك يوماً سعيداً!
          </p>
          <p className="text-white/50 text-sm mt-4">We hope to see you again soon!</p>
          <p className="text-white/40 text-sm mt-0.5" dir="rtl">نراك قريباً!</p>
        </div>
        {storeName && (
          <div className="mt-3">
            <p className="text-white/40 text-[11px] font-medium tracking-[0.3em] uppercase mb-0.5">DIGITAL PAGER</p>
            <p className="text-white/60 text-lg font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{storeName}</p>
          </div>
        )}
        {smartRatingEnabled && googleMapsReviewUrl && (
          <a
            href={googleMapsReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mt-2 px-6 py-3 font-bold text-sm bg-transparent border-2 border-red-600/60 text-white hover:bg-red-600/20 rounded-xl transition-all"
            data-testid="button-review-after-complete"
          >
            <MapPin className="w-4 h-4 text-red-500" />
            <span>Rate Us</span>
            <span className="mx-1">|</span>
            <span dir="rtl">قيّمنا</span>
          </a>
        )}
        <p className="text-white/20 text-xs mt-4" data-testid="text-redirect-countdown">
          Redirecting in {countdown}s...
        </p>
      </div>
    </div>
  );
}

export default function StorePagerPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const [, navigate] = useLocation();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pagerStatus, setPagerStatus] = useState<"waiting" | "notified" | "completed" | "archived">("waiting");
  const [alertActive, setAlertActive] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [smartRatingEnabled, setSmartRatingEnabled] = useState(true);
  const hasPlayedNotification = useRef(false);
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  const alertVibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, requestWakeLock, releaseWakeLock } = useWakeLock(false);

  function unlockAudio() {
    try {
      if (!alertSoundRef.current) {
        alertSoundRef.current = new Audio("/alert.mp3");
        alertSoundRef.current.loop = true;
        alertSoundRef.current.volume = 1.0;
        alertSoundRef.current.addEventListener("error", () => {
          console.warn("[StorePager] Alert sound file failed to load — check /alert.mp3");
        });
      }
      alertSoundRef.current.muted = true;
      alertSoundRef.current.play().then(() => {
        alertSoundRef.current!.pause();
        alertSoundRef.current!.muted = false;
        alertSoundRef.current!.currentTime = 0;
        console.log("[StorePager] Audio unlocked successfully");
      }).catch((e) => {
        alertSoundRef.current!.muted = false;
        console.warn("[StorePager] Audio unlock failed:", e.message);
      });
    } catch (e) {
      console.warn("[StorePager] Audio unlock error:", e);
    }
  }

  function triggerAlert() {
    if (hasPlayedNotification.current) return;
    hasPlayedNotification.current = true;
    setAlertActive(true);
    setPagerStatus("notified");
    console.log("[StorePager] Attempting to play sound...");

    let playAttempts = 0;
    function attemptPlay() {
      playAttempts++;
      console.log(`[StorePager] Play attempt ${playAttempts}/3`);
      try {
        if (!alertSoundRef.current) {
          alertSoundRef.current = new Audio("/alert.mp3");
          alertSoundRef.current.loop = true;
          alertSoundRef.current.volume = 1.0;
          alertSoundRef.current.addEventListener("error", () => {
            console.warn("[StorePager] Alert sound file failed to load — check /alert.mp3");
          });
        }
        alertSoundRef.current.currentTime = 0;
        alertSoundRef.current.play().then(() => {
          console.log(`[StorePager] Sound playing on attempt ${playAttempts}`);
        }).catch((err) => {
          console.warn(`[StorePager] Play attempt ${playAttempts} failed:`, err.message);
          if (playAttempts < 3) {
            setTimeout(attemptPlay, 1000);
          }
        });
      } catch (err) {
        console.warn(`[StorePager] Play attempt ${playAttempts} error:`, err);
        if (playAttempts < 3) {
          setTimeout(attemptPlay, 1000);
        }
      }
    }
    attemptPlay();

    if ("vibrate" in navigator) {
      navigator.vibrate([500, 200, 500, 200, 800]);
      alertVibrationRef.current = setInterval(() => {
        navigator.vibrate([500, 200, 500, 200, 800]);
      }, 2200);
    }
    reviewTimerRef.current = setTimeout(() => {
      setShowReview(true);
    }, 2 * 60 * 1000);
  }

  function stopAlert() {
    if (alertSoundRef.current) {
      alertSoundRef.current.pause();
      alertSoundRef.current.currentTime = 0;
    }
    if (alertVibrationRef.current) {
      clearInterval(alertVibrationRef.current);
      alertVibrationRef.current = null;
    }
    if ("vibrate" in navigator) navigator.vibrate(0);
    setAlertActive(false);
  }

  useEffect(() => {
    return () => {
      if (alertSoundRef.current) { alertSoundRef.current.pause(); alertSoundRef.current.currentTime = 0; }
      if (alertVibrationRef.current) clearInterval(alertVibrationRef.current);
      if ("vibrate" in navigator) navigator.vibrate(0);
    };
  }, []);

  const sessionKey = storeId ? `dp-session-${storeId}` : "";

  useEffect(() => {
    if (!storeId) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("new") === "true") {
      if (sessionKey) localStorage.removeItem(sessionKey);
      stopAlert();
      setSubmitted(false);
      setOrderNumber("");
      setPagerStatus("waiting");
      setAlertActive(false);
      setShowReview(false);
      hasPlayedNotification.current = false;
      releaseWakeLock();
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
  }, [storeId, sessionKey]);

  useEffect(() => {
    if (!sessionKey || !storeId) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("new") === "true") return;
    const saved = localStorage.getItem(sessionKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.orderNumber || !parsed.timestamp) {
        localStorage.removeItem(sessionKey);
        return;
      }
      const fourHours = 4 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp >= fourHours) {
        localStorage.removeItem(sessionKey);
        return;
      }
      const pagersRef = collection(db, "merchants", storeId, "pagers");
      const q = query(pagersRef, where("orderNumber", "==", parsed.orderNumber), orderBy("createdAt", "desc"), limit(1));
      getDocs(q).then((snap) => {
        if (snap.empty) {
          localStorage.removeItem(sessionKey);
          return;
        }
        const pager = snap.docs[0].data() as Pager;
        if (pager.status === "completed" || pager.status === "archived" || pager.status === "cancelled") {
          localStorage.removeItem(sessionKey);
          return;
        }
        setOrderNumber(parsed.orderNumber);
        setSubmitted(true);
        setPagerStatus(pager.status === "notified" ? "notified" : "waiting");
      }).catch(() => {
        localStorage.removeItem(sessionKey);
      });
    } catch {
      localStorage.removeItem(sessionKey);
    }
  }, [sessionKey, storeId]);

  const handlePullRefresh = useCallback(async () => {
    if (!storeId || !orderNumber || !submitted) return;
    const pagersRef = collection(db, "merchants", storeId, "pagers");
    const q = query(
      pagersRef,
      where("orderNumber", "==", orderNumber),
      where("status", "in", ["waiting", "notified"])
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const pager = snap.docs[0].data() as Pager;
      if (pager.status === "notified") {
        setPagerStatus("notified");
      }
    }
  }, [storeId, orderNumber, submitted]);

  const pullProps = usePullToRefresh(handlePullRefresh);

  useEffect(() => {
    async function fetchStore() {
      if (!storeId) return;
      try {
        const merchantDoc = await getDoc(doc(db, "merchants", storeId));
        if (merchantDoc.exists()) {
          const data = merchantDoc.data() as Merchant;
          if (data.status === "approved" && data.subscriptionStatus === "active") {
            setMerchant(data);
            fetch(`/api/merchant-features/${storeId}`)
              .then(r => r.ok ? r.json() : null)
              .then(d => { if (d?.features) setSmartRatingEnabled(d.features.smartRatingEnabled !== false); })
              .catch(() => {});
          } else if (data.status === "approved" && data.subscriptionStatus !== "active") {
            setServiceUnavailable(true);
          } else {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    const scanKey = `dp-qrscan-${storeId}`;
    const lastScan = localStorage.getItem(scanKey);
    const oneHour = 60 * 60 * 1000;
    if (lastScan && Date.now() - parseInt(lastScan) < oneHour) return;
    localStorage.setItem(scanKey, String(Date.now()));
    fetch(`/api/track/qrscan/${storeId}`, { method: "POST" }).catch(() => {});
  }, [storeId]);

  useEffect(() => {
    if (!submitted || !storeId || !orderNumber) return;

    const pagersRef = collection(db, "merchants", storeId, "pagers");
    const q = query(
      pagersRef,
      where("orderNumber", "==", orderNumber),
      where("status", "in", ["waiting", "notified"])
    );

    let prevStatus: string | null = null;
    let isFirstSnapshot = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        console.log("[StorePager] Snapshot empty — pager completed/removed");
        if (!isFirstSnapshot) {
          stopAlert();
          setPagerStatus("archived");
          if (sessionKey) localStorage.removeItem(sessionKey);
        }
        isFirstSnapshot = false;
        return;
      }

      const pagerDoc = snapshot.docs[0];
      const pager = pagerDoc.data() as Pager;
      const currentStatus = pager.status;
      console.log("[StorePager] Current Status:", currentStatus);
      console.log("[StorePager] Previous Status:", prevStatus);

      if (isFirstSnapshot) {
        prevStatus = currentStatus;
        isFirstSnapshot = false;
        if (currentStatus === "notified") {
          setPagerStatus("notified");
          console.log("[StorePager] Page loaded with notified status — playing alert");
          triggerAlert();
        } else {
          setPagerStatus("waiting");
        }
        return;
      }

      if (currentStatus === "notified") {
        setPagerStatus("notified");
        if (prevStatus !== "notified") {
          console.log("[StorePager] Status changed to notified (ready) — playing alert");
          hasPlayedNotification.current = false;
          triggerAlert();
        }
      } else if (currentStatus === "waiting") {
        setPagerStatus("waiting");
        hasPlayedNotification.current = false;
      }

      prevStatus = currentStatus;
    }, (error) => {
      console.error("Pager listener error:", error);
    });

    return () => unsubscribe();
  }, [submitted, storeId, orderNumber, sessionKey]);

  useEffect(() => {
    return () => {
      if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
    };
  }, []);

  function handleSelectOrder(selectedOrderNumber: string) {
    unlockAudio();
    setOrderNumber(selectedOrderNumber);
    setSubmitted(true);
    setPagerStatus("waiting");
    hasPlayedNotification.current = false;
    setShowReview(false);
    setAlertActive(false);
    requestWakeLock();

    if (sessionKey) {
      localStorage.setItem(sessionKey, JSON.stringify({
        orderNumber: selectedOrderNumber,
        timestamp: Date.now(),
      }));
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    if ("Notification" in window && Notification.permission === "granted" && storeId) {
      (async () => {
        try {
          const token = await requestFCMToken();
          if (token) {
            const pagersRef = collection(db, "merchants", storeId, "pagers");
            const q2 = query(
              pagersRef,
              where("orderNumber", "==", selectedOrderNumber),
              where("status", "in", ["waiting", "notified"])
            );
            const unsub = onSnapshot(q2, async (snap) => {
              if (!snap.empty) {
                const pagerDoc = snap.docs[0];
                try {
                  await updateDoc(pagerDoc.ref, { fcmToken: token });
                } catch {}
                unsub();
              }
            });
            setTimeout(() => { try { unsub(); } catch {} }, 30000);
          }
        } catch (e) {
          console.warn("FCM setup failed:", e);
        }
      })();
    }
  }

  function handleStopAlert() {
    stopAlert();
    releaseWakeLock();
    if (sessionKey) {
      localStorage.removeItem(sessionKey);
    }
  }

  let content: JSX.Element;

  if (loading) {
    content = (
      <div className="h-[100dvh] flex items-center justify-center overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/30 text-xs tracking-[0.3em] uppercase">DIGITAL PAGER</span>
        </div>
      </div>
    );
  } else if (serviceUnavailable) {
    content = (
      <div className="h-[100dvh] bg-black flex items-center justify-center p-6 overflow-hidden">
        <Card className="w-full max-w-sm border-red-600/20 bg-zinc-950">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2" dir="rtl" data-testid="text-service-unavailable">
              الخدمة غير متاحة مؤقتاً
            </h2>
            <p className="text-white text-sm mb-1" data-testid="text-service-unavailable-en">
              Service Temporarily Unavailable
            </p>
            <p className="text-gray-400 text-sm mt-4" dir="rtl" data-testid="text-service-unavailable-message">
              هذه الخدمة غير متاحة حالياً. يرجى التواصل مع المنشأة مباشرة.
            </p>
            <p className="text-gray-500 text-xs mt-2" data-testid="text-service-unavailable-message-en">
              This service is currently unavailable. Please contact the establishment directly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  } else if (notFound || !merchant) {
    content = (
      <div className="h-[100dvh] bg-black flex items-center justify-center p-6 overflow-hidden">
        <Card className="w-full max-w-sm border-red-600/20 bg-black">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2" dir="rtl" data-testid="text-store-not-found">
              المتجر غير موجود
            </h2>
            <p className="text-gray-400 text-sm" data-testid="text-store-not-found-en">
              Store not found or currently unavailable.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  } else if (submitted && (pagerStatus === "completed" || pagerStatus === "archived")) {
    if (sessionKey) localStorage.removeItem(sessionKey);
    content = (
      <CompletedScreen storeId={storeId!} storeName={merchant?.storeName || ""} googleMapsReviewUrl={merchant?.googleMapsReviewUrl} navigate={navigate} smartRatingEnabled={smartRatingEnabled} />
    );
  } else if (submitted && pagerStatus === "notified") {
    content = (
      <NotifiedScreen
        orderNumber={orderNumber}
        storeName={merchant.storeName}
        storeId={storeId!}
        googleMapsReviewUrl={merchant.googleMapsReviewUrl}
        showReview={showReview}
        alertActive={alertActive}
        onStopAlert={handleStopAlert}
        smartRatingEnabled={smartRatingEnabled}
      />
    );
  } else if (submitted && pagerStatus === "waiting") {
    content = (
      <WaitingScreen
        orderNumber={orderNumber}
        storeName={merchant.storeName}
        storeId={storeId!}
        googleMapsReviewUrl={merchant.googleMapsReviewUrl}
        onRefresh={handlePullRefresh}
        pullProps={pullProps}
        smartRatingEnabled={smartRatingEnabled}
      />
    );
  } else if (merchant) {
    content = (
      <OrderSelectionScreen
        merchant={merchant}
        storeId={storeId!}
        onSelectOrder={handleSelectOrder}
      />
    );
  } else {
    content = (
      <div className="h-[100dvh] bg-black flex items-center justify-center overflow-hidden">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return content;
}
