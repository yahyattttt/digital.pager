import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { businessTypeLabels, planLabels } from "@shared/schema";
import type { Pager, Product, WhatsAppOrder, ProductVariant, ProductAddon } from "@shared/schema";
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
  Zap,
  RotateCcw,
  Hash,
  Image,
  EyeOff,
  Pencil,
  Package,
  Phone,
  Timer,
  ScanLine,
  Activity,
  Banknote,
  Printer,
  ChefHat,
  Utensils,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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
  
  const [notifyLoading, setNotifyLoading] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Array<{ id: string; merchantId: string; stars: number; comment: string; timestamp: string; read: boolean }>>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState<boolean>((merchant as any)?.storeOpen !== false);
  const [selectedPagerId, setSelectedPagerId] = useState<string | null>(null);
  const [nextOrderNumber, setNextOrderNumber] = useState<number>(1);
  const [showShiftStart, setShowShiftStart] = useState(false);
  const [shiftStartNumber, setShiftStartNumber] = useState("");
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [counterLoaded, setCounterLoaded] = useState(false);
  const [whatsappOrders, setWhatsappOrders] = useState<WhatsAppOrder[]>([]);
  const [activeWhatsappOrders, setActiveWhatsappOrders] = useState<WhatsAppOrder[]>([]);
  const prevWhatsappCountRef = useState({ current: -1 })[0];
  const waOrderAudioRef = useState<{ current: HTMLAudioElement | null }>({ current: null })[0];
  const [onlineOrdersEnabled, setOnlineOrdersEnabled] = useState<boolean>((merchant as any)?.onlineOrdersEnabled !== false);
  const [businessOpenTime, setBusinessOpenTime] = useState<string>((merchant as any)?.businessOpenTime || "");
  const [businessCloseTime, setBusinessCloseTime] = useState<string>((merchant as any)?.businessCloseTime || "");
  const [completedToday, setCompletedToday] = useState(0);
  const [flyingOrderId, setFlyingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!merchant?.uid) return;
    const ordersRef = collection(db, "merchants", merchant.uid, "whatsappOrders");
    const q = query(ordersRef, where("status", "in", ["pending_verification", "awaiting_confirmation"]));
    const unsub = onSnapshot(q, (snap) => {
      const orders: WhatsAppOrder[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          merchantId: data.merchantId || "",
          customerName: data.customerName || "",
          customerPhone: data.customerPhone || "",
          items: (data.items || []).map((item: any) => ({ productId: item.productId || "", name: item.name || "", price: item.price || 0, quantity: item.quantity || 1 })),
          total: data.total || 0,
          status: data.status || "pending_verification",
          paymentMethod: data.paymentMethod || "cod",
          orderNumber: data.orderNumber || "",
          createdAt: data.createdAt || "",
        };
      });
      orders.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      if (prevWhatsappCountRef.current >= 0 && orders.length > prevWhatsappCountRef.current) {
        try {
          if (!waOrderAudioRef.current) {
            waOrderAudioRef.current = new Audio("/alert.mp3");
          }
          waOrderAudioRef.current.currentTime = 0;
          waOrderAudioRef.current.play().catch(() => {});
          setTimeout(() => { waOrderAudioRef.current?.pause(); }, 3000);
        } catch {}
        toast({ title: t("طلب جديد!", "New Order!"), description: t("وصل طلب أونلاين جديد", "New online order received") });
      }
      prevWhatsappCountRef.current = orders.length;
      setWhatsappOrders(orders);
    });
    return () => unsub();
  }, [merchant?.uid]);

  useEffect(() => {
    if (!merchant?.uid) return;
    const ordersRef = collection(db, "merchants", merchant.uid, "whatsappOrders");
    const q = query(ordersRef, where("status", "in", ["preparing", "ready"]));
    const unsub = onSnapshot(q, (snap) => {
      const orders: WhatsAppOrder[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          merchantId: data.merchantId || "",
          customerName: data.customerName || "",
          customerPhone: data.customerPhone || "",
          items: (data.items || []).map((item: any) => ({ productId: item.productId || "", name: item.name || "", price: item.price || 0, quantity: item.quantity || 1 })),
          total: data.total || 0,
          status: data.status || "preparing",
          paymentMethod: data.paymentMethod || "cod",
          orderNumber: data.orderNumber || "",
          createdAt: data.createdAt || "",
        };
      });
      orders.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
      setActiveWhatsappOrders(orders);
    });
    return () => unsub();
  }, [merchant?.uid]);

  useEffect(() => {
    setStoreOpen((merchant as any)?.storeOpen !== false);
  }, [(merchant as any)?.storeOpen]);

  useEffect(() => {
    setOnlineOrdersEnabled((merchant as any)?.onlineOrdersEnabled !== false);
  }, [(merchant as any)?.onlineOrdersEnabled]);

  useEffect(() => {
    setBusinessOpenTime((merchant as any)?.businessOpenTime || "");
    setBusinessCloseTime((merchant as any)?.businessCloseTime || "");
  }, [(merchant as any)?.businessOpenTime, (merchant as any)?.businessCloseTime]);

  useEffect(() => {
    if (!merchant?.uid) return;
    const counterRef = doc(db, "merchants", merchant.uid, "settings", "orderCounter");
    const unsub = onSnapshot(counterRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.nextOrderNumber !== undefined) {
          const val = parseInt(String(data.nextOrderNumber), 10);
          setNextOrderNumber(isNaN(val) || val < 1 ? 1 : val);
          setCounterLoaded(true);
        } else if (data.lastOrderNumber !== undefined) {
          const legacy = parseInt(String(data.lastOrderNumber), 10);
          const migrated = (isNaN(legacy) || legacy < 0 ? 0 : legacy) + 1;
          await setDoc(counterRef, { nextOrderNumber: migrated }, { merge: true });
        } else {
          setShowShiftStart(true);
          setCounterLoaded(true);
        }
      } else {
        setShowShiftStart(true);
        setCounterLoaded(true);
      }
    });
    return () => unsub();
  }, [merchant?.uid]);

  useEffect(() => {
    if (!merchant?.uid) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const pagersRef = collection(db, "merchants", merchant.uid, "pagers");
    const pQ = query(pagersRef, where("status", "==", "archived"), where("archivedAt", ">=", todayISO));
    const waRef = collection(db, "merchants", merchant.uid, "whatsappOrders");
    const wQ = query(waRef, where("status", "==", "archived"), where("archivedAt", ">=", todayISO));

    let pCount = 0, wCount = 0;
    const unsub1 = onSnapshot(pQ, (snap) => { pCount = snap.size; setCompletedToday(pCount + wCount); });
    const unsub2 = onSnapshot(wQ, (snap) => { wCount = snap.size; setCompletedToday(pCount + wCount); });
    return () => { unsub1(); unsub2(); };
  }, [merchant?.uid]);

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

  const handleToggleOnlineOrders = useCallback(async () => {
    if (!merchant?.uid) return;
    const newState = !onlineOrdersEnabled;
    setOnlineOrdersEnabled(newState);
    try {
      const merchantRef = doc(db, "merchants", merchant.uid);
      await updateDoc(merchantRef, { onlineOrdersEnabled: newState });
      toast({
        title: newState ? t("تم التفعيل", "Enabled") : t("تم الإيقاف", "Disabled"),
        description: newState
          ? t("سيتم استقبال الطلبات أونلاين الآن", "Online orders are now accepted")
          : t("تم إيقاف استقبال الطلبات أونلاين", "Online orders are now paused"),
      });
    } catch {
      setOnlineOrdersEnabled(!newState);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحديث حالة الطلبات", "Failed to update online orders status"),
        variant: "destructive",
      });
    }
  }, [merchant?.uid, onlineOrdersEnabled, t, toast]);

  const handleSaveBusinessHours = useCallback(async (openTime: string, closeTime: string) => {
    if (!merchant?.uid) return;
    try {
      const merchantRef = doc(db, "merchants", merchant.uid);
      await updateDoc(merchantRef, { businessOpenTime: openTime, businessCloseTime: closeTime });
      setBusinessOpenTime(openTime);
      setBusinessCloseTime(closeTime);
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم تحديث ساعات العمل بنجاح", "Business hours updated successfully"),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حفظ ساعات العمل", "Failed to save business hours"),
        variant: "destructive",
      });
    }
  }, [merchant?.uid, t, toast]);

  function handleSignOut() {
    logout();
    setLocation("/");
  }

  const isApproved = merchant?.status === "approved";

  const handleQuickAdd = useCallback(async () => {
    if (!merchant?.uid || !isApproved || quickAddLoading) return;
    setQuickAddLoading(true);
    try {
      const counterRef = doc(db, "merchants", merchant.uid, "settings", "orderCounter");
      let orderNum = 1;
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(counterRef);
        const current = snap.exists() ? parseInt(String(snap.data().nextOrderNumber), 10) : 1;
        orderNum = isNaN(current) || current < 1 ? 1 : current;
        txn.set(counterRef, { nextOrderNumber: orderNum + 1 }, { merge: true } as any);
      });

      const pagersRef = collection(db, "merchants", merchant.uid, "pagers");
      await addDoc(pagersRef, {
        storeId: merchant.uid,
        orderNumber: String(orderNum),
        status: "waiting",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
      });

      toast({
        title: t(`تم إضافة الطلب #${orderNum}`, `Order #${orderNum} added`),
        description: t(
          `الرقم التالي تلقائياً سيكون #${orderNum + 1}`,
          `Next auto-number will be #${orderNum + 1}`
        ),
      });
      setNewOrderNumber("");
      setShowAddDialog(false);
      return true;
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في إضافة الطلب", "Failed to add order"),
        variant: "destructive",
      });
      return false;
    } finally {
      setQuickAddLoading(false);
    }
  }, [merchant?.uid, isApproved, quickAddLoading, t, toast]);

  const handleManualAdd = useCallback(async (manualNumber: string) => {
    if (!merchant?.uid || !isApproved || quickAddLoading) return;
    const trimmed = manualNumber.trim();
    const parsed = parseInt(trimmed, 10);
    if (!trimmed || isNaN(parsed) || parsed <= 0 || String(parsed) !== trimmed) {
      toast({
        title: t("رقم غير صالح", "Invalid Number"),
        description: t("أدخل رقم صحيح موجب", "Enter a positive whole number"),
        variant: "destructive",
      });
      return;
    }
    setQuickAddLoading(true);
    try {
      const counterRef = doc(db, "merchants", merchant.uid, "settings", "orderCounter");
      await runTransaction(db, async (txn) => {
        await txn.get(counterRef);
        txn.set(counterRef, { nextOrderNumber: parsed + 1 }, { merge: true } as any);
      });

      const pagersRef = collection(db, "merchants", merchant.uid, "pagers");
      await addDoc(pagersRef, {
        storeId: merchant.uid,
        orderNumber: String(parsed),
        status: "waiting",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
      });

      toast({
        title: t(`تم إضافة الطلب #${parsed}`, `Order #${parsed} added`),
        description: t(
          `الرقم التالي تلقائياً سيكون #${parsed + 1}`,
          `Next auto-number will be #${parsed + 1}`
        ),
      });
      setNewOrderNumber("");
      setShowAddDialog(false);
      return true;
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في إضافة الطلب", "Failed to add order"),
        variant: "destructive",
      });
      return false;
    } finally {
      setQuickAddLoading(false);
    }
  }, [merchant?.uid, isApproved, quickAddLoading, t, toast]);

  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  const handleAcceptWhatsAppOrder = useCallback(async (order: WhatsAppOrder) => {
    if (!merchant?.uid || acceptingOrderId) return;
    setAcceptingOrderId(order.id);
    try {
      const counterRef = doc(db, "merchants", merchant.uid, "settings", "orderCounter");
      let orderNum = 1;
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(counterRef);
        const current = snap.exists() ? parseInt(String(snap.data().nextOrderNumber), 10) : 1;
        orderNum = isNaN(current) || current < 1 ? 1 : current;
        txn.set(counterRef, { nextOrderNumber: orderNum + 1 }, { merge: true } as any);
      });

      const pagersRef = collection(db, "merchants", merchant.uid, "pagers");
      await addDoc(pagersRef, {
        storeId: merchant.uid,
        orderNumber: String(orderNum),
        status: "waiting",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
      });

      const orderRef = doc(db, "merchants", merchant.uid, "whatsappOrders", order.id);
      await updateDoc(orderRef, { status: "preparing", orderNumber: String(orderNum) });

      toast({
        title: t(`تم قبول الطلب #${orderNum}`, `Order #${orderNum} Accepted`),
        description: t("تم إنشاء جهاز بيجر وتحديث حالة الطلب", "Pager created and order status updated"),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في قبول الطلب", "Failed to accept order"),
        variant: "destructive",
      });
    } finally {
      setAcceptingOrderId(null);
    }
  }, [merchant?.uid, acceptingOrderId, t, toast]);

  const handleCompleteWhatsAppOrder = useCallback(async (order: WhatsAppOrder) => {
    if (!merchant?.uid) return;
    try {
      setFlyingOrderId(`wa-${order.id}`);
      await new Promise(r => setTimeout(r, 600));

      const orderRef = doc(db, "merchants", merchant.uid, "whatsappOrders", order.id);
      await updateDoc(orderRef, { status: "archived", archivedAt: new Date().toISOString() });
      setFlyingOrderId(null);
      toast({
        title: t("تم إغلاق الطلب", "Order Closed"),
        description: t(`تم إغلاق الطلب #${order.orderNumber}`, `Order #${order.orderNumber} has been closed`),
      });
    } catch {
      setFlyingOrderId(null);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في إغلاق الطلب", "Failed to close order"),
        variant: "destructive",
      });
    }
  }, [merchant?.uid, t, toast]);

  const handleReadyWhatsAppOrder = useCallback(async (order: WhatsAppOrder) => {
    if (!merchant?.uid) return;
    try {
      const orderRef = doc(db, "merchants", merchant.uid, "whatsappOrders", order.id);
      await updateDoc(orderRef, { status: "ready" });
      toast({
        title: t(`الطلب #${order.orderNumber} جاهز`, `Order #${order.orderNumber} Ready`),
        description: t("تم تحديث حالة الطلب إلى جاهز", "Order status updated to ready"),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحديث حالة الطلب", "Failed to update order status"),
        variant: "destructive",
      });
    }
  }, [merchant?.uid, t, toast]);

  const handleShiftStart = useCallback(async () => {
    if (!merchant?.uid) return;
    const num = parseInt(shiftStartNumber.trim(), 10);
    if (isNaN(num) || num < 1) {
      toast({
        title: t("خطأ", "Error"),
        description: t("أدخل رقم صالح (1 أو أكثر)", "Enter a valid number (1 or more)"),
        variant: "destructive",
      });
      return;
    }
    try {
      const counterRef = doc(db, "merchants", merchant.uid, "settings", "orderCounter");
      await setDoc(counterRef, { nextOrderNumber: num }, { merge: true });
      setShowShiftStart(false);
      setShiftStartNumber("");
      toast({
        title: t("تم تعيين الرقم", "Counter Set"),
        description: t(
          `الطلب التالي سيكون #${num}`,
          `Next order will be #${num}`
        ),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تعيين العداد", "Failed to set counter"),
        variant: "destructive",
      });
    }
  }, [merchant?.uid, shiftStartNumber, t, toast]);

  const handleResetCounter = useCallback(async (resetTo: number) => {
    if (!merchant?.uid) return;
    try {
      const counterRef = doc(db, "merchants", merchant.uid, "settings", "orderCounter");
      await setDoc(counterRef, { nextOrderNumber: resetTo }, { merge: true });
      toast({
        title: t("تم إعادة التعيين", "Counter Reset"),
        description: t(
          `الطلب التالي سيكون #${resetTo}`,
          `Next order will be #${resetTo}`
        ),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في إعادة تعيين العداد", "Failed to reset counter"),
        variant: "destructive",
      });
    }
  }, [merchant?.uid, t, toast]);

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

      const waOrdersRef = collection(db, "merchants", merchant.uid, "whatsappOrders");
      const waQuery = query(waOrdersRef, where("orderNumber", "==", pager.orderNumber), where("status", "==", "preparing"));
      const waSnap = await getDocs(waQuery);
      if (!waSnap.empty) {
        await updateDoc(waSnap.docs[0].ref, { status: "ready" });
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
      setFlyingOrderId(pager.docId);
      await new Promise(r => setTimeout(r, 600));

      const pagerRef = doc(db, "merchants", merchant.uid, "pagers", pager.docId);
      await updateDoc(pagerRef, { status: "archived", archivedAt: new Date().toISOString() });

      const waOrdersRef = collection(db, "merchants", merchant.uid, "whatsappOrders");
      const waQuery = query(waOrdersRef, where("orderNumber", "==", pager.orderNumber), where("status", "in", ["preparing", "ready"]));
      const waSnap = await getDocs(waQuery);
      if (!waSnap.empty) {
        await updateDoc(waSnap.docs[0].ref, { status: "archived", archivedAt: new Date().toISOString() });
      }

      setFlyingOrderId(null);
      toast({
        title: t("تم الاستلام", "Order Picked Up"),
        description: t(`تم إغلاق الطلب #${pager.orderNumber}`, `Order #${pager.orderNumber} completed`),
      });
    } catch {
      setFlyingOrderId(null);
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
      const response = await fetch(`/api/qr/${merchant.uid}?t=${Date.now()}`);
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
    { id: "overview", icon: LayoutDashboard, label: t("لوحة التحكم", "Dashboard"), badge: whatsappOrders.length || undefined },
    { id: "waitlist", icon: Users, label: t("قائمة الانتظار", "Waiting List"), badge: waitingPagers.length },
    { id: "menu", icon: UtensilsCrossed, label: t("قسم الأونلاين", "Online Section") },
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
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <Store className="w-4 h-4 text-violet-400" />
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
            className="h-8 w-8 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl"
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
                onlineOrdersEnabled={onlineOrdersEnabled}
                onToggleOnlineOrders={handleToggleOnlineOrders}
                isPending={isPending}
                onNotify={handleNotify}
                onComplete={handleComplete}
                onRemove={handleRemove}
                onNavigate={(v: DashboardView) => { setCurrentView(v); setSelectedPagerId(null); }}
                onQuickAdd={handleQuickAdd}
                onManualAdd={handleManualAdd}
                quickAddLoading={quickAddLoading}
                nextOrderNumber={nextOrderNumber}
                counterLoaded={counterLoaded}
                notifyLoading={notifyLoading}
                whatsappOrders={whatsappOrders}
                activeWhatsappOrders={activeWhatsappOrders}
                onAcceptWhatsAppOrder={handleAcceptWhatsAppOrder}
                onReadyWhatsAppOrder={handleReadyWhatsAppOrder}
                onCompleteWhatsAppOrder={handleCompleteWhatsAppOrder}
                acceptingOrderId={acceptingOrderId}
                completedToday={completedToday}
                flyingOrderId={flyingOrderId}
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
                onQuickAdd={handleQuickAdd}
                onManualAdd={handleManualAdd}
                quickAddLoading={quickAddLoading}
                nextOrderNumber={nextOrderNumber}
                counterLoaded={counterLoaded}
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
                nextOrderNumber={nextOrderNumber}
                onResetCounter={handleResetCounter}
                onOpenShiftStart={() => setShowShiftStart(true)}
                onlineOrdersEnabled={onlineOrdersEnabled}
                onToggleOnlineOrders={handleToggleOnlineOrders}
                businessOpenTime={businessOpenTime}
                businessCloseTime={businessCloseTime}
                onSaveBusinessHours={handleSaveBusinessHours}
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
          className="fixed bottom-6 end-6 z-50 w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/25 flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 md:hidden"
          data-testid="fab-add-to-waitlist"
        >
          <UserPlus className="w-6 h-6" />
        </button>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="border-white/[0.08] bg-[#111] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {t("إضافة طلب جديد", "Add New Order")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder={t("رقم مخصص", "Custom Number")}
                value={newOrderNumber}
                onChange={(e) => setNewOrderNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newOrderNumber.trim()) {
                    handleManualAdd(newOrderNumber);
                  }
                }}
                className="flex-1 h-16 text-center text-xl font-bold border-white/10 focus:border-primary focus:ring-primary/20 bg-white/[0.03]"
                dir="ltr"
                autoFocus
                data-testid="input-new-order-number"
              />
              <Button
                onClick={() => handleManualAdd(newOrderNumber)}
                disabled={quickAddLoading || !newOrderNumber.trim()}
                className="h-16 px-5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 font-bold"
                data-testid="button-manual-add"
              >
                {quickAddLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </Button>
            </div>

            <Button
              onClick={handleQuickAdd}
              disabled={quickAddLoading || !counterLoaded}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
              data-testid="button-quick-add"
            >
              {quickAddLoading ? (
                <Loader2 className="w-5 h-5 animate-spin me-2" />
              ) : (
                <Zap className="w-5 h-5 me-2" />
              )}
              {t("إضافة سريعة", "Quick Add")} #{nextOrderNumber}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showShiftStart} onOpenChange={setShowShiftStart}>
        <DialogContent className="border-white/[0.08] bg-[#111] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              {t("بداية الوردية", "Shift Start")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t(
                "أدخل رقم الطلب الذي تريد البدء منه",
                "Enter the starting order number"
              )}
            </p>
            <Input
              type="text"
              inputMode="numeric"
              placeholder={t("مثال: 500", "e.g. 500")}
              value={shiftStartNumber}
              onChange={(e) => setShiftStartNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && shiftStartNumber.trim()) {
                  handleShiftStart();
                }
              }}
              className="h-16 text-center text-2xl font-bold border-white/10 focus:border-primary focus:ring-primary/20 bg-white/[0.03]"
              dir="ltr"
              autoFocus
              data-testid="input-shift-start-number"
            />
            <p className="text-xs text-muted-foreground text-center">
              {shiftStartNumber.trim() && !isNaN(parseInt(shiftStartNumber)) && parseInt(shiftStartNumber) >= 1 ? (
                <>
                  {t("الطلب التالي سيكون:", "Next order will be:")}
                  {" "}
                  <span className="font-mono font-bold text-primary">#{parseInt(shiftStartNumber)}</span>
                </>
              ) : (
                t("أدخل 1 أو أكثر للبدء", "Enter 1 or more to start")
              )}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowShiftStart(false);
                setShiftStartNumber("1");
                handleResetCounter(1);
              }}
              className="border-white/10"
              data-testid="button-start-from-one"
            >
              {t("ابدأ من #1", "Start from #1")}
            </Button>
            <Button
              onClick={handleShiftStart}
              disabled={!shiftStartNumber.trim() || isNaN(parseInt(shiftStartNumber)) || parseInt(shiftStartNumber) < 1}
              className="bg-primary hover:bg-primary/90 font-bold"
              data-testid="button-confirm-shift-start"
            >
              {t("تعيين", "Set")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimeElapsed({ createdAt, lang }: { createdAt: string; lang: string }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const calc = () => {
      const ts = new Date(createdAt).getTime();
      if (isNaN(ts)) { setElapsed("--"); return; }
      const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (diff < 60) setElapsed(lang === "ar" ? `${diff} ث` : `${diff}s`);
      else if (diff < 3600) setElapsed(lang === "ar" ? `${Math.floor(diff / 60)} د` : `${Math.floor(diff / 60)}m`);
      else setElapsed(lang === "ar" ? `${Math.floor(diff / 3600)} س` : `${Math.floor(diff / 3600)}h`);
    };
    calc();
    const iv = setInterval(calc, 10000);
    return () => clearInterval(iv);
  }, [createdAt, lang]);
  return <span>{elapsed}</span>;
}

function OverviewView({
  merchant,
  waitingPagers,
  notifiedPagers,
  recentFeedbacks,
  storeOpen,
  onlineOrdersEnabled,
  onToggleOnlineOrders,
  isPending,
  onNotify,
  onComplete,
  onRemove,
  onNavigate,
  onQuickAdd,
  onManualAdd,
  quickAddLoading,
  nextOrderNumber,
  counterLoaded,
  notifyLoading,
  whatsappOrders,
  activeWhatsappOrders,
  onAcceptWhatsAppOrder,
  onReadyWhatsAppOrder,
  onCompleteWhatsAppOrder,
  acceptingOrderId,
  completedToday,
  flyingOrderId,
  t,
  lang,
}: {
  merchant: any;
  waitingPagers: (Pager & { docId: string })[];
  notifiedPagers: (Pager & { docId: string })[];
  recentFeedbacks: Array<{ id: string; stars: number; comment: string; timestamp: string; read: boolean }>;
  storeOpen: boolean;
  onlineOrdersEnabled: boolean;
  onToggleOnlineOrders: () => void;
  isPending: boolean;
  onNotify: (pager: Pager & { docId: string }) => void;
  onComplete: (pager: Pager & { docId: string }) => void;
  onRemove: (pager: Pager & { docId: string }) => void;
  onNavigate: (view: DashboardView) => void;
  onQuickAdd: () => Promise<boolean | undefined>;
  onManualAdd: (num: string) => Promise<boolean | undefined>;
  quickAddLoading: boolean;
  nextOrderNumber: number;
  counterLoaded: boolean;
  notifyLoading: string | null;
  whatsappOrders: WhatsAppOrder[];
  activeWhatsappOrders: WhatsAppOrder[];
  onAcceptWhatsAppOrder: (order: WhatsAppOrder) => void;
  onReadyWhatsAppOrder: (order: WhatsAppOrder) => void;
  onCompleteWhatsAppOrder: (order: WhatsAppOrder) => void;
  acceptingOrderId: string | null;
  completedToday: number;
  flyingOrderId: string | null;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const [overviewInput, setOverviewInput] = useState("");
  const [completedPulse, setCompletedPulse] = useState(false);
  const [printOrder, setPrintOrder] = useState<WhatsAppOrder | null>(null);
  const prevCompleted = useState({ current: completedToday })[0];

  useEffect(() => {
    if (completedToday > prevCompleted.current) {
      setCompletedPulse(true);
      setTimeout(() => setCompletedPulse(false), 1000);
    }
    prevCompleted.current = completedToday;
  }, [completedToday]);

  const handleManual = async () => {
    if (quickAddLoading || isPending || !overviewInput.trim()) return;
    const ok = await onManualAdd(overviewInput);
    if (ok) setOverviewInput("");
  };

  const handlePrint = (order: WhatsAppOrder) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintOrder(null), 500);
    }, 100);
  };

  const safeTime = (ts: string) => { const t = new Date(ts).getTime(); return isNaN(t) ? Date.now() : t; };

  const paymentLabel = (method: string) => {
    if (method === "cod" || !method) return t("دفع عند الاستلام", "Cash on Delivery");
    if (method === "card") return t("بطاقة ائتمان", "Credit Card");
    if (method === "online") return t("دفع إلكتروني", "Online Payment");
    return method;
  };

  const parseItemExtras = (name: string) => {
    const parts = name.split(" + ");
    const mainPart = parts[0];
    const variantMatch = mainPart.match(/^(.+?)\s*\((.+?)\)$/);
    const baseName = variantMatch ? variantMatch[1].trim() : mainPart.trim();
    const variant = variantMatch ? variantMatch[2].trim() : null;
    const extras = parts.slice(1).join(", ");
    return { baseName, variant, extras: extras || null };
  };

  const allActiveOrders = [
    ...waitingPagers.map(p => ({ type: "pager" as const, id: p.docId, orderNumber: p.orderNumber, status: p.status, createdAt: p.createdAt, pager: p })),
    ...notifiedPagers.map(p => ({ type: "pager-notified" as const, id: p.docId, orderNumber: p.orderNumber, status: "notified" as const, createdAt: p.createdAt, pager: p })),
    ...activeWhatsappOrders.map(o => ({ type: "wa" as const, id: o.id, orderNumber: o.orderNumber || "?", status: o.status, createdAt: o.createdAt, order: o })),
    ...whatsappOrders.map(o => ({ type: "wa-new" as const, id: o.id, orderNumber: "NEW", status: "awaiting_confirmation" as const, createdAt: o.createdAt, order: o })),
  ].sort((a, b) => safeTime(a.createdAt) - safeTime(b.createdAt));

  const totalActive = waitingPagers.length + notifiedPagers.length + activeWhatsappOrders.length + whatsappOrders.length;

  const avgWait = (() => {
    const all = [...waitingPagers, ...notifiedPagers];
    if (all.length === 0) return "0m";
    const total = all.reduce((sum, p) => sum + Math.max(0, Date.now() - safeTime(p.createdAt)), 0);
    const avg = Math.floor(total / all.length / 60000);
    return avg < 1 ? "<1m" : `${avg}m`;
  })();

  const dailyScans = merchant?.qrScans ?? 0;

  const statusColor = (status: string) => {
    if (status === "awaiting_confirmation" || status === "pending_verification") return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", label: t("طلب جديد", "New Order") };
    if (status === "preparing") return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: t("يُحضّر", "Preparing") };
    if (status === "ready") return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: t("جاهز", "Ready") };
    if (status === "notified") return { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", label: t("تم التنبيه", "Notified") };
    return { bg: "bg-white/5", text: "text-white/60", border: "border-white/10", label: t("في الانتظار", "Waiting") };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white" data-testid="text-overview-title">
          {t("لوحة التحكم", "Dashboard")}
        </h2>
        <div className="flex items-center gap-2">
          <Badge
            className={`rounded-full text-[11px] px-2.5 py-0.5 ${storeOpen ? "bg-green-500/15 text-green-400 border-green-500/20" : "bg-red-500/15 text-red-400 border-red-500/20"}`}
            data-testid="badge-store-status"
          >
            {storeOpen ? t("مفتوح", "Open") : t("مغلق", "Closed")}
          </Badge>
          <Badge
            className={`rounded-full text-[11px] px-2.5 py-0.5 cursor-pointer select-none ${onlineOrdersEnabled ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-orange-500/15 text-orange-400 border-orange-500/20"}`}
            onClick={onToggleOnlineOrders}
            data-testid="badge-online-orders-status"
          >
            {onlineOrdersEnabled ? t("أونلاين", "Online") : t("أوفلاين", "Offline")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3" data-testid="stats-header">
        <div className="bg-[#111] border border-white/[0.06] rounded-xl p-3 text-center" data-testid="stat-daily-scans">
          <ScanLine className="w-4 h-4 text-violet-400 mx-auto mb-1" />
          <p className="text-2xl sm:text-3xl font-extrabold text-white leading-none" data-testid="text-daily-scans">{dailyScans}</p>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">{t("المسح اليومي", "Daily Scans")}</p>
        </div>
        <div className="bg-[#111] border border-white/[0.06] rounded-xl p-3 text-center" data-testid="stat-active-orders">
          <Activity className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <p className="text-2xl sm:text-3xl font-extrabold text-white leading-none" data-testid="text-active-orders">{totalActive}</p>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">{t("طلبات نشطة", "Active Orders")}</p>
        </div>
        <div
          className={`bg-[#111] border border-white/[0.06] rounded-xl p-3 text-center transition-all duration-500 ${completedPulse ? "ring-2 ring-emerald-400/50 scale-[1.03]" : ""}`}
          data-testid="stat-completed-today"
        >
          <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-2xl sm:text-3xl font-extrabold text-white leading-none" data-testid="text-completed-today">{completedToday}</p>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">{t("مكتمل اليوم", "Done Today")}</p>
        </div>
        <div className="bg-[#111] border border-white/[0.06] rounded-xl p-3 text-center" data-testid="stat-avg-wait">
          <Timer className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="text-2xl sm:text-3xl font-extrabold text-white leading-none" data-testid="text-avg-wait">{avgWait}</p>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">{t("متوسط الانتظار", "Avg. Wait")}</p>
        </div>
      </div>

      {counterLoaded && (
        <div className="flex gap-2 items-center" data-testid="overview-order-entry">
          <Input
            type="text"
            inputMode="numeric"
            placeholder={t("رقم مخصص", "Custom #")}
            value={overviewInput}
            onChange={(e) => setOverviewInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && overviewInput.trim()) handleManual(); }}
            className="w-24 sm:w-32 h-12 text-center text-base font-bold border-white/10 focus:border-emerald-500 focus:ring-emerald-500/20 bg-white/[0.03] rounded-xl"
            dir="ltr"
            data-testid="input-order-overview"
          />
          <Button
            onClick={handleManual}
            disabled={quickAddLoading || isPending || !overviewInput.trim()}
            className="h-12 px-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 font-bold rounded-xl"
            data-testid="button-manual-add-overview"
          >
            {quickAddLoading && overviewInput.trim() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
          <Button
            onClick={async () => { await onQuickAdd(); }}
            disabled={quickAddLoading || isPending}
            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
            data-testid="button-quick-add-overview"
          >
            {quickAddLoading && !overviewInput.trim() ? <Loader2 className="w-5 h-5 animate-spin me-2" /> : <Zap className="w-5 h-5 me-2" />}
            {t("إضافة سريعة", "Quick Add")} #{nextOrderNumber}
          </Button>
        </div>
      )}

      <div className="rounded-2xl bg-[#0d0d0d] border border-white/[0.06] p-4" data-testid="workspace-active-orders">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">{t("الطلبات النشطة", "Active Orders")}</h3>
          {allActiveOrders.length > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {allActiveOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center" data-testid="card-no-orders">
            <Package className="w-8 h-8 text-white/10 mb-2" />
            <p className="text-sm text-white/30">{t("لا توجد طلبات نشطة", "No active orders")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allActiveOrders.map((item) => {
              const isFlying = (item.type === "pager" || item.type === "pager-notified")
                ? flyingOrderId === item.id
                : flyingOrderId === `wa-${item.id}`;

              const isOnline = item.type === "wa-new" || item.type === "wa";
              const sc = statusColor(item.status);

              if (item.type === "wa-new") {
                const order = (item as any).order as WhatsAppOrder;
                return (
                  <Card
                    key={`wa-new-${item.id}`}
                    className={`bg-[#111] rounded-2xl overflow-hidden transition-all duration-500 border-2 border-red-500/40 shadow-[0_0_15px_rgba(239,0,0,0.08)] ${isFlying ? "opacity-0 -translate-y-20 scale-75" : ""}`}
                    data-testid={`card-wa-order-${item.id}`}
                  >
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-red-400" />
                        <span className="text-lg font-extrabold text-white" data-testid={`text-order-num-${item.id}`}>
                          #{order.orderNumber || t("جديد", "NEW")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`rounded-full text-[10px] px-2 py-0.5 ${sc.bg} ${sc.text} border ${sc.border}`}>
                          {sc.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-[11px] text-white/40">
                          <Clock className="w-3 h-3" />
                          <TimeElapsed createdAt={item.createdAt} lang={lang} />
                        </div>
                      </div>
                    </div>

                    <CardContent className="px-4 pb-4 pt-0 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span className="font-semibold text-white/80" data-testid={`text-customer-name-${item.id}`}>{order.customerName}</span>
                        <span className="text-white/20">|</span>
                        <span className="font-mono text-white/50" dir="ltr" data-testid={`text-customer-phone-${item.id}`}>{order.customerPhone}</span>
                      </div>

                      <div className="space-y-1.5 bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                        {order.items.map((itm, idx) => {
                          const parsed = parseItemExtras(itm.name);
                          return (
                            <div key={idx} data-testid={`order-item-${item.id}-${idx}`}>
                              <div className="flex items-start justify-between">
                                <p className="text-sm font-bold text-white">
                                  <span className="text-white/40 me-1.5">{itm.quantity}×</span>
                                  {parsed.baseName}
                                  {parsed.variant && <span className="text-white/40 text-xs ms-1">({parsed.variant})</span>}
                                </p>
                                <span className="text-xs text-white/50 font-mono shrink-0">{itm.price.toFixed(0)} SAR</span>
                              </div>
                              {parsed.extras && (
                                <p className="text-[11px] text-amber-400/70 ps-5 mt-0.5">+ {parsed.extras}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                        <div className="flex items-center gap-1.5">
                          <Banknote className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[11px] text-amber-400 font-medium">{paymentLabel(order.paymentMethod)}</span>
                        </div>
                        <p className="text-base font-extrabold text-white" data-testid={`text-order-total-${item.id}`}>
                          {order.total.toFixed(0)} <span className="text-xs text-white/40">SAR</span>
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => window.open(`tel:${order.customerPhone}`, "_self")}
                          className="h-9 px-3 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-xs font-bold rounded-xl border border-blue-500/20"
                          data-testid={`button-call-${item.id}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const phone = order.customerPhone.replace(/[^0-9]/g, "");
                            window.open(`https://wa.me/${phone}`, "_blank");
                          }}
                          className="h-9 px-3 bg-green-600/15 hover:bg-green-600/25 text-green-400 text-xs font-bold rounded-xl border border-green-500/20"
                          data-testid={`button-whatsapp-${item.id}`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => onAcceptWhatsAppOrder(order)}
                          disabled={acceptingOrderId === order.id}
                          className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                          data-testid={`button-accept-order-${item.id}`}
                        >
                          {acceptingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                            <><CheckCircle className="w-3.5 h-3.5 me-1" />{t("قبول", "Accept")}</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              if (item.type === "pager" || item.type === "pager-notified") {
                const pager = (item as any).pager as Pager & { docId: string };
                const isNotified = item.type === "pager-notified";
                return (
                  <Card
                    key={`${item.type}-${item.id}`}
                    className={`bg-[#111] rounded-2xl overflow-hidden transition-all duration-500 border border-white/[0.08] ${isFlying ? "opacity-0 -translate-y-20 scale-75" : ""}`}
                    data-testid={`card-${isNotified ? "notified" : "waiting"}-${item.id}`}
                  >
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-white/40" />
                        <span className={`text-lg font-extrabold ${isNotified ? "text-emerald-400" : "text-white"}`} data-testid={`text-order-num-${item.id}`}>
                          #{item.orderNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`rounded-full text-[10px] px-2 py-0.5 ${sc.bg} ${sc.text} border ${sc.border}`}>
                          {isNotified ? t("تم التنبيه", "Notified") : t("في الانتظار", "Waiting")}
                        </Badge>
                        <div className="flex items-center gap-1 text-[11px] text-white/40">
                          <Clock className="w-3 h-3" />
                          <TimeElapsed createdAt={item.createdAt} lang={lang} />
                        </div>
                      </div>
                    </div>

                    <CardContent className="px-4 pb-4 pt-0 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Badge className="rounded-full text-[10px] bg-white/5 text-white/50 border-white/10">{t("طلب يدوي", "QR / Manual")}</Badge>
                      </div>

                      <div className="flex gap-2">
                        {!isNotified ? (
                          <>
                            <Button
                              onClick={() => onNotify(pager)}
                              disabled={isPending || notifyLoading === pager.docId}
                              className="flex-1 h-10 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl"
                              data-testid={`button-notify-${item.id}`}
                            >
                              {notifyLoading === pager.docId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                                <><BellRing className="w-3.5 h-3.5 me-1" />{t("تنبيه", "Notify")}</>
                              )}
                            </Button>
                            <Button
                              onClick={() => onRemove(pager)}
                              className="h-10 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20"
                              data-testid={`button-remove-${item.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => onComplete(pager)}
                            className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                            data-testid={`button-complete-${item.id}`}
                          >
                            <CheckCircle className="w-3.5 h-3.5 me-1" />{t("تم الاستلام", "Received")}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              const waOrder = (item as any).order as WhatsAppOrder;
              const isReady = waOrder.status === "ready";
              const isPreparing = waOrder.status === "preparing";
              return (
                <Card
                  key={`wa-${item.id}`}
                  className={`bg-[#111] rounded-2xl overflow-hidden transition-all duration-500 border-2 border-red-500/40 shadow-[0_0_15px_rgba(239,0,0,0.08)] ${isFlying ? "opacity-0 -translate-y-20 scale-75" : ""}`}
                  data-testid={`card-active-order-${item.id}`}
                >
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-red-400" />
                      <span className="text-lg font-extrabold text-white" data-testid={`text-order-num-${item.id}`}>
                        #{item.orderNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`rounded-full text-[10px] px-2 py-0.5 ${sc.bg} ${sc.text} border ${sc.border}`}>
                        {sc.label}
                      </Badge>
                      <div className="flex items-center gap-1 text-[11px] text-white/40">
                        <Clock className="w-3 h-3" />
                        <TimeElapsed createdAt={item.createdAt} lang={lang} />
                      </div>
                    </div>
                  </div>

                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <span className="font-semibold text-white/80">{waOrder.customerName}</span>
                      <span className="text-white/20">|</span>
                      <span className="font-mono text-white/50" dir="ltr">{waOrder.customerPhone}</span>
                    </div>

                    <div className="space-y-1.5 bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                      {waOrder.items.map((itm, idx) => {
                        const parsed = parseItemExtras(itm.name);
                        return (
                          <div key={idx} data-testid={`order-item-${item.id}-${idx}`}>
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-bold text-white">
                                <span className="text-white/40 me-1.5">{itm.quantity}×</span>
                                {parsed.baseName}
                                {parsed.variant && <span className="text-white/40 text-xs ms-1">({parsed.variant})</span>}
                              </p>
                              <span className="text-xs text-white/50 font-mono shrink-0">{itm.price.toFixed(0)} SAR</span>
                            </div>
                            {parsed.extras && (
                              <p className="text-[11px] text-amber-400/70 ps-5 mt-0.5">+ {parsed.extras}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] text-amber-400 font-medium">{paymentLabel(waOrder.paymentMethod)}</span>
                      </div>
                      <p className="text-base font-extrabold text-white" data-testid={`text-order-total-${item.id}`}>
                        {waOrder.total.toFixed(0)} <span className="text-xs text-white/40">SAR</span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handlePrint(waOrder)}
                        className="h-9 px-3 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 rounded-xl border border-white/10"
                        data-testid={`button-print-${item.id}`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                      {isPreparing && (
                        <Button
                          onClick={() => onReadyWhatsAppOrder(waOrder)}
                          className="flex-1 h-9 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl"
                          data-testid={`button-ready-order-${item.id}`}
                        >
                          <Utensils className="w-3.5 h-3.5 me-1" />{t("جاهز", "Ready")}
                        </Button>
                      )}
                      {isReady && (
                        <Button
                          onClick={() => onCompleteWhatsAppOrder(waOrder)}
                          className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                          data-testid={`button-complete-wa-order-${item.id}`}
                        >
                          <CheckCircle className="w-3.5 h-3.5 me-1" />{t("تسليم", "Deliver")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {recentFeedbacks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">
              {t("آخر التقييمات", "Recent Feedback")}
            </h3>
            <button
              onClick={() => onNavigate("feedback")}
              className="text-xs text-violet-400 hover:underline"
              data-testid="link-view-all-feedback"
            >
              {t("عرض الكل", "View All")}
            </button>
          </div>
          <div className="space-y-1">
            {recentFeedbacks.slice(0, 3).map((fb) => (
              <div key={fb.id} className="flex items-center gap-3 bg-[#111] border border-white/[0.04] rounded-lg px-3 py-2" data-testid={`recent-feedback-${fb.id}`}>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3 h-3 ${s <= fb.stars ? "text-yellow-400 fill-yellow-400" : "text-white/10"}`} />
                  ))}
                </div>
                <p className="flex-1 text-xs text-white/40 truncate">{fb.comment || t("بدون تعليق", "No comment")}</p>
                {!fb.read && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {printOrder && (
        <div id="print-receipt" dir={lang === "ar" ? "rtl" : "ltr"}>
          <div className="receipt-header">
            <div className="receipt-store-name">{merchant?.storeName || "Digital Pager"}</div>
            <div className="receipt-order-id">{t("رقم الطلب", "Order")} #{printOrder.orderNumber || "---"}</div>
            <div className="receipt-datetime">{new Date(printOrder.createdAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}</div>
          </div>
          <div className="receipt-customer">
            <div><strong>{t("العميل", "Customer")}:</strong> {printOrder.customerName}</div>
            <div dir="ltr" style={{ textAlign: lang === "ar" ? "right" : "left" }}><strong>{t("الجوال", "Phone")}:</strong> {printOrder.customerPhone}</div>
          </div>
          <div className="receipt-items">
            {printOrder.items.map((itm, idx) => {
              const parsed = parseItemExtras(itm.name);
              return (
                <div key={idx}>
                  <div className="receipt-item">
                    <span>{itm.quantity}× {parsed.baseName}{parsed.variant ? ` (${parsed.variant})` : ""}</span>
                    <span>{itm.price.toFixed(2)} SAR</span>
                  </div>
                  {parsed.extras && (
                    <div className="receipt-item-extras">+ {parsed.extras}</div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="receipt-total">{t("الإجمالي", "Total")}: {printOrder.total.toFixed(2)} SAR</div>
          <div className="receipt-payment">{paymentLabel(printOrder.paymentMethod)}</div>
          <div className="receipt-footer">{t("شكراً لطلبكم", "Thank you for your order")}</div>
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
  onQuickAdd,
  onManualAdd,
  quickAddLoading,
  nextOrderNumber,
  counterLoaded,
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
  onQuickAdd: () => Promise<boolean | undefined>;
  onManualAdd: (num: string) => Promise<boolean | undefined>;
  quickAddLoading: boolean;
  nextOrderNumber: number;
  counterLoaded: boolean;
  notifyLoading: string | null;
  selectedPagerId: string | null;
  onSelectPager: (id: string | null) => void;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const [waitlistInput, setWaitlistInput] = useState("");
  const handleManual = async () => {
    if (quickAddLoading || isPending || !waitlistInput.trim()) return;
    const ok = await onManualAdd(waitlistInput);
    if (ok) setWaitlistInput("");
  };
  const allPagers = [...waitingPagers, ...notifiedPagers];
  const selectedPager = allPagers.find(p => p.docId === selectedPagerId) || null;

  function renderOrderCard(pager: Pager & { docId: string }, isNotified: boolean) {
    const isSelected = selectedPagerId === pager.docId;
    return (
      <button
        key={pager.docId}
        onClick={() => onSelectPager(isSelected ? null : pager.docId)}
        className={`w-full text-start rounded-2xl border p-4 transition-all ${
          isSelected
            ? "border-violet-500/40 bg-violet-500/5 shadow-lg shadow-violet-500/5"
            : isNotified
              ? "border-emerald-500/10 bg-emerald-500/[0.02] hover:border-emerald-500/20"
              : "border-white/[0.06] bg-[#111] hover:border-violet-500/20"
        }`}
        data-testid={isNotified ? `card-notified-${pager.docId}` : `card-waiting-${pager.docId}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
            isNotified
              ? "bg-emerald-500/10 border-emerald-500/15"
              : "bg-violet-500/10 border-violet-500/15"
          }`}>
            <span className={`font-bold text-xl ${isNotified ? "text-emerald-400" : "text-violet-400"}`} data-testid={`text-order-num-${pager.docId}`}>
              {pager.orderNumber}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t("طلب", "Order")} #{pager.orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pager.createdAt && new Date(pager.createdAt).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <Badge className={`text-[10px] flex-shrink-0 rounded-2xl ${
            isNotified
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
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
      </div>

      {counterLoaded && (
        <div className="flex gap-3 items-center" data-testid="waitlist-order-entry">
          <Input
            type="text"
            inputMode="numeric"
            placeholder={t("رقم مخصص", "Custom #")}
            value={waitlistInput}
            onChange={(e) => setWaitlistInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && waitlistInput.trim()) handleManual(); }}
            className="w-28 sm:w-36 h-14 text-center text-lg font-bold border-white/10 focus:border-emerald-500 focus:ring-emerald-500/20 bg-white/[0.03] rounded-2xl"
            dir="ltr"
            data-testid="input-order-waitlist"
          />
          <Button
            onClick={handleManual}
            disabled={quickAddLoading || isPending || !waitlistInput.trim()}
            className="h-14 px-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 font-bold rounded-2xl"
            data-testid="button-manual-add-waitlist"
          >
            {quickAddLoading && waitlistInput.trim() ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </Button>
          <Button
            onClick={async () => { await onQuickAdd(); }}
            disabled={quickAddLoading || isPending}
            className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
            data-testid="button-quick-add-waitlist"
          >
            {quickAddLoading && !waitlistInput.trim() ? (
              <Loader2 className="w-6 h-6 animate-spin me-3" />
            ) : (
              <Zap className="w-6 h-6 me-3" />
            )}
            {t("إضافة سريعة", "Quick Add")} #{nextOrderNumber}
          </Button>
        </div>
      )}

      <div className="flex gap-4">
        <div className={`space-y-4 ${selectedPager ? "hidden lg:block lg:w-[400px] lg:flex-shrink-0" : "w-full"}`}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("في الانتظار", "Waiting")} ({waitingPagers.length})
          </h3>
          {waitingPagers.length === 0 && notifiedPagers.length === 0 ? (
            <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
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
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl"
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
                  <Card key={pager.docId} className="border-white/[0.06] bg-[#111] rounded-2xl hover:border-violet-500/20 transition-all" data-testid={`card-waiting-${pager.docId}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                          <span className="text-violet-400 font-bold text-2xl" data-testid={`text-order-num-${pager.docId}`}>
                            {pager.orderNumber}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{t("طلب", "Order")} #{pager.orderNumber}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pager.createdAt && new Date(pager.createdAt).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <Badge className="mt-1.5 bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] rounded-2xl">
                            {t("في الانتظار", "Waiting")}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => onNotify(pager)}
                          disabled={isPending || notifyLoading === pager.docId}
                          className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 text-white font-bold text-base rounded-2xl"
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
                          className="h-12 w-12 border-red-500/15 text-red-400 hover:bg-red-500/10 rounded-2xl"
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
                    <Card key={pager.docId} className="border-emerald-500/10 bg-[#111] rounded-2xl" data-testid={`card-notified-${pager.docId}`}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                              <span className="text-emerald-400 font-bold text-xl">{pager.orderNumber}</span>
                            </div>
                            <div>
                              <p className="font-semibold">{t("طلب", "Order")} #{pager.orderNumber}</p>
                              <p className="text-xs text-emerald-400 mt-0.5">{t("تم التنبيه", "Notified")}</p>
                            </div>
                          </div>
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 rounded-2xl">
                            <BellRing className="w-3 h-3 me-1" />
                            {t("مُنبّه", "Paged")}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => onComplete(pager)}
                            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl"
                            data-testid={`button-complete-${pager.docId}`}
                          >
                            <CheckCircle className="w-4 h-4 me-1.5" />
                            {t("تم الاستلام والأرشفة", "Received & Archive")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRemove(pager)}
                            className="h-12 border-red-500/15 text-red-400 hover:bg-red-500/10 rounded-2xl"
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
            <Card className="border-white/[0.06] bg-[#111] rounded-2xl sticky top-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">{t("تفاصيل الطلب", "Order Details")}</h3>
                  <button
                    onClick={() => onSelectPager(null)}
                    className="p-1.5 rounded-xl hover:bg-white/[0.06] text-muted-foreground"
                    data-testid="button-close-detail"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-5 mb-8">
                  <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center ${
                    selectedPager.status === "notified"
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : "bg-violet-500/10 border-violet-500/20"
                  }`}>
                    <span className={`font-bold text-3xl ${
                      selectedPager.status === "notified" ? "text-emerald-400" : "text-violet-400"
                    }`}>
                      {selectedPager.orderNumber}
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{t("طلب", "Order")} #{selectedPager.orderNumber}</p>
                    <Badge className={`mt-2 rounded-2xl ${
                      selectedPager.status === "notified"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
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
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] rounded-2xl">
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
                      className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg rounded-2xl"
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
                      onClick={() => onComplete(selectedPager)}
                      className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl"
                      data-testid={`button-complete-${selectedPager.docId}`}
                    >
                      <CheckCircle className="w-6 h-6 me-2" />
                      {t("تم الاستلام والأرشفة", "Received & Archive")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => { onRemove(selectedPager); onSelectPager(null); }}
                    className="w-full h-12 border-red-500/15 text-red-400 hover:bg-red-500/10 font-semibold rounded-2xl"
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
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [productAddons, setProductAddons] = useState<ProductAddon[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null);
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(null);

  const uid = merchant?.uid;

  useEffect(() => {
    if (!uid) return;
    fetchProducts();
  }, [uid]);

  async function fetchProducts() {
    if (!uid) return;
    try {
      const res = await fetch(`/api/products/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {} finally {
      setProductsLoading(false);
    }
  }

  function openAddDialog() {
    setEditingProduct(null);
    setProductName("");
    setProductPrice("");
    setProductDescription("");
    setProductImage(null);
    setProductImagePreview("");
    setProductVariants([]);
    setProductAddons([]);
    setShowProductDialog(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(String(product.price));
    setProductDescription(product.description || "");
    setProductImage(null);
    setProductImagePreview(product.imageUrl || "");
    setProductVariants(product.variants || []);
    setProductAddons(product.addons || []);
    setShowProductDialog(true);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      setProductImagePreview(URL.createObjectURL(file));
    }
  }

  async function handleSaveProduct() {
    if (!productName.trim() || !productPrice.trim()) return;
    setSavingProduct(true);
    try {
      const formData = new FormData();
      formData.append("name", productName.trim());
      formData.append("price", productPrice);
      formData.append("description", productDescription.trim());
      if (productImage) formData.append("image", productImage);
      const cleanVariants = productVariants.filter(v => v.name.trim());
      const cleanAddons = productAddons.filter(a => a.name.trim());
      formData.append("variants", JSON.stringify(cleanVariants));
      formData.append("addons", JSON.stringify(cleanAddons));

      let res: Response;
      if (editingProduct) {
        res = await fetch(`/api/products/${uid}/${editingProduct.id}`, { method: "PATCH", body: formData });
      } else {
        formData.append("visible", "true");
        res = await fetch(`/api/products/${uid}`, { method: "POST", body: formData });
      }

      if (res.ok) {
        toast({ title: t("تم الحفظ", "Saved"), description: t("تم حفظ المنتج بنجاح", "Product saved successfully") });
        setShowProductDialog(false);
        fetchProducts();
      } else {
        toast({ title: t("خطأ", "Error"), description: t("فشل حفظ المنتج", "Failed to save product"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل حفظ المنتج", "Failed to save product"), variant: "destructive" });
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct(productId: string) {
    setDeletingProduct(productId);
    try {
      const res = await fetch(`/api/products/${uid}/${productId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: t("تم الحذف", "Deleted"), description: t("تم حذف المنتج", "Product deleted") });
        fetchProducts();
      }
    } catch {} finally {
      setDeletingProduct(null);
    }
  }

  async function handleToggleVisibility(product: Product) {
    setTogglingVisibility(product.id);
    try {
      const formData = new FormData();
      formData.append("visible", String(!product.visible));
      const res = await fetch(`/api/products/${uid}/${product.id}`, { method: "PATCH", body: formData });
      if (res.ok) fetchProducts();
    } catch {} finally {
      setTogglingVisibility(null);
    }
  }

  const menuUrl = `${window.location.origin}/menu/${uid}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t("المنتجات", "Products")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("إدارة منتجاتك وقسم الطلبات أونلاين", "Manage your products and online ordering section")}
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 gap-1.5 rounded-2xl" data-testid="button-add-product">
          <Plus className="w-4 h-4" />
          <span>{t("إضافة", "Add")}</span>
        </Button>
      </div>

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{t("رابط الطلب أونلاين", "Online Order Link (for Google Maps)")}</p>
              <p className="text-sm text-white/70 truncate font-mono" data-testid="text-menu-url">{menuUrl}</p>
            </div>
            <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-9 px-4 rounded-lg font-semibold" onClick={() => { navigator.clipboard.writeText(menuUrl); toast({ title: t("تم النسخ", "Copied") }); }} data-testid="button-copy-menu-url">
              {t("نسخ الرابط", "Copy Link")}
            </Button>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/15" dir="rtl" data-testid="tip-google-maps">
            <p className="text-xs text-amber-300/90 leading-relaxed">
              💡 {t("يفضل نسخ هذا الرابط ووضعه في خانة (طلب أونلاين) في خرائط قوقل لزيادة مبيعاتك وتسهيل وصول العملاء.", "We recommend copying this link and placing it in the 'Order Online' field on Google Maps to boost your sales and make it easier for customers to reach you.")}
            </p>
          </div>
        </CardContent>
      </Card>

      {productsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Package className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">{t("لا توجد منتجات", "No products yet")}</p>
            <p className="text-muted-foreground/50 text-sm mt-1">{t("أضف أول منتج لبدء القائمة", "Add your first product to get started")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="products-list">
          {products.map(product => (
            <Card key={product.id} className={`border-white/[0.06] rounded-2xl ${product.visible ? "bg-[#111]" : "bg-[#0e0e0e] opacity-60"}`} data-testid={`product-item-${product.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-white/[0.06]" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0 border border-white/[0.06]">
                      <Image className="w-6 h-6 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm truncate" data-testid={`text-product-name-${product.id}`}>{product.name}</p>
                      {!product.visible && <Badge variant="outline" className="text-[10px] border-white/10 text-white/30 rounded-2xl">{t("مخفي", "Hidden")}</Badge>}
                    </div>
                    {product.description && <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{product.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-emerald-400 font-bold text-sm" data-testid={`text-product-price-${product.id}`}>{product.price.toFixed(2)} SAR</p>
                      {(product.variants && product.variants.length > 0) && (
                        <Badge variant="outline" className="text-[10px] border-violet-500/20 text-violet-400/70 rounded-2xl px-1.5 py-0">{product.variants.length} {t("أحجام", "sizes")}</Badge>
                      )}
                      {(product.addons && product.addons.length > 0) && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400/70 rounded-2xl px-1.5 py-0">{product.addons.length} {t("إضافات", "extras")}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="w-8 h-8 text-muted-foreground hover:text-white" onClick={() => handleToggleVisibility(product)} disabled={togglingVisibility === product.id} data-testid={`button-toggle-visibility-${product.id}`}>
                      {togglingVisibility === product.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : product.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8 text-muted-foreground hover:text-white" onClick={() => openEditDialog(product)} data-testid={`button-edit-product-${product.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteProduct(product.id)} disabled={deletingProduct === product.id} data-testid={`button-delete-product-${product.id}`}>
                      {deletingProduct === product.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="bg-[#111] border-white/[0.06] max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? t("تعديل المنتج", "Edit Product") : t("إضافة منتج", "Add Product")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2" dir="rtl">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{t("الصورة", "Image")}</label>
              <div className="flex items-center gap-3">
                {productImagePreview ? (
                  <img src={productImagePreview} alt="" className="w-20 h-20 rounded-lg object-cover border border-white/[0.06]" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-white/[0.03] border border-dashed border-white/10 flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} data-testid="input-product-image" />
                  <span className="text-sm text-emerald-400 hover:text-emerald-300">{t("اختر صورة", "Choose Image")}</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{t("اسم المنتج", "Product Name")}</label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={t("مثال: برجر لحم مشوي بالجبنة", "e.g. Grilled Beef Cheese Burger")}
                className="bg-black/40 border-white/10 text-white placeholder:text-white/20"
                dir="rtl"
                data-testid="input-product-name"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{t("السعر الأساسي (SAR)", "Base Price (SAR)")}</label>
              <Input
                type="number"
                step="0.01"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="0.00"
                className="bg-black/40 border-white/10 text-white placeholder:text-white/20"
                dir="ltr"
                data-testid="input-product-price"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{t("الوصف (اختياري)", "Description (optional)")}</label>
              <Input
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder={t("مثال: شريحة لحم بلدي، جبنة شيدر، صوص الترافل", "e.g. Local beef patty, cheddar cheese, truffle sauce")}
                className="bg-black/40 border-white/10 text-white placeholder:text-white/20"
                dir="rtl"
                data-testid="input-product-description"
              />
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-white/80">{t("الأحجام / المقاسات", "Sizes / Variants")}</label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setProductVariants([...productVariants, { name: "", price: 0 }])}
                  className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 rounded-lg gap-1"
                  data-testid="button-add-variant"
                >
                  <Plus className="w-3 h-3" />
                  {t("إضافة حجم", "Add Size")}
                </Button>
              </div>
              <p className="text-[11px] text-white/25 mb-3" dir="rtl">{t("أضف أحجاماً مختلفة لمنتجك (مثل: صغير، وسط، كبير)", "Add different sizes for your product (e.g. Small, Medium, Large)")}</p>
              {productVariants.length > 0 && (
                <div className="space-y-2">
                  {productVariants.map((variant, i) => (
                    <div key={i} className="flex items-center gap-2" data-testid={`variant-row-${i}`}>
                      <Input
                        value={variant.name}
                        onChange={(e) => {
                          const updated = [...productVariants];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setProductVariants(updated);
                        }}
                        placeholder={t("مثال: صغير، دبل، أو حبة", "e.g. Small, Double, or Single")}
                        className="flex-1 h-9 text-sm bg-black/40 border-white/10 text-white placeholder:text-white/20"
                        dir="rtl"
                        data-testid={`input-variant-name-${i}`}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.price || ""}
                        onChange={(e) => {
                          const updated = [...productVariants];
                          updated[i] = { ...updated[i], price: parseFloat(e.target.value) || 0 };
                          setProductVariants(updated);
                        }}
                        placeholder="0.00"
                        className="w-24 h-9 text-sm bg-black/40 border-white/10 text-white placeholder:text-white/20 text-center"
                        dir="ltr"
                        data-testid={`input-variant-price-${i}`}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setProductVariants(productVariants.filter((_, idx) => idx !== i))}
                        className="w-8 h-8 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                        data-testid={`button-remove-variant-${i}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-white/80">{t("الإضافات", "Add-ons / Extras")}</label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setProductAddons([...productAddons, { name: "", price: 0 }])}
                  className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 rounded-lg gap-1"
                  data-testid="button-add-addon"
                >
                  <Plus className="w-3 h-3" />
                  {t("إضافة خيار", "Add Extra")}
                </Button>
              </div>
              <p className="text-[11px] text-white/25 mb-3" dir="rtl">{t("يمكنك إضافة خيارات مدفوعة (مثلاً: جبنة +3 ريال) أو مجانية (مثلاً: بدون بصل 0 ريال)", "Add paid extras (e.g. Cheese +3 SAR) or free options (e.g. No onion 0 SAR)")}</p>
              {productAddons.length > 0 && (
                <div className="space-y-2">
                  {productAddons.map((addon, i) => (
                    <div key={i} className="flex items-center gap-2" data-testid={`addon-row-${i}`}>
                      <Input
                        value={addon.name}
                        onChange={(e) => {
                          const updated = [...productAddons];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setProductAddons(updated);
                        }}
                        placeholder={t("مثال: جبنة إضافية أو بدون بصل", "e.g. Extra cheese or No onion")}
                        className="flex-1 h-9 text-sm bg-black/40 border-white/10 text-white placeholder:text-white/20"
                        dir="rtl"
                        data-testid={`input-addon-name-${i}`}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={addon.price || ""}
                        onChange={(e) => {
                          const updated = [...productAddons];
                          updated[i] = { ...updated[i], price: parseFloat(e.target.value) || 0 };
                          setProductAddons(updated);
                        }}
                        placeholder="0.00"
                        className="w-24 h-9 text-sm bg-black/40 border-white/10 text-white placeholder:text-white/20 text-center"
                        dir="ltr"
                        data-testid={`input-addon-price-${i}`}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setProductAddons(productAddons.filter((_, idx) => idx !== i))}
                        className="w-8 h-8 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                        data-testid={`button-remove-addon-${i}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)} className="border-white/10 text-white/60">{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleSaveProduct} disabled={!productName.trim() || !productPrice.trim() || savingProduct} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl" data-testid="button-save-product">
              {savingProduct ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t("حفظ", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
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
        <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
          <CardContent className="p-0 divide-y divide-white/[0.04]">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className={`flex items-start gap-4 px-5 py-4 ${!feedback.read ? "bg-orange-500/[0.02]" : ""}`}
                data-testid={`card-feedback-${feedback.id}`}
              >
                <div className="flex-shrink-0 pt-0.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= feedback.stars ? "text-yellow-400 fill-yellow-400" : "text-white/10"}`}
                        data-testid={`star-${feedback.id}-${s}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {!feedback.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" data-testid={`badge-unread-${feedback.id}`} />
                    )}
                    <p className="text-xs text-muted-foreground/60" data-testid={`text-feedback-time-${feedback.id}`}>
                      {new Date(feedback.timestamp).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {feedback.comment && (
                    <p className="text-sm text-foreground/80 leading-relaxed" data-testid={`text-feedback-comment-${feedback.id}`}>
                      {feedback.comment}
                    </p>
                  )}
                </div>
                {!feedback.read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMarkAsRead(feedback.id)}
                    disabled={markingRead === feedback.id}
                    className="flex-shrink-0 text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                    data-testid={`button-mark-read-${feedback.id}`}
                  >
                    {markingRead === feedback.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-white/[0.06] bg-[#111] rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-tight" data-testid={`text-stat-${i}`}>{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
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
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-violet-400" />
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
  nextOrderNumber,
  onResetCounter,
  onOpenShiftStart,
  onlineOrdersEnabled,
  onToggleOnlineOrders,
  businessOpenTime,
  businessCloseTime,
  onSaveBusinessHours,
  t,
  lang,
}: {
  merchant: any;
  onDownloadQR: () => void;
  qrLoading: boolean;
  nextOrderNumber: number;
  onResetCounter: (n: number) => void;
  onOpenShiftStart: () => void;
  onlineOrdersEnabled: boolean;
  onToggleOnlineOrders: () => void;
  businessOpenTime: string;
  businessCloseTime: string;
  onSaveBusinessHours: (openTime: string, closeTime: string) => void;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const { toast } = useToast();
  const [resetValue, setResetValue] = useState("");
  const [localOpenTime, setLocalOpenTime] = useState(businessOpenTime);
  const [localCloseTime, setLocalCloseTime] = useState(businessCloseTime);

  useEffect(() => {
    setLocalOpenTime(businessOpenTime);
    setLocalCloseTime(businessCloseTime);
  }, [businessOpenTime, businessCloseTime]);

  const hoursChanged = localOpenTime !== businessOpenTime || localCloseTime !== businessCloseTime;

  const [storeTermsEnabled, setStoreTermsEnabled] = useState<boolean>(merchant?.storeTermsEnabled || false);
  const [storeTermsText, setStoreTermsText] = useState<string>(merchant?.storeTermsText || "");
  const [storePrivacyText, setStorePrivacyText] = useState<string>(merchant?.storePrivacyText || "");
  const [storeLegalSaving, setStoreLegalSaving] = useState(false);
  const [storeTermsToggling, setStoreTermsToggling] = useState(false);

  useEffect(() => {
    if (!storeTermsToggling) {
      setStoreTermsEnabled(merchant?.storeTermsEnabled || false);
    }
  }, [merchant?.storeTermsEnabled, storeTermsToggling]);

  useEffect(() => {
    setStoreTermsText(merchant?.storeTermsText || "");
    setStorePrivacyText(merchant?.storePrivacyText || "");
  }, [merchant?.storeTermsText, merchant?.storePrivacyText]);

  async function handleToggleStoreTerms(checked: boolean) {
    if (!merchant?.uid) return;
    setStoreTermsToggling(true);
    setStoreTermsEnabled(checked);
    try {
      const merchantRef = doc(db, "merchants", merchant.uid);
      await updateDoc(merchantRef, { storeTermsEnabled: checked });
    } catch {
      setStoreTermsEnabled(!checked);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحديث الحالة", "Failed to update toggle"),
        variant: "destructive",
      });
    } finally {
      setStoreTermsToggling(false);
    }
  }

  async function handleSaveStoreLegal() {
    if (!merchant?.uid) return;
    setStoreLegalSaving(true);
    try {
      const merchantRef = doc(db, "merchants", merchant.uid);
      await updateDoc(merchantRef, {
        storeTermsEnabled,
        storeTermsText,
        storePrivacyText,
      });
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم حفظ الشروط والأحكام بنجاح", "Store terms saved successfully"),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حفظ الشروط", "Failed to save terms"),
        variant: "destructive",
      });
    } finally {
      setStoreLegalSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("الإعدادات", "Settings")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("إعدادات المتجر وأدوات إضافية", "Store settings and tools")}
        </p>
      </div>

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            {t("التحكم بالطلبات أونلاين", "Online Ordering Controls")}
          </h3>

          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]" data-testid="online-orders-toggle-row">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("استقبال الطلبات أونلاين", "Enable Online Orders")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">
                  {t("إيقاف فوري لاستقبال الطلبات عند ضغط المطبخ", "Instantly stop receiving orders during kitchen pressure")}
                </p>
              </div>
              <Switch
                checked={onlineOrdersEnabled}
                onCheckedChange={onToggleOnlineOrders}
                className="data-[state=checked]:bg-emerald-600"
                data-testid="switch-online-orders"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" />
                {t("ساعات العمل", "Business Hours")}
              </p>
              <p className="text-xs text-muted-foreground" dir="rtl">
                {t("حدد أوقات فتح وإغلاق المتجر. خارج هذه الأوقات لن يتمكن العملاء من الطلب.", "Set your opening and closing times. Outside these hours, customers cannot place orders.")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">{t("وقت الفتح", "Opening Time")}</label>
                  <Input
                    type="time"
                    value={localOpenTime}
                    onChange={(e) => setLocalOpenTime(e.target.value)}
                    className="h-12 bg-white/[0.03] border-white/10 text-center font-mono"
                    dir="ltr"
                    data-testid="input-open-time"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">{t("وقت الإغلاق", "Closing Time")}</label>
                  <Input
                    type="time"
                    value={localCloseTime}
                    onChange={(e) => setLocalCloseTime(e.target.value)}
                    className="h-12 bg-white/[0.03] border-white/10 text-center font-mono"
                    dir="ltr"
                    data-testid="input-close-time"
                  />
                </div>
              </div>
              {localOpenTime && localCloseTime && (
                <p className="text-xs text-muted-foreground text-center" dir="rtl" data-testid="text-hours-preview">
                  {t("ساعات العمل:", "Business Hours:")} {localOpenTime} → {localCloseTime}
                </p>
              )}
              <Button
                onClick={() => onSaveBusinessHours(localOpenTime, localCloseTime)}
                disabled={!hoursChanged}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl disabled:opacity-30"
                data-testid="button-save-hours"
              >
                {t("حفظ ساعات العمل", "Save Business Hours")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            {t("الشروط والأحكام للمتجر", "Store Terms & Privacy")}
          </h3>

          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]" data-testid="store-terms-toggle-row">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("شروط وأحكام المتجر", "Store Terms & Conditions")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">
                  {t("عرض شروط المتجر للعملاء عند الطلب أونلاين", "Show store terms to customers during online ordering")}
                </p>
              </div>
              <Switch
                checked={storeTermsEnabled}
                onCheckedChange={handleToggleStoreTerms}
                disabled={storeTermsToggling}
                className="data-[state=checked]:bg-emerald-600"
                data-testid="switch-store-terms"
              />
            </div>

            {storeTermsEnabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block" dir="rtl">{t("شروط وأحكام المتجر", "Store Terms & Conditions")}</label>
                  <Textarea
                    value={storeTermsText}
                    onChange={(e) => setStoreTermsText(e.target.value)}
                    placeholder={t("اكتب شروط وأحكام المتجر هنا...", "Write store terms here...")}
                    rows={5}
                    dir="rtl"
                    className="resize-y bg-white/[0.03] border-white/10"
                    data-testid="textarea-store-terms"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block" dir="rtl">{t("سياسة الخصوصية للمتجر", "Store Privacy Policy")}</label>
                  <Textarea
                    value={storePrivacyText}
                    onChange={(e) => setStorePrivacyText(e.target.value)}
                    placeholder={t("اكتب سياسة الخصوصية هنا...", "Write privacy policy here...")}
                    rows={5}
                    dir="rtl"
                    className="resize-y bg-white/[0.03] border-white/10"
                    data-testid="textarea-store-privacy"
                  />
                </div>
                <Button
                  onClick={handleSaveStoreLegal}
                  disabled={storeLegalSaving}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl disabled:opacity-30"
                  data-testid="button-save-store-terms"
                >
                  {storeLegalSaving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
                  {t("حفظ الشروط والأحكام", "Save Terms & Conditions")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-violet-400" />
            {t("عداد الطلبات", "Order Counter")}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span className="text-sm text-muted-foreground">{t("الطلب التالي", "Next Order Number")}</span>
              <span className="text-lg font-mono font-bold text-violet-400" data-testid="text-next-order-number">#{nextOrderNumber}</span>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("أدخل رقم الطلب الذي تريد البدء منه", "Enter the starting order number")}
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder={t("رقم البداية", "Starting number")}
                value={resetValue}
                onChange={(e) => setResetValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && resetValue.trim() && !isNaN(parseInt(resetValue)) && parseInt(resetValue) >= 1) {
                    onResetCounter(parseInt(resetValue));
                    setResetValue("");
                  }
                }}
                className="flex-1 h-12 text-center font-bold border-white/10 bg-white/[0.03]"
                dir="ltr"
                data-testid="input-reset-counter"
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (resetValue.trim() && !isNaN(parseInt(resetValue)) && parseInt(resetValue) >= 1) {
                    onResetCounter(parseInt(resetValue));
                    setResetValue("");
                  }
                }}
                disabled={!resetValue.trim() || isNaN(parseInt(resetValue)) || parseInt(resetValue) < 1}
                className="h-12 border-white/10"
                data-testid="button-set-counter"
              >
                {t("تعيين", "Set")}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { onResetCounter(1); }}
                className="flex-1 h-12 border-red-500/15 text-red-400 hover:bg-red-500/10"
                data-testid="button-reset-to-one"
              >
                <RotateCcw className="w-4 h-4 me-2" />
                {t("إعادة تعيين إلى #1", "Reset to #1")}
              </Button>
              <Button
                variant="outline"
                onClick={onOpenShiftStart}
                className="flex-1 h-12 border-white/10"
                data-testid="button-shift-start"
              >
                <Zap className="w-4 h-4 me-2" />
                {t("بداية وردية", "Shift Start")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
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

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">{t("رمز QR", "QR Code")}</h3>
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="bg-white p-4 rounded-2xl" data-testid="qr-preview-container">
              <img
                src={`/api/qr/${merchant.uid}?t=${Date.now()}`}
                alt="Store QR Code"
                className="w-48 h-48"
                data-testid="img-qr-preview"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t("امسح هذا الرمز لفتح صفحة المتجر", "Scan this code to open your store page")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onDownloadQR}
              disabled={qrLoading}
              className="h-12 border-white/10 justify-start rounded-2xl"
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
              className="h-12 border-white/10 justify-start rounded-2xl"
              data-testid="button-share-store-link"
            >
              <Share2 className="w-4 h-4 me-3" />
              {t("مشاركة رابط المتجر", "Share Store Link")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">{t("الدعم الفني", "Support")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("تواصل مع فريق الدعم للمساعدة", "Contact support for assistance")}
          </p>
          <Button
            variant="outline"
            onClick={() => window.open(ADMIN_WHATSAPP, "_blank")}
            className="border-white/10 rounded-2xl"
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
