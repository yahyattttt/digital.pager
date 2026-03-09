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
  const [expiryValue, setExpiryValue] = useState("");

  const [settings, setSettings] = useState<SystemSettings>({
    appName: "Digital Pager",
    globalLogoUrl: "",
    supportWhatsapp: "966500000000",
    globalThemeColor: "#ef0000",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const btLabels = lang === "ar" ? businessTypeLabels : businessTypeLabelsEn;

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

  async function handleSaveExpiry(merchant: Merchant) {
    setActionLoading(merchant.uid);
    try {
      await updateDoc(doc(db, "merchants", merchant.uid), {
        subscriptionExpiry: expiryValue || null,
      });
      setMerchants((prev) =>
        prev.map((m) =>
          m.uid === merchant.uid
            ? { ...m, subscriptionExpiry: expiryValue || null }
            : m
        )
      );
      setEditingExpiry(null);
      setExpiryValue("");
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم تحديث تاريخ الانتهاء", "Expiry date updated"),
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
            </div>

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
                            {t("الإجراءات", "Actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {merchants.map((merchant) => {
                          const pLabel = planLabels[merchant.plan]
                            ? lang === "ar"
                              ? planLabels[merchant.plan].ar
                              : planLabels[merchant.plan].en
                            : merchant.plan || "trial";

                          return (
                            <TableRow
                              key={merchant.uid}
                              className="border-primary/10"
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
                                      {merchant.storeName}
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
                                    {merchant.ownerName}
                                  </span>
                                  <span className="text-xs text-muted-foreground" dir="ltr" data-testid={`text-email-${merchant.uid}`}>
                                    {merchant.email}
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
                                </div>
                              </TableCell>
                              <TableCell>
                                {editingExpiry === merchant.uid ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="date"
                                      value={expiryValue}
                                      onChange={(e) => setExpiryValue(e.target.value)}
                                      className="w-36 text-xs"
                                      data-testid={`input-expiry-${merchant.uid}`}
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
                                      onClick={() => { setEditingExpiry(null); setExpiryValue(""); }}
                                      data-testid={`button-cancel-expiry-${merchant.uid}`}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <button
                                    className="text-sm text-muted-foreground cursor-pointer hover:underline"
                                    onClick={() => {
                                      setEditingExpiry(merchant.uid);
                                      setExpiryValue(merchant.subscriptionExpiry || "");
                                    }}
                                    data-testid={`text-expiry-${merchant.uid}`}
                                  >
                                    {merchant.subscriptionExpiry
                                      ? new Date(merchant.subscriptionExpiry).toLocaleDateString()
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
    </div>
  );
}
