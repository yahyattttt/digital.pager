import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChefHat, Truck, MapPin, CheckCircle2, Star, BadgeCheck, Send, MapPinned, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

type DeliveryStatus = "accepted" | "preparing" | "out_for_delivery" | "delivered";
type ReviewState = "idle" | "rating" | "low_feedback" | "low_submitted" | "high_redirect";

function getDeliveryStatus(status: string): DeliveryStatus {
  if (status === "pending_verification" || status === "awaiting_confirmation") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "ready") return "out_for_delivery";
  if (status === "completed" || status === "archived") return "delivered";
  return "accepted";
}

function playStatusPing() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(780, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 700);
  } catch (_) {}
}

function fireConfetti() {
  const burst = (angle: number, origin: { x: number; y: number }) =>
    confetti({
      angle,
      spread: 80,
      particleCount: 70,
      origin,
      colors: ["#22c55e", "#3b82f6", "#f97316", "#e11d48", "#a855f7", "#eab308"],
      gravity: 1.1,
      scalar: 1.1,
    });
  burst(60, { x: 0.1, y: 0.6 });
  burst(120, { x: 0.9, y: 0.6 });
  setTimeout(() => {
    burst(80, { x: 0.3, y: 0.5 });
    burst(100, { x: 0.7, y: 0.5 });
  }, 250);
  setTimeout(() => {
    confetti({ particleCount: 120, spread: 130, origin: { x: 0.5, y: 0.4 }, gravity: 0.9 });
  }, 500);
}

const STAGES = [
  {
    key: "accepted" as DeliveryStatus,
    icon: BadgeCheck,
    labelAr: "تم قبول الطلب",
    activeColor: "#a855f7",
    glowColor: "rgba(168,85,247,0.35)",
    desc: "تم استلام طلبك وقبوله بنجاح",
    rgb: "168,85,247",
  },
  {
    key: "preparing" as DeliveryStatus,
    icon: ChefHat,
    labelAr: "جاري التحضير",
    activeColor: "#f97316",
    glowColor: "rgba(249,115,22,0.35)",
    desc: "المطبخ يحضّر طلبك الآن",
    rgb: "249,115,22",
  },
  {
    key: "out_for_delivery" as DeliveryStatus,
    icon: Truck,
    labelAr: "في الطريق إليك",
    activeColor: "#3b82f6",
    glowColor: "rgba(59,130,246,0.35)",
    desc: "المندوب في الطريق إليك",
    rgb: "59,130,246",
  },
  {
    key: "delivered" as DeliveryStatus,
    icon: MapPin,
    labelAr: "تم التوصيل",
    activeColor: "#22c55e",
    glowColor: "rgba(34,197,94,0.35)",
    desc: "استمتع بطلبك!",
    rgb: "34,197,94",
  },
] as const;

function FlowingProgressBar({ activeIdx }: { activeIdx: number }) {
  const pct = [4, 34, 67, 96][activeIdx] ?? 4;
  const truckMoving = activeIdx === 2;

  return (
    <div className="w-full max-w-xs px-1" style={{ marginBottom: 6 }}>
      <div className="relative h-2 rounded-full overflow-visible" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-2 rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #a855f7, #f97316, #3b82f6, #22c55e)",
            backgroundSize: "300% 100%",
            animation: "flowBar 2.4s linear infinite",
            boxShadow: "0 0 10px rgba(99,102,241,0.5)",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000"
          style={{ left: `calc(${pct}% - 14px)` }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: "#0d0010",
              border: "2px solid #3b82f6",
              boxShadow: "0 0 12px rgba(59,130,246,0.7)",
              animation: truckMoving ? "truckBounce 0.7s ease-in-out infinite alternate" : undefined,
            }}
          >
            <Truck className="w-3.5 h-3.5 text-blue-400" />
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-1.5 px-0.5">
        <span className="text-[10px] text-white/25">المطعم</span>
        <span className="text-[10px] text-white/25">منزلك</span>
      </div>
    </div>
  );
}

function StageNode({ stage, isActive, isDone }: {
  stage: typeof STAGES[number];
  isActive: boolean;
  isDone: boolean;
}) {
  const Icon = isDone ? CheckCircle2 : stage.icon;
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 62 }}>
      <motion.div
        animate={isActive ? { boxShadow: [`0 0 10px rgba(${stage.rgb},0.2)`, `0 0 26px rgba(${stage.rgb},0.55)`, `0 0 10px rgba(${stage.rgb},0.2)`] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500"
        style={{
          background: isActive
            ? `radial-gradient(circle, rgba(${stage.rgb},0.18) 0%, rgba(0,0,0,0.85) 80%)`
            : isDone
            ? "rgba(255,255,255,0.05)"
            : "rgba(255,255,255,0.02)",
          border: isActive
            ? `2px solid ${stage.activeColor}`
            : isDone
            ? "2px solid rgba(255,255,255,0.12)"
            : "2px solid rgba(255,255,255,0.04)",
        }}
      >
        <Icon
          className="w-5 h-5"
          style={{
            color: isActive ? stage.activeColor : isDone ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
          }}
        />
      </motion.div>
      <p
        className="text-[10px] font-bold text-center leading-tight"
        style={{
          fontFamily: "'Tajawal','Cairo',sans-serif",
          color: isActive ? stage.activeColor : isDone ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
        }}
      >
        {stage.labelAr}
      </p>
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform active:scale-90"
          data-testid={`star-${s}`}
        >
          <Star
            className="w-9 h-9 transition-colors duration-150"
            fill={(hovered || value) >= s ? "#eab308" : "none"}
            stroke={(hovered || value) >= s ? "#eab308" : "rgba(255,255,255,0.2)"}
          />
        </button>
      ))}
    </div>
  );
}

export default function DeliveryTrackerPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const params = new URLSearchParams(window.location.search);
  const merchantId = params.get("m") || "";

  const [status, setStatus] = useState<DeliveryStatus>("accepted");
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [merchantLogo, setMerchantLogo] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [reviewState, setReviewState] = useState<ReviewState>("idle");
  const [selectedStars, setSelectedStars] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const prevStatus = useRef<DeliveryStatus | null>(null);
  const confettiFired = useRef(false);
  const reviewShown = useRef(false);

  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/merchant-public/${merchantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.storeName) setMerchantName(data.storeName);
        if (data?.logoUrl) setMerchantLogo(data.logoUrl);
        if (data?.googleMapsReviewUrl) setGoogleMapsUrl(data.googleMapsReviewUrl);
      })
      .catch(() => {});
  }, [merchantId]);

  useEffect(() => {
    if (!orderId || !merchantId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    const ref = doc(db, "merchants", merchantId, "whatsappOrders", orderId);
    const unsub = onSnapshot(ref, (snap) => {
      setLoading(false);
      if (!snap.exists()) { setNotFound(true); return; }
      const data = snap.data();
      setOrderNumber(data.orderNumber || data.displayOrderId || "");
      setCustomerName(data.customerName || "");
      const newStatus = getDeliveryStatus(data.status || "accepted");
      setStatus(newStatus);
    });
    return () => unsub();
  }, [orderId, merchantId]);

  useEffect(() => {
    if (prevStatus.current !== null && prevStatus.current !== status) {
      playStatusPing();
    }
    prevStatus.current = status;

    if (status === "delivered") {
      if (!confettiFired.current) {
        confettiFired.current = true;
        setTimeout(() => fireConfetti(), 400);
      }
      if (!reviewShown.current) {
        reviewShown.current = true;
        setTimeout(() => setReviewState("rating"), 1800);
      }
    }
  }, [status]);

  async function submitLowFeedback() {
    if (!selectedStars) return;
    setSubmittingFeedback(true);
    try {
      await fetch(`/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          stars: selectedStars,
          rating: selectedStars,
          comment: feedbackText,
          orderId,
          createdAt: new Date().toISOString(),
        }),
      });
    } catch (_) {}
    setSubmittingFeedback(false);
    setReviewState("low_submitted");
  }

  function handleStarSelect(stars: number) {
    setSelectedStars(stars);
    setTimeout(() => {
      if (stars <= 3) setReviewState("low_feedback");
      else setReviewState("high_redirect");
    }, 300);
  }

  async function handleShareTracking() {
    const url = window.location.href;
    const storeName = merchantName || "المتجر";
    const text = `شوف طلبي من ${storeName} جالس يتجهز.. خلنا نتابعه سوا! 😍👇\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (_) {}
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  }

  const bg = "linear-gradient(160deg, #060010 0%, #000000 50%, #020008 100%)";

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 px-6" style={{ background: bg }}>
        <Truck className="w-12 h-12 text-white/10" />
        <p className="text-white/30 text-lg text-center" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>
          لم يتم العثور على الطلب
        </p>
      </div>
    );
  }

  const stageOrder: DeliveryStatus[] = ["accepted", "preparing", "out_for_delivery", "delivered"];
  const activeIdx = stageOrder.indexOf(status);
  const activeStage = STAGES[activeIdx];
  const isDelivered = status === "delivered";

  return (
    <div
      className="h-[100dvh] flex flex-col items-center overflow-y-auto"
      style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
      dir="rtl"
      data-testid="delivery-tracker-page"
    >
      <div className="w-full text-center pt-7 pb-2 px-5">
        {merchantLogo ? (
          <img
            src={merchantLogo}
            alt=""
            className="w-14 h-14 rounded-full mx-auto mb-2 object-cover border border-purple-900/30"
            data-testid="img-store-logo"
          />
        ) : (
          <div className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center border border-purple-900/20" style={{ background: "rgba(168,85,247,0.06)" }}>
            <MapPinned className="w-7 h-7 text-purple-800/60" />
          </div>
        )}
        {merchantName && (
          <h1 className="text-white/80 text-base font-bold" data-testid="text-store-name">
            {merchantName}
          </h1>
        )}
        {customerName && (
          <p className="text-white/30 text-sm mt-0.5">{customerName}</p>
        )}
        {orderNumber && (
          <div
            className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 rounded-full"
            style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}
          >
            <span className="text-purple-400/60 text-xs">طلب رقم</span>
            <span className="text-purple-300 font-bold text-base" data-testid="text-order-number">
              #{orderNumber}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-start gap-4 px-4 w-full pb-8 pt-2">
        <div
          className="w-full max-w-sm rounded-3xl p-5 flex flex-col items-center gap-4"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(10px)",
          }}
        >
          <FlowingProgressBar activeIdx={activeIdx} />

          <div className="flex items-start justify-between w-full px-1 gap-1">
            {STAGES.map((stage, i) => (
              <StageNode
                key={stage.key}
                stage={stage}
                isActive={i === activeIdx}
                isDone={i < activeIdx}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeStage && (
              <motion.div
                key={activeStage.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="w-full rounded-2xl py-3 px-4 text-center"
                style={{
                  background: `rgba(${activeStage.rgb},0.07)`,
                  border: `1px solid rgba(${activeStage.rgb},0.2)`,
                }}
                data-testid="status-banner"
              >
                <p className="font-bold text-sm" style={{ color: activeStage.activeColor }} data-testid="text-status-ar">
                  {activeStage.labelAr}
                </p>
                <p className="text-white/30 text-xs mt-0.5">{activeStage.desc}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {status === "preparing" && (
            <motion.button
              key="share-tracking-btn"
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 6 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={handleShareTracking}
              data-testid="button-share-tracking"
              className="w-full max-w-sm relative overflow-hidden rounded-2xl px-5 py-3.5 flex items-center justify-center gap-2.5 transition-all active:scale-[0.97]"
              style={{
                background: "rgba(249,115,22,0.07)",
                border: "1px solid rgba(249,115,22,0.22)",
              }}
            >
              <span
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.12) 0%, transparent 65%)",
                  animation: "sharePulse 2.2s ease-in-out infinite",
                }}
                aria-hidden="true"
              />
              <span className="relative flex items-center gap-2.5">
                {shareCopied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span
                      className="font-bold text-sm text-emerald-400"
                      style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}
                    >
                      تم نسخ الرابط ✓
                    </span>
                  </>
                ) : (
                  <>
                    <Link2
                      className="w-4 h-4 shrink-0"
                      style={{ color: "rgba(249,115,22,0.85)" }}
                    />
                    <span
                      className="font-bold text-sm"
                      style={{
                        color: "rgba(249,115,22,0.85)",
                        fontFamily: "'Tajawal','Cairo',sans-serif",
                      }}
                    >
                      خل أصدقاءك يتبعون معك 🔗
                    </span>
                  </>
                )}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDelivered && reviewState !== "idle" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-sm rounded-3xl p-5 flex flex-col items-center gap-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(10px)",
              }}
            >
              <AnimatePresence mode="wait">
                {reviewState === "rating" && (
                  <motion.div
                    key="rating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 w-full"
                  >
                    <p className="text-white/80 font-bold text-base text-center">كيف كانت تجربتك؟</p>
                    <p className="text-white/35 text-xs text-center">اختر تقييمك لهذا الطلب</p>
                    <StarRating value={selectedStars} onChange={handleStarSelect} />
                  </motion.div>
                )}

                {reviewState === "low_feedback" && (
                  <motion.div
                    key="low_feedback"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col items-center gap-3 w-full"
                  >
                    <div className="flex gap-1 mb-1" dir="ltr">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-5 h-5" fill={selectedStars >= s ? "#eab308" : "none"} stroke={selectedStars >= s ? "#eab308" : "rgba(255,255,255,0.15)"} />
                      ))}
                    </div>
                    <p className="text-white/70 font-bold text-sm text-center">ملاحظاتك تهمنا للتطوير</p>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="شاركنا ملاحظاتك..."
                      rows={3}
                      className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none text-white/80 placeholder:text-white/20"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                      data-testid="input-feedback"
                    />
                    <button
                      onClick={submitLowFeedback}
                      disabled={submittingFeedback}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                      style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7" }}
                      data-testid="btn-submit-feedback"
                    >
                      {submittingFeedback ? (
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <><Send className="w-3.5 h-3.5" /><span>إرسال الملاحظة</span></>
                      )}
                    </button>
                  </motion.div>
                )}

                {reviewState === "low_submitted" && (
                  <motion.div
                    key="low_submitted"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-2 py-2"
                  >
                    <CheckCircle2 className="w-10 h-10 text-purple-400" />
                    <p className="text-white/80 font-bold text-sm text-center">شكراً لك</p>
                    <p className="text-white/40 text-xs text-center leading-relaxed">
                      سنعمل على تحسين تجربتك القادمة
                    </p>
                  </motion.div>
                )}

                {reviewState === "high_redirect" && (
                  <motion.div
                    key="high_redirect"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 w-full"
                  >
                    <div className="flex gap-1 mb-1" dir="ltr">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-5 h-5" fill={selectedStars >= s ? "#eab308" : "none"} stroke={selectedStars >= s ? "#eab308" : "rgba(255,255,255,0.15)"} />
                      ))}
                    </div>
                    <p className="text-white/85 font-bold text-base text-center">سعدنا بإعجابك! 🎉</p>
                    <p className="text-white/40 text-xs text-center leading-relaxed">
                      هل يمكنك مشاركة تجربتك على قوقل ماب؟ سيساعدنا كثيراً
                    </p>
                    {googleMapsUrl ? (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                        style={{
                          background: "rgba(234,179,8,0.1)",
                          border: "1px solid rgba(234,179,8,0.3)",
                          color: "#eab308",
                        }}
                        data-testid="btn-google-maps"
                      >
                        <MapPinned className="w-4 h-4" />
                        <span>التقييم على قوقل ماب</span>
                      </a>
                    ) : (
                      <p className="text-white/20 text-xs text-center">رابط المتجر غير متاح</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {isDelivered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-sm rounded-2xl p-4 text-center"
            style={{
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.18)",
            }}
            data-testid="delivered-banner"
          >
            <p className="text-green-400 font-bold text-base">تم التوصيل بنجاح!</p>
            <p className="text-green-400/40 text-xs mt-0.5">استمتع بطلبك</p>
          </motion.div>
        )}
      </div>

      <style>{`
        @keyframes flowBar {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes truckBounce {
          0% { transform: translateY(-55%) scale(1); }
          100% { transform: translateY(-45%) scale(1.08); }
        }
        @keyframes sharePulse {
          0%, 100% { opacity: 0.5; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.04); }
        }
      `}</style>
    </div>
  );
}
