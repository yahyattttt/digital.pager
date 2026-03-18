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
  Save,
  ImagePlus,
  Hash,
  Receipt,
  CalendarDays,
  ExternalLink,
  FileText,
  CloudUpload,
  RefreshCw,
  Cpu,
  HardDrive,
  ServerCrash,
  Zap,
  Database,
  HeartPulse,
  Link2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import ArchiveView from "@/pages/order-archive";
import SubscriptionView from "@/components/subscription-view";
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
const PRIMARY_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || "yahiatohary@hotmail.com").toLowerCase();

type DashboardView = "overview" | "menu" | "analytics" | "tracking" | "customers" | "coupons" | "financial" | "settings" | "archive" | "subscription" | "reviews" | "syshealth";

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

// ─── System Health View (Super Admin) ──────────────────────────────────────
function SysHealthView({
  t,
  counterData,
  counterLoading,
  healthLoading,
  resetting,
  errorLog,
  merchantCount,
  ordersToday,
  onRefresh,
  onResetCounter,
}: {
  t: (ar: string, en: string) => string;
  lang: string;
  counterData: { last_global_number: number; last_reset_date: string; total_today: number } | null;
  counterLoading: boolean;
  healthLoading: boolean;
  resetting: boolean;
  errorLog: { ts: string; code: string; msg: string }[];
  merchantCount: number | null;
  ordersToday: number;
  onRefresh: () => void;
  onResetCounter: () => void;
}) {
  const FREE_READS = 50000;
  const FREE_WRITES = 20000;
  const FREE_STORAGE_MB = 1024;

  const estimatedReads = ordersToday * 8;
  const estimatedWrites = ordersToday * 4;
  const readsPercent = Math.min(100, (estimatedReads / FREE_READS) * 100);
  const writesPercent = Math.min(100, (estimatedWrites / FREE_WRITES) * 100);
  const estimatedStorageMB = (merchantCount || 0) * 0.7;
  const storagePercent = Math.min(100, (estimatedStorageMB / FREE_STORAGE_MB) * 100);

  const getStatus = (pct: number) => pct >= 80 ? "critical" : pct >= 50 ? "warning" : "healthy";
  const statusColor = (s: string) => s === "critical" ? "#ef4444" : s === "warning" ? "#f59e0b" : "#22c55e";
  const statusBg = (s: string) => s === "critical" ? "rgba(239,68,68,0.08)" : s === "warning" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)";
  const statusBorder = (s: string) => s === "critical" ? "rgba(239,68,68,0.25)" : s === "warning" ? "rgba(245,158,11,0.25)" : "rgba(34,197,94,0.2)";
  const statusLabel = (s: string) => s === "critical" ? t("⚠ خطر", "⚠ Critical") : s === "warning" ? t("تحذير", "Warning") : t("✓ سليم", "✓ Healthy");

  const readsStatus = getStatus(readsPercent);
  const writesStatus = getStatus(writesPercent);
  const storageStatus = getStatus(storagePercent);
  const counterStatus = (counterData?.total_today || 0) > 800 ? "warning" : "healthy";

  const dotStyle = (s: string) => ({
    width: 8, height: 8, borderRadius: "50%" as const,
    background: statusColor(s),
    boxShadow: `0 0 6px ${statusColor(s)}`,
    flexShrink: 0,
    display: "inline-block" as const,
  });

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="section-syshealth">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>
            <HeartPulse className="w-5 h-5 text-rose-400" />
            {t("صحة النظام والموارد", "System Health & Resources")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t("لوحة مراقبة مخصصة للمشرف العام فقط", "Super Admin only monitoring dashboard")}</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={healthLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
          data-testid="button-refresh-syshealth"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin" : ""}`} />
          {t("تحديث", "Refresh")}
        </button>
      </div>

      {/* 4-Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── Widget 1: Firebase Quota ── */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0d0d12", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
                <Zap className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">{t("الاستهلاك اليومي", "Daily Firebase Quota")}</p>
                <p className="text-[10px] text-slate-500">{t("تقدير بناءً على طلبات اليوم", "Estimate based on today's orders")}</p>
              </div>
            </div>
            <div className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusBg(readsStatus), color: statusColor(readsStatus), border: `1px solid ${statusBorder(readsStatus)}` }}>
              {statusLabel(readsStatus)}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400 font-medium">{t("قراءات Reads", "Reads")}</span>
                <span className="font-mono text-slate-300">{estimatedReads.toLocaleString()} / {FREE_READS.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${readsPercent}%`, background: statusColor(readsStatus) }} />
              </div>
              <p className="text-[9px] text-slate-600 mt-0.5">{readsPercent.toFixed(1)}% {t("من الحصة اليومية المجانية", "of free daily quota")}</p>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400 font-medium">{t("كتابات Writes", "Writes")}</span>
                <span className="font-mono text-slate-300">{estimatedWrites.toLocaleString()} / {FREE_WRITES.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${writesPercent}%`, background: statusColor(writesStatus) }} />
              </div>
              <p className="text-[9px] text-slate-600 mt-0.5">{writesPercent.toFixed(1)}% {t("من الحصة اليومية المجانية", "of free daily quota")}</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-600 border-t border-slate-800/60 pt-2">{t("الأرقام تقريبية (8 قراءات + 4 كتابات × عدد الطلبات اليوم)", "Estimated: 8 reads + 4 writes × today's orders")}</p>
        </div>

        {/* ── Widget 2: Storage Monitor ── */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0d0d12", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                <HardDrive className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">{t("مراقبة التخزين", "Storage Monitor")}</p>
                <p className="text-[10px] text-slate-500">{t("تقدير بناءً على عدد المتاجر", "Estimate based on merchant count")}</p>
              </div>
            </div>
            <div className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusBg(storageStatus), color: statusColor(storageStatus), border: `1px solid ${statusBorder(storageStatus)}` }}>
              {statusLabel(storageStatus)}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400 font-medium">{t("الاستخدام الكلي", "Total Usage")}</span>
                <span className="font-mono text-slate-300">{estimatedStorageMB.toFixed(1)} MB / {FREE_STORAGE_MB} MB</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${storagePercent}%`, background: statusColor(storageStatus) }} />
              </div>
              <p className="text-[9px] text-slate-600 mt-0.5">{storagePercent.toFixed(2)}% {t("من حد التخزين المجاني (1 GB)", "of free storage limit (1 GB)")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { label: t("شعارات المتاجر", "Store Logos"), size: `${((merchantCount || 0) * 0.2).toFixed(1)} MB`, icon: "🖼️" },
                { label: t("الوثائق والـ PDF", "PDFs & Docs"), size: `${((merchantCount || 0) * 0.5).toFixed(1)} MB`, icon: "📄" },
              ].map((row) => (
                <div key={row.label} className="rounded-xl p-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                  <p className="text-base">{row.icon}</p>
                  <p className="text-[10px] font-bold text-emerald-300 mt-1">{row.size}</p>
                  <p className="text-[9px] text-slate-500">{row.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 border-t border-slate-800/60 pt-2">{t(`${merchantCount ?? "—"} متجر مسجل — 700KB تقديراً لكل متجر`, `${merchantCount ?? "—"} registered stores — ~700KB estimated per store`)}</p>
          </div>
        </div>

        {/* ── Widget 3: Order Counter ── */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0d0d12", border: "1px solid rgba(251,191,36,0.2)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(251,191,36,0.12)" }}>
                <Hash className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">{t("عداد الطلبات", "Order Counter")}</p>
                <p className="text-[10px] text-slate-500">{t("متزامن مباشرة مع Firebase", "Live sync with Firebase")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={dotStyle(counterStatus)} />
              <span className="text-[10px] font-bold" style={{ color: statusColor(counterStatus) }}>
                {statusLabel(counterStatus)}
              </span>
            </div>
          </div>
          {counterLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" />{t("جاري التحميل...", "Loading...")}</div>
          ) : counterData ? (
            <div className="space-y-3">
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-4xl font-black text-white tabular-nums" data-testid="syshealth-global-counter">{counterData.last_global_number.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{t("إجمالي الأرقام الصادرة", "Total numbers issued")}</p>
                </div>
                <div className="pb-1">
                  <p className="text-xl font-bold text-amber-400">{counterData.total_today}</p>
                  <p className="text-[9px] text-slate-500">{t("اليوم", "Today")}</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-amber-500/10 pt-3">
                <div>
                  <p className="text-[10px] text-slate-500">{t("آخر إعادة ضبط", "Last reset")} <span className="text-slate-300 font-mono">{counterData.last_reset_date || "—"}</span></p>
                </div>
                <button
                  onClick={onResetCounter}
                  disabled={resetting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
                  data-testid="syshealth-reset-counter"
                >
                  {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {t("إعادة الضبط", "Reset")}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500 text-sm">
              <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>{t("اضغط تحديث لتحميل البيانات", "Click Refresh to load data")}</p>
            </div>
          )}
        </div>

        {/* ── Widget 4: Error Log ── */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "#0d0d12", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
                <ServerCrash className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">{t("سجل الأخطاء", "Error Log")}</p>
                <p className="text-[10px] text-slate-500">{t("آخر 5 أخطاء مسجلة في النظام", "Last 5 recorded system errors")}</p>
              </div>
            </div>
            {errorLog.length === 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>✓ {t("لا أخطاء", "No Errors")}</span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>⚠ {errorLog.length}</span>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1" data-testid="syshealth-error-log">
            {errorLog.length === 0 ? (
              <div className="text-center py-6">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-600 opacity-60" />
                <p className="text-xs text-slate-500">{t("لم يتم تسجيل أي أخطاء", "No errors recorded")}</p>
              </div>
            ) : (
              errorLog.slice(0, 5).map((e, i) => {
                const isHigh = e.code === "429" || e.code === "resource-exhausted" || e.code === "500";
                return (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: isHigh ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${isHigh ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)"}` }}>
                    <span className="text-[10px] font-black mt-0.5 px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: isHigh ? "rgba(239,68,68,0.15)" : "rgba(148,163,184,0.1)", color: isHigh ? "#f87171" : "#94a3b8" }}>
                      {e.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-300 truncate">{e.msg}</p>
                      <p className="text-[9px] text-slate-600 mt-0.5 font-mono">{new Date(e.ts).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {errorLog.length > 5 && (
            <p className="text-[9px] text-slate-600 text-center">{t(`+${errorLog.length - 5} أخطاء أقدم`, `+${errorLog.length - 5} older errors`)}</p>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t("متاجر مسجلة", "Registered Stores"), value: merchantCount ?? "—", icon: Database, color: "#818cf8" },
          { label: t("طلبات اليوم", "Today's Orders"), value: ordersToday, icon: Activity, color: "#34d399" },
          { label: t("أخطاء مسجلة", "Logged Errors"), value: errorLog.length, icon: AlertTriangle, color: errorLog.length > 0 ? "#f87171" : "#94a3b8" },
          { label: t("حالة النظام", "System Status"), value: t("يعمل", "Running"), icon: Cpu, color: "#22c55e" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}18` }}>
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{String(stat.value)}</p>
                <p className="text-[9px] text-slate-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
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
  const [currentView, setCurrentView] = useState<DashboardView>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState<boolean>((merchant as any)?.storeOpen !== false);
  const [whatsappOrders, setWhatsappOrders] = useState<WhatsAppOrder[]>([]);
  const [activeWhatsappOrders, setActiveWhatsappOrders] = useState<WhatsAppOrder[]>([]);
  const prevWhatsappCountRef = useState({ current: -1 })[0];
  const waOrderAudioRef = useState<{ current: HTMLAudioElement | null }>({ current: null })[0];
  const curbsideAudioRef = useState<{ current: HTMLAudioElement | null }>({ current: null })[0];
  const prevCurbsideIdsRef = useState<{ current: Set<string> }>({ current: new Set() })[0];
  const [onlineOrdersEnabled, setOnlineOrdersEnabled] = useState<boolean>((merchant as any)?.onlineOrdersEnabled !== false);
  const [businessOpenTime, setBusinessOpenTime] = useState<string>((merchant as any)?.businessOpenTime || "");
  const [businessCloseTime, setBusinessCloseTime] = useState<string>((merchant as any)?.businessCloseTime || "");
  const [completedToday, setCompletedToday] = useState(0);
  const [flyingOrderId, setFlyingOrderId] = useState<string | null>(null);
  const [merchantFeatures, setMerchantFeatures] = useState({ analyticsEnabled: true, crmEnabled: true, printReceiptsEnabled: true });
  const [manualDigitInput, setManualDigitInput] = useState("");
  const [manualAddLoading, setManualAddLoading] = useState(false);
  const [lastShiftNumber, setLastShiftNumber] = useState<number>(0);
  const [showShiftConfig, setShowShiftConfig] = useState(false);
  const [shiftConfigInput, setShiftConfigInput] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  // ── System Health (super admin only) ────────────────────────────────────
  const [sysCounterData, setSysCounterData] = useState<{ last_global_number: number; last_reset_date: string; total_today: number } | null>(null);
  const [sysCounterLoading, setSysCounterLoading] = useState(false);
  const [sysResetting, setSysResetting] = useState(false);
  const [sysErrorLog, setSysErrorLog] = useState<{ ts: string; code: string; msg: string }[]>([]);
  const [sysMerchantCount, setSysMerchantCount] = useState<number | null>(null);
  const [sysHealthLoading, setSysHealthLoading] = useState(false);
  const sysCounterUnsubRef = useRef<(() => void) | null>(null);

  // ── Alert Sound System ──────────────────────────────────────────────────
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [soundUnlocked, setSoundUnlocked] = useState<boolean>(() => localStorage.getItem("sound_unlocked") === "1");
  const [alertVolume, setAlertVolume] = useState<number>(() => {
    const saved = localStorage.getItem("alert_volume");
    return saved !== null ? Number(saved) : 0.8;
  });

  const playAlertOnce = useCallback(() => {
    const vol = Number(localStorage.getItem("alert_volume") ?? "0.8");
    if (!alertAudioRef.current) {
      alertAudioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    }
    alertAudioRef.current.volume = Math.max(0, Math.min(1, vol));
    alertAudioRef.current.currentTime = 0;
    alertAudioRef.current.play().catch(() => {});
  }, []);

  const stopAlertLoop = useCallback(() => {
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
      alertIntervalRef.current = null;
    }
    if (alertAudioRef.current) {
      alertAudioRef.current.pause();
      alertAudioRef.current.currentTime = 0;
    }
  }, []);

  const startAlertLoop = useCallback(() => {
    if (alertIntervalRef.current) return;
    playAlertOnce();
    alertIntervalRef.current = setInterval(playAlertOnce, 5000);
  }, [playAlertOnce]);

  const unlockSound = useCallback(() => {
    if (!alertAudioRef.current) {
      alertAudioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    }
    const vol = Number(localStorage.getItem("alert_volume") ?? "0.8");
    alertAudioRef.current.volume = Math.max(0, Math.min(1, vol));
    alertAudioRef.current.play().then(() => {
      alertAudioRef.current!.pause();
      alertAudioRef.current!.currentTime = 0;
    }).catch(() => {});
    localStorage.setItem("sound_unlocked", "1");
    setSoundUnlocked(true);
  }, []);
  // ────────────────────────────────────────────────────────────────────────

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
          items: (data.items || []).map((item: any) => ({ productId: item.productId || "", name: item.name || "", price: item.price || 0, quantity: item.quantity || 1, selectedVariant: item.selectedVariant || null, extras: item.extras || [], removals: item.removals || [] })),
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
          is_waiting_outside: data.is_waiting_outside === true,
          car_plate_number: data.car_plate_number || undefined,
          createdAt: data.createdAt || "",
        };
      });
      orders.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      if (orders.length > 0) {
        startAlertLoop();
        if (prevWhatsappCountRef.current >= 0 && orders.length > prevWhatsappCountRef.current) {
          toast({ title: t("طلب جديد! 🔔", "New Order! 🔔"), description: t("وصل طلب أونلاين جديد", "New online order received") });
        }
      } else {
        stopAlertLoop();
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
          items: (data.items || []).map((item: any) => ({ productId: item.productId || "", name: item.name || "", price: item.price || 0, quantity: item.quantity || 1, selectedVariant: item.selectedVariant || null, extras: item.extras || [], removals: item.removals || [] })),
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
          is_waiting_outside: data.is_waiting_outside === true,
          car_plate_number: data.car_plate_number || undefined,
          createdAt: data.createdAt || "",
        };
      });
      orders.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

      // Detect newly arrived curbside customers and play bell
      const newCurbsideIds = orders.filter(o => o.is_waiting_outside).map(o => o.id);
      const truly_new = newCurbsideIds.filter(id => !prevCurbsideIdsRef.current.has(id));
      if (truly_new.length > 0) {
        try {
          if (!curbsideAudioRef.current) curbsideAudioRef.current = new Audio("/bell.mp3");
          curbsideAudioRef.current.currentTime = 0;
          curbsideAudioRef.current.play().catch(() => {});
        } catch {}
        prevCurbsideIdsRef.current = new Set(newCurbsideIds);
      } else {
        prevCurbsideIdsRef.current = new Set(newCurbsideIds);
      }

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

    // Only fetch TODAY's archived docs — not all historical docs.
    // Uses a single-field range query (auto-indexed) instead of status==archived
    // which would read every completed order ever.
    const pagersRef = collection(db, "merchants", merchant.uid, "pagers");
    const pQ = query(pagersRef, where("archivedAt", ">=", todayISO));
    const waRef = collection(db, "merchants", merchant.uid, "whatsappOrders");
    const wQ = query(waRef, where("archivedAt", ">=", todayISO));

    let pCount = 0, wCount = 0;
    const unsub1 = onSnapshot(pQ, (snap) => {
      pCount = snap.size;
      setCompletedToday(pCount + wCount);
    });
    const unsub2 = onSnapshot(wQ, (snap) => {
      wCount = snap.size;
      setCompletedToday(pCount + wCount);
    });
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
      docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
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
    if (!trimmed || !/^\d{1,4}$/.test(trimmed)) {
      toast({
        title: t("رقم غير صالح", "Invalid Number"),
        description: t("أدخل رقم من 1 إلى 4 أرقام", "Enter a 1-4 digit number"),
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
    } catch (err: any) {
      const isQuota = err?.code === "resource-exhausted"
        || String(err?.message || "").includes("resource-exhausted")
        || String(err?.message || "").includes("RESOURCE_EXHAUSTED")
        || String(err?.message || "").includes("quota");
      toast({
        title: t("خطأ", "Error"),
        description: isQuota
          ? t(
              "تم تجاوز حد الطلبات المجانية، يرجى المحاولة لاحقاً أو ترقية الخطة.",
              "Free quota exceeded. Please try again later or upgrade your plan."
            )
          : t("فشل في إضافة الطلب", "Failed to add order"),
        variant: "destructive",
      });
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

  // Auto-load system health when super admin navigates to that view
  useEffect(() => {
    if (currentView === "syshealth" && isSuperAdmin) {
      fetchSysHealthData();
    }
    return () => {
      if (currentView !== "syshealth" && sysCounterUnsubRef.current) {
        sysCounterUnsubRef.current();
        sysCounterUnsubRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const shiftAddLockRef = useRef(false);
  const handleShiftAdd = useCallback(async () => {
    if (!merchant?.uid || !isApproved || manualAddLoading || shiftAddLockRef.current) return;
    if (lastShiftNumber === 0) {
      setShowShiftConfig(true);
      return;
    }
    shiftAddLockRef.current = true;
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

      // Update global platform counter (fire-and-forget, non-blocking)
      const today = new Date().toISOString().split("T")[0];
      const globalRef = doc(db, "systemSettings", "orderCounters");
      runTransaction(db, async (txn) => {
        const gSnap = await txn.get(globalRef);
        const gData = gSnap.exists() ? gSnap.data() : {};
        const isNewDay = (gData.last_reset_date || "") !== today;
        txn.set(globalRef, {
          last_global_number: (gData.last_global_number || 0) + 1,
          last_reset_date: isNewDay ? today : (gData.last_reset_date || today),
          total_today: isNewDay ? 1 : (gData.total_today || 0) + 1,
        }, { merge: false });
      }).catch(() => {}); // silent fail — never block order creation

      toast({ title: t(`تم إضافة طلب رقم ${displayId} بنجاح`, `Order #${displayId} added successfully`) });
    } catch (err: any) {
      const isQuota = err?.code === "resource-exhausted"
        || String(err?.message || "").includes("resource-exhausted")
        || String(err?.message || "").includes("RESOURCE_EXHAUSTED")
        || String(err?.message || "").includes("quota");
      toast({
        title: t("خطأ", "Error"),
        description: isQuota
          ? t(
              "تم تجاوز حد الطلبات المجانية، يرجى المحاولة لاحقاً أو ترقية الخطة.",
              "Free quota exceeded. Please try again later or upgrade your plan."
            )
          : t("فشل في إضافة الطلب", "Failed to add order"),
        variant: "destructive",
      });
    } finally {
      setManualAddLoading(false);
      shiftAddLockRef.current = false;
    }
  }, [merchant?.uid, isApproved, manualAddLoading, lastShiftNumber, t, toast]);

  // ── System Health Monitoring ─────────────────────────────────────────────
  const logSystemError = useCallback(async (code: string, msg: string) => {
    const entry = { ts: new Date().toISOString(), code, msg };
    setSysErrorLog((prev) => [entry, ...prev].slice(0, 20));
    try {
      const logRef = doc(db, "systemSettings", "errorLog");
      const snap = await getDoc(logRef);
      const existing: { ts: string; code: string; msg: string }[] = snap.exists() ? (snap.data().entries || []) : [];
      const updated = [entry, ...existing].slice(0, 50);
      await setDoc(logRef, { entries: updated }, { merge: false });
    } catch { /* never block on logging */ }
  }, []);

  const fetchSysHealthData = useCallback(async () => {
    setSysHealthLoading(true);
    try {
      // Counter data — real-time listener
      if (sysCounterUnsubRef.current) { sysCounterUnsubRef.current(); sysCounterUnsubRef.current = null; }
      const counterRef = doc(db, "systemSettings", "orderCounters");
      setSysCounterLoading(true);
      const unsub = onSnapshot(counterRef, (snap) => {
        setSysCounterLoading(false);
        if (snap.exists()) {
          const d = snap.data();
          setSysCounterData({ last_global_number: d.last_global_number || 0, last_reset_date: d.last_reset_date || "", total_today: d.total_today || 0 });
        } else {
          setSysCounterData({ last_global_number: 0, last_reset_date: "", total_today: 0 });
        }
      }, () => setSysCounterLoading(false));
      sysCounterUnsubRef.current = unsub;

      // Merchant count
      const merchantsSnap = await getDocs(collection(db, "merchants"));
      setSysMerchantCount(merchantsSnap.size);

      // Error log
      const logSnap = await getDoc(doc(db, "systemSettings", "errorLog"));
      if (logSnap.exists()) {
        setSysErrorLog((logSnap.data().entries || []).slice(0, 20));
      }
    } catch (e: any) {
      logSystemError("500", e?.message || "Failed to load system health data");
    } finally {
      setSysHealthLoading(false);
    }
  }, [logSystemError]);

  const resetSysGlobalCounter = useCallback(async () => {
    setSysResetting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await setDoc(doc(db, "systemSettings", "orderCounters"), { last_global_number: 0, last_reset_date: today, total_today: 0 }, { merge: false });
      toast({ title: t("تم الإعادة", "Reset Done"), description: t("تم إعادة ضبط العداد إلى الصفر", "Global counter reset to zero") });
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في إعادة الضبط", "Reset failed"), variant: "destructive" });
    } finally {
      setSysResetting(false);
    }
  }, [t, toast]);

  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  const handleAcceptWhatsAppOrder = useCallback(async (order: WhatsAppOrder) => {
    if (!merchant?.uid || acceptingOrderId) return;
    stopAlertLoop();
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
  }, [merchant?.uid, acceptingOrderId, stopAlertLoop, t, toast]);

  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

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

  const handleCancelWhatsAppOrder = useCallback(async (order: WhatsAppOrder) => {
    if (!merchant?.uid || cancellingOrderId) return;
    setCancellingOrderId(order.id);
    try {
      const orderRef = doc(db, "merchants", merchant.uid, "whatsappOrders", order.id);
      await updateDoc(orderRef, { status: "cancelled", cancelledAt: new Date().toISOString() });
      const displayId = order.displayOrderId || `#${order.orderNumber}`;
      toast({
        title: t(`تم إلغاء الطلب ${displayId}`, `Order ${displayId} Cancelled`),
        description: t("تم إلغاء الطلب وسيُبلَّغ العميل فوراً", "Order cancelled and customer will be notified"),
      });
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في إلغاء الطلب", "Failed to cancel order"), variant: "destructive" });
    } finally {
      setCancellingOrderId(null);
    }
  }, [merchant?.uid, cancellingOrderId, t, toast]);

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

  const handleCancelPager = useCallback(async (pager: Pager & { docId: string }) => {
    if (!merchant?.uid) return;
    try {
      const pagerRef = doc(db, "merchants", merchant.uid, "pagers", pager.docId);
      await updateDoc(pagerRef, { status: "cancelled", cancelledAt: new Date().toISOString() });
      toast({
        title: t("تم إلغاء الطلب", "Order Cancelled"),
        description: t(`تم إلغاء الطلب ${pager.displayOrderId || "#" + pager.orderNumber}`, `Order ${pager.displayOrderId || "#" + pager.orderNumber} cancelled`),
      });
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في إلغاء الطلب", "Failed to cancel order"), variant: "destructive" });
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
    if (!merchant?.uid) {
      console.error("[PagerQR] merchant.uid missing — aborting");
      return;
    }
    setQrLoading(true);
    let qrObjUrl: string | null = null;
    let canvasObjUrl: string | null = null;
    try {
      // ── Step 1: fetch QR PNG as blob ──────────────────────────────
      const qrEndpoint = `/api/qr/${merchant.uid}?t=${Date.now()}`;
      const qrRes = await fetch(qrEndpoint);
      if (!qrRes.ok) throw new Error(`[PagerQR] QR fetch HTTP ${qrRes.status}`);
      const qrBlob = await qrRes.blob();

      // ── Step 2: blob → base64 data URL via FileReader ─────────────
      // (FileReader result is a same-origin data URL — no canvas taint)
      const qrDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("[PagerQR] FileReader failed to read blob"));
        reader.readAsDataURL(qrBlob);
      });

      // ── Step 3: load data URL into HTMLImageElement ───────────────
      // NOTE: use window.Image — the local `Image` import (lucide/UI) shadows the native constructor
      const qrImg = new window.Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error("[PagerQR] HTMLImageElement failed to load data URL"));
        qrImg.src = qrDataUrl;
      });

      // ── Step 4: draw pager frame onto canvas ──────────────────────
      const W = 440, H = 590, S = 2;
      const canvas = document.createElement("canvas");
      canvas.width = W * S;
      canvas.height = H * S;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("[PagerQR] canvas.getContext('2d') returned null");
      ctx.scale(S, S);

      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      // Body
      const bodyGrad = ctx.createLinearGradient(0, 0, 0, H);
      bodyGrad.addColorStop(0, "#160505");
      bodyGrad.addColorStop(1, "#060000");
      rr(0, 0, W, H, 38); ctx.fillStyle = bodyGrad; ctx.fill();
      // Borders
      rr(3, 3, W - 6, H - 6, 36); ctx.strokeStyle = "rgba(200,30,30,0.75)"; ctx.lineWidth = 2.5; ctx.stroke();
      rr(9, 9, W - 18, H - 18, 31); ctx.strokeStyle = "rgba(255,60,60,0.12)"; ctx.lineWidth = 1; ctx.stroke();
      // Top label
      ctx.fillStyle = "rgba(200,40,40,0.9)"; ctx.font = "bold 12px Arial,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("DIGITAL PAGER", W / 2, 34);
      // LED rows
      const drawLeds = (ledY: number) => {
        [0.18, 0.4, 0.85, 1, 0.85, 0.4, 0.18].forEach((op, i) => {
          const cx = W / 2 + (i - 3) * 24;
          const g = ctx.createRadialGradient(cx, ledY, 0, cx, ledY, 6);
          g.addColorStop(0, `rgba(255,30,0,${op})`); g.addColorStop(1, "rgba(80,0,0,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, ledY, 6, 0, Math.PI * 2); ctx.fill();
        });
      };
      drawLeds(52);
      // QR screen panel
      const qrX = 40, qrY = 70, qrSize = W - 80;
      rr(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14); ctx.fillStyle = "#fff"; ctx.fill();
      // QR image
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      // Bezel notch
      ctx.strokeStyle = "rgba(200,30,30,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(qrX + 20, qrY - 10); ctx.lineTo(qrX + qrSize - 20, qrY - 10); ctx.stroke();
      // Bottom LEDs
      const botLedY = qrY + qrSize + 30;
      drawLeds(botLedY);
      // Arabic label (without emoji to avoid rendering issues)
      ctx.fillStyle = "#fff"; ctx.font = "bold 20px Arial,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("\u0627\u0645\u0633\u062D \u0648\u062A\u0627\u0628\u0639 \u0637\u0644\u0628\u0643 \uD83D\uDCF1", W / 2, botLedY + 36);
      // Store name
      const sName = merchant.storeName || "";
      if (sName) { ctx.fillStyle = "rgba(200,60,60,0.65)"; ctx.font = "13px Arial,sans-serif"; ctx.fillText(sName, W / 2, botLedY + 58); }
      // Accent line
      ctx.strokeStyle = "rgba(200,30,30,0.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(60, H - 22); ctx.lineTo(W - 60, H - 22); ctx.stroke();


      // ── Step 5: canvas → blob → objectURL → download ──────────────
      // Using toBlob() instead of toDataURL() is more reliable and
      // avoids SecurityError in restricted environments
      canvasObjUrl = await new Promise<string>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("[PagerQR] canvas.toBlob() returned null")); return; }
          resolve(URL.createObjectURL(blob));
        }, "image/png");
      });

      const link = document.createElement("a");
      link.download = `pager-qr-${merchant.uid}.png`;
      link.href = canvasObjUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke after a short delay so the browser has time to start the download
      setTimeout(() => { if (canvasObjUrl) URL.revokeObjectURL(canvasObjUrl); }, 5000);

      toast({ title: t("تم التحميل", "Downloaded"), description: t("تم تحميل رمز QR بنجاح", "QR code downloaded successfully") });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[PagerQR] FAILED:", msg);
      if (qrObjUrl) URL.revokeObjectURL(qrObjUrl);
      if (canvasObjUrl) URL.revokeObjectURL(canvasObjUrl);
      toast({ title: t("خطأ في التحميل", "Download Error"), description: msg, variant: "destructive" });
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

  // Check if subscription has expired by date (status still "active" in Firestore but date passed)
  const subscriptionExpiryDate = merchant.subscriptionExpiry ? new Date(merchant.subscriptionExpiry) : null;
  const isExpiredByDate = subscriptionExpiryDate !== null && subscriptionExpiryDate < new Date();
  const daysUntilExpiry = subscriptionExpiryDate
    ? Math.ceil((subscriptionExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  // A merchant is "subscription-locked" (date expired but still marked active in Firestore)
  const isSubscriptionExpiredByDate = effectiveSubscriptionStatus === "active" && isExpiredByDate;
  // Admin-suspended stores are locked to subscription tab only (can still see dashboard to resubmit)
  const isAdminSuspended = merchant.status === "suspended";
  // Combined content lock: either date-expired or admin-suspended
  const isContentLocked = isSubscriptionExpiredByDate || isAdminSuspended;

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

  // isPending shows the "under review" yellow banner — suspended stores are handled separately
  const isPending = merchant.status === "pending" || merchant.status === "rejected";
  const waitingPagers = pagers.filter((p) => p.status === "waiting");
  const notifiedPagers = pagers.filter((p) => p.status === "notified");
  const isSuperAdmin = merchant.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL;

  const allNavItems: { id: DashboardView; icon: typeof LayoutDashboard; label: string; badge?: number }[] = [
    { id: "overview", icon: LayoutDashboard, label: t("لوحة التحكم", "Dashboard"), badge: whatsappOrders.length || undefined },
    { id: "menu", icon: UtensilsCrossed, label: t("قسم الأونلاين", "Online Section") },
    { id: "analytics", icon: BarChart3, label: t("التحليلات", "Analytics") },
    { id: "tracking", icon: Activity, label: t("تتبع عملاءك", "Customer Tracking") },
    { id: "customers", icon: Users2, label: t("عملائي", "My Customers") },
    { id: "coupons", icon: Ticket, label: t("الكوبونات", "Coupons") },
    { id: "financial", icon: DollarSign, label: t("الإدارة المالية", "Financial") },
    { id: "reviews", icon: Star, label: t("تقييمات العملاء", "Customer Reviews") },
    { id: "archive", icon: FolderArchive, label: t("أرشيف الطلبات", "Order Archive") },
    { id: "subscription", icon: CreditCard, label: t("اشتراكي", "My Subscription") },
    { id: "settings", icon: Settings, label: t("الإعدادات", "Settings") },
    ...(isSuperAdmin ? [{ id: "syshealth" as const, icon: HeartPulse, label: t("صحة النظام", "System Health") }] : []),
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
              const isLocked = isContentLocked && item.id !== "subscription";
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isLocked) { setCurrentView("subscription"); setSidebarOpen(false); return; }
                    setCurrentView(item.id);
                    setSidebarOpen(false);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isLocked
                      ? "text-white/20 cursor-not-allowed"
                      : isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  {isLocked ? (
                    <Lock className="w-[18px] h-[18px] flex-shrink-0 opacity-40" />
                  ) : (
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  )}
                  <span className="flex-1 text-start">{item.label}</span>
                  {!isLocked && item.badge !== undefined && item.badge > 0 && (
                    <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-primary/20 text-primary border-primary/30">
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
          {/* Subscription Expired Banner — kill-switch for expired subscriptions */}
          {isSubscriptionExpiredByDate && (
            <div className="mx-4 mt-4 md:mx-6 rounded-xl border-2 border-red-600/60 bg-red-600/10 p-4 flex items-start gap-3" data-testid="banner-subscription-expired">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-400">
                  {t("انتهى اشتراكك — المتجر متوقف حالياً", "Subscription Expired — Store is Paused")}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {t(
                    "انتهى تاريخ صلاحية اشتراكك. يرجى تجديد الاشتراك لاستئناف الخدمة.",
                    "Your subscription has expired. Please renew to resume service."
                  )}
                </p>
              </div>
              <button
                onClick={() => setCurrentView("subscription")}
                className="shrink-0 text-xs font-bold text-red-300 border border-red-600/40 px-3 py-1.5 rounded-lg hover:bg-red-600/20 transition-colors whitespace-nowrap"
                data-testid="btn-renew-subscription"
              >
                {t("تجديد الاشتراك", "Renew Now")}
              </button>
            </div>
          )}

          {/* Expiring Soon Banner — 7-day countdown */}
          {isExpiringSoon && !isSubscriptionExpiredByDate && (
            <div className="mx-4 mt-4 md:mx-6 rounded-xl border border-amber-500/40 bg-amber-500/8 p-4 flex items-start gap-3" data-testid="banner-expiring-soon">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <CalendarDays className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-400">
                  {daysUntilExpiry === 0
                    ? t("تنبيه: اشتراكك ينتهي اليوم!", "Alert: Your subscription expires today!")
                    : t(`تنبيه: اشتراكك ينتهي خلال ${daysUntilExpiry} أيام`, `Alert: Your subscription expires in ${daysUntilExpiry} days`)}
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  {t("يرجى التجديد لضمان استمرار الخدمة", "Please renew to ensure service continuity")}
                </p>
              </div>
              <button
                onClick={() => setCurrentView("subscription")}
                className="shrink-0 text-xs font-bold text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg hover:bg-amber-500/15 transition-colors whitespace-nowrap"
                data-testid="btn-renew-expiring"
              >
                {t("تجديد", "Renew")}
              </button>
            </div>
          )}

          {/* Rejection / Suspension Banner — shown on all views when store is rejected or suspended */}
          {(merchant as any).subscriptionRequestStatus === "rejected" && (
            <div className="mx-4 mt-4 md:mx-6 rounded-xl border-2 border-red-500/50 bg-red-500/10 p-4 flex items-start gap-3" data-testid="banner-rejection-dashboard">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-400">
                  {isAdminSuspended
                    ? t("تم إيقاف متجرك من قِبَل الإدارة", "Your store has been suspended by admin")
                    : t("تم رفض طلب التفعيل", "Activation Request Rejected")}
                </p>
                {(merchant as any).subscriptionRequestRejectionReason && (
                  <p className="text-xs text-white/80 mt-1 leading-relaxed">
                    <span className="text-red-300 font-semibold">{t("السبب", "Reason")}:</span>{" "}
                    {(merchant as any).subscriptionRequestRejectionReason}
                  </p>
                )}
                {isAdminSuspended && (
                  <p className="text-xs text-white/50 mt-1.5">
                    {t("يمكنك إعادة تقديم طلبك بعد تصحيح المشكلة المذكورة أعلاه.", "You can resubmit your request after correcting the issue mentioned above.")}
                  </p>
                )}
              </div>
              <button
                onClick={() => setCurrentView("subscription")}
                className="shrink-0 text-xs font-bold text-red-300 border border-red-500/40 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors whitespace-nowrap"
                data-testid="btn-goto-resubmit"
              >
                {t("إعادة الإرسال", "Resubmit")}
              </button>
            </div>
          )}

          <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {/* Subscription expiry content lock — force subscription view when expired */}
            {isContentLocked && currentView !== "subscription" && (
              <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <p className="text-base font-bold text-white/80">
                    {isAdminSuspended
                      ? t("تم إيقاف المتجر من قِبَل الإدارة", "Store has been suspended by admin")
                      : t("الوصول مقيد بسبب انتهاء الاشتراك", "Access restricted due to expired subscription")}
                  </p>
                  <p className="text-sm text-white/40 mt-1">
                    {t("يمكنك فقط الوصول إلى صفحة الاشتراك", "You can only access the subscription page")}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView("subscription")}
                  className="px-6 py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
                  data-testid="btn-goto-subscription-locked"
                >
                  {t("اذهب إلى صفحة الاشتراك", "Go to Subscription")}
                </button>
              </div>
            )}
            {currentView === "overview" && !isContentLocked && (
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
                onCancelWhatsAppOrder={handleCancelWhatsAppOrder}
                onReadyWhatsAppOrder={handleReadyWhatsAppOrder}
                onCompleteWhatsAppOrder={handleCompleteWhatsAppOrder}
                onUncollectedWhatsAppOrder={handleUncollectedWhatsAppOrder}
                onCancelPager={handleCancelPager}
                acceptingOrderId={acceptingOrderId}
                rejectingOrderId={rejectingOrderId}
                cancellingOrderId={cancellingOrderId}
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

            {!isContentLocked && currentView === "menu" && (
              <MenuView merchant={merchant} t={t} lang={lang} />
            )}

            {!isContentLocked && currentView === "analytics" && (
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

            {!isContentLocked && currentView === "tracking" && (
              <TrackingView merchant={merchant} t={t} lang={lang} />
            )}

            {!isContentLocked && currentView === "customers" && (
              <CustomersView merchant={merchant} t={t} lang={lang} />
            )}

            {!isContentLocked && currentView === "coupons" && (
              <CouponsView merchant={merchant} t={t} lang={lang} />
            )}

            {!isContentLocked && currentView === "financial" && (
              <FinancialView merchant={merchant} t={t} lang={lang} />
            )}

            {!isContentLocked && currentView === "archive" && (
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

            {currentView === "subscription" && (
              <SubscriptionView
                merchant={merchant as any}
                t={t}
                lang={lang}
              />
            )}

            {!isContentLocked && currentView === "reviews" && (
              <ReviewsView merchant={merchant} t={t} lang={lang} />
            )}

            {currentView === "settings" && (
              <SettingsView
                merchant={merchant}
                onDownloadQR={handleDownloadQR}
                qrLoading={qrLoading}
                onlineOrdersEnabled={onlineOrdersEnabled}
                businessOpenTime={businessOpenTime}
                businessCloseTime={businessCloseTime}
                t={t}
                lang={lang}
              />
            )}

            {/* ─── System Health (Super Admin Only) ─── */}
            {isSuperAdmin && currentView === "syshealth" && (
              <SysHealthView
                t={t}
                lang={lang}
                counterData={sysCounterData}
                counterLoading={sysCounterLoading}
                healthLoading={sysHealthLoading}
                resetting={sysResetting}
                errorLog={sysErrorLog}
                merchantCount={sysMerchantCount}
                ordersToday={sysCounterData?.total_today ?? 0}
                onRefresh={fetchSysHealthData}
                onResetCounter={resetSysGlobalCounter}
              />
            )}
          </div>
        </main>
      </div>

      {/* Sound Unlock Banner */}
      {!soundUnlocked && (
        <button
          onClick={unlockSound}
          data-testid="button-unlock-sound"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl transition-all active:scale-95 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
            border: "1px solid rgba(255,80,80,0.3)",
            color: "#fff",
            fontFamily: "'Tajawal','Cairo',sans-serif",
            boxShadow: "0 8px 32px rgba(220,38,38,0.4)",
          }}
          dir="rtl"
        >
          <span className="text-base">🔔</span>
          <span>{t("انقر هنا لتفعيل صوت التنبيهات", "Click here to enable alert sounds")}</span>
        </button>
      )}

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

function LiveOrderTimer({ createdAt, lang, isNew }: { createdAt: string; lang: string; isNew: boolean }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const calc = () => {
      const ts = new Date(createdAt).getTime();
      if (isNaN(ts)) return;
      setSecs(Math.max(0, Math.floor((Date.now() - ts) / 1000)));
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [createdAt]);

  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, "0");
  const isOverdue = isNew && secs >= 300;

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
        isOverdue
          ? "bg-red-500/25 text-red-300 border border-red-500/40 animate-pulse"
          : isNew
          ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
          : "text-white/40"
      }`}
      title={isOverdue ? (lang === "ar" ? "تأخر عن 5 دقائق!" : "Over 5 minutes!") : undefined}
      data-testid="live-order-timer"
    >
      <Clock className="w-2.5 h-2.5" />
      {mm}:{ss}
      {isOverdue && <span className="text-[9px]">{lang === "ar" ? "⚠️" : "⚠️"}</span>}
    </span>
  );
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
  onCancelWhatsAppOrder,
  onReadyWhatsAppOrder,
  onCompleteWhatsAppOrder,
  onUncollectedWhatsAppOrder,
  onCancelPager,
  acceptingOrderId,
  rejectingOrderId,
  cancellingOrderId,
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
  onCancelWhatsAppOrder: (order: WhatsAppOrder) => void;
  onReadyWhatsAppOrder: (order: WhatsAppOrder) => void;
  onCompleteWhatsAppOrder: (order: WhatsAppOrder) => void;
  onUncollectedWhatsAppOrder: (order: WhatsAppOrder) => void;
  onCancelPager: (pager: Pager & { docId: string }) => void;
  acceptingOrderId: string | null;
  rejectingOrderId: string | null;
  cancellingOrderId: string | null;
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
  const { toast } = useToast();
  const [printOrder, setPrintOrder] = useState<WhatsAppOrder | null>(null);
  const [printQrDataUrl, setPrintQrDataUrl] = useState<string>("");
  const [uncollectedConfirmOrder, setUncollectedConfirmOrder] = useState<WhatsAppOrder | null>(null);
  const [customerNoShowMap, setCustomerNoShowMap] = useState<Record<string, number>>({});
  const [customerOrderCounts, setCustomerOrderCounts] = useState<Record<string, number>>({});
  const [overviewStats, setOverviewStats] = useState<{ totalRevenueToday: number; completedTodayCount: number; cancelledToday: number } | null>(null);

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

  useEffect(() => {
    if (!merchant?.uid) return;
    const fetchStats = () => {
      fetch(`/api/merchant-analytics/${merchant.uid}`, { headers: { "x-merchant-email": merchant.email || "" } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setOverviewStats({ totalRevenueToday: d.totalRevenueToday || 0, completedTodayCount: d.completedTodayCount || 0, cancelledToday: d.cancelledToday || 0 }); })
        .catch(() => {});
    };
    fetchStats();
    const iv = setInterval(fetchStats, 60000);
    return () => clearInterval(iv);
  }, [merchant?.uid]);

  const handlePrint = async (order: WhatsAppOrder) => {
    // Fetch QR code before printing
    let qrUrl = "";
    try {
      const qrContent = `${window.location.origin}/receipt/${order.id}?m=${order.merchantId}`;
      const qrRes = await fetch("/api/receipt-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: qrContent }),
      });
      if (qrRes.ok) { const d = await qrRes.json(); qrUrl = d.dataUrl || ""; }
    } catch {}
    setPrintQrDataUrl(qrUrl);
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
      setTimeout(() => { setPrintOrder(null); setPrintQrDataUrl(""); }, 500);
    }, 250);
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
      let line = `${i + 1}. ${item.name}`;
      if (item.selectedVariant) line += ` (${item.selectedVariant})`;
      line += ` × ${qty} — ${price} SAR`;
      if (item.extras && item.extras.length > 0) line += `\n   + ${item.extras.join(", ")}`;
      if (item.removals && item.removals.length > 0) line += `\n   — بدون ${item.removals.join(", ")}`;
      return line;
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
  ].sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt));

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
      background: "linear-gradient(180deg, #0e0e0e 0%, #080808 100%)",
      boxShadow: `0 0 0 1px ${cfg.borderColor}20, 0 0 20px rgba(255,100,0,0.18), 0 8px 32px rgba(0,0,0,0.6)`,
      border: `1px solid ${cfg.borderColor}25`,
    };
  };

  const PagerTopBar = ({ cat }: { cat: "dine_in" | "takeaway" | "delivery" | "manual" }) => {
    const cfg = typeBadgeConfig(cat);
    return (
      <div
        className="h-[3px] w-full"
        style={{ background: `linear-gradient(90deg, ${cfg.borderColor}ee, ${cfg.borderColor}44, transparent)` }}
      />
    );
  };

  const LiveIndicator = ({ isNew, label }: { isNew: boolean; label: string }) => (
    <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
      style={{
        background: isNew ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
        border: isNew ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(16,185,129,0.3)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: isNew ? "#ef4444" : "#10b981",
          boxShadow: isNew ? "0 0 6px rgba(239,68,68,0.9)" : "0 0 6px rgba(16,185,129,0.9)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: isNew ? "#f87171" : "#34d399" }}>
        {label}
      </span>
    </div>
  );

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

      {/* Live Pulse Stats Bar */}
      <div className="grid grid-cols-3 gap-2 mb-4" data-testid="live-pulse-stats-bar">
        <div className="rounded-xl bg-[#0d1117] border border-white/[0.06] px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-white/35 uppercase tracking-wider leading-none mb-0.5">{t("صافي اليوم", "Net Today")}</p>
            <p className="text-base font-bold text-white leading-none" data-testid="text-daily-net">
              {overviewStats ? overviewStats.totalRevenueToday.toLocaleString() : "—"} <span className="text-[10px] text-white/30">SAR</span>
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-[#0d1117] border border-white/[0.06] px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/15 flex items-center justify-center shrink-0">
            <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-white/35 uppercase tracking-wider leading-none mb-0.5">{t("مكتملة", "Completed")}</p>
            <p className="text-base font-bold text-white leading-none" data-testid="text-completed-today">
              {overviewStats ? overviewStats.completedTodayCount : "—"} <span className="text-[10px] text-white/30">{t("طلب", "orders")}</span>
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-[#0d1117] border border-white/[0.06] px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/15 flex items-center justify-center shrink-0">
            <X className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-white/35 uppercase tracking-wider leading-none mb-0.5">{t("ملغاة", "Cancelled")}</p>
            <p className="text-base font-bold text-white leading-none" data-testid="text-cancelled-today">
              {overviewStats ? overviewStats.cancelledToday : "—"} <span className="text-[10px] text-white/30">{t("طلب", "orders")}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {allActiveOrders.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${allActiveOrders.length > 0 ? "bg-red-500" : "bg-white/20"}`}></span>
            </span>
            <h2 className="text-lg font-bold text-white" data-testid="text-overview-title">
              {t("اللايف بولس", "Live Pulse")}
            </h2>
          </div>
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
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleShiftAdd}
                disabled={manualAddLoading}
                className="h-9 px-3.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl active:scale-[0.96] transition-all"
                data-testid="button-shift-add"
              >
                {manualAddLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5" /> : <Plus className="w-3.5 h-3.5 me-1.5" />}
                {t("توليد رقم تلقائي", "Auto Generate")}
              </Button>
              <Button
                onClick={() => { setShiftConfigInput(String(lastShiftNumber)); setShowShiftConfig(true); }}
                size="sm"
                variant="ghost"
                className="h-9 w-10 p-0 text-white/35 hover:text-white/80 hover:bg-white/[0.06] rounded-xl transition-colors"
                title={t("إعداد الوردية", "Shift Setup")}
                data-testid="button-shift-config-open"
              >
                <Settings className="w-8 h-8" />
              </Button>
            </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allActiveOrders.map((item) => {
              const isFlying = (item.type === "pager" || item.type === "pager-notified")
                ? flyingOrderId === item.id
                : flyingOrderId === `wa-${item.id}`;

              const isOnline = item.type === "wa-new" || item.type === "wa";
              const sc = statusColor(item.status);
              const isNewStatus = item.status === "awaiting_confirmation" || item.status === "pending_verification" || item.type === "wa-new";
              const orderAgeSecs = Math.max(0, Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 1000));
              const isOverdueCard = isNewStatus && orderAgeSecs >= 300;

              if (item.type === "wa-new") {
                const order = (item as any).order as WhatsAppOrder;
                const waNewCardStyle = order.is_waiting_outside
                  ? { ...cardStyle(item.orderCategory), boxShadow: "0 0 0 1px rgba(255,140,0,0.25), 0 0 28px rgba(255,140,0,0.45), 0 8px 32px rgba(0,0,0,0.6)" }
                  : isOverdueCard
                  ? { ...cardStyle(item.orderCategory), boxShadow: "0 0 0 1px rgba(239,68,68,0.3), 0 0 22px rgba(239,68,68,0.35), 0 8px 32px rgba(0,0,0,0.6)" }
                  : cardStyle(item.orderCategory);
                return (
                  <Card
                    key={`wa-new-${item.id}`}
                    className={`relative rounded-[24px] overflow-hidden transition-all duration-500 new-order-pulse ${isFlying ? "opacity-0 -translate-y-20 scale-75" : ""}`}
                    style={waNewCardStyle}
                    data-testid={`card-wa-order-${item.id}`}
                  >
                    <PagerTopBar cat={item.orderCategory} />
                    <WatermarkIcon category={item.orderCategory} />

                    {/* Pager-style Header */}
                    <div className="px-4 pt-3 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-red-400/70 shrink-0" />
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">{t("طلب جديد", "NEW ORDER")}</span>
                          </div>
                          <span className="text-2xl font-black text-white tracking-tight leading-none" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }} data-testid={`text-order-num-${item.id}`}>
                            {order.displayOrderId || (order.orderNumber ? `#${order.orderNumber}` : "—")}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <LiveIndicator isNew={true} label={t("جديد", "NEW")} />
                          <div className="flex items-center gap-1.5">
                            <TypeBadge category={item.orderCategory} />
                            <LiveOrderTimer createdAt={item.createdAt} lang={lang} isNew={true} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <CardContent className="px-4 pb-3 pt-0 space-y-2 relative z-[1]">
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

                      <div className="space-y-0.5 bg-white/[0.02] rounded-xl p-2.5 border border-white/[0.04] max-h-[130px] overflow-y-auto">
                        {order.items.map((itm: any, idx: number) => {
                          const parsed = parseItemExtras(itm.name);
                          const structuredExtras: string[] = itm.extras && itm.extras.length > 0 ? itm.extras : (parsed.extras ? [parsed.extras] : []);
                          const structuredRemovals: string[] = itm.removals || [];
                          const displayVariant = itm.selectedVariant || parsed.variant;
                          return (
                            <div key={idx} data-testid={`order-item-${item.id}-${idx}`}>
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-xs font-semibold text-white leading-tight">
                                  <span className="text-white/40 me-1">{itm.quantity}×</span>
                                  {parsed.baseName}
                                  {displayVariant && <span className="text-white/35 text-[10px] ms-1">({displayVariant})</span>}
                                </p>
                                <span className="text-[11px] text-white/45 font-mono shrink-0">{itm.price.toFixed(0)}</span>
                              </div>
                              {structuredExtras.length > 0 && (
                                <p className="text-[10px] text-emerald-400/70 ps-4 leading-tight">+ {structuredExtras.join(", ")}</p>
                              )}
                              {structuredRemovals.length > 0 && (
                                <p className="text-[10px] text-amber-400/70 ps-4 leading-tight">— {t("بدون", "No")} {structuredRemovals.join(", ")}</p>
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

                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={() => onAcceptWhatsAppOrder(order)}
                          disabled={acceptingOrderId === order.id || rejectingOrderId === order.id || cancellingOrderId === order.id}
                          className={`flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl ${acceptingOrderId === order.id ? "" : "accept-glow"}`}
                          data-testid={`button-accept-order-${item.id}`}
                        >
                          {acceptingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                            <><CheckCircle className="w-3.5 h-3.5 me-1" />{t("قبول ✅", "Accept ✅")}</>
                          )}
                        </Button>
                        <Button
                          onClick={() => onCancelWhatsAppOrder(order)}
                          disabled={cancellingOrderId === order.id || acceptingOrderId === order.id || rejectingOrderId === order.id}
                          className="h-9 w-9 p-0 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/20 shrink-0"
                          data-testid={`button-cancel-order-${item.id}`}
                          title={t("إلغاء الطلب", "Cancel Order")}
                        >
                          {cancellingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        </Button>
                      </div>

                      {order.is_waiting_outside && (
                        <div
                          className="-mx-4 -mb-4 mt-2 px-4 py-3 flex items-start gap-3"
                          style={{ background: "rgba(255,120,0,0.14)", borderTop: "1px solid rgba(255,140,0,0.35)" }}
                          data-testid={`banner-curbside-${item.id}`}
                        >
                          <span className="text-lg leading-none mt-0.5">🚗</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-orange-300" dir="rtl">⚠️ {t("العميل بالخارج - استلام سيارة", "Customer Outside — Curbside Pickup")}</p>
                            {order.car_plate_number && (
                              <p className="text-base font-black text-white mt-0.5" dir="rtl" data-testid={`text-plate-${item.id}`}>
                                {t("رقم اللوحة:", "Plate:")} <span className="text-orange-200 tracking-widest font-mono">{order.car_plate_number}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              }

              if (item.type === "pager" || item.type === "pager-notified") {
                const pager = (item as any).pager as Pager & { docId: string };
                const isNotified = item.type === "pager-notified";
                const pagerCardStyle = isNotified
                  ? { ...cardStyle("manual"), boxShadow: "0 0 0 1px rgba(16,185,129,0.2), 0 0 20px rgba(16,185,129,0.15), 0 8px 32px rgba(0,0,0,0.6)" }
                  : cardStyle("manual");
                return (
                  <Card
                    key={`${item.type}-${item.id}`}
                    className={`relative rounded-[24px] overflow-hidden transition-all duration-500 ${!isNotified ? "new-order-pulse" : ""} ${isFlying ? "opacity-0 -translate-y-20 scale-75" : ""}`}
                    style={pagerCardStyle}
                    data-testid={`card-${isNotified ? "notified" : "waiting"}-${item.id}`}
                  >
                    <PagerTopBar cat="manual" />
                    <WatermarkIcon category="manual" />

                    {/* Pager-style Header */}
                    <div className="px-4 pt-3 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <QrCode className="w-3.5 h-3.5 text-violet-400/70 shrink-0" />
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">DIGITAL PAGER</span>
                          </div>
                          <span
                            className="text-2xl font-black tracking-tight leading-none"
                            style={{ color: isNotified ? "#34d399" : "#fff", fontFamily: "'Tajawal','Cairo',sans-serif" }}
                            data-testid={`text-order-num-${item.id}`}
                          >
                            {pager.displayOrderId || `#${item.orderNumber}`}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <LiveIndicator isNew={!isNotified} label={isNotified ? t("نُبِّه", "NOTIFIED") : t("انتظار", "WAITING")} />
                          <div className="flex items-center gap-1.5">
                            <TypeBadge category="manual" />
                            <LiveOrderTimer createdAt={item.createdAt} lang={lang} isNew={!isNotified} />
                          </div>
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
                              onClick={() => onCancelPager(pager)}
                              className="h-10 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/20 text-xs font-bold"
                              data-testid={`button-cancel-pager-${item.id}`}
                              title={t("إلغاء الطلب", "Cancel Order")}
                            >
                              <X className="w-3.5 h-3.5" />
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
                          <>
                            <Button
                              onClick={() => onComplete(pager)}
                              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                              data-testid={`button-complete-${item.id}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5 me-1" />{t("تم الاستلام", "Received")}
                            </Button>
                            <Button
                              onClick={() => onCancelPager(pager)}
                              className="h-10 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/20 text-xs font-bold"
                              data-testid={`button-cancel-notified-${item.id}`}
                              title={t("إلغاء الطلب", "Cancel Order")}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              const waOrder = (item as any).order as WhatsAppOrder;
              const isReady = waOrder.status === "ready";
              const isPreparing = waOrder.status === "preparing";
              const waActiveCardStyle = waOrder.is_waiting_outside
                ? { ...cardStyle(item.orderCategory), boxShadow: "0 0 0 1px rgba(255,140,0,0.25), 0 0 28px rgba(255,140,0,0.4), 0 8px 32px rgba(0,0,0,0.6)" }
                : isReady
                ? { ...cardStyle(item.orderCategory), boxShadow: "0 0 0 1px rgba(16,185,129,0.2), 0 0 22px rgba(16,185,129,0.2), 0 8px 32px rgba(0,0,0,0.6)" }
                : cardStyle(item.orderCategory);
              return (
                <Card
                  key={`wa-${item.id}`}
                  className={`relative rounded-[24px] overflow-hidden transition-all duration-500 ${isFlying ? "opacity-0 -translate-y-20 scale-75" : ""}`}
                  style={waActiveCardStyle}
                  data-testid={`card-active-order-${item.id}`}
                >
                  <PagerTopBar cat={item.orderCategory} />
                  <WatermarkIcon category={item.orderCategory} />

                  {/* Pager-style Header */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-red-400/70 shrink-0" />
                          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">{t("طلب أونلاين", "ONLINE ORDER")}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xl font-black text-white tracking-tight leading-none" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }} data-testid={`text-order-num-${item.id}`}>
                            {waOrder.displayOrderId || `#${item.orderNumber}`}
                          </span>
                          {customerNoShowMap[waOrder.customerPhone] && (
                            <Badge className="rounded-full text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-0.5" data-testid={`badge-noshow-${item.id}`}>
                              <ShieldAlert className="w-3 h-3" />
                              {t("غير ملتزم", "Unreliable")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <LiveIndicator isNew={false} label={isReady ? t("جاهز", "READY") : t("يُحضَّر", "PREP")} />
                        <div className="flex items-center gap-1.5">
                          <TypeBadge category={item.orderCategory} />
                          <LiveOrderTimer createdAt={item.createdAt} lang={lang} isNew={isNewStatus} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="px-4 pb-3 pt-0 space-y-2 relative z-[1]">
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

                    {waOrder.diningType === "delivery" && !(isPreparing || isReady) && (
                      <div className="space-y-0.5 bg-white/[0.02] rounded-xl p-2.5 border border-white/[0.04] max-h-[130px] overflow-y-auto">
                        {waOrder.items.map((itm: any, idx: number) => {
                          const parsed = parseItemExtras(itm.name);
                          const structuredExtras: string[] = itm.extras && itm.extras.length > 0 ? itm.extras : (parsed.extras ? [parsed.extras] : []);
                          const structuredRemovals: string[] = itm.removals || [];
                          const displayVariant = itm.selectedVariant || parsed.variant;
                          return (
                            <div key={idx} data-testid={`order-item-${item.id}-${idx}`}>
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-xs font-semibold text-white leading-tight">
                                  <span className="text-white/40 me-1">{itm.quantity}×</span>
                                  {parsed.baseName}
                                  {displayVariant && <span className="text-white/35 text-[10px] ms-1">({displayVariant})</span>}
                                </p>
                                <span className="text-[11px] text-white/45 font-mono shrink-0">{itm.price.toFixed(0)}</span>
                              </div>
                              {structuredExtras.length > 0 && (
                                <p className="text-[10px] text-emerald-400/70 ps-4 leading-tight">+ {structuredExtras.join(", ")}</p>
                              )}
                              {structuredRemovals.length > 0 && (
                                <p className="text-[10px] text-amber-400/70 ps-4 leading-tight">— {t("بدون", "No")} {structuredRemovals.join(", ")}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {waOrder.diningType === "delivery" && !(isPreparing || isReady) && (waOrder.deliveryMapLink || waOrder.deliveryLat != null) && (
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

                    {waOrder.customerNotes && waOrder.diningType === "delivery" && !(isPreparing || isReady) && (
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
                          className="h-9 w-9 p-0 bg-white/[0.06] hover:bg-white/[0.12] text-white/55 hover:text-white/90 rounded-xl border border-white/10 shrink-0"
                          data-testid={`button-print-${item.id}`}
                          title={t("طباعة", "Print")}
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
                        <>
                          <Button
                            onClick={() => onReadyWhatsAppOrder(waOrder)}
                            className="flex-1 h-9 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl"
                            data-testid={`button-ready-order-${item.id}`}
                          >
                            <Utensils className="w-3.5 h-3.5 me-1" />{t("جاهز", "Ready")}
                          </Button>
                          <Button
                            onClick={() => onCancelWhatsAppOrder(waOrder)}
                            disabled={cancellingOrderId === waOrder.id}
                            className="h-9 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/20 text-xs font-bold"
                            data-testid={`button-cancel-active-order-${item.id}`}
                            title={t("إلغاء الطلب", "Cancel Order")}
                          >
                            {cancellingOrderId === waOrder.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </Button>
                        </>
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
                          <Button
                            onClick={() => onCancelWhatsAppOrder(waOrder)}
                            disabled={cancellingOrderId === waOrder.id}
                            className="h-9 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/20 text-xs font-bold"
                            data-testid={`button-cancel-ready-order-${item.id}`}
                            title={t("إلغاء الطلب", "Cancel Order")}
                          >
                            {cancellingOrderId === waOrder.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </Button>
                        </>
                      )}
                    </div>

                    {waOrder.is_waiting_outside && (
                      <div
                        className="-mx-4 -mb-4 mt-2 px-4 py-3 flex items-start gap-3"
                        style={{ background: "rgba(255,120,0,0.14)", borderTop: "1px solid rgba(255,140,0,0.35)" }}
                        data-testid={`banner-curbside-active-${item.id}`}
                      >
                        <span className="text-lg leading-none mt-0.5">🚗</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-orange-300" dir="rtl">⚠️ {t("العميل بالخارج - استلام سيارة", "Customer Outside — Curbside Pickup")}</p>
                          {waOrder.car_plate_number && (
                            <p className="text-base font-black text-white mt-0.5" dir="rtl" data-testid={`text-plate-active-${item.id}`}>
                              {t("رقم اللوحة:", "Plate:")} <span className="text-orange-200 tracking-widest font-mono">{waOrder.car_plate_number}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </div>

      {printOrder && (() => {
        const pDateObj = new Date(printOrder.createdAt);
        const pTime = pDateObj.toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });
        const pDate = pDateObj.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US");
        const pNum = printOrder.displayOrderId || printOrder.orderNumber || "---";
        const pSubtotal = printOrder.items.reduce((s, i) => s + i.price * i.quantity, 0);
        const pDelivery = printOrder.deliveryFee || 0;
        const logoLetter = (merchant?.storeName || "D").charAt(0).toUpperCase();
        const pDining = printOrder.diningType === "delivery" ? t("توصيل","Delivery") :
                        printOrder.diningType === "takeaway" ? t("سفري","Takeaway") : t("محلي","Dine-in");
        return (
          <div id="print-receipt" dir={lang === "ar" ? "rtl" : "ltr"}>
            {/* HEADER */}
            <div className="receipt-header">
              <div className="receipt-logo">{logoLetter}</div>
              <div className="receipt-store-name">{merchant?.storeName || "Digital Pager"}</div>
              <div className="receipt-tax-title">{t("فاتورة ضريبية / TAX INVOICE","TAX INVOICE / فاتورة ضريبية")}</div>
              <div className="receipt-meta-row">
                <span>{pTime}</span>
                <span className="receipt-meta-sep">|</span>
                <span>{pDate}</span>
                <span className="receipt-meta-sep">|</span>
                <span>#{pNum}</span>
              </div>
            </div>

            {/* CUSTOMER */}
            <div className="receipt-customer">
              <div><strong>{t("العميل","Customer")}:</strong> {printOrder.customerName}</div>
              <div dir="ltr" style={{ textAlign: lang === "ar" ? "right" : "left" }}>
                <strong>{t("الجوال","Phone")}:</strong> {printOrder.customerPhone}
              </div>
              <div className="receipt-payment-method">{paymentLabel(printOrder.paymentMethod)}</div>
            </div>

            {/* ITEMS TABLE */}
            <div className="receipt-items">
              <div className="receipt-table-header">
                <span className="rth-name">{t("الصنف","Item")}</span>
                <span className="rth-qty">{t("الكمية","Qty")}</span>
                <span className="rth-price">{t("السعر","Price")}</span>
                <span className="rth-total">{t("المجموع","Total")}</span>
              </div>
              {printOrder.items.map((itm, idx) => {
                const parsed = parseItemExtras(itm.name);
                return (
                  <div key={idx}>
                    <div className="receipt-table-row">
                      <span className="rth-name">{parsed.baseName}{parsed.variant ? ` (${parsed.variant})` : ""}</span>
                      <span className="rth-qty">{itm.quantity}</span>
                      <span className="rth-price">{itm.price.toFixed(2)}</span>
                      <span className="rth-total">{(itm.price * itm.quantity).toFixed(2)}</span>
                    </div>
                    {parsed.extras && <div className="receipt-item-extras">+ {parsed.extras}</div>}
                  </div>
                );
              })}
            </div>

            {/* TOTALS */}
            <div className="receipt-totals">
              <div className="receipt-totals-row">
                <span>{t("مجموع الأصناف","Items Total")}</span>
                <span>{pSubtotal.toFixed(2)} SAR</span>
              </div>
              {pDelivery > 0 && (
                <div className="receipt-totals-row">
                  <span>{t("رسوم التوصيل","Delivery")}</span>
                  <span>{pDelivery.toFixed(2)} SAR</span>
                </div>
              )}
              <div className="receipt-totals-row">
                <span>{t("ضريبة القيمة المضافة (VAT 0%)","VAT 0%")}</span>
                <span>0.00 SAR</span>
              </div>
              <div className="receipt-totals-grand">
                <span>{t("الإجمالي","Total")}</span>
                <span>{printOrder.total.toFixed(2)} SAR</span>
              </div>
            </div>

            {/* NOTES */}
            {printOrder.diningType === "delivery" && (printOrder.deliveryMapLink || printOrder.deliveryAddress) && (
              <div className="receipt-customer-notes">
                <div className="receipt-customer-notes-label">{t("موقع التوصيل","Delivery Location")}</div>
                <div className="receipt-customer-notes-text">
                  {printOrder.deliveryAddress && <div>{printOrder.deliveryAddress}</div>}
                  {printOrder.deliveryMapLink && <div style={{ fontSize: "10px", wordBreak: "break-all", marginTop: "2px" }}>{printOrder.deliveryMapLink}</div>}
                </div>
              </div>
            )}
            {printOrder.customerNotes && (
              <div className="receipt-customer-notes">
                <div className="receipt-customer-notes-label">{t("ملاحظة العميل","Customer Note")}</div>
                <div className="receipt-customer-notes-text">{printOrder.customerNotes}</div>
              </div>
            )}

            {/* FOOTER BADGE */}
            <div className="receipt-badge-row">
              <span className="receipt-badge">{pDining}</span>
              <span className="receipt-badge-text">{t("العميل","Customer")}: {printOrder.customerName}</span>
            </div>

            {/* QR CODE */}
            <div className="receipt-qr-wrap">
              {printQrDataUrl && <img src={printQrDataUrl} className="receipt-qr" alt="QR" />}
              <div className="receipt-qr-hint">{t("امسح الرمز للتحقق من الطلب","Scan to verify order")}</div>
            </div>

            {/* DISCLAIMER */}
            <div className="receipt-disclaimer">
              {t("المنصة غير خاضعة لضريبة القيمة المضافة","Platform not subject to VAT")}
            </div>
          </div>
        );
      })()}

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
  const [productPricingType, setProductPricingType] = useState<"fixed" | "variable">("fixed");
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [productExtras, setProductExtras] = useState<ProductAddon[]>([]);
  const [productRemovals, setProductRemovals] = useState<{ name: string }[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null);
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(null);

  // Use the Firestore document ID (id) first; fall back to the uid field
  const uid = merchant?.id || merchant?.uid;

  useEffect(() => {
    if (!uid) return;
    fetchProducts();
  }, [uid]);

  async function fetchProducts() {
    if (!uid) return;
    try {
      const productsRef = collection(db, "merchants", uid, "products");
      const snap = await getDocs(productsRef);
      const prods: Product[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Product));
      prods.sort((a: any, b: any) => ((b as any).createdAt || "").localeCompare((a as any).createdAt || ""));
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
    setProductPricingType("fixed");
    setProductVariants([]);
    setProductExtras([]);
    setProductRemovals([]);
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
    const pt = (product as any).pricingType || (product.variants && product.variants.length > 0 ? "variable" : "fixed");
    setProductPricingType(pt);
    setProductVariants(product.variants || []);
    setProductExtras((product as any).extras || product.addons || []);
    setProductRemovals((product as any).removals || []);
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
    const isVariablePricingValid = productPricingType === "variable" && productVariants.some(v => v.name.trim());
    const isFixedPricingValid = productPricingType === "fixed" && productPrice.trim();
    if (!productName.trim() || !productCategory.trim() || (!isVariablePricingValid && !isFixedPricingValid)) return;
    setSavingProduct(true);
    try {
      let imageUrl = productImagePreview || "";

      if (productImage) {
        const formData = new FormData();
        formData.append("image", productImage);
        try {
          const uploadRes = await fetch("/api/upload-image", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.url || imageUrl;
          }
        } catch (uploadErr) {
        }
      }

      const cleanVariants = productVariants.filter(v => v.name.trim());
      const cleanExtras = productExtras.filter(a => a.name.trim());
      const cleanRemovals = productRemovals.filter(r => r.name.trim());
      const resolvedPrice = productPricingType === "fixed"
        ? parseFloat(productPrice) || 0
        : (cleanVariants.length > 0 ? Math.min(...cleanVariants.map(v => v.price)) : 0);

      const productData: Record<string, any> = {
        merchantId: uid,
        name: productName.trim(),
        price: resolvedPrice,
        pricingType: productPricingType,
        category: productCategory.trim(),
        description: productDescription.trim(),
        imageUrl,
        visible: editingProduct ? (editingProduct as any).visible ?? true : true,
        variants: cleanVariants,
        addons: cleanExtras,
        extras: cleanExtras,
        removals: cleanRemovals,
      };

      if (editingProduct) {
        await updateDoc(doc(db, "merchants", uid!, "products", editingProduct.id), productData);
      } else {
        productData.createdAt = new Date().toISOString();
        const newRef = await addDoc(collection(db, "merchants", uid!, "products"), productData);
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

  const merchantStoreSlug = (merchant as any)?.storeSlug as string | undefined;
  const menuUrl = merchantStoreSlug
    ? `${window.location.origin}/online-order/${merchantStoreSlug}`
    : `${window.location.origin}/menu/${uid}`;

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
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs text-muted-foreground">{t("رابط الطلب أونلاين", "Online Order Link")}</p>
                {merchantStoreSlug ? (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                    {t("رابط مخصص", "Custom URL")}
                  </span>
                ) : (
                  <span className="text-[10px] text-white/25">{t("(يمكنك تخصيصه في الإعدادات)", "(customize in Settings)")}</span>
                )}
              </div>
              <p className="text-sm text-white/70 truncate font-mono" data-testid="text-menu-url">{menuUrl}</p>
            </div>
            <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-9 px-4 rounded-lg font-semibold shrink-0" onClick={() => { navigator.clipboard.writeText(menuUrl); toast({ title: t("تم النسخ", "Copied") }); }} data-testid="button-copy-menu-url">
              {t("نسخ الرابط", "Copy Link")}
            </Button>
          </div>
          {!merchantStoreSlug && (
            <div className="p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.12)" }} dir="rtl">
              <p className="text-xs leading-relaxed" style={{ color: "rgba(167,139,250,0.7)" }}>
                🔗 {t("نصيحة: أضف رابطاً مخصصاً لمتجرك من الإعدادات → عام → 'رابط المتجر المخصص' لتحصل على رابط احترافي وسهل التذكر", "Tip: Add a custom URL for your store from Settings → General → 'Custom Store URL' for a professional, easy-to-remember link")}
              </p>
            </div>
          )}
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

      <AiMenuAdder
        merchant={merchant}
        uid={uid}
        t={t}
        lang={lang}
        onProductCreated={() => fetchProducts()}
        onEditProduct={(product: Product) => openEditDialog(product)}
      />

      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="bg-[#111] border-white/[0.06] max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-base font-bold">
              {editingProduct ? t("تعديل المنتج", "Edit Product") : t("إضافة منتج جديد", "Add New Product")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-0 py-2" dir="rtl">
            {/* ── Section A: Basic Info ── */}
            <div className="px-6 pt-4 pb-5 space-y-4 border-b border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t("المعلومات الأساسية", "Basic Info")}</p>

              <div className="flex items-start gap-4">
                <label className="cursor-pointer flex-shrink-0" data-testid="label-product-image">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} data-testid="input-product-image" />
                  {productImagePreview ? (
                    <div className="relative group">
                      <img src={productImagePreview} alt="" className="w-20 h-20 rounded-xl object-cover border border-white/[0.08]" />
                      <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Pencil className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-white/[0.03] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 hover:border-white/20 transition-colors">
                      <Image className="w-6 h-6 text-white/20" />
                      <span className="text-[9px] text-white/30">{t("صورة", "Photo")}</span>
                    </div>
                  )}
                </label>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-[11px] text-white/40 mb-1 block">{t("اسم المنتج", "Product Name")} <span className="text-red-500">*</span></label>
                    <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={t("مثال: برجر لحم مشوي", "e.g. Grilled Beef Burger")} className="h-10 bg-black/40 border-white/10 text-white placeholder:text-white/20" dir="rtl" data-testid="input-product-name" />
                  </div>
                  <div className="relative">
                    <label className="text-[11px] text-white/40 mb-1 block">{t("الفئة", "Category")} <span className="text-red-500">*</span></label>
                    <Input value={productCategory} onChange={(e) => { setProductCategory(e.target.value); setProductCategoryOpen(true); }} onFocus={() => setProductCategoryOpen(true)} onBlur={() => setTimeout(() => setProductCategoryOpen(false), 150)} placeholder={t("مشروبات، وجبات رئيسية...", "Drinks, Main Meals...")} className="h-10 bg-black/40 border-white/10 text-white placeholder:text-white/20" dir="rtl" data-testid="input-product-category" />
                    {productCategoryOpen && (() => {
                      const existingCats = Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c && c.trim() !== "")));
                      const filtered = existingCats.filter(c => c.toLowerCase().includes(productCategory.toLowerCase()));
                      const showCreate = productCategory.trim() !== "" && !existingCats.some(c => c.toLowerCase() === productCategory.trim().toLowerCase());
                      if (filtered.length === 0 && !showCreate) return null;
                      return (
                        <div className="absolute z-50 top-full mt-1 w-full rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl overflow-hidden">
                          {filtered.map(cat => (<button key={cat} type="button" onMouseDown={() => { setProductCategory(cat); setProductCategoryOpen(false); }} className="w-full text-start px-3 py-2.5 text-sm text-white hover:bg-white/[0.06] transition-colors" data-testid={`category-option-${cat}`}>{cat}</button>))}
                          {showCreate && (<button type="button" onMouseDown={() => setProductCategoryOpen(false)} className="w-full text-start px-3 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors border-t border-white/[0.06] flex items-center gap-2" data-testid="category-create-new"><Plus className="w-3.5 h-3.5" />{t("إنشاء:", "Create:")} <span className="font-semibold">{productCategory.trim()}</span></button>)}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/40 mb-1 block">{t("الوصف (اختياري)", "Description (optional)")}</label>
                <Input value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder={t("مثال: جبنة شيدر، صوص الترافل، خبز بريوش", "e.g. Cheddar cheese, truffle sauce, brioche bun")} className="h-10 bg-black/40 border-white/10 text-white placeholder:text-white/20" dir="rtl" data-testid="input-product-description" />
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
            {/* ── Section B: Pricing ── */}
            <div className="px-6 pt-4 pb-5 space-y-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t("التسعير", "Pricing")}</p>
                <div className="flex items-center gap-1 p-0.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setProductPricingType("fixed")}
                    className={`px-3 py-1 text-xs rounded-md transition-all font-medium ${productPricingType === "fixed" ? "bg-blue-600 text-white shadow" : "text-white/40 hover:text-white/70"}`}
                    data-testid="button-pricing-fixed"
                  >
                    {t("سعر ثابت", "Fixed")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductPricingType("variable")}
                    className={`px-3 py-1 text-xs rounded-md transition-all font-medium ${productPricingType === "variable" ? "bg-violet-600 text-white shadow" : "text-white/40 hover:text-white/70"}`}
                    data-testid="button-pricing-variable"
                  >
                    {t("أحجام / متغير", "Sizes")}
                  </button>
                </div>
              </div>

              {productPricingType === "fixed" ? (
                <div>
                  <label className="text-[11px] text-white/40 mb-1 block">{t("السعر الأساسي (ريال)", "Base Price (SAR)")} <span className="text-red-500">*</span></label>
                  <Input type="number" step="0.01" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="0.00" className="h-11 bg-black/40 border-white/10 text-white placeholder:text-white/20 font-mono text-lg" dir="ltr" data-testid="input-product-price" />
                  <p className="text-[10px] text-white/25 mt-1">{t("مثالي للمنتجات البسيطة مثل الماء أو القهوة العادية", "Ideal for simple items like water or regular coffee")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-white/40">{t("أضف أحجاماً مع سعر لكل حجم", "Add sizes with a price for each")}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">{t("مثال: صغير 15، وسط 20، كبير 25", "e.g. Small 15, Medium 20, Large 25")}</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => setProductVariants([...productVariants, { name: "", price: 0 }])} className="h-8 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10 rounded-lg gap-1 flex-shrink-0" data-testid="button-add-variant">
                      <Plus className="w-3 h-3" />{t("إضافة حجم", "Add Size")}
                    </Button>
                  </div>
                  {productVariants.length === 0 && (
                    <div className="text-center py-4 rounded-xl border border-dashed border-white/[0.06] text-white/20 text-xs">{t("لا توجد أحجام بعد — اضغط «إضافة حجم»", "No sizes yet — press «Add Size»")}</div>
                  )}
                  <div className="space-y-2">
                    {productVariants.map((variant, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]" data-testid={`variant-row-${i}`}>
                        <Input value={variant.name} onChange={(e) => { const u = [...productVariants]; u[i] = { ...u[i], name: e.target.value }; setProductVariants(u); }} placeholder={t("الحجم (مثال: صغير)", "Size (e.g. Small)")} className="flex-1 h-9 text-sm bg-black/40 border-white/10 text-white placeholder:text-white/20" dir="rtl" data-testid={`input-variant-name-${i}`} />
                        <Input type="number" step="0.01" value={variant.price || ""} onChange={(e) => { const u = [...productVariants]; u[i] = { ...u[i], price: parseFloat(e.target.value) || 0 }; setProductVariants(u); }} placeholder="0.00" className="w-20 h-9 text-sm bg-black/40 border-white/10 text-white placeholder:text-white/20 text-center font-mono" dir="ltr" data-testid={`input-variant-price-${i}`} />
                        <Button type="button" size="icon" variant="ghost" onClick={() => setProductVariants(productVariants.filter((_, idx) => idx !== i))} className="w-8 h-8 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0" data-testid={`button-remove-variant-${i}`}><X className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                  {productVariants.length > 0 && (
                    <p className="text-[10px] text-white/30 text-center">{t("سيُعرض للعميل أدنى سعر في قائمة المنتجات", "Lowest price shown on product listing")}</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Section C: Extras (paid) ── */}
            <div className="px-6 pt-4 pb-5 space-y-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t("الإضافات (مدفوعة)", "Extras (Paid)")}</p>
                  <p className="text-[10px] text-white/20 mt-0.5">{t("مثال: جبنة إضافية +3 ريال", "e.g. Extra cheese +3 SAR")}</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setProductExtras([...productExtras, { name: "", price: 0 }])} className="h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-1 flex-shrink-0" data-testid="button-add-extra">
                  <Plus className="w-3 h-3" />{t("إضافة", "Add")}
                </Button>
              </div>
              {productExtras.length === 0 ? (
                <p className="text-[10px] text-white/15 text-center py-2">{t("اختياري — لا يظهر للعميل إن كان فارغاً", "Optional — hidden from customer if empty")}</p>
              ) : (
                <div className="space-y-2">
                  {productExtras.map((extra, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]" data-testid={`extra-row-${i}`}>
                      <Input value={extra.name} onChange={(e) => { const u = [...productExtras]; u[i] = { ...u[i], name: e.target.value }; setProductExtras(u); }} placeholder={t("اسم الإضافة", "Extra name")} className="flex-1 h-9 text-sm bg-black/40 border-white/10 text-white placeholder:text-white/20" dir="rtl" data-testid={`input-extra-name-${i}`} />
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[10px] text-white/30">+</span>
                        <Input type="number" step="0.01" value={extra.price || ""} onChange={(e) => { const u = [...productExtras]; u[i] = { ...u[i], price: parseFloat(e.target.value) || 0 }; setProductExtras(u); }} placeholder="0.00" className="w-16 h-9 text-sm bg-black/40 border-white/10 text-white placeholder:text-white/20 text-center font-mono" dir="ltr" data-testid={`input-extra-price-${i}`} />
                        <span className="text-[10px] text-white/30">{t("ر", "SAR")}</span>
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setProductExtras(productExtras.filter((_, idx) => idx !== i))} className="w-8 h-8 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0" data-testid={`button-remove-extra-${i}`}><X className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section D: Modifications (free) ── */}
            <div className="px-6 pt-4 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t("التعديلات (مجانية)", "Modifications (Free)")}</p>
                  <p className="text-[10px] text-white/20 mt-0.5">{t("مثال: بدون بصل، صوص جانبي", "e.g. No onion, sauce on side")}</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setProductRemovals([...productRemovals, { name: "" }])} className="h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-lg gap-1 flex-shrink-0" data-testid="button-add-removal">
                  <Plus className="w-3 h-3" />{t("إضافة", "Add")}
                </Button>
              </div>
              {productRemovals.length === 0 ? (
                <p className="text-[10px] text-white/15 text-center py-2">{t("اختياري — لا يظهر للعميل إن كان فارغاً", "Optional — hidden from customer if empty")}</p>
              ) : (
                <div className="space-y-2">
                  {productRemovals.map((removal, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]" data-testid={`removal-row-${i}`}>
                      <Input value={removal.name} onChange={(e) => { const u = [...productRemovals]; u[i] = { name: e.target.value }; setProductRemovals(u); }} placeholder={t("مثال: بدون بصل", "e.g. No onion")} className="flex-1 h-9 text-sm bg-black/40 border-white/10 text-white placeholder:text-white/20" dir="rtl" data-testid={`input-removal-name-${i}`} />
                      <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400/60 rounded-full flex-shrink-0">{t("مجاني", "Free")}</span>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setProductRemovals(productRemovals.filter((_, idx) => idx !== i))} className="w-8 h-8 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0" data-testid={`button-remove-removal-${i}`}><X className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3 bg-[#0d0d0d]">
            <Button variant="outline" onClick={() => setShowProductDialog(false)} className="border-white/10 text-white/60 rounded-xl">{t("إلغاء", "Cancel")}</Button>
            <Button
              onClick={handleSaveProduct}
              disabled={
                !productName.trim() || !productCategory.trim() ||
                (productPricingType === "fixed" ? !productPrice.trim() : !productVariants.some(v => v.name.trim())) ||
                savingProduct
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 font-bold"
              data-testid="button-save-product"
            >
              {savingProduct ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
              {t("حفظ المنتج", "Save Product")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AiMenuAdder({
  merchant,
  uid,
  t,
  lang,
  onProductCreated,
  onEditProduct,
}: {
  merchant: any;
  uid: string | undefined;
  t: (ar: string, en: string) => string;
  lang: string;
  onProductCreated: () => void;
  onEditProduct: (product: Product) => void;
}) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedProducts, setGeneratedProducts] = useState<Array<{ name: string; description: string; imageUrl: string; category: string; id?: string }>>([]);
  const [savingToFirestore, setSavingToFirestore] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim() || !uid) return;
    setGenerating(true);
    setGeneratedProducts([]);
    try {
      const res = await fetch("/api/ai/generate-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), merchantId: uid }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(err.message || "Failed to generate");
      }
      const data = await res.json();
      const products = data.products || [];

      setSavingToFirestore(true);
      const savedProducts: typeof generatedProducts = [];
      for (const product of products) {
        try {
          const productData = {
            merchantId: uid,
            name: product.name,
            price: 0,
            pricingType: "fixed",
            category: product.category || "",
            description: product.description || "",
            imageUrl: product.imageUrl || "",
            visible: false,
            variants: [],
            addons: [],
            extras: [],
            removals: [],
            createdAt: new Date().toISOString(),
          };
          const newRef = await addDoc(collection(db, "merchants", uid, "products"), productData);
          savedProducts.push({
            name: product.name,
            description: product.description,
            imageUrl: product.imageUrl || "",
            category: product.category || "",
            id: newRef.id,
          });
        } catch (saveErr) {
          console.error("[AI-Menu] Failed to save product:", product.name, saveErr);
        }
      }

      setGeneratedProducts(savedProducts);
      setSavingToFirestore(false);
      onProductCreated();
      toast({
        title: t("تم بنجاح! ✨", "Success! ✨"),
        description: t(
          `تم إنشاء ${savedProducts.length} منتج كمسودة`,
          `Created ${savedProducts.length} draft products`
        ),
      });
    } catch (err: any) {
      console.error("[AI-Menu] Generate error:", err);
      toast({
        title: t("خطأ", "Error"),
        description: err.message || t("فشل إنشاء المنيو", "Failed to generate menu"),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
      setSavingToFirestore(false);
    }
  }

  function handleEditPrice(product: typeof generatedProducts[0]) {
    if (!product.id) return;
    const fullProduct: Product = {
      id: product.id,
      merchantId: uid || "",
      name: product.name,
      price: 0,
      pricingType: "fixed",
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
      visible: false,
      variants: [],
      addons: [],
      extras: [],
      removals: [],
      createdAt: new Date().toISOString(),
    };
    onEditProduct(fullProduct);
  }

  return (
    <Card className="border-white/[0.06] bg-[#111] rounded-2xl overflow-hidden" data-testid="ai-menu-adder">
      <CardContent className="p-0">
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">{t("إضافة المنيو بلمحة ✨", "Smart Menu Adder ✨")}</h3>
          </div>
          <p className="text-xs text-white/40">
            {t(
              "اكتب وصف بالعربي وراح نولّد لك المنيو بالذكاء الاصطناعي مع الصور",
              "Write a description in Arabic and we'll generate your menu with AI including images"
            )}
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t(
                "مثال: أضف 5 أنواع برجر مع الوصف والصور",
                "e.g. Add 5 types of burgers with descriptions and images"
              )}
              className="bg-black/40 border-white/10 text-white placeholder:text-white/20 min-h-[80px] resize-none"
              dir="rtl"
              disabled={generating}
              data-testid="input-ai-prompt"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl h-11 font-bold gap-2"
            data-testid="button-ai-generate"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {savingToFirestore
                  ? t("جاري الحفظ...", "Saving...")
                  : t("الأرنب يطبخ المنيو... 👨‍🍳", "Cooking your menu... 👨‍🍳")}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t("ولّد المنيو بالذكاء الاصطناعي", "Generate Menu with AI")}
              </>
            )}
          </Button>
        </div>

        {generatedProducts.length > 0 && (
          <div className="border-t border-white/[0.06]">
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
                {t(`تم إنشاء ${generatedProducts.length} منتج`, `${generatedProducts.length} Products Created`)}
              </p>
            </div>
            <div className="px-5 pb-5 space-y-3">
              {generatedProducts.map((product, i) => (
                <div
                  key={product.id || i}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  data-testid={`ai-product-${product.id || i}`}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-white/[0.06]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-white/[0.03] flex items-center justify-center flex-shrink-0 border border-white/[0.06]">
                      <Image className="w-5 h-5 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{product.description}</p>
                    )}
                    {product.category && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-400/70 rounded-2xl px-1.5 py-0 mt-1">
                        {product.category}
                      </Badge>
                    )}
                  </div>
                  {product.id ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditPrice(product)}
                      className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-8 px-3 rounded-lg text-xs font-semibold flex-shrink-0"
                      data-testid={`button-edit-price-${product.id}`}
                    >
                      {t("تعديل السعر", "Edit Price")}
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-red-500/20 text-red-400/70 rounded-2xl px-2 py-0.5 flex-shrink-0">
                      {t("فشل الحفظ", "Save failed")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrackingView({
  merchant,
  t,
  lang,
}: {
  merchant: any;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [liveTotalShareClicks, setLiveTotalShareClicks] = useState<number>(0);
  const [liveUniqueSharesCount, setLiveUniqueSharesCount] = useState<number>(0);

  type Period = "thisMonth" | "lastMonth" | "custom";
  const [period, setPeriod] = useState<Period>("thisMonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!merchant?.uid) return;
    fetch(`/api/feedback/${merchant.uid}`, { headers: { "x-merchant-email": merchant.email || "" } })
      .then(r => r.ok ? r.json() : { feedbacks: [] })
      .then(d => setFeedbacks(d.feedbacks || []))
      .catch(() => {});
  }, [merchant?.uid]);

  useEffect(() => {
    if (!merchant?.uid) return;
    const unsub = onSnapshot(doc(db, "merchants", merchant.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setLiveTotalShareClicks(d.totalShareClicks ?? 0);
        setLiveUniqueSharesCount(d.uniqueSharesCount ?? 0);
      }
    });
    return () => unsub();
  }, [merchant?.uid]);

  function getMonthRange(offsetMonths: number): { startDate: string; endDate: string } {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + offsetMonths;
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0));
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  function fetchRange(startDate: string, endDate: string) {
    if (!merchant?.uid) return;
    setLoading(true);
    fetch(`/api/merchant-tracking/${merchant.uid}/range?startDate=${startDate}&endDate=${endDate}`, {
      headers: { "x-merchant-email": merchant.email || "" },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    if (!merchant?.uid) return;
    if (period === "thisMonth") {
      const { startDate, endDate } = getMonthRange(0);
      fetchRange(startDate, endDate);
    } else if (period === "lastMonth") {
      const { startDate, endDate } = getMonthRange(-1);
      fetchRange(startDate, endDate);
    }
  }, [merchant?.uid, period]);

  function applyCustomRange() {
    if (!customStart || !customEnd) return;
    if (customStart > customEnd) return;
    fetchRange(customStart, customEnd);
    setShowCustom(false);
  }

  const dir = lang === "ar" ? "rtl" : "ltr";
  const linkVisits = data?.linkVisits ?? 0;
  const completedOrders = data?.completedOrders ?? 0;
  const abandonedCarts = data?.abandonedCarts ?? 0;
  const conversionRate = data?.conversionRate ?? 0;
  const googleMapsClicks = data?.googleMapsClicks ?? 0;
  const tableQrClicks = data?.tableQrClicks ?? 0;
  const totalShareClicks = data?.totalShareClicks ?? 0;
  const uniqueSharesCount = data?.uniqueSharesCount ?? 0;
  const isRangeData = data?.isRangeData ?? false;

  const topCards = [
    {
      label: t("زيارات الرابط", "Link Visits"),
      sublabel: t("صفحة المنيو", "Menu page"),
      value: linkVisits,
      color: "#60a5fa",
      border: "rgba(96,165,250,0.20)",
      bg: "rgba(59,130,246,0.07)",
      Icon: Globe,
      testId: "track-link-visits",
    },
    {
      label: t("نقرات رابط التقييم", "Review Link Clicks"),
      sublabel: t("خرائط جوجل", "Google Maps"),
      value: googleMapsClicks,
      color: "#fbbf24",
      border: "rgba(251,191,36,0.35)",
      bg: "rgba(251,191,36,0.09)",
      Icon: Star,
      testId: "track-maps-clicks",
    },
  ];

  const bottomCards = [
    {
      label: t("طلبات مكتملة", "Completed Orders"),
      sublabel: t("أُنجزت بنجاح", "Fulfilled successfully"),
      value: completedOrders,
      color: "#34d399",
      border: "rgba(52,211,153,0.20)",
      bg: "rgba(52,211,153,0.07)",
      Icon: CheckCircle,
      testId: "track-completed-orders",
    },
    {
      label: t("طلبات لم تكتمل", "Abandoned Carts"),
      sublabel: t("غادرت دون طلب", "Left without ordering"),
      value: abandonedCarts,
      color: "#f87171",
      border: "rgba(248,113,113,0.20)",
      bg: "rgba(248,113,113,0.07)",
      Icon: ShoppingBag,
      testId: "track-abandoned-carts",
    },
    {
      label: t("دخول طلبات الطاولة", "Table QR Entries"),
      sublabel: t("عبر كيو آر الطاولة", "Via table QR code"),
      value: tableQrClicks,
      color: "#fb923c",
      border: "rgba(251,146,60,0.20)",
      bg: "rgba(251,146,60,0.07)",
      Icon: QrCode,
      testId: "track-table-qr-clicks",
    },
  ];

  const renderCard = ({ label, sublabel, value, color, border, bg, Icon, testId }: typeof topCards[0]) => (
    <div key={label} className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 shrink-0" style={{ color }} />
        <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>{label}</p>
      </div>
      <p className="text-3xl font-black tabular-nums" style={{ color }} data-testid={testId}>{value.toLocaleString()}</p>
      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>{sublabel}</p>
    </div>
  );

  const periodLabels: Record<string, { ar: string; en: string }> = {
    thisMonth:  { ar: "هذا الشهر",  en: "This Month"  },
    lastMonth:  { ar: "الشهر الماضي", en: "Last Month" },
    custom:     { ar: "مخصص",       en: "Custom"      },
  };

  return (
    <div dir={dir} style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }} className="space-y-4 p-4 max-w-2xl mx-auto">

      {/* ── Header + Filter bar ── */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">{t("تتبع عملاءك", "Customer Tracking")}</h2>
          <p className="text-sm text-white/40 mt-0.5">{t("رصد الزيارات والسلوك الشرائي", "Monitor visits and purchase behaviour")}</p>
        </div>

        {/* Period filter */}
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-0.5">
            <CalendarDays className="w-3.5 h-3.5 text-white/40" />
            <p className="text-xs text-white/40">{t("اختر الفترة الزمنية", "Select time period")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["thisMonth", "lastMonth", "custom"] as const).map(p => (
              <button
                key={p}
                data-testid={`period-btn-${p}`}
                onClick={() => {
                  setPeriod(p);
                  if (p === "custom") setShowCustom(true);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={period === p
                  ? { background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.45)", color: "#fca5a5" }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.5)" }
                }
              >
                {lang === "ar" ? periodLabels[p].ar : periodLabels[p].en}
              </button>
            ))}
          </div>

          {/* Custom range inputs */}
          {(period === "custom" || showCustom) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                data-testid="input-custom-start"
                className="rounded-lg px-3 py-1.5 text-xs text-white/80 outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
              <span className="text-white/30 text-xs">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                data-testid="input-custom-end"
                className="rounded-lg px-3 py-1.5 text-xs text-white/80 outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
              <button
                onClick={applyCustomRange}
                data-testid="btn-apply-range"
                disabled={!customStart || !customEnd || customStart > customEnd}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5" }}
              >
                {t("تطبيق", "Apply")}
              </button>
            </div>
          )}

          {/* Period label chip */}
          {!loading && data && (
            <p className="text-[10px] text-white/25 mt-0.5">
              {isRangeData
                ? t("بيانات الفترة المحددة فقط (منذ تفعيل التتبع اليومي)", "Data for selected period only (since daily tracking activation)")
                : t("إجمالي كل الأوقات", "All-time totals")
              }
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Activity className="w-8 h-8 animate-pulse text-white/20" />
        </div>
      ) : (
        <>
          {/* ── Row 1: 2 traffic cards ── */}
          <div className="grid grid-cols-2 gap-3">
            {topCards.map(renderCard)}
          </div>

          {/* ── Row 2: 3 order cards ── */}
          <div className="grid grid-cols-3 gap-3">
            {bottomCards.map(renderCard)}
          </div>

          {/* ── Row 3: 2 viral metric cards — live onSnapshot ── */}
          <div className="grid grid-cols-2 gap-3">
            {renderCard({
              label: t("مجموع نقرات المشاركة", "Total Share Clicks"),
              sublabel: t("إجمالي نقرات زر شارك اللحظة", "Total share button clicks"),
              value: liveTotalShareClicks,
              color: "#e879f9",
              border: "rgba(232,121,249,0.20)",
              bg: "rgba(168,85,247,0.07)",
              Icon: Share2,
              testId: "track-total-share-clicks",
            })}
            {renderCard({
              label: t("عدد الذين شاركوا", "Unique Sharers"),
              sublabel: t("أشخاص فريدون ضغطوا مشاركة", "Unique sessions that shared"),
              value: liveUniqueSharesCount,
              color: "#a78bfa",
              border: "rgba(167,139,250,0.20)",
              bg: "rgba(139,92,246,0.07)",
              Icon: Eye,
              testId: "track-unique-shares-count",
            })}
          </div>

          {/* ── Conversion rate banner ── */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-1">{t("معدل التحويل", "Conversion Rate")}</p>
                <p className="text-5xl font-black text-blue-300" data-testid="track-conversion-rate">{conversionRate}%</p>
                <p className="text-xs text-white/30 mt-2">{t("نسبة الطلبات المكتملة من إجمالي الزيارات", "Completed orders / Total visits")}</p>
              </div>
              <Activity className="w-16 h-16 text-blue-500/10" />
            </div>
          </div>

          {/* ── Maps clicks note ── */}
          <div className="rounded-xl px-4 py-3 flex items-start gap-2" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
            <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(251,191,36,0.7)" }}>
              {t(
                "نقرات رابط التقييم تُعدّ منفصلة تماماً — تُسجَّل فقط عند ضغط العميل على رابط تقييم جوجل في صفحة تتبع الطلب.",
                "Review link clicks are tracked separately — recorded only when a customer taps the Google Maps review link on the order tracking page."
              )}
            </p>
          </div>
        </>
      )}

      {/* Star Breakdown */}
      {feedbacks.length > 0 && (
        <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4" data-testid="section-tracking-star-breakdown">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">{t("توزيع تقييمات العملاء", "Rating Distribution")}</h3>
            <span className="text-[10px] text-white/30">{feedbacks.length} {t("تقييم", "ratings")}</span>
          </div>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(s => {
              const cnt = feedbacks.filter(f => f.stars === s).length;
              const pct = feedbacks.length > 0 ? Math.round((cnt / feedbacks.length) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-2.5" data-testid={`tracking-star-${s}`}>
                  <div className="flex items-center gap-0.5 w-14 justify-end shrink-0" dir="ltr">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-[10px]" style={{ color: i < s ? "#f59e0b" : "rgba(255,255,255,0.1)" }}>★</span>
                    ))}
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: s >= 4 ? "#10b981" : s === 3 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0 w-14 justify-end">
                    <span className="text-xs text-white/40">{cnt}</span>
                    <span className="text-[10px] text-white/20">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
            <span className="text-[10px] text-white/30">{t("متوسط التقييم", "Avg Rating")}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-amber-400">
                {feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + (f.stars || 0), 0) / feedbacks.length).toFixed(1) : "—"}
              </span>
              <span className="text-amber-400 text-xs">★</span>
            </div>
          </div>
        </div>
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
  const [feedbacksForAnalytics, setFeedbacksForAnalytics] = useState<any[]>([]);

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

  useEffect(() => {
    if (!merchant?.uid) return;
    fetch(`/api/feedback/${merchant.uid}`, { headers: { "x-merchant-email": merchant.email || "" } })
      .then(r => r.ok ? r.json() : { feedbacks: [] })
      .then(d => setFeedbacksForAnalytics((d.feedbacks || []).slice(0, 20)))
      .catch(() => {});
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

          {/* ===== BEST SELLERS ===== */}
          {analyticsData?.bestSellers?.length > 0 && (
            <div data-testid="section-best-sellers">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">{t("الأكثر مبيعاً", "Best Sellers")}</h3>
              <div className="space-y-2">
                {analyticsData.bestSellers.slice(0, 3).map((item: any, i: number) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const colors = ["from-amber-500/15", "from-slate-400/10", "from-orange-600/10"];
                  const barColors = ["bg-amber-400", "bg-slate-400", "bg-orange-500"];
                  const maxCount = analyticsData.bestSellers[0]?.count || 1;
                  const pct = Math.round((item.count / maxCount) * 100);
                  return (
                    <div
                      key={i}
                      className={`rounded-xl bg-gradient-to-r ${colors[i]} to-[#111] border border-white/[0.06] p-3 flex items-center gap-3`}
                      data-testid={`card-bestseller-${i}`}
                    >
                      <span className="text-2xl leading-none" aria-hidden="true">{medals[i]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-bold text-white truncate">{item.name}</p>
                          <div className="flex items-center gap-2 shrink-0 ms-2">
                            <span className="text-xs text-white/50 font-mono">{item.count}×</span>
                            <span className="text-xs font-bold text-emerald-400">{item.revenue.toFixed(0)} SAR</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className={`h-full rounded-full ${barColors[i]} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== PEAK HOURS ===== */}
          {analyticsData?.peakHours && (
            <div data-testid="section-peak-hours">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">{t("ساعات الذروة", "Peak Hours")}</h3>
              <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={analyticsData.peakHours.filter((h: any) => h.count > 0).length > 0 ? analyticsData.peakHours : analyticsData.peakHours.map((h: any) => ({ ...h, count: 0 }))} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
                      tickFormatter={(v) => `${v}:00`}
                      interval={3}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 11 }}
                      formatter={(v: any) => [v, lang === "ar" ? "طلبات" : "Orders"]}
                      labelFormatter={(v) => `${v}:00`}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {analyticsData.peakHours.map((_: any, i: number) => (
                        <Cell key={i} fill={analyticsData.peakHours[i]?.count > 0 ? "#ef4444" : "rgba(255,255,255,0.06)"} opacity={0.7 + 0.3 * (analyticsData.peakHours[i]?.count / (Math.max(...analyticsData.peakHours.map((h: any) => h.count), 1)))} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {analyticsData.peakHours.every((h: any) => h.count === 0) && (
                  <p className="text-center text-xs text-white/30 mt-2">{t("لا توجد بيانات بعد", "No data yet")}</p>
                )}
              </div>
            </div>
          )}

          {/* ===== FEEDBACK GATEKEEPER ===== */}
          {feedbacksForAnalytics.length > 0 && (
            <div data-testid="section-feedback-gatekeeper">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">{t("بوابة التقييمات", "Feedback Gatekeeper")}</h3>
                <span className="text-[10px] text-white/30">
                  {feedbacksForAnalytics.filter((f: any) => (f.stars || f.rating) < 3).length} {t("تقييم منخفض", "low rating")}
                </span>
              </div>
              <div className="space-y-2">
                {feedbacksForAnalytics.map((fb: any, i: number) => {
                  const stars = fb.stars ?? fb.rating ?? 0;
                  const isLow = stars < 3;
                  const ts = fb.timestamp || fb.createdAt || "";
                  const dateStr = ts ? new Date(ts).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "short", day: "numeric" }) : "";
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border px-3 py-2.5 flex items-start gap-3 ${isLow ? "bg-red-500/8 border-red-500/25 shadow-[0_0_10px_rgba(239,68,68,0.08)]" : "bg-white/[0.02] border-white/[0.05]"}`}
                      data-testid={`feedback-item-${i}`}
                    >
                      {isLow && <span className="text-red-400 text-xs font-bold mt-0.5 shrink-0">⚠️</span>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {Array.from({ length: 5 }).map((_, si) => (
                            <span key={si} className={`text-sm ${si < stars ? (isLow ? "text-red-400" : "text-amber-400") : "text-white/10"}`}>★</span>
                          ))}
                          <span className="text-[10px] text-white/30 ms-1">{dateStr}</span>
                        </div>
                        {fb.comment && (
                          <p className={`text-xs leading-relaxed line-clamp-2 ${isLow ? "text-red-300/80" : "text-white/60"}`}>{fb.comment}</p>
                        )}
                        {!fb.comment && <p className="text-xs text-white/20 italic">{t("بدون تعليق", "No comment")}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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

function ReviewsView({
  merchant,
  t,
  lang,
}: {
  merchant: any;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchant?.uid) return;
    setLoading(true);
    fetch(`/api/feedback/${merchant.uid}`, { headers: { "x-merchant-email": merchant.email || "" } })
      .then(r => r.ok ? r.json() : { feedbacks: [] })
      .then(d => { setFeedbacks(d.feedbacks || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [merchant?.uid]);

  const dir = lang === "ar" ? "rtl" : "ltr";
  const lowRatings = feedbacks.filter(f => f.stars <= 3);
  const starCounts = [1, 2, 3, 4, 5].map(s => ({ star: s, count: feedbacks.filter(f => f.stars === s).length }));
  const maxCount = Math.max(...starCounts.map(s => s.count), 1);

  return (
    <div className="p-4 space-y-5 max-w-xl mx-auto w-full" dir={dir}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Star className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-base">{t("تقييمات العملاء", "Customer Reviews")}</h2>
          <p className="text-white/30 text-xs">{feedbacks.length} {t("تقييم إجمالي", "total ratings")}</p>
        </div>
      </div>

      {/* Star Breakdown */}
      {feedbacks.length > 0 && (
        <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-4" data-testid="section-star-breakdown">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">{t("توزيع التقييمات", "Rating Breakdown")}</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(s => {
              const cnt = starCounts.find(x => x.star === s)?.count || 0;
              const pct = Math.round((cnt / maxCount) * 100);
              return (
                <div key={s} className="flex items-center gap-2" data-testid={`bar-star-${s}`}>
                  <div className="flex items-center gap-0.5 w-14 justify-end shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-[10px]" style={{ color: i < s ? "#f59e0b" : "rgba(255,255,255,0.1)" }}>★</span>
                    ))}
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: s >= 4 ? "#10b981" : s === 3 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/40 w-5 text-right shrink-0">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && feedbacks.length === 0 && (
        <div className="text-center py-12" data-testid="state-no-reviews">
          <span className="text-4xl">💬</span>
          <p className="text-white/40 text-sm mt-3">{t("لا توجد تقييمات بعد", "No reviews yet")}</p>
          <p className="text-white/20 text-xs mt-1">{t("ستظهر تقييمات العملاء هنا", "Customer ratings will appear here")}</p>
        </div>
      )}

      {/* 1-3 Star Reviews (Private Feedback) */}
      {!loading && lowRatings.length > 0 && (
        <div data-testid="section-low-reviews">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
            {t("ملاحظات العملاء (سرية)", "Customer Notes (Private)")}
            <span className="ms-2 text-red-400">({lowRatings.length})</span>
          </h3>
          <div className="space-y-2">
            {lowRatings.map((fb, i) => {
              const stars = fb.stars || 0;
              const ts = fb.timestamp || "";
              const dateStr = ts ? new Date(ts).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
              return (
                <div
                  key={fb.id || i}
                  className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3"
                  data-testid={`review-item-${i}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1" dir="ltr">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <span key={si} className="text-sm" style={{ color: si < stars ? "#ef4444" : "rgba(255,255,255,0.1)" }}>★</span>
                      ))}
                    </div>
                    <span className="text-[10px] text-white/20">{dateStr}</span>
                  </div>
                  {fb.comment && (
                    <p className="text-sm text-red-300/80 leading-relaxed">{fb.comment}</p>
                  )}
                  {fb.orderType && (
                    <p className="text-[10px] text-white/20 mt-1.5">{fb.orderType}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
  businessOpenTime,
  businessCloseTime,
  t,
  lang,
}: {
  merchant: any;
  onDownloadQR: () => void;
  qrLoading: boolean;
  onlineOrdersEnabled: boolean;
  businessOpenTime: string;
  businessCloseTime: string;
  t: (ar: string, en: string) => string;
  lang: string;
}) {
  const { toast } = useToast();
  const [localOpenTime, setLocalOpenTime] = useState(businessOpenTime);
  const [localCloseTime, setLocalCloseTime] = useState(businessCloseTime);
  const [localOnlineOrdersEnabled, setLocalOnlineOrdersEnabled] = useState(onlineOrdersEnabled);

  useEffect(() => {
    setLocalOpenTime(businessOpenTime);
    setLocalCloseTime(businessCloseTime);
  }, [businessOpenTime, businessCloseTime]);

  useEffect(() => {
    setLocalOnlineOrdersEnabled(onlineOrdersEnabled);
  }, [onlineOrdersEnabled]);


  const [storeTermsEnabled, setStoreTermsEnabled] = useState<boolean>(merchant?.storeTermsEnabled || false);
  const [storeTermsText, setStoreTermsText] = useState<string>(merchant?.storeTermsText || "");
  const [storePrivacyText, setStorePrivacyText] = useState<string>(merchant?.storePrivacyText || "");
  const [storeLegalSaving, setStoreLegalSaving] = useState(false);
  const [cityCode, setCityCode] = useState<string>(merchant?.cityCode || "");
  const [moyasarPublishableKey, setMoyasarPublishableKey] = useState<string>(merchant?.moyasarPublishableKey || "");
  const [moyasarSecretKey, setMoyasarSecretKey] = useState<string>(merchant?.moyasarSecretKey || "");
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState<boolean>(merchant?.onlinePaymentEnabled || false);
  const [codEnabled, setCodEnabled] = useState<boolean>(merchant?.codEnabled !== false);
  const [deliveryEnabled, setDeliveryEnabled] = useState<boolean>(merchant?.deliveryEnabled || false);
  const [curbsideEnabled, setCurbsideEnabled] = useState<boolean>((merchant as any)?.curbsideEnabled || false);
  const [deliveryFee, setDeliveryFee] = useState<string>(merchant?.deliveryFee?.toString() || "0");
  const [deliveryRange, setDeliveryRange] = useState<string>(merchant?.deliveryRange?.toString() || "0");
  const [storeLat, setStoreLat] = useState<string>(merchant?.storeLat?.toString() || "");
  const [storeLng, setStoreLng] = useState<string>(merchant?.storeLng?.toString() || "");
  const [driverPhone, setDriverPhone] = useState<string>(merchant?.driverPhone || "");
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [storeNameEdit, setStoreNameEdit] = useState<string>(merchant?.storeName || "");
  const [whatsappEdit, setWhatsappEdit] = useState<string>(merchant?.whatsappNumber || "");
  const [branchInfoSaving, setBranchInfoSaving] = useState(false);
  const [logoUrlEdit, setLogoUrlEdit] = useState<string>(merchant?.logoUrl || "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [ownerPhoneEdit, setOwnerPhoneEdit] = useState<string>((merchant as any)?.ownerPhone || "");
  const [crNumberEdit, setCrNumberEdit] = useState<string>((merchant as any)?.commercialRegisterNumber || "");
  const [taxNumberEdit, setTaxNumberEdit] = useState<string>((merchant as any)?.taxNumber || "");
  const [googleMapsUrlEdit, setGoogleMapsUrlEdit] = useState<string>((merchant as any)?.googleMapsReviewUrl || "");
  const [crPdfUrlEdit, setCrPdfUrlEdit] = useState<string>((merchant as any)?.commercialRegisterURL || "");
  const [crPdfUploading, setCrPdfUploading] = useState(false);
  const crPdfInputRef = useRef<HTMLInputElement>(null);
  const [supportWhatsappEdit, setSupportWhatsappEdit] = useState<string>((merchant as any)?.support_whatsapp || "");
  const [settingsTab, setSettingsTab] = useState<"general" | "delivery" | "support" | "finance">("general");
  const [supportSaving, setSupportSaving] = useState(false);
  const [legalDocsSaving, setLegalDocsSaving] = useState(false);
  const [storeSlugEdit, setStoreSlugEdit] = useState<string>((merchant as any)?.storeSlug || "");
  const [mapsInputUrl, setMapsInputUrl] = useState<string>("");
  const [mapsParseLoading, setMapsParseLoading] = useState(false);
  const [mapsParseResult, setMapsParseResult] = useState<{
    ok: boolean; slug?: string; extractedName?: string; lat?: number | null; lng?: number | null; error?: string;
  } | null>(null);
  const [manualBranchName, setManualBranchName] = useState<string>("");
  const [showManualBranch, setShowManualBranch] = useState(false);

  useEffect(() => {
    setStoreNameEdit(merchant?.storeName || "");
    setWhatsappEdit(merchant?.whatsappNumber || "");
    setLogoUrlEdit(merchant?.logoUrl || "");
    setOwnerPhoneEdit((merchant as any)?.ownerPhone || "");
    setCrNumberEdit((merchant as any)?.commercialRegisterNumber || "");
    setTaxNumberEdit((merchant as any)?.taxNumber || "");
    setGoogleMapsUrlEdit((merchant as any)?.googleMapsReviewUrl || "");
    setCrPdfUrlEdit((merchant as any)?.commercialRegisterURL || "");
    setSupportWhatsappEdit((merchant as any)?.support_whatsapp || "");
    setStoreSlugEdit((merchant as any)?.storeSlug || "");
  }, [merchant?.storeName, merchant?.whatsappNumber, merchant?.logoUrl, (merchant as any)?.ownerPhone, (merchant as any)?.commercialRegisterNumber, (merchant as any)?.taxNumber, (merchant as any)?.googleMapsReviewUrl, (merchant as any)?.commercialRegisterURL, (merchant as any)?.support_whatsapp, (merchant as any)?.storeSlug]);

  async function handleParseGoogleMaps(overrideBranchName?: string) {
    const uid = merchant?.uid;
    if (!mapsInputUrl.trim() && !overrideBranchName?.trim() && !manualBranchName.trim()) return;
    setMapsParseLoading(true);
    setMapsParseResult(null);
    try {
      const res = await fetch("/api/parse-google-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleMapsUrl: mapsInputUrl.trim(),
          branchName: overrideBranchName || manualBranchName.trim() || undefined,
          merchantId: uid,
        }),
      });
      const data = await res.json();
      setMapsParseResult(data);
      if (data.ok && data.slug) {
        setStoreSlugEdit(data.slug);
        if (data.lat != null) setStoreLat(String(data.lat));
        if (data.lng != null) setStoreLng(String(data.lng));
        if (!data.extractedName) setShowManualBranch(true);
      } else {
        setShowManualBranch(true);
      }
    } catch {
      setMapsParseResult({ ok: false, error: "حدث خطأ أثناء معالجة الرابط" });
      setShowManualBranch(true);
    } finally {
      setMapsParseLoading(false);
    }
  }

  async function compressImage(file: File, maxDimension = 1024, quality = 0.88): Promise<File> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension && file.size <= 2 * 1024 * 1024) {
          resolve(file);
          return;
        }
        const scale = Math.min(maxDimension / width, maxDimension / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("image", compressed);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Upload failed");
      }
      setLogoUrlEdit(data.url);
    } catch (err: any) {
      console.error("[Logo Upload] Error:", err);
      toast({
        title: t("خطأ في رفع الشعار", "Logo upload error"),
        description: err?.message || t("فشل رفع الشعار، يرجى المحاولة مرة أخرى", "Logo upload failed, please try again"),
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
    }
  }

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

  async function handleSaveAccountInfo() {
    const uid = merchant?.uid;
    if (!uid) return;

    const finalSlug = storeSlugEdit.trim();
    setBranchInfoSaving(true);
    try {
      const merchantRef = doc(db, "merchants", uid);
      await setDoc(merchantRef, {
        storeName: storeNameEdit.trim() || merchant.storeName,
        whatsappNumber: whatsappEdit.trim(),
        logoUrl: logoUrlEdit,
        ownerPhone: ownerPhoneEdit.trim(),
        commercialRegisterNumber: crNumberEdit.trim(),
        taxNumber: taxNumberEdit.trim(),
        googleMapsReviewUrl: googleMapsUrlEdit.trim(),
        commercialRegisterURL: crPdfUrlEdit.trim(),
        support_whatsapp: supportWhatsappEdit.trim(),
        ...(finalSlug ? { storeSlug: finalSlug } : {}),
      }, { merge: true });
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم حفظ معلومات الحساب بنجاح", "Account info saved successfully"),
      });
    } catch (err) {
      console.error("[Save Account] Firestore error:", err);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حفظ معلومات الحساب", "Failed to save account info"),
        variant: "destructive",
      });
    } finally {
      setBranchInfoSaving(false);
    }
  }

  async function handleCrPdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: t("نوع الملف غير مدعوم", "Unsupported file type"), description: t("يُقبل فقط ملفات PDF", "Only PDF files are accepted"), variant: "destructive" });
      return;
    }
    setCrPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append("cr", file);
      const res = await fetch("/api/upload-cr", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      const newUrl = data.url as string;
      setCrPdfUrlEdit(newUrl);
      const uid = merchant?.uid;
      if (uid) {
        const merchantRef = doc(db, "merchants", uid);
        await setDoc(merchantRef, { commercialRegisterURL: newUrl }, { merge: true });
      }
      toast({
        title: t("تم رفع ملف السجل التجاري", "Commercial Register Uploaded"),
        description: t("تم حفظ ملف PDF بنجاح وربطه بملف متجرك", "PDF saved and linked to your store profile successfully"),
      });
    } catch (err: any) {
      toast({ title: t("فشل الرفع", "Upload failed"), description: err.message, variant: "destructive" });
    } finally {
      setCrPdfUploading(false);
      if (crPdfInputRef.current) crPdfInputRef.current.value = "";
    }
  }

  async function handleSaveBranchDelivery() {
    const uid = merchant?.uid;
    if (!uid) return;
    setDeliverySaving(true);
    try {
      const merchantRef = doc(db, "merchants", uid);
      await setDoc(merchantRef, {
        deliveryEnabled,
        curbsideEnabled,
        deliveryFee: parseFloat(deliveryFee) || 0,
        deliveryRange: parseFloat(deliveryRange) || 0,
        storeLat: storeLat.trim() ? parseFloat(storeLat) : null,
        storeLng: storeLng.trim() ? parseFloat(storeLng) : null,
        driverPhone: driverPhone.trim(),
        cityCode,
        onlineOrdersEnabled: localOnlineOrdersEnabled,
        businessOpenTime: localOpenTime,
        businessCloseTime: localCloseTime,
      }, { merge: true });
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم حفظ إعدادات الفرع والتوصيل بنجاح", "Branch location & delivery settings saved successfully"),
      });
    } catch (err) {
      console.error("[Save Delivery] Firestore error:", err);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حفظ إعدادات التوصيل", "Failed to save delivery settings"),
        variant: "destructive",
      });
    } finally {
      setDeliverySaving(false);
    }
  }


  useEffect(() => {
    setStoreTermsEnabled(merchant?.storeTermsEnabled || false);
  }, [merchant?.storeTermsEnabled]);

  useEffect(() => {
    setStoreTermsText(merchant?.storeTermsText || "");
    setStorePrivacyText(merchant?.storePrivacyText || "");
  }, [merchant?.storeTermsText, merchant?.storePrivacyText]);


  async function handleSaveStoreLegal() {
    const uid = merchant?.uid;
    if (!uid) {
      console.error("[Save Legal] merchant.uid is undefined — cannot update Firestore");
      return;
    }
    setStoreLegalSaving(true);
    try {
      const merchantRef = doc(db, "merchants", uid);
      await setDoc(merchantRef, {
        storeTermsEnabled,
        storeTermsText,
        storePrivacyText,
      }, { merge: true });
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم حفظ الشروط والأحكام بنجاح", "Store terms saved successfully"),
      });
    } catch (err) {
      console.error("[Save Legal] Firestore error:", err);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حفظ الشروط", "Failed to save terms"),
        variant: "destructive",
      });
    } finally {
      setStoreLegalSaving(false);
    }
  }

  async function handleSaveSupport() {
    const uid = merchant?.uid;
    if (!uid) return;
    setSupportSaving(true);
    try {
      const merchantRef = doc(db, "merchants", uid);
      await setDoc(merchantRef, {
        whatsappNumber: whatsappEdit.trim(),
        support_whatsapp: supportWhatsappEdit.trim(),
        driverPhone: driverPhone.trim(),
        googleMapsReviewUrl: googleMapsUrlEdit.trim(),
      }, { merge: true });
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم حفظ إعدادات الدعم بنجاح", "Support settings saved successfully"),
      });
    } catch (err) {
      console.error("[Save Support] Firestore error:", err);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حفظ إعدادات الدعم", "Failed to save support settings"),
        variant: "destructive",
      });
    } finally {
      setSupportSaving(false);
    }
  }

  async function handleSaveLegalDocs() {
    const uid = merchant?.uid;
    if (!uid) return;
    setLegalDocsSaving(true);
    try {
      const merchantRef = doc(db, "merchants", uid);
      await setDoc(merchantRef, {
        moyasarPublishableKey,
        moyasarSecretKey,
        onlinePaymentEnabled,
        codEnabled,
        taxNumber: taxNumberEdit.trim(),
        commercialRegisterNumber: crNumberEdit.trim(),
        ownerPhone: ownerPhoneEdit.trim(),
        commercialRegisterURL: crPdfUrlEdit.trim(),
      }, { merge: true });
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم حفظ إعدادات المالية والقانونية بنجاح", "Finance & legal settings saved successfully"),
      });
    } catch (err) {
      console.error("[Save Legal Docs] Firestore error:", err);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في الحفظ", "Failed to save"),
        variant: "destructive",
      });
    } finally {
      setLegalDocsSaving(false);
    }
  }

  const tabDef = [
    { key: "general" as const, arLabel: "عام", enLabel: "General", icon: <Store className="w-3.5 h-3.5" /> },
    { key: "delivery" as const, arLabel: "توصيل", enLabel: "Delivery", icon: <MapPin className="w-3.5 h-3.5" /> },
    { key: "support" as const, arLabel: "دعم", enLabel: "Support", icon: <Phone className="w-3.5 h-3.5" /> },
    { key: "finance" as const, arLabel: "مالية/قانوني", enLabel: "Finance/Legal", icon: <CreditCard className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">{t("الإعدادات", "Settings")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("إعدادات المتجر وأدوات إضافية", "Store settings and tools")}
        </p>
      </div>

      {/* ── QR Share Card (always visible at top) ── */}
      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t("مشاركة المتجر", "Share Store")}</h3>
              <p className="text-xs text-muted-foreground">{t("رمز QR ورابط المتجر", "QR code & store link")}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div
              data-testid="qr-preview-container"
              style={{
                background: "linear-gradient(160deg, #160505 0%, #060000 100%)",
                border: "2px solid rgba(200,30,30,0.65)",
                boxShadow: "0 0 36px rgba(180,0,0,0.35), inset 0 0 24px rgba(0,0,0,0.6)",
              }}
              className="relative flex flex-col items-center rounded-[28px] px-5 pt-5 pb-5 w-60"
            >
              <span className="text-[10px] font-bold tracking-[0.28em] text-red-600/80 uppercase mb-3 select-none">DIGITAL PAGER</span>
              <div className="flex items-center gap-[10px] mb-3" aria-hidden="true">
                {[0.15, 0.35, 0.8, 1, 0.8, 0.35, 0.15].map((op, i) => (
                  <span key={i} className="block rounded-full" style={{ width: 7, height: 7, background: `rgba(255,30,0,${op})`, boxShadow: op > 0.5 ? `0 0 6px 2px rgba(255,20,0,${op * 0.7})` : "none" }} />
                ))}
              </div>
              <div className="rounded-xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(200,30,30,0.18)" }}>
                <img src={`/api/qr/${merchant.uid}?t=${Date.now()}`} alt="Store QR Code" className="w-44 h-44 block" data-testid="img-qr-preview" style={{ background: "#fff" }} />
              </div>
              <div className="flex items-center gap-[10px] mt-3" aria-hidden="true">
                {[0.15, 0.35, 0.8, 1, 0.8, 0.35, 0.15].map((op, i) => (
                  <span key={i} className="block rounded-full" style={{ width: 7, height: 7, background: `rgba(255,30,0,${op})`, boxShadow: op > 0.5 ? `0 0 6px 2px rgba(255,20,0,${op * 0.7})` : "none" }} />
                ))}
              </div>
              <p className="mt-3 text-sm font-bold text-white text-center leading-snug select-none">امسح وتابع طلبك 📱</p>
              {merchant.storeName && <p className="mt-0.5 text-[10px] text-red-500/60 text-center font-medium select-none">{merchant.storeName}</p>}
              <span className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-red-700/40" aria-hidden="true" />
              <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-red-700/40" aria-hidden="true" />
              <span className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-red-700/40" aria-hidden="true" />
              <span className="absolute bottom-3 right-3 w-1.5 h-1.5 rounded-full bg-red-700/40" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <Button variant="outline" onClick={onDownloadQR} disabled={qrLoading} className="h-11 border-white/10 justify-start rounded-2xl" data-testid="button-download-qr-settings">
                {qrLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Download className="w-4 h-4 me-2" />}
                {t("تحميل QR", "Download QR")}
              </Button>
              <Button variant="outline" onClick={() => { const url = `${window.location.origin}/check-order/${merchant.uid}`; if (navigator.share) { navigator.share({ title: merchant.storeName, url }); } else { navigator.clipboard.writeText(url); } }} className="h-11 border-white/10 justify-start rounded-2xl" data-testid="button-share-store-link">
                <Share2 className="w-4 h-4 me-2" />
                {t("مشاركة الرابط", "Share Link")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]" role="tablist">
        {tabDef.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={settingsTab === tab.key}
            onClick={() => setSettingsTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: settingsTab === tab.key ? "rgba(220,38,38,0.18)" : "transparent",
              color: settingsTab === tab.key ? "#f87171" : "rgba(255,255,255,0.4)",
              border: settingsTab === tab.key ? "1px solid rgba(220,38,38,0.3)" : "1px solid transparent",
            }}
            data-testid={`tab-settings-${tab.key}`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{lang === "ar" ? tab.arLabel : tab.enLabel}</span>
            <span className="sm:hidden">{lang === "ar" ? tab.arLabel : tab.enLabel}</span>
          </button>
        ))}
      </div>

      {/* ── TAB PANELS ── */}

      {/* ── TAB: General ── */}
      {settingsTab === "general" && (<>

      {/* ── SECTION 1: Account Info ── */}
      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Store className="w-4 h-4 text-violet-400" />
            {t("معلومات الحساب", "Account Info")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">{t("اسم المتجر ورقم التواصل الظاهر للعملاء", "Store name and contact number shown to customers")}</p>
          <div className="space-y-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t("شعار المتجر", "Store Logo")}</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoUrlEdit ? (
                    <img
                      src={logoUrlEdit}
                      alt="logo"
                      className="w-full h-full object-cover"
                      data-testid="img-logo-preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent && !parent.querySelector(".logo-fallback")) {
                          const icon = document.createElement("div");
                          icon.className = "logo-fallback flex items-center justify-center w-full h-full";
                          icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;
                          parent.appendChild(icon);
                        }
                      }}
                    />
                  ) : (
                    <ImagePlus className="w-6 h-6 text-white/20" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label
                    className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors text-sm font-medium text-white/70 hover:text-white"
                    data-testid="label-logo-upload"
                  >
                    {logoUploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>{t("جاري الرفع...", "Uploading...")}</span></>
                    ) : (
                      <><ImagePlus className="w-4 h-4" /><span>{t("رفع شعار", "Upload Logo")}</span></>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={logoUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
                      data-testid="input-logo-upload"
                    />
                  </label>
                  {logoUrlEdit && (
                    <button
                      onClick={() => setLogoUrlEdit("")}
                      className="w-full text-xs text-red-400/60 hover:text-red-400 transition-colors"
                      data-testid="button-remove-logo"
                    >
                      {t("إزالة الشعار", "Remove logo")}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed" dir="rtl">
                {t(
                  "المواصفات المقترحة: قياس 512x512 بكسل، صيغة PNG بخلفية شفافة، وجودة عالية لضمان وضوح علامتك التجارية.",
                  "Recommended: 512×512 px, PNG with transparent background, high quality."
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{t("اسم المتجر", "Store Name")}</label>
              <Input
                value={storeNameEdit}
                onChange={(e) => setStoreNameEdit(e.target.value)}
                className="h-11 bg-white/[0.03] border-white/10"
                data-testid="input-store-name-edit"
              />
            </div>

            {/* ── Smart Google Maps Link → Auto Slug ── */}
            <div className="space-y-3 p-4 rounded-2xl" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.14)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(139,92,246,0.15)" }}>
                  <MapPin className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t("موقع المتجر على خرائط جوجل", "Google Maps Store Location")}</p>
                  <p className="text-[11px] text-white/40">{t("الصق رابط موقعك لتوليد رابط متجر احترافي تلقائياً", "Paste your location link to auto-generate a professional store URL")}</p>
                </div>
              </div>

              {/* URL Input + Generate button */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-400/50 pointer-events-none" />
                  <Input
                    value={mapsInputUrl}
                    onChange={(e) => { setMapsInputUrl(e.target.value); setMapsParseResult(null); setShowManualBranch(false); }}
                    placeholder="https://maps.google.com/maps/place/..."
                    dir="ltr"
                    className="h-11 bg-white/[0.03] border-white/10 font-mono text-xs pr-9"
                    data-testid="input-google-maps-location-url"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => handleParseGoogleMaps()}
                  disabled={mapsParseLoading || !mapsInputUrl.trim()}
                  className="h-11 px-4 shrink-0 font-semibold rounded-xl"
                  style={{ background: "rgba(139,92,246,0.8)" }}
                  data-testid="button-generate-smart-link"
                >
                  {mapsParseLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Zap className="w-4 h-4 me-1.5" />}
                  {t("توليد الرابط", "Generate")}
                </Button>
              </div>

              {/* Success result */}
              {mapsParseResult?.ok && storeSlugEdit && (
                <div className="p-3 rounded-xl space-y-2" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-300">{t("✅ تم توليد رابط متجرك بنجاح!", "✅ Your store URL was generated successfully!")}</p>
                  </div>
                  {mapsParseResult.extractedName && (
                    <p className="text-[11px] text-white/50 px-1" dir="rtl">
                      {t("اسم الموقع المستخرج:", "Extracted location:")} <span className="text-white/70 font-medium">{mapsParseResult.extractedName}</span>
                    </p>
                  )}
                  {mapsParseResult.lat != null && (
                    <p className="text-[10px] text-white/30 px-1 font-mono" dir="ltr">
                      📍 {mapsParseResult.lat?.toFixed(5)}, {mapsParseResult.lng?.toFixed(5)}
                      <span className="text-white/20 ms-2">{t("(تم حفظ الإحداثيات تلقائياً)", "(coordinates saved automatically)")}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <Link2 className="w-3 h-3 text-violet-400 shrink-0" />
                    <p className="text-[11px] font-mono truncate flex-1" dir="ltr">
                      <span className="text-white/30">{window.location.origin}/online-order/</span>
                      <span className="text-violet-300 font-bold">{storeSlugEdit}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/online-order/${storeSlugEdit}`); toast({ title: t("تم النسخ", "Copied") }); }}
                      className="shrink-0 text-[11px] text-violet-400/70 hover:text-violet-400 font-semibold"
                      data-testid="button-copy-generated-link"
                    >{t("نسخ", "Copy")}</button>
                  </div>
                </div>
              )}

              {/* Error / manual fallback */}
              {(mapsParseResult?.ok === false || showManualBranch) && (
                <div className="space-y-2">
                  {mapsParseResult?.error && (
                    <p className="text-[11px] text-red-400/80 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {mapsParseResult.error}
                    </p>
                  )}
                  <p className="text-[11px] text-white/50" dir="rtl">{t("أدخل اسم الفرع/الحي يدوياً وسيتم توليد الرابط فوراً:", "Enter the branch/area name manually to generate the link:")}</p>
                  <div className="flex gap-2">
                    <Input
                      value={manualBranchName}
                      onChange={(e) => setManualBranchName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleParseGoogleMaps(manualBranchName)}
                      placeholder={t("مثال: مطعم السعادة - العليا", "e.g. Al-Saada Restaurant - Olaya")}
                      dir="rtl"
                      className="h-10 bg-white/[0.03] border-white/10 text-sm flex-1"
                      data-testid="input-manual-branch-name"
                    />
                    <Button
                      type="button"
                      onClick={() => handleParseGoogleMaps(manualBranchName)}
                      disabled={mapsParseLoading || !manualBranchName.trim()}
                      size="sm"
                      className="h-10 px-3 shrink-0"
                      style={{ background: "rgba(139,92,246,0.7)" }}
                      data-testid="button-generate-from-name"
                    >
                      {mapsParseLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Already-has-a-slug display (if slug saved previously) */}
              {storeSlugEdit && !mapsParseResult && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <Link2 className="w-3 h-3 text-violet-400 shrink-0" />
                  <p className="text-[11px] font-mono truncate flex-1" dir="ltr">
                    <span className="text-white/25">{window.location.origin}/online-order/</span>
                    <span className="text-violet-300 font-semibold">{storeSlugEdit}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/online-order/${storeSlugEdit}`); toast({ title: t("تم النسخ", "Copied") }); }}
                    className="shrink-0 text-[11px] text-violet-400/60 hover:text-violet-300"
                    data-testid="button-copy-existing-slug"
                  >{t("نسخ", "Copy")}</button>
                  <button
                    type="button"
                    onClick={() => { setMapsParseResult(null); setShowManualBranch(true); setManualBranchName(""); }}
                    className="shrink-0 text-[11px] text-white/20 hover:text-white/50"
                    data-testid="button-change-slug"
                  >{t("تغيير", "Change")}</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">{t("المالك", "Owner")}</p>
                <p className="text-sm font-medium truncate" data-testid="text-owner-name">{merchant.ownerName}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">{t("البريد الإلكتروني", "Email")}</p>
                <p className="text-sm font-medium truncate" dir="ltr" data-testid="text-email">{merchant.email}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">{t("نوع النشاط", "Business")}</p>
                <p className="text-sm font-medium truncate" data-testid="text-business-type">{lang === "ar" ? businessTypeLabels[merchant.businessType] || merchant.businessType : businessTypeLabelsEn[merchant.businessType] || merchant.businessType}</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground" dir="rtl">{t("⚡ أرقام الواتساب وروابط الدعم متوفرة في تبويب 'دعم' · البيانات المالية والقانونية في تبويب 'مالية/قانوني'", "⚡ WhatsApp numbers are in the 'Support' tab · Financial & legal data in the 'Finance/Legal' tab")}</p>

            <Button onClick={handleSaveAccountInfo} disabled={branchInfoSaving} className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl disabled:opacity-30" data-testid="button-save-account-info">
              {branchInfoSaving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
              {t("حفظ اسم المتجر", "Save Store Name")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Alert Sound Settings ── */}
      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-5 flex items-center gap-2">
            <span>🔔</span>
            {t("إعدادات صوت التنبيهات", "Alert Sound Settings")}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-white/60" dir="rtl">{t("مستوى الصوت", "Alert Volume")}</label>
                <span className="text-sm font-bold text-white/80" data-testid="text-alert-volume-pct">
                  {Math.round((Number(localStorage.getItem("alert_volume") ?? "0.8")) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                defaultValue={Math.round((Number(localStorage.getItem("alert_volume") ?? "0.8")) * 100)}
                onChange={(e) => {
                  const vol = Number(e.target.value) / 100;
                  localStorage.setItem("alert_volume", String(vol));
                  e.target.parentElement!.querySelector("[data-testid='text-alert-volume-pct']")!.textContent = `${e.target.value}%`;
                }}
                className="w-full h-2 rounded-full outline-none cursor-pointer accent-red-600"
                data-testid="slider-alert-volume"
                style={{ accentColor: "#dc2626" }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-white/20">{t("صامت", "Muted")}</span>
                <span className="text-[10px] text-white/20">{t("أعلى", "Max")}</span>
              </div>
            </div>
            <button
              onClick={() => {
                const vol = Number(localStorage.getItem("alert_volume") ?? "0.8");
                const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                audio.volume = Math.max(0, Math.min(1, vol));
                audio.play().then(() => {
                  setTimeout(() => audio.pause(), 3000);
                }).catch(() => {});
                localStorage.setItem("sound_unlocked", "1");
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 hover:bg-white/[0.08]"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontFamily: "'Tajawal','Cairo',sans-serif" }}
              data-testid="button-test-sound"
              dir="rtl"
            >
              <span>▶</span>
              {t("اختبار الصوت", "Test Sound")}
            </button>
          </div>
        </CardContent>
      </Card>

      </>)}

      {/* ── TAB: Delivery ── */}
      {settingsTab === "delivery" && (<>

      {/* ── SECTION 2: Branch Location & Delivery Range ── */}
      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            {t("موقع الفرع ونطاق التوصيل", "Branch Location & Delivery Range")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">{t("إعدادات التوصيل والموقع وساعات العمل", "Delivery, location, and business hours settings")}</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("تفعيل خدمة التوصيل", "Enable Delivery")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">{t("للمتاجر التي تملك توصيلاً ذاتياً فقط", "For stores with their own delivery service only")}</p>
              </div>
              <Switch checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} className="data-[state=checked]:bg-emerald-600" data-testid="switch-delivery-enabled" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("تفعيل خدمة استلام الطلب في السيارة", "Enable Curbside Pickup")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">{t("يتيح للعميل طلب تسليم الطلب إلى سيارته أمام المتجر", "Allows customer to request delivery to their car outside")}</p>
              </div>
              <Switch checked={curbsideEnabled} onCheckedChange={setCurbsideEnabled} className="data-[state=checked]:bg-orange-500" data-testid="switch-curbside-enabled" />
            </div>

            {deliveryEnabled && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block">{t("رسوم التوصيل (ريال)", "Delivery Fee (SAR)")}</label>
                    <Input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} placeholder="0" min="0" step="0.5" className="h-11 bg-white/[0.03] border-white/10 font-mono" dir="ltr" data-testid="input-delivery-fee" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                      {t("أقصى نطاق (كم)", "Max Range (km)")}
                    </label>
                    <Input type="number" value={deliveryRange} onChange={(e) => setDeliveryRange(e.target.value)} placeholder={t("0=غير محدود", "0=unlimited")} min="0" step="1" className="h-11 bg-white/[0.03] border-white/10 font-mono" dir="ltr" data-testid="input-delivery-range" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground" dir="rtl">{t("اضبط النطاق على 0 لقبول أي مسافة. يُستخدم مع الإحداثيات لحساب المسافة.", "Set range to 0 to accept any distance. Used with coordinates for distance calculation.")}</p>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2" dir="rtl">
                    <MapPin className="w-4 h-4 text-red-400" />
                    {t("إحداثيات موقع الفرع", "Branch Location Coordinates")}
                  </p>
                  <p className="text-[11px] text-muted-foreground" dir="rtl">{t("افتح Google Maps، انقر بزر اليمين على موقع فرعك، وانسخ الإحداثيات.", "Open Google Maps, right-click your branch, and copy coordinates.")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground block">{t("خط العرض", "Latitude")}</label>
                      <Input type="text" value={storeLat} onChange={(e) => setStoreLat(e.target.value)} placeholder="24.7136" className="h-10 bg-black/40 border-white/10 font-mono text-sm" dir="ltr" data-testid="input-store-lat" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground block">{t("خط الطول", "Longitude")}</label>
                      <Input type="text" value={storeLng} onChange={(e) => setStoreLng(e.target.value)} placeholder="46.6753" className="h-10 bg-black/40 border-white/10 font-mono text-sm" dir="ltr" data-testid="input-store-lng" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">{t("رقم جوال المندوب (واتساب)", "Driver Phone (WhatsApp)")}</label>
                  <Input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder={t("مثال: 966501234567", "e.g. 966501234567")} maxLength={15} className="h-11 bg-white/[0.03] border-white/10 font-mono" dir="ltr" data-testid="input-driver-phone" />
                  <p className="text-[10px] text-muted-foreground">{t("اتركه فارغاً لاختيار المندوب يدوياً عند كل طلب", "Leave empty to choose driver manually per order")}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]" data-testid="online-orders-toggle-row">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("استقبال الطلبات أونلاين", "Enable Online Orders")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">{t("إيقاف فوري لاستقبال الطلبات عند ضغط المطبخ", "Instantly stop receiving orders during kitchen pressure")}</p>
              </div>
              <Switch checked={localOnlineOrdersEnabled} onCheckedChange={setLocalOnlineOrdersEnabled} className="data-[state=checked]:bg-emerald-600" data-testid="switch-online-orders" />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-violet-400" />{t("ساعات العمل", "Business Hours")}</p>
              <p className="text-xs text-muted-foreground" dir="rtl">{t("خارج هذه الأوقات لن يتمكن العملاء من الطلب.", "Outside these hours, customers cannot place orders.")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">{t("وقت الفتح", "Opening Time")}</label>
                  <Input type="time" value={localOpenTime} onChange={(e) => setLocalOpenTime(e.target.value)} className="h-11 bg-white/[0.03] border-white/10 text-center font-mono" dir="ltr" data-testid="input-open-time" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">{t("وقت الإغلاق", "Closing Time")}</label>
                  <Input type="time" value={localCloseTime} onChange={(e) => setLocalCloseTime(e.target.value)} className="h-11 bg-white/[0.03] border-white/10 text-center font-mono" dir="ltr" data-testid="input-close-time" />
                </div>
              </div>
              {localOpenTime && localCloseTime && (
                <p className="text-xs text-muted-foreground text-center" dir="rtl" data-testid="text-hours-preview">{t("ساعات العمل:", "Business Hours:")} {localOpenTime} → {localCloseTime}</p>
              )}
            </div>

            <Button onClick={handleSaveBranchDelivery} disabled={deliverySaving} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl disabled:opacity-30" data-testid="button-save-branch-delivery">
              {deliverySaving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
              {t("حفظ إعدادات الفرع والتوصيل", "Save Branch & Delivery Settings")}
            </Button>
          </div>
        </CardContent>
      </Card>

      </>)}

      {/* ── TAB: Support ── */}
      {settingsTab === "support" && (<>

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-400" />
            {t("أرقام التواصل والدعم", "Contact & Support Numbers")}
          </h3>
          <p className="text-xs text-muted-foreground mb-5">{t("أرقام الواتساب التي تظهر للعملاء في صفحات التتبع", "WhatsApp numbers shown to customers on tracking pages")}</p>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-flex w-3.5 h-3.5 items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="#25d366" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.001 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.987-1.306A9.953 9.953 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18c-1.738 0-3.368-.474-4.769-1.299l-.342-.203-3.037.794.812-2.962-.222-.358A7.964 7.964 0 014 12c0-4.418 3.582-8 8.001-8 4.418 0 7.999 3.582 7.999 8s-3.581 8-7.999 8z"/></svg>
                </span>
                {t("واتساب التواصل العام", "General WhatsApp")}
                <span className="text-muted-foreground/50 text-[10px]">{t("(يستخدمه العملاء للطلبات العامة)", "(general customer contact)")}</span>
              </label>
              <Input value={whatsappEdit} onChange={(e) => setWhatsappEdit(e.target.value)} placeholder="966501234567" dir="ltr" className="h-11 bg-white/[0.03] border-white/10 font-mono" data-testid="input-whatsapp-edit" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-flex w-3.5 h-3.5 items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="#25d366" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.001 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.987-1.306A9.953 9.953 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18c-1.738 0-3.368-.474-4.769-1.299l-.342-.203-3.037.794.812-2.962-.222-.358A7.964 7.964 0 014 12c0-4.418 3.582-8 8.001-8 4.418 0 7.999 3.582 7.999 8s-3.581 8-7.999 8z"/></svg>
                </span>
                {t("واتساب دعم العملاء", "Customer Support WhatsApp")}
                <span className="text-muted-foreground/50 text-[10px]">{t("(يظهر في صفحة التتبع)", "(shown on tracking page)")}</span>
              </label>
              <Input value={supportWhatsappEdit} onChange={(e) => setSupportWhatsappEdit(e.target.value)} placeholder="966501234567" dir="ltr" className="h-11 bg-white/[0.03] border-white/10 font-mono" data-testid="input-support-whatsapp-edit" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-flex w-3.5 h-3.5 items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="#25d366" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.001 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.987-1.306A9.953 9.953 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18c-1.738 0-3.368-.474-4.769-1.299l-.342-.203-3.037.794.812-2.962-.222-.358A7.964 7.964 0 014 12c0-4.418 3.582-8 8.001-8 4.418 0 7.999 3.582 7.999 8s-3.581 8-7.999 8z"/></svg>
                </span>
                {t("واتساب المندوب (السائق)", "Driver WhatsApp")}
                <span className="text-muted-foreground/50 text-[10px]">{t("(للطلبات التوصيل)", "(for delivery orders)")}</span>
              </label>
              <Input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="966501234567" maxLength={15} className="h-11 bg-white/[0.03] border-white/10 font-mono" dir="ltr" data-testid="input-driver-phone" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            {t("رابط تقييم جوجل ماب", "Google Maps Review Link")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">{t("يُحوَّل العملاء 4-5 نجوم تلقائياً لهذا الرابط", "4-5 star customers are auto-redirected to this link")}</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{t("رابط صفحة تقييمك على جوجل ماب", "Your Google Maps review page URL")}</label>
              <div className="relative">
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400/60" />
                <Input value={googleMapsUrlEdit} onChange={(e) => setGoogleMapsUrlEdit(e.target.value)} placeholder="https://maps.google.com/..." dir="ltr" className="pr-9 h-11 bg-white/[0.03] border-white/10 font-mono text-sm placeholder:text-white/20" data-testid="input-google-maps-url" />
              </div>
              <p className="text-[11px] leading-relaxed" dir="rtl" style={{ color: "rgba(251,191,36,0.5)" }}>
                {t("⭐ التقييمات 4-5 نجوم تُحوَّل لجوجل ماب، والتقييمات 1-3 نجوم تُحفظ داخلياً فقط.", "⭐ Ratings of 4-5 stars redirect to Google Maps. Ratings of 1-3 stars are saved internally only.")}
              </p>
              {googleMapsUrlEdit && (
                <a href={googleMapsUrlEdit} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-amber-400/70 hover:text-amber-400 transition-colors" data-testid="link-test-maps-url">
                  <ExternalLink className="w-3 h-3" />
                  {t("اختبار الرابط", "Test link")}
                </a>
              )}
            </div>
            <Button onClick={handleSaveSupport} disabled={supportSaving} className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl disabled:opacity-30" data-testid="button-save-support">
              {supportSaving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
              {t("حفظ إعدادات الدعم", "Save Support Settings")}
            </Button>
          </div>
        </CardContent>
      </Card>

      </>)}

      {/* ── TAB: Finance / Legal ── */}
      {settingsTab === "finance" && (<>

      {/* ── Legal (Finance Tab): Official IDs ── */}
      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            {t("البيانات الرسمية والقانونية", "Legal & Official Data")}
          </h3>
          <p className="text-xs text-muted-foreground mb-5">{t("السجل التجاري والرقم الضريبي ووثائق المنشأة", "Commercial register, VAT ID and business documents")}</p>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("جوال المسؤول", "Manager Phone")}</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={ownerPhoneEdit} onChange={(e) => setOwnerPhoneEdit(e.target.value)} placeholder="966501234567" dir="ltr" className="pr-9 h-11 bg-white/[0.03] border-white/10 font-mono text-sm" data-testid="input-owner-phone-edit" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("رقم السجل التجاري", "Commercial Register No.")}<span className="text-destructive ms-1 text-[10px]">*</span></label>
                <div className="relative">
                  <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={crNumberEdit} onChange={(e) => setCrNumberEdit(e.target.value)} placeholder="1010XXXXXX" dir="ltr" className="pr-9 h-11 bg-white/[0.03] border-white/10 font-mono text-sm" data-testid="input-cr-number-edit" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("الرقم الضريبي للمنشأة", "Tax Registration No.")}<span className="text-muted-foreground/50 ms-1.5 text-[10px]">{t("(إن وجد)", "(optional)")}</span></label>
                <div className="relative">
                  <Receipt className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={taxNumberEdit} onChange={(e) => setTaxNumberEdit(e.target.value)} placeholder="3XXXXXXXXXXXXXXXXXXX" dir="ltr" className="pr-9 h-11 bg-white/[0.03] border-white/10 font-mono text-sm" data-testid="input-tax-number-edit" />
                </div>
              </div>
            </div>

            {/* CR PDF Upload */}
            <div className="space-y-2 pt-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                {t("إرفاق السجل التجاري (PDF)", "Attach Commercial Register (PDF)")}
                <span className="text-muted-foreground/50 text-[10px]">{t("(إن وجد)", "(optional)")}</span>
              </label>
              {crPdfUrlEdit ? (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <FileText className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate" data-testid="text-cr-pdf-name">{crPdfUrlEdit.split("/").pop() || "commercial_register.pdf"}</p>
                      <p className="text-[10px] text-green-400 flex items-center gap-1 mt-0.5"><CheckCircle className="w-3 h-3" />{t("تم الرفع بنجاح", "Uploaded successfully")}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <a href={crPdfUrlEdit} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }} data-testid="btn-preview-cr-pdf">
                      <Eye className="w-3.5 h-3.5" />{t("معاينة", "Preview")}
                    </a>
                    <button onClick={() => crPdfInputRef.current?.click()} disabled={crPdfUploading} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }} data-testid="btn-replace-cr-pdf">
                      <RefreshCw className="w-3.5 h-3.5" />{t("استبدال", "Replace")}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => crPdfInputRef.current?.click()} disabled={crPdfUploading} className="w-full flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed" style={{ borderColor: "rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.03)" }} data-testid="btn-upload-cr-pdf">
                  {crPdfUploading ? <Loader2 className="w-6 h-6 animate-spin text-amber-400" /> : <CloudUpload className="w-6 h-6 text-amber-400/70" />}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-amber-400/80">{crPdfUploading ? t("جارٍ الرفع...", "Uploading...") : t("اضغط لرفع ملف PDF", "Click to upload PDF")}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t("يُقبل ملفات PDF فقط، بحد أقصى 10MB", "PDF files only, max 10MB")}</p>
                  </div>
                </button>
              )}
              <input ref={crPdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleCrPdfUpload} data-testid="input-cr-pdf-file" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Payment Integration (single source of truth) ── */}
      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              {t("ربط بوابة الدفع", "Payment Integration")}
            </h3>
            {moyasarPublishableKey.trim() && moyasarSecretKey.trim() && (
              <span
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}
                data-testid="badge-payment-gateway-active"
              >
                <CheckCircle className="w-3 h-3" />
                {t("بوابة الدفع نشطة ✅", "Payment Gateway Active ✅")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-5">{t("مفاتيح Moyasar وإعدادات الدفع", "Moyasar keys and payment settings")}</p>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground block">Moyasar Publishable Key</label>
              <Input type="text" value={moyasarPublishableKey} onChange={(e) => setMoyasarPublishableKey(e.target.value)} placeholder="pk_live_..." className="h-11 bg-white/[0.03] border-white/10 font-mono" dir="ltr" data-testid="input-moyasar-pub-key" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground block">Moyasar Secret Key</label>
              <Input type="password" value={moyasarSecretKey} onChange={(e) => setMoyasarSecretKey(e.target.value)} placeholder="sk_live_..." className="h-11 bg-white/[0.03] border-white/10 font-mono" dir="ltr" data-testid="input-moyasar-secret-key" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("تفعيل الدفع الإلكتروني", "Enable Online Payment")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">{t("السماح للعملاء بالدفع إلكترونياً عبر بوابة Moyasar", "Allow customers to pay online via Moyasar gateway")}</p>
              </div>
              <Switch checked={onlinePaymentEnabled} onCheckedChange={setOnlinePaymentEnabled} className="data-[state=checked]:bg-blue-600" data-testid="switch-online-payment" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("تفعيل الدفع عند الاستلام", "Enable Cash on Delivery")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">{t("السماح للعملاء بالدفع نقداً عند استلام الطلب", "Allow customers to pay cash on delivery")}</p>
              </div>
              <Switch checked={codEnabled} onCheckedChange={setCodEnabled} className="data-[state=checked]:bg-emerald-600" data-testid="switch-cod-payment" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Terms & Conditions ── */}
      <Card className="border-white/[0.06] bg-[#111] rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            {t("الشروط والأحكام", "Terms & Conditions")}
          </h3>
          <p className="text-xs text-muted-foreground mb-5">{t("شروط المتجر وسياسة الخصوصية للعملاء", "Store terms and privacy policy for customers")}</p>
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]" data-testid="store-terms-toggle-row">
              <div className="flex-1">
                <p className="text-sm font-semibold" dir="rtl">{t("شروط وأحكام المتجر", "Store Terms & Conditions")}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">{t("عرض شروط المتجر للعملاء عند الطلب أونلاين", "Show store terms to customers during online ordering")}</p>
              </div>
              <Switch checked={storeTermsEnabled} onCheckedChange={setStoreTermsEnabled} className="data-[state=checked]:bg-emerald-600" data-testid="switch-store-terms" />
            </div>
            {storeTermsEnabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block" dir="rtl">{t("شروط وأحكام المتجر", "Store Terms & Conditions")}</label>
                  <Textarea value={storeTermsText} onChange={(e) => setStoreTermsText(e.target.value)} placeholder={t("اكتب شروط وأحكام المتجر هنا...", "Write store terms here...")} rows={5} dir="rtl" className="resize-y bg-white/[0.03] border-white/10" data-testid="textarea-store-terms" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block" dir="rtl">{t("سياسة الخصوصية للمتجر", "Store Privacy Policy")}</label>
                  <Textarea value={storePrivacyText} onChange={(e) => setStorePrivacyText(e.target.value)} placeholder={t("اكتب سياسة الخصوصية هنا...", "Write privacy policy here...")} rows={5} dir="rtl" className="resize-y bg-white/[0.03] border-white/10" data-testid="textarea-store-privacy" />
                </div>
              </div>
            )}
            <Button onClick={handleSaveStoreLegal} disabled={storeLegalSaving} className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl disabled:opacity-30" data-testid="button-save-store-terms">
              {storeLegalSaving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
              {t("حفظ الشروط والأحكام", "Save Terms & Conditions")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSaveLegalDocs} disabled={legalDocsSaving} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl disabled:opacity-30" data-testid="button-save-legal-docs">
        {legalDocsSaving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
        {t("حفظ إعدادات المالية والقانونية", "Save Finance & Legal Settings")}
      </Button>

      </>)}

    </div>
  );
}
