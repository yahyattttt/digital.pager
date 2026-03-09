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
  where,
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
  LayoutDashboard,
  UtensilsCrossed,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  Power,
  PowerOff,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const businessTypeLabelsEn: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  clinic: "Clinic",
  other: "Other",
};

const ADMIN_WHATSAPP = "https://wa.me/966500000000";

type DashboardView = "overview" | "waitlist" | "menu" | "feedback" | "analytics" | "settings";

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

function SubscriptionProgress({
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

  let totalCycleDays = 30;
  if (merchant.subscriptionStartAt) {
    const startDate = new Date(merchant.subscriptionStartAt);
    const cycleDiff = (expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (cycleDiff > 0) totalCycleDays = Math.round(cycleDiff);
  }
  const progressPercent = Math.max(0, Math.min(100, (daysRemaining / totalCycleDays) * 100));

  const isUrgent = daysRemaining <= 3;
  const isExpiringSoon = daysRemaining <= 7;

  let barColor = "bg-green-500";
  let textColor = "text-green-400";
  if (isUrgent) {
    barColor = "bg-red-500";
    textColor = "text-red-400";
  } else if (isExpiringSoon) {
    barColor = "bg-orange-500";
    textColor = "text-orange-400";
  }

  return (
    <div className="px-4 py-3" data-testid="sidebar-subscription-progress">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {t("الأيام المتبقية", "Days Left")}
        </span>
        <span className={`text-xs font-bold ${textColor}`} data-testid="text-sidebar-days-left">
          {daysRemainingWhole}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {isExpiringSoon && (
        <button
          onClick={() => window.open(ADMIN_WHATSAPP, "_blank")}
          className={`mt-2 text-xs ${textColor} hover:underline flex items-center gap-1`}
          data-testid="link-renew-sidebar"
        >
          <MessageCircle className="w-3 h-3" />
          {t("تجديد", "Renew")}
        </button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  console.log("[Dashboard] Loaded");
  const [, setLocation] = useLocation();
  const { merchant, logout } = useAuth();
  const { t, toggleLanguage, lang, isRTL } = useLanguage();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported } = useWakeLock();
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();
  const { toast } = useToast();

  const [pagers, setPagers] = useState<(Pager & { docId: string })[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newOrderNumber, setNewOrderNumber] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Array<{ id: string; merchantId: string; stars: number; comment: string; timestamp: string; read: boolean }>>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState<boolean>((merchant as any)?.storeOpen !== false);
  const [selectedPagerId, setSelectedPagerId] = useState<string | null>(null);

  useEffect(() => {
    setStoreOpen((merchant as any)?.storeOpen !== false);
  }, [(merchant as any)?.storeOpen]);

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

  const handleToggleStoreOpen = useCallback(async () => {
    if (!merchant?.uid) return;
    const newState = !storeOpen;
    setStoreOpen(newState);
    try {
      const merchantRef = doc(db, "merchants", merchant.uid);
      await updateDoc(merchantRef, { storeOpen: newState });
    } catch {
      setStoreOpen(!newState);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحديث حالة المتجر", "Failed to update store status"),
        variant: "destructive",
      });
    }
  }, [merchant?.uid, storeOpen, t, toast]);

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
  const waitingPagers = pagers.filter((p) => p.status === "waiting");
  const notifiedPagers = pagers.filter((p) => p.status === "notified");
  const unreadFeedbackCount = feedbacks.filter(f => !f.read).length;
  const recentFeedbacks = feedbacks.slice(0, 3);

  const businessLabel =
    lang === "ar"
      ? businessTypeLabels[merchant.businessType] || merchant.businessType
      : businessTypeLabelsEn[merchant.businessType] || merchant.businessType;

  const navItems: { id: DashboardView; icon: typeof LayoutDashboard; label: string; badge?: number }[] = [
    { id: "overview", icon: LayoutDashboard, label: t("لوحة التحكم", "Dashboard") },
    { id: "waitlist", icon: Users, label: t("قائمة الانتظار", "Waiting List"), badge: waitingPagers.length },
    { id: "menu", icon: UtensilsCrossed, label: t("القائمة الرقمية", "Digital Menu") },
    { id: "feedback", icon: MessageSquare, label: t("ملاحظات العملاء", "Customer Feedback"), badge: unreadFeedbackCount || undefined },
    { id: "analytics", icon: BarChart3, label: t("التحليلات", "Analytics") },
    { id: "settings", icon: Settings, label: t("الإعدادات", "Settings") },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
      {isPending && (
        <div
          className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2.5 flex items-center justify-center gap-2 text-yellow-500"
          data-testid="banner-pending-approval"
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium text-center">
            {t(
              "حسابك قيد المراجعة. بعض الوظائف معطلة حتى يتم التفعيل.",
              "Your account is pending approval. Some features are disabled until activated."
            )}
          </span>
        </div>
      )}

      <header className="h-14 border-b border-white/[0.06] bg-[#111111] flex items-center justify-between px-4 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? t("إغلاق القائمة", "Close menu") : t("فتح القائمة", "Open menu")}
            className="md:hidden p-1.5 rounded-md hover:bg-white/[0.06] text-muted-foreground"
            data-testid="button-toggle-sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            {merchant.logoUrl ? (
              <img
                src={merchant.logoUrl}
                alt={t("الشعار", "Logo")}
                className="w-8 h-8 rounded-lg object-cover border border-white/10"
                data-testid="img-dashboard-logo"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Store className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="font-semibold text-sm leading-tight" data-testid="text-dashboard-store">
                {merchant.storeName}
              </h1>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {businessLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStoreOpen}
            aria-label={storeOpen ? t("إغلاق المتجر", "Close store") : t("فتح المتجر", "Open store")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              storeOpen
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
            data-testid="button-store-status-toggle"
          >
            {storeOpen ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
            {storeOpen ? t("مفتوح", "Open") : t("مغلق", "Closed")}
          </button>

          {wakeLockSupported && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px]"
              data-testid="indicator-wake-lock"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${wakeLockActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50"}`} />
              <span className="text-muted-foreground">
                {wakeLockActive ? t("الشاشة نشطة", "Screen Active") : t("الشاشة عادية", "Normal")}
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownloadQR}
            disabled={qrLoading}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            data-testid="button-download-qr"
            title={t("تحميل QR", "Download QR")}
          >
            {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            data-testid="button-toggle-language"
          >
            <Globe className="w-4 h-4" />
          </Button>

          {isSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex"
              data-testid="button-toggle-fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAddDialog(true)}
            disabled={isPending}
            className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
            data-testid="button-add-to-waitlist"
            title={t("إضافة للانتظار", "Add to Waitlist")}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label={t("إغلاق القائمة", "Close menu")}
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
            data-testid="sidebar-overlay"
          />
        )}

        <aside
          className={`
            fixed md:relative z-40 md:z-0
            ${isRTL ? "right-0" : "left-0"} top-0 md:top-auto
            h-full md:h-auto
            w-[260px] flex-shrink-0
            bg-[#111111] border-e border-white/[0.06]
            flex flex-col
            transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full")} md:translate-x-0
          `}
          data-testid="sidebar-nav"
        >
          <div className="md:hidden h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
            <span className="font-semibold text-sm">{merchant.storeName}</span>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label={t("إغلاق القائمة", "Close menu")}
              className="p-1 rounded-md hover:bg-white/[0.06] text-muted-foreground"
              data-testid="button-close-sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <SubscriptionProgress merchant={merchant} t={t} lang={lang} />

          <div className="border-b border-white/[0.06]" />

          <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setSidebarOpen(false);
                    setSelectedPagerId(null);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="flex-1 text-start">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge
                      className={`h-5 min-w-[20px] px-1.5 text-[10px] font-bold ${
                        item.id === "feedback"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-primary/20 text-primary border-primary/30"
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/[0.06]">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors"
              data-testid="button-sign-out"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span>{t("تسجيل الخروج", "Sign Out")}</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {currentView === "overview" && (
              <OverviewView
                merchant={merchant}
                waitingPagers={waitingPagers}
                notifiedPagers={notifiedPagers}
                recentFeedbacks={recentFeedbacks}
                storeOpen={storeOpen}
                isPending={isPending}
                onNotify={handleNotify}
                onComplete={handleComplete}
                onRemove={handleRemove}
                onNavigate={(v: DashboardView) => { setCurrentView(v); setSelectedPagerId(null); }}
                notifyLoading={notifyLoading}
                t={t}
                lang={lang}
              />
            )}

            {currentView === "waitlist" && (
              <WaitlistView
                waitingPagers={waitingPagers}
                notifiedPagers={notifiedPagers}
                isPending={isPending}
                onNotify={handleNotify}
                onComplete={handleComplete}
                onRemove={handleRemove}
                onAdd={() => setShowAddDialog(true)}
                notifyLoading={notifyLoading}
                selectedPagerId={selectedPagerId}
                onSelectPager={setSelectedPagerId}
                t={t}
                lang={lang}
              />
            )}

            {currentView === "menu" && (
              <MenuView merchant={merchant} t={t} lang={lang} />
            )}

            {currentView === "feedback" && (
              <FeedbackView
                feedbacks={feedbacks}
                feedbackLoading={feedbackLoading}
                markingRead={markingRead}
                onMarkAsRead={handleMarkAsRead}
                onRefresh={fetchFeedbacks}
                t={t}
                lang={lang}
              />
            )}

            {currentView === "analytics" && (
              <AnalyticsView merchant={merchant} t={t} lang={lang} />
            )}

            {currentView === "settings" && (
              <SettingsView
                merchant={merchant}
                onDownloadQR={handleDownloadQR}
                qrLoading={qrLoading}
                t={t}
                lang={lang}
              />
            )}
          </div>
        </main>
      </div>

      {currentView !== "waitlist" && (
        <button
          onClick={() => setShowAddDialog(true)}
          disabled={isPending}
          aria-label={t("إضافة للانتظار", "Add to Waitlist")}
          className="fixed bottom-6 end-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 md:hidden"
          data-testid="fab-add-to-waitlist"
        >
          <UserPlus className="w-6 h-6" />
        </button>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="border-white/[0.08] bg-[#141414] sm:max-w-sm">
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
              className="h-16 text-center text-2xl font-bold border-white/10 focus:border-primary focus:ring-primary/20 bg-white/[0.03]"
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
              className="border-white/10"
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

function OverviewView({
  merchant,
  waitingPagers,
  notifiedPagers,
  recentFeedbacks,
  storeOpen,
  isPending,
  onNotify,
  onComplete,
  onRemove,
  onNavigate,
  notifyLoading,
  t,
  lang,
}: {
  merchant: any;
  waitingPagers: (Pager & { docId: string })[];
  notifiedPagers: (Pager & { docId: string })[];
  recentFeedbacks: Array<{ id: string; stars: number; comment: string; timestamp: string; read: boolean }>;
  storeOpen: boolean;
  isPending: boolean;
  onNotify: (pager: Pager & { docId: string }) => void;
  onComplete: (pager: Pager & { docId: string }) => void;
  onRemove: (pager: Pager & { docId: string }) => void;
  onNavigate: (view: DashboardView) => void;
  notifyLoading: string | null;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-overview-title">
            {t("لوحة التحكم", "Dashboard")}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("نظرة عامة على متجرك", "Overview of your store")}
          </p>
        </div>
        <Badge
          className={`${storeOpen ? "bg-green-500/15 text-green-400 border-green-500/20" : "bg-red-500/15 text-red-400 border-red-500/20"}`}
          data-testid="badge-store-status"
        >
          {storeOpen ? t("مفتوح الآن", "Open Now") : t("مغلق", "Closed")}
        </Badge>
      </div>

      <Card className="border-white/[0.06] bg-[#141414]" data-testid="card-active-waitlist">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold" data-testid="text-waitlist-count">{waitingPagers.length}</p>
                <p className="text-sm text-muted-foreground">{t("في قائمة الانتظار", "Active Waitlist")}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate("waitlist")}
              className="border-white/10 text-xs"
              data-testid="button-view-waitlist"
            >
              {t("عرض الكل", "View All")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {waitingPagers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("في الانتظار الآن", "Currently Waiting")}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {waitingPagers.slice(0, 6).map((pager) => (
              <Card key={pager.docId} className="border-white/[0.06] bg-[#141414] hover:border-primary/20 transition-colors" data-testid={`card-waiting-${pager.docId}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                        <span className="text-primary font-bold text-lg" data-testid={`text-order-num-${pager.docId}`}>
                          {pager.orderNumber}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t("طلب", "Order")} #{pager.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{t("في الانتظار", "Waiting")}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onNotify(pager)}
                      disabled={isPending || notifyLoading === pager.docId}
                      className="flex-1 h-10 bg-primary hover:bg-primary/90 font-semibold"
                      data-testid={`button-notify-${pager.docId}`}
                    >
                      {notifyLoading === pager.docId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <BellRing className="w-4 h-4 me-1.5" />
                          {t("تنبيه", "Notify")}
                        </>
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => onRemove(pager)}
                      className="h-10 w-10 border-red-500/20 text-red-400 hover:bg-red-500/10"
                      data-testid={`button-remove-${pager.docId}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {waitingPagers.length > 6 && (
            <button
              onClick={() => onNavigate("waitlist")}
              className="mt-3 text-sm text-primary hover:underline"
              data-testid="link-see-all-waiting"
            >
              {t(`عرض الكل (${waitingPagers.length})`, `See all (${waitingPagers.length})`)}
            </button>
          )}
        </div>
      )}

      {notifiedPagers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("تم التنبيه", "Recently Notified")}
            </h3>
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-notified-count">
              {notifiedPagers.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notifiedPagers.slice(0, 3).map((pager) => (
              <Card key={pager.docId} className="border-green-500/10 bg-green-500/[0.03]" data-testid={`card-notified-${pager.docId}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/15 flex items-center justify-center">
                        <span className="text-green-400 font-bold">{pager.orderNumber}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t("طلب", "Order")} #{pager.orderNumber}</p>
                        <p className="text-xs text-green-400">{t("تم التنبيه", "Notified")}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px]">
                      <BellRing className="w-3 h-3 me-1" />
                      {t("مُنبّه", "Paged")}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onComplete(pager)}
                      className="flex-1 h-9 border-green-500/20 text-green-400 hover:bg-green-500/10"
                      data-testid={`button-complete-${pager.docId}`}
                    >
                      <CheckCircle className="w-3 h-3 me-1" />
                      {t("مكتمل", "Complete")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemove(pager)}
                      className="h-9 border-red-500/20 text-red-400 hover:bg-red-500/10"
                      data-testid={`button-remove-notified-${pager.docId}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {recentFeedbacks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("آخر التقييمات", "Recent Activity")}
            </h3>
            <button
              onClick={() => onNavigate("feedback")}
              className="text-xs text-primary hover:underline"
              data-testid="link-view-all-feedback"
            >
              {t("عرض الكل", "View All")}
            </button>
          </div>
          <Card className="border-white/[0.06] bg-[#141414]">
            <CardContent className="p-0 divide-y divide-white/[0.04]">
              {recentFeedbacks.map((fb) => (
                <div key={fb.id} className="flex items-center gap-3 px-4 py-3" data-testid={`recent-feedback-${fb.id}`}>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= fb.stars ? "text-yellow-400 fill-yellow-400" : "text-white/10"}`} />
                    ))}
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground truncate">
                    {fb.comment || t("بدون تعليق", "No comment")}
                  </p>
                  {!fb.read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                  <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                    {new Date(fb.timestamp).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function WaitlistView({
  waitingPagers,
  notifiedPagers,
  isPending,
  onNotify,
  onComplete,
  onRemove,
  onAdd,
  notifyLoading,
  selectedPagerId,
  onSelectPager,
  t,
  lang,
}: {
  waitingPagers: (Pager & { docId: string })[];
  notifiedPagers: (Pager & { docId: string })[];
  isPending: boolean;
  onNotify: (pager: Pager & { docId: string }) => void;
  onComplete: (pager: Pager & { docId: string }) => void;
  onRemove: (pager: Pager & { docId: string }) => void;
  onAdd: () => void;
  notifyLoading: string | null;
  selectedPagerId: string | null;
  onSelectPager: (id: string | null) => void;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const allPagers = [...waitingPagers, ...notifiedPagers];
  const selectedPager = allPagers.find(p => p.docId === selectedPagerId) || null;

  function renderOrderCard(pager: Pager & { docId: string }, isNotified: boolean) {
    const isSelected = selectedPagerId === pager.docId;
    return (
      <button
        key={pager.docId}
        onClick={() => onSelectPager(isSelected ? null : pager.docId)}
        className={`w-full text-start rounded-xl border p-4 transition-all ${
          isSelected
            ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5"
            : isNotified
              ? "border-green-500/10 bg-green-500/[0.02] hover:border-green-500/20"
              : "border-white/[0.06] bg-[#141414] hover:border-primary/20"
        }`}
        data-testid={isNotified ? `card-notified-${pager.docId}` : `card-waiting-${pager.docId}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
            isNotified
              ? "bg-green-500/10 border-green-500/15"
              : "bg-primary/10 border-primary/15"
          }`}>
            <span className={`font-bold text-xl ${isNotified ? "text-green-400" : "text-primary"}`} data-testid={`text-order-num-${pager.docId}`}>
              {pager.orderNumber}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t("طلب", "Order")} #{pager.orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pager.createdAt && new Date(pager.createdAt).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <Badge className={`text-[10px] flex-shrink-0 ${
            isNotified
              ? "bg-green-500/15 text-green-400 border-green-500/20"
              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          }`}>
            {isNotified ? t("مُنبّه", "Paged") : t("في الانتظار", "Waiting")}
          </Badge>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-4" data-testid="waitlist-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t("قائمة الانتظار", "Waiting List")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("إدارة العملاء في قائمة الانتظار", "Manage customers in the waitlist")}
          </p>
        </div>
        <Button
          onClick={onAdd}
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 font-semibold h-12 px-5"
          data-testid="button-add-waitlist-page"
        >
          <UserPlus className="w-5 h-5 me-2" />
          {t("إضافة", "Add")}
        </Button>
      </div>

      <div className="flex gap-4">
        <div className={`space-y-4 ${selectedPager ? "hidden lg:block lg:w-[400px] lg:flex-shrink-0" : "w-full"}`}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("في الانتظار", "Waiting")} ({waitingPagers.length})
          </h3>
          {waitingPagers.length === 0 && notifiedPagers.length === 0 ? (
            <Card className="border-white/[0.06] bg-[#141414]">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                  <Users className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground font-medium" data-testid="text-no-orders">
                  {t("لا توجد طلبات في الانتظار", "No orders waiting")}
                </p>
                <p className="text-muted-foreground/50 text-sm mt-1">
                  {t("أضف عملاء لقائمة الانتظار", "Add customers to the waitlist")}
                </p>
                <Button
                  onClick={onAdd}
                  disabled={isPending}
                  className="mt-4 bg-primary hover:bg-primary/90"
                  data-testid="button-add-empty-state"
                >
                  <UserPlus className="w-4 h-4 me-2" />
                  {t("إضافة أول عميل", "Add First Customer")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className={`space-y-2 ${selectedPager ? "" : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"}`}>
              {waitingPagers.map((pager) => (
                selectedPager ? (
                  <div key={pager.docId}>{renderOrderCard(pager, false)}</div>
                ) : (
                  <Card key={pager.docId} className="border-white/[0.06] bg-[#141414] hover:border-primary/20 transition-all hover:shadow-lg hover:shadow-primary/5" data-testid={`card-waiting-${pager.docId}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                          <span className="text-primary font-bold text-2xl" data-testid={`text-order-num-${pager.docId}`}>
                            {pager.orderNumber}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{t("طلب", "Order")} #{pager.orderNumber}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pager.createdAt && new Date(pager.createdAt).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <Badge className="mt-1.5 bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px]">
                            {t("في الانتظار", "Waiting")}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => onNotify(pager)}
                          disabled={isPending || notifyLoading === pager.docId}
                          className="flex-1 h-14 bg-primary hover:bg-primary/90 font-bold text-base"
                          data-testid={`button-notify-${pager.docId}`}
                        >
                          {notifyLoading === pager.docId ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <BellRing className="w-5 h-5 me-2" />
                              {t("تنبيه", "Notify")}
                            </>
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => onRemove(pager)}
                          className="h-14 w-14 border-red-500/15 text-red-400 hover:bg-red-500/10"
                          data-testid={`button-remove-${pager.docId}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          )}

          {notifiedPagers.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("تم التنبيه", "Notified")} ({notifiedPagers.length})
              </h3>
              <div className={`space-y-2 ${selectedPager ? "" : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"}`}>
                {notifiedPagers.map((pager) => (
                  selectedPager ? (
                    <div key={pager.docId}>{renderOrderCard(pager, true)}</div>
                  ) : (
                    <Card key={pager.docId} className="border-green-500/10 bg-green-500/[0.02]" data-testid={`card-notified-${pager.docId}`}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/15 flex items-center justify-center">
                              <span className="text-green-400 font-bold text-xl">{pager.orderNumber}</span>
                            </div>
                            <div>
                              <p className="font-semibold">{t("طلب", "Order")} #{pager.orderNumber}</p>
                              <p className="text-xs text-green-400 mt-0.5">{t("تم التنبيه", "Notified")}</p>
                            </div>
                          </div>
                          <Badge className="bg-green-500/15 text-green-400 border-green-500/20">
                            <BellRing className="w-3 h-3 me-1" />
                            {t("مُنبّه", "Paged")}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onComplete(pager)}
                            className="flex-1 h-12 border-green-500/20 text-green-400 hover:bg-green-500/10 font-semibold"
                            data-testid={`button-complete-${pager.docId}`}
                          >
                            <CheckCircle className="w-4 h-4 me-1.5" />
                            {t("مكتمل", "Complete")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRemove(pager)}
                            className="h-12 border-red-500/15 text-red-400 hover:bg-red-500/10"
                            data-testid={`button-remove-notified-${pager.docId}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedPager && (
          <div className="flex-1 min-w-0" data-testid="order-detail-panel">
            <Card className="border-white/[0.06] bg-[#141414] sticky top-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">{t("تفاصيل الطلب", "Order Details")}</h3>
                  <button
                    onClick={() => onSelectPager(null)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground"
                    data-testid="button-close-detail"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-5 mb-8">
                  <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center ${
                    selectedPager.status === "notified"
                      ? "bg-green-500/10 border-green-500/20"
                      : "bg-primary/10 border-primary/20"
                  }`}>
                    <span className={`font-bold text-3xl ${
                      selectedPager.status === "notified" ? "text-green-400" : "text-primary"
                    }`}>
                      {selectedPager.orderNumber}
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{t("طلب", "Order")} #{selectedPager.orderNumber}</p>
                    <Badge className={`mt-2 ${
                      selectedPager.status === "notified"
                        ? "bg-green-500/15 text-green-400 border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}>
                      {selectedPager.status === "notified" ? t("تم التنبيه", "Notified") : t("في الانتظار", "Waiting")}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-sm text-muted-foreground">{t("الوقت", "Time")}</span>
                    <span className="text-sm font-medium">
                      {selectedPager.createdAt && new Date(selectedPager.createdAt).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-sm text-muted-foreground">{t("الحالة", "Status")}</span>
                    <span className="text-sm font-medium">
                      {selectedPager.status === "notified" ? t("تم التنبيه", "Notified") : t("في الانتظار", "Waiting")}
                    </span>
                  </div>
                  {selectedPager.fcmToken && (
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-sm text-muted-foreground">{t("إشعارات", "Push")}</span>
                      <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px]">
                        {t("مفعّل", "Enabled")}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedPager.status === "waiting" && (
                    <Button
                      onClick={() => onNotify(selectedPager)}
                      disabled={isPending || notifyLoading === selectedPager.docId}
                      className="w-full h-14 bg-primary hover:bg-primary/90 font-bold text-lg"
                      data-testid={`button-notify-${selectedPager.docId}`}
                    >
                      {notifyLoading === selectedPager.docId ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <BellRing className="w-6 h-6 me-2" />
                          {t("تنبيه العميل", "Notify Customer")}
                        </>
                      )}
                    </Button>
                  )}
                  {selectedPager.status === "notified" && (
                    <Button
                      variant="outline"
                      onClick={() => onComplete(selectedPager)}
                      className="w-full h-14 border-green-500/20 text-green-400 hover:bg-green-500/10 font-bold text-lg"
                      data-testid={`button-complete-${selectedPager.docId}`}
                    >
                      <CheckCircle className="w-6 h-6 me-2" />
                      {t("تم الاستلام", "Mark Complete")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => { onRemove(selectedPager); onSelectPager(null); }}
                    className="w-full h-12 border-red-500/15 text-red-400 hover:bg-red-500/10 font-semibold"
                    data-testid={`button-remove-${selectedPager.docId}`}
                  >
                    <Trash2 className="w-5 h-5 me-2" />
                    {t("حذف", "Remove")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuView({
  merchant,
  t,
  lang,
}: {
  merchant: any;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("القائمة الرقمية", "Digital Menu")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("إدارة القائمة الرقمية لمتجرك", "Manage your store's digital menu")}
        </p>
      </div>

      <Card className="border-white/[0.06] bg-[#141414]">
        <CardContent className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <p className="text-muted-foreground font-medium text-lg">
            {t("قريباً", "Coming Soon")}
          </p>
          <p className="text-muted-foreground/50 text-sm mt-2 max-w-sm">
            {t(
              "سيتم إضافة ميزة القائمة الرقمية قريباً. ستتمكن من إنشاء وإدارة قائمتك الرقمية مباشرة من لوحة التحكم.",
              "The digital menu feature is coming soon. You'll be able to create and manage your digital menu directly from the dashboard."
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function FeedbackView({
  feedbacks,
  feedbackLoading,
  markingRead,
  onMarkAsRead,
  onRefresh,
  t,
  lang,
}: {
  feedbacks: Array<{ id: string; merchantId: string; stars: number; comment: string; timestamp: string; read: boolean }>;
  feedbackLoading: boolean;
  markingRead: string | null;
  onMarkAsRead: (id: string) => void;
  onRefresh: () => void;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const unreadCount = feedbacks.filter(f => !f.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t("ملاحظات العملاء", "Customer Feedback")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("تقييمات العملاء ذوي التجربة المنخفضة", "Low-rating customer reviews and complaints")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge className="bg-red-500/15 text-red-400 border-red-500/20" data-testid="badge-unread-feedback-count">
              {unreadCount} {t("جديد", "unread")}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh} className="border-white/10" data-testid="button-refresh-feedback">
            <Loader2 className={`w-4 h-4 me-1.5 ${feedbackLoading ? "animate-spin" : ""}`} />
            {t("تحديث", "Refresh")}
          </Button>
        </div>
      </div>

      {feedbackLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-sm">{t("جاري التحميل...", "Loading...")}</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <Card className="border-white/[0.06] bg-[#141414]">
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-medium text-lg" data-testid="text-no-feedbacks">
              {t("لا توجد ملاحظات", "No feedback yet")}
            </p>
            <p className="text-muted-foreground/50 text-sm mt-2">
              {t("ستظهر هنا ملاحظات العملاء ذوي التقييمات المنخفضة", "Low-rating customer feedback will appear here")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {feedbacks.map((feedback) => (
            <Card
              key={feedback.id}
              className={`border-white/[0.06] bg-[#141414] ${!feedback.read ? "ring-1 ring-orange-500/20" : ""}`}
              data-testid={`card-feedback-${feedback.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= feedback.stars ? "text-yellow-400 fill-yellow-400" : "text-white/10"}`}
                        data-testid={`star-${feedback.id}-${s}`}
                      />
                    ))}
                  </div>
                  {!feedback.read && (
                    <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20 text-[10px]" data-testid={`badge-unread-${feedback.id}`}>
                      {t("جديد", "Unread")}
                    </Badge>
                  )}
                </div>
                {feedback.comment && (
                  <p className="text-sm mb-4 leading-relaxed" data-testid={`text-feedback-comment-${feedback.id}`}>
                    {feedback.comment}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground/60" data-testid={`text-feedback-time-${feedback.id}`}>
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
                      onClick={() => onMarkAsRead(feedback.id)}
                      disabled={markingRead === feedback.id}
                      className="border-white/10 text-xs"
                      data-testid={`button-mark-read-${feedback.id}`}
                    >
                      {markingRead === feedback.id ? (
                        <Loader2 className="w-3 h-3 animate-spin me-1" />
                      ) : (
                        <Eye className="w-3 h-3 me-1" />
                      )}
                      {t("تم القراءة", "Mark Read")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsView({
  merchant,
  t,
  lang,
}: {
  merchant: any;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const stats = [
    {
      icon: QrCode,
      value: merchant.qrScans ?? 0,
      label: t("زوار QR", "QR Visitors"),
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/15",
    },
    {
      icon: Share2,
      value: merchant.sharesCount ?? 0,
      label: t("المشاركات", "Shares"),
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/15",
    },
    {
      icon: MapPin,
      value: merchant.googleMapsClicks ?? 0,
      label: t("نقرات خرائط", "Maps Clicks"),
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/15",
    },
    {
      icon: Bell,
      value: merchant.notificationsCount ?? 0,
      label: t("تم تنبيههم", "Notifications Sent"),
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/15",
    },
  ];

  const expiry = merchant.subscriptionExpiry;
  let daysRemaining: number | null = null;
  if (expiry) {
    const diffMs = new Date(expiry).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("التحليلات", "Analytics")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("إحصائيات التسويق والأداء", "Marketing and performance statistics")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className={`border-white/[0.06] bg-[#141414]`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid={`text-stat-${i}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-white/[0.06] bg-[#141414]">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4">{t("حالة الاشتراك", "Subscription Status")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                daysRemaining !== null && daysRemaining <= 3 ? "bg-red-500/10" :
                daysRemaining !== null && daysRemaining <= 7 ? "bg-orange-500/10" : "bg-green-500/10"
              }`}>
                {daysRemaining !== null && daysRemaining <= 7 ? (
                  <AlertTriangle className={`w-5 h-5 ${daysRemaining <= 3 ? "text-red-500" : "text-orange-500"}`} />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {daysRemaining !== null ? `${daysRemaining} ${t("يوم متبقي", "days left")}` : t("غير محدد", "N/A")}
                </p>
                <p className="text-xs text-muted-foreground">{t("الأيام المتبقية", "Remaining")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {planLabels[merchant.plan] ? (lang === "ar" ? planLabels[merchant.plan].ar : planLabels[merchant.plan].en) : merchant.plan}
                </p>
                <p className="text-xs text-muted-foreground">{t("الخطة الحالية", "Current Plan")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <Badge className="bg-green-500/15 text-green-400 border-green-500/20" data-testid="badge-subscription-active">
                  {t("نشط", "Active")}
                </Badge>
                <p className="text-xs text-muted-foreground mt-0.5">{t("حالة الاشتراك", "Status")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsView({
  merchant,
  onDownloadQR,
  qrLoading,
  t,
  lang,
}: {
  merchant: any;
  onDownloadQR: () => void;
  qrLoading: boolean;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("الإعدادات", "Settings")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("إعدادات المتجر وأدوات إضافية", "Store settings and tools")}
        </p>
      </div>

      <Card className="border-white/[0.06] bg-[#141414]">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4">{t("معلومات المتجر", "Store Information")}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span className="text-sm text-muted-foreground">{t("اسم المتجر", "Store Name")}</span>
              <span className="text-sm font-medium">{merchant.storeName}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span className="text-sm text-muted-foreground">{t("المالك", "Owner")}</span>
              <span className="text-sm font-medium">{merchant.ownerName}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span className="text-sm text-muted-foreground">{t("البريد الإلكتروني", "Email")}</span>
              <span className="text-sm font-medium" dir="ltr">{merchant.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{t("نوع النشاط", "Business Type")}</span>
              <span className="text-sm font-medium">
                {lang === "ar"
                  ? businessTypeLabels[merchant.businessType] || merchant.businessType
                  : businessTypeLabelsEn[merchant.businessType] || merchant.businessType}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#141414]">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4">{t("أدوات", "Tools")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onDownloadQR}
              disabled={qrLoading}
              className="h-12 border-white/10 justify-start"
              data-testid="button-download-qr-settings"
            >
              {qrLoading ? <Loader2 className="w-4 h-4 animate-spin me-3" /> : <Download className="w-4 h-4 me-3" />}
              {t("تحميل رمز QR", "Download QR Code")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const url = `${window.location.origin}/s/${merchant.uid}`;
                if (navigator.share) {
                  navigator.share({ title: merchant.storeName, url });
                } else {
                  navigator.clipboard.writeText(url);
                }
              }}
              className="h-12 border-white/10 justify-start"
              data-testid="button-share-store-link"
            >
              <Share2 className="w-4 h-4 me-3" />
              {t("مشاركة رابط المتجر", "Share Store Link")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#141414]">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-2">{t("الدعم الفني", "Support")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("تواصل مع فريق الدعم للمساعدة", "Contact support for assistance")}
          </p>
          <Button
            variant="outline"
            onClick={() => window.open(ADMIN_WHATSAPP, "_blank")}
            className="border-white/10"
            data-testid="button-contact-support"
          >
            <MessageCircle className="w-4 h-4 me-2" />
            {t("تواصل عبر واتساب", "Contact via WhatsApp")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
