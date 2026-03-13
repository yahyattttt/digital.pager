import { useState, useEffect, useCallback, useRef } from "react";
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
  Users2,
  Ticket,
  DollarSign,
  UserX,
  FileDown,
  Calendar,
  TrendingUp,
  ShieldAlert,
  AlertCircle,
  UserCheck,
  Sparkles,
  Search,
  Navigation,
  Truck,
  ShoppingBag,
  Filter,
  FolderArchive,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import ArchiveView from "@/pages/order-archive";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const businessTypeLabelsEn: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  clinic: "Clinic",
  other: "Other",
};

const ADMIN_WHATSAPP = "https://wa.me/966500000000";

type DashboardView = "overview" | "menu" | "feedback" | "analytics" | "customers" | "coupons" | "financial" | "settings" | "archive";

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
  const [, setLocation] = useLocation();
  const { merchant, logout } = useAuth();
  const { t, toggleLanguage, lang, isRTL } = useLanguage();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported } = useWakeLock();
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();
  const { toast } = useToast();

  const [pagers, setPagers] = useState<(Pager & { docId: string })[]>([]);
  
  const [notifyLoading, setNotifyLoading] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Array<{ id: string; merchantId: string; stars: number; comment: string; timestamp: string; read: boolean }>>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState<boolean>((merchant as any)?.storeOpen !== false);
  const [whatsappOrders, setWhatsappOrders] = useState<WhatsAppOrder[]>([]);
  const [activeWhatsappOrders, setActiveWhatsappOrders] = useState<WhatsAppOrder[]>([]);
  const prevWhatsappCountRef = useState({ current: -1 })[0];
  const waOrderAudioRef = useState<{ current: HTMLAudioElement | null }>({ current: null })[0];
  const [onlineOrdersEnabled, setOnlineOrdersEnabled] = useState<boolean>((merchant as any)?.onlineOrdersEnabled !== false);
  const [businessOpenTime, setBusinessOpenTime] = useState<string>((merchant as any)?.businessOpenTime || "");
  const [businessCloseTime, setBusinessCloseTime] = useState<string>((merchant as any)?.businessCloseTime || "");
  const [completedToday, setCompletedToday] = useState(0);
  const [flyingOrderId, setFlyingOrderId] = useState<string | null>(null);
  const [merchantFeatures, setMerchantFeatures] = useState({ analyticsEnabled: true, crmEnabled: true, smartRatingEnabled: true, printReceiptsEnabled: true });
  const [manualDigitInput, setManualDigitInput] = useState("");
  const [manualAddLoading, setManualAddLoading] = useState(false);
  const [lastShiftNumber, setLastShiftNumber] = useState<number>(0);
  const [showShiftConfig, setShowShiftConfig] = useState(false);
  const [shiftConfigInput, setShiftConfigInput] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

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
          displayOrderId: data.displayOrderId || "",
          orderType: data.orderType || undefined,
          diningType: data.diningType || undefined,
          deliveryFee: data.deliveryFee || undefined,
          deliveryAddress: data.deliveryAddress || undefined,
          deliveryLat: data.deliveryLat || undefined,
          deliveryLng: data.deliveryLng || undefined,
          deliveryMapLink: data.deliveryMapLink || undefined,
          customerNotes: data.customerNotes || undefined,
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
          displayOrderId: data.displayOrderId || "",
          orderType: data.orderType || undefined,
          diningType: data.diningType || undefined,
          deliveryFee: data.deliveryFee || undefined,
          deliveryAddress: data.deliveryAddress || undefined,
          deliveryLat: data.deliveryLat || undefined,
          deliveryLng: data.deliveryLng || undefined,
          deliveryMapLink: data.deliveryMapLink || undefined,
          customerNotes: data.customerNotes || undefined,
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
    fetch(`/api/merchant-features/${merchant.uid}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.features) setMerchantFeatures(data.features); })
      .catch(() => {});
  }, [merchant?.uid]);

  useEffect(() => {
    if (!merchant?.uid) return;
    const metaRef = doc(db, "merchants", merchant.uid, "settings", "manualShift");
    const unsub = onSnapshot(metaRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const val = parseInt(String(data.last_shift_number || 0), 10);
        setLastShiftNumber(isNaN(val) ? 0 : val);
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
          "فشل في تحميل الطلبات. يرجى تحديث الصفحة.",
          "Failed to load orders. Please refresh the page."
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

  const handleManualDigitAdd = useCallback(async () => {
    if (!merchant?.uid || !isApproved || manualAddLoading) return;
    const trimmed = manualDigitInput.trim();
    if (!trimmed || !/^\d{1,3}$/.test(trimmed)) {
      toast({
        title: t("رقم غير صالح", "Invalid Number"),
        description: t("أدخل رقم من 1 إلى 3 أرقام", "Enter a 1-3 digit number"),
        variant: "destructive",
      });
      return;
    }
    setManualAddLoading(true);
    try {
      const pagersRef = collection(db, "merchants", merchant.uid, "pagers");
      await addDoc(pagersRef, {
        storeId: merchant.uid,
        orderNumber: trimmed,
        displayOrderId: trimmed,
        orderType: "manual",
        orderSource: "Manual",
        status: "waiting",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
      });
      setManualDigitInput("");
      toast({ title: t(`تم إضافة طلب رقم ${trimmed} بنجاح`, `Order #${trimmed} added successfully`) });
      setTimeout(() => manualInputRef.current?.focus(), 50);
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في إضافة الطلب", "Failed to add order"), variant: "destructive" });
    } finally {
      setManualAddLoading(false);
    }
  }, [merchant?.uid, isApproved, manualAddLoading, manualDigitInput, t, toast]);

  const handleShiftConfigSave = useCallback(async () => {
    if (!merchant?.uid) return;
    const num = parseInt(shiftConfigInput.trim(), 10);
    if (isNaN(num) || num < 1) {
      toast({ title: t("رقم غير صالح", "Invalid Number"), variant: "destructive" });
      return;
    }
    try {
      const metaRef = doc(db, "merchants", merchant.uid, "settings", "manualShift");
      await setDoc(metaRef, { last_shift_number: num }, { merge: true });
      setShowShiftConfig(false);
      setShiftConfigInput("");
      toast({ title: t(`تم تعيين بداية الوردية: ${num}`, `Shift start set to: ${num}`) });
    } catch {
      toast({ title: t("خطأ", "Error"), variant: "destructive" });
    }
  }, [merchant?.uid, shiftConfigInput, t, toast]);

  const handleShiftAdd = useCallback(async () => {
    if (!merchant?.uid || !isApproved || manualAddLoading) return;
    if (lastShiftNumber === 0) {
      setShowShiftConfig(true);
      return;
    }
    setManualAddLoading(true);
    try {
      const metaRef = doc(db, "merchants", merchant.uid, "settings", "manualShift");
      let newNum = 0;
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(metaRef);
        const current = snap.exists() ? parseInt(String(snap.data().last_shift_number || 0), 10) : 0;
        newNum = (isNaN(current) ? 0 : current) + 1;
        txn.set(metaRef, { last_shift_number: newNum }, { merge: true } as any);
      });
      const displayId = String(newNum).padStart(3, "0").slice(-3);

      const pagersRef = collection(db, "merchants", merchant.uid, "pagers");
      await addDoc(pagersRef, {
        storeId: merchant.uid,
        orderNumber: String(newNum),
        displayOrderId: displayId,
        orderType: "manual",
        orderSource: "Manual",
        status: "waiting",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
      });
      toast({ title: t(`تم إضافة طلب رقم ${displayId} بنجاح`, `Order #${displayId} added successfully`) });
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في إضافة الطلب", "Failed to add order"), variant: "destructive" });
    } finally {
      setManualAddLoading(false);
    }
  }, [merchant?.uid, isApproved, manualAddLoading, lastShiftNumber, t, toast]);

  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  const handleAcceptWhatsAppOrder = useCallback(async (order: WhatsAppOrder) => {
    if (!merchant?.uid || acceptingOrderId) return;
    setAcceptingOrderId(order.id);
    try {
      const orderRef = doc(db, "merchants", merchant.uid, "whatsappOrders", order.id);
      await updateDoc(orderRef, { status: "preparing", preparingAt: new Date().toISOString() });

      const displayId = order.displayOrderId || `#${order.orderNumber}`;
      toast({
        title: t(`تم قبول الطلب ${displayId}`, `Order ${displayId} Accepted`),
        description: t("تم تحديث حالة الطلب إلى جاري التحضير", "Order status updated to preparing"),
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

  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);

  const handleRejectWhatsAppOrder = useCallback(async (order: WhatsAppOrder) => {
    if (!merchant?.uid || rejectingOrderId) return;
    setRejectingOrderId(order.id);
    try {
      const orderRef = doc(db, "merchants", merchant.uid, "whatsappOrders", order.id);
      await updateDoc(orderRef, { status: "rejected", rejectedAt: new Date().toISOString() });

      const displayId = order.displayOrderId || `#${order.orderNumber}`;
      toast({
        title: t(`تم رفض الطلب ${displayId}`, `Order ${displayId} Rejected`),
        description: t("تم رفض الطلب بنجاح", "Order has been rejected"),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في رفض الطلب", "Failed to reject order"),
        variant: "destructive",
      });
    } finally {
      setRejectingOrderId(null);
    }
  }, [merchant?.uid, rejectingOrderId, t, toast]);

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
        description: t(`تم إغلاق الطلب ${order.displayOrderId || "#" + order.orderNumber}`, `Order ${order.displayOrderId || "#" + order.orderNumber} has been closed`),
        action: (
          <button
            onClick={() => setCurrentView("archive")}
            className="text-primary text-xs font-medium underline underline-offset-2 hover:text-primary/80 whitespace-nowrap"
            data-testid="link-view-in-archive"
          >
            {t("عرض في الأرشيف", "View in Archive")}
          </button>
        ),
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

  const handleUncollectedWhatsAppOrder = useCallback(async (order: WhatsAppOrder) => {
    if (!merchant?.uid) return;
    try {
      setFlyingOrderId(`wa-${order.id}`);
      await new Promise(r => setTimeout(r, 600));

      const now = new Date().toISOString();
      const orderRef = doc(db, "merchants", merchant.uid, "whatsappOrders", order.id);
      await updateDoc(orderRef, { status: "uncollected", archivedAt: now });

      try {
        await fetch(`/api/whatsapp-orders/${merchant.uid}/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "uncollected" }),
        });
      } catch (e) {
        console.error("Failed to update noShowCount via server:", e);
      }

      setFlyingOrderId(null);
      toast({
        title: t("لم يحضر العميل", "Customer No-Show"),
        description: t(`تم تسجيل عدم حضور العميل للطلب #${order.orderNumber}`, `Customer no-show recorded for order #${order.orderNumber}`),
        variant: "destructive",
      });
    } catch {
      setFlyingOrderId(null);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحديث حالة الطلب", "Failed to update order status"),
        variant: "destructive",
      });
    }
  }, [merchant?.uid, t, toast]);

  const handleReadyWhatsAppOrder = useCallback(async (order: WhatsAppOrder) => {
    if (!merchant?.uid) return;
    try {
      const orderRef = doc(db, "merchants", merchant.uid, "whatsappOrders", order.id);
      await updateDoc(orderRef, { status: "ready", readyAt: new Date().toISOString() });
      toast({
        title: t(`الطلب ${order.displayOrderId || "#" + order.orderNumber} جاهز`, `Order ${order.displayOrderId || "#" + order.orderNumber} Ready`),
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

      if ((pager as any).orderSource !== "Manual") {
        const waOrdersRef = collection(db, "merchants", merchant.uid, "whatsappOrders");
        const waQuery = query(waOrdersRef, where("orderNumber", "==", pager.orderNumber), where("status", "==", "preparing"));
        const waSnap = await getDocs(waQuery);
        if (!waSnap.empty) {
          await updateDoc(waSnap.docs[0].ref, { status: "ready" });
        }
      }

      toast({
        title: t("تم التنبيه", "Notified"),
        description: t(
          `تم تنبيه الطلب ${pager.displayOrderId || "#" + pager.orderNumber} بنجاح`,
          `Order ${pager.displayOrderId || "#" + pager.orderNumber} has been notified`
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

      if ((pager as any).orderSource !== "Manual") {
        const waOrdersRef = collection(db, "merchants", merchant.uid, "whatsappOrders");
        const waQuery = query(waOrdersRef, where("orderNumber", "==", pager.orderNumber), where("status", "in", ["preparing", "ready"]));
        const waSnap = await getDocs(waQuery);
        if (!waSnap.empty) {
          await updateDoc(waSnap.docs[0].ref, { status: "archived", archivedAt: new Date().toISOString() });
        }
      }

      setFlyingOrderId(null);
      toast({
        title: t("تم الاستلام", "Order Picked Up"),
        description: t(`تم إغلاق الطلب ${pager.displayOrderId || "#" + pager.orderNumber}`, `Order ${pager.displayOrderId || "#" + pager.orderNumber} completed`),
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
          `تم حذف الطلب ${pager.displayOrderId || "#" + pager.orderNumber}`,
          `Order ${pager.displayOrderId || "#" + pager.orderNumber} removed`
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



  const allNavItems: { id: DashboardView; icon: typeof LayoutDashboard; label: string; badge?: number }[] = [
    { id: "overview", icon: LayoutDashboard, label: t("لوحة التحكم", "Dashboard"), badge: whatsappOrders.length || undefined },

    { id: "menu", icon: UtensilsCrossed, label: t("قسم الأونلاين", "Online Section") },
    { id: "feedback", icon: MessageSquare, label: t("ملاحظات العملاء", "Customer Feedback"), badge: unreadFeedbackCount || undefined },
    { id: "analytics", icon: BarChart3, label: t("التحليلات", "Analytics") },
    { id: "customers", icon: Users2, label: t("عملائي", "My Customers") },
    { id: "coupons", icon: Ticket, label: t("الكوبونات", "Coupons") },
    { id: "financial", icon: DollarSign, label: t("الإدارة المالية", "Financial") },
    { id: "archive", icon: FolderArchive, label: t("أرشيف الطلبات", "Order Archive") },
    { id: "settings", icon: Settings, label: t("الإعدادات", "Settings") },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.id === "analytics" && !merchantFeatures.analyticsEnabled) return false;
    if (item.id === "customers" && !merchantFeatures.crmEnabled) return false;
    return true;
  });

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

      <header className="h-12 border-b border-white/[0.06] bg-[#0d0d0d]/95 backdrop-blur-md flex items-center justify-between px-3 flex-shrink-0 z-50" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? t("إغلاق القائمة", "Close menu") : t("فتح القائمة", "Open menu")}
            className="md:hidden p-1 rounded-md hover:bg-white/[0.06] text-muted-foreground"
            data-testid="button-toggle-sidebar"
          >
            {sidebarOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>

          <div className="flex items-center gap-2">
            {merchant.logoUrl ? (
              <img
                src={merchant.logoUrl}
                alt={t("الشعار", "Logo")}
                className="w-7 h-7 rounded-lg object-cover border border-white/10"
                data-testid="img-dashboard-logo"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <Store className="w-3.5 h-3.5 text-violet-400" />
              </div>
            )}
            <h1 className="font-bold text-sm leading-tight hidden sm:block truncate max-w-[120px]" data-testid="text-dashboard-store">
              {merchant.storeName}
            </h1>
          </div>

          <div className="h-5 w-px bg-white/[0.06] hidden sm:block" />

          <button
            onClick={handleToggleStoreOpen}
            aria-label={storeOpen ? t("إيقاف استقبال الطلبات", "Stop receiving orders") : t("بدء استقبال الطلبات", "Start receiving orders")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-[0.96] ${
              storeOpen
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                : "bg-red-500/15 text-red-400 border border-red-500/25 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
            }`}
            data-testid="button-store-status-toggle"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${storeOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            {storeOpen
              ? t("استقبال الطلبات: متاح ✅", "Receiving Orders: ON ✅")
              : t("استقبال الطلبات: متوقف ❌", "Receiving Orders: OFF ❌")}
          </button>

          {businessCloseTime && (
            <span className="text-[10px] text-white/25 hidden lg:inline truncate" data-testid="text-closing-time">
              {t(`يغلق ${businessCloseTime}`, `Closes ${businessCloseTime}`)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {wakeLockSupported && (
            <div
              className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-[9px]"
              data-testid="indicator-wake-lock"
            >
              <span className={`w-1 h-1 rounded-full ${wakeLockActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`} />
              <span className="text-muted-foreground/60">
                {wakeLockActive ? t("نشط", "Active") : t("عادي", "Normal")}
              </span>
            </div>
          )}

          <LiveClock lang={lang} t={t} />

          <div className="h-4 w-px bg-white/[0.06]" />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownloadQR}
            disabled={qrLoading}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            data-testid="button-download-qr"
            title={t("تحميل QR", "Download QR")}
          >
            {qrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            data-testid="button-toggle-language"
          >
            <Globe className="w-3.5 h-3.5" />
          </Button>

          {isSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-7 w-7 text-muted-foreground hover:text-foreground hidden sm:flex"
              data-testid="button-toggle-fullscreen"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </Button>
          )}
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
            <div>
              <p className="text-[9px] text-muted-foreground/60 tracking-[0.2em] uppercase leading-tight">DIGITAL PAGER</p>
              <span className="font-bold text-sm" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{merchant.storeName}</span>
            </div>
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
                storeOpen={storeOpen}
                onlineOrdersEnabled={onlineOrdersEnabled}
                onToggleOnlineOrders={handleToggleOnlineOrders}
                isPending={isPending}
                onNotify={handleNotify}
                onComplete={handleComplete}
                onRemove={handleRemove}
                notifyLoading={notifyLoading}
                whatsappOrders={whatsappOrders}
                activeWhatsappOrders={activeWhatsappOrders}
                onAcceptWhatsAppOrder={handleAcceptWhatsAppOrder}
                onRejectWhatsAppOrder={handleRejectWhatsAppOrder}
                onReadyWhatsAppOrder={handleReadyWhatsAppOrder}
                onCompleteWhatsAppOrder={handleCompleteWhatsAppOrder}
                onUncollectedWhatsAppOrder={handleUncollectedWhatsAppOrder}
                acceptingOrderId={acceptingOrderId}
                rejectingOrderId={rejectingOrderId}
                completedToday={completedToday}
                flyingOrderId={flyingOrderId}
                printReceiptsEnabled={merchantFeatures.printReceiptsEnabled}
                onNavigateToArchive={() => setCurrentView("archive")}
                t={t}
                lang={lang}
                handleShiftAdd={handleShiftAdd}
                handleManualDigitAdd={handleManualDigitAdd}
                handleShiftConfigSave={handleShiftConfigSave}
                manualAddLoading={manualAddLoading}
                manualDigitInput={manualDigitInput}
                setManualDigitInput={setManualDigitInput}
                showShiftConfig={showShiftConfig}
                setShowShiftConfig={setShowShiftConfig}
                shiftConfigInput={shiftConfigInput}
                setShiftConfigInput={setShiftConfigInput}
                lastShiftNumber={lastShiftNumber}
                manualInputRef={manualInputRef}
                isApproved={isApproved}
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
              <AnalyticsView
                merchant={merchant}
                waitingPagers={waitingPagers}
                notifiedPagers={notifiedPagers}
                activeWhatsappOrders={activeWhatsappOrders}
                whatsappOrders={whatsappOrders}
                completedToday={completedToday}
                t={t}
                lang={lang}
              />
            )}

            {currentView === "customers" && (
              <CustomersView merchant={merchant} t={t} lang={lang} />
            )}

            {currentView === "coupons" && (
              <CouponsView merchant={merchant} t={t} lang={lang} />
            )}

            {currentView === "financial" && (
              <FinancialView merchant={merchant} t={t} lang={lang} />
            )}

            {currentView === "archive" && (
              <ArchiveView
                merchant={merchant}
                t={t}
                lang={lang}
                onViewReceipt={(orderId) => {
                  window.open(`/receipt/${orderId}?m=${merchant.uid}`, "_blank");
                }}
                onNavigateToActive={() => setCurrentView("overview")}
              />
            )}

            {currentView === "settings" && (
              <SettingsView
                merchant={merchant}
                onDownloadQR={handleDownloadQR}
                qrLoading={qrLoading}
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

    </div>
  );
}

function LiveClock({ lang, t }: { lang: string; t: (ar: string, en: string) => string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const arDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const enDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const arMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  const hours24 = now.getHours();
  const hours12 = hours24 % 12 || 12;
  const mins = String(now.getMinutes()).padStart(2, "0");
  const ampm = lang === "ar" ? (hours24 >= 12 ? "م" : "ص") : (hours24 >= 12 ? "PM" : "AM");
  const dayName = lang === "ar" ? arDays[now.getDay()] : enDays[now.getDay()];
  const dateStr = lang === "ar"
    ? `${dayName}، ${now.getDate()} ${arMonths[now.getMonth()]}`
    : `${dayName}, ${now.getDate()} ${now.toLocaleString("en", { month: "short" })}`;

  return (
    <div className="hidden md:flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.05]" data-testid="live-clock">
      <span className="text-[11px] font-bold text-white/80 font-mono tabular-nums tracking-tight" dir="ltr">
        {hours12}:{mins} <span className="text-[9px] text-white/40 font-normal">{ampm}</span>
      </span>
      <span className="w-px h-3 bg-white/[0.08]" />
      <span className="text-[10px] text-white/30">{dateStr}</span>
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
  storeOpen,
  onlineOrdersEnabled,
  onToggleOnlineOrders,
  isPending,
  onNotify,
  onComplete,
  onRemove,
  notifyLoading,
  whatsappOrders,
  activeWhatsappOrders,
  onAcceptWhatsAppOrder,
  onRejectWhatsAppOrder,
  onReadyWhatsAppOrder,
  onCompleteWhatsAppOrder,
  onUncollectedWhatsAppOrder,
  acceptingOrderId,
  rejectingOrderId,
  completedToday,
  flyingOrderId,
  printReceiptsEnabled,
  onNavigateToArchive,
  t,
  lang,
  handleShiftAdd,
  handleManualDigitAdd,
  handleShiftConfigSave,
  manualAddLoading,
  manualDigitInput,
  setManualDigitInput,
  showShiftConfig,
  setShowShiftConfig,
  shiftConfigInput,
  setShiftConfigInput,
  lastShiftNumber,
  manualInputRef,
  isApproved,
}: {
  merchant: any;
  waitingPagers: (Pager & { docId: string })[];
  notifiedPagers: (Pager & { docId: string })[];
  storeOpen: boolean;
  onlineOrdersEnabled: boolean;
  onToggleOnlineOrders: () => void;
  isPending: boolean;
  onNotify: (pager: Pager & { docId: string }) => void;
  onComplete: (pager: Pager & { docId: string }) => void;
  onRemove: (pager: Pager & { docId: string }) => void;
  notifyLoading: string | null;
  whatsappOrders: WhatsAppOrder[];
  activeWhatsappOrders: WhatsAppOrder[];
  onAcceptWhatsAppOrder: (order: WhatsAppOrder) => void;
  onRejectWhatsAppOrder: (order: WhatsAppOrder) => void;
  onReadyWhatsAppOrder: (order: WhatsAppOrder) => void;
  onCompleteWhatsAppOrder: (order: WhatsAppOrder) => void;
  onUncollectedWhatsAppOrder: (order: WhatsAppOrder) => void;
  acceptingOrderId: string | null;
  rejectingOrderId: string | null;
  completedToday: number;
  flyingOrderId: string | null;
  printReceiptsEnabled: boolean;
  onNavigateToArchive: () => void;
  t: (ar: string, en: string) => string;
  lang: string;
  handleShiftAdd: () => void;
  handleManualDigitAdd: () => void;
  handleShiftConfigSave: () => void;
  manualAddLoading: boolean;
  manualDigitInput: string;
  setManualDigitInput: (v: string) => void;
  showShiftConfig: boolean;
  setShowShiftConfig: (v: boolean) => void;
  shiftConfigInput: string;
  setShiftConfigInput: (v: string) => void;
  lastShiftNumber: number;
  manualInputRef: React.RefObject<HTMLInputElement>;
  isApproved: boolean;
}) {
  const [printOrder, setPrintOrder] = useState<WhatsAppOrder | null>(null);
  const [uncollectedConfirmOrder, setUncollectedConfirmOrder] = useState<WhatsAppOrder | null>(null);
  const [customerNoShowMap, setCustomerNoShowMap] = useState<Record<string, number>>({});
  const [customerOrderCounts, setCustomerOrderCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!merchant?.uid) return;
    fetch(`/api/customers/${merchant.uid}`)
      .then(r => r.json())
      .then(data => {
        const noShowMap: Record<string, number> = {};
        const orderCountMap: Record<string, number> = {};
        for (const c of data.customers || []) {
          if (c.noShowCount >= 2) noShowMap[c.phone] = c.noShowCount;
          orderCountMap[c.phone] = c.totalOrders || 0;
        }
        setCustomerNoShowMap(noShowMap);
        setCustomerOrderCounts(orderCountMap);
      })
      .catch(() => {});
  }, [merchant?.uid]);

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

  const diningTypeLabel = (dtype: string | undefined) => {
    if (dtype === "dine_in") return t("محلي", "Dine-in");
    if (dtype === "takeaway") return t("سفري", "Takeaway");
    if (dtype === "delivery") return t("المتجر يوصلك", "Delivery");
    return null;
  };

  const normalizePhone = (phone: string) => {
    return (phone || "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^0-9]/g, "");
  };

  const shareDeliveryWithDriver = (order: any) => {
    const orderNum = order.displayOrderId || order.orderNumber || order.id?.slice(0, 6);
    const storeName = merchant?.storeName || "Digital Pager";
    const safeTotal = Number.isFinite(Number(order.total)) ? Number(order.total).toFixed(2) : "0.00";
    const safeDeliveryFee = Number.isFinite(Number(order.deliveryFee)) ? Number(order.deliveryFee).toFixed(2) : null;

    const itemsList = (order.items || []).map((item: any, i: number) => {
      const qty = Number(item.quantity) || 1;
      const price = Number.isFinite(Number(item.price)) ? (Number(item.price) * qty).toFixed(2) : "0.00";
      return `${i + 1}. ${item.name} × ${qty} — ${price} SAR`;
    }).join("\n");

    const mapLink = order.deliveryMapLink
      || (order.deliveryLat != null && order.deliveryLng != null ? `https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}` : "");

    const locationLine = mapLink
      ? `📍 ${t("موقع التوصيل", "Delivery Location")}:\n${mapLink}`
      : "";

    const addressText = order.deliveryAddress
      ? `🏠 ${t("العنوان", "Address")}: ${order.deliveryAddress}`
      : "";

    const driverControlLink = `${window.location.origin}/driver-control/${order.id}?m=${merchant?.uid || ""}`;

    const msg = [
      `🚚 ${t("طلب توصيل جديد", "New Delivery Order")} - #${orderNum}`,
      ``,
      `👤 ${t("العميل", "Customer")}: ${order.customerName}`,
      `📞 ${t("الجوال", "Phone")}: ${order.customerPhone}`,
      `📲 ${t("اتصال مباشر", "Direct Call")}: tel:${order.customerPhone}`,
      ``,
      `📋 ${t("الطلب", "Order")}:`,
      itemsList,
      safeDeliveryFee ? `🚛 ${t("رسوم التوصيل", "Delivery Fee")}: ${safeDeliveryFee} SAR` : "",
      `💰 ${t("الإجمالي", "Total")}: ${safeTotal} SAR`,
      ``,
      addressText,
      locationLine,
      order.customerNotes ? `\n📝 ${t("ملاحظات", "Notes")}: ${order.customerNotes}` : "",
      ``,
      `🔗 ${t("رابط تأكيد التسليم (استخدمه عند باب العميل فقط)", "Delivery confirmation link (use at customer's door only)")}:`,
      driverControlLink,
      ``,
      `✅ ${t("تم الطلب عبر منصة", "Ordered via")} ${storeName}`,
    ].filter(Boolean).join("\n");

    const encoded = encodeURIComponent(msg);
    const savedDriver = normalizePhone(merchant?.driverPhone || "");
    if (savedDriver) {
      window.open(`https://wa.me/${savedDriver}?text=${encoded}`, "_blank");
    } else {
      toast({ title: t("مشاركة مع المندوب", "Share with Driver"), description: t("لم يتم تحديد رقم مندوب، سيتم فتح واتساب لاختيار جهة الاتصال", "No driver number set, opening WhatsApp to choose contact") });
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
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

  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "dine_in" | "takeaway" | "delivery" | "manual">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "preparing" | "ready">("all");

  type ActiveOrderItem = {
    type: "pager" | "pager-notified" | "wa" | "wa-new";
    id: string;
    orderNumber: string;
    displayOrderId: string;
    status: string;
    createdAt: any;
    pager?: Pager & { docId: string };
    order?: WhatsAppOrder;
    orderCategory: "dine_in" | "takeaway" | "delivery" | "manual";
  };

  const getOrderCategory = (item: { type: string; pager?: any; order?: any }): "dine_in" | "takeaway" | "delivery" | "manual" => {
    if (item.type === "pager" || item.type === "pager-notified") return "manual";
    const o = item.order;
    if (o?.diningType === "delivery") return "delivery";
    if (o?.diningType === "takeaway") return "takeaway";
    return "dine_in";
  };

  const allActiveOrdersRaw: ActiveOrderItem[] = [
    ...waitingPagers.map(p => ({ type: "pager" as const, id: p.docId, orderNumber: p.orderNumber, displayOrderId: p.displayOrderId || `#${p.orderNumber}`, status: p.status, createdAt: p.createdAt, pager: p, order: undefined, orderCategory: "manual" as const })),
    ...notifiedPagers.map(p => ({ type: "pager-notified" as const, id: p.docId, orderNumber: p.orderNumber, displayOrderId: p.displayOrderId || `#${p.orderNumber}`, status: "notified" as const, createdAt: p.createdAt, pager: p, order: undefined, orderCategory: "manual" as const })),
    ...activeWhatsappOrders.map(o => ({ type: "wa" as const, id: o.id, orderNumber: o.orderNumber || "?", displayOrderId: o.displayOrderId || (o.orderNumber ? `#${o.orderNumber}` : "?"), status: o.status, createdAt: o.createdAt, pager: undefined, order: o, orderCategory: getOrderCategory({ type: "wa", order: o }) })),
    ...whatsappOrders.map(o => ({ type: "wa-new" as const, id: o.id, orderNumber: "NEW", displayOrderId: "", status: "awaiting_confirmation" as const, createdAt: o.createdAt, pager: undefined, order: o, orderCategory: getOrderCategory({ type: "wa-new", order: o }) })),
  ].sort((a, b) => safeTime(a.createdAt) - safeTime(b.createdAt));

  const allActiveOrders = allActiveOrdersRaw.filter(item => {
    if (typeFilter !== "all" && item.orderCategory !== typeFilter) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "new" && item.status !== "awaiting_confirmation" && item.status !== "pending_verification") return false;
      if (statusFilter === "preparing" && item.status !== "preparing" && item.status !== "waiting") return false;
      if (statusFilter === "ready" && item.status !== "ready" && item.status !== "notified") return false;
    }
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.trim().toUpperCase();
      const did = item.displayOrderId?.toUpperCase() || "";
      const onum = item.orderNumber?.toUpperCase() || "";
      if (!did.includes(q) && !onum.includes(q) && !`#${onum}`.includes(q)) return false;
    }
    return true;
  });

  const totalActive = allActiveOrders.length;

  const statusColor = (status: string) => {
    if (status === "awaiting_confirmation" || status === "pending_verification") return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", label: t("طلب جديد", "New Order") };
    if (status === "preparing") return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: t("يُحضّر", "Preparing") };
    if (status === "ready") return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: t("جاهز", "Ready") };
    if (status === "notified") return { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", label: t("تم التنبيه", "Notified") };
    return { bg: "bg-white/5", text: "text-white/60", border: "border-white/10", label: t("في الانتظار", "Waiting") };
  };

  const typeBadgeConfig = (cat: "dine_in" | "takeaway" | "delivery" | "manual") => {
    if (cat === "dine_in") return { bg: "bg-sky-500/20", text: "text-sky-300", border: "border-sky-400/40", label: t("محلي", "Dine-in"), borderColor: "#3498db", tintFrom: "rgba(52,152,219,0.06)", icon: UtensilsCrossed, glowShadow: "0 0 8px rgba(52,152,219,0.3)" };
    if (cat === "takeaway") return { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-400/40", label: t("سفري", "Takeaway"), borderColor: "#f39c12", tintFrom: "rgba(243,156,18,0.06)", icon: ShoppingBag, glowShadow: "0 0 8px rgba(243,156,18,0.3)" };
    if (cat === "delivery") return { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-400/40", label: t("توصيل", "Delivery"), borderColor: "#2ecc71", tintFrom: "rgba(46,204,113,0.06)", icon: Truck, glowShadow: "0 0 8px rgba(46,204,113,0.3)" };
    return { bg: "bg-violet-500/20", text: "text-violet-300", border: "border-violet-400/40", label: t("يدوي", "Manual"), borderColor: "#9b59b6", tintFrom: "rgba(155,89,182,0.06)", icon: Pencil, glowShadow: "0 0 8px rgba(155,89,182,0.3)" };
  };

  const TypeBadge = ({ category }: { category: "dine_in" | "takeaway" | "delivery" | "manual" }) => {
    const cfg = typeBadgeConfig(category);
    const Icon = cfg.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.text} border ${cfg.border}`}
        style={{ boxShadow: cfg.glowShadow }}
        data-testid={`badge-type-${category}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>
    );
  };

  const WatermarkIcon = ({ category }: { category: "dine_in" | "takeaway" | "delivery" | "manual" }) => {
    const cfg = typeBadgeConfig(category);
    const Icon = cfg.icon;
    return (
      <div className="absolute end-3 bottom-3 pointer-events-none opacity-[0.04]" aria-hidden="true">
        <Icon className="w-24 h-24" style={{ color: cfg.borderColor }} />
      </div>
    );
  };

  const cardStyle = (cat: "dine_in" | "takeaway" | "delivery" | "manual") => {
    const cfg = typeBadgeConfig(cat);
    return {
      borderInlineStart: `6px solid ${cfg.borderColor}`,
      background: `linear-gradient(135deg, ${cfg.tintFrom} 0%, ${cat === "manual" ? "#0a0a0a" : "#111111"} 40%)`,
    };
  };

  const typeFilterChips: { key: "all" | "dine_in" | "takeaway" | "delivery" | "manual"; label: string; icon?: any }[] = [
    { key: "all", label: t("الكل", "All") },
    { key: "dine_in", label: t("محلي", "Dine-in"), icon: UtensilsCrossed },
    { key: "takeaway", label: t("سفري", "Takeaway"), icon: ShoppingBag },
    { key: "delivery", label: t("توصيل", "Delivery"), icon: Truck },
    { key: "manual", label: t("يدوي", "Manual"), icon: Pencil },
  ];

  const statusFilterChips: { key: "all" | "new" | "preparing" | "ready"; label: string }[] = [
    { key: "all", label: t("الكل", "All") },
    { key: "new", label: t("جديد", "New") },
    { key: "preparing", label: t("قيد التحضير", "Preparing") },
    { key: "ready", label: t("جاهز", "Ready") },
  ];

  return (
    <div className="flex flex-col h-full min-h-[calc(100dvh-3.5rem)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white" data-testid="text-overview-title">
            {t("إدارة الطلبات", "Order Management")}
          </h2>
          {totalActive > 0 && (
            <Badge className="rounded-full text-[11px] px-2 py-0.5 bg-white/[0.06] text-white/60 border-white/10" data-testid="badge-active-count">
              {totalActive} {t("نشط", "active")}
            </Badge>
          )}
        </div>
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

      <div className="flex-1 rounded-2xl bg-[#0d0d0d] border border-white/[0.06] p-4 relative" data-testid="workspace-active-orders">
        <div className="sticky top-0 z-10 bg-[#0d0d0d] pb-3 -mt-1 pt-1 space-y-3" data-testid="filter-bar">

          <div className="flex items-center gap-2 pb-2.5 border-b border-white/[0.04]" data-testid="quick-add-bar">
            <Button
              onClick={handleShiftAdd}
              disabled={manualAddLoading}
              className="h-9 px-3.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl active:scale-[0.96] transition-all shrink-0"
              data-testid="button-shift-add"
            >
              {manualAddLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5" /> : <Plus className="w-3.5 h-3.5 me-1.5" />}
              {t("توليد رقم تلقائي", "Auto Generate")}
            </Button>

            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                ref={manualInputRef}
                type="text"
                inputMode="numeric"
                maxLength={3}
                placeholder="123"
                value={manualDigitInput}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); setManualDigitInput(v); }}
                onKeyDown={(e) => { if (e.key === "Enter" && manualDigitInput.trim()) handleManualDigitAdd(); }}
                className="h-9 w-[62px] text-center text-sm font-bold border-white/10 bg-white/[0.04] rounded-xl font-mono"
                dir="ltr"
                data-testid="input-manual-3digit"
              />
              <Button
                onClick={handleManualDigitAdd}
                disabled={manualAddLoading || !manualDigitInput.trim()}
                size="sm"
                className="h-9 w-9 p-0 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-xl shrink-0"
                data-testid="button-manual-3digit-add"
              >
                {manualAddLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {showShiftConfig ? (
              <div className="flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-150">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={t("بداية", "Start")}
                  value={shiftConfigInput}
                  onChange={(e) => setShiftConfigInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => { if (e.key === "Enter" && shiftConfigInput.trim()) handleShiftConfigSave(); }}
                  className="h-9 w-[62px] text-center text-xs font-bold border-white/10 bg-white/[0.04] rounded-xl"
                  dir="ltr"
                  autoFocus
                  data-testid="input-shift-config"
                />
                <Button onClick={handleShiftConfigSave} disabled={!shiftConfigInput.trim()} size="sm" className="h-9 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl" data-testid="button-shift-config-save">
                  {t("حفظ", "Save")}
                </Button>
                <Button onClick={() => setShowShiftConfig(false)} size="sm" variant="ghost" className="h-9 w-9 p-0 text-white/30 hover:text-white/60 rounded-xl" data-testid="button-shift-config-cancel">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 ms-auto">
                {lastShiftNumber > 0 && (
                  <span className="text-[10px] text-white/20 font-mono hidden sm:inline" data-testid="text-shift-counter">#{lastShiftNumber}→{lastShiftNumber + 1}</span>
                )}
                <Button
                  onClick={() => { setShiftConfigInput(String(lastShiftNumber)); setShowShiftConfig(true); }}
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-white/20 hover:text-white/60 rounded-xl"
                  title={t("إعداد الوردية", "Shift Setup")}
                  data-testid="button-shift-config-open"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/30"
                data-testid="tab-active-orders"
              >
                {t("الطلبات النشطة", "Active Orders")}
                {allActiveOrders.length > 0 && (
                  <span className="relative flex h-2 w-2 ms-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>
              <button
                onClick={onNavigateToArchive}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white/40 border border-white/[0.06] hover:text-white/60 hover:border-white/[0.12] transition-all"
                data-testid="tab-archive-orders"
              >
                <FolderArchive className="w-3 h-3" />
                {t("الأرشيف", "Archive")}
              </button>
            </div>
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              <Input
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder={t("بحث برقم الطلب...", "Search by order number...")}
                className="h-8 w-40 sm:w-48 ps-8 text-xs bg-white/[0.04] border-white/10 rounded-lg placeholder:text-white/20"
                dir="ltr"
                data-testid="input-order-search"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 me-1">
              <Filter className="w-3 h-3 text-white/30" />
              <span className="text-[10px] text-white/30 font-medium">{t("النوع", "Type")}</span>
            </div>
            {typeFilterChips.map(chip => {
              const isActive = typeFilter === chip.key;
              const ChipIcon = chip.icon;
              return (
                <button
                  key={chip.key}
                  onClick={() => setTypeFilter(chip.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${isActive ? "bg-white/[0.12] text-white border border-white/20 shadow-sm" : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60"}`}
                  data-testid={`filter-type-${chip.key}`}
                >
                  {ChipIcon && <ChipIcon className="w-3 h-3" />}
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 me-1">
              <Clock className="w-3 h-3 text-white/30" />
              <span className="text-[10px] text-white/30 font-medium">{t("الحالة", "Status")}</span>
            </div>
            {statusFilterChips.map(chip => {
              const isActive = statusFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setStatusFilter(chip.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${isActive ? "bg-white/[0.12] text-white border border-white/20 shadow-sm" : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60"}`}
                  data-testid={`filter-status-${chip.key}`}
                >
                  {chip.label}
                </button>
              );
            })}
            {(typeFilter !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => { setTypeFilter("all"); setStatusFilter("all"); }}
                className="px-2 py-1 rounded-lg text-[10px] font-medium text-red-400/60 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all"
                data-testid="filter-clear-all"
              >
                {t("مسح الفلاتر", "Clear")}
              </button>
            )}
          </div>
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
                    className={`relative rounded-2xl overflow-hidden transition-all duration-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,0,0,0.08)] ${isFlying ? "opacity-0 -translate-y-20 scale-75" : ""}`}
                    style={cardStyle(item.orderCategory)}
                    data-testid={`card-wa-order-${item.id}`}
                  >
                    <WatermarkIcon category={item.orderCategory} />
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-red-400" />
                        <span className="text-xl font-extrabold text-white tracking-tight" data-testid={`text-order-num-${item.id}`}>
                          {order.displayOrderId || (order.orderNumber ? `#${order.orderNumber}` : t("جديد", "NEW"))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TypeBadge category={item.orderCategory} />
                        <Badge className={`rounded-full text-[10px] px-2 py-0.5 ${sc.bg} ${sc.text} border ${sc.border}`}>
                          {sc.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-[11px] text-white/40">
                          <Clock className="w-3 h-3" />
                          <TimeElapsed createdAt={item.createdAt} lang={lang} />
                        </div>
                      </div>
                    </div>

                    <CardContent className="px-4 pb-4 pt-0 space-y-3 relative z-[1]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-white/50 flex-wrap min-w-0 flex-1">
                          <span className="font-semibold text-white/55" data-testid={`text-customer-name-${item.id}`}>{order.customerName}</span>
                          <span className="text-white/20">|</span>
                          <span className="font-mono text-white/50" dir="ltr" data-testid={`text-customer-phone-${item.id}`}>{order.customerPhone}</span>
                          {(() => {
                            const cnt = customerOrderCounts[order.customerPhone] || 0;
                            return cnt <= 1 ? (
                              <Badge className="rounded-full text-[9px] px-1.5 py-0 bg-violet-500/15 text-violet-400 border-violet-500/20" data-testid={`badge-new-customer-${item.id}`}>
                                <Sparkles className="w-2.5 h-2.5 me-0.5" />{t("جديد", "New")}
                              </Badge>
                            ) : (
                              <Badge className="rounded-full text-[9px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/20" data-testid={`badge-loyal-customer-${item.id}`}>
                                <UserCheck className="w-2.5 h-2.5 me-0.5" />{t("عميل مخلص", "Loyal")}
                              </Badge>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ms-2">
                          <button
                            onClick={() => {
                              const phone = order.customerPhone.replace(/[^0-9]/g, "");
                              window.open(`https://wa.me/${phone}`, "_blank");
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-600/15 hover:bg-green-600/25 text-green-400 transition-colors"
                            data-testid={`button-whatsapp-${item.id}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => window.open(`tel:${order.customerPhone}`, "_self")}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 transition-colors"
                            data-testid={`button-call-${item.id}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

                      {order.diningType === "delivery" && (order.deliveryMapLink || order.deliveryLat != null) && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20" data-testid={`text-delivery-address-${item.id}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                            <p className="text-[11px] text-emerald-300 font-bold">{t("موقع التوصيل", "Delivery Location")}</p>
                          </div>
                          {order.deliveryAddress && <p className="text-xs text-white/80 leading-relaxed mb-1">{order.deliveryAddress}</p>}
                          <a href={order.deliveryMapLink || `https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-500/35 transition-colors text-[11px] text-emerald-300 hover:text-emerald-200 font-bold border border-emerald-500/30 animate-[mapsPulse_2s_ease-in-out_infinite]" data-testid={`link-maps-${item.id}`}>
                            <Navigation className="w-3 h-3" />
                            {t("فتح الموقع في خرائط قوقل 📍", "Open Location in Google Maps 📍")}
                          </a>
                        </div>
                      )}

                      {order.customerNotes && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20" data-testid={`text-customer-notes-${item.id}`}>
                          <p className="text-[11px] text-amber-300 font-bold mb-0.5">{t("ملاحظة العميل", "Customer Note")}</p>
                          <p className="text-xs text-white/80 leading-relaxed">{order.customerNotes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Banknote className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[11px] text-amber-400 font-medium">{paymentLabel(order.paymentMethod)}</span>
                          {diningTypeLabel(order.diningType) && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.diningType === "takeaway" ? "bg-orange-500/15 text-orange-400 border border-orange-500/20" : order.diningType === "delivery" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-sky-500/15 text-sky-400 border border-sky-500/20"}`} data-testid={`badge-dining-type-${item.id}`}>
                              {diningTypeLabel(order.diningType)}
                            </span>
                          )}
                        </div>
                        <p className="text-base font-extrabold text-white" data-testid={`text-order-total-${item.id}`}>
                          {order.total.toFixed(0)} <span className="text-xs text-white/40">SAR</span>
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <Button
                          onClick={() => onRejectWhatsAppOrder(order)}
                          disabled={rejectingOrderId === order.id || acceptingOrderId === order.id}
                          className="w-full h-9 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20"
                          data-testid={`button-reject-order-${item.id}`}
                        >
                          {rejectingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                            <><X className="w-3.5 h-3.5 me-1" />{t("رفض", "Reject")}</>
                          )}
                        </Button>
                        <Button
                          onClick={() => onAcceptWhatsAppOrder(order)}
                          disabled={acceptingOrderId === order.id || rejectingOrderId === order.id}
                          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20"
                          data-testid={`button-accept-order-${item.id}`}
                        >
                          {acceptingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <><CheckCircle className="w-4 h-4 me-1.5" />{t("قبول ✅", "Accept ✅")}</>
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
                    className={`relative rounded-2xl overflow-hidden transition-all duration-500 border border-white/[0.08] ${isFlying ? "opacity-0 -translate-y-20 scale-75" : ""}`}
                    style={cardStyle("manual")}
                    data-testid={`card-${isNotified ? "notified" : "waiting"}-${item.id}`}
                  >
                    <WatermarkIcon category="manual" />
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-white/40" />
                        <span className={`text-xl font-extrabold tracking-tight ${isNotified ? "text-emerald-400" : "text-white"}`} data-testid={`text-order-num-${item.id}`}>
                          {pager.displayOrderId || `#${item.orderNumber}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TypeBadge category="manual" />
                        <Badge className={`rounded-full text-[10px] px-2 py-0.5 ${sc.bg} ${sc.text} border ${sc.border}`}>
                          {isNotified ? t("تم التنبيه", "Notified") : t("في الانتظار", "Waiting")}
                        </Badge>
                        <div className="flex items-center gap-1 text-[11px] text-white/40">
                          <Clock className="w-3 h-3" />
                          <TimeElapsed createdAt={item.createdAt} lang={lang} />
                        </div>
                      </div>
                    </div>

                    <CardContent className="px-4 pb-4 pt-0 space-y-3 relative z-[1]">

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
                  className={`relative rounded-2xl overflow-hidden transition-all duration-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,0,0,0.08)] ${isFlying ? "opacity-0 -translate-y-20 scale-75" : ""}`}
                  style={cardStyle(item.orderCategory)}
                  data-testid={`card-active-order-${item.id}`}
                >
                  <WatermarkIcon category={item.orderCategory} />
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-red-400" />
                      <span className="text-xl font-extrabold text-white tracking-tight" data-testid={`text-order-num-${item.id}`}>
                        {waOrder.displayOrderId || `#${item.orderNumber}`}
                      </span>
                      {customerNoShowMap[waOrder.customerPhone] && (
                        <Badge className="rounded-full text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-0.5" data-testid={`badge-noshow-${item.id}`}>
                          <ShieldAlert className="w-3 h-3" />
                          {t("عميل غير ملتزم", "Unreliable")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <TypeBadge category={item.orderCategory} />
                      <Badge className={`rounded-full text-[10px] px-2 py-0.5 ${sc.bg} ${sc.text} border ${sc.border}`}>
                        {sc.label}
                      </Badge>
                      <div className="flex items-center gap-1 text-[11px] text-white/40">
                        <Clock className="w-3 h-3" />
                        <TimeElapsed createdAt={item.createdAt} lang={lang} />
                      </div>
                    </div>
                  </div>

                  <CardContent className="px-4 pb-4 pt-0 space-y-3 relative z-[1]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-white/50 flex-wrap min-w-0 flex-1">
                        <span className="font-semibold text-white/55">{waOrder.customerName}</span>
                        <span className="text-white/20">|</span>
                        <span className="font-mono text-white/50" dir="ltr">{waOrder.customerPhone}</span>
                        {(() => {
                          const cnt = customerOrderCounts[waOrder.customerPhone] || 0;
                          return cnt <= 1 ? (
                            <Badge className="rounded-full text-[9px] px-1.5 py-0 bg-violet-500/15 text-violet-400 border-violet-500/20" data-testid={`badge-new-active-${item.id}`}>
                              <Sparkles className="w-2.5 h-2.5 me-0.5" />{t("جديد", "New")}
                            </Badge>
                          ) : (
                            <Badge className="rounded-full text-[9px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/20" data-testid={`badge-loyal-active-${item.id}`}>
                              <UserCheck className="w-2.5 h-2.5 me-0.5" />{t("عميل مخلص", "Loyal")}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ms-2">
                        <button
                          onClick={() => {
                            const phone = waOrder.customerPhone.replace(/[^0-9]/g, "");
                            window.open(`https://wa.me/${phone}`, "_blank");
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-600/15 hover:bg-green-600/25 text-green-400 transition-colors"
                          data-testid={`button-whatsapp-active-${item.id}`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => window.open(`tel:${waOrder.customerPhone}`, "_self")}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 transition-colors"
                          data-testid={`button-call-active-${item.id}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

                    {waOrder.diningType === "delivery" && (waOrder.deliveryMapLink || waOrder.deliveryLat != null) && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20" data-testid={`text-delivery-address-${item.id}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <p className="text-[11px] text-emerald-300 font-bold">{t("موقع التوصيل", "Delivery Location")}</p>
                        </div>
                        {waOrder.deliveryAddress && <p className="text-xs text-white/80 leading-relaxed mb-1">{waOrder.deliveryAddress}</p>}
                        <a href={waOrder.deliveryMapLink || `https://www.google.com/maps?q=${waOrder.deliveryLat},${waOrder.deliveryLng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-500/35 transition-colors text-[11px] text-emerald-300 hover:text-emerald-200 font-bold border border-emerald-500/30 animate-[mapsPulse_2s_ease-in-out_infinite]" data-testid={`link-maps-${item.id}`}>
                            <Navigation className="w-3 h-3" />
                            {t("فتح الموقع في خرائط قوقل 📍", "Open Location in Google Maps 📍")}
                          </a>
                      </div>
                    )}

                    {waOrder.customerNotes && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20" data-testid={`text-customer-notes-${item.id}`}>
                        <p className="text-[11px] text-amber-300 font-bold mb-0.5">{t("ملاحظة العميل", "Customer Note")}</p>
                        <p className="text-xs text-white/80 leading-relaxed">{waOrder.customerNotes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Banknote className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] text-amber-400 font-medium">{paymentLabel(waOrder.paymentMethod)}</span>
                        {diningTypeLabel(waOrder.diningType) && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${waOrder.diningType === "takeaway" ? "bg-orange-500/15 text-orange-400 border border-orange-500/20" : waOrder.diningType === "delivery" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-sky-500/15 text-sky-400 border border-sky-500/20"}`} data-testid={`badge-dining-type-${item.id}`}>
                            {diningTypeLabel(waOrder.diningType)}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-extrabold text-white" data-testid={`text-order-total-${item.id}`}>
                        {waOrder.total.toFixed(0)} <span className="text-xs text-white/40">SAR</span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {printReceiptsEnabled && (
                      <Button
                        size="sm"
                        onClick={() => handlePrint(waOrder)}
                        className="h-9 px-3 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 rounded-xl border border-white/10"
                        data-testid={`button-print-${item.id}`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                      )}
                      {waOrder.diningType === "delivery" && (
                        <Button
                          size="sm"
                          onClick={() => shareDeliveryWithDriver(waOrder)}
                          className="h-9 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 gap-1"
                          data-testid={`button-share-driver-${item.id}`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span className="text-[10px]">{t("المندوب 🟢", "Driver 🟢")}</span>
                        </Button>
                      )}
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
                        <>
                          <Button
                            onClick={() => onCompleteWhatsAppOrder(waOrder)}
                            className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                            data-testid={`button-complete-wa-order-${item.id}`}
                          >
                            <CheckCircle className="w-3.5 h-3.5 me-1" />{t("تم الاستلام", "Collected")}
                          </Button>
                          <Button
                            onClick={() => setUncollectedConfirmOrder(waOrder)}
                            className="h-9 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl border border-red-500/20"
                            data-testid={`button-uncollected-wa-order-${item.id}`}
                          >
                            <UserX className="w-3.5 h-3.5 me-1" />{t("لم يحضر", "No-Show")}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </div>

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
          {printOrder.deliveryFee && printOrder.deliveryFee > 0 && (
            <div className="receipt-payment">{t("رسوم التوصيل", "Delivery Fee")}: {printOrder.deliveryFee.toFixed(2)} SAR</div>
          )}
          <div className="receipt-total">{t("الإجمالي", "Total")}: {printOrder.total.toFixed(2)} SAR</div>
          <div className="receipt-payment">{paymentLabel(printOrder.paymentMethod)}</div>
          {diningTypeLabel(printOrder.diningType) && (
            <div className="receipt-payment">{t("نوع الطلب", "Order Type")}: {diningTypeLabel(printOrder.diningType)}</div>
          )}
          {printOrder.diningType === "delivery" && (printOrder.deliveryMapLink || printOrder.deliveryAddress) && (
            <div className="receipt-customer-notes">
              <div className="receipt-customer-notes-label">{t("موقع التوصيل", "Delivery Location")}</div>
              <div className="receipt-customer-notes-text">
                {printOrder.deliveryAddress && <div>{printOrder.deliveryAddress}</div>}
                {printOrder.deliveryMapLink && <div style={{fontSize: "12px", wordBreak: "break-all"}}>{printOrder.deliveryMapLink}</div>}
              </div>
            </div>
          )}
          {printOrder.customerNotes && (
            <div className="receipt-customer-notes">
              <div className="receipt-customer-notes-label">{t("ملاحظة العميل", "Customer Note")}</div>
              <div className="receipt-customer-notes-text">{printOrder.customerNotes}</div>
            </div>
          )}
          <div className="receipt-footer">{t("شكراً لطلبكم", "Thank you for your order")}</div>
        </div>
      )}

      <Dialog open={!!uncollectedConfirmOrder} onOpenChange={(open) => !open && setUncollectedConfirmOrder(null)}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-sm" data-testid="dialog-uncollected-confirm">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {t("تأكيد عدم الحضور", "Confirm No-Show")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-white/70">
              {t(
                `هل أنت متأكد أن العميل "${uncollectedConfirmOrder?.customerName}" لم يحضر لاستلام الطلب #${uncollectedConfirmOrder?.orderNumber}؟`,
                `Are you sure customer "${uncollectedConfirmOrder?.customerName}" did not show up for order #${uncollectedConfirmOrder?.orderNumber}?`
              )}
            </p>
            <p className="text-xs text-red-400/70">
              {t("سيتم تسجيل هذا كعدم حضور في سجل العميل", "This will be recorded as a no-show on the customer's record")}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => setUncollectedConfirmOrder(null)}
              className="flex-1 h-10 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-xl border border-white/10"
              data-testid="button-cancel-uncollected"
            >
              {t("إلغاء", "Cancel")}
            </Button>
            <Button
              onClick={() => {
                if (uncollectedConfirmOrder) {
                  onUncollectedWhatsAppOrder(uncollectedConfirmOrder);
                  setUncollectedConfirmOrder(null);
                }
              }}
              className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              data-testid="button-confirm-uncollected"
            >
              <UserX className="w-4 h-4 me-1" />
              {t("تأكيد عدم الحضور", "Confirm No-Show")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
  const [productCategory, setProductCategory] = useState("");
  const [productCategoryOpen, setProductCategoryOpen] = useState(false);
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
      console.log("[Products] Fetching products for uid:", uid);
      const productsRef = collection(db, "merchants", uid, "products");
      const snap = await getDocs(productsRef);
      const prods: Product[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Product));
      prods.sort((a: any, b: any) => ((b as any).createdAt || "").localeCompare((a as any).createdAt || ""));
      console.log("[Products] Loaded", prods.length, "products from Firestore");
      setProducts(prods);
    } catch (err: any) {
      console.error("[Products] fetchProducts error:", err.code, err.message);
    } finally {
      setProductsLoading(false);
    }
  }

  function openAddDialog() {
    setEditingProduct(null);
    setProductName("");
    setProductPrice("");
    setProductDescription("");
    setProductCategory("");
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
    setProductCategory(product.category || "");
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
    if (!productName.trim() || !productPrice.trim() || !productCategory.trim()) return;
    setSavingProduct(true);
    try {
      let imageUrl = productImagePreview || "";

      if (productImage) {
        console.log("[Products] Uploading product image...");
        const formData = new FormData();
        formData.append("image", productImage);
        try {
          const uploadRes = await fetch("/api/upload-image", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.url || imageUrl;
            console.log("[Products] Image uploaded:", imageUrl);
          }
        } catch (uploadErr) {
          console.warn("[Products] Image upload failed, continuing without image:", uploadErr);
        }
      }

      const cleanVariants = productVariants.filter(v => v.name.trim());
      const cleanAddons = productAddons.filter(a => a.name.trim());

      const productData: Record<string, any> = {
        merchantId: uid,
        name: productName.trim(),
        price: parseFloat(productPrice) || 0,
        category: productCategory.trim(),
        description: productDescription.trim(),
        imageUrl,
        visible: true,
        variants: cleanVariants,
        addons: cleanAddons,
      };

      if (editingProduct) {
        console.log("[Products] Updating product in Firestore:", editingProduct.id);
        await updateDoc(doc(db, "merchants", uid!, "products", editingProduct.id), productData);
        console.log("[Products] Product updated successfully");
      } else {
        productData.createdAt = new Date().toISOString();
        console.log("[Products] Creating new product in Firestore...");
        const newRef = await addDoc(collection(db, "merchants", uid!, "products"), productData);
        console.log("[Products] Product created:", newRef.id);
      }

      toast({ title: t("تم الحفظ", "Saved"), description: t("تم حفظ المنتج بنجاح", "Product saved successfully") });
      setShowProductDialog(false);
      fetchProducts();
    } catch (err: any) {
      console.error("[Products] handleSaveProduct error:", err.code, err.message);
      toast({ title: t("خطأ", "Error"), description: t("فشل حفظ المنتج", "Failed to save product"), variant: "destructive" });
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct(productId: string) {
    setDeletingProduct(productId);
    try {
      console.log("[Products] Deleting product:", productId);
      await deleteDoc(doc(db, "merchants", uid!, "products", productId));
      toast({ title: t("تم الحذف", "Deleted"), description: t("تم حذف المنتج", "Product deleted") });
      fetchProducts();
    } catch (err: any) {
      console.error("[Products] handleDeleteProduct error:", err.code, err.message);
      toast({ title: t("خطأ", "Error"), description: t("فشل حذف المنتج", "Failed to delete product"), variant: "destructive" });
    } finally {
      setDeletingProduct(null);
    }
  }

  async function handleToggleVisibility(product: Product) {
    setTogglingVisibility(product.id);
    try {
      await updateDoc(doc(db, "merchants", uid!, "products", product.id), { visible: !product.visible });
      fetchProducts();
    } catch (err: any) {
      console.error("[Products] handleToggleVisibility error:", err.code, err.message);
    } finally {
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
                      {product.category && <Badge variant="outline" className="text-[10px] border-red-500/20 text-red-400/70 rounded-2xl px-1.5 py-0">{product.category}</Badge>}
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
            <div className="relative">
              <label className="text-xs text-muted-foreground mb-1.5 block">
                {t("الفئة", "Category")} <span className="text-red-500">*</span>
              </label>
              <Input
                value={productCategory}
                onChange={(e) => { setProductCategory(e.target.value); setProductCategoryOpen(true); }}
                onFocus={() => setProductCategoryOpen(true)}
                onBlur={() => setTimeout(() => setProductCategoryOpen(false), 150)}
                placeholder={t("مثال: مشروبات، وجبات رئيسية...", "e.g. Drinks, Main Meals...")}
                className="bg-black/40 border-white/10 text-white placeholder:text-white/20"
                dir="rtl"
                data-testid="input-product-category"
              />
              {productCategoryOpen && (() => {
                const existingCats = Array.from(new Set(
                  products.map(p => p.category).filter((c): c is string => !!c && c.trim() !== "")
                ));
                const filtered = existingCats.filter(c =>
                  c.toLowerCase().includes(productCategory.toLowerCase())
                );
                const showCreate = productCategory.trim() !== "" && !existingCats.some(c => c.toLowerCase() === productCategory.trim().toLowerCase());
                if (filtered.length === 0 && !showCreate) return null;
                return (
                  <div className="absolute z-50 top-full mt-1 w-full rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl overflow-hidden">
                    {filtered.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onMouseDown={() => { setProductCategory(cat); setProductCategoryOpen(false); }}
                        className="w-full text-start px-3 py-2 text-sm text-white hover:bg-white/[0.06] transition-colors"
                        data-testid={`category-option-${cat}`}
                      >
                        {cat}
                      </button>
                    ))}
                    {showCreate && (
                      <button
                        type="button"
                        onMouseDown={() => { setProductCategoryOpen(false); }}
                        className="w-full text-start px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors border-t border-white/[0.06] flex items-center gap-2"
                        data-testid="category-create-new"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t("إنشاء:", "Create:")} <span className="font-semibold">{productCategory.trim()}</span>
                      </button>
                    )}
                  </div>
                );
              })()}
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
            <Button onClick={handleSaveProduct} disabled={!productName.trim() || !productPrice.trim() || !productCategory.trim() || savingProduct} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl" data-testid="button-save-product">
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
  waitingPagers,
  notifiedPagers,
  activeWhatsappOrders,
  whatsappOrders,
  completedToday,
  t,
  lang,
}: {
  merchant: any;
  waitingPagers: (Pager & { docId: string })[];
  notifiedPagers: (Pager & { docId: string })[];
  activeWhatsappOrders: WhatsAppOrder[];
  whatsappOrders: WhatsAppOrder[];
  completedToday: number;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (!merchant?.uid) return;
    const fetchAnalytics = () => {
      fetch(`/api/merchant-analytics/${merchant.uid}`, {
        headers: { "x-merchant-email": merchant.email || "" },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setAnalyticsData(d); setAnalyticsLoading(false); })
        .catch(() => { setAnalyticsLoading(false); });
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, [merchant?.uid]);

  const totalActive = waitingPagers.length + notifiedPagers.length + activeWhatsappOrders.length + whatsappOrders.length;
  const avgWait = (() => {
    const all = [...waitingPagers, ...notifiedPagers];
    if (all.length === 0) return "0m";
    const total = all.reduce((sum, p) => { const t = new Date(p.createdAt).getTime(); return sum + Math.max(0, Date.now() - (isNaN(t) ? Date.now() : t)); }, 0);
    const avg = Math.floor(total / all.length / 60000);
    return avg < 1 ? "<1m" : `${avg}m`;
  })();

  const operationalStats = [
    { icon: ScanLine, value: merchant.qrScans ?? 0, label: t("المسح اليومي", "Daily Scans"), color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/15" },
    { icon: Activity, value: totalActive, label: t("طلبات نشطة", "Active Orders"), color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/15" },
    { icon: CheckCircle, value: completedToday, label: t("مكتمل اليوم", "Done Today"), color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
    { icon: Timer, value: avgWait, label: t("متوسط الانتظار", "Avg. Wait"), color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/15" },
  ];

  const marketingStats = [
    { icon: QrCode, value: merchant.qrScans ?? 0, label: t("زوار QR", "QR Visitors"), color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/15" },
    { icon: Share2, value: merchant.sharesCount ?? 0, label: t("المشاركات", "Shares"), color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/15" },
    { icon: MapPin, value: merchant.googleMapsClicks ?? 0, label: t("نقرات خرائط", "Maps Clicks"), color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
    { icon: Bell, value: merchant.notificationsCount ?? 0, label: t("تم تنبيههم", "Notifications Sent"), color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/15" },
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
          {t("إحصائيات التشغيل والتسويق وأداء الطلبات", "Operations, marketing, and order performance statistics")}
        </p>
      </div>

      {analyticsLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-white/30" />
        </div>
      ) : (
        <>
          {analyticsData && (
            <>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">{t("ملخص اليوم", "Today's Summary")}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="metrics-grid">
                  <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-[11px] text-white/40 uppercase tracking-wider">{t("إيراد اليوم", "Today Revenue")}</span>
                    </div>
                    <p className="text-2xl font-bold text-white" data-testid="text-revenue-today">
                      {analyticsData.totalRevenueToday?.toLocaleString() || 0} <span className="text-xs text-white/40">SAR</span>
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
                        <Package className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-[11px] text-white/40 uppercase tracking-wider">{t("طلبات اليوم", "Total Orders")}</span>
                    </div>
                    <p className="text-2xl font-bold text-white" data-testid="text-total-orders-today">{analyticsData.totalOrdersToday}</p>
                  </div>
                  <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-violet-400" />
                      </div>
                      <span className="text-[11px] text-white/40 uppercase tracking-wider">{t("عملاء جدد", "New Customers")}</span>
                    </div>
                    <p className="text-2xl font-bold text-white" data-testid="text-new-customers-today">{analyticsData.newCustomersToday}</p>
                  </div>
                  <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                        <Timer className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-[11px] text-white/40 uppercase tracking-wider">{t("متوسط التحضير", "Avg Prep Time")}</span>
                    </div>
                    <p className="text-2xl font-bold text-white" data-testid="text-avg-prep-time">
                      {analyticsData.avgPrepTime > 0 ? `${Math.floor(analyticsData.avgPrepTime / 60)}:${String(analyticsData.avgPrepTime % 60).padStart(2, "0")}` : "—"}
                      {analyticsData.avgPrepTime > 0 && <span className="text-xs text-white/40 ms-1">{t("دقيقة", "min")}</span>}
                    </p>
                  </div>
                </div>
              </div>

              {(analyticsData.orderSources?.length > 0 || analyticsData.totalRevenueToday > 0 || analyticsData.lostRevenueToday > 0) && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">{t("الرسوم البيانية", "Charts")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(analyticsData.totalRevenueToday > 0 || analyticsData.lostRevenueToday > 0) && (
                      <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4" data-testid="chart-revenue-loss">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-3">{t("الإيرادات مقابل الخسائر", "Revenue vs Loss")}</h4>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={[
                            { name: lang === "ar" ? "إيرادات" : "Revenue", value: analyticsData.totalRevenueToday || 0 },
                            { name: lang === "ar" ? "خسائر" : "Lost", value: analyticsData.lostRevenueToday || 0 },
                          ]}>
                            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                            <YAxis hide />
                            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              <Cell fill="#10b981" />
                              <Cell fill="#ef4444" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {analyticsData.orderSources?.length > 0 && (
                      <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4" data-testid="chart-order-sources">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-3">{t("مصادر الطلبات", "Top Order Sources")}</h4>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={analyticsData.orderSources.slice(0, 5)} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="source" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} width={70} />
                            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                              {(analyticsData.orderSources || []).slice(0, 5).map((_: any, i: number) => (
                                <Cell key={i} fill={["#ef4444", "#8b5cf6", "#3b82f6", "#f59e0b", "#10b981"][i % 5]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">{t("إحصائيات التشغيل", "Operations")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {operationalStats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Card key={`op-${i}`} className="border-white/[0.06] bg-[#111] rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-xl font-bold leading-tight" data-testid={`text-op-stat-${i}`}>{stat.value}</p>
                          <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">{t("إحصائيات التسويق", "Marketing")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {marketingStats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Card key={`mk-${i}`} className="border-white/[0.06] bg-[#111] rounded-2xl">
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
        </>
      )}
    </div>
  );
}

interface CustomerData {
  name: string;
  phone: string;
  totalOrders: number;
  lastOrderDate: string;
  noShowCount?: number;
}

function CustomersView({
  merchant,
  t,
  lang,
}: {
  merchant: { uid: string };
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchant?.uid) return;
    setLoading(true);
    fetch(`/api/customers/${merchant.uid}`)
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        setCustomers(Array.isArray(data) ? data : data?.customers || []);
      })
      .catch(() => {
        setCustomers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [merchant?.uid]);

  const getWhatsAppLink = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const message = `أهلاً ${name}، لدينا عرض خاص لك! استخدم كود الخصم التالي: [كود الخصم] في طلبك القادم`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="customers-loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white" data-testid="text-customers-title">
          {t("عملائي", "My Customers")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("قائمة العملاء الذين طلبوا من متجرك", "List of customers who ordered from your store")}
        </p>
      </div>

      <Card className="bg-[#111] border-white/[0.06] rounded-2xl overflow-visible">
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4" data-testid="customers-empty">
              <Users2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground text-sm">
                {t("لا يوجد عملاء بعد", "No customers yet")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="customers-table">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-start text-xs font-medium text-muted-foreground px-4 py-3">
                      {t("الاسم", "Name")}
                    </th>
                    <th className="text-start text-xs font-medium text-muted-foreground px-4 py-3">
                      {t("رقم الجوال", "Phone")}
                    </th>
                    <th className="text-start text-xs font-medium text-muted-foreground px-4 py-3">
                      {t("عدد الطلبات", "Total Orders")}
                    </th>
                    <th className="text-start text-xs font-medium text-muted-foreground px-4 py-3">
                      {t("آخر طلب", "Last Order")}
                    </th>
                    <th className="text-start text-xs font-medium text-muted-foreground px-4 py-3">
                      {t("عدم حضور", "No-Shows")}
                    </th>
                    <th className="text-start text-xs font-medium text-muted-foreground px-4 py-3">
                      {t("واتساب", "WhatsApp")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, index) => (
                    <tr
                      key={`${customer.phone}-${index}`}
                      className="border-b border-white/[0.04] last:border-b-0"
                      data-testid={`row-customer-${index}`}
                    >
                      <td className="px-4 py-3 text-sm text-white" data-testid={`text-customer-name-${index}`}>
                        <div className="flex items-center gap-2">
                          {customer.name}
                          {(customer.noShowCount || 0) >= 2 && (
                            <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] rounded-full px-1.5">
                              <ShieldAlert className="w-3 h-3 me-0.5" />
                              {t("غير ملتزم", "Unreliable")}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr" data-testid={`text-customer-phone-${index}`}>
                        {customer.phone}
                      </td>
                      <td className="px-4 py-3" data-testid={`text-customer-orders-${index}`}>
                        <Badge variant="secondary" className="text-xs">
                          {customer.totalOrders}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-customer-last-order-${index}`}>
                        {customer.lastOrderDate
                          ? new Date(customer.lastOrderDate).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-3" data-testid={`text-customer-noshow-${index}`}>
                        {(customer.noShowCount || 0) > 0 ? (
                          <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                            {customer.noShowCount}
                          </Badge>
                        ) : (
                          <span className="text-white/20 text-xs">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-green-500 hover:text-green-400"
                          onClick={() => window.open(getWhatsAppLink(customer.phone, customer.name), "_blank")}
                          data-testid={`button-whatsapp-${index}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  createdAt: string;
}

function CouponsView({
  merchant,
  t,
  lang,
}: {
  merchant: { uid: string; storeName: string; [key: string]: any };
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coupons/${merchant.uid}`);
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [merchant.uid]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCreate = async () => {
    const trimmedCode = code.trim().toUpperCase();
    const pct = parseInt(discountPercent, 10);
    if (!trimmedCode || isNaN(pct) || pct < 1 || pct > 100) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/coupons/${merchant.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode, discountPercent: pct, active: true }),
      });
      if (res.ok) {
        setCode("");
        setDiscountPercent("");
        await fetchCoupons();
      }
    } catch {
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    setTogglingId(coupon.id);
    try {
      await fetch(`/api/coupons/${merchant.uid}/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !coupon.active }),
      });
      await fetchCoupons();
    } catch {
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (couponId: string) => {
    setDeletingId(couponId);
    try {
      await fetch(`/api/coupons/${merchant.uid}/${couponId}`, { method: "DELETE" });
      await fetchCoupons();
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="coupons-view">
      <div className="flex items-center gap-3 flex-wrap">
        <Ticket className="w-6 h-6 text-red-400" />
        <h2 className="text-xl font-bold" data-testid="text-coupons-title">
          {t("الكوبونات", "Coupons")}
        </h2>
      </div>

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4" data-testid="text-create-coupon-title">
            {t("إنشاء كوبون جديد", "Create New Coupon")}
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder={t("رمز الكوبون", "Coupon Code")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="bg-[#0a0a0a] border-white/10 rounded-xl"
              data-testid="input-coupon-code"
            />
            <Input
              type="number"
              min={1}
              max={100}
              placeholder={t("نسبة الخصم %", "Discount %")}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="bg-[#0a0a0a] border-white/10 rounded-xl sm:max-w-[160px]"
              data-testid="input-coupon-discount"
            />
            <Button
              onClick={handleCreate}
              disabled={creating || !code.trim() || !discountPercent}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl whitespace-nowrap"
              data-testid="button-create-coupon"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <Plus className="w-4 h-4 me-2" />
              )}
              {t("إنشاء كوبون", "Create Coupon")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12" data-testid="coupons-loading">
          <Loader2 className="w-8 h-8 animate-spin text-red-400" />
        </div>
      ) : coupons.length === 0 ? (
        <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
          <CardContent className="p-12 text-center" data-testid="coupons-empty">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">
              {t("لا توجد كوبونات بعد", "No coupons yet")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="coupons-list">
          {coupons.map((coupon) => (
            <Card
              key={coupon.id}
              className="border-white/[0.06] bg-[#111] rounded-2xl"
              data-testid={`card-coupon-${coupon.id}`}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 flex-wrap">
                  <span
                    className="font-mono font-bold text-lg tracking-wider"
                    data-testid={`text-coupon-code-${coupon.id}`}
                  >
                    {coupon.code}
                  </span>
                  <Badge
                    className="bg-red-500/20 text-red-400 border-red-500/30"
                    data-testid={`badge-coupon-discount-${coupon.id}`}
                  >
                    {coupon.discountPercent}%
                  </Badge>
                  <Badge
                    className={
                      coupon.active
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    }
                    data-testid={`badge-coupon-status-${coupon.id}`}
                  >
                    {coupon.active
                      ? t("مفعّل", "Active")
                      : t("معطّل", "Inactive")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(coupon)}
                    disabled={togglingId === coupon.id}
                    className="border-white/10 rounded-xl"
                    data-testid={`button-toggle-coupon-${coupon.id}`}
                  >
                    {togglingId === coupon.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : coupon.active ? (
                      <>{t("تعطيل", "Disable")}</>
                    ) : (
                      <>{t("تفعيل", "Enable")}</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(coupon.id)}
                    disabled={deletingId === coupon.id}
                    className="border-white/10 text-red-400 hover:text-red-300 rounded-xl"
                    data-testid={`button-delete-coupon-${coupon.id}`}
                  >
                    {deletingId === coupon.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FinancialView({
  merchant,
  t,
  lang,
}: {
  merchant: any;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const [period, setPeriod] = useState("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ totalSales: 0, collectedSales: 0, lostSales: 0, completionRate: 0, orders: [] });

  const fetchData = useCallback(async () => {
    if (!merchant?.uid) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom" && fromDate && toDate) {
        params.set("from", fromDate);
        params.set("to", toDate);
      }
      const res = await fetch(`/api/financial/${merchant.uid}?${params}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error("Failed to load financial data:", e);
    }
    setLoading(false);
  }, [merchant?.uid, period, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    if (!merchant?.uid) return;
    const params = new URLSearchParams({ period });
    if (period === "custom" && fromDate && toDate) {
      params.set("from", fromDate);
      params.set("to", toDate);
    }
    window.open(`/api/financial/${merchant.uid}/export?${params}`, "_blank");
  };

  const statCards = [
    {
      label: t("إجمالي المبيعات", "Total Sales"),
      value: `${data.totalSales.toFixed(2)} SAR`,
      icon: DollarSign,
      color: "text-white",
      bgColor: "bg-white/[0.06]",
      borderColor: "border-white/10",
    },
    {
      label: t("المحصّلة", "Collected"),
      value: `${data.collectedSales.toFixed(2)} SAR`,
      icon: CheckCircle,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      label: t("خسائر (لم يحضر)", "Lost (No-Show)"),
      value: `${data.lostSales.toFixed(2)} SAR`,
      icon: UserX,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    {
      label: t("نسبة التحصيل", "Collection Rate"),
      value: `${data.completionRate}%`,
      icon: TrendingUp,
      color: data.completionRate >= 80 ? "text-emerald-400" : data.completionRate >= 50 ? "text-amber-400" : "text-red-400",
      bgColor: data.completionRate >= 80 ? "bg-emerald-500/10" : data.completionRate >= 50 ? "bg-amber-500/10" : "bg-red-500/10",
      borderColor: data.completionRate >= 80 ? "border-emerald-500/20" : data.completionRate >= 50 ? "border-amber-500/20" : "border-red-500/20",
    },
  ];

  const periodOptions = [
    { value: "today", label: t("اليوم", "Today") },
    { value: "7d", label: t("7 أيام", "7 Days") },
    { value: "30d", label: t("30 يوم", "30 Days") },
    { value: "custom", label: t("مخصص", "Custom") },
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2" data-testid="heading-financial">
          <DollarSign className="w-6 h-6 text-emerald-400" />
          {t("الإدارة المالية", "Financial Management")}
        </h2>
        <Button
          onClick={handleExport}
          className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
          data-testid="button-export-csv"
        >
          <FileDown className="w-4 h-4 me-1" />
          {t("تصدير CSV", "Export CSV")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        {periodOptions.map((opt) => (
          <Button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
              period === opt.value
                ? "bg-emerald-600 text-white"
                : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] border border-white/10"
            }`}
            data-testid={`button-period-${opt.value}`}
          >
            <Calendar className="w-3.5 h-3.5 me-1" />
            {opt.label}
          </Button>
        ))}
        {period === "custom" && (
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 w-36 bg-white/[0.03] border-white/10 text-white text-xs rounded-xl"
              data-testid="input-date-from"
            />
            <span className="text-white/40 text-xs">{t("إلى", "to")}</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 w-36 bg-white/[0.03] border-white/10 text-white text-xs rounded-xl"
              data-testid="input-date-to"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((card, idx) => (
              <Card key={idx} className={`${card.bgColor} rounded-2xl border ${card.borderColor}`} data-testid={`card-stat-${idx}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                    <span className="text-xs text-white/50 font-medium">{card.label}</span>
                  </div>
                  <p className={`text-xl font-extrabold ${card.color}`}>{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-[#111] rounded-2xl border border-white/[0.06]" data-testid="card-orders-table">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold text-white/80 mb-4">{t("سجل الطلبات", "Orders Log")} ({data.orders.length})</h3>
              {data.orders.length === 0 ? (
                <div className="text-center py-10 text-white/30 text-sm">
                  {t("لا توجد طلبات في هذه الفترة", "No orders in this period")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-financial-orders">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-white/40 text-xs">
                        <th className="pb-3 text-start font-medium">#</th>
                        <th className="pb-3 text-start font-medium">{t("العميل", "Customer")}</th>
                        <th className="pb-3 text-start font-medium">{t("المبلغ", "Amount")}</th>
                        <th className="pb-3 text-start font-medium">{t("الحالة", "Status")}</th>
                        <th className="pb-3 text-start font-medium">{t("التاريخ", "Date")}</th>
                        <th className="pb-3 text-start font-medium">{t("خصم", "Discount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((order: any, idx: number) => (
                        <tr key={order.id || idx} className="border-b border-white/[0.03] hover:bg-white/[0.02]" data-testid={`row-order-${idx}`}>
                          <td className="py-3 text-white font-bold">#{order.orderNumber || "—"}</td>
                          <td className="py-3">
                            <div className="text-white/80 font-medium">{order.customerName}</div>
                            <div className="text-white/30 text-xs font-mono" dir="ltr">{order.customerPhone ? order.customerPhone.slice(0, -3) + "***" : "—"}</div>
                          </td>
                          <td className="py-3 text-white font-bold">{order.total.toFixed(2)} <span className="text-white/40 text-xs">SAR</span></td>
                          <td className="py-3">
                            {order.status === "uncollected" ? (
                              <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] rounded-full" data-testid={`badge-status-${idx}`}>
                                <UserX className="w-3 h-3 me-0.5" />
                                {t("لم يحضر", "No-Show")}
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] rounded-full" data-testid={`badge-status-${idx}`}>
                                <CheckCircle className="w-3 h-3 me-0.5" />
                                {t("تم التحصيل", "Collected")}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 text-white/40 text-xs">
                            {new Date(order.archivedAt || order.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                          </td>
                          <td className="py-3 text-amber-400/70 text-xs">
                            {order.couponCode ? `${order.couponCode} (-${(order.discountAmount || 0).toFixed(0)})` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SettingsView({
  merchant,
  onDownloadQR,
  qrLoading,
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
  onlineOrdersEnabled: boolean;
  onToggleOnlineOrders: () => void;
  businessOpenTime: string;
  businessCloseTime: string;
  onSaveBusinessHours: (openTime: string, closeTime: string) => void;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const { toast } = useToast();
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
  const [cityCode, setCityCode] = useState<string>(merchant?.cityCode || "");
  const [cityCodeSaving, setCityCodeSaving] = useState(false);
  const [moyasarPublishableKey, setMoyasarPublishableKey] = useState<string>(merchant?.moyasarPublishableKey || "");
  const [moyasarSecretKey, setMoyasarSecretKey] = useState<string>(merchant?.moyasarSecretKey || "");
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState<boolean>(merchant?.onlinePaymentEnabled || false);
  const [codEnabled, setCodEnabled] = useState<boolean>(merchant?.codEnabled !== false);
  const [deliveryEnabled, setDeliveryEnabled] = useState<boolean>(merchant?.deliveryEnabled || false);
  const [deliveryFee, setDeliveryFee] = useState<string>(merchant?.deliveryFee?.toString() || "0");
  const [deliveryRange, setDeliveryRange] = useState<string>(merchant?.deliveryRange?.toString() || "0");
  const [storeLat, setStoreLat] = useState<string>(merchant?.storeLat?.toString() || "");
  const [storeLng, setStoreLng] = useState<string>(merchant?.storeLng?.toString() || "");
  const [driverPhone, setDriverPhone] = useState<string>(merchant?.driverPhone || "");
  const [paymentSaving, setPaymentSaving] = useState(false);

  const cityCodeOptions = [
    { code: "01", labelAr: "الرياض", labelEn: "Riyadh" },
    { code: "02", labelAr: "جدة", labelEn: "Jeddah" },
    { code: "03", labelAr: "مكة المكرمة", labelEn: "Makkah" },
    { code: "04", labelAr: "المدينة المنورة", labelEn: "Madinah" },
    { code: "05", labelAr: "الدمام", labelEn: "Dammam" },
    { code: "06", labelAr: "الخبر", labelEn: "Khobar" },
    { code: "07", labelAr: "تبوك", labelEn: "Tabuk" },
    { code: "08", labelAr: "أبها", labelEn: "Abha" },
    { code: "09", labelAr: "القصيم", labelEn: "Qassim" },
    { code: "10", labelAr: "حائل", labelEn: "Hail" },
    { code: "11", labelAr: "جازان", labelEn: "Jazan" },
    { code: "12", labelAr: "نجران", labelEn: "Najran" },
    { code: "13", labelAr: "الباحة", labelEn: "Al Baha" },
    { code: "14", labelAr: "الجوف", labelEn: "Al Jouf" },
    { code: "15", labelAr: "عرعر", labelEn: "Arar" },
  ];

  async function handleSavePaymentConfig() {
    if (!merchant?.uid) return;
    setPaymentSaving(true);
    try {
      const merchantRef = doc(db, "merchants", merchant.uid);
      await updateDoc(merchantRef, {
        moyasarPublishableKey,
        moyasarSecretKey,
        onlinePaymentEnabled,
        codEnabled,
        deliveryEnabled,
        deliveryFee: parseFloat(deliveryFee) || 0,
        deliveryRange: parseFloat(deliveryRange) || 0,
        storeLat: storeLat.trim() ? parseFloat(storeLat) : null,
        storeLng: storeLng.trim() ? parseFloat(storeLng) : null,
        driverPhone: driverPhone.trim(),
      });
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم حفظ إعدادات بوابة الدفع بنجاح", "Payment gateway settings saved successfully"),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حفظ إعدادات الدفع", "Failed to save payment settings"),
        variant: "destructive",
      });
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleSaveCityCode() {
    if (!merchant?.uid) return;
    setCityCodeSaving(true);
    try {
      const merchantRef = doc(db, "merchants", merchant.uid);
      await updateDoc(merchantRef, { cityCode });
      toast({ title: t("تم الحفظ", "Saved"), description: t("تم حفظ رمز المدينة بنجاح", "City code saved successfully") });
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في حفظ رمز المدينة", "Failed to save city code"), variant: "destructive" });
    } finally {
      setCityCodeSaving(false);
    }
  }

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
            <CreditCard className="w-4 h-4 text-blue-400" />
            {t("ربط بوابة الدفع", "Payment Gateway Connection")}
          </h3>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground block">Moyasar Publishable Key</label>
              <Input
                type="text"
                value={moyasarPublishableKey}
                onChange={(e) => setMoyasarPublishableKey(e.target.value)}
                placeholder="pk_live_..."
                className="h-12 bg-white/[0.03] border-white/10 font-mono"
                dir="ltr"
                data-testid="input-moyasar-pub-key"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground block">Moyasar Secret Key</label>
              <Input
                type="password"
                value={moyasarSecretKey}
                onChange={(e) => setMoyasarSecretKey(e.target.value)}
                placeholder="sk_live_..."
                className="h-12 bg-white/[0.03] border-white/10 font-mono"
                dir="ltr"
                data-testid="input-moyasar-secret-key"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("تفعيل الدفع الإلكتروني", "Enable Online Payment")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">
                  {t("السماح للعملاء بالدفع إلكترونياً عبر بوابة Moyasar", "Allow customers to pay online via Moyasar gateway")}
                </p>
              </div>
              <Switch
                checked={onlinePaymentEnabled}
                onCheckedChange={setOnlinePaymentEnabled}
                className="data-[state=checked]:bg-blue-600"
                data-testid="switch-online-payment"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("تفعيل الدفع عند الاستلام", "Enable Cash on Delivery")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">
                  {t("السماح للعملاء بالدفع نقداً عند استلام الطلب", "Allow customers to pay cash on delivery")}
                </p>
              </div>
              <Switch
                checked={codEnabled}
                onCheckedChange={setCodEnabled}
                className="data-[state=checked]:bg-emerald-600"
                data-testid="switch-cod-payment"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("تفعيل خدمة التوصيل", "Enable Delivery")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">
                  {t("السماح للعملاء بطلب التوصيل لموقعهم", "Allow customers to request delivery to their location")}
                </p>
              </div>
              <Switch
                checked={deliveryEnabled}
                onCheckedChange={setDeliveryEnabled}
                className="data-[state=checked]:bg-emerald-600"
                data-testid="switch-delivery-enabled"
              />
            </div>

            {deliveryEnabled && (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">{t("رسوم التوصيل (ريال)", "Delivery Fee (SAR)")}</label>
                  <Input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.5"
                    className="h-12 bg-white/[0.03] border-white/10 font-mono"
                    dir="ltr"
                    data-testid="input-delivery-fee"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    {t("أقصى نطاق توصيل (كيلومتر)", "Max Delivery Range (km)")}
                  </label>
                  <Input
                    type="number"
                    value={deliveryRange}
                    onChange={(e) => setDeliveryRange(e.target.value)}
                    placeholder={t("0 = غير محدود", "0 = unlimited")}
                    min="0"
                    step="1"
                    className="h-12 bg-white/[0.03] border-white/10 font-mono"
                    dir="ltr"
                    data-testid="input-delivery-range"
                  />
                  <p className="text-[10px] text-muted-foreground" dir="rtl">
                    {t("اضبط على 0 لقبول أي مسافة. يُستخدم مع إحداثيات الفرع لحساب المسافة.", "Set to 0 to accept any distance. Used with branch coordinates to calculate delivery range.")}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2" dir="rtl">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    {t("إحداثيات موقع الفرع", "Branch Location Coordinates")}
                  </p>
                  <p className="text-[11px] text-muted-foreground" dir="rtl">
                    {t("افتح Google Maps، انقر بزر اليمين على موقع فرعك، وانسخ الإحداثيات.", "Open Google Maps, right-click your branch location, and copy the coordinates.")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">{t("خط العرض", "Latitude")}</label>
                      <Input
                        type="text"
                        value={storeLat}
                        onChange={(e) => setStoreLat(e.target.value)}
                        placeholder="24.7136"
                        className="h-10 bg-black/40 border-white/10 font-mono text-sm"
                        dir="ltr"
                        data-testid="input-store-lat"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">{t("خط الطول", "Longitude")}</label>
                      <Input
                        type="text"
                        value={storeLng}
                        onChange={(e) => setStoreLng(e.target.value)}
                        placeholder="46.6753"
                        className="h-10 bg-black/40 border-white/10 font-mono text-sm"
                        dir="ltr"
                        data-testid="input-store-lng"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">{t("رقم جوال المندوب (واتساب)", "Driver Phone (WhatsApp)")}</label>
                  <Input
                    type="tel"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder={t("مثال: 966501234567", "e.g. 966501234567")}
                    maxLength={15}
                    className="h-12 bg-white/[0.03] border-white/10 font-mono"
                    dir="ltr"
                    data-testid="input-driver-phone"
                  />
                  <p className="text-[10px] text-muted-foreground">{t("اتركه فارغاً لاختيار المندوب يدوياً عند كل طلب", "Leave empty to choose driver manually per order")}</p>
                </div>
              </>
            )}

            <Button
              onClick={handleSavePaymentConfig}
              disabled={paymentSaving}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl disabled:opacity-30"
              data-testid="button-save-payment-config"
            >
              {paymentSaving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
              {t("حفظ إعدادات الدفع", "Save Payment Settings")}
            </Button>
          </div>
        </CardContent>
      </Card>

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
            <MapPin className="w-4 h-4 text-red-400" />
            {t("رمز المدينة (ترقيم الطلبات)", "City Code (Order Numbering)")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4" dir="rtl">
            {t(
              "يُستخدم رمز المدينة في ترقيم الطلبات أونلاين. مثال: الرياض (01) + السنة (26) + الرقم التسلسلي = 0126001",
              "City code is used in online order numbering. Example: Riyadh (01) + Year (26) + Sequential = 0126001"
            )}
          </p>
          <div className="space-y-3">
            <Select value={cityCode} onValueChange={setCityCode}>
              <SelectTrigger className="h-12 bg-white/[0.03] border-white/10" data-testid="select-city-code">
                <SelectValue placeholder={t("اختر المدينة", "Select City")} />
              </SelectTrigger>
              <SelectContent>
                {cityCodeOptions.map((city) => (
                  <SelectItem key={city.code} value={city.code} data-testid={`option-city-${city.code}`}>
                    {city.code} — {lang === "ar" ? city.labelAr : city.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cityCode && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-xs text-muted-foreground mb-1" dir="rtl">{t("معاينة رقم الطلب", "Order ID Preview")}</p>
                <p className="text-lg font-mono font-bold text-center text-red-400" data-testid="text-city-code-preview">
                  {cityCode}{new Date().getFullYear().toString().slice(-2)}001
                </p>
              </div>
            )}
            <Button
              onClick={handleSaveCityCode}
              disabled={cityCodeSaving || cityCode === (merchant?.cityCode || "")}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl disabled:opacity-30"
              data-testid="button-save-city-code"
            >
              {cityCodeSaving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
              {t("حفظ رمز المدينة", "Save City Code")}
            </Button>
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
