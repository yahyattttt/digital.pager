import { useState } from "react";
import { useLocation } from "wouter";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { businessTypeLabels, planLabels } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Store,
  Users,
  Bell,
  Maximize,
  Minimize,
  Globe,
  CheckCircle,
  UserPlus,
  Lock,
  MessageCircle,
  CreditCard,
} from "lucide-react";

const businessTypeLabelsEn: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  clinic: "Clinic",
  other: "Other",
};

const ADMIN_WHATSAPP = "https://wa.me/966500000000";

function SubscriptionRequiredScreen({
  storeName,
  plan,
  onSignOut,
  t,
  toggleLanguage,
  lang,
}: {
  storeName: string;
  plan: string;
  onSignOut: () => void;
  t: (ar: string, en: string) => string;
  toggleLanguage: () => void;
  lang: string;
}) {
  const planLabel = planLabels[plan]
    ? lang === "ar"
      ? planLabels[plan].ar
      : planLabels[plan].en
    : plan;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-lg relative border-primary/20">
        <CardContent className="pt-8 pb-8">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLanguage}
              className="border-primary/30 hover:border-primary/60"
              data-testid="button-toggle-language"
            >
              <Globe className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-primary" data-testid="icon-subscription-lock" />
            </div>

            <h2 className="text-2xl font-bold mb-2" data-testid="text-subscription-title">
              {t("الاشتراك مطلوب", "Subscription Required")}
            </h2>

            <p className="text-muted-foreground mb-6" data-testid="text-subscription-message">
              {t(
                `مرحباً بك في ${storeName}. لتفعيل لوحة التحكم واستخدام نظام البيجر الرقمي، يرجى تفعيل اشتراكك.`,
                `Welcome to ${storeName}. To access the dashboard and use the digital pager system, please activate your subscription.`
              )}
            </p>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  {t("الخطة الحالية", "Current Plan")}
                </span>
                <Badge variant="secondary" data-testid="badge-current-plan">
                  <CreditCard className="w-3 h-3 me-1" />
                  {planLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("حالة الاشتراك", "Subscription Status")}
                </span>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30" data-testid="badge-subscription-status">
                  {t("غير مفعّل", "Inactive")}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full h-14 text-base font-bold"
                onClick={() => window.open(ADMIN_WHATSAPP, "_blank")}
                data-testid="button-contact-whatsapp"
              >
                <MessageCircle className="w-5 h-5 me-2" />
                {t("تواصل معنا عبر واتساب", "Contact Us on WhatsApp")}
              </Button>

              <p className="text-xs text-muted-foreground">
                {t(
                  "تواصل مع فريق الإدارة لتفعيل اشتراكك والبدء باستخدام النظام",
                  "Contact the admin team to activate your subscription and start using the system"
                )}
              </p>

              <Button
                variant="outline"
                onClick={onSignOut}
                className="border-primary/30"
                data-testid="button-sign-out"
              >
                <LogOut className="w-4 h-4 me-2" />
                {t("تسجيل الخروج", "Sign Out")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { merchant, loading } = useAuth();
  const { t, toggleLanguage, lang } = useLanguage();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported } = useWakeLock();
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();

  const [orders] = useState<any[]>([]);
  const [activePagers] = useState<any[]>([]);

  async function handleSignOut() {
    await signOut(auth);
    setLocation("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!merchant) {
    return null;
  }

  if (merchant.subscriptionStatus !== "active") {
    return (
      <SubscriptionRequiredScreen
        storeName={merchant.storeName}
        plan={merchant.plan || "trial"}
        onSignOut={handleSignOut}
        t={t}
        toggleLanguage={toggleLanguage}
        lang={lang}
      />
    );
  }

  const businessLabel =
    lang === "ar"
      ? businessTypeLabels[merchant.businessType] || merchant.businessType
      : businessTypeLabelsEn[merchant.businessType] || merchant.businessType;

  const currentPlanLabel = planLabels[merchant.plan]
    ? lang === "ar"
      ? planLabels[merchant.plan].ar
      : planLabels[merchant.plan].en
    : merchant.plan;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-primary/20 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {merchant.logoUrl ? (
              <img
                src={merchant.logoUrl}
                alt={t("الشعار", "Logo")}
                className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
                data-testid="img-dashboard-logo"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                <Store className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight" data-testid="text-dashboard-store">
                {merchant.storeName}
              </h1>
              <p className="text-xs text-muted-foreground">
                {businessLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {wakeLockSupported && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50 text-xs"
                data-testid="indicator-wake-lock"
              >
                <span className={`w-2 h-2 rounded-full ${wakeLockActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50"}`} />
                <span className="text-muted-foreground">
                  {wakeLockActive
                    ? t("الشاشة نشطة", "Screen Active")
                    : t("الشاشة عادية", "Screen Normal")}
                </span>
              </div>
            )}

            <Badge variant="default" className="hidden sm:inline-flex" data-testid="badge-status-approved">
              {currentPlanLabel}
            </Badge>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleLanguage}
              className="border-primary/30 hover:border-primary/60"
              data-testid="button-toggle-language"
            >
              <Globe className="w-4 h-4" />
            </Button>

            {isSupported && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
                className="border-primary/30 hover:border-primary/60"
                data-testid="button-toggle-fullscreen"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-primary/30 hover:border-primary/60"
              data-testid="button-sign-out"
            >
              <LogOut className="w-4 h-4 me-1.5" />
              <span className="hidden sm:inline">{t("خروج", "Sign Out")}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[380px_1fr] overflow-hidden">
        <aside className="border-e border-primary/20 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <h2 className="font-bold text-base flex items-center gap-2" data-testid="text-sidebar-title">
              <UserPlus className="w-5 h-5 text-primary" />
              {t("طلبات جديدة", "New Orders")}
            </h2>
            <Badge variant="secondary" data-testid="badge-orders-count">
              {orders.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-sm" data-testid="text-no-orders">
                  {t("لا توجد طلبات جديدة", "No new orders")}
                </p>
                <p className="text-muted-foreground/50 text-xs mt-1">
                  {t("ستظهر الطلبات هنا عند وصولها", "Orders will appear here as they arrive")}
                </p>
              </div>
            ) : null}
          </div>

          <div className="p-3 border-t border-border/30">
            <Button
              size="lg"
              className="w-full h-14 text-base font-bold border-2 border-primary"
              data-testid="button-add-to-waitlist"
            >
              <UserPlus className="w-5 h-5 me-2" />
              {t("إضافة للانتظار", "Add to Waitlist")}
            </Button>
          </div>
        </aside>

        <main className="flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <h2 className="font-bold text-base flex items-center gap-2" data-testid="text-main-title">
              <Bell className="w-5 h-5 text-primary" />
              {t("البيجرات النشطة", "Active Pagers")}
            </h2>
            <Badge variant="secondary" data-testid="badge-pagers-count">
              {activePagers.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activePagers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Bell className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-lg font-medium" data-testid="text-no-pagers">
                  {t("لا توجد بيجرات نشطة", "No active pagers")}
                </p>
                <p className="text-muted-foreground/50 text-sm mt-1">
                  {t(
                    "أضف عملاء لقائمة الانتظار لبدء استخدام البيجر",
                    "Add customers to the waitlist to start paging"
                  )}
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 border-t border-border/30">
            <Card className="border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-waitlist-count">0</p>
                  <p className="text-xs text-muted-foreground">
                    {t("في الانتظار", "Waiting")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-paged-count">0</p>
                  <p className="text-xs text-muted-foreground">
                    {t("تم تنبيههم", "Paged")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-completed-count">0</p>
                  <p className="text-xs text-muted-foreground">
                    {t("مكتمل", "Completed")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
