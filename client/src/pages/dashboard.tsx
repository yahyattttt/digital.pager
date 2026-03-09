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
  AlertTriangle,
  ShieldCheck,
  Star,
  Eye,
  MessageSquare,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
  subscriptionStatus,
  subscriptionExpiry,
  onSignOut,
  t,
  toggleLanguage,
  lang,
}: {
  storeName: string;
  plan: string;
  subscriptionStatus: string;
  subscriptionExpiry?: string | null;
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

  const isExpired = subscriptionStatus === "expired";

  let expiredAgoText = "";
  if (isExpired && subscriptionExpiry) {
    const expiryDate = new Date(subscriptionExpiry);
    const now = new Date();
    const diffMs = now.getTime() - expiryDate.getTime();
    if (diffMs > 0) {
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (diffDays > 0) {
        expiredAgoText = lang === "ar"
          ? `انتهى منذ ${diffDays} يوم و ${diffHours} ساعة`
          : `Expired ${diffDays} day${diffDays !== 1 ? "s" : ""} and ${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      } else {
        expiredAgoText = lang === "ar"
          ? `انتهى منذ ${diffHours} ساعة`
          : `Expired ${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 ${isExpired ? "bg-red-500/5" : "bg-primary/5"} rounded-full blur-3xl`} />
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 ${isExpired ? "bg-red-500/3" : "bg-primary/3"} rounded-full blur-3xl`} />
      </div>

      <Card className={`w-full max-w-lg relative ${isExpired ? "border-red-500/30" : "border-primary/20"}`}>
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
            <div className={`mx-auto w-20 h-20 rounded-full ${isExpired ? "bg-red-500/10 border-red-500/30" : "bg-primary/10 border-primary/30"} border-2 flex items-center justify-center mb-6`}>
              {isExpired ? (
                <Clock className="w-10 h-10 text-red-500" data-testid="icon-subscription-expired" />
              ) : (
                <Lock className="w-10 h-10 text-primary" data-testid="icon-subscription-lock" />
              )}
            </div>

            <h2 className={`text-2xl font-bold mb-2 ${isExpired ? "text-red-500" : ""}`} data-testid="text-subscription-title">
              {isExpired
                ? t("انتهى الاشتراك", "Subscription Expired")
                : t("الاشتراك مطلوب", "Subscription Required")}
            </h2>

            {isExpired && expiredAgoText && (
              <p className="text-red-400 text-sm font-medium mb-4" data-testid="text-expired-ago">
                {expiredAgoText}
              </p>
            )}

            <p className="text-muted-foreground mb-6" data-testid="text-subscription-message">
              {isExpired
                ? t(
                    `اشتراك ${storeName} قد انتهى. لاستعادة الوصول إلى لوحة التحكم ونظام البيجر الرقمي، يرجى تجديد اشتراكك.`,
                    `Your subscription for ${storeName} has expired. To restore access to the dashboard and digital pager system, please renew your subscription.`
                  )
                : t(
                    `مرحباً بك في ${storeName}. لتفعيل لوحة التحكم واستخدام نظام البيجر الرقمي، يرجى تفعيل اشتراكك.`,
                    `Welcome to ${storeName}. To access the dashboard and use the digital pager system, please activate your subscription.`
                  )}
            </p>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 mb-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-sm text-muted-foreground">
                  {t("الخطة الحالية", "Current Plan")}
                </span>
                <Badge variant="secondary" data-testid="badge-current-plan">
                  <CreditCard className="w-3 h-3 me-1" />
                  {planLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("حالة الاشتراك", "Subscription Status")}
                </span>
                {isExpired ? (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30" data-testid="badge-subscription-status">
                    {t("منتهي", "Expired")}
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30" data-testid="badge-subscription-status">
                    {t("غير مفعّل", "Inactive")}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className={`w-full h-14 text-base font-bold ${isExpired ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                onClick={() => window.open(ADMIN_WHATSAPP, "_blank")}
                data-testid="button-contact-whatsapp"
              >
                <MessageCircle className="w-5 h-5 me-2" />
                {isExpired
                  ? t("تجديد الاشتراك عبر واتساب", "Renew via WhatsApp")
                  : t("تواصل معنا عبر واتساب", "Contact Us on WhatsApp")}
              </Button>

              <p className="text-xs text-muted-foreground">
                {isExpired
                  ? t(
                      "تواصل مع فريق الإدارة لتجديد اشتراكك واستعادة الوصول",
                      "Contact the admin team to renew your subscription and restore access"
                    )
                  : t(
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

function SubscriptionBanner({
  merchant,
  t,
  lang,
}: {
  merchant: { subscriptionExpiry?: string | null; subscriptionStartAt?: string | null; subscriptionStatus?: string; plan?: string };
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const expiry = merchant.subscriptionExpiry;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!expiry) return;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [expiry]);

  if (!expiry) return null;

  const expiryDate = new Date(expiry);
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  const daysRemainingWhole = Math.floor(daysRemaining);
  const hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  let totalCycleDays = 30;
  if (merchant.subscriptionStartAt) {
    const startDate = new Date(merchant.subscriptionStartAt);
    const cycleDiff = (expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (cycleDiff > 0) totalCycleDays = Math.round(cycleDiff);
  }
  const progressPercent = Math.max(0, Math.min(100, (daysRemaining / totalCycleDays) * 100));

  const isExpiringSoon = daysRemaining <= 7;
  const isUrgent = daysRemaining <= 3;

  let barColor = "bg-green-500";
  let bannerBg = "bg-green-500/5 border-green-500/20";
  let iconColor = "text-green-500";
  let statusText = t("نشط", "Active");
  let StatusIcon = ShieldCheck;

  if (isUrgent) {
    barColor = "bg-red-500";
    bannerBg = "bg-red-500/5 border-red-500/20";
    iconColor = "text-red-500";
    statusText = t("ينتهي قريباً جداً", "Expiring Very Soon");
    StatusIcon = AlertTriangle;
  } else if (isExpiringSoon) {
    barColor = "bg-orange-500";
    bannerBg = "bg-orange-500/5 border-orange-500/20";
    iconColor = "text-orange-500";
    statusText = t("ينتهي قريباً", "Expiring Soon");
    StatusIcon = AlertTriangle;
  }

  return (
    <div className={`border-b ${bannerBg} px-4 py-3`} data-testid="banner-subscription-status">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpiringSoon ? (isUrgent ? "bg-red-500/10" : "bg-orange-500/10") : "bg-green-500/10"}`}>
            <StatusIcon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-bold text-sm ${iconColor}`} data-testid="text-subscription-status-label">
                {statusText}
              </span>
              {isExpiringSoon ? (
                <span className="text-sm text-muted-foreground" data-testid="text-subscription-countdown">
                  {t(
                    `ينتهي اشتراكك خلال ${daysRemainingWhole} يوم، ${hoursRemaining} ساعة`,
                    `Your subscription expires in ${daysRemainingWhole} days, ${hoursRemaining} hours`
                  )}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground" data-testid="text-subscription-remaining">
                  {daysRemainingWhole} {t("يوم متبقي", "days remaining")}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden" data-testid="progress-subscription">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
        </div>
        {isExpiringSoon && (
          <Button
            size="sm"
            onClick={() => window.open(ADMIN_WHATSAPP, "_blank")}
            className={isUrgent ? "bg-red-500 hover:bg-red-600 text-white flex-shrink-0" : "bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"}
            data-testid="button-renew-whatsapp"
          >
            <MessageCircle className="w-4 h-4 me-1.5" />
            {t("تواصل للتجديد", "Contact Admin to Renew")}
          </Button>
        )}
      </div>
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
  const [activeTab, setActiveTab] = useState<"notified" | "feedback">("notified");
  const [feedbacks, setFeedbacks] = useState<Array<{ id: string; merchantId: string; stars: number; comment: string; timestamp: string; read: boolean }>>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState<string | null>(null);

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

  const fetchFeedbacks = useCallback(async () => {
    if (!merchant?.uid) return;
    setFeedbackLoading(true);
    try {
      const res = await fetch(`/api/feedback/${merchant.uid}`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(Array.isArray(data) ? data : data?.feedbacks || []);
      }
    } catch {
      console.error("Failed to fetch feedbacks");
    } finally {
      setFeedbackLoading(false);
    }
  }, [merchant?.uid]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  useEffect(() => {
    if (activeTab === "feedback") {
      fetchFeedbacks();
    }
  }, [activeTab, fetchFeedbacks]);

  const handleMarkAsRead = useCallback(async (feedbackId: string) => {
    setMarkingRead(feedbackId);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/read`, { method: "POST" });
      if (res.ok) {
        setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, read: true } : f));
        toast({
          title: t("تم التحديث", "Updated"),
          description: t("تم تحديد الملاحظة كمقروءة", "Feedback marked as read"),
        });
      }
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحديث الملاحظة", "Failed to update feedback"),
        variant: "destructive",
      });
    } finally {
      setMarkingRead(null);
    }
  }, [t, toast]);

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

  const effectiveSubscriptionStatus = merchant.subscriptionStatus || "pending";

  if (effectiveSubscriptionStatus !== "active") {
    return (
      <SubscriptionRequiredScreen
        storeName={merchant.storeName}
        plan={merchant.plan || "trial"}
        subscriptionStatus={effectiveSubscriptionStatus}
        subscriptionExpiry={merchant.subscriptionExpiry}
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
  const unreadFeedbackCount = feedbacks.filter(f => !f.read).length;

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
      <SubscriptionBanner merchant={merchant} t={t} lang={lang} />

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
          <div className="p-4 border-b border-border/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "notified" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("notified")}
                className={activeTab === "notified" ? "" : "border-border/50"}
                data-testid="button-tab-notified"
              >
                <Bell className="w-4 h-4 me-1.5" />
                {t("تم التنبيه", "Notified Customers")}
                <Badge variant="secondary" className="ms-1.5 no-default-hover-elevate no-default-active-elevate" data-testid="badge-pagers-count">
                  {notifiedPagers.length}
                </Badge>
              </Button>
              <Button
                variant={activeTab === "feedback" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("feedback")}
                className={`relative ${activeTab === "feedback" ? "" : "border-border/50"}`}
                data-testid="button-tab-feedback"
              >
                <MessageSquare className="w-4 h-4 me-1.5" />
                {t("ملاحظات العملاء", "Customer Feedback")}
                {unreadFeedbackCount > 0 && (
                  <Badge className="ms-1.5 bg-red-500 text-white border-red-600 no-default-hover-elevate no-default-active-elevate" data-testid="badge-unread-feedback-count">
                    {unreadFeedbackCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "notified" ? (
              <>
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
              </>
            ) : (
              <>
                {feedbackLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground text-sm">
                      {t("جاري التحميل...", "Loading...")}
                    </p>
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground text-lg font-medium" data-testid="text-no-feedbacks">
                      {t("لا توجد ملاحظات", "No feedback yet")}
                    </p>
                    <p className="text-muted-foreground/50 text-sm mt-1">
                      {t(
                        "ستظهر هنا ملاحظات العملاء ذوي التقييمات المنخفضة",
                        "Low-rating customer feedback will appear here"
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {feedbacks.map((feedback) => (
                      <Card
                        key={feedback.id}
                        className={`${!feedback.read ? "border-orange-500/30 bg-orange-500/5" : "border-border/30"}`}
                        data-testid={`card-feedback-${feedback.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-4 h-4 ${s <= feedback.stars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
                                  data-testid={`star-${feedback.id}-${s}`}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {!feedback.read && (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30" data-testid={`badge-unread-${feedback.id}`}>
                                  {t("جديد", "Unread")}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {feedback.comment && (
                            <p className="text-sm mb-3" data-testid={`text-feedback-comment-${feedback.id}`}>
                              {feedback.comment}
                            </p>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground" data-testid={`text-feedback-time-${feedback.id}`}>
                              {new Date(feedback.timestamp).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {!feedback.read && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsRead(feedback.id)}
                                disabled={markingRead === feedback.id}
                                className="border-border/50"
                                data-testid={`button-mark-read-${feedback.id}`}
                              >
                                {markingRead === feedback.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin me-1" />
                                ) : (
                                  <Eye className="w-3 h-3 me-1" />
                                )}
                                {t("تم القراءة", "Mark as Read")}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
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

            <Card className={`border-primary/20 ${(() => {
              const expiry = merchant.subscriptionExpiry;
              if (expiry) {
                const diffMs = new Date(expiry).getTime() - Date.now();
                const days = diffMs / (1000 * 60 * 60 * 24);
                if (days <= 3) return "border-red-500/30";
                if (days <= 7) return "border-orange-500/30";
              }
              return "";
            })()}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${(() => {
                  const expiry = merchant.subscriptionExpiry;
                  if (expiry) {
                    const diffMs = new Date(expiry).getTime() - Date.now();
                    const days = diffMs / (1000 * 60 * 60 * 24);
                    if (days <= 3) return "bg-red-500/10";
                    if (days <= 7) return "bg-orange-500/10";
                  }
                  return "bg-green-500/10";
                })()}`}>
                  {(() => {
                    const expiry = merchant.subscriptionExpiry;
                    if (expiry) {
                      const diffMs = new Date(expiry).getTime() - Date.now();
                      const days = diffMs / (1000 * 60 * 60 * 24);
                      if (days <= 7) return <AlertTriangle className={`w-6 h-6 ${days <= 3 ? "text-red-500" : "text-orange-500"}`} />;
                    }
                    return <ShieldCheck className="w-6 h-6 text-green-500" />;
                  })()}
                </div>
                <div>
                  {(() => {
                    const expiry = merchant.subscriptionExpiry;
                    let daysRemaining: number | null = null;

                    if (expiry) {
                      const diffMs = new Date(expiry).getTime() - Date.now();
                      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    }

                    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7;
                    const isUrgent = daysRemaining !== null && daysRemaining <= 3;

                    return (
                      <>
                        {isUrgent ? (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30" data-testid="badge-subscription-urgent">
                            {t("ينتهي قريباً", "Expiring Soon")}
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30" data-testid="badge-subscription-warning">
                            {t("ينتهي قريباً", "Expiring Soon")}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid="badge-subscription-active">
                            {t("نشط", "Active")}
                          </Badge>
                        )}
                        {daysRemaining !== null && (
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
