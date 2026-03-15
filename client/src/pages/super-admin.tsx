import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { businessTypeLabels, planLabels } from "@shared/schema";
import type { Merchant, SystemSettings } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  LogOut,
  Globe,
  CheckCircle,
  XCircle,
  Trash2,
  Users,
  Clock,
  Store,
  Loader2,
  RefreshCw,
  CreditCard,
  Zap,
  Download,
  LogIn,
  Share2,
  MapPin,
  Bell,
  Settings,
  Save,
  QrCode,
  FileText,
  AlertTriangle,
  Activity,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  MessageSquare,
  Star,
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Plus,
  Minus,
  Maximize,
  Minimize,
  MoreHorizontal,
  Cpu,
  HardDrive,
  ServerCrash,
  Wifi,
  WifiOff,
  CircleDot,
  Gauge,
} from "lucide-react";

const PRIMARY_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || "yahiatohary@hotmail.com";
const ADMIN_EMAILS = [PRIMARY_ADMIN_EMAIL.toLowerCase(), "admin@test.com"];
function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

function AdminCharts({ merchants, t, lang }: { merchants: Merchant[]; t: (ar: string, en: string) => string; lang: string }) {
  const signupData = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthCounts[key] = 0;
    }
    merchants.forEach(m => {
      const ca = (m as any).createdAt;
      if (!ca) return;
      const d = new Date(ca);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthCounts) monthCounts[key]++;
    });
    return Object.entries(monthCounts).map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "short" }),
      count,
    }));
  }, [merchants, lang]);

  const expiryData = useMemo(() => {
    const weekCounts: { label: string; count: number; color: string }[] = [];
    const now = new Date();
    const ranges = [
      { label: t("منتهي", "Expired"), days: [-Infinity, 0], color: "#ef4444" },
      { label: t("٠-٧ أيام", "0-7 days"), days: [0, 8], color: "#f97316" },
      { label: t("٨-١٤ يوم", "8-14 days"), days: [8, 15], color: "#eab308" },
      { label: t("١٥-٣٠ يوم", "15-30 days"), days: [15, 31], color: "#22c55e" },
      { label: t("+٣٠ يوم", "30+ days"), days: [31, Infinity], color: "#3b82f6" },
    ];
    ranges.forEach(r => {
      const count = merchants.filter(m => {
        const exp = (m as any).subscriptionExpiry;
        if (!exp) return false;
        const diffDays = (new Date(exp).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= r.days[0] && diffDays < r.days[1];
      }).length;
      weekCounts.push({ label: r.label, count, color: r.color });
    });
    return weekCounts;
  }, [merchants, t]);

  if (merchants.length === 0) return null;

  const EXPIRY_PALETTE = ["#ef4444", "#f97316", "#eab308", "#10b981", "#6366f1"];

  return (
    <div className="hidden lg:grid lg:grid-cols-2 gap-4" data-testid="admin-charts">
      <Card className="border-slate-800 bg-[#0d1117]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("التسجيلات الجديدة", "New Signups")}</h3>
            <TrendingUp className="w-4 h-4 text-emerald-500/60" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={signupData} barSize={22}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }}
                cursor={{ fill: "rgba(99,102,241,0.06)" }}
              />
              <Bar dataKey="count" name={t("تسجيلات", "Signups")} fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-[#0d1117]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("انتهاء الاشتراكات", "Subscription Expiries")}</h3>
            <CalendarDays className="w-4 h-4 text-indigo-500/60" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expiryData} barSize={22}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }}
                cursor={{ fill: "rgba(99,102,241,0.06)" }}
              />
              <Bar dataKey="count" name={t("تجار", "Merchants")} radius={[3, 3, 0, 0]}>
                {expiryData.map((_, idx) => (
                  <Cell key={idx} fill={EXPIRY_PALETTE[idx] ?? "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

const businessTypeLabelsEn: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  clinic: "Clinic",
  other: "Other",
};

function getStatusBadge(status: string, t: (ar: string, en: string) => string) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          {t("مفعّل", "Active")}
        </Badge>
      );
    case "suspended":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          {t("موقوف", "Suspended")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          {t("مرفوض", "Rejected")}
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          {t("قيد الانتظار", "Pending")}
        </Badge>
      );
  }
}

function getSubBadge(subStatus: string | undefined, t: (ar: string, en: string) => string) {
  switch (subStatus) {
    case "active":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CreditCard className="w-3 h-3 me-1" />
          {t("مفعّل", "Active")}
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
          <CreditCard className="w-3 h-3 me-1" />
          {t("منتهي", "Expired")}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <CreditCard className="w-3 h-3 me-1" />
          {t("ملغي", "Cancelled")}
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <CreditCard className="w-3 h-3 me-1" />
          {t("غير مفعّل", "Inactive")}
        </Badge>
      );
  }
}

export default function SuperAdminPage() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, logout, login } = useAuth();
  const { t, toggleLanguage, lang } = useLanguage();
  const { toast } = useToast();

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Merchant | null>(null);
  const [totalAlertsToday, setTotalAlertsToday] = useState(0);
  const [editingExpiry, setEditingExpiry] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState<string>("");

  const [settings, setSettings] = useState<SystemSettings>({
    appName: "Digital Pager",
    globalLogoUrl: "",
    supportWhatsapp: "966500000000",
    globalThemeColor: "#ef0000",
    platformTermsEnabled: false,
    platformTermsText: "",
    platformPrivacyText: "",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [systemErrors, setSystemErrors] = useState<any[]>([]);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [resolvingError, setResolvingError] = useState<string | null>(null);

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportMerchant, setReportMerchant] = useState<Merchant | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [complaintsMap, setComplaintsMap] = useState<Record<string, number>>({});
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackDialogMerchant, setFeedbackDialogMerchant] = useState<Merchant | null>(null);
  const [feedbackDialogData, setFeedbackDialogData] = useState<any[]>([]);
  const [feedbackDialogLoading, setFeedbackDialogLoading] = useState(false);

  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [featureDialogMerchant, setFeatureDialogMerchant] = useState<Merchant | null>(null);
  const [featureFlags, setFeatureFlags] = useState({ analyticsEnabled: true, crmEnabled: true, smartRatingEnabled: true, printReceiptsEnabled: true });
  const [featureLoading, setFeatureLoading] = useState(false);
  const [featureSaving, setFeatureSaving] = useState(false);

  const [globalMonitorData, setGlobalMonitorData] = useState<any>(null);
  const [globalMonitorLoading, setGlobalMonitorLoading] = useState(false);

  const [subPaymentDialogOpen, setSubPaymentDialogOpen] = useState(false);
  const [subPaymentMerchant, setSubPaymentMerchant] = useState<Merchant | null>(null);
  const [subPaymentAmount, setSubPaymentAmount] = useState("");
  const [subPaymentStartDate, setSubPaymentStartDate] = useState("");
  const [subPaymentEndDate, setSubPaymentEndDate] = useState("");
  const [subPaymentSaving, setSubPaymentSaving] = useState(false);
  const [subPaymentHistory, setSubPaymentHistory] = useState<any[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  const [subPaymentHistoryLoading, setSubPaymentHistoryLoading] = useState(false);

  const [platformFinanceData, setPlatformFinanceData] = useState<any>(null);
  const [platformFinanceLoading, setPlatformFinanceLoading] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [renewalData, setRenewalData] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<"home" | "stores" | "subscriptions" | "finance" | "tracking" | "settings" | "sysmonitor">("home");
  const [sysHealth, setSysHealth] = useState<any>(null);
  const [sysHealthLoading, setSysHealthLoading] = useState(false);
  const [sysAlerts, setSysAlerts] = useState<{ time: string; message: string; level: "warn" | "critical" }[]>([]);
  const [renewalLoading, setRenewalLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const btLabels = lang === "ar" ? businessTypeLabels : businessTypeLabelsEn;

  const filteredMerchants = (() => {
    let list = [...merchants];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (m) =>
          (m.storeName || "").toLowerCase().includes(q) ||
          (m.ownerName || "").toLowerCase().includes(q) ||
          (m.email || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      if (statusFilter === "expired") {
        list = list.filter((m) => m.subscriptionStatus === "expired");
      } else {
        list = list.filter((m) => m.status === statusFilter);
      }
    }
    switch (sortBy) {
      case "newest":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "qrScans":
        list.sort((a, b) => (b.qrScans || 0) - (a.qrScans || 0));
        break;
      case "shares":
        list.sort((a, b) => (b.sharesCount || 0) - (a.sharesCount || 0));
        break;
      case "expiry":
        list.sort((a, b) => {
          if (!a.subscriptionExpiry) return 1;
          if (!b.subscriptionExpiry) return -1;
          return new Date(a.subscriptionExpiry).getTime() - new Date(b.subscriptionExpiry).getTime();
        });
        break;
    }
    return list;
  })();

  const totalPages = Math.max(1, Math.ceil(filteredMerchants.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMerchants = filteredMerchants.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all" || sortBy !== "newest";

  function clearAllFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  }

  function highlightMatch(text: string) {
    if (!searchQuery.trim()) return text;
    const q = searchQuery.trim();
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-primary/30 text-primary font-semibold rounded px-0.5">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  }

  async function fetchMerchants() {
    setLoadingData(true);
    try {
      const querySnapshot = await getDocs(collection(db, "merchants"));
      const docs: Merchant[] = [];
      querySnapshot.forEach((docSnap) => {
        docs.push(docSnap.data() as Merchant);
      });
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMerchants(docs);
    } catch (error) {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحميل البيانات", "Failed to load data"),
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  }

  async function fetchTotalAlertsToday() {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setTotalAlertsToday(data.totalAlertsToday || 0);
      }
    } catch {
      // silent
    }
  }

  async function fetchSystemErrors() {
    setErrorsLoading(true);
    try {
      const res = await fetch("/api/admin/errors", {
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setSystemErrors(Array.isArray(data) ? data : data?.errors || []);
      }
    } catch {
      // silent
    } finally {
      setErrorsLoading(false);
    }
  }

  async function handleResolveError(errorId: string) {
    setResolvingError(errorId);
    try {
      const res = await fetch(`/api/admin/errors/${errorId}/resolve`, {
        method: "POST",
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        setSystemErrors((prev) => prev.filter((e) => e.id !== errorId));
        toast({
          title: t("تم الحل", "Resolved"),
          description: t("تم حل الخطأ بنجاح", "Error resolved successfully"),
        });
      }
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حل الخطأ", "Failed to resolve error"),
        variant: "destructive",
      });
    } finally {
      setResolvingError(null);
    }
  }

  async function handleOpenFeatures(merchant: Merchant) {
    setFeatureDialogMerchant(merchant);
    setFeatureDialogOpen(true);
    setFeatureLoading(true);
    try {
      const res = await fetch(`/api/admin/merchant-features/${merchant.uid}`, {
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setFeatureFlags(data.features);
      }
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في تحميل الإعدادات", "Failed to load features"), variant: "destructive" });
    } finally {
      setFeatureLoading(false);
    }
  }

  async function handleSaveFeatures() {
    if (!featureDialogMerchant) return;
    setFeatureSaving(true);
    try {
      const res = await fetch(`/api/admin/merchant-features/${featureDialogMerchant.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-email": user?.email || "" },
        body: JSON.stringify(featureFlags),
      });
      if (res.ok) {
        toast({ title: t("تم الحفظ", "Saved"), description: t("تم تحديث إعدادات المتجر", "Store features updated") });
        setFeatureDialogOpen(false);
      } else {
        toast({ title: t("خطأ", "Error"), description: t("فشل في حفظ الإعدادات", "Failed to save features"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في حفظ الإعدادات", "Failed to save features"), variant: "destructive" });
    } finally {
      setFeatureSaving(false);
    }
  }

  async function fetchGlobalMonitor() {
    setGlobalMonitorLoading(true);
    try {
      const res = await fetch("/api/admin/global-monitor", {
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalMonitorData(data);
      }
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في تحميل البيانات", "Failed to load monitor data"), variant: "destructive" });
    } finally {
      setGlobalMonitorLoading(false);
    }
  }

  async function fetchSysHealth() {
    setSysHealthLoading(true);
    try {
      const res = await fetch("/api/admin/system-health", {
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setSysHealth(data);
        // Check for critical/warning thresholds and log alerts
        const now = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const alerts: { time: string; message: string; level: "warn" | "critical" }[] = [];
        if (data.cpu?.percent >= 85) {
          alerts.push({ time: now, message: `CPU حرج: ${data.cpu.percent}%`, level: "critical" });
        } else if (data.cpu?.percent >= 60) {
          alerts.push({ time: now, message: `CPU تحذير: ${data.cpu.percent}%`, level: "warn" });
        }
        if (data.memory?.percent >= 90) {
          alerts.push({ time: now, message: `RAM حرج: ${data.memory.percent}% (${data.memory.usedMB}MB / ${data.memory.totalMB}MB)`, level: "critical" });
        } else if (data.memory?.percent >= 80) {
          alerts.push({ time: now, message: `RAM تحذير: ${data.memory.percent}% (${data.memory.usedMB}MB / ${data.memory.totalMB}MB)`, level: "warn" });
        }
        if (data.db?.status === "error") {
          alerts.push({ time: now, message: `قاعدة البيانات: خطأ في الاتصال`, level: "critical" });
        }
        if (alerts.length > 0) {
          setSysAlerts(prev => [...alerts, ...prev].slice(0, 10));
        }
      }
    } catch {
      // silent
    } finally {
      setSysHealthLoading(false);
    }
  }

  useEffect(() => {
    if (activeSection !== "sysmonitor") return;
    fetchSysHealth();
    const iv = setInterval(fetchSysHealth, 30000);
    return () => clearInterval(iv);
  }, [activeSection]);

  async function handleOpenSubPayment(merchant: Merchant) {
    setSubPaymentMerchant(merchant);
    setSubPaymentDialogOpen(true);
    setSubPaymentAmount("");
    const today = new Date().toISOString().split("T")[0];
    setSubPaymentStartDate(today);
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    setSubPaymentEndDate(defaultEnd.toISOString().split("T")[0]);
    setSubPaymentHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/subscription-payments/${merchant.uid}`, {
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setSubPaymentHistory(data.payments || []);
      }
    } catch {} finally { setSubPaymentHistoryLoading(false); }
  }

  async function handleSaveSubPayment() {
    if (!subPaymentMerchant || !subPaymentAmount || !subPaymentStartDate || !subPaymentEndDate) return;
    setSubPaymentSaving(true);
    try {
      const res = await fetch(`/api/admin/subscription-payment/${subPaymentMerchant.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-email": user?.email || "" },
        body: JSON.stringify({ amountReceived: parseFloat(subPaymentAmount), startDate: subPaymentStartDate, endDate: subPaymentEndDate }),
      });
      if (res.ok) {
        toast({ title: t("تم الحفظ", "Saved"), description: t("تم تسجيل الدفعة وتفعيل الاشتراك", "Payment recorded and subscription activated") });
        setMerchants(prev => prev.map(m => m.uid === subPaymentMerchant.uid ? { ...m, subscriptionStatus: "active" as const, subscriptionStartAt: subPaymentStartDate, subscriptionExpiry: subPaymentEndDate } : m));
        handleOpenSubPayment(subPaymentMerchant);
      } else {
        toast({ title: t("خطأ", "Error"), description: t("فشل في تسجيل الدفعة", "Failed to record payment"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في تسجيل الدفعة", "Failed to record payment"), variant: "destructive" });
    } finally { setSubPaymentSaving(false); }
  }

  async function fetchPlatformFinance() {
    setPlatformFinanceLoading(true);
    try {
      const [finRes, renRes] = await Promise.all([
        fetch("/api/admin/platform-finance", { headers: { "x-admin-email": user?.email || "" } }),
        fetch("/api/admin/renewal-analytics", { headers: { "x-admin-email": user?.email || "" } }),
      ]);
      if (finRes.ok) { const data = await finRes.json(); setPlatformFinanceData(data); }
      if (renRes.ok) { const data = await renRes.json(); setRenewalData(data); }
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في تحميل البيانات المالية", "Failed to load finance data"), variant: "destructive" });
    } finally { setPlatformFinanceLoading(false); }
  }

  async function handleAddExpense() {
    if (!expenseName || !expenseAmount || !expenseDate) return;
    setExpenseSaving(true);
    try {
      const res = await fetch("/api/admin/platform-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-email": user?.email || "" },
        body: JSON.stringify({ name: expenseName, amount: parseFloat(expenseAmount), date: expenseDate }),
      });
      if (res.ok) {
        toast({ title: t("تم الإضافة", "Added"), description: t("تم إضافة المصروف", "Expense added") });
        setExpenseName(""); setExpenseAmount(""); setExpenseDate("");
        fetchPlatformFinance();
      }
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في إضافة المصروف", "Failed to add expense"), variant: "destructive" });
    } finally { setExpenseSaving(false); }
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      const res = await fetch(`/api/admin/platform-expense/${expenseId}`, {
        method: "DELETE",
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        toast({ title: t("تم الحذف", "Deleted"), description: t("تم حذف المصروف", "Expense deleted") });
        fetchPlatformFinance();
      }
    } catch {
      toast({ title: t("خطأ", "Error"), description: t("فشل في حذف المصروف", "Failed to delete expense"), variant: "destructive" });
    }
  }

  async function handleOpenReport(merchant: Merchant) {
    setReportMerchant(merchant);
    setReportDialogOpen(true);
    setReportLoading(true);
    setReportData(null);
    try {
      const res = await fetch(`/api/admin/merchant-report/${merchant.uid}`, {
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحميل التقرير", "Failed to load report"),
        variant: "destructive",
      });
    } finally {
      setReportLoading(false);
    }
  }

  async function fetchAllComplaints() {
    try {
      const res = await fetch("/api/admin/feedbacks", {
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        const data = await res.json();
        const feedbacks: any[] = data.feedbacks || [];
        const map: Record<string, number> = {};
        feedbacks.forEach((f: any) => {
          const mid = f.merchantId || "";
          map[mid] = (map[mid] || 0) + 1;
        });
        setComplaintsMap(map);
        setTotalComplaints(feedbacks.length);
      }
    } catch {
    }
  }

  async function handleOpenFeedbackDialog(merchant: Merchant) {
    setFeedbackDialogMerchant(merchant);
    setFeedbackDialogOpen(true);
    setFeedbackDialogLoading(true);
    setFeedbackDialogData([]);
    try {
      const res = await fetch(`/api/admin/feedbacks/${merchant.uid}`, {
        headers: { "x-admin-email": user?.email || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackDialogData(data.feedbacks || []);
      }
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحميل الشكاوى", "Failed to load complaints"),
        variant: "destructive",
      });
    } finally {
      setFeedbackDialogLoading(false);
    }
  }

  async function fetchSettings() {
    setSettingsLoading(true);
    try {
      const docSnap = await getDoc(doc(db, "systemSettings", "global"));
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemSettings;
        setSettings({
          appName: data.appName || "Digital Pager",
          globalLogoUrl: data.globalLogoUrl || "",
          supportWhatsapp: data.supportWhatsapp || "966500000000",
          globalThemeColor: data.globalThemeColor || "#ef0000",
          platformTermsEnabled: data.platformTermsEnabled || false,
          platformTermsText: data.platformTermsText || "",
          platformPrivacyText: data.platformPrivacyText || "",
        });
      }
    } catch {
      // silent
    } finally {
      setSettingsLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && isAdminEmail(user?.email)) {
      fetchMerchants();
      fetchTotalAlertsToday();
      fetchSettings();
      fetchSystemErrors();
      fetchAllComplaints();
    }
  }, [authLoading, user]);

  async function handleActivate(merchant: Merchant) {
    setActionLoading(merchant.uid);
    try {
      await updateDoc(doc(db, "merchants", merchant.uid), {
        status: "approved",
        subscriptionStatus: "active",
      });
      setMerchants((prev) =>
        prev.map((m) =>
          m.uid === merchant.uid
            ? { ...m, status: "approved", subscriptionStatus: "active" }
            : m
        )
      );
      toast({
        title: t("تم التفعيل", "Activated"),
        description: t(
          `تم تفعيل متجر "${merchant.storeName}" والاشتراك بنجاح`,
          `Store "${merchant.storeName}" and subscription activated`
        ),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تفعيل المتجر", "Failed to activate store"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleActivateSubscription(merchant: Merchant) {
    setActionLoading(merchant.uid);
    try {
      await updateDoc(doc(db, "merchants", merchant.uid), {
        subscriptionStatus: "active",
      });
      setMerchants((prev) =>
        prev.map((m) =>
          m.uid === merchant.uid
            ? { ...m, subscriptionStatus: "active" }
            : m
        )
      );
      toast({
        title: t("تم تفعيل الاشتراك", "Subscription Activated"),
        description: t(
          `تم تفعيل اشتراك "${merchant.storeName}" بنجاح`,
          `Subscription for "${merchant.storeName}" has been activated`
        ),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تفعيل الاشتراك", "Failed to activate subscription"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSuspend(merchant: Merchant) {
    setActionLoading(merchant.uid);
    try {
      await updateDoc(doc(db, "merchants", merchant.uid), {
        status: "suspended",
        subscriptionStatus: "cancelled",
      });
      setMerchants((prev) =>
        prev.map((m) =>
          m.uid === merchant.uid
            ? { ...m, status: "suspended", subscriptionStatus: "cancelled" }
            : m
        )
      );
      toast({
        title: t("تم الإيقاف", "Suspended"),
        description: t(
          `تم إيقاف متجر "${merchant.storeName}"`,
          `Store "${merchant.storeName}" has been suspended`
        ),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في إيقاف المتجر", "Failed to suspend store"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(merchant: Merchant) {
    setActionLoading(merchant.uid);
    try {
      await deleteDoc(doc(db, "merchants", merchant.uid));
      setMerchants((prev) => prev.filter((m) => m.uid !== merchant.uid));
      toast({
        title: t("تم الحذف", "Deleted"),
        description: t(
          `تم حذف متجر "${merchant.storeName}" بنجاح`,
          `Store "${merchant.storeName}" has been deleted`
        ),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حذف المتجر", "Failed to delete store"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  }

  async function handleImpersonate(merchant: Merchant) {
    setActionLoading(merchant.uid);
    try {
      login(merchant.uid, merchant.email);
      toast({
        title: t("تسجيل دخول كتاجر", "Logged in as Merchant"),
        description: t(
          `تم تسجيل الدخول كـ "${merchant.storeName}"`,
          `Logged in as "${merchant.storeName}"`
        ),
      });
      setLocation("/dashboard");
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تسجيل الدخول كتاجر", "Failed to impersonate merchant"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownloadQR(merchant: Merchant) {
    try {
      const response = await fetch(`/api/qr/${merchant.uid}`);
      if (!response.ok) throw new Error("Failed to download QR");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${merchant.storeName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحميل QR", "Failed to download QR"),
        variant: "destructive",
      });
    }
  }

  function getDaysRemaining(expiryDate: string | null | undefined): number | null {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  function isExpiringSoon(merchant: Merchant): boolean {
    const days = getDaysRemaining(merchant.subscriptionExpiry);
    return days !== null && days >= 0 && days <= 5 && merchant.subscriptionStatus === "active";
  }

  const expiringSoonCount = merchants.filter(isExpiringSoon).length;

  async function handleSaveExpiry(merchant: Merchant) {
    const days = parseInt(expiryDays, 10);
    if (!days || days <= 0) {
      toast({
        title: t("خطأ", "Error"),
        description: t("يرجى إدخال عدد أيام صحيح", "Please enter a valid number of days"),
        variant: "destructive",
      });
      return;
    }
    setActionLoading(merchant.uid);
    try {
      const now = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      const expiryStr = expiryDate.toISOString().split("T")[0];
      const startStr = now.toISOString().split("T")[0];
      await updateDoc(doc(db, "merchants", merchant.uid), {
        subscriptionExpiry: expiryStr,
        subscriptionStartAt: startStr,
        subscriptionStatus: "active",
      });
      setMerchants((prev) =>
        prev.map((m) =>
          m.uid === merchant.uid
            ? { ...m, subscriptionExpiry: expiryStr, subscriptionStartAt: startStr, subscriptionStatus: "active" }
            : m
        )
      );
      setEditingExpiry(null);
      setExpiryDays("");
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t(
          `تم تجديد الاشتراك لمدة ${days} يوم`,
          `Subscription renewed for ${days} days`
        ),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في تحديث تاريخ الانتهاء", "Failed to update expiry date"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveSettings() {
    setSettingsSaving(true);
    try {
      await setDoc(doc(db, "systemSettings", "global"), settings);
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم تحديث الإعدادات بنجاح", "Settings updated successfully"),
      });
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حفظ الإعدادات", "Failed to save settings"),
        variant: "destructive",
      });
    } finally {
      setSettingsSaving(false);
    }
  }

  function handleSignOut() {
    logout();
    setLocation("/");
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdminEmail(user.email)) {
    setLocation("/");
    return null;
  }

  const totalShares = merchants.reduce((sum, m) => sum + (m.sharesCount || 0), 0);

  const stats = {
    total: merchants.length,
    alertsToday: totalAlertsToday,
    totalShares,
    active: merchants.filter((m) => m.status === "approved").length,
    subActive: merchants.filter((m) => m.subscriptionStatus === "active").length,
  };

  const tabValue =
    activeSection === "home" ? "monitor" :
    activeSection === "stores" ? "merchants" :
    activeSection === "subscriptions" ? "subscriptions" :
    activeSection; // "finance" | "tracking" | "settings" | "sysmonitor" pass through

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1a" }}>
      <header className="border-b border-slate-800/80 px-6 py-3.5 sticky top-0 z-20 backdrop-blur-sm" style={{ background: "rgba(10,15,26,0.95)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-slate-100" data-testid="text-admin-title">
                {t("لوحة تحكم المشرف", "Super Admin")}
              </h1>
              <p className="text-[11px] text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setHealthDialogOpen(true); fetchSystemErrors(); }}
              className="relative"
              data-testid="button-health-monitor"
            >
              <Bell className="w-4 h-4" />
              {systemErrors.filter((e) => !e.resolved).length > 0 ? (
                <span className="absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1" data-testid="badge-error-count">
                  {systemErrors.filter((e) => !e.resolved).length}
                </span>
              ) : null}
            </Button>
            <div className="flex items-center gap-1.5" data-testid="status-system-health">
              {systemErrors.filter((e) => !e.resolved).length === 0 ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-xs text-green-500 hidden sm:inline">{t("النظام يعمل", "All Systems Nominal")}</span>
                </>
              ) : (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-500 hidden sm:inline">{t("مشاكل نشطة", "Active Issues")}</span>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              title={t("ملء الشاشة", "Toggle Fullscreen")}
              data-testid="button-toggle-fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLanguage}
              data-testid="button-toggle-language"
            >
              <Globe className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              data-testid="button-sign-out"
            >
              <LogOut className="w-4 h-4 me-1.5" />
              <span className="hidden sm:inline">{t("خروج", "Sign Out")}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex" style={{ minHeight: "calc(100vh - 57px)" }}>

        {/* ── Right Sidebar — Arabic Navigation ── */}
        <aside
          className="w-[220px] shrink-0 flex flex-col sticky top-[57px] self-start h-[calc(100vh-57px)]"
          style={{ background: "rgba(14,10,4,0.97)", borderRight: "1px solid rgba(251,191,36,0.10)" }}
          data-testid="sidebar-right"
        >
          <div className="p-5 border-b border-amber-500/10">
            <p className="text-[10px] text-amber-400/40 font-bold tracking-[0.3em] uppercase mb-1">OWNER PANEL</p>
            <p className="text-amber-300/60 text-xs font-semibold" dir="rtl" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>
              لوحة المالك
            </p>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto" dir="rtl">
            {([
              { key: "home",          icon: Activity,    labelAr: "الرئيسية",       action: () => { setActiveSection("home"); if (!globalMonitorData) fetchGlobalMonitor(); }, ownerOnly: false },
              { key: "stores",        icon: Store,       labelAr: "إدارة المتاجر",  action: () => setActiveSection("stores"), ownerOnly: false },
              { key: "subscriptions", icon: CreditCard,  labelAr: "الاشتراكات",     action: () => setActiveSection("subscriptions"), ownerOnly: false },
              { key: "finance",       icon: DollarSign,  labelAr: "المالية",        action: () => { setActiveSection("finance"); if (!platformFinanceData) fetchPlatformFinance(); }, ownerOnly: false },
              { key: "tracking",      icon: TrendingUp,  labelAr: "تتبع العملاء",   action: () => setActiveSection("tracking"), ownerOnly: false },
              { key: "sysmonitor",    icon: Gauge,       labelAr: "مراقب الأداء",   action: () => setActiveSection("sysmonitor" as any), ownerOnly: true },
              { key: "settings",      icon: Settings,    labelAr: "الإعدادات",      action: () => setActiveSection("settings"), ownerOnly: false },
            ] as const).filter(item => !item.ownerOnly || user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()).map(({ key, icon: Icon, labelAr, action }) => (
              <button
                key={key}
                onClick={action}
                data-testid={`nav-${key}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  fontFamily: "'Tajawal','Cairo',sans-serif",
                  fontWeight: activeSection === key ? 700 : 500,
                  background: activeSection === key ? "rgba(251,191,36,0.10)" : "transparent",
                  color: activeSection === key ? "rgba(251,191,36,0.9)" : "rgba(255,255,255,0.40)",
                  border: activeSection === key ? "1px solid rgba(251,191,36,0.22)" : "1px solid transparent",
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{labelAr}</span>
                {key === "home" && globalMonitorData && (
                  <span className="mr-auto text-[10px] font-bold text-amber-400/60 bg-amber-400/8 px-1.5 py-0.5 rounded-full">
                    {globalMonitorData.summary.totalPreparing ?? 0}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-amber-500/10 text-center">
            <div className="text-[10px] text-white/15 font-mono">DIGITAL PAGER v2</div>
          </div>
        </aside>

        {/* ── Center Content Area ── */}
        <div className="flex-1 min-w-0 overflow-auto px-6 py-6">
          <Tabs value={tabValue} onValueChange={() => {}} className="space-y-6">

          <TabsContent value="merchants" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  label: t("إجمالي التجار", "Total"),
                  value: stats.total,
                  icon: Store,
                  iconColor: "text-slate-400",
                  valueClass: "text-slate-100",
                  trend: null,
                  testId: "text-stat-total",
                },
                {
                  label: t("تنبيهات اليوم", "Alerts Today"),
                  value: stats.alertsToday,
                  icon: Bell,
                  iconColor: "text-sky-400",
                  valueClass: "text-sky-300",
                  trend: null,
                  testId: "text-stat-alerts-today",
                },
                {
                  label: t("مشاركات", "Shares"),
                  value: stats.totalShares,
                  icon: Share2,
                  iconColor: "text-violet-400",
                  valueClass: "text-violet-300",
                  trend: null,
                  testId: "text-stat-shares",
                },
                {
                  label: t("مفعّل", "Active"),
                  value: stats.active,
                  icon: CheckCircle,
                  iconColor: "text-emerald-400",
                  valueClass: "text-emerald-300",
                  trend: stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}%` : "—",
                  trendGreen: true,
                  testId: "text-stat-active",
                },
                {
                  label: t("مشتركين", "Subscribed"),
                  value: stats.subActive,
                  icon: CreditCard,
                  iconColor: "text-indigo-400",
                  valueClass: "text-indigo-300",
                  trend: stats.total > 0 ? `${Math.round((stats.subActive / stats.total) * 100)}%` : "—",
                  trendGreen: true,
                  testId: "text-stat-subscribed",
                },
                {
                  label: t("الشكاوى", "Complaints"),
                  value: totalComplaints,
                  icon: MessageSquare,
                  iconColor: "text-rose-400",
                  valueClass: totalComplaints > 0 ? "text-rose-300" : "text-slate-100",
                  trend: totalComplaints > 0 ? t("تحتاج مراجعة", "Needs review") : null,
                  trendGreen: false,
                  testId: "text-stat-complaints",
                },
              ].map((card) => (
                <Card key={card.testId} className="border-slate-800 bg-[#0d1117] hover:border-slate-700 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                      {card.trend && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${card.trendGreen ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          {card.trend}
                        </span>
                      )}
                    </div>
                    <p className={`text-2xl font-bold tracking-tight leading-none mb-1 ${card.valueClass}`} data-testid={card.testId}>{card.value}</p>
                    <p className="text-[11px] text-slate-500">{card.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {expiringSoonCount > 0 && (
              <Card className="border-red-500/40 bg-red-500/5" data-testid="card-expiring-soon-warning">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-500" data-testid="text-expiring-soon-count">
                      {t(
                        `${expiringSoonCount} تاجر ينتهي اشتراكهم خلال 5 أيام أو أقل`,
                        `${expiringSoonCount} merchant(s) expiring within 5 days`
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("يرجى تجديد الاشتراكات قبل انتهائها", "Please renew subscriptions before they expire")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <AdminCharts merchants={merchants} t={t} lang={lang} />

            <Card className="border-slate-800 bg-[#0d1117]">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h2 className="font-semibold text-slate-100" data-testid="text-stores-title">
                    {t("إدارة التجار", "Merchants")}
                  </h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { fetchMerchants(); fetchTotalAlertsToday(); }}
                  disabled={loadingData}
                  className="border-slate-700 bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800 h-8 text-xs"
                  data-testid="button-refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 me-1.5 ${loadingData ? "animate-spin" : ""}`} />
                  {t("تحديث", "Refresh")}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {!loadingData && merchants.length > 0 && (
                  <div className="p-4 space-y-3 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder={t("بحث بالاسم، المالك، أو البريد...", "Search by store name, owner, or email...")}
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                          className="ps-9 pe-9"
                          data-testid="input-search-merchants"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            data-testid="button-clear-search"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <select
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        data-testid="select-sort-by"
                      >
                        <option value="newest">{t("الأحدث أولاً", "Newest First")}</option>
                        <option value="qrScans">{t("الأكثر مسحاً", "Most QR Scans")}</option>
                        <option value="shares">{t("الأكثر مشاركة", "Most Shares")}</option>
                        <option value="expiry">{t("أقرب انتهاء", "Soonest Expiry")}</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { key: "all", label: t("الكل", "All") },
                        { key: "pending", label: t("قيد الانتظار", "Pending") },
                        { key: "approved", label: t("مفعّل", "Active") },
                        { key: "suspended", label: t("موقوف", "Suspended") },
                        { key: "expired", label: t("منتهي", "Expired") },
                      ].map((f) => (
                        <Button
                          key={f.key}
                          size="sm"
                          variant={statusFilter === f.key ? "default" : "outline"}
                          onClick={() => { setStatusFilter(f.key); setCurrentPage(1); }}
                          data-testid={`button-filter-${f.key}`}
                          className={statusFilter === f.key ? "" : "border-border/50"}
                        >
                          {f.label}
                          {f.key !== "all" && (
                            <span className="ms-1.5 text-xs opacity-70">
                              {f.key === "expired"
                                ? merchants.filter((m) => m.subscriptionStatus === "expired").length
                                : merchants.filter((m) => m.status === f.key).length}
                            </span>
                          )}
                        </Button>
                      ))}
                      {hasActiveFilters && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearAllFilters}
                          className="text-muted-foreground hover:text-foreground"
                          data-testid="button-clear-filters"
                        >
                          <X className="w-3.5 h-3.5 me-1" />
                          {t("مسح الفلاتر", "Clear All")}
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground ms-auto" data-testid="text-results-count">
                        {t(
                          `${filteredMerchants.length} من ${merchants.length} تاجر`,
                          `${filteredMerchants.length} of ${merchants.length} merchants`
                        )}
                      </span>
                    </div>
                  </div>
                )}
                {loadingData ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : merchants.length === 0 ? (
                  <div className="text-center py-16">
                    <Store className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground" data-testid="text-no-stores">
                      {t("لا توجد متاجر مسجلة", "No stores registered")}
                    </p>
                  </div>
                ) : filteredMerchants.length === 0 ? (
                  <div className="text-center py-16">
                    <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground" data-testid="text-no-results">
                      {t("لا توجد نتائج مطابقة", "No matching results")}
                    </p>
                    <Button
                      variant="link"
                      onClick={clearAllFilters}
                      className="mt-2 text-primary"
                      data-testid="button-clear-filters-empty"
                    >
                      {t("مسح الفلاتر", "Clear All Filters")}
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-800/60 hover:bg-transparent">
                          <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider py-3">
                            {t("اسم المتجر", "Store")}
                          </TableHead>
                          <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider py-3">
                            {t("المالك", "Owner")}
                          </TableHead>
                          <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider py-3">
                            {t("الحالة", "Status")}
                          </TableHead>
                          <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider py-3">
                            {t("الاشتراك", "Sub")}
                          </TableHead>
                          <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider py-3">
                            {t("الانتهاء", "Expiry")}
                          </TableHead>
                          <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider py-3 text-center">
                            {t("مشاركات", "Shares")}
                          </TableHead>
                          <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider py-3 text-center">
                            {t("خرائط", "Maps")}
                          </TableHead>
                          <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider py-3 text-center">
                            QR
                          </TableHead>
                          <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider py-3 text-center">
                            {t("شكاوى", "Issues")}
                          </TableHead>
                          <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wider py-3 text-center">
                            {t("إجراءات", "Actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMerchants.map((merchant) => {
                          const pLabel = planLabels[merchant.plan]
                            ? lang === "ar"
                              ? planLabels[merchant.plan].ar
                              : planLabels[merchant.plan].en
                            : merchant.plan || "trial";

                          const expiringSoon = isExpiringSoon(merchant);
                          const daysLeft = getDaysRemaining(merchant.subscriptionExpiry);

                          return (
                            <TableRow
                              key={merchant.uid}
                              className={`border-slate-800/40 hover:bg-slate-800/20 transition-colors ${expiringSoon ? "bg-red-500/[0.06]" : ""}`}
                              data-testid={`row-store-${merchant.uid}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {merchant.logoUrl ? (
                                    <img
                                      src={merchant.logoUrl}
                                      alt=""
                                      className="w-8 h-8 rounded-full object-cover border border-border"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <Store className="w-4 h-4 text-primary" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium block" data-testid={`text-store-name-${merchant.uid}`}>
                                      {highlightMatch(merchant.storeName || "")}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {btLabels[merchant.businessType] || merchant.businessType}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <span className="block" data-testid={`text-owner-${merchant.uid}`}>
                                    {highlightMatch(merchant.ownerName || "")}
                                  </span>
                                  <span className="text-xs text-muted-foreground" dir="ltr" data-testid={`text-email-${merchant.uid}`}>
                                    {highlightMatch(merchant.email || "")}
                                  </span>
                                  {merchant.commercialRegisterURL && (
                                    <a
                                      href={merchant.commercialRegisterURL}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
                                      data-testid={`link-cr-${merchant.uid}`}
                                    >
                                      <FileText className="w-3 h-3" />
                                      {t("السجل التجاري", "Commercial Register")}
                                    </a>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell data-testid={`badge-status-${merchant.uid}`}>
                                {getStatusBadge(merchant.status, t)}
                              </TableCell>
                              <TableCell data-testid={`badge-sub-${merchant.uid}`}>
                                <div className="flex flex-col gap-1">
                                  {getSubBadge(merchant.subscriptionStatus, t)}
                                  <span className="text-[10px] text-muted-foreground">{pLabel}</span>
                                  {expiringSoon && (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]" data-testid={`badge-expiring-soon-${merchant.uid}`}>
                                      <AlertTriangle className="w-3 h-3 me-1" />
                                      {t(`ينتهي خلال ${daysLeft} يوم`, `Expires in ${daysLeft} day(s)`)}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {editingExpiry === merchant.uid ? (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        min="1"
                                        placeholder={t("عدد الأيام", "Days")}
                                        value={expiryDays}
                                        onChange={(e) => setExpiryDays(e.target.value)}
                                        className="w-20 text-xs"
                                        data-testid={`input-expiry-days-${merchant.uid}`}
                                      />
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleSaveExpiry(merchant)}
                                        disabled={actionLoading === merchant.uid}
                                        data-testid={`button-save-expiry-${merchant.uid}`}
                                      >
                                        <Save className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => { setEditingExpiry(null); setExpiryDays(""); }}
                                        data-testid={`button-cancel-expiry-${merchant.uid}`}
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </Button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {[30, 90, 365].map((d) => (
                                        <Button
                                          key={d}
                                          size="sm"
                                          variant={expiryDays === String(d) ? "default" : "outline"}
                                          onClick={() => setExpiryDays(String(d))}
                                          className="text-[10px] px-2"
                                          data-testid={`button-preset-${d}-${merchant.uid}`}
                                        >
                                          {d}{t(" يوم", "d")}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    className={`text-sm cursor-pointer hover:underline ${expiringSoon ? "text-red-400 font-semibold" : "text-muted-foreground"}`}
                                    onClick={() => {
                                      setEditingExpiry(merchant.uid);
                                      setExpiryDays("");
                                    }}
                                    data-testid={`text-expiry-${merchant.uid}`}
                                  >
                                    {merchant.subscriptionExpiry
                                      ? (() => {
                                          const dateStr = new Date(merchant.subscriptionExpiry).toLocaleDateString();
                                          if (daysLeft !== null && daysLeft >= 0) {
                                            return `${dateStr} (${daysLeft} ${t("يوم", "days")})`;
                                          }
                                          return dateStr;
                                        })()
                                      : t("غير محدد", "Not set")}
                                  </button>
                                )}
                              </TableCell>
                              <TableCell className="text-center" data-testid={`text-shares-${merchant.uid}`}>
                                <div className="flex items-center justify-center gap-1">
                                  <Share2 className="w-3 h-3 text-muted-foreground" />
                                  <span>{merchant.sharesCount || 0}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center" data-testid={`text-gmaps-${merchant.uid}`}>
                                <div className="flex items-center justify-center gap-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  <span>{merchant.googleMapsClicks || 0}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>{merchant.qrScans || 0}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {(complaintsMap[merchant.uid] || 0) > 0 ? (
                                  <button
                                    onClick={() => handleOpenFeedbackDialog(merchant)}
                                    className="inline-flex items-center gap-1 cursor-pointer hover:underline text-red-400 font-semibold"
                                    data-testid={`button-complaints-${merchant.uid}`}
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>{complaintsMap[merchant.uid]}</span>
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground" data-testid={`text-complaints-${merchant.uid}`}>0</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1.5">
                                  {actionLoading === merchant.uid ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                  ) : merchant.status !== "approved" ? (
                                    <Button
                                      size="sm"
                                      onClick={() => handleActivate(merchant)}
                                      className="h-7 px-2.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300"
                                      variant="outline"
                                      data-testid={`button-activate-${merchant.uid}`}
                                    >
                                      <CheckCircle className="w-3 h-3 me-1" />
                                      {t("تفعيل", "Activate")}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleSuspend(merchant)}
                                      className="h-7 px-2.5 text-xs bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200"
                                      variant="outline"
                                      data-testid={`button-suspend-${merchant.uid}`}
                                    >
                                      <XCircle className="w-3 h-3 me-1" />
                                      {t("إيقاف", "Suspend")}
                                    </Button>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                                        data-testid={`button-more-${merchant.uid}`}
                                      >
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-[#0d1117] border-slate-800 min-w-[180px]">
                                      {merchant.status === "approved" && merchant.subscriptionStatus !== "active" && (
                                        <DropdownMenuItem
                                          onClick={() => handleActivateSubscription(merchant)}
                                          className="text-indigo-400 focus:text-indigo-300 focus:bg-indigo-500/10 cursor-pointer"
                                          data-testid={`button-activate-sub-${merchant.uid}`}
                                        >
                                          <Zap className="w-3.5 h-3.5 me-2" />
                                          {t("تفعيل الاشتراك", "Activate Sub")}
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => handleOpenSubPayment(merchant)}
                                        className="cursor-pointer"
                                        data-testid={`button-subscription-${merchant.uid}`}
                                      >
                                        <Wallet className="w-3.5 h-3.5 me-2" />
                                        {t("الاشتراك والدفع", "Subscription")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleOpenReport(merchant)}
                                        className="cursor-pointer"
                                        data-testid={`button-report-${merchant.uid}`}
                                      >
                                        <FileText className="w-3.5 h-3.5 me-2" />
                                        {t("التقرير", "Report")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleOpenFeatures(merchant)}
                                        className="cursor-pointer"
                                        data-testid={`button-features-${merchant.uid}`}
                                      >
                                        <Settings className="w-3.5 h-3.5 me-2" />
                                        {t("الميزات", "Features")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleImpersonate(merchant)}
                                        className="cursor-pointer"
                                        data-testid={`button-impersonate-${merchant.uid}`}
                                      >
                                        <LogIn className="w-3.5 h-3.5 me-2" />
                                        {t("دخول كتاجر", "Login As")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDownloadQR(merchant)}
                                        className="cursor-pointer"
                                        data-testid={`button-download-qr-${merchant.uid}`}
                                      >
                                        <Download className="w-3.5 h-3.5 me-2" />
                                        {t("تحميل QR", "Download QR")}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="bg-slate-800" />
                                      <DropdownMenuItem
                                        onClick={() => setDeleteTarget(merchant)}
                                        className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10 cursor-pointer"
                                        data-testid={`button-delete-${merchant.uid}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5 me-2" />
                                        {t("حذف", "Delete")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {!loadingData && filteredMerchants.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between p-4 border-t border-border/30">
                    <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                      {t(
                        `صفحة ${safePage} من ${totalPages}`,
                        `Page ${safePage} of ${totalPages}`
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={safePage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          size="sm"
                          variant={page === safePage ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          data-testid={`button-page-${page}`}
                          className="min-w-[36px]"
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={safePage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Subscriptions Section ── */}
          <TabsContent value="subscriptions" className="space-y-6" data-testid="section-subscriptions">
            <div>
              <h2 className="text-xl font-bold text-amber-300/90 mb-1" dir="rtl" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>
                إدارة الاشتراكات
              </h2>
              <p className="text-sm text-slate-500 mb-5">Subscription plans, expiry dates and payment status</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t("إجمالي الاشتراكات", "Total Subs"), value: merchants.length, color: "#94a3b8", icon: Users },
                { label: t("نشطة", "Active"), value: merchants.filter(m => m.subscriptionStatus === "active").length, color: "#34d399", icon: CheckCircle },
                { label: t("منتهية", "Expired"), value: merchants.filter(m => m.subscriptionStatus === "expired").length, color: "#f87171", icon: XCircle },
                { label: t("تنتهي قريباً", "Expiring Soon"), value: merchants.filter(m => {
                  const exp = (m as any).subscriptionExpiry;
                  if (!exp) return false;
                  const days = (new Date(exp).getTime() - Date.now()) / 86400000;
                  return days >= 0 && days <= 7;
                }).length, color: "#fbbf24", icon: Clock },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">{label}</p>
                    <p className="text-xl font-bold" style={{ color }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Subscriptions table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="overflow-x-auto">
                <Table data-testid="table-subscriptions">
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-slate-500 text-xs">{t("المتجر", "Store")}</TableHead>
                      <TableHead className="text-slate-500 text-xs">{t("الخطة", "Plan")}</TableHead>
                      <TableHead className="text-slate-500 text-xs">{t("الحالة", "Status")}</TableHead>
                      <TableHead className="text-slate-500 text-xs">{t("تاريخ الانتهاء", "Expiry")}</TableHead>
                      <TableHead className="text-slate-500 text-xs">{t("الدفع", "Payment")}</TableHead>
                      <TableHead className="text-slate-500 text-xs text-center">{t("إجراء", "Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...merchants]
                      .sort((a, b) => {
                        const ea = new Date((a as any).subscriptionExpiry || 0).getTime();
                        const eb = new Date((b as any).subscriptionExpiry || 0).getTime();
                        return ea - eb;
                      })
                      .map((m) => {
                        const exp = (m as any).subscriptionExpiry;
                        const daysLeft = exp ? Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000) : null;
                        const isExpired = daysLeft !== null && daysLeft < 0;
                        const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                        return (
                          <TableRow key={m.uid} className="border-white/[0.04] hover:bg-white/[0.02]" data-testid={`sub-row-${m.uid}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {m.logoUrl ? (
                                  <img src={m.logoUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                                    <Store className="w-3.5 h-3.5 text-white/30" />
                                  </div>
                                )}
                                <span className="text-sm font-medium text-slate-200">{m.storeName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-blue-300/70 font-mono">
                                {planLabels[(m as any).planType as keyof typeof planLabels] || (m as any).planType || "—"}
                              </span>
                            </TableCell>
                            <TableCell>{getSubBadge(m.subscriptionStatus, t)}</TableCell>
                            <TableCell>
                              {exp ? (
                                <div>
                                  <p className="text-xs text-slate-300">{new Date(exp).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}</p>
                                  {daysLeft !== null && (
                                    <p className={`text-[10px] font-semibold mt-0.5 ${isExpired ? "text-red-400" : isExpiringSoon ? "text-amber-400" : "text-slate-500"}`}>
                                      {isExpired
                                        ? t(`منذ ${Math.abs(daysLeft)} يوم`, `${Math.abs(daysLeft)}d ago`)
                                        : daysLeft === 0
                                        ? t("اليوم", "Today")
                                        : t(`${daysLeft} يوم`, `${daysLeft}d left`)}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-600">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={m.subscriptionStatus === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-slate-500/15 text-slate-400 border-slate-500/25"}>
                                {m.subscriptionStatus === "active" ? t("مدفوع", "Paid") : t("غير مدفوع", "Unpaid")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenSubPayment(m)}
                                className="h-7 px-2.5 text-xs border-amber-500/25 text-amber-400/80 hover:bg-amber-500/10"
                                data-testid={`btn-sub-payment-${m.uid}`}
                              >
                                <CreditCard className="w-3 h-3 me-1" />
                                {t("تجديد", "Renew")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── Live Center / Home Section ── */}
          <TabsContent value="monitor" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-monitor-title">
                <Activity className="w-5 h-5 text-primary" />
                {t("المراقبة الشاملة", "Global Monitor")}
              </h2>
              <Button variant="outline" size="sm" onClick={fetchGlobalMonitor} disabled={globalMonitorLoading} data-testid="button-refresh-monitor">
                <RefreshCw className={`w-4 h-4 me-1.5 ${globalMonitorLoading ? "animate-spin" : ""}`} />
                {t("تحديث", "Refresh")}
              </Button>
            </div>
            {globalMonitorLoading && !globalMonitorData ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : globalMonitorData ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{t("إجمالي المتاجر", "Total Stores")}</p>
                      <p className="text-2xl font-bold" data-testid="text-monitor-total-stores">{globalMonitorData.summary.totalMerchants}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{t("طلبات اليوم", "Orders Today")}</p>
                      <p className="text-2xl font-bold text-primary" data-testid="text-monitor-orders-today">{globalMonitorData.summary.totalOrdersToday}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{t("إجمالي الطلبات", "All-Time Orders")}</p>
                      <p className="text-2xl font-bold" data-testid="text-monitor-orders-total">{globalMonitorData.summary.totalOrdersAllTime}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{t("تم التسليم", "Collected")}</p>
                      <p className="text-2xl font-bold text-emerald-400" data-testid="text-monitor-collected">{globalMonitorData.summary.totalCollected}</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{t("قيد التحضير", "Preparing")}</p>
                      <p className="text-2xl font-bold text-amber-400" data-testid="text-monitor-preparing">{globalMonitorData.summary.totalPreparing}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{t("جاهز", "Ready")}</p>
                      <p className="text-2xl font-bold text-violet-400" data-testid="text-monitor-ready">{globalMonitorData.summary.totalReady}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{t("لم يُستلم", "Uncollected")}</p>
                      <p className="text-2xl font-bold text-red-400" data-testid="text-monitor-uncollected">{globalMonitorData.summary.totalUncollected}</p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("المتجر", "Store")}</TableHead>
                            <TableHead className="text-center">{t("اليوم", "Today")}</TableHead>
                            <TableHead className="text-center">{t("الإجمالي", "Total")}</TableHead>
                            <TableHead className="text-center">{t("تم التسليم", "Collected")}</TableHead>
                            <TableHead className="text-center">{t("لم يُستلم", "Uncollected")}</TableHead>
                            <TableHead className="text-center">{t("الإيرادات", "Revenue")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {globalMonitorData.merchants.map((m: any, idx: number) => (
                            <TableRow key={m.merchantId} data-testid={`row-monitor-${idx}`}>
                              <TableCell className="font-medium" data-testid={`text-monitor-store-${idx}`}>{m.storeName}</TableCell>
                              <TableCell className="text-center">{m.ordersToday}</TableCell>
                              <TableCell className="text-center">{m.ordersTotal}</TableCell>
                              <TableCell className="text-center text-emerald-400">{m.collected}</TableCell>
                              <TableCell className="text-center text-red-400">{m.uncollected}</TableCell>
                              <TableCell className="text-center font-mono">{m.revenue.toFixed(2)} <span className="text-muted-foreground text-xs">SAR</span></TableCell>
                            </TableRow>
                          ))}
                          {globalMonitorData.merchants.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                {t("لا توجد بيانات", "No data available")}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">{t("اضغط تحديث لتحميل البيانات", "Click refresh to load data")}</div>
            )}
          </TabsContent>

          <TabsContent value="finance" className="space-y-6">
            {platformFinanceLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : platformFinanceData ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    {t("المالية المركزية", "Central Finance")}
                  </h2>
                  <Button variant="outline" size="sm" onClick={fetchPlatformFinance} data-testid="button-refresh-finance">
                    <RefreshCw className="w-4 h-4 me-1.5" />{t("تحديث", "Refresh")}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-emerald-500/30">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{t("إجمالي الإيرادات", "Total Revenue")}</p>
                          <p className="text-3xl font-bold text-emerald-400" data-testid="text-total-revenue">
                            {platformFinanceData.totalRevenue?.toLocaleString() || 0} <span className="text-base">{t("ر.س", "SAR")}</span>
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-red-500/30">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{t("إجمالي المصروفات", "Total Expenses")}</p>
                          <p className="text-3xl font-bold text-red-400" data-testid="text-total-expenses">
                            {platformFinanceData.totalExpenses?.toLocaleString() || 0} <span className="text-base">{t("ر.س", "SAR")}</span>
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                          <TrendingDown className="w-6 h-6 text-red-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={(platformFinanceData.netProfit || 0) >= 0 ? "border-emerald-500/30" : "border-red-500/30"}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{t("صافي الربح", "Net Profit")}</p>
                          <p className={`text-3xl font-bold ${(platformFinanceData.netProfit || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`} data-testid="text-net-profit">
                            {platformFinanceData.netProfit?.toLocaleString() || 0} <span className="text-base">{t("ر.س", "SAR")}</span>
                          </p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${(platformFinanceData.netProfit || 0) >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"} flex items-center justify-center`}>
                          <Wallet className={`w-6 h-6 ${(platformFinanceData.netProfit || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2 pb-4">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-semibold">{t("إيرادات المتاجر", "Store Revenue")}</h3>
                    </CardHeader>
                    <CardContent>
                      {(platformFinanceData.revenueByMerchant || []).length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">{t("لا توجد إيرادات بعد", "No revenue yet")}</p>
                      ) : (
                        <div className="space-y-3">
                          {platformFinanceData.revenueByMerchant.map((m: any, i: number) => (
                            <div key={m.merchantId} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]" data-testid={`row-revenue-${i}`}>
                              <div>
                                <p className="font-medium text-sm">{m.storeName}</p>
                                <p className="text-xs text-muted-foreground">{m.paymentCount} {t("دفعة", "payments")}</p>
                              </div>
                              <p className="font-bold text-emerald-400">{m.totalPaid?.toLocaleString()} {t("ر.س", "SAR")}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2 pb-4">
                      <Minus className="w-5 h-5 text-red-400" />
                      <h3 className="font-semibold">{t("المصروفات", "Expenses")}</h3>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input placeholder={t("اسم المصروف", "Expense name")} value={expenseName} onChange={(e) => setExpenseName(e.target.value)} className="flex-1" data-testid="input-expense-name" />
                        <Input type="number" placeholder={t("المبلغ", "Amount")} value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-28" data-testid="input-expense-amount" />
                        <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-36" data-testid="input-expense-date" />
                        <Button onClick={handleAddExpense} disabled={expenseSaving || !expenseName || !expenseAmount || !expenseDate} data-testid="button-add-expense">
                          {expenseSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>
                      {(platformFinanceData.expenses || []).length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">{t("لا توجد مصروفات", "No expenses")}</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {platformFinanceData.expenses.map((exp: any) => (
                            <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]" data-testid={`row-expense-${exp.id}`}>
                              <div>
                                <p className="font-medium text-sm">{exp.name}</p>
                                <p className="text-xs text-muted-foreground">{exp.date}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-red-400">{exp.amount?.toLocaleString()} {t("ر.س", "SAR")}</p>
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteExpense(exp.id)} data-testid={`button-delete-expense-${exp.id}`}>
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {(platformFinanceData.revenueByMerchant || []).length > 0 && (
                  <Card className="border-violet-500/30">
                    <CardHeader className="flex flex-row items-center gap-2 pb-4">
                      <Star className="w-5 h-5 text-violet-400" />
                      <h3 className="font-semibold">{t("ترتيب الولاء (بعدد التجديدات)", "Loyalty Ranking (by Total Renewals)")}</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[...platformFinanceData.revenueByMerchant].sort((a: any, b: any) => b.paymentCount - a.paymentCount).map((m: any, i: number) => (
                          <div key={m.merchantId} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]" data-testid={`row-loyalty-${i}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-gray-400/20 text-gray-300" : i === 2 ? "bg-orange-600/20 text-orange-400" : "bg-white/[0.06] text-muted-foreground"}`}>
                                {i + 1}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{m.storeName}</p>
                                <p className="text-xs text-muted-foreground">{m.totalPaid?.toLocaleString()} {t("ر.س إجمالي", "SAR total")}</p>
                              </div>
                            </div>
                            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                              {m.paymentCount} {t("تجديد", "renewals")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {renewalData && (renewalData.upcomingExpirations || []).length > 0 && (
                  <Card className="border-amber-500/30">
                    <CardHeader className="flex flex-row items-center gap-2 pb-4">
                      <CalendarDays className="w-5 h-5 text-amber-400" />
                      <h3 className="font-semibold">{t("اشتراكات تنتهي قريباً", "Upcoming Expirations")}</h3>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 ms-auto">{renewalData.upcomingExpirations.length}</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {renewalData.upcomingExpirations.map((m: any) => (
                          <div key={m.merchantId} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20" data-testid={`row-expiring-${m.merchantId}`}>
                            <div>
                              <p className="font-medium text-sm">{m.storeName}</p>
                              <p className="text-xs text-amber-400">
                                {m.daysLeft === 0 ? t("ينتهي اليوم!", "Expires today!") : t(`ينتهي خلال ${m.daysLeft} يوم`, `Expires in ${m.daysLeft} days`)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                              onClick={() => {
                                const merchant = merchants.find(m2 => m2.uid === m.merchantId);
                                if (merchant) handleOpenSubPayment(merchant);
                              }}
                              data-testid={`button-renew-${m.merchantId}`}
                            >
                              <RefreshCw className="w-3.5 h-3.5 me-1.5" />{t("تجديد", "Renew")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">{t("اضغط على التبويب لتحميل البيانات", "Click tab to load data")}</div>
            )}
          </TabsContent>

          <TabsContent value="tracking" className="space-y-6" data-testid="section-tracking">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-lg" data-testid="text-tracking-title">
                  {t("تتبع العملاء — إجمالي المنصة", "Customer Tracking — Platform Totals")}
                </h2>
              </CardHeader>
              <CardContent>
                {(() => {
                  const totals = merchants.reduce(
                    (acc, m: any) => ({
                      linkVisits: acc.linkVisits + (m.linkVisits || 0),
                      qrScans: acc.qrScans + (m.qrScans || 0),
                      cartSessions: acc.cartSessions + (m.cartSessions || 0),
                      completedOrders: acc.completedOrders + (m.completedOrders || 0),
                    }),
                    { linkVisits: 0, qrScans: 0, cartSessions: 0, completedOrders: 0 }
                  );
                  const abandoned = Math.max(0, totals.cartSessions - totals.completedOrders);
                  const totalVisits = totals.linkVisits + totals.qrScans;
                  const conversion = totalVisits > 0 ? Math.round((totals.completedOrders / totalVisits) * 100) : 0;
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: t("زيارات الرابط", "Link Visits"), value: totals.linkVisits, color: "text-blue-400" },
                          { label: t("مسح QR", "QR Scans"), value: totals.qrScans, color: "text-purple-400" },
                          { label: t("طلبات مكتملة", "Completed Orders"), value: totals.completedOrders, color: "text-emerald-400" },
                          { label: t("سلات متروكة", "Abandoned Carts"), value: abandoned, color: "text-amber-400" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="rounded-xl p-4 bg-white/5 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            <p className={`text-3xl font-black ${color}`}>{value.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl p-4 bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{t("معدل التحويل الإجمالي", "Overall Conversion Rate")}</p>
                          <p className="text-4xl font-black text-blue-300 mt-1">{conversion}%</p>
                        </div>
                        <TrendingUp className="w-12 h-12 text-blue-500/20" />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="table-tracking-merchants">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="text-start py-2 px-3 text-muted-foreground font-medium">{t("المتجر", "Store")}</th>
                              <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t("زيارات", "Visits")}</th>
                              <th className="text-center py-2 px-3 text-muted-foreground font-medium">QR</th>
                              <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t("سلات", "Sessions")}</th>
                              <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t("طلبات", "Orders")}</th>
                              <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t("تحويل", "Conv.")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {merchants.map((m: any) => {
                              const vis = (m.linkVisits || 0) + (m.qrScans || 0);
                              const conv = vis > 0 ? Math.round(((m.completedOrders || 0) / vis) * 100) : 0;
                              return (
                                <tr key={m.uid} className="border-b border-white/5 hover:bg-white/3">
                                  <td className="py-2 px-3 font-medium">{m.storeName || m.email}</td>
                                  <td className="py-2 px-3 text-center text-blue-300">{m.linkVisits || 0}</td>
                                  <td className="py-2 px-3 text-center text-purple-300">{m.qrScans || 0}</td>
                                  <td className="py-2 px-3 text-center text-amber-300">{m.cartSessions || 0}</td>
                                  <td className="py-2 px-3 text-center text-emerald-300">{m.completedOrders || 0}</td>
                                  <td className="py-2 px-3 text-center font-bold">{conv}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-4">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg" data-testid="text-settings-title">
                  {t("إعدادات النظام", "System Settings")}
                </h2>
              </CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6 max-w-lg">
                    <div className="space-y-2">
                      <Label htmlFor="appName" data-testid="label-app-name">
                        {t("اسم التطبيق", "App Name")}
                      </Label>
                      <Input
                        id="appName"
                        value={settings.appName}
                        onChange={(e) => setSettings((s) => ({ ...s, appName: e.target.value }))}
                        data-testid="input-app-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="globalLogoUrl" data-testid="label-logo-url">
                        {t("رابط الشعار العام", "Global Logo URL")}
                      </Label>
                      <Input
                        id="globalLogoUrl"
                        value={settings.globalLogoUrl || ""}
                        onChange={(e) => setSettings((s) => ({ ...s, globalLogoUrl: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                        data-testid="input-logo-url"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supportWhatsapp" data-testid="label-whatsapp">
                        {t("رقم واتساب الدعم", "Support WhatsApp")}
                      </Label>
                      <Input
                        id="supportWhatsapp"
                        value={settings.supportWhatsapp}
                        onChange={(e) => setSettings((s) => ({ ...s, supportWhatsapp: e.target.value }))}
                        placeholder="966500000000"
                        dir="ltr"
                        data-testid="input-whatsapp"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="globalThemeColor" data-testid="label-theme-color">
                        {t("لون السمة العام", "Global Theme Color")}
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="globalThemeColor"
                          type="color"
                          value={settings.globalThemeColor}
                          onChange={(e) => setSettings((s) => ({ ...s, globalThemeColor: e.target.value }))}
                          className="w-16 p-1"
                          data-testid="input-theme-color"
                        />
                        <Input
                          value={settings.globalThemeColor}
                          onChange={(e) => setSettings((s) => ({ ...s, globalThemeColor: e.target.value }))}
                          placeholder="#ef0000"
                          dir="ltr"
                          className="flex-1"
                          data-testid="input-theme-color-text"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label data-testid="label-platform-terms-toggle">
                            {t("شروط وأحكام المنصة وسياسة الخصوصية", "Platform Terms & Privacy Policy")}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t("عرض الشروط والأحكام عند تسجيل المتاجر", "Show terms & conditions at store registration")}
                          </p>
                        </div>
                        <Switch
                          checked={settings.platformTermsEnabled}
                          onCheckedChange={async (checked) => {
                            setSettings(s => ({ ...s, platformTermsEnabled: checked }));
                            try {
                              const ref = doc(db, "systemSettings", "global");
                              await updateDoc(ref, { platformTermsEnabled: checked });
                            } catch {
                              setSettings(s => ({ ...s, platformTermsEnabled: !checked }));
                            }
                          }}
                          data-testid="switch-platform-terms"
                        />
                      </div>

                      {settings.platformTermsEnabled && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="platformTermsText" data-testid="label-platform-terms-text">
                              {t("شروط وأحكام المنصة", "Platform Terms & Conditions")}
                            </Label>
                            <Textarea
                              id="platformTermsText"
                              value={settings.platformTermsText}
                              onChange={(e) => setSettings(s => ({ ...s, platformTermsText: e.target.value }))}
                              placeholder={t("اكتب شروط وأحكام المنصة هنا...", "Write platform terms & conditions here...")}
                              rows={6}
                              dir="rtl"
                              className="resize-y"
                              data-testid="textarea-platform-terms"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platformPrivacyText" data-testid="label-platform-privacy-text">
                              {t("سياسة الخصوصية للمنصة", "Platform Privacy Policy")}
                            </Label>
                            <Textarea
                              id="platformPrivacyText"
                              value={settings.platformPrivacyText}
                              onChange={(e) => setSettings(s => ({ ...s, platformPrivacyText: e.target.value }))}
                              placeholder={t("اكتب سياسة الخصوصية هنا...", "Write platform privacy policy here...")}
                              rows={6}
                              dir="rtl"
                              className="resize-y"
                              data-testid="textarea-platform-privacy"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleSaveSettings}
                      disabled={settingsSaving}
                      data-testid="button-save-settings"
                    >
                      {settingsSaving ? (
                        <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 me-1.5" />
                      )}
                      {t("حفظ الإعدادات", "Save Settings")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ System Performance Monitor ══ */}
          <TabsContent value="sysmonitor" className="space-y-6" data-testid="section-sysmonitor">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100" dir="rtl" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>
                  مراقب أداء الخادم
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Server Performance Monitor — Owner Only</p>
              </div>
              <div className="flex items-center gap-3">
                {sysHealth && (
                  <span className="text-[11px] text-slate-500">
                    {t("آخر تحديث", "Last update")}: {new Date(sysHealth.timestamp).toLocaleTimeString()}
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  {sysHealthLoading ? (
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  )}
                  <span className="text-[11px] text-slate-500">{sysHealthLoading ? t("يتحدث…", "Refreshing…") : t("مباشر", "Live")}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchSysHealth}
                  disabled={sysHealthLoading}
                  data-testid="button-refresh-syshealth"
                  className="h-8 text-xs gap-1.5 border-slate-700"
                >
                  <Activity className="w-3.5 h-3.5" />
                  {t("تحديث", "Refresh")}
                </Button>
              </div>
            </div>

            {sysHealthLoading && !sysHealth ? (
              <div className="text-center py-16">
                <Cpu className="w-8 h-8 text-slate-600 mx-auto mb-3 animate-pulse" />
                <p className="text-slate-500 text-sm">{t("جارٍ جمع بيانات الأداء…", "Collecting performance data…")}</p>
              </div>
            ) : sysHealth ? (
              <>
                {/* Metric Cards Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* CPU Card */}
                  {(() => {
                    const pct = sysHealth.cpu?.percent ?? 0;
                    const color = pct >= 85 ? "#ef4444" : pct >= 60 ? "#eab308" : "#22c55e";
                    const label = pct >= 85 ? (t("حرج", "Critical")) : pct >= 60 ? (t("تحذير", "Warning")) : (t("طبيعي", "Normal"));
                    return (
                      <Card className="bg-slate-900/80 border-slate-800" data-testid="card-cpu">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                                <Cpu className="w-4 h-4" style={{ color }} />
                              </div>
                              <span className="text-sm font-semibold text-slate-200">المعالج CPU</span>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>
                              {label}
                            </span>
                          </div>
                          {/* Circular-ish big number */}
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-4xl font-black" style={{ color }} data-testid="text-cpu-percent">{pct}</span>
                            <span className="text-slate-500 text-sm mb-1">%</span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-[11px] text-slate-500">
                            <span>{sysHealth.cpu?.cores ?? "—"} أنوية</span>
                            <span>Load: {sysHealth.cpu?.loadAvg1m ?? "—"}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* RAM Card */}
                  {(() => {
                    const pct = sysHealth.memory?.percent ?? 0;
                    const color = pct >= 90 ? "#ef4444" : pct >= 80 ? "#eab308" : "#22c55e";
                    const label = pct >= 90 ? t("حرج", "Critical") : pct >= 80 ? t("تحذير", "Warning") : t("طبيعي", "Normal");
                    return (
                      <Card className="bg-slate-900/80 border-slate-800" data-testid="card-ram">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                                <HardDrive className="w-4 h-4" style={{ color }} />
                              </div>
                              <span className="text-sm font-semibold text-slate-200">الذاكرة RAM</span>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>
                              {label}
                            </span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-4xl font-black" style={{ color }} data-testid="text-ram-percent">{pct}</span>
                            <span className="text-slate-500 text-sm mb-1">%</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-[11px] text-slate-500">
                            <span data-testid="text-ram-used">{sysHealth.memory?.usedMB ?? "—"} MB {t("مستخدم", "used")}</span>
                            <span>{sysHealth.memory?.totalMB ?? "—"} MB {t("إجمالي", "total")}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>

                {/* Secondary info row */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Process Uptime */}
                  <Card className="bg-slate-900/80 border-slate-800">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <CircleDot className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Process Uptime</p>
                        <p className="text-sm font-bold text-slate-200" data-testid="text-process-uptime">{sysHealth.uptime?.process}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Uptime */}
                  <Card className="bg-slate-900/80 border-slate-800">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <ServerCrash className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">System Uptime</p>
                        <p className="text-sm font-bold text-slate-200" data-testid="text-system-uptime">{sysHealth.uptime?.system}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* DB Connectivity */}
                  {(() => {
                    const dbOk = sysHealth.db?.status === "connected";
                    const isInit = sysHealth.db?.status === "initializing";
                    const responseMs = sysHealth.db?.responseMs ?? 0;
                    const rttMs = sysHealth.db?.firestoreRttMs ?? -1;
                    // Color the response-time gauge: <50ms green, 50-150ms yellow, >150ms red
                    const latColor = !dbOk && !isInit ? "#ef4444"
                      : responseMs <= 50 ? "#22c55e"
                      : responseMs <= 150 ? "#eab308"
                      : "#ef4444";
                    const latLabel = !dbOk && !isInit ? t("خطأ", "Error")
                      : responseMs <= 50 ? t("ممتاز", "Excellent")
                      : responseMs <= 150 ? t("جيد", "Good")
                      : t("بطيء", "Slow");
                    const checkedAt = sysHealth.db?.checkedAt
                      ? new Date(sysHealth.db.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                      : null;
                    return (
                      <Card className="bg-slate-900/80 border-slate-800" data-testid="card-db">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${latColor}18` }}>
                                {dbOk || isInit ? <Wifi className="w-4 h-4" style={{ color: latColor }} /> : <WifiOff className="w-4 h-4 text-red-400" />}
                              </div>
                              <span className="text-sm font-semibold text-slate-200">Database</span>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${latColor}18`, color: latColor }}>
                              {latLabel}
                            </span>
                          </div>
                          <div className="flex items-end gap-2 mb-1">
                            <span className="text-4xl font-black" style={{ color: latColor }} data-testid="text-db-response-ms">
                              {isInit ? "—" : responseMs}
                            </span>
                            <span className="text-slate-500 text-sm mb-1">ms</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mb-2">{t("وقت استجابة الخادم", "Endpoint Response Time")}</p>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (responseMs / 150) * 100)}%`, background: latColor }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600">
                            <span data-testid="text-db-status">
                              {dbOk ? t("متصل", "Connected") : isInit ? t("يتهيأ…", "Initializing…") : t("خطأ", "Error")}
                            </span>
                            {rttMs > 0 && (
                              <span title="Actual Firestore network round-trip">
                                Firestore RTT: {rttMs}ms
                              </span>
                            )}
                            {checkedAt && <span>{t("فُحص في", "Checked") + " " + checkedAt}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>

                {/* Platform info */}
                <Card className="bg-slate-900/60 border-slate-800/60">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
                      <span>Node: <span className="text-slate-300 font-mono">{sysHealth.platform?.node}</span></span>
                      <span>Platform: <span className="text-slate-300 font-mono">{sysHealth.platform?.platform}</span></span>
                      <span>Arch: <span className="text-slate-300 font-mono">{sysHealth.platform?.arch}</span></span>
                      <span className="mr-auto">{t("تحديث تلقائي كل 30 ثانية", "Auto-refresh every 30 seconds")}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Alert log */}
                <Card className="bg-slate-900/80 border-slate-800" data-testid="card-alert-log">
                  <CardHeader className="pb-3">
                    <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      {t("سجل التنبيهات (آخر 10)", "Alert Log (last 10)")}
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {sysAlerts.length === 0 ? (
                      <div className="text-center py-8 text-slate-600 text-sm" data-testid="text-no-alerts">
                        {t("لا توجد تنبيهات في هذه الجلسة", "No alerts this session")}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/60">
                        {sysAlerts.map((alert, i) => (
                          <div key={i} className="flex items-center gap-3 px-5 py-2.5" data-testid={`alert-row-${i}`}>
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: alert.level === "critical" ? "#ef4444" : "#eab308" }}
                            />
                            <span className="text-[11px] text-slate-500 font-mono shrink-0">{alert.time}</span>
                            <span className="text-xs text-slate-300" dir="rtl" style={{ fontFamily: "'Tajawal','Cairo',sans-serif" }}>
                              {alert.message}
                            </span>
                            <span
                              className="ms-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                background: alert.level === "critical" ? "#ef444420" : "#eab30820",
                                color: alert.level === "critical" ? "#ef4444" : "#eab308",
                              }}
                            >
                              {alert.level === "critical" ? "CRITICAL" : "WARN"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-16">
                <ServerCrash className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">{t("فشل في تحميل بيانات الأداء", "Failed to load performance data")}</p>
                <Button size="sm" variant="outline" onClick={fetchSysHealth} className="mt-4 border-slate-700 text-slate-400">
                  {t("إعادة المحاولة", "Retry")}
                </Button>
              </div>
            )}
          </TabsContent>

          </Tabs>
        </div>

        {/* ── Left Sidebar — English Quick Stats ── */}
        <aside
          className="w-[190px] shrink-0 flex flex-col sticky top-[57px] self-start h-[calc(100vh-57px)]"
          style={{ background: "rgba(8,12,22,0.97)", borderLeft: "1px solid rgba(59,130,246,0.12)" }}
          data-testid="sidebar-left"
        >
          <div className="p-4 border-b border-blue-500/10">
            <p className="text-[10px] text-blue-400/45 font-bold tracking-[0.3em] uppercase">SYSTEM</p>
            <p className="text-blue-300/55 text-xs mt-0.5 font-medium">Quick Stats</p>
          </div>
          <div className="p-4 space-y-5 flex-1 overflow-y-auto">

            {/* Live order counter — hero stat */}
            {globalMonitorData && (
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)" }}>
                <p className="text-[10px] text-blue-400/55 uppercase tracking-widest mb-1">LIVE ORDERS</p>
                <p className="text-4xl font-black text-blue-300" data-testid="text-sidebar-live-counter" style={{ textShadow: "0 0 20px rgba(59,130,246,0.4)" }}>
                  {(globalMonitorData.summary.totalPreparing ?? 0) + (globalMonitorData.summary.totalReady ?? 0)}
                </p>
                <p className="text-[10px] text-blue-400/40 mt-1">Active across all stores</p>
              </div>
            )}

            {/* Quick stats list */}
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2.5">Platform</p>
              <div className="space-y-2">
                {[
                  { label: "Total Stores",   value: stats.total,     color: "#94a3b8" },
                  { label: "Active Stores",  value: stats.active,    color: "#34d399" },
                  { label: "Active Subs",    value: stats.subActive, color: "#60a5fa" },
                  { label: "Alerts Today",   value: stats.alertsToday, color: "#f59e0b" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[11px] text-white/30">{label}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System status */}
            <div className="border-t border-white/[0.05] pt-4">
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2.5">System Status</p>
              <div className="flex items-center gap-1.5">
                {systemErrors.filter(e => !e.resolved).length === 0 ? (
                  <><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[11px] text-emerald-400">All Nominal</span></>
                ) : (
                  <><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-[11px] text-red-400">{systemErrors.filter(e => !e.resolved).length} Issues</span></>
                )}
              </div>
            </div>

            {/* Shortcuts */}
            <div className="border-t border-white/[0.05] pt-4">
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2.5">Shortcuts</p>
              <div className="space-y-2">
                <button
                  onClick={() => { setActiveSection("home"); if (!globalMonitorData) fetchGlobalMonitor(); }}
                  className="w-full text-left text-[11px] text-blue-400/65 hover:text-blue-300 transition-colors py-1 flex items-center gap-1.5"
                  data-testid="shortcut-live-view"
                >
                  <Activity className="w-3 h-3 shrink-0" /> Live View
                </button>
                <button
                  onClick={() => { setHealthDialogOpen(true); fetchSystemErrors(); }}
                  className="w-full text-left text-[11px] text-blue-400/65 hover:text-blue-300 transition-colors py-1 flex items-center gap-1.5"
                  data-testid="shortcut-logs"
                >
                  <Bell className="w-3 h-3 shrink-0" /> System Logs
                </button>
                <button
                  onClick={() => { setActiveSection("stores"); }}
                  className="w-full text-left text-[11px] text-blue-400/65 hover:text-blue-300 transition-colors py-1 flex items-center gap-1.5"
                  data-testid="shortcut-stores"
                >
                  <Store className="w-3 h-3 shrink-0" /> All Stores
                </button>
              </div>
            </div>
          </div>
        </aside>

      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="border-red-500/30 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">
              {t("تأكيد الحذف", "Confirm Deletion")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                `هل أنت متأكد من حذف متجر "${deleteTarget?.storeName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
                `Are you sure you want to delete "${deleteTarget?.storeName}"? This action cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50" data-testid="button-cancel-delete">
              {t("إلغاء", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-delete"
            >
              <Trash2 className="w-4 h-4 me-1.5" />
              {t("حذف نهائي", "Delete Permanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-feature-toggles">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {t("إعدادات الميزات", "Feature Settings")} — {featureDialogMerchant?.storeName}
            </DialogTitle>
          </DialogHeader>
          {featureLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between" data-testid="toggle-analytics">
                <div>
                  <p className="font-medium text-sm">{t("التحليلات", "Analytics")}</p>
                  <p className="text-xs text-muted-foreground">{t("عرض صفحة التحليلات", "Show Analytics page")}</p>
                </div>
                <Switch checked={featureFlags.analyticsEnabled} onCheckedChange={(v) => setFeatureFlags(f => ({ ...f, analyticsEnabled: v }))} data-testid="switch-analytics" />
              </div>
              <div className="flex items-center justify-between" data-testid="toggle-crm">
                <div>
                  <p className="font-medium text-sm">{t("إدارة العملاء", "CRM / Customers")}</p>
                  <p className="text-xs text-muted-foreground">{t("عرض صفحة العملاء", "Show Customers page")}</p>
                </div>
                <Switch checked={featureFlags.crmEnabled} onCheckedChange={(v) => setFeatureFlags(f => ({ ...f, crmEnabled: v }))} data-testid="switch-crm" />
              </div>
              <div className="flex items-center justify-between" data-testid="toggle-smart-rating">
                <div>
                  <p className="font-medium text-sm">{t("التقييم الذكي", "Smart Rating Redirect")}</p>
                  <p className="text-xs text-muted-foreground">{t("إعادة توجيه التقييمات العالية إلى خرائط جوجل", "Redirect high ratings to Google Maps")}</p>
                </div>
                <Switch checked={featureFlags.smartRatingEnabled} onCheckedChange={(v) => setFeatureFlags(f => ({ ...f, smartRatingEnabled: v }))} data-testid="switch-smart-rating" />
              </div>
              <div className="flex items-center justify-between" data-testid="toggle-print">
                <div>
                  <p className="font-medium text-sm">{t("طباعة الإيصالات", "Print Receipts")}</p>
                  <p className="text-xs text-muted-foreground">{t("عرض زر الطباعة في الطلبات", "Show print button on orders")}</p>
                </div>
                <Switch checked={featureFlags.printReceiptsEnabled} onCheckedChange={(v) => setFeatureFlags(f => ({ ...f, printReceiptsEnabled: v }))} data-testid="switch-print" />
              </div>
              <Button onClick={handleSaveFeatures} disabled={featureSaving} className="w-full" data-testid="button-save-features">
                {featureSaving ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : <Save className="w-4 h-4 me-1.5" />}
                {t("حفظ", "Save")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={subPaymentDialogOpen} onOpenChange={setSubPaymentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-subscription-payment">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              {t("الاشتراك والدفع", "Subscription & Payment")} — {subPaymentMerchant?.storeName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-3">
              <Label>{t("المبلغ المستلم (ر.س)", "Amount Received (SAR)")}</Label>
              <Input type="number" placeholder="0" value={subPaymentAmount} onChange={(e) => setSubPaymentAmount(e.target.value)} data-testid="input-payment-amount" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("تاريخ البدء", "Start Date")}</Label>
                <Input type="date" value={subPaymentStartDate} onChange={(e) => setSubPaymentStartDate(e.target.value)} data-testid="input-payment-start" />
              </div>
              <div className="space-y-2">
                <Label>{t("تاريخ الانتهاء", "End Date")}</Label>
                <Input type="date" value={subPaymentEndDate} onChange={(e) => setSubPaymentEndDate(e.target.value)} data-testid="input-payment-end" />
              </div>
            </div>
            <div className="flex gap-2">
              {[30, 90, 180, 365].map(days => {
                const endD = new Date(); endD.setDate(endD.getDate() + days);
                return (
                  <Button key={days} variant="outline" size="sm" onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    setSubPaymentStartDate(today);
                    setSubPaymentEndDate(endD.toISOString().split("T")[0]);
                  }} data-testid={`button-preset-${days}`}>
                    {days} {t("يوم", "days")}
                  </Button>
                );
              })}
            </div>
            <Button onClick={handleSaveSubPayment} disabled={subPaymentSaving || !subPaymentAmount || !subPaymentStartDate || !subPaymentEndDate} className="w-full" data-testid="button-save-payment">
              {subPaymentSaving ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : <Save className="w-4 h-4 me-1.5" />}
              {t("تسجيل الدفعة وتفعيل الاشتراك", "Record Payment & Activate")}
            </Button>

            <div className="border-t border-white/[0.06] pt-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                {t("سجل الدفعات", "Payment History")}
              </h4>
              {subPaymentHistoryLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : subPaymentHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">{t("لا توجد دفعات سابقة", "No previous payments")}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {subPaymentHistory.map((pmt, i) => (
                    <div key={pmt.id || i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]" data-testid={`row-payment-${i}`}>
                      <div>
                        <p className="font-bold text-emerald-400 text-sm">{pmt.amountReceived?.toLocaleString()} {t("ر.س", "SAR")}</p>
                        <p className="text-xs text-muted-foreground">{pmt.startDate} → {pmt.endDate}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{pmt.createdAt ? new Date(pmt.createdAt).toLocaleDateString() : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-health-monitor">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {t("مراقبة صحة النظام", "System Health Monitor")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {errorsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : systemErrors.filter((e) => !e.resolved).length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-green-500" data-testid="text-no-errors">
                  {t("جميع الأنظمة تعمل بشكل طبيعي", "All Systems Nominal")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("لا توجد أخطاء في آخر 24 ساعة", "No errors in the last 24 hours")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {systemErrors.filter((e) => !e.resolved).map((error) => (
                  <Card key={error.id} data-testid={`card-error-${error.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                {error.errorType || "unknown"}
                              </Badge>
                              <span className="text-xs text-muted-foreground" data-testid={`text-error-time-${error.id}`}>
                                {error.timestamp ? new Date(error.timestamp).toLocaleString() : "N/A"}
                              </span>
                            </div>
                            <p className="text-sm mt-1.5" data-testid={`text-error-message-${error.id}`}>
                              {error.errorMessage || t("رسالة غير متوفرة", "No message available")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-error-merchant-${error.id}`}>
                              {t("التاجر:", "Merchant:")} {error.merchantId || "N/A"}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveError(error.id)}
                          disabled={resolvingError === error.id}
                          data-testid={`button-resolve-error-${error.id}`}
                        >
                          {resolvingError === error.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 me-1" />
                              {t("حل", "Resolve")}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackDialogOpen} onOpenChange={(open) => { setFeedbackDialogOpen(open); if (!open) { setFeedbackDialogMerchant(null); setFeedbackDialogData([]); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-merchant-complaints">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {feedbackDialogMerchant?.logoUrl ? (
                <img src={feedbackDialogMerchant.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <span className="block" data-testid="text-complaints-merchant-name">{feedbackDialogMerchant?.storeName}</span>
                <span className="text-xs text-muted-foreground font-normal">{t("شكاوى العملاء", "Customer Complaints")}</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {feedbackDialogLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : feedbackDialogData.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-complaints">
                {t("لا توجد شكاوى", "No complaints")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackDialogData.map((feedback: any) => (
                <Card key={feedback.id} data-testid={`card-complaint-${feedback.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${s <= (feedback.stars || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground" data-testid={`text-complaint-time-${feedback.id}`}>
                            {feedback.timestamp ? new Date(feedback.timestamp).toLocaleString() : "N/A"}
                          </span>
                          {feedback.read ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              {t("مقروء", "Read")}
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              {t("غير مقروء", "Unread")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mt-2" data-testid={`text-complaint-comment-${feedback.id}`}>
                          {feedback.comment || t("بدون تعليق", "No comment")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={reportDialogOpen} onOpenChange={(open) => { setReportDialogOpen(open); if (!open) { setReportMerchant(null); setReportData(null); } }}>
        <DialogContent className="max-w-lg" data-testid="dialog-merchant-report">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {reportMerchant?.logoUrl ? (
                <img src={reportMerchant.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <span className="block" data-testid="text-report-merchant-name">{reportMerchant?.storeName}</span>
                <span className="text-xs text-muted-foreground font-normal">{t("تقرير القيمة", "Value Report")}</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {reportLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : reportData ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <QrCode className="w-6 h-6 text-primary mx-auto mb-1.5" />
                    <p className="text-2xl font-bold" data-testid="text-report-qr-scans">{reportData.qrScans || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("مسح QR", "QR Scans")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Bell className="w-6 h-6 text-blue-500 mx-auto mb-1.5" />
                    <p className="text-2xl font-bold" data-testid="text-report-notifications">{reportData.notificationsSent || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("إشعارات مرسلة", "Notifications Sent")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Share2 className="w-6 h-6 text-purple-500 mx-auto mb-1.5" />
                    <p className="text-2xl font-bold" data-testid="text-report-shares">{reportData.shares || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("مشاركات", "Shares")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <MapPin className="w-6 h-6 text-green-500 mx-auto mb-1.5" />
                    <p className="text-2xl font-bold" data-testid="text-report-gmaps">{reportData.gmapsClicks || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("نقرات خرائط", "GMaps Clicks")}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("معدل التحويل", "Conversion Rate")}</p>
                      <p className="text-3xl font-bold text-primary" data-testid="text-report-conversion">
                        {reportData.conversionRate ?? 0}%
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-md bg-primary/20 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30">
                <CardContent className="p-4">
                  <p className="text-sm leading-relaxed" data-testid="text-report-summary">
                    {t(
                      `هذا الشهر، وفّر نظامنا لفريقك ما يقارب ${Math.round((reportData.notificationsSent || 0) * 2)} دقيقة وتفاعل مع ${reportData.qrScans || 0} عميل.`,
                      `This month, our system saved your staff ${Math.round((reportData.notificationsSent || 0) * 2)} minutes and engaged ${reportData.qrScans || 0} customers.`
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-report-error">
                {t("فشل في تحميل بيانات التقرير", "Failed to load report data")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
