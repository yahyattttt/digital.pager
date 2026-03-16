import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Globe, Maximize, Minimize, ArrowLeft, ArrowRight } from "lucide-react";
import neonBellLogo from "@assets/image0_(1)_1773118136698.png";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { t, toggleLanguage, isRTL } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tick, setTick] = useState(0);
  const pagerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Animate queue number cycling on the pager screen
  useEffect(() => {
    const iv = setInterval(() => setTick(n => (n + 1) % 12), 2800);
    return () => clearInterval(iv);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const queueNum = 7 + tick;

  const features = [
    {
      id: "shield",
      svg: (
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff6b35" />
              <stop offset="100%" stopColor="#ff2200" />
            </linearGradient>
          </defs>
          <path d="M24 4L8 10v12c0 9 6.7 17.3 16 19.4C33.3 39.3 40 31 40 22V10L24 4z" fill="url(#sg1)" opacity="0.15" />
          <path d="M24 4L8 10v12c0 9 6.7 17.3 16 19.4C33.3 39.3 40 31 40 22V10L24 4z" stroke="url(#sg1)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M17 24l5 5 9-10" stroke="#ff6b35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: t("أمان متعدد المتاجر", "Multi-Tenant Security"),
      description: t(
        "بياناتك معزولة بالكامل. كل متجر يحصل على مساحة عمل آمنة خاصة به.",
        "Your data is fully isolated. Each store gets its own secure workspace."
      ),
    },
    {
      id: "zap",
      svg: (
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="zg1" x1="0" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#ffb347" />
              <stop offset="100%" stopColor="#ff4500" />
            </linearGradient>
          </defs>
          <polygon points="26,4 10,26 22,26 22,44 38,22 26,22" fill="url(#zg1)" opacity="0.18" />
          <polygon points="26,4 10,26 22,26 22,44 38,22 26,22" stroke="url(#zg1)" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="18" y1="26" x2="30" y2="26" stroke="#ffb347" strokeWidth="1" opacity="0.5" />
        </svg>
      ),
      title: t("إعداد سريع", "Quick Setup"),
      description: t(
        "ابدأ في دقائق. لا تحتاج أجهزة إضافية — فقط هاتفك أو جهازك اللوحي.",
        "Get started in minutes. No extra hardware needed — just your phone or tablet."
      ),
    },
    {
      id: "users",
      svg: (
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="ug1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff6b35" />
              <stop offset="100%" stopColor="#cc2200" />
            </linearGradient>
          </defs>
          <circle cx="18" cy="16" r="6" stroke="url(#ug1)" strokeWidth="1.5" fill="url(#ug1)" fillOpacity="0.12" />
          <circle cx="32" cy="16" r="5" stroke="#ff4500" strokeWidth="1.2" fill="#ff4500" fillOpacity="0.08" />
          <path d="M6 38c0-7 5.4-12 12-12h0c6.6 0 12 5 12 12" stroke="url(#ug1)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M34 27c3.5 1 6 4.2 6 8.5" stroke="#ff4500" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
      title: t("قائمة انتظار ذكية", "Smart Waitlist"),
      description: t(
        "أدر قائمة الانتظار بكفاءة مع تحديثات لحظية وأوقات انتظار تقديرية.",
        "Manage your waitlist efficiently with real-time updates and estimated wait times."
      ),
    },
    {
      id: "bell",
      svg: (
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg1" x1="0.3" y1="0" x2="0.7" y2="1">
              <stop offset="0%" stopColor="#ff6b35" />
              <stop offset="100%" stopColor="#ff2200" />
            </linearGradient>
          </defs>
          <path d="M24 6c-7.7 0-14 6.3-14 14v8l-3 5h34l-3-5V20C38 12.3 31.7 6 24 6z" fill="url(#bg1)" fillOpacity="0.14" stroke="url(#bg1)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M20 33c0 2.2 1.8 4 4 4s4-1.8 4-4" stroke="#ff6b35" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="24" cy="6" r="2" fill="#ff6b35" />
          <circle cx="37" cy="9" r="2.5" fill="#ff4500" />
          <circle cx="37" cy="9" r="1.2" fill="#ffb347" />
        </svg>
      ),
      title: t("إشعارات فورية", "Instant Notifications"),
      description: t(
        "أبلغ عملاءك عبر الرسائل النصية أو الإشعارات الفورية عندما يحين دورهم.",
        "Notify your customers via SMS or push notifications when it's their turn."
      ),
    },
  ];

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen overflow-x-hidden"
      style={{ background: "#080808", fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* ── Ambient background glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Primary red-orange radial glow, centered on hero */}
        <div style={{
          position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
          width: 700, height: 500,
          background: "radial-gradient(ellipse at center, rgba(255,69,0,0.12) 0%, rgba(255,69,0,0.04) 50%, transparent 75%)",
          borderRadius: "50%",
        }} />
        {/* Subtle secondary glow bottom-left */}
        <div style={{
          position: "absolute", bottom: "5%", left: "-5%",
          width: 400, height: 350,
          background: "radial-gradient(ellipse at center, rgba(200,30,0,0.07) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
      </div>

      {/* ── NAV ── */}
      <nav style={{ position: "relative", zIndex: 50, borderBottom: "1px solid rgba(255,69,0,0.15)", backdropFilter: "blur(12px)", background: "rgba(8,8,8,0.75)" }}>
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={neonBellLogo} alt="Digital Pager" className="h-12 w-auto object-contain flex-shrink-0" style={{ mixBlendMode: "screen" }} />
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "0.02em", color: "#fff" }}>Digital Pager</span>
          </div>

          {/* Nav actions */}
          <div className="flex items-center gap-2">
            <NeonIconBtn onClick={toggleFullscreen} testId="button-toggle-fullscreen">
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </NeonIconBtn>
            <NeonIconBtn onClick={toggleLanguage} testId="button-toggle-language">
              <Globe className="w-4 h-4" />
            </NeonIconBtn>
            <NeonBtn variant="ghost" onClick={() => setLocation("/login")} testId="button-nav-login">
              {t("تسجيل الدخول", "Sign In")}
            </NeonBtn>
            <NeonBtn variant="solid" onClick={() => setLocation("/register")} testId="button-nav-register">
              {t("سجل متجرك", "Register")}
            </NeonBtn>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", zIndex: 10 }}>
        <div className="max-w-7xl mx-auto px-5 pt-16 pb-20">
          <div
            className="flex flex-col lg:flex-row items-center gap-14"
            style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
          >
            {/* Left: Text */}
            <div className="flex-1 min-w-0" style={{ textAlign: isRTL ? "right" : "left" }}>
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 mb-7"
                style={{
                  padding: "6px 14px", borderRadius: 999,
                  border: "1px solid rgba(255,69,0,0.35)",
                  background: "rgba(255,69,0,0.08)",
                  fontSize: 13, fontWeight: 700, color: "#ff7040",
                  letterSpacing: "0.05em",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff4500", display: "inline-block", boxShadow: "0 0 8px #ff4500" }} />
                {t("الحل العصري لإدارة قوائم الانتظار", "The Modern Waitlist Solution")}
              </div>

              {/* Main title */}
              <h1
                data-testid="text-hero-title"
                style={{
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  fontWeight: 900,
                  lineHeight: 1.22,
                  color: "#f0f0f0",
                  marginBottom: 20,
                  letterSpacing: "-0.01em",
                }}
              >
                {t("تخلص من البيجر التقليدي.", "Ditch the Old Pagers.")}
                <br />
                <span
                  style={{
                    color: "#ff4500",
                    textShadow: "0 0 32px rgba(255,69,0,0.7), 0 0 80px rgba(255,69,0,0.25)",
                  }}
                >
                  {t("انطلق رقمياً.", "Go Digital.")}
                </span>
              </h1>

              {/* Description */}
              <p
                data-testid="text-hero-subtitle"
                style={{
                  fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
                  color: "rgba(220,210,205,0.75)",
                  lineHeight: 1.8,
                  marginBottom: 32,
                  maxWidth: 520,
                }}
              >
                {t(
                  "Digital Pager يستبدل أنظمة البيجر التقليدية بحل رقمي عصري. أشعر عملاءك فوراً، وأدر قائمة انتظارك بشكل لحظي، وقدم تجربة استثنائية.",
                  "Digital Pager replaces traditional pager systems with a modern digital solution. Notify your customers instantly, manage your waitlist in real-time, and deliver an exceptional experience."
                )}
              </p>

              {/* CTA Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <NeonBtn variant="solid" size="lg" onClick={() => setLocation("/register")} testId="button-hero-register">
                  {t("سجل متجرك الآن", "Register Now")}
                  <ArrowIcon className="w-4 h-4 ms-2 inline" />
                </NeonBtn>
                <NeonBtn variant="ghost" size="lg" onClick={() => setLocation("/login")} testId="button-hero-login">
                  {t("تسجيل الدخول", "Sign In")}
                </NeonBtn>
              </div>

              {/* Stat pills */}
              <div className="flex items-center gap-4 mt-8 flex-wrap">
                {[
                  { n: "500+", label: t("متجر نشط", "Active Stores") },
                  { n: "99.9%", label: t("وقت التشغيل", "Uptime") },
                  { n: "< 1ث", label: t("سرعة الإشعار", "Alert Speed") },
                ].map(s => (
                  <div key={s.n} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#ff6030" }}>{s.n}</span>
                    <span style={{ fontSize: 11, color: "rgba(180,160,150,0.7)", marginTop: 1 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: 3D Digital Pager Device */}
            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: "clamp(260px,38vw,420px)" }}>
              <PagerDevice queueNum={queueNum} t={t} pagerRef={pagerRef} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section style={{ position: "relative", zIndex: 10, paddingBottom: 80 }}>
        <div className="max-w-7xl mx-auto px-5">
          {/* Section label */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ fontSize: 12, letterSpacing: "0.18em", color: "#ff4500", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
              {t("المميزات", "FEATURES")}
            </p>
            <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, color: "#f0f0f0" }}>
              {t("كل ما تحتاجه في مكان واحد", "Everything You Need In One Place")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <FeatureCard key={f.id} icon={f.svg} title={f.title} description={f.description} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ── */}
      <section
        style={{
          position: "relative", zIndex: 10,
          borderTop: "1px solid rgba(255,69,0,0.15)",
          borderBottom: "1px solid rgba(255,69,0,0.15)",
          background: "linear-gradient(135deg, rgba(255,69,0,0.06) 0%, rgba(8,8,8,0) 60%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 py-16 text-center">
          <h2 data-testid="text-cta-title" style={{ fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 800, color: "#f0f0f0", marginBottom: 14 }}>
            {t("مستعد لتطوير نظام الانتظار لديك؟", "Ready to upgrade your waitlist?")}
          </h2>
          <p style={{ color: "rgba(200,185,178,0.65)", fontSize: 15, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
            {t(
              "انضم إلى مئات المتاجر التي تثق بـ Digital Pager لتقديم تجربة سلسة لعملائها.",
              "Join hundreds of businesses that trust Digital Pager to deliver a seamless customer experience."
            )}
          </p>
          <NeonBtn variant="solid" size="lg" onClick={() => setLocation("/register")} testId="button-cta-register">
            {t("ابدأ مجاناً", "Get Started Free")}
            <ArrowIcon className="w-4 h-4 ms-2 inline" />
          </NeonBtn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto px-5 py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <img src={neonBellLogo} alt="Digital Pager" className="h-8 w-auto object-contain" style={{ mixBlendMode: "screen" }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Digital Pager</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(200,190,185,0.45)" }}>
            &copy; {new Date().getFullYear()} Digital Pager. {t("جميع الحقوق محفوظة.", "All rights reserved.")}
          </p>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');

        @keyframes floatPager {
          0%,100% { transform: perspective(900px) rotateY(-14deg) rotateX(5deg) translateY(0px); }
          50%      { transform: perspective(900px) rotateY(-14deg) rotateX(5deg) translateY(-10px); }
        }
        @keyframes pagerGlow {
          0%,100% { box-shadow: 0 0 40px rgba(255,69,0,0.35), 0 0 80px rgba(255,69,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08); }
          50%      { box-shadow: 0 0 55px rgba(255,69,0,0.5),  0 0 110px rgba(255,69,0,0.2),  inset 0 1px 0 rgba(255,255,255,0.08); }
        }
        @keyframes screenBlink {
          0%,95%,100% { opacity: 1; }
          97%          { opacity: 0.85; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes neonPulse {
          0%,100% { text-shadow: 0 0 14px rgba(255,69,0,0.8), 0 0 40px rgba(255,69,0,0.3); }
          50%      { text-shadow: 0 0 22px rgba(255,69,0,1),   0 0 60px rgba(255,69,0,0.45); }
        }
        @keyframes dotBlink {
          0%,49%,100% { opacity:1; }
          50%,99%     { opacity:0; }
        }
        .pager-device {
          animation: floatPager 4s ease-in-out infinite, pagerGlow 4s ease-in-out infinite;
        }
        .pager-screen {
          animation: screenBlink 5s ease-in-out infinite;
        }
        .neon-text {
          animation: neonPulse 2.5s ease-in-out infinite;
        }
        .live-dot {
          animation: dotBlink 1.1s step-start infinite;
        }
        .neon-btn-solid {
          background: linear-gradient(135deg, #ff4500, #cc2200);
          color: #fff;
          border: 1px solid rgba(255,100,50,0.4);
          transition: all 0.22s ease;
        }
        .neon-btn-solid:hover {
          background: linear-gradient(135deg, #ff6030, #e02800);
          box-shadow: 0 0 18px rgba(255,69,0,0.6), 0 0 45px rgba(255,69,0,0.2);
          transform: translateY(-1px);
        }
        .neon-btn-ghost {
          background: transparent;
          color: rgba(240,230,225,0.8);
          border: 1px solid rgba(255,69,0,0.25);
          transition: all 0.22s ease;
        }
        .neon-btn-ghost:hover {
          border-color: rgba(255,69,0,0.55);
          color: #ff7050;
          background: rgba(255,69,0,0.07);
          box-shadow: 0 0 12px rgba(255,69,0,0.25);
        }
        .neon-icon-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,69,0,0.2);
          color: rgba(240,230,225,0.7);
          border-radius: 8px;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.22s ease;
        }
        .neon-icon-btn:hover {
          border-color: rgba(255,69,0,0.55);
          color: #ff6030;
          background: rgba(255,69,0,0.09);
          box-shadow: 0 0 10px rgba(255,69,0,0.3);
        }
        .feature-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,69,0,0.12);
          border-radius: 16px;
          padding: 24px 20px;
          transition: all 0.28s ease;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,69,0,0.06) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.28s ease;
          border-radius: inherit;
        }
        .feature-card:hover {
          border-color: rgba(255,69,0,0.38);
          box-shadow: 0 4px 24px rgba(255,69,0,0.15), 0 0 0 1px rgba(255,69,0,0.08);
          transform: translateY(-3px);
        }
        .feature-card:hover::before { opacity: 1; }
      `}</style>
    </div>
  );
}

/* ── 3D Digital Pager Device ── */
function PagerDevice({ queueNum, t, pagerRef }: { queueNum: number; t: (ar: string, en: string) => string; pagerRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div ref={pagerRef} style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
      {/* Ambient halo behind device */}
      <div style={{
        position: "absolute", inset: "-30px",
        background: "radial-gradient(ellipse at 50% 55%, rgba(255,69,0,0.22) 0%, rgba(255,69,0,0.06) 45%, transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none",
      }} />

      {/* The device itself */}
      <div
        className="pager-device"
        style={{
          width: 220,
          borderRadius: 24,
          background: "linear-gradient(160deg, #1a1614 0%, #110d0b 60%, #0d0b0a 100%)",
          border: "1px solid rgba(255,90,30,0.22)",
          padding: "18px 14px 20px",
          position: "relative",
          transformOrigin: "center center",
        }}
      >
        {/* Top speaker grille */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 12 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,80,20,0.4)" }} />
          ))}
        </div>

        {/* Device label */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(255,110,50,0.6)", fontWeight: 700, textTransform: "uppercase" }}>
            DIGITAL PAGER
          </span>
        </div>

        {/* OLED Screen */}
        <div
          className="pager-screen"
          style={{
            background: "#060404",
            borderRadius: 12,
            padding: "14px 12px 16px",
            border: "1px solid rgba(255,69,0,0.3)",
            boxShadow: "0 0 20px rgba(255,69,0,0.25) inset, 0 0 8px rgba(255,69,0,0.15)",
            position: "relative",
            overflow: "hidden",
            minHeight: 190,
          }}
        >
          {/* Scanline overlay */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)",
            zIndex: 5,
          }} />
          {/* Moving scanline */}
          <div style={{
            position: "absolute", left: 0, right: 0, height: 28,
            background: "linear-gradient(180deg, transparent 0%, rgba(255,69,0,0.04) 50%, transparent 100%)",
            animation: "scanline 3s linear infinite",
            zIndex: 6,
          }} />

          {/* Screen content */}
          <div style={{ position: "relative", zIndex: 7, direction: "rtl", textAlign: "center" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 8, color: "rgba(255,80,30,0.6)", fontWeight: 700 }}>LIVE</span>
              <span className="live-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff4500", display: "inline-block", boxShadow: "0 0 6px #ff4500" }} />
            </div>

            {/* Queue label */}
            <div style={{ marginBottom: 4 }}>
              <span className="neon-text" style={{
                fontSize: 13, fontWeight: 800, color: "#ff6030",
                display: "block", letterSpacing: "0.03em",
              }}>
                قائمة انتظار لحظية
              </span>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,69,0,0.4), transparent)", margin: "8px 0" }} />

            {/* Queue number - large */}
            <div style={{ margin: "10px 0" }}>
              <p style={{ fontSize: 10, color: "rgba(255,160,100,0.6)", marginBottom: 3 }}>الدور الحالي</p>
              <div style={{
                fontSize: 52, fontWeight: 900, color: "#ff4500", lineHeight: 1,
                textShadow: "0 0 20px rgba(255,69,0,0.9), 0 0 50px rgba(255,69,0,0.4)",
                fontVariantNumeric: "tabular-nums",
              }}>
                {queueNum}
              </div>
              <p style={{
                fontSize: 13, fontWeight: 800, color: "rgba(255,130,80,0.9)",
                marginTop: 6,
              }}>
                دور: <span style={{ color: "#ff6030" }}>{queueNum}</span>
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,69,0,0.3), transparent)", margin: "6px 0" }} />

            {/* Status bar */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 8, color: "rgba(255,110,50,0.55)" }}>انتظار: 3</span>
              <span style={{ fontSize: 8, color: "rgba(100,255,120,0.7)" }}>✓ نشط</span>
            </div>
          </div>
        </div>

        {/* Bottom buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14 }}>
          {["#ff4500", "rgba(255,255,255,0.15)", "rgba(255,255,255,0.15)"].map((bg, i) => (
            <div key={i} style={{
              width: i === 0 ? 42 : 22, height: 8, borderRadius: 4,
              background: bg,
              boxShadow: i === 0 ? "0 0 8px rgba(255,69,0,0.7)" : "none",
            }} />
          ))}
        </div>

        {/* Metallic side edge reflection */}
        <div style={{
          position: "absolute", top: 20, bottom: 20, right: -1,
          width: 3, borderRadius: "0 3px 3px 0",
          background: "linear-gradient(180deg, rgba(255,120,60,0.5) 0%, rgba(255,80,30,0.2) 50%, rgba(255,120,60,0.4) 100%)",
        }} />
        <div style={{
          position: "absolute", top: 20, bottom: 20, left: -1,
          width: 3, borderRadius: "3px 0 0 3px",
          background: "linear-gradient(180deg, rgba(60,50,45,0.8) 0%, rgba(30,25,22,0.5) 50%, rgba(60,50,45,0.7) 100%)",
        }} />
      </div>

      {/* Shadow on ground */}
      <div style={{
        position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)",
        width: 140, height: 18,
        background: "radial-gradient(ellipse at center, rgba(255,69,0,0.25) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(4px)",
      }} />
    </div>
  );
}

/* ── Neon Button ── */
function NeonBtn({
  children, onClick, variant = "ghost", size = "md", testId
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "ghost";
  size?: "md" | "lg";
  testId?: string;
}) {
  const pad = size === "lg" ? "10px 24px" : "8px 16px";
  const fs  = size === "lg" ? 15 : 14;
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={variant === "solid" ? "neon-btn-solid" : "neon-btn-ghost"}
      style={{
        padding: pad, fontSize: fs, fontWeight: 700,
        borderRadius: 10, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

/* ── Neon Icon Button ── */
function NeonIconBtn({ children, onClick, testId }: { children: React.ReactNode; onClick?: () => void; testId?: string }) {
  return (
    <button onClick={onClick} data-testid={testId} className="neon-icon-btn">
      {children}
    </button>
  );
}

/* ── Feature Card ── */
function FeatureCard({ icon, title, description, index }: {
  icon: React.ReactNode; title: string; description: string; index: number;
}) {
  return (
    <div className="feature-card" data-testid={`card-feature-${index}`}>
      <div style={{
        width: 52, height: 52, marginBottom: 16,
        filter: "drop-shadow(0 0 10px rgba(255,69,0,0.4))",
      }}>
        {icon}
      </div>
      <h3
        data-testid={`text-feature-title-${index}`}
        style={{ fontSize: 15, fontWeight: 800, color: "#f0ebe8", marginBottom: 8, lineHeight: 1.4 }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 13, color: "rgba(200,188,182,0.65)", lineHeight: 1.75 }}>
        {description}
      </p>
    </div>
  );
}
