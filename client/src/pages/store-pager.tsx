import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db, requestFCMToken } from "@/lib/firebase";
import type { Merchant, Pager } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Store, AlertTriangle, Bell, BellOff, CheckCircle, Share2, MapPin, Copy, Send, Loader2, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWakeLock } from "@/hooks/use-wake-lock";
import IosInstallPrompt from "@/components/ios-install-prompt";

function useAlertSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  const unlock = useCallback(() => {
    if (audioUnlockedRef.current) return;
    try {
      const audio = new Audio("/alert.mp3");
      audio.loop = true;
      audio.volume = 1.0;
      audio.load();
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
      audioRef.current = audio;
      audioUnlockedRef.current = true;
    } catch (e) {
      console.warn("Audio unlock failed:", e);
    }
  }, []);

  const play = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/alert.mp3");
        audioRef.current.loop = true;
        audioRef.current.volume = 1.0;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        console.warn("Audio play failed:", e);
      });
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  return { unlock, play, stop };
}

function useVibrationLoop() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (!("vibrate" in navigator)) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    navigator.vibrate([500, 200, 500, 200, 800]);
    intervalRef.current = setInterval(() => {
      navigator.vibrate([500, 200, 500, 200, 800]);
    }, 2200);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if ("vibrate" in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if ("vibrate" in navigator) navigator.vibrate(0);
    };
  }, []);

  return { start, stop };
}

function StarRatingWidget({
  storeId,
  googleMapsReviewUrl,
  variant = "dark",
}: {
  storeId: string;
  googleMapsReviewUrl: string;
  variant?: "dark" | "light";
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

    if (star >= 4) {
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
}: {
  storeId: string;
  storeName: string;
  googleMapsReviewUrl: string;
  variant?: "dark" | "light";
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

function WaitingScreen({ orderNumber, storeName, storeId, googleMapsReviewUrl }: { orderNumber: string; storeName: string; storeId: string; googleMapsReviewUrl: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between py-10 px-6 text-center"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
    >
      <div className="w-full">
        <h2
          className="text-white/90 text-sm font-bold tracking-[0.3em] uppercase mb-1"
          style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
          data-testid="text-pager-branding"
        >
          DIGITAL PAGER
        </h2>
        <p className="text-red-500/60 text-xs tracking-widest uppercase" data-testid="text-store-name-pager">
          {storeName}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center -mt-4">
        <PagerDevice orderNumber={orderNumber} isReady={false} />

        <div className="mt-8">
          <p
            className="text-red-400 text-lg font-bold"
            dir="rtl"
            data-testid="text-waiting-message"
          >
            جاري التحضير...
          </p>
          <p className="text-white/50 text-sm mt-2" data-testid="text-waiting-hint">
            We'll buzz you!
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <ShareAndReviewButtons
          storeId={storeId}
          storeName={storeName}
          googleMapsReviewUrl={googleMapsReviewUrl}
          variant="dark"
        />
      </div>
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
}: {
  orderNumber: string;
  storeName: string;
  storeId: string;
  googleMapsReviewUrl: string;
  showReview: boolean;
  alertActive: boolean;
  onStopAlert: () => void;
}) {
  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-between py-10 px-6 text-center ${alertActive ? "pager-neon-pulse" : ""}`}
      style={{ background: alertActive
        ? "linear-gradient(180deg, #0a0000 0%, #1a0000 30%, #0d0000 70%, #000 100%)"
        : "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)"
      }}
    >
      <div className="w-full">
        <h2
          className="text-white/90 text-sm font-bold tracking-[0.3em] uppercase mb-1"
          style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
          data-testid="text-pager-branding-notified"
        >
          DIGITAL PAGER
        </h2>
        <p className="text-red-500/60 text-xs tracking-widest uppercase" data-testid="text-notified-store">
          {storeName}
        </p>
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
          <>
            <Button
              size="lg"
              onClick={onStopAlert}
              className="w-full h-14 font-bold text-base bg-transparent border-2 border-red-600 text-white hover:bg-red-600/20 rounded-xl"
              style={{ boxShadow: "0 0 20px rgba(255,0,0,0.2), inset 0 0 20px rgba(255,0,0,0.05)" }}
              data-testid="button-stop-alert"
            >
              <BellOff className="w-5 h-5 me-2" />
              <span dir="rtl">تم الاستلام</span>
              <span className="mx-1">-</span>
              <span>Received</span>
            </Button>
          </>
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
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function StorePagerPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pagerStatus, setPagerStatus] = useState<"waiting" | "notified" | "completed">("waiting");
  const [alertActive, setAlertActive] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const hasPlayedNotification = useRef(false);
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { unlock, play, stop: stopSound } = useAlertSound();
  const { start: startVibration, stop: stopVibration } = useVibrationLoop();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, requestWakeLock, releaseWakeLock } = useWakeLock(false);

  useEffect(() => {
    async function fetchStore() {
      if (!storeId) return;
      try {
        const merchantDoc = await getDoc(doc(db, "merchants", storeId));
        if (merchantDoc.exists()) {
          const data = merchantDoc.data() as Merchant;
          if (data.status === "approved" && data.subscriptionStatus === "active") {
            setMerchant(data);
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;

      const pagerDoc = snapshot.docs[0];
      const pager = pagerDoc.data() as Pager;

      if (pager.status === "notified" && !hasPlayedNotification.current) {
        hasPlayedNotification.current = true;
        setPagerStatus("notified");
        setAlertActive(true);
        play();
        startVibration();

        reviewTimerRef.current = setTimeout(() => {
          setShowReview(true);
        }, 2 * 60 * 1000);
      } else if (pager.status === "waiting") {
        setPagerStatus("waiting");
      }
    }, (error) => {
      console.error("Pager listener error:", error);
    });

    return () => unsubscribe();
  }, [submitted, storeId, orderNumber, play, startVibration]);

  useEffect(() => {
    return () => {
      if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
    };
  }, []);

  async function handleUnlockAndSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    unlock();
    requestWakeLock();
    hasPlayedNotification.current = false;
    setPagerStatus("waiting");
    setShowReview(false);
    setAlertActive(false);
    setSubmitted(true);

    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {}
    }

    if ("Notification" in window && Notification.permission === "granted" && storeId) {
      try {
        const token = await requestFCMToken();
        if (token) {
          const pagersRef = collection(db, "merchants", storeId, "pagers");
          const q2 = query(
            pagersRef,
            where("orderNumber", "==", orderNumber.trim()),
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
    }
  }

  function handleStopAlert() {
    stopSound();
    stopVibration();
    setAlertActive(false);
    releaseWakeLock();
  }

  let content: JSX.Element;

  if (loading) {
    content = (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/30 text-xs tracking-[0.3em] uppercase">DIGITAL PAGER</span>
        </div>
      </div>
    );
  } else if (serviceUnavailable) {
    content = (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
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
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
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
      />
    );
  } else if (submitted && pagerStatus === "waiting") {
    content = (
      <>
        <WaitingScreen orderNumber={orderNumber} storeName={merchant.storeName} storeId={storeId!} googleMapsReviewUrl={merchant.googleMapsReviewUrl} />
        {wakeLockSupported && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-full px-3 py-1.5">
            <div className={`w-2 h-2 rounded-full ${wakeLockActive ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
            <span className="text-gray-400 text-[10px]">{wakeLockActive ? "Screen stays on" : "Requesting wake lock..."}</span>
          </div>
        )}
      </>
    );
  } else if (merchant) {
    content = (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 relative"
        style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            {merchant.logoUrl ? (
              <img
                src={merchant.logoUrl}
                alt={merchant.storeName}
                className="w-20 h-20 rounded-full object-cover border-2 border-red-600/30 mx-auto mb-4"
                style={{ boxShadow: "0 0 20px rgba(255,0,0,0.15)" }}
                data-testid="img-store-logo"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full bg-black border-2 border-red-600/30 flex items-center justify-center mx-auto mb-4"
                style={{ boxShadow: "0 0 20px rgba(255,0,0,0.15)" }}
              >
                <Store className="w-10 h-10 text-red-500" />
              </div>
            )}
            <h2 className="text-white/80 text-xs font-bold tracking-[0.3em] uppercase mb-3">DIGITAL PAGER</h2>
            <h1 className="text-white text-2xl font-bold mb-1" data-testid="text-store-name-entry">
              {merchant.storeName}
            </h1>
            <p className="text-white/40 text-sm mt-2" dir="rtl">
              أدخل رقم طلبك للانتظار
            </p>
            <p className="text-white/30 text-xs mt-1">
              Enter your order number to start waiting
            </p>
          </div>
          <form onSubmit={handleUnlockAndSubmit} className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="رقم الطلب / Order Number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="h-16 text-center text-2xl font-bold bg-black/80 border-red-600/30 text-red-400 placeholder:text-white/20 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
              style={{ boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)" }}
              dir="ltr"
              data-testid="input-order-number"
            />
            <Button
              type="submit"
              size="lg"
              disabled={!orderNumber.trim()}
              className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-30 rounded-xl"
              style={{ boxShadow: "0 0 30px rgba(255,0,0,0.2)" }}
              data-testid="button-submit-order"
            >
              <Bell className="w-5 h-5 me-2" />
              <span dir="rtl">ابدأ الانتظار</span>
            </Button>
            <p className="text-center text-white/20 text-xs" dir="rtl">
              بالضغط على الزر، سيتم تفعيل الصوت والاهتزاز للتنبيه
            </p>
            <p className="text-center text-white/15 text-[10px]">
              Pressing the button enables sound & vibration alerts
            </p>
          </form>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <IosInstallPrompt />
      {content}
    </>
  );
}
