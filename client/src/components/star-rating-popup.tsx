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
  const [phase, setPhase] = useState<"stars" | "comment" | "done_low" | "done_high">("stars");

  function handleStarClick(star: number) {
    setSelected(star);
    if (star >= 4) {
      handleSubmit(star, "");
    } else {
      setPhase("comment");
    }
  }

  async function handleSubmit(stars: number, commentText: string) {
    if (stars <= 3 && !commentText.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, stars, comment: commentText, orderId, orderType }),
      });
    } catch {}
    setSubmitting(false);

    if (stars >= 4) {
      setPhase("done_high");
      if (googleMapsUrl) {
        setTimeout(() => window.open(googleMapsUrl, "_blank"), 1200);
      }
      setTimeout(onClose, 3500);
    } else {
      setPhase("done_low");
      setTimeout(onClose, 3000);
    }
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
        {/* Header */}
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
                onClick={() => handleSubmit(selected, comment)}
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

          {phase === "done_low" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center" data-testid="done-low-state">
              <span className="text-4xl">🙏</span>
              <p className="text-white font-bold text-lg" dir="rtl">شكراً لملاحظاتك</p>
              <p className="text-white/50 text-sm leading-relaxed" dir="rtl">
                سنعمل على التحسن وتقديم تجربة أفضل لك
              </p>
            </div>
          )}

          {phase === "done_high" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center" data-testid="done-high-state">
              <span className="text-4xl">🌟</span>
              <p className="text-white font-bold text-lg" dir="rtl">شكراً لثقتك!</p>
              <p className="text-white/50 text-sm leading-relaxed" dir="rtl">
                ننتظرك على خرائط جوجل
              </p>
              {googleMapsUrl && (
                <div className="flex items-center gap-1.5 text-amber-400/70 text-xs" dir="rtl">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>جارٍ التحويل...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
