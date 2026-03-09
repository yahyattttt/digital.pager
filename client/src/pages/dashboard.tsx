import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { businessTypeLabels, planLabels } from "@shared/schema";
import type { Pager } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  QrCode,
  BellRing,
  Trash2,
  Download,
  Loader2,
  Share2,
  MapPin,
  Clock,
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
  console.log('Dashboard Loaded');
  const [, setLocation] = useLocation();
  const { merchant, logout } = useAuth();
  const { t, toggleLanguage, lang } = useLanguage();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported } = useWakeLock();
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();
  const { toast } = useToast();

  const [pagers, setPagers] = useState<(Pager & { docId: string })[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newOrderNumber, setNewOrderNumber] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (!merchant?.uid) return;

    const pagersRef = collection(db, "merchants", merchant.uid, "pagers");
    const q = query(
      pagersRef,
      where("status", "in", ["waiting", "notified"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: (Pager & { docId: string })[] = [];
      snapshot.forEach((docSnap) => {
        docs.push({ ...(docSnap.data() as Pager), docId: docSnap.id });
      });
      docs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      setPagers(docs);
    }, (error) => {
      console.error("Pagers listener error:", error);
      toast({
        title: t("خطأ في الاتصال", "Connection Error"),
        description: t(
          "فشل في تحميل قائمة الانتظار. يرجى تحديث الصفحة.",
          "Failed to load waitlist. Please refresh the page."
        ),
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [merchant?.uid]);

  function handleSignOut() {
    logout();
    setLocation("/");
  }

  const handleAddToWaitlist = useCallback(async () => {
    if (!merchant?.uid || !newOrderNumber.trim()) return;
    setAddLoading(true);
    try {
      const pagersRef = collection(db, "merchants", merchant.uid, "pagers");
      await addDoc(pagersRef, {
        storeId: merchant.uid,
        orderNumber: newOrderNumber.trim(),
        status: "waiting",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
      });
      toast({
        title: t("تمت الإضافة", "Added"),
        description: t(
          `تم إضافة الطلب #${newOrderNumber.trim()} لقائمة الانتظار`,
          `Order #${newOrderNumber.trim()} added to waitlist`
        ),
      });
      setNewOrderNumber("");
      setShowAddDialog(false);
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في إضافة الطلب", "Failed to add order"),
        variant: "destructive",
      });
    } finally {
      setAddLoading(false);
    }
  }, [merchant?.uid, newOrderNumber, t, toast]);

  const handleNotify = useCallback(async (pager: Pager & { docId: string }) => {
    if (!merchant?.uid || merchant.status !== "approved") return;
    setNotifyLoading(pager.docId);
    try {
      const pagerRef = doc(db, "merchants", merchant.uid, "pagers", pager.docId);
      await updateDoc(pagerRef, {
        status: "notified",
        notifiedAt: new Date().toISOString(),
      });

      const pagerSnap = await import("firebase/firestore").then(m => m.getDoc(pagerRef));
      const pagerData = pagerSnap.data();
      if (pagerData?.fcmToken) {
        try {
          const authRes = await fetch("/api/push-auth");
          const { pushToken } = await authRes.json();
          fetch("/api/send-push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Push-Auth": pushToken,
            },
            body: JSON.stringify({
              token: pagerData.fcmToken,
              storeName: merchant.storeName,
              orderNumber: pager.orderNumber,
              storeId: merchant.uid,
            }),
          }).catch(() => {});
        } catch {}
      }

      toast({
        title: t("تم التنبيه", "Notified"),
        description: t(
          `تم تنبيه الطلب #${pager.orderNumber} بنجاح`,
          `Order #${pager.orderNumber} has been notified`
        ),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تنبيه العميل", "Failed to notify customer"),
        variant: "destructive",
      });
    } finally {
      setNotifyLoading(null);
    }
  }, [merchant?.uid, merchant?.storeName, t, toast]);

  const handleComplete = useCallback(async (pager: Pager & { docId: string }) => {
    if (!merchant?.uid) return;
    try {
      const pagerRef = doc(db, "merchants", merchant.uid, "pagers", pager.docId);
      await updateDoc(pagerRef, { status: "completed" });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في إكمال الطلب", "Failed to complete order"),
        variant: "destructive",
      });
    }
  }, [merchant?.uid, t, toast]);

  const handleRemove = useCallback(async (pager: Pager & { docId: string }) => {
    if (!merchant?.uid) return;
    try {
      const pagerRef = doc(db, "merchants", merchant.uid, "pagers", pager.docId);
      await deleteDoc(pagerRef);
      toast({
        title: t("تم الحذف", "Removed"),
        description: t(
          `تم حذف الطلب #${pager.orderNumber}`,
          `Order #${pager.orderNumber} removed`
        ),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حذف الطلب", "Failed to remove order"),
        variant: "destructive",
      });
    }
  }, [merchant?.uid, t, toast]);

  async function handleDownloadQR() {
    if (!merchant?.uid) return;
    setQrLoading(true);
    try {
      const response = await fetch(`/api/qr/${merchant.uid}`);
      if (!response.ok) throw new Error("Failed to fetch QR");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `store-qr-${merchant.uid}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: t("تم التحميل", "Downloaded"),
        description: t("تم تحميل رمز QR بنجاح", "QR code downloaded successfully"),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحميل رمز QR", "Failed to download QR code"),
        variant: "destructive",
      });
    } finally {
      setQrLoading(false);
    }
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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

  const isPending = merchant.status !== "approved";

  const businessLabel =
    lang === "ar"
      ? businessTypeLabels[merchant.businessType] || merchant.businessType
      : businessTypeLabelsEn[merchant.businessType] || merchant.businessType;

  const currentPlanLabel = planLabels[merchant.plan]
    ? lang === "ar"
      ? planLabels[merchant.plan].ar
      : planLabels[merchant.plan].en
    : merchant.plan;

  const waitingPagers = pagers.filter((p) => p.status === "waiting");
  const notifiedPagers = pagers.filter((p) => p.status === "notified");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isPending && (
        <div
          className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3 flex items-center justify-center gap-2 text-yellow-500"
          data-testid="banner-pending-approval"
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium text-center">
            {t(
              "حسابك قيد المراجعة. يمكنك استكشاف الإعدادات، لكن بعض الوظائف معطلة حتى يتم التفعيل.",
              "Your account is pending approval. You can explore settings, but some features are disabled until activated."
            )}
          </span>
        </div>
      )}
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
              onClick={handleDownloadQR}
              disabled={qrLoading}
              className="border-primary/30 hover:border-primary/60"
              data-testid="button-download-qr"
              title={t("تحميل QR", "Download QR")}
            >
              {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
            </Button>

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
              {t("قائمة الانتظار", "Waitlist")}
            </h2>
            <Badge variant="secondary" data-testid="badge-orders-count">
              {waitingPagers.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {waitingPagers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-sm" data-testid="text-no-orders">
                  {t("لا توجد طلبات في الانتظار", "No orders waiting")}
                </p>
                <p className="text-muted-foreground/50 text-xs mt-1">
                  {t("أضف عملاء لقائمة الانتظار", "Add customers to the waitlist")}
                </p>
              </div>
            ) : (
              waitingPagers.map((pager) => (
                <Card key={pager.docId} className="border-primary/15 bg-primary/5" data-testid={`card-waiting-${pager.docId}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold text-lg" data-testid={`text-order-num-${pager.docId}`}>
                          {pager.orderNumber}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {t("طلب", "Order")} #{pager.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("في الانتظار", "Waiting")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleNotify(pager)}
                        disabled={isPending || notifyLoading === pager.docId}
                        className="h-10 px-4 bg-primary hover:bg-primary/90 font-bold"
                        data-testid={`button-notify-${pager.docId}`}
                      >
                        {notifyLoading === pager.docId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <BellRing className="w-4 h-4 me-1" />
                            {t("تنبيه", "Notify")}
                          </>
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleRemove(pager)}
                        className="h-10 w-10 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        data-testid={`button-remove-${pager.docId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="p-3 border-t border-border/30">
            <Button
              size="lg"
              onClick={() => setShowAddDialog(true)}
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
              {t("تم التنبيه", "Notified")}
            </h2>
            <Badge variant="secondary" data-testid="badge-pagers-count">
              {notifiedPagers.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {notifiedPagers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Bell className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-lg font-medium" data-testid="text-no-pagers">
                  {t("لا توجد طلبات تم تنبيهها", "No notified orders")}
                </p>
                <p className="text-muted-foreground/50 text-sm mt-1">
                  {t(
                    "اضغط 'تنبيه' على طلب في قائمة الانتظار لإرسال إشعار للعميل",
                    "Click 'Notify' on a waiting order to alert the customer"
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {notifiedPagers.map((pager) => (
                  <Card key={pager.docId} className="border-green-500/20 bg-green-500/5" data-testid={`card-notified-${pager.docId}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                            <span className="text-green-400 font-bold">{pager.orderNumber}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {t("طلب", "Order")} #{pager.orderNumber}
                            </p>
                            <p className="text-xs text-green-400">
                              {t("تم التنبيه", "Notified")}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <BellRing className="w-3 h-3 me-1" />
                          {t("مُنبّه", "Paged")}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleComplete(pager)}
                          className="flex-1 h-9 border-green-500/30 text-green-400 hover:bg-green-500/10"
                          data-testid={`button-complete-${pager.docId}`}
                        >
                          <CheckCircle className="w-3 h-3 me-1" />
                          {t("مكتمل", "Complete")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(pager)}
                          className="h-9 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          data-testid={`button-remove-notified-${pager.docId}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 p-4 border-t border-border/30">
            <Card className="border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-waitlist-count">{waitingPagers.length}</p>
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
                  <p className="text-2xl font-bold" data-testid="text-paged-count">{notifiedPagers.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("تم تنبيههم", "Paged")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-shares-count">{merchant.sharesCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("المشاركات", "Shares")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-gmaps-clicks">{merchant.googleMapsClicks ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("نقرات خرائط", "Maps Clicks")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-qr-scans">{merchant.qrScans ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("زوار QR", "Total Visitors via QR")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  {(() => {
                    const subStatus = merchant.subscriptionStatus || "pending";
                    const expiry = merchant.subscriptionExpiry;
                    let daysRemaining: number | null = null;
                    let isExpired = false;

                    if (expiry) {
                      const expiryDate = new Date(expiry);
                      const now = new Date();
                      const diffMs = expiryDate.getTime() - now.getTime();
                      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                      isExpired = daysRemaining <= 0;
                    }

                    return (
                      <>
                        {isExpired ? (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30" data-testid="badge-subscription-expired">
                            {t("منتهي", "Expired")}
                          </Badge>
                        ) : subStatus === "active" ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid="badge-subscription-active">
                            {t("نشط", "Active")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid="badge-subscription-status">
                            {subStatus === "pending" ? t("معلق", "Pending") : subStatus === "cancelled" ? t("ملغى", "Cancelled") : subStatus}
                          </Badge>
                        )}
                        {daysRemaining !== null && !isExpired && (
                          <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-subscription-days">
                            {daysRemaining} {t("يوم متبقي", "days left")}
                          </p>
                        )}
                        {daysRemaining === null && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t("الاشتراك", "Subscription")}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleDownloadQR}
                    disabled={qrLoading}
                    className="text-primary p-0 h-auto text-sm font-bold"
                    data-testid="button-download-qr-bottom"
                  >
                    {qrLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin me-1" />
                    ) : (
                      <Download className="w-3 h-3 me-1" />
                    )}
                    {t("تحميل QR", "Download QR")}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t("رمز المتجر", "Store Code")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="border-primary/20 bg-background sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {t("إضافة طلب جديد", "Add New Order")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              inputMode="numeric"
              placeholder={t("رقم الطلب", "Order Number")}
              value={newOrderNumber}
              onChange={(e) => setNewOrderNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newOrderNumber.trim()) {
                  handleAddToWaitlist();
                }
              }}
              className="h-16 text-center text-2xl font-bold border-primary/30 focus:border-primary focus:ring-primary/20"
              dir="ltr"
              autoFocus
              data-testid="input-new-order-number"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setNewOrderNumber("");
              }}
              className="border-border/50"
              data-testid="button-cancel-add"
            >
              {t("إلغاء", "Cancel")}
            </Button>
            <Button
              onClick={handleAddToWaitlist}
              disabled={!newOrderNumber.trim() || addLoading}
              className="bg-primary hover:bg-primary/90 font-bold"
              data-testid="button-confirm-add"
            >
              {addLoading ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <UserPlus className="w-4 h-4 me-2" />
              )}
              {t("إضافة", "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
