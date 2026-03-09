import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { businessTypeLabels, planLabels } from "@shared/schema";
import type { Merchant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
          {t("مفعّل", "Active")}
        </Badge>
      );
    case "suspended":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
          {t("موقوف", "Suspended")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
          {t("مرفوض", "Rejected")}
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
          {t("قيد الانتظار", "Pending")}
        </Badge>
      );
  }
}

function getSubBadge(subStatus: string | undefined, t: (ar: string, en: string) => string) {
  switch (subStatus) {
    case "active":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
          <CreditCard className="w-3 h-3 me-1" />
          {t("مفعّل", "Active")}
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30">
          <CreditCard className="w-3 h-3 me-1" />
          {t("منتهي", "Expired")}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
          <CreditCard className="w-3 h-3 me-1" />
          {t("ملغي", "Cancelled")}
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
          <CreditCard className="w-3 h-3 me-1" />
          {t("غير مفعّل", "Inactive")}
        </Badge>
      );
  }
}

export default function SuperAdminPage() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { t, toggleLanguage, lang } = useLanguage();
  const { toast } = useToast();

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Merchant | null>(null);

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

  useEffect(() => {
    if (!authLoading && user?.email === SUPER_ADMIN_EMAIL) {
      fetchMerchants();
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

  async function handleSignOut() {
    await signOut(auth);
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

  const stats = {
    total: merchants.length,
    pending: merchants.filter((m) => m.status === "pending").length,
    active: merchants.filter((m) => m.status === "approved").length,
    suspended: merchants.filter((m) => m.status === "suspended" || m.status === "rejected").length,
    subActive: merchants.filter((m) => m.subscriptionStatus === "active").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-primary/30 px-6 py-4 bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
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
              className="border-primary/30 hover:border-primary/60"
              data-testid="button-toggle-language"
            >
              <Globe className="w-4 h-4" />
            </Button>
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

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t("إجمالي المتاجر", "Total Stores")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400" data-testid="text-stat-pending">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">{t("قيد الانتظار", "Pending")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400" data-testid="text-stat-active">{stats.active}</p>
                <p className="text-xs text-muted-foreground">{t("مفعّل", "Active")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400" data-testid="text-stat-suspended">{stats.suspended}</p>
                <p className="text-xs text-muted-foreground">{t("موقوف", "Suspended")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400" data-testid="text-stat-subscribed">{stats.subActive}</p>
                <p className="text-xs text-muted-foreground">{t("مشتركين", "Subscribed")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg" data-testid="text-stores-title">
                {t("إدارة المتاجر", "Stores Management")}
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMerchants}
              disabled={loadingData}
              className="border-primary/30"
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
                        {t("البريد الإلكتروني", "Email")}
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold">
                        {t("الحالة", "Status")}
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold">
                        {t("الاشتراك", "Subscription")}
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
                          className="border-primary/10 hover:bg-primary/5"
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
                          <TableCell data-testid={`text-owner-${merchant.uid}`}>
                            {merchant.ownerName}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground" dir="ltr" data-testid={`text-email-${merchant.uid}`}>
                              {merchant.email}
                            </span>
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
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {merchant.status !== "approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleActivate(merchant)}
                                  disabled={actionLoading === merchant.uid}
                                  className="border-green-500/40 text-green-400 hover:bg-green-500/10 hover:text-green-300 h-8 px-3 text-xs"
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
                              )}
                              {merchant.status === "approved" && merchant.subscriptionStatus !== "active" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleActivateSubscription(merchant)}
                                  disabled={actionLoading === merchant.uid}
                                  className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 h-8 px-3 text-xs"
                                  data-testid={`button-activate-sub-${merchant.uid}`}
                                >
                                  {actionLoading === merchant.uid ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Zap className="w-3 h-3 me-1" />
                                      {t("تفعيل الاشتراك", "Activate Sub")}
                                    </>
                                  )}
                                </Button>
                              )}
                              {merchant.status !== "suspended" && merchant.status !== "rejected" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSuspend(merchant)}
                                  disabled={actionLoading === merchant.uid}
                                  className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300 h-8 px-3 text-xs"
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteTarget(merchant)}
                                disabled={actionLoading === merchant.uid}
                                className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-8 px-3 text-xs"
                                data-testid={`button-delete-${merchant.uid}`}
                              >
                                <Trash2 className="w-3 h-3 me-1" />
                                {t("حذف", "Delete")}
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
