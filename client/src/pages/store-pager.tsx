import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Share2, Copy, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { StarRatingPopup } from "@/components/star-rating-popup";

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
  support_whatsapp?: string;
};

type Phase = "selection" | "preparing" | "ready" | "done";

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
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const ratingShownRef = useRef(false);

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
    if (!storeId) return;
    fetch(`/api/track/tableqr/${storeId}`, { method: "POST" }).catch(() => {});
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
        stopAlert();
        if (!ratingShownRef.current) {
          ratingShownRef.current = true;
          setShowRatingPopup(true);
        } else {
          cleanupSession();
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
    const text = `خلك معي في اللحظة! 🍔 شوف طلبي في ${label} وهو يجهز الآن على الطاولة.. عقبالك!`;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: text, text, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast({ title: "تم نسخ رابط اللحظة! شاركه مع من تحب 💛" });
      } catch {
        toast({ title: "خطأ", description: "تعذر نسخ الرابط", variant: "destructive" });
      }
    }
  }, [merchant, toast]);

  function handleGoogleMapsClick() {
    if (!merchant?.googleMapsReviewUrl) return;
    window.open(merchant.googleMapsReviewUrl, "_blank");
    fetch(`/api/track/gmaps/${storeId}`, { method: "POST" }).catch(() => {});
  }

  const bg = "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)";

  if (loadingMerchant) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if ((merchant as any)?.isStoreActive === false) {
    return (
      <div
        className="h-[100dvh] flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: bg, fontFamily: "'Tajawal','Cairo',sans-serif" }}
        data-testid="screen-store-paused"
      >
        {merchant?.logoUrl && (
          <img src={merchant.logoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover opacity-40" />
        )}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "rgba(80,0,0,0.4)", border: "2px solid rgba(180,0,0,0.3)" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(200,50,50,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <p className="text-xl font-bold text-red-400/90" data-testid="text-store-paused-ar">
            عذراً، المتجر متوقف حالياً
          </p>
          <p className="text-sm text-white/30" data-testid="text-store-paused-en">
            This store is currently unavailable
          </p>
        </div>
        {merchant?.storeName && (
          <p className="text-xs text-white/20">{merchant.storeName}</p>
        )}
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
          <p className="text-white/40 text-[13px] mt-2 font-medium" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
            قم باختيار رقم طلبك من القائمة أعلاه
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
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

        {/* Sticky footer: Receipt reminder */}
        <div
          className="shrink-0 w-full text-center"
          style={{
            padding: "15px 20px",
            background: "rgba(10,0,0,0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255,200,0,0.18)",
            paddingBottom: "calc(15px + env(safe-area-inset-bottom))",
          }}
          data-testid="notice-receipt-reminder"
        >
          <p
            className="text-[14px] font-bold"
            style={{ color: "rgba(253,224,70,0.92)", fontFamily: "'Tajawal','Cairo',sans-serif" }}
            dir="rtl"
          >
            ⚠️ تنبيه: يجب إحضار الفاتورة عند استلام طلبك
          </p>
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

  if (showRatingPopup && storeId) {
    return (
      <div className="h-[100dvh]" style={{ background: bg }}>
        <StarRatingPopup
          merchantId={storeId}
          orderId={selectedPager?.docId}
          orderType="pager"
          googleMapsUrl={merchant?.googleMapsReviewUrl}
          onClose={() => {
            setShowRatingPopup(false);
            ratingShownRef.current = false;
            cleanupSession();
          }}
        />
      </div>
    );
  }

  const waNumber = merchant?.support_whatsapp?.replace(/\D/g, "") || "";
  const waOrderId = selectedPager?.displayOrderId || selectedPager?.orderNumber || "";
  const waMsg = waNumber
    ? encodeURIComponent(`أهلاً ${merchant?.storeName || ""}، لدي استفسار بخصوص طلبي رقم (# ${waOrderId})`)
    : "";
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${waMsg}` : "";

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

          <button
            id="share-moment-btn"
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl active:scale-[0.97] transition-all duration-200"
            style={{
              position: "relative",
              zIndex: 10,
              marginBottom: "20px",
              background: "linear-gradient(135deg, rgba(234,179,8,0.10) 0%, rgba(251,191,36,0.06) 50%, rgba(234,179,8,0.10) 100%)",
              border: "1.5px solid rgba(251,191,36,0.55)",
              boxShadow: "0 0 24px rgba(251,191,36,0.22), 0 0 8px rgba(251,191,36,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
            data-testid="button-share"
          >
            <Share2 className="w-5 h-5" style={{ color: "#fbbf24" }} />
            <span className="text-base font-black" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif", color: "#fde68a" }}>
              شاركهم اللحظة ✨
            </span>
          </button>
        </div>

        <div className="w-full max-w-xs space-y-3">
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

        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-pulse"
            style={{
              position: "fixed",
              bottom: "88px",
              right: "20px",
              zIndex: 40,
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#25d366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
            data-testid="button-whatsapp-support"
            aria-label="تواصل عبر واتساب"
          >
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12.001 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.987-1.306A9.953 9.953 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18c-1.738 0-3.368-.474-4.769-1.299l-.342-.203-3.037.794.812-2.962-.222-.358A7.964 7.964 0 014 12c0-4.418 3.582-8 8.001-8 4.418 0 7.999 3.582 7.999 8s-3.581 8-7.999 8z"/>
            </svg>
          </a>
        )}
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

        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-pulse"
            style={{
              position: "fixed",
              bottom: "88px",
              right: "20px",
              zIndex: 40,
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#25d366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
            data-testid="button-whatsapp-support-ready"
            aria-label="تواصل عبر واتساب"
          >
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12.001 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.987-1.306A9.953 9.953 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18c-1.738 0-3.368-.474-4.769-1.299l-.342-.203-3.037.794.812-2.962-.222-.358A7.964 7.964 0 014 12c0-4.418 3.582-8 8.001-8 4.418 0 7.999 3.582 7.999 8s-3.581 8-7.999 8z"/>
            </svg>
          </a>
        )}
      </div>
    );
  }


  return null;
}
