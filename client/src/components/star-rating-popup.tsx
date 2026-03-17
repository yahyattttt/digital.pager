import { useState } from "react";
import { X, Loader2, MapPin } from "lucide-react";

interface StarRatingPopupProps {
  merchantId: string;
  orderId?: string;
  orderType?: string;
  googleMapsUrl?: string;
  onClose: () => void;
}

export function StarRatingPopup({ merchantId, orderId, orderType, googleMapsUrl, onClose }: StarRatingPopupProps) {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"stars" | "comment" | "done_low" | "done_no_maps">("stars");

  function saveFeedbackBackground(stars: number, commentText: string) {
    const payload = JSON.stringify({ merchantId, stars, comment: commentText, orderId, orderType });
    const blob = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon("/api/feedback", blob);
    if (!sent) {
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => {});
    }
  }

  function handleStarClick(star: number) {
    setSelected(star);

    if (star >= 4) {
      saveFeedbackBackground(star, "");

      if (googleMapsUrl) {
        window.location.href = googleMapsUrl;
      } else {
        setPhase("done_no_maps");
        setTimeout(onClose, 3000);
      }
    } else {
      setPhase("comment");
    }
  }

  async function handleSubmitLow() {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, stars: selected, comment, orderId, orderType }),
      });
    } catch {}
    setSubmitting(false);
    setPhase("done_low");
    setTimeout(onClose, 3000);
  }

  const display = hovered || selected;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      data-testid="star-rating-popup"
    >
      <div
        className="w-full max-w-sm mx-auto mb-0 rounded-t-3xl animate-in slide-in-from-bottom-4 duration-300"
        style={{
          background: "linear-gradient(180deg, #111111 0%, #0d0d0d 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          paddingBottom: "env(safe-area-inset-bottom, 20px)",
        }}
      >
        {/* Drag handle + close */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div />
          <div className="w-10 h-1 rounded-full bg-white/10 mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            data-testid="button-close-rating"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-8 flex flex-col items-center gap-5">

          {/* PHASE: stars */}
          {phase === "stars" && (
            <>
              <div className="text-center">
                <p className="text-white font-bold text-lg" data-testid="text-rating-title" dir="rtl">
                  كيف كانت تجربتك؟
                </p>
                <p className="text-white/40 text-sm mt-1">قيّم خدمتنا</p>
              </div>
              <div className="flex items-center gap-3" dir="ltr" data-testid="star-row">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => handleStarClick(s)}
                    className="transition-transform duration-150 active:scale-90 p-1"
                    data-testid={`star-btn-${s}`}
                  >
                    <span
                      className="text-4xl leading-none transition-all duration-150"
                      style={{
                        color: s <= display ? "#f59e0b" : "rgba(255,255,255,0.12)",
                        filter: s <= display ? "drop-shadow(0 0 8px rgba(245,158,11,0.6))" : "none",
                      }}
                    >
                      ★
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between w-full px-2">
                {["سيء جداً", "سيء", "مقبول", "جيد", "ممتاز"].map((label, i) => (
                  <span key={i} className="text-[10px] text-white/20 text-center" style={{ width: "44px" }}>
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* PHASE: comment (low ratings 1-3 only) */}
          {phase === "comment" && (
            <>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center mb-2" dir="ltr">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-xl" style={{ color: s <= selected ? "#f59e0b" : "rgba(255,255,255,0.1)" }}>★</span>
                  ))}
                </div>
                <p className="text-white font-bold text-base" dir="rtl">ملاحظاتك تهمنا</p>
                <p className="text-white/40 text-sm mt-1" dir="rtl">أخبرنا كيف يمكننا التحسّن</p>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="اكتب ملاحظاتك هنا..."
                rows={4}
                dir="rtl"
                className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none text-white placeholder:text-white/20"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontFamily: "'Tajawal','Cairo',sans-serif",
                }}
                data-testid="textarea-feedback-comment"
              />
              <button
                onClick={handleSubmitLow}
                disabled={submitting || !comment.trim()}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40"
                style={{
                  background: comment.trim() ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" : "rgba(255,255,255,0.06)",
                  color: comment.trim() ? "#fff" : "rgba(255,255,255,0.3)",
                  fontFamily: "'Tajawal','Cairo',sans-serif",
                }}
                data-testid="button-submit-feedback"
              >
                {submitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <span dir="rtl">إرسال التقييم</span>
                }
              </button>
            </>
          )}

          {/* PHASE: done_low (1-3 stars submitted) */}
          {phase === "done_low" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center" data-testid="done-low-state">
              <span className="text-4xl">🙏</span>
              <p className="text-white font-bold text-lg" dir="rtl">شكراً لملاحظاتك</p>
              <p className="text-white/50 text-sm leading-relaxed" dir="rtl">
                سنعمل على التحسن وتقديم تجربة أفضل لك
              </p>
            </div>
          )}

          {/* PHASE: done_no_maps (4-5 stars but no Maps URL configured) */}
          {phase === "done_no_maps" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center" data-testid="done-no-maps-state">
              <span className="text-4xl">🌟</span>
              <p className="text-white font-bold text-lg" dir="rtl">شكراً لثقتك!</p>
              <p className="text-white/50 text-sm leading-relaxed" dir="rtl">
                نسعد دائماً بخدمتك
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
