import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { Bell, Users, Zap, Shield, ArrowLeft, ArrowRight, Star, Globe } from "lucide-react";
import neonBellLogo from "@assets/image0_(1)_1773118136698.png";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { t, toggleLanguage, isRTL } = useLanguage();

  const features = [
    {
      icon: Bell,
      title: t("إشعارات فورية", "Instant Notifications"),
      description: t(
        "أبلغ عملاءك عبر الرسائل النصية أو الإشعارات الفورية عندما يحين دورهم.",
        "Notify your customers via SMS or push notifications when it's their turn."
      ),
    },
    {
      icon: Users,
      title: t("قائمة انتظار ذكية", "Smart Waitlist"),
      description: t(
        "أدر قائمة الانتظار بكفاءة مع تحديثات لحظية وأوقات انتظار تقديرية.",
        "Manage your waitlist efficiently with real-time updates and estimated wait times."
      ),
    },
    {
      icon: Zap,
      title: t("إعداد سريع", "Quick Setup"),
      description: t(
        "ابدأ في دقائق. لا تحتاج أجهزة إضافية — فقط هاتفك أو جهازك اللوحي.",
        "Get started in minutes. No extra hardware needed — just your phone or tablet."
      ),
    },
    {
      icon: Shield,
      title: t("أمان متعدد المتاجر", "Multi-Tenant Security"),
      description: t(
        "بياناتك معزولة بالكامل. كل متجر يحصل على مساحة عمل آمنة خاصة به.",
        "Your data is fully isolated. Each store gets its own secure workspace."
      ),
    },
  ];

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <nav className="relative z-10 border-b border-border/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[50px] h-[50px] flex items-center justify-center flex-shrink-0">
              <img src={neonBellLogo} alt="Digital Pager" className="w-full h-full object-contain" style={{ mixBlendMode: "screen" }} />
            </div>
            <span className="font-bold text-lg tracking-tight" data-testid="text-brand-name">
              Digital Pager
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLanguage}
              className="border-primary/30 hover:border-primary/60"
              data-testid="button-toggle-language"
            >
              <Globe className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/login")}
              data-testid="button-nav-login"
            >
              {t("تسجيل الدخول", "Sign In")}
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation("/register")}
              data-testid="button-nav-register"
            >
              {t("سجل متجرك", "Register")}
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Star className="w-3.5 h-3.5" />
            {t("الحل العصري لإدارة قوائم الانتظار", "The Modern Waitlist Solution")}
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight"
            data-testid="text-hero-title"
          >
            {t("تخلص من البيجر التقليدي.", "Ditch the Old Pagers.")}
            <br />
            <span className="text-primary">{t("انطلق رقمياً.", "Go Digital.")}</span>
          </h1>

          <p
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            data-testid="text-hero-subtitle"
          >
            {t(
              "Digital Pager يستبدل أنظمة البيجر التقليدية بحل رقمي عصري. أشعر عملاءك فوراً، وأدر قائمة انتظارك بشكل لحظي، وقدم تجربة استثنائية.",
              "Digital Pager replaces traditional pager systems with a modern digital solution. Notify your customers instantly, manage your waitlist in real-time, and deliver an exceptional experience."
            )}
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Button
              size="lg"
              onClick={() => setLocation("/register")}
              data-testid="button-hero-register"
            >
              {t("سجل متجرك الآن", "Register Now")}
              <ArrowIcon className="w-4 h-4 ms-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/login")}
              data-testid="button-hero-login"
            >
              {t("تسجيل الدخول", "Sign In")}
            </Button>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <Card
              key={i}
              className="border-border/30 hover-elevate"
            >
              <CardContent className="pt-6 pb-6">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3
                  className="font-semibold mb-2"
                  data-testid={`text-feature-title-${i}`}
                >
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4" data-testid="text-cta-title">
            {t("مستعد لتطوير نظام الانتظار لديك؟", "Ready to upgrade your waitlist?")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            {t(
              "انضم إلى مئات المتاجر التي تثق بـ Digital Pager لتقديم تجربة سلسة لعملائها.",
              "Join hundreds of businesses that trust Digital Pager to deliver a seamless customer experience."
            )}
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/register")}
            data-testid="button-cta-register"
          >
            {t("ابدأ مجاناً", "Get Started Free")}
            <ArrowIcon className="w-4 h-4 ms-2" />
          </Button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4 flex-wrap text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-[36px] h-[36px] flex items-center justify-center flex-shrink-0">
              <img src={neonBellLogo} alt="Digital Pager" className="w-full h-full object-contain" style={{ mixBlendMode: "screen" }} />
            </div>
            <span className="font-medium">Digital Pager</span>
          </div>
          <p>
            &copy; {new Date().getFullYear()} Digital Pager.{" "}
            {t("جميع الحقوق محفوظة.", "All rights reserved.")}
          </p>
        </div>
      </footer>
    </div>
  );
}
