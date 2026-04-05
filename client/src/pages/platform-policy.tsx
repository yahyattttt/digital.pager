import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";

export default function PlatformPolicyPage() {
  const { t, isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const [policyAr, setPolicyAr] = useState("");
  const [policyEn, setPolicyEn] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${t("سياسة الاشتراك والإلغاء والاسترداد", "Subscription, Cancellation & Refund Policy")} | Digital Pager`;
    fetch("/api/public/platform-content")
      .then(r => r.json())
      .then(data => {
        setPolicyAr(data.policyAr || "");
        setPolicyEn(data.policyEn || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const content = isRTL ? policyAr : policyEn;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen"
      style={{ background: "#080808", fontFamily: "'Cairo', 'Tajawal', sans-serif", color: "#f0f0f0" }}
    >
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,69,0,0.15)", background: "rgba(8,8,8,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            data-testid="button-back-home"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ff4500", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}
          >
            <BackIcon className="w-4 h-4" />
            {t("العودة للرئيسية", "Back to Home")}
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 py-14">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div style={{ background: "rgba(255,69,0,0.1)", border: "1px solid rgba(255,69,0,0.25)", borderRadius: 12, padding: "10px" }}>
            <ShieldCheck className="w-6 h-6" style={{ color: "#ff4500" }} />
          </div>
          <div>
            <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "#ff4500", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
              {t("المستند الرسمي", "OFFICIAL DOCUMENT")}
            </p>
            <h1 style={{ fontSize: "clamp(1.2rem, 3vw, 1.8rem)", fontWeight: 800, color: "#f0f0f0", margin: 0 }}>
              {t("سياسة الاشتراك والإلغاء والاسترداد", "Subscription, Cancellation & Refund Policy")}
            </h1>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            background: "rgba(28,8,8,0.6)",
            border: "1px solid rgba(255,69,0,0.12)",
            borderRadius: 16,
            padding: "32px 28px",
            minHeight: 300,
          }}
        >
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[80, 60, 90, 70, 50].map((w, i) => (
                <div key={i} style={{ height: 14, background: "rgba(255,255,255,0.06)", borderRadius: 6, width: `${w}%`, animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : content ? (
            <p
              data-testid="text-platform-policy-content"
              style={{ whiteSpace: "pre-wrap", lineHeight: 2, fontSize: 14, color: "rgba(220,210,200,0.82)" }}
            >
              {content}
            </p>
          ) : (
            <p style={{ color: "rgba(200,185,178,0.4)", textAlign: "center", fontSize: 14, paddingTop: 40 }}>
              {t("لا يوجد محتوى حتى الآن.", "No content available yet.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
