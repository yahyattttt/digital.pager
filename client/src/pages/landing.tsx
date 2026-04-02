import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Globe, Maximize, Minimize, ArrowLeft, ArrowRight, MapPin, Share2, ShoppingBag, Users } from "lucide-react";
import { SiInstagram, SiLinkedin, SiSnapchat } from "react-icons/si";
import neonBellLogo from "@assets/image0_(1)_1773118136698.png";

type FooterInfo = {
  instagram?: string;
  twitterX?: string;
  linkedin?: string;
  snapchat?: string;
  commercialRegister?: string;
  taxNumber?: string;
  location?: string;
};

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { t, toggleLanguage, isRTL } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tick, setTick] = useState(0);
  const [footerInfo, setFooterInfo] = useState<FooterInfo>({});
  const pagerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    fetch("/api/public/footer-info")
      .then(r => r.ok ? r.json() : {})
      .then(data => setFooterInfo(data ?? {}))
      .catch(() => {});
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
      svg: <MapPin className="w-full h-full" style={{ color: "#ff6b35" }} strokeWidth={1.5} />,
      boldText: t("رفع تقييمك على خرائط جوجل:", "Boost Your Google Maps Rating:"),
      bodyText: t(
        " يتم توجيه العميل تلقائياً بعد الانتهاء من الطلب إلى رابط التقييم الخاص بمتجرك، لتتصدر نتائج البحث وتكسب ثقة العملاء الجدد.",
        " Customers are automatically redirected after their order to your store's review link, so you rank higher in search and earn new customer trust."
      ),
    },
    {
      id: "zap",
      svg: <Share2 className="w-full h-full" style={{ color: "#ff6b35" }} strokeWidth={1.5} />,
      boldText: t("نزيد الوعي لعلامتك التجارية:", "We Grow Your Brand Awareness:"),
      bodyText: t(
        " ميزة مشاركة رابط التتبع تتيح لعملائك مشاركة حماسهم مع أصدقائهم، مما يضمن لك انتشاراً واسعاً وزواراً جدد دون تكاليف إعلانية.",
        " The tracking link sharing feature lets your customers spread their excitement with friends, guaranteeing wide reach and new visitors with zero ad spend."
      ),
    },
    {
      id: "bell",
      svg: <Users className="w-full h-full" style={{ color: "#ff6b35" }} strokeWidth={1.5} />,
      boldText: t("قاعدة ببيانات عملاءك:", "Your Customer Database:"),
      bodyText: t(
        " ابنِ ثروتك الحقيقية بامتلاك بيانات عملائك بالكامل، مما يتيح لك فهم تفضيلاتهم وإعادة استهدافهم بعروض مخصصة تضمن عودتهم إليك.",
        " Build your real wealth by owning your complete customer data, enabling you to understand their preferences and retarget them with personalised offers that bring them back."
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
        <div className="max-w-7xl mx-auto px-5 pt-16 pb-16">
          <div
            className="flex flex-col lg:flex-row items-center gap-14"
            style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
          >
            {/* Left: Text */}
            <div className="flex-1 min-w-0" style={{ textAlign: isRTL ? "right" : "left" }}>
              {/* Badge — smaller than headline to anchor the hierarchy */}
              <div
                className="inline-flex items-center gap-2 mb-6"
                style={{
                  padding: "5px 13px", borderRadius: 999,
                  border: "1px solid rgba(255,69,0,0.35)",
                  background: "rgba(255,69,0,0.08)",
                  fontSize: 11, fontWeight: 600, color: "#ff7040",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff4500", display: "inline-block", boxShadow: "0 0 8px #ff4500" }} />
                {t("الحل العصري لإدارة قوائم الانتظار", "The Modern Waitlist Solution")}
              </div>

              {/* Main title — ExtraBold/Black, largest text on the page */}
              <h1
                data-testid="text-hero-title"
                style={{
                  fontSize: "clamp(2.5rem, 6vw, 4.4rem)",
                  fontWeight: 900,
                  lineHeight: 1.18,
                  color: "#f0f0f0",
                  marginBottom: 24,
                  letterSpacing: "-0.02em",
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

              {/* Description — Regular weight contrasts sharply with the Black headline */}
              <p
                data-testid="text-hero-subtitle"
                style={{
                  fontSize: "clamp(0.95rem, 1.6vw, 1.05rem)",
                  fontWeight: 400,
                  color: "rgba(220,210,205,0.75)",
                  lineHeight: 1.8,
                  marginBottom: 36,
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
            </div>

            {/* Right: 3D Digital Pager Device */}
            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: "clamp(260px,38vw,420px)" }}>
              <PagerDevice queueNum={queueNum} t={t} pagerRef={pagerRef} />
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section style={{ position: "relative", zIndex: 10, paddingTop: 80, paddingBottom: 80 }}>
        <div className="max-w-7xl mx-auto px-5">
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "#ff4500", fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>
              {t("الأسعار", "PRICING")}
            </p>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontWeight: 800, color: "#f0f0f0", lineHeight: 1.3, marginBottom: 16 }}>
              {t("اختر باقتك المناسبة", "Choose Your Plan")}
            </h2>
            {/* Discount banner */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ background: "linear-gradient(90deg,#ff4500,#ff6a00)", borderRadius: 99, padding: "5px 18px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                خصم خاص للعملاء الجدد 60%
              </span>
              <span style={{ background: "rgba(255,69,0,0.1)", border: "1px solid rgba(255,69,0,0.3)", borderRadius: 99, padding: "5px 16px", fontSize: 12, fontWeight: 600, color: "#ff6a00" }}>
                تجربة مجانية لمدة 15 يوم
              </span>
            </div>
          </div>

          {/* 4 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { period: "باقة شهر",     months: 1,  original: 99,  discounted: 39  },
              { period: "باقة 3 شهور",  months: 3,  original: 269, discounted: 107 },
              { period: "باقة 6 شهور",  months: 6,  original: 499, discounted: 199 },
              { period: "باقة 12 شهر",  months: 12, original: 999, discounted: 399 },
            ].map((pkg, i) => (
              <div
                key={i}
                data-testid={`card-pricing-${pkg.months}m`}
                style={{
                  background: "linear-gradient(160deg,rgba(28,8,8,0.97) 0%,rgba(14,4,4,0.99) 100%)",
                  border: i === 3 ? "1.5px solid rgba(255,69,0,0.65)" : "1px solid rgba(255,69,0,0.16)",
                  borderRadius: 18,
                  padding: "26px 22px",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: i === 3 ? "0 0 40px rgba(255,69,0,0.1)" : "none",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Most-value badge */}
                {i === 3 && (
                  <div style={{ position: "absolute", top: 14, insetInlineEnd: 14, background: "#ff4500", borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>
                    {t("الأوفر", "Best Value")}
                  </div>
                )}

                {/* Plan name */}
                <p style={{ color: "#ff4500", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>{pkg.period}</p>

                {/* Price */}
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 12, color: "rgba(200,185,178,0.4)", textDecoration: "line-through", display: "block", marginBottom: 2 }}>
                    {pkg.original} SR
                  </span>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#f0f0f0", lineHeight: 1 }}>
                    {pkg.discounted}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(200,185,178,0.55)", marginInlineStart: 4 }}>SR</span>
                </div>

                {/* Divider */}
                <div style={{ borderTop: "1px solid rgba(255,69,0,0.1)", marginBottom: 16 }} />

                {/* Subscription header */}
                <p style={{ fontSize: 11, color: "rgba(200,185,178,0.6)", fontWeight: 700, marginBottom: 12, letterSpacing: "0.04em" }}>
                  {t("الإشتراك يشمل:", "Plan includes:")}
                </p>

                {/* Feature list */}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  {[
                    t("بيجر رقمي لنداء العملاء لإستلام الطلب", "Digital pager for customer call-back"),
                    t("تحويل العملاء الى تقييمات خرائط قوقل", "Convert customers to Google Maps reviews"),
                    t("التقييمات السلبية يتم إظهارها داخل لوحة تحكم التاجر", "Negative reviews shown only in merchant dashboard"),
                    t("نظام ولاء للعميل لإدخال بياناته والاستفادة من العروض", "Customer loyalty system with offers & rewards"),
                  ].map((feat, fi) => (
                    <li key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "rgba(220,210,200,0.72)", lineHeight: 1.55, direction: isRTL ? "rtl" : "ltr" }}>
                      <span style={{ color: "#ff4500", flexShrink: 0, marginTop: 1 }}>✔</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => setLocation("/register")}
                  data-testid={`button-pricing-cta-${pkg.months}m`}
                  style={{
                    marginTop: 22,
                    width: "100%",
                    background: i === 3 ? "linear-gradient(90deg,#ff4500,#ff6a00)" : "transparent",
                    border: i === 3 ? "none" : "1px solid rgba(255,69,0,0.35)",
                    borderRadius: 10,
                    padding: "10px 0",
                    color: i === 3 ? "#fff" : "#ff6030",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {t("ابدأ مجاناً", "Get Started Free")}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section style={{ position: "relative", zIndex: 10, paddingBottom: 80 }}>
        <div className="max-w-7xl mx-auto px-5">
          {/* Section label */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "#ff4500", fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>
              {t("المميزات", "FEATURES")}
            </p>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontWeight: 800, color: "#f0f0f0", lineHeight: 1.3 }}>
              {t("ما الذي ستحققه عند انضمامك إلينا؟", "What Will You Achieve When You Join Us?")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <FeatureCard key={f.id} icon={f.svg} boldText={f.boldText} bodyText={f.bodyText} index={i} />
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
          <p style={{ color: "rgba(200,185,178,0.65)", fontSize: 15, fontWeight: 400, lineHeight: 1.8, maxWidth: 480, margin: "0 auto 36px" }}>
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
        <div className="max-w-7xl mx-auto px-5 py-5">

          {/* Dynamic info row — only rendered when there's something to show */}
          {(footerInfo.instagram || footerInfo.twitterX || footerInfo.linkedin || footerInfo.snapchat ||
            footerInfo.commercialRegister || footerInfo.taxNumber || footerInfo.location) && (
            <div
              style={{
                display: "flex", flexWrap: "wrap", alignItems: "center",
                gap: "16px 24px",
                paddingBottom: 12,
                marginBottom: 12,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {/* Social icons */}
              {(footerInfo.instagram || footerInfo.twitterX || footerInfo.linkedin || footerInfo.snapchat) && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {footerInfo.instagram && (
                    <a href={footerInfo.instagram} target="_blank" rel="noopener noreferrer"
                      data-testid="link-footer-instagram"
                      style={{ color: "rgba(255,255,255,0.4)", transition: "color 0.2s", fontSize: 15 }}
                      onMouseOver={e => (e.currentTarget.style.color = "rgba(255,100,60,0.85)")}
                      onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                      title="Instagram"
                    >
                      <SiInstagram />
                    </a>
                  )}
                  {footerInfo.twitterX && (
                    <a href={footerInfo.twitterX} target="_blank" rel="noopener noreferrer"
                      data-testid="link-footer-twitter"
                      style={{ color: "rgba(255,255,255,0.4)", transition: "color 0.2s", fontSize: 14, fontWeight: 800, lineHeight: 1 }}
                      onMouseOver={e => (e.currentTarget.style.color = "rgba(255,100,60,0.85)")}
                      onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                      title="X"
                    >
                      𝕏
                    </a>
                  )}
                  {footerInfo.linkedin && (
                    <a href={footerInfo.linkedin} target="_blank" rel="noopener noreferrer"
                      data-testid="link-footer-linkedin"
                      style={{ color: "rgba(255,255,255,0.4)", transition: "color 0.2s", fontSize: 15 }}
                      onMouseOver={e => (e.currentTarget.style.color = "rgba(255,100,60,0.85)")}
                      onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                      title="LinkedIn"
                    >
                      <SiLinkedin />
                    </a>
                  )}
                  {footerInfo.snapchat && (
                    <a href={footerInfo.snapchat} target="_blank" rel="noopener noreferrer"
                      data-testid="link-footer-snapchat"
                      style={{ color: "rgba(255,255,255,0.4)", transition: "color 0.2s", fontSize: 15 }}
                      onMouseOver={e => (e.currentTarget.style.color = "rgba(255,100,60,0.85)")}
                      onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                      title="Snapchat"
                    >
                      <SiSnapchat />
                    </a>
                  )}
                </div>
              )}

              {/* Business info — CR + Tax on one line if both present */}
              {(footerInfo.commercialRegister || footerInfo.taxNumber) && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {footerInfo.commercialRegister && (
                    <span data-testid="text-footer-cr"
                      style={{ fontSize: 11, color: "rgba(200,185,178,0.45)", letterSpacing: "0.03em" }}>
                      {t("س.ت", "CR")}: {footerInfo.commercialRegister}
                    </span>
                  )}
                  {footerInfo.taxNumber && (
                    <span data-testid="text-footer-tax"
                      style={{ fontSize: 11, color: "rgba(200,185,178,0.45)", letterSpacing: "0.03em" }}>
                      {t("الرقم الضريبي", "VAT")}: {footerInfo.taxNumber}
                    </span>
                  )}
                </div>
              )}

              {/* Location */}
              {footerInfo.location && (
                <span data-testid="text-footer-location"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(200,185,178,0.45)" }}>
                  <MapPin style={{ width: 11, height: 11 }} />
                  {footerInfo.location}
                </span>
              )}
            </div>
          )}

          {/* Bottom row: logo + copyright + legal links */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div className="flex items-center gap-2">
              <img src={neonBellLogo} alt="Digital Pager" className="h-8 w-auto object-contain" style={{ mixBlendMode: "screen" }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Digital Pager</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <a
                href="/platform-terms"
                data-testid="link-footer-terms"
                onClick={e => { e.preventDefault(); setLocation("/platform-terms"); }}
                style={{ fontSize: 12, color: "rgba(200,185,178,0.5)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#ff4500")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(200,185,178,0.5)")}
              >
                {t("الشروط والأحكام", "Terms & Conditions")}
              </a>
              <a
                href="/platform-privacy"
                data-testid="link-footer-privacy"
                onClick={e => { e.preventDefault(); setLocation("/platform-privacy"); }}
                style={{ fontSize: 12, color: "rgba(200,185,178,0.5)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#ff4500")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(200,185,178,0.5)")}
              >
                {t("سياسة الخصوصية", "Privacy Policy")}
              </a>
              <p style={{ fontSize: 12, color: "rgba(200,190,185,0.38)", margin: 0 }}>
                &copy; {new Date().getFullYear()} Digital Pager. {t("جميع الحقوق محفوظة.", "All rights reserved.")}
              </p>
            </div>
          </div>

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
          padding: 28px 24px;          /* uniform on all four sides */
          transition: all 0.28s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;      /* stack icon → title → description evenly */
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
function FeatureCard({ icon, boldText, bodyText, index }: {
  icon: React.ReactNode; boldText: string; bodyText: string; index: number;
}) {
  return (
    <div className="feature-card" data-testid={`card-feature-${index}`}>
      {/* Icon */}
      <div style={{
        width: 52, height: 52, marginBottom: 20,
        filter: "drop-shadow(0 0 10px rgba(255,69,0,0.4))",
        flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Single paragraph: bold lead + regular body — no separate heading tag */}
      <p
        data-testid={`text-feature-title-${index}`}
        style={{
          fontSize: 13.5,
          fontWeight: 400,
          color: "rgba(210,198,192,0.85)",
          lineHeight: 1.75,
          margin: 0,
        }}
      >
        <strong style={{ fontWeight: 700, color: "#f0ebe8" }}>{boldText}</strong>
        {bodyText}
      </p>
    </div>
  );
}
