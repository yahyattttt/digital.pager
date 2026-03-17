import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChefHat, Truck, MapPin, CheckCircle2, BadgeCheck, MapPinned, Link2 } from "lucide-react";
import { StarRatingPopup } from "@/components/star-rating-popup";
import { SiWhatsapp } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

type DeliveryStatus = "accepted" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

function getDeliveryStatus(status: string): DeliveryStatus {
  if (status === "pending_verification" || status === "awaiting_confirmation") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "ready") return "out_for_delivery";
  if (status === "completed" || status === "archived") return "delivered";
  if (status === "cancelled") return "cancelled";
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

export default function DeliveryTrackerPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const params = new URLSearchParams(window.location.search);
  const merchantId = params.get("m") || "";

  const [status, setStatus] = useState<DeliveryStatus>("accepted");
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [merchantLogo, setMerchantLogo] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [googleMapsReviewUrl, setGoogleMapsReviewUrl] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  const [shareCopied, setShareCopied] = useState(false);

  const prevStatus = useRef<DeliveryStatus | null>(null);
  const confettiFired = useRef(false);
  const ratingPopupShownRef = useRef(false);

  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/merchant-public/${merchantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.storeName) setMerchantName(data.storeName);
        if (data?.logoUrl) setMerchantLogo(data.logoUrl);
        if (data?.driverPhone) setDriverPhone(data.driverPhone);
        if (data?.googleMapsReviewUrl) setGoogleMapsReviewUrl(data.googleMapsReviewUrl);
        if (data?.support_whatsapp) setSupportWhatsapp(data.support_whatsapp);
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
      if (!ratingPopupShownRef.current && !ratingDone) {
        ratingPopupShownRef.current = true;
        setTimeout(() => setShowRatingPopup(true), 2500);
      }
    }
  }, [status, ratingDone]);

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

  if (status === "cancelled") {
    return (
      <div
        className="h-[100dvh] flex flex-col items-center overflow-y-auto"
        style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
        dir="rtl"
        data-testid="delivery-tracker-cancelled"
      >
        {/* Header — identical to normal view */}
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
            <h1 className="text-white/80 text-base font-bold" data-testid="text-store-name">{merchantName}</h1>
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
              <span className="text-purple-300 font-bold text-base" data-testid="text-order-number">#{orderNumber}</span>
            </div>
          )}
        </div>

        {/* Cancellation card — replaces progress bar + status icons */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 w-full pb-8">
          <div
            className="w-full max-w-sm rounded-3xl p-7 flex flex-col items-center gap-5 text-center"
            style={{
              background: "rgba(80,0,0,0.22)",
              border: "1px solid rgba(160,30,30,0.38)",
              backdropFilter: "blur(10px)",
            }}
            data-testid="card-cancelled"
          >
            {/* Red X icon inside circular container */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(110,0,0,0.35)",
                border: "1.5px solid rgba(180,40,40,0.5)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M8 8L24 24M24 8L8 24" stroke="#cc3333" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
            </div>

            {/* Main title */}
            <p
              className="font-bold text-xl leading-snug"
              style={{ color: "#cc3333" }}
              data-testid="text-cancelled-title"
            >
              تم إلغاء طلبك من المتجر
            </p>

            {/* Apology message */}
            <p
              className="text-sm leading-relaxed"
              style={{ color: "rgba(200,150,150,0.85)", lineHeight: "1.85" }}
              data-testid="text-cancelled-message"
            >
              نعتذر منك، تم إلغاء طلبك من قبل المتجر لظروف خارجة عن إرادتنا. يرجى التواصل معنا للمزيد من التفاصيل.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stageOrder: DeliveryStatus[] = ["accepted", "preparing", "out_for_delivery", "delivered"];
  const activeIdx = stageOrder.indexOf(status);
  const activeStage = STAGES[activeIdx];
  const isDelivered = status === "delivered";

  return (
    <>
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
          {driverPhone && status !== "cancelled" && (
            <motion.a
              key="whatsapp-driver-btn"
              href={`https://wa.me/${driverPhone.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-sm flex items-center justify-center gap-3 rounded-2xl py-3.5 font-bold text-base"
              style={{
                background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                boxShadow: "0 0 20px rgba(37,211,102,0.18)",
                color: "#fff",
                textDecoration: "none",
              }}
              data-testid="button-whatsapp-driver"
            >
              <SiWhatsapp className="w-5 h-5 flex-shrink-0" />
              <span style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>مندوب التوصيل</span>
            </motion.a>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {status === "preparing" && false && (
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
                      شاركهم اللحظة 🔗
                    </span>
                  </>
                )}
              </span>
            </motion.button>
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

      {supportWhatsapp.replace(/\D/g, "") && (
        <a
          href={`https://wa.me/${supportWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`أهلاً ${merchantName}، لدي استفسار بخصوص طلبي رقم (# ${orderId})`)}`}
          target="_blank" rel="noopener noreferrer" className="wa-pulse"
          style={{ position: "fixed", bottom: "24px", right: "20px", zIndex: 9999, width: 56, height: 56, borderRadius: "50%", background: "#25d366", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
          data-testid="button-whatsapp-support" aria-label="تواصل عبر واتساب"
        >
          <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12.001 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.987-1.306A9.953 9.953 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18c-1.738 0-3.368-.474-4.769-1.299l-.342-.203-3.037.794.812-2.962-.222-.358A7.964 7.964 0 014 12c0-4.418 3.582-8 8.001-8 4.418 0 7.999 3.582 7.999 8s-3.581 8-7.999 8z"/>
          </svg>
        </a>
      )}
    </div>

    {showRatingPopup && !ratingDone && merchantId && (
      <StarRatingPopup
        merchantId={merchantId}
        orderId={orderId || ""}
        orderType="delivery"
        googleMapsUrl={googleMapsReviewUrl}
        onClose={() => { setShowRatingPopup(false); setRatingDone(true); }}
      />
    )}
    </>
  );
}
