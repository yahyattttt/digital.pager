import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Share2, Copy, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type PagerDoc = {
  docId: string;
  orderNumber: string;
  displayOrderId: string;
  status: "waiting" | "notified" | "completed" | "archived";
  createdAt: string;
  orderSource?: string;
};

type MerchantInfo = {
  storeName: string;
  logoUrl: string;
  googleMapsReviewUrl?: string;
};

type Phase = "selection" | "preparing" | "ready" | "rating" | "done";

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
    <div className="relative w-[280px] h-[280px] mx-auto" data-testid="buzzer-circle">
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
        style={{
          inset: "3px",
          background: "linear-gradient(135deg, rgba(80,80,80,0.12) 0%, transparent 35%, transparent 65%, rgba(30,30,30,0.08) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      />

      <div
        className="absolute rounded-full"
        style={{
          inset: "8px",
          border: "1px solid rgba(255,255,255,0.03)",
          background: "radial-gradient(circle at 42% 38%, rgba(40,40,40,0.1) 0%, transparent 50%)",
        }}
      />

      <div
        className="absolute rounded-full"
        style={{
          inset: "22px",
          border: active ? "1px solid rgba(255,25,0,0.1)" : "1px solid rgba(255,255,255,0.025)",
        }}
      />

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="led-glow-grad">
            <stop offset="0%" stopColor="#ff2200" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#ff1100" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className={active ? "led-ring-spinning" : ""} style={{ transformOrigin: "50px 50px" }}>
          {leds.map((led) => (
            <g key={led.i}>
              <circle
                cx={led.cx}
                cy={led.cy}
                r={6}
                fill="url(#led-glow-grad)"
                className={active ? "led-glow-active" : "led-glow-idle"}
                style={{ animationDelay: led.delay }}
              />
              <circle
                cx={led.cx}
                cy={led.cy}
                r={2.6}
                fill="#ff2000"
                className={active ? "led-dot-active" : "led-dot-idle"}
                style={{ animationDelay: led.delay }}
              />
              <circle
                cx={led.cx}
                cy={led.cy}
                r={1.2}
                fill="#ff6644"
                opacity={active ? 0.9 : 0.25}
                className={active ? "led-dot-active" : "led-dot-idle"}
                style={{ animationDelay: led.delay }}
              />
            </g>
          ))}
        </g>
      </svg>

      <div className="absolute inset-0 flex items-center justify-center z-10">
        <span
          className={`font-dseg7 tracking-wider ${active ? "buzzer-number-blink" : ""}`}
          style={{
            fontSize: "clamp(52px, 14vw, 76px)",
            color: active ? "#ff3000" : "#aa1800",
            textShadow: active
              ? "0 0 25px rgba(255,40,0,0.9), 0 0 50px rgba(255,20,0,0.5), 0 0 80px rgba(255,10,0,0.25)"
              : "0 0 12px rgba(170,24,0,0.35), 0 0 4px rgba(170,24,0,0.2)",
            lineHeight: 1,
          }}
          data-testid="text-buzzer-number"
        >
          {orderNumber}
        </span>
      </div>
    </div>
  );
}

export default function StorePagerPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId || "";

  const [pagers, setPagers] = useState<PagerDoc[]>([]);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(true);
  const [selectedPager, setSelectedPager] = useState<PagerDoc | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("selection");
  const [bellPrimed, setBellPrimed] = useState(false);
  const [bellPlaying, setBellPlaying] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bellPrimedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!storeId) return;
    const saved = localStorage.getItem(`pager_session_${storeId}`);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.docId && s.orderNumber) {
          setSelectedPager(s);
          setPhase("preparing");
        }
      } catch {}
    }
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    async function fetchMerchant() {
      try {
        const res = await fetch(`/api/merchant-public/${storeId}`);
        if (res.ok) {
          const data = await res.json();
          setMerchant(data);
        }
      } catch {} finally {
        setLoadingMerchant(false);
      }
    }
    fetchMerchant();
  }, [storeId]);

  useEffect(() => {
    if (!storeId || phase !== "selection") return;
    const pagersRef = collection(db, "merchants", storeId, "pagers");
    const q = query(pagersRef, where("status", "==", "waiting"));
    const unsub = onSnapshot(q, (snap) => {
      const docs: PagerDoc[] = [];
      snap.forEach((d) => {
        const data = d.data();
        docs.push({
          docId: d.id,
          orderNumber: data.orderNumber || "",
          displayOrderId: data.displayOrderId || `#${data.orderNumber}`,
          status: data.status || "waiting",
          createdAt: data.createdAt || "",
          orderSource: data.orderSource,
        });
      });
      docs.sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber));
      setPagers(docs);
    });
    return () => unsub();
  }, [storeId, phase]);

  useEffect(() => {
    if (!storeId || !selectedPager?.docId || phase === "selection") return;
    const docRef = doc(db, "merchants", storeId, "pagers", selectedPager.docId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        cleanupSession();
        return;
      }
      const data = snap.data();
      const status = data.status;

      if (status === "waiting") {
        if (phase !== "preparing") setPhase("preparing");
      } else if (status === "notified") {
        if (phase !== "ready") {
          setPhase("ready");
          if (bellPrimedRef.current) {
            playFullAlert();
          }
        }
      } else if (status === "completed" || status === "archived") {
        if (phase !== "rating" && phase !== "done") {
          stopAlert();
          setPhase("rating");
        }
      }
    });
    return () => unsub();
  }, [storeId, selectedPager?.docId, phase]);

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

  function cleanupSession() {
    stopAlert();
    localStorage.removeItem(`pager_session_${storeId}`);
    setSelectedPager(null);
    setPhase("selection");
    setBellPrimed(false);
    bellPrimedRef.current = false;
    setRating(0);
    setFeedbackText("");
    setFeedbackSaved(false);
  }

  function handleSelectOrder(pager: PagerDoc) {
    setSelectedPager(pager);
    setConfirmOpen(true);
  }

  function handleConfirm() {
    if (!selectedPager) return;
    setConfirmOpen(false);
    setPhase("preparing");
    localStorage.setItem(`pager_session_${storeId}`, JSON.stringify(selectedPager));
  }

  function handleCancelConfirm() {
    setConfirmOpen(false);
    setSelectedPager(null);
  }

  const handleShare = useCallback(async () => {
    const label = merchant?.storeName || "";
    const num = selectedPager?.displayOrderId || "";
    const text = `متابعة طلبي ${num} من ${label}`;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: text, text, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast({ title: "تم نسخ الرابط" });
      } catch {
        toast({ title: "خطأ", description: "تعذر نسخ الرابط", variant: "destructive" });
      }
    }
  }, [merchant, selectedPager, toast]);

  async function handleSubmitFeedback() {
    if (!selectedPager || !storeId || rating === 0) return;
    setFeedbackSaving(true);
    try {
      const res = await fetch("/api/pager-feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: storeId,
          pagerId: selectedPager.docId,
          rating,
          feedback: rating <= 3 ? feedbackText : "",
        }),
      });
      if (res.ok) {
        setFeedbackSaved(true);
      }
    } catch {} finally {
      setFeedbackSaving(false);
    }
  }

  function handleCloseFeedback() {
    cleanupSession();
  }

  const bg = "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)";

  if (loadingMerchant) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === "selection") {
    return (
      <div className="h-[100dvh] flex flex-col" style={{ background: bg }} data-testid="pager-selection-screen">
        <div className="text-center pt-8 pb-4 px-5">
          <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase mb-1">DIGITAL PAGER</p>
          {merchant && (
            <h1 className="text-white text-2xl font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-store-name">
              {merchant.storeName}
            </h1>
          )}
          {merchant?.logoUrl && (
            <img src={merchant.logoUrl} alt="" className="w-16 h-16 rounded-full mx-auto mt-3 object-cover border-2 border-white/10" data-testid="img-store-logo" />
          )}
          <p className="text-white/50 text-sm mt-4 font-medium" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
            اختر رقم طلبك
          </p>
          <p className="text-white/30 text-xs mt-1">Select your order number</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {pagers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <span className="text-3xl">🍽️</span>
              </div>
              <p className="text-white/30 text-sm" dir="rtl">لا توجد طلبات نشطة حالياً</p>
              <p className="text-white/20 text-xs">No active orders</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              {pagers.map((p) => (
                <button
                  key={p.docId}
                  onClick={() => handleSelectOrder(p)}
                  className="aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-red-500/20 bg-gradient-to-b from-red-950/20 to-transparent active:scale-[0.93] transition-all duration-200 hover:border-red-500/40"
                  style={{ boxShadow: "0 0 20px rgba(255,0,0,0.04)" }}
                  data-testid={`button-order-${p.orderNumber}`}
                >
                  <span className="text-red-400 text-2xl font-bold font-dseg7 tracking-wider" style={{ textShadow: "0 0 15px rgba(255,0,0,0.4)" }}>
                    {p.orderNumber}
                  </span>
                  <span className="text-white/30 text-[10px] mt-1">{p.displayOrderId}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {confirmOpen && selectedPager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-5" data-testid="confirm-dialog">
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center">
                <p className="text-white/40 text-xs tracking-[0.2em] uppercase mb-3">CONFIRM ORDER</p>
                <p className="text-white text-lg font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-confirm-question">
                  هل أنت متأكد من رقم طلبك؟
                </p>
                <p className="text-red-400 text-4xl font-bold font-dseg7 tracking-wider mt-3" style={{ textShadow: "0 0 20px rgba(255,0,0,0.5)" }} data-testid="text-confirm-order-id">
                  {selectedPager.displayOrderId || `#${selectedPager.orderNumber}`}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelConfirm}
                  className="flex-1 py-3.5 rounded-2xl border border-white/10 text-white/50 text-sm font-bold active:scale-[0.97] transition-all"
                  data-testid="button-confirm-no"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold active:scale-[0.97] transition-all"
                  style={{ boxShadow: "0 0 25px rgba(255,0,0,0.2)" }}
                  data-testid="button-confirm-yes"
                >
                  تأكيد
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "preparing") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-between py-10 px-5 text-center" style={{ background: bg }} data-testid="pager-preparing-screen">
        <div className="w-full">
          <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase mb-1">DIGITAL PAGER</p>
          {merchant && (
            <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              {merchant.storeName}
            </h2>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-5">
          <BuzzerCircle
            orderNumber={selectedPager?.orderNumber || ""}
            active={false}
          />

          <div>
            <p className="text-red-400 text-2xl font-black" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-preparing-status">
              جاري التحضير 👨‍🍳
            </p>
            <p className="text-white/40 text-sm mt-1 text-center">Your order is being prepared</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-white/20 text-[10px]">Live</span>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-red-900/15 to-red-950/30 active:scale-[0.97] transition-all duration-200"
            style={{ boxShadow: "0 0 15px rgba(255,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="button-share"
          >
            {navigator.share ? (
              <Share2 className="w-5 h-5 text-red-400/80" />
            ) : (
              <Copy className="w-5 h-5 text-red-400/80" />
            )}
            <span className="text-red-400/90 text-base font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              مشاركة مع الأحباب 🔗
            </span>
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

  if (phase === "ready") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-between py-10 px-5 text-center" style={{ background: bg }} data-testid="pager-ready-screen">
        <div className="w-full">
          <p className="text-white/40 text-[13px] font-medium tracking-[0.3em] uppercase mb-1">DIGITAL PAGER</p>
          {merchant && (
            <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              {merchant.storeName}
            </h2>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-5">
          <BuzzerCircle
            orderNumber={selectedPager?.orderNumber || ""}
            active={true}
          />

          <div>
            <p className="text-red-400 text-2xl font-black" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-ready-status">
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
        </div>
      </div>
    );
  }

  if (phase === "rating") {
    const isLowRating = rating >= 1 && rating <= 3;
    const isHighRating = rating >= 4;
    const showFeedbackForm = isLowRating && !feedbackSaved;
    const showCelebration = isHighRating || feedbackSaved;

    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-5 text-center" style={{ background: bg }} data-testid="pager-rating-screen">
        <div className="w-full max-w-sm space-y-6 animate-in fade-in duration-700">
          <div>
            <p className="text-white/40 text-xs tracking-[0.2em] uppercase mb-3">THANK YOU</p>
            <p className="text-white text-2xl font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-rating-title">
              شكراً لزيارتك! 🙏
            </p>
            <p className="text-white/40 text-sm mt-2" dir="rtl">كيف كانت تجربتك؟</p>
          </div>

          <div className="flex justify-center gap-2" data-testid="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => { if (!feedbackSaved) setRating(star); }}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200 active:scale-[0.85] ${
                  star <= rating
                    ? "bg-amber-500/20 border-2 border-amber-400/50 scale-110"
                    : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
                }`}
                data-testid={`button-star-${star}`}
              >
                {star <= rating ? "⭐" : "☆"}
              </button>
            ))}
          </div>

          {showFeedbackForm && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" data-testid="feedback-form">
              <p className="text-red-400/80 text-sm font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
                نأسف لذلك، كيف يمكننا التحسن؟
              </p>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="اكتب ملاحظاتك هنا..."
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl min-h-[100px] resize-none"
                dir="rtl"
                data-testid="input-feedback"
              />
              <button
                onClick={handleSubmitFeedback}
                disabled={feedbackSaving}
                className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold active:scale-[0.97] transition-all disabled:opacity-50"
                style={{ boxShadow: "0 0 20px rgba(255,0,0,0.15)" }}
                data-testid="button-submit-feedback"
              >
                {feedbackSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "إرسال الملاحظات"}
              </button>
            </div>
          )}

          {showCelebration && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500" data-testid="celebration-message">
              {isHighRating && !feedbackSaved && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="text-4xl">❤️</span>
                  </div>
                  <p className="text-emerald-400 text-lg font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-celebration">
                    شكراً لثقتك، نسعد بخدمتك دائماً! ❤️
                  </p>
                </>
              )}
              {feedbackSaved && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="text-4xl">✅</span>
                  </div>
                  <p className="text-emerald-400 text-lg font-bold" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
                    شكراً لملاحظاتك! سنعمل على التحسين
                  </p>
                </>
              )}

              {isHighRating && !feedbackSaved && (
                <button
                  onClick={() => { handleSubmitFeedback().then(() => {}); }}
                  disabled={feedbackSaving}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold active:scale-[0.97] transition-all disabled:opacity-50"
                  data-testid="button-save-high-rating"
                >
                  {feedbackSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "حفظ التقييم"}
                </button>
              )}

              <button
                onClick={handleCloseFeedback}
                className="w-full py-3.5 rounded-2xl border border-white/10 text-white/50 text-sm font-bold active:scale-[0.97] transition-all hover:text-white/70"
                data-testid="button-close-rating"
              >
                <X className="w-4 h-4 inline me-1.5" />
                إغلاق
              </button>
            </div>
          )}

          {rating === 0 && (
            <button
              onClick={handleCloseFeedback}
              className="text-white/20 text-xs hover:text-white/40 transition-colors"
              data-testid="button-skip-rating"
            >
              تخطي
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
