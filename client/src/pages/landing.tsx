import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Users, Zap, Shield, ArrowLeft, Star } from "lucide-react";

const features = [
  {
    icon: Bell,
    title: "إشعارات فورية",
    description: "أبلغ عملاءك عبر الرسائل النصية أو الإشعارات الفورية عندما يحين دورهم.",
  },
  {
    icon: Users,
    title: "قائمة انتظار ذكية",
    description: "أدر قائمة الانتظار بكفاءة مع تحديثات لحظية وأوقات انتظار تقديرية.",
  },
  {
    icon: Zap,
    title: "إعداد سريع",
    description: "ابدأ في دقائق. لا تحتاج أجهزة إضافية — فقط هاتفك أو جهازك اللوحي.",
  },
  {
    icon: Shield,
    title: "أمان متعدد المتاجر",
    description: "بياناتك معزولة بالكامل. كل متجر يحصل على مساحة عمل آمنة خاصة به.",
  },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();

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
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight" data-testid="text-brand-name">
              Digital Pager
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/login")}
              data-testid="button-nav-login"
            >
              تسجيل الدخول
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation("/register")}
              data-testid="button-nav-register"
            >
              سجل متجرك
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Star className="w-3.5 h-3.5" />
            الحل العصري لإدارة قوائم الانتظار
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight"
            data-testid="text-hero-title"
          >
            تخلص من البيجر التقليدي.
            <br />
            <span className="text-primary">انطلق رقمياً.</span>
          </h1>

          <p
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            data-testid="text-hero-subtitle"
          >
            Digital Pager يستبدل أنظمة البيجر التقليدية بحل رقمي عصري. أشعر عملاءك فوراً، وأدر قائمة انتظارك بشكل لحظي، وقدم تجربة استثنائية.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Button
              size="lg"
              onClick={() => setLocation("/register")}
              data-testid="button-hero-register"
            >
              سجل متجرك الآن
              <ArrowLeft className="w-4 h-4 me-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/login")}
              data-testid="button-hero-login"
            >
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border/30 hover-elevate"
            >
              <CardContent className="pt-6 pb-6">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3
                  className="font-semibold mb-2"
                  data-testid={`text-feature-title-${feature.title}`}
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
            مستعد لتطوير نظام الانتظار لديك؟
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            انضم إلى مئات المتاجر التي تثق بـ Digital Pager لتقديم تجربة سلسة لعملائها.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/register")}
            data-testid="button-cta-register"
          >
            ابدأ مجاناً
            <ArrowLeft className="w-4 h-4 me-2" />
          </Button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4 flex-wrap text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Bell className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-medium">Digital Pager</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Digital Pager. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
