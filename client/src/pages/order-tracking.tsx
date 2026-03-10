import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle, Loader2, Star, Banknote, Phone, MessageCircle, Send, Share2, Copy, XCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WhatsAppOrder } from "@shared/schema";

function PagerDevice({ orderNumber, isReady }: { orderNumber: string; isReady: boolean }) {
  const leds = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 360) / 12 - 90;
    const rad = (angle * Math.PI) / 180;
    const r = 47;
    return { cx: 50 + r * Math.cos(rad), cy: 50 + r * Math.sin(rad), delay: `${(i * 0.2).toFixed(1)}s` };
  });

  const isLongId = orderNumber.length > 3;
  const prefix = isLongId ? orderNumber.slice(0, -3) : "";
  const lastDigits = isLongId ? orderNumber.slice(-3) : orderNumber;

  const digitFontSize = lastDigits.length > 2
    ? "clamp(2.2rem, 10vw, 3rem)"
    : "clamp(2.8rem, 12vw, 3.5rem)";

  return (
    <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto" data-testid="pager-device">
      <div className={`absolute inset-0 rounded-full ${isReady ? "pager-neon-pulse" : ""}`} style={{ background: "radial-gradient(circle at center, rgba(30,0,0,0.6) 30%, rgba(0,0,0,0.9) 70%)" }} />
      <div className="absolute rounded-full" style={{ inset: "8%", background: "radial-gradient(circle at 40% 35%, #1a1a1a 0%, #0a0a0a 50%, #000 100%)", boxShadow: "inset 0 2px 20px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.04)" }} />
      <div className="absolute rounded-full" style={{ inset: "15%", background: "radial-gradient(circle at 45% 40%, #141414 0%, #080808 60%, #000 100%)", boxShadow: "inset 0 3px 15px rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.02)" }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ filter: isReady ? "url(#led-glow-ready-t)" : "url(#led-glow-t)" }}>
        <defs>
          <filter id="led-glow-t" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="led-glow-ready-t" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {leds.map((led, i) => (
          <circle key={i} cx={led.cx} cy={led.cy} r={isReady ? "2.2" : "1.8"} fill="#ff0000" className={isReady ? "pager-led-ready" : "pager-led-waiting"} style={{ animationDelay: led.delay }} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {prefix && (
          <span
            className="text-red-500/40 tracking-[0.15em] select-none"
            style={{
              fontSize: "clamp(0.65rem, 2.5vw, 0.8rem)",
              fontFamily: "'DSEG7Modern', monospace",
              textShadow: "0 0 8px rgba(255,0,0,0.3)",
              marginBottom: "2px",
            }}
            data-testid="text-tracking-order-prefix"
          >
            {prefix}
          </span>
        )}
        <span
          className="font-dseg7 text-red-500 tracking-wider select-none"
          style={{
            fontSize: digitFontSize,
            textShadow: "0 0 20px rgba(255,0,0,0.6), 0 0 40px rgba(255,0,0,0.3)",
            lineHeight: 1,
          }}
          data-testid="text-tracking-order-number"
        >
          {lastDigits}
        </span>
      </div>
    </div>
  );
}

function SmartRatingScreen({
  merchantId,
  storeName,
  googleMapsReviewUrl,
  orderNumber,
}: {
  merchantId: string;
  storeName: string;
  googleMapsReviewUrl?: string;
  orderNumber: string;
}) {
  const [selectedStars, setSelectedStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [phase, setPhase] = useState<"rating" | "feedback" | "thankyou" | "redirecting" | "done">("rating");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (!comment.trim() && selectedStars <= 3) {
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
      return;
    }
    setSubmitting(true);
    try {
      await fetch("/api/store-internal-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, stars: selectedStars, comment: comment.trim(), orderNumber }),
      });
      setPhase("done");
    } catch {
      setPhase("done");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      data-testid="tracking-completed-screen"
    >
      <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-in fade-in duration-700">
        <div className="w-20 h-20 rounded-full border-2 border-green-500/30 bg-green-500/5 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(34,197,94,0.12)" }}>
          <CheckCircle className="w-10 h-10 text-green-500/80" />
        </div>

        <div>
          <p className="text-green-400 text-2xl font-bold" data-testid="text-completed-message">Thank You!</p>
          <p className="text-green-400/80 text-lg font-bold mt-1" dir="rtl" data-testid="text-completed-message-ar">
            شكراً لزيارتك، قيم تجربتك معنا
          </p>
        </div>

        {phase === "rating" && (
          <div className="flex flex-col items-center gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="w-full bg-[#111] border-white/[0.06] rounded-2xl">
              <CardContent className="p-6 flex flex-col items-center gap-4">
                <p className="text-white/80 text-sm font-medium" dir="rtl" data-testid="text-rate-prompt">قيم تجربتك معنا</p>
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
    </div>
  );
}

export default function OrderTrackingPage() {
  const params = useParams<{ orderId: string }>();
  const urlOrderId = params.orderId;
  const [resolvedOrderId, setResolvedOrderId] = useState<string | undefined>(urlOrderId);
  const [manualInput, setManualInput] = useState("");
  const [manualLookupLoading, setManualLookupLoading] = useState(false);
  const [manualLookupError, setManualLookupError] = useState("");
  const [order, setOrder] = useState<WhatsAppOrder | null>(null);
  const [merchant, setMerchant] = useState<{ storeName: string; logoUrl: string; googleMapsReviewUrl?: string } | null>(null);
  const [loading, setLoading] = useState(!!urlOrderId);
  const [notFound, setNotFound] = useState(false);
  const [bellPrimed, setBellPrimed] = useState(false);
  const [bellAutoPlayed, setBellAutoPlayed] = useState(false);

  const { toast } = useToast();
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bellPrimedRef = useRef(false);
  const hasAutoPlayedRef = useRef(false);

  const merchantId = new URLSearchParams(window.location.search).get("m") || "";
  const urlTrackingType = new URLSearchParams(window.location.search).get("type") || "";
  const [resolvedTrackingType, setResolvedTrackingType] = useState(urlTrackingType);
  const trackingType = resolvedTrackingType;
  const orderId = resolvedOrderId;

  function ensureAudioElement() {
    if (!alertSoundRef.current) {
      alertSoundRef.current = new Audio("/bell.mp3");
      alertSoundRef.current.volume = 1.0;
      alertSoundRef.current.preload = "auto";
    }
    return alertSoundRef.current;
  }

  function handlePrimeBell() {
    if (bellPrimedRef.current) return;
    const audio = ensureAudioElement();
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
      console.log("[OrderTracking] Bell primed — playing 0.5s preview");
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        console.log("[OrderTracking] Bell preview stopped after 0.5s");
      }, 500);
      bellPrimedRef.current = true;
      setBellPrimed(true);
      sessionStorage.setItem("pager_bell_primed", "true");
    }).catch(() => {
      toast({ title: "خطأ", description: "تعذر تشغيل الصوت", variant: "destructive" });
    });
  }

  function playFullAlert() {
    if (hasAutoPlayedRef.current) return;
    hasAutoPlayedRef.current = true;
    const audio = ensureAudioElement();
    audio.loop = true;
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play().then(() => {
      console.log("[OrderTracking] Full alert playing automatically");
      setBellAutoPlayed(true);
      if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 800]);
      }
    }).catch((err) => {
      console.warn("[OrderTracking] Auto-play failed:", err.message);
      hasAutoPlayedRef.current = false;
    });
  }

  function handlePlayAlertNow() {
    hasAutoPlayedRef.current = false;
    try {
      if (!audioContextRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AC();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch {}
    bellPrimedRef.current = true;
    setBellPrimed(true);
    sessionStorage.setItem("pager_bell_primed", "true");
    playFullAlert();
  }

  function stopAlert() {
    if (alertSoundRef.current) {
      alertSoundRef.current.pause();
      alertSoundRef.current.currentTime = 0;
    }
    if ("vibrate" in navigator) navigator.vibrate(0);
    setBellAutoPlayed(false);
  }

  function cleanupAudioSession() {
    console.log("[OrderTracking] Cleaning up audio session fully");
    if (alertSoundRef.current) {
      alertSoundRef.current.pause();
      alertSoundRef.current.currentTime = 0;
      alertSoundRef.current.src = "";
      alertSoundRef.current.load();
      alertSoundRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
      navigator.mediaSession.metadata = null;
    }
    if ("vibrate" in navigator) navigator.vibrate(0);
    setBellAutoPlayed(false);
    hasAutoPlayedRef.current = false;
  }

  useEffect(() => {
    ensureAudioElement();
    if (sessionStorage.getItem("pager_bell_primed") === "true") {
      bellPrimedRef.current = true;
      setBellPrimed(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioSession();
    };
  }, []);

  async function handleManualLookup() {
    const trimmed = manualInput.trim();
    if (!trimmed || !merchantId) return;
    setManualLookupLoading(true);
    setManualLookupError("");
    try {
      const res = await fetch(`/api/track/lookup?merchantId=${merchantId}&orderNumber=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        setManualLookupError("الطلب غير موجود");
        return;
      }
      const data = await res.json();
      setOrder(data.order);
      setMerchant(data.merchant);
      setResolvedOrderId(data.pagerId);
      setResolvedTrackingType("pager");
      setLoading(false);
    } catch {
      setManualLookupError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setManualLookupLoading(false);
    }
  }

  useEffect(() => {
    if (!orderId || !merchantId) {
      if (urlOrderId) { setNotFound(true); setLoading(false); }
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
          createdAt: data.createdAt || "",
        };
      }
      setOrder(updatedOrder);

      const currentStatus = updatedOrder.status;
      console.log("[OrderTracking] Firestore snapshot — status:", currentStatus, "prev:", prevStatus, "firstSnap:", isFirstSnapshot);

      if (isFirstSnapshot) {
        prevStatus = currentStatus;
        isFirstSnapshot = false;
        if (currentStatus === "completed" || currentStatus === "archived") {
          cleanupAudioSession();
        } else if (currentStatus === "ready" && bellPrimedRef.current) {
          console.log("[OrderTracking] Page loaded with ready status + bell primed — auto-playing");
          playFullAlert();
        }
        return;
      }

      if (currentStatus === "ready" && prevStatus !== "ready") {
        console.log("[OrderTracking] Status changed to ready — bellPrimed:", bellPrimedRef.current);
        if (bellPrimedRef.current) {
          playFullAlert();
        }
      } else if (currentStatus === "completed" || currentStatus === "archived") {
        cleanupAudioSession();
      } else if (currentStatus !== "ready") {
        stopAlert();
        hasAutoPlayedRef.current = false;
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

  const isManualOrder = !isOnlineOrder;

  if (!urlOrderId && !resolvedOrderId) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center"
        style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
        data-testid="manual-id-input-screen"
      >
        <div className="flex flex-col items-center gap-6 w-full max-w-xs animate-in fade-in duration-500">
          <p className="text-white/40 text-[14px] font-medium tracking-[0.3em] uppercase mb-0.5">DIGITAL PAGER</p>
          {merchant && <h2 className="text-white text-[26px] font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>}

          <PagerDevice orderNumber={manualInput || "---"} isReady={false} />

          <div className="w-full space-y-4 mt-4">
            <p className="text-white/70 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              أدخل رقم طلبك
            </p>
            <p className="text-white/40 text-xs">Enter your order number</p>

            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              value={manualInput}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                if (val.length <= 3) setManualInput(val);
                setManualLookupError("");
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleManualLookup(); }}
              placeholder="001"
              className="w-full h-16 text-center text-3xl font-dseg7 tracking-[0.5em] bg-black border-red-500/30 text-red-400 placeholder:text-red-900/40 rounded-xl focus:border-red-500/60 focus:ring-red-500/20"
              dir="ltr"
              data-testid="input-manual-order-id"
            />

            {manualLookupError && (
              <p className="text-red-400 text-sm font-medium animate-in fade-in duration-300" dir="rtl" data-testid="text-lookup-error">
                {manualLookupError}
              </p>
            )}

            <button
              onClick={handleManualLookup}
              disabled={manualInput.length === 0 || manualLookupLoading || !merchantId}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/50 via-red-900/25 to-red-950/50 active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 0 20px rgba(255,0,0,0.08)" }}
              data-testid="button-lookup-order"
            >
              {manualLookupLoading ? (
                <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-red-400/80" />
              )}
              <span className="text-red-400/90 text-sm font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
                {manualLookupLoading ? "جاري البحث..." : "تتبع الطلب"}
              </span>
            </button>

            {!merchantId && (
              <p className="text-amber-400/60 text-xs" dir="rtl">
                يرجى مسح رمز QR الخاص بالمتجر
              </p>
            )}
          </div>
        </div>
      </div>
    );
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
            <button
              onClick={handleShareTracking}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
              style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
              data-testid="button-share-tracking-pending"
            >
              {navigator.share ? (
                <Share2 className="w-4 h-4 text-red-400/80" />
              ) : (
                <Copy className="w-4 h-4 text-red-400/80" />
              )}
              <span className="text-red-400/90 text-[13px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>شارك حالة الطلب مع أحبابك</span>
            </button>
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
    return (
      <div className={`h-[100dvh] flex flex-col items-center justify-between py-8 px-5 text-center overflow-hidden ${bellAutoPlayed ? "pager-neon-pulse" : ""}`}
        style={{ background: bellAutoPlayed ? "linear-gradient(180deg, #0a0000 0%, #1a0000 30%, #0d0000 70%, #000 100%)" : "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
        data-testid="tracking-ready-screen"
      >
        <div className="w-full">
          <p className="text-white/40 text-[14px] font-medium tracking-[0.3em] uppercase mb-0.5">DIGITAL PAGER</p>
          {merchant && <h2 className="text-white text-[26px] font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center -mt-4">
          <PagerDevice orderNumber={order.displayOrderId || order.orderNumber || "?"} isReady={true} />
          <div className="mt-8">
            <p className="text-white text-2xl font-black tracking-wide" data-testid="text-order-ready">ORDER READY!</p>
            <p className="text-red-400 text-xl font-bold mt-1" dir="rtl">طلبك جاهز!</p>
            <p className="text-white/50 text-sm mt-3">Please proceed to the counter</p>
            <p className="text-white/40 text-sm mt-0.5" dir="rtl">تفضل بالاستلام من الكاونتر</p>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-3">
          {bellAutoPlayed && (
            <button
              onClick={stopAlert}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border-2 border-red-600/40 bg-transparent active:scale-[0.95] transition-all duration-200"
              style={{ boxShadow: "0 0 20px rgba(255,0,0,0.2)" }}
              data-testid="button-stop-alert"
            >
              <span className="text-lg">🔇</span>
              <span className="text-white text-sm font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>إيقاف التنبيه</span>
            </button>
          )}
          {!bellAutoPlayed && (
            <button
              onClick={handlePlayAlertNow}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl border-2 border-red-500/40 bg-gradient-to-r from-red-950/60 via-red-900/30 to-red-950/60 active:scale-[0.95] transition-all duration-200 animate-pulse"
              style={{ boxShadow: "0 0 30px rgba(255,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" }}
              data-testid="button-bell-prompt"
            >
              <span className="text-2xl">🔔</span>
              <span className="text-red-400 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>الطلب صار جاهز ودك تفعل الجرس ؟</span>
            </button>
          )}
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
      />
    );
  }

  if (isManualOrder) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-between py-8 px-5 text-center overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
        data-testid="tracking-preparing-screen"
      >
        <div className="w-full flex-shrink-0">
          <p className="text-white/40 text-[14px] font-medium tracking-[0.3em] uppercase mb-0.5">DIGITAL PAGER</p>
          {merchant && <h2 className="text-white text-[26px] font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <PagerDevice orderNumber={order.displayOrderId || order.orderNumber || "?"} isReady={false} />
          <div className="mt-6">
            <p className="text-red-400 text-lg font-bold" dir="rtl" data-testid="text-preparing-message">جاري التحضير...</p>
            <p className="text-white/50 text-sm mt-1.5">We'll buzz you when it's ready!</p>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-3">
          {!bellPrimed && (
            <button
              onClick={handlePrimeBell}
              className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 active:scale-[0.97] transition-all duration-200 animate-pulse"
              style={{ boxShadow: "0 0 20px rgba(255,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.03)" }}
              data-testid="button-prime-bell"
            >
              <span className="text-lg">🔔</span>
              <span className="text-red-400/90 text-[14px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>ودك ننبهك بالجرس ؟</span>
            </button>
          )}

          {bellPrimed && (
            <div className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 animate-in fade-in duration-500">
              <span className="text-sm">✅</span>
              <span className="text-emerald-400/80 text-xs font-medium" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>تم تفعيل التنبيه</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-white/20 text-[10px]">Live</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-between py-8 px-5 text-center overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}
      data-testid="tracking-preparing-screen"
    >
      <div className="w-full flex-shrink-0">
        <p className="text-white/40 text-[14px] font-medium tracking-[0.3em] uppercase mb-0.5">DIGITAL PAGER</p>
        {merchant && <h2 className="text-white text-[26px] font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</h2>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <PagerDevice orderNumber={order.displayOrderId || order.orderNumber || "?"} isReady={false} />
        <div className="mt-6">
          <p className="text-red-400 text-lg font-bold" dir="rtl" data-testid="text-preparing-message">جاري التحضير...</p>
          <p className="text-white/50 text-sm mt-1.5">We'll buzz you when it's ready!</p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleShareTracking}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
          style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
          data-testid="button-share-tracking"
        >
          {navigator.share ? (
            <Share2 className="w-4 h-4 text-red-400/80" />
          ) : (
            <Copy className="w-4 h-4 text-red-400/80" />
          )}
          <span className="text-red-400/90 text-[13px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>شارك حالة الطلب مع أحبابك</span>
        </button>

        {!bellPrimed && (
          <button
            onClick={handlePrimeBell}
            className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 active:scale-[0.97] transition-all duration-200 animate-pulse"
            style={{ boxShadow: "0 0 20px rgba(255,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="button-prime-bell"
          >
            <span className="text-lg">🔔</span>
            <span className="text-red-400/90 text-[14px] font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>ودك ننبهك بصوت الجرس ؟</span>
          </button>
        )}

        {bellPrimed && (
          <div className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 animate-in fade-in duration-500">
            <span className="text-sm">✅</span>
            <span className="text-emerald-400/80 text-xs font-medium" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>تم تفعيل التنبيه</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/20">
          <p className="text-white/30 text-xs text-center" dir="rtl">{order.customerName} • {order.items.length} items • {order.total.toFixed(2)} SAR</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-white/20 text-[10px]">Live</span>
        </div>
      </div>
    </div>
  );
}
