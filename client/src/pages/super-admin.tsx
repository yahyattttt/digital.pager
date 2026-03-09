import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { businessTypeLabels, planLabels } from "@shared/schema";
import type { Merchant, SystemSettings } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";

const SUPER_ADMIN_EMAIL = "yahiatohary@hotmail.com";

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
        });
      }
    } catch {
      // silent
    } finally {
      setSettingsLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user?.email === SUPER_ADMIN_EMAIL) {
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

  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-primary/30 px-6 py-4 bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight" data-testid="text-admin-title">
                {t("لوحة تحكم المشرف", "Super Admin Panel")}
              </h1>
              <p className="text-xs text-muted-foreground">{user.email}</p>
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

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="merchants" className="space-y-6">
          <TabsList data-testid="tabs-admin">
            <TabsTrigger value="merchants" data-testid="tab-merchants">
              <Users className="w-4 h-4 me-1.5" />
              {t("التجار", "Merchants")}
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="w-4 h-4 me-1.5" />
              {t("الإعدادات", "Settings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merchants" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">{t("إجمالي التجار", "Total Merchants")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400" data-testid="text-stat-alerts-today">{stats.alertsToday}</p>
                    <p className="text-xs text-muted-foreground">{t("تنبيهات اليوم", "Alerts Today")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400" data-testid="text-stat-shares">{stats.totalShares}</p>
                    <p className="text-xs text-muted-foreground">{t("مشاركات فيروسية", "Viral Shares")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400" data-testid="text-stat-active">{stats.active}</p>
                    <p className="text-xs text-muted-foreground">{t("مفعّل", "Active")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-400" data-testid="text-stat-subscribed">{stats.subActive}</p>
                    <p className="text-xs text-muted-foreground">{t("مشتركين", "Subscribed")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400" data-testid="text-stat-complaints">{totalComplaints}</p>
                    <p className="text-xs text-muted-foreground">{t("إجمالي الشكاوى", "Total Complaints")}</p>
                  </div>
                </CardContent>
              </Card>
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-lg" data-testid="text-stores-title">
                    {t("إدارة التجار", "Merchants Management")}
                  </h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { fetchMerchants(); fetchTotalAlertsToday(); }}
                  disabled={loadingData}
                  data-testid="button-refresh"
                >
                  <RefreshCw className={`w-4 h-4 me-1.5 ${loadingData ? "animate-spin" : ""}`} />
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
                        <TableRow className="border-primary/10 hover:bg-transparent">
                          <TableHead className="text-muted-foreground font-semibold">
                            {t("اسم المتجر", "Store Name")}
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold">
                            {t("المالك", "Owner")}
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold">
                            {t("الحالة", "Status")}
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold">
                            {t("الاشتراك", "Subscription")}
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold">
                            {t("تاريخ الانتهاء", "Expiry Date")}
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold text-center">
                            {t("مشاركات", "Shares")}
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold text-center">
                            {t("نقرات خرائط", "GMaps")}
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold text-center">
                            {t("مسح QR", "QR Scans")}
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold text-center">
                            {t("شكاوى", "Complaints")}
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold text-center">
                            {t("الإجراءات", "Actions")}
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
                              className={`border-primary/10 ${expiringSoon ? "bg-red-500/10" : ""}`}
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
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  {merchant.status !== "approved" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleActivate(merchant)}
                                      disabled={actionLoading === merchant.uid}
                                      data-testid={`button-activate-${merchant.uid}`}
                                    >
                                      {actionLoading === merchant.uid ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle className="w-3 h-3 me-1" />
                                          {t("تفعيل", "Activate")}
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSuspend(merchant)}
                                      disabled={actionLoading === merchant.uid}
                                      data-testid={`button-suspend-${merchant.uid}`}
                                    >
                                      {actionLoading === merchant.uid ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <>
                                          <XCircle className="w-3 h-3 me-1" />
                                          {t("إيقاف", "Suspend")}
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  {merchant.status === "approved" && merchant.subscriptionStatus !== "active" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleActivateSubscription(merchant)}
                                      disabled={actionLoading === merchant.uid}
                                      data-testid={`button-activate-sub-${merchant.uid}`}
                                    >
                                      {actionLoading === merchant.uid ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Zap className="w-3 h-3 me-1" />
                                          {t("اشتراك", "Sub")}
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleOpenReport(merchant)}
                                    data-testid={`button-report-${merchant.uid}`}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleImpersonate(merchant)}
                                    disabled={actionLoading === merchant.uid}
                                    data-testid={`button-impersonate-${merchant.uid}`}
                                  >
                                    <LogIn className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDownloadQR(merchant)}
                                    data-testid={`button-download-qr-${merchant.uid}`}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setDeleteTarget(merchant)}
                                    disabled={actionLoading === merchant.uid}
                                    data-testid={`button-delete-${merchant.uid}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
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
        </Tabs>
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
