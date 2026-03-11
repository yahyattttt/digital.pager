import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Truck,
  ShoppingBag,
  UtensilsCrossed,
  Pencil,
  Eye,
  Printer,
  RotateCcw,
} from "lucide-react";

const PAGE_SIZE = 20;

interface ArchiveOrder {
  id: string;
  displayOrderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: { name: string; price: number; quantity: number }[];
  total: number;
  status: string;
  paymentMethod: string;
  diningType: string;
  orderType: string;
  deliveryFee: number;
  createdAt: string;
  archivedAt: string;
  customerNotes: string;
}

interface ArchiveViewProps {
  merchant: any;
  t: (ar: string, en: string) => string;
  lang: string;
  onViewReceipt?: (orderId: string) => void;
  onNavigateToActive?: () => void;
}

function formatDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getDiningLabel(type: string, t: (ar: string, en: string) => string) {
  switch (type) {
    case "dine_in": return t("محلي", "Dine-in");
    case "takeaway": return t("سفري", "Takeaway");
    case "delivery": return t("توصيل", "Delivery");
    default: return t("يدوي", "Manual");
  }
}

function getDiningIcon(type: string) {
  switch (type) {
    case "dine_in": return <UtensilsCrossed className="w-3 h-3" />;
    case "takeaway": return <ShoppingBag className="w-3 h-3" />;
    case "delivery": return <Truck className="w-3 h-3" />;
    default: return <Pencil className="w-3 h-3" />;
  }
}

function getDiningColor(type: string) {
  switch (type) {
    case "dine_in": return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "takeaway": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "delivery": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    default: return "bg-violet-500/15 text-violet-400 border-violet-500/30";
  }
}

function getStatusLabel(status: string, t: (ar: string, en: string) => string) {
  switch (status) {
    case "archived":
    case "completed": return t("مكتمل", "Completed");
    case "rejected": return t("مرفوض", "Rejected");
    case "uncollected": return t("لم يستلم", "Uncollected");
    default: return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "archived":
    case "completed": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "rejected": return "bg-red-500/15 text-red-400 border-red-500/30";
    case "uncollected": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default: return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  }
}

export default function ArchiveView({ merchant, t, lang, onViewReceipt, onNavigateToActive }: ArchiveViewProps) {
  const isRTL = lang === "ar";
  const [orders, setOrders] = useState<ArchiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!merchant?.uid) return;
    fetchOrders();
  }, [merchant?.uid]);

  async function fetchOrders() {
    if (!merchant?.uid) return;
    setLoading(true);
    try {
      const colRef = collection(db, "merchants", merchant.uid, "whatsappOrders");
      const archiveStatuses = ["archived", "completed", "rejected", "uncollected"];

      const allDocs: ArchiveOrder[] = [];
      for (const status of archiveStatuses) {
        const q = query(colRef, where("status", "==", status));
        const snap = await getDocs(q);
        snap.forEach((d) => {
          const data = d.data();
          allDocs.push({
            id: d.id,
            displayOrderId: data.displayOrderId || "",
            orderNumber: data.orderNumber || "",
            customerName: data.customerName || "",
            customerPhone: data.customerPhone || "",
            items: (data.items || []).map((item: any) => ({
              name: item.name || "",
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
            })),
            total: Number(data.total) || 0,
            status: data.status || "",
            paymentMethod: data.paymentMethod || "cod",
            diningType: data.diningType || "",
            orderType: data.orderType || "",
            deliveryFee: Number(data.deliveryFee) || 0,
            createdAt: data.createdAt || "",
            archivedAt: data.archivedAt || data.completedAt || "",
            customerNotes: data.customerNotes || "",
          });
        });
      }

      const pagerColRef = collection(db, "merchants", merchant.uid, "pagers");
      const pagerQ = query(pagerColRef, where("status", "in", ["archived", "completed"]));
      const pagerSnap = await getDocs(pagerQ);
      pagerSnap.forEach((d) => {
        const data = d.data();
        allDocs.push({
          id: d.id,
          displayOrderId: data.displayOrderId || "",
          orderNumber: data.orderNumber || "",
          customerName: "",
          customerPhone: "",
          items: [],
          total: 0,
          status: data.status || "archived",
          paymentMethod: "",
          diningType: "",
          orderType: "manual",
          deliveryFee: 0,
          createdAt: data.createdAt || "",
          archivedAt: data.archivedAt || "",
          customerNotes: "",
        });
      });

      allDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(allDocs);
      setTotalCount(allDocs.length);
      setLoading(false);
    } catch (err) {
      console.error("Archive fetch error:", err);
      setLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          o.displayOrderId.toLowerCase().includes(q) ||
          o.orderNumber.includes(q)
      );
    }

    if (typeFilter !== "all") {
      if (typeFilter === "manual") {
        result = result.filter((o) => o.orderType === "manual");
      } else {
        result = result.filter((o) => o.diningType === typeFilter);
      }
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((o) => new Date(o.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.createdAt) <= to);
    }

    return result;
  }, [orders, searchQuery, typeFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const revenue = filteredOrders.reduce((s, o) => s + (o.status !== "rejected" ? o.total : 0), 0);
    const count = filteredOrders.length;
    const avg = count > 0 ? revenue / count : 0;
    return { revenue, count, avg };
  }, [filteredOrders]);

  function exportCSV() {
    const headers = [
      t("رقم الطلب", "Order ID"),
      t("التاريخ", "Date"),
      t("العميل", "Customer"),
      t("الجوال", "Phone"),
      t("النوع", "Type"),
      t("الحالة", "Status"),
      t("الإجمالي", "Total"),
      t("طريقة الدفع", "Payment"),
    ];
    const rows = filteredOrders.map((o) => [
      o.displayOrderId || o.orderNumber,
      formatDate(o.createdAt) + " " + formatTime(o.createdAt),
      o.customerName,
      o.customerPhone,
      getDiningLabel(o.diningType || (o.orderType === "manual" ? "manual" : ""), t),
      getStatusLabel(o.status, t),
      o.total.toFixed(2),
      o.paymentMethod === "cod" ? t("نقدي", "COD") : o.paymentMethod,
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_archive_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, dateFrom, dateTo]);

  const typeChips = [
    { value: "all", label: t("الكل", "All") },
    { value: "dine_in", label: t("محلي", "Dine-in") },
    { value: "takeaway", label: t("سفري", "Takeaway") },
    { value: "delivery", label: t("توصيل", "Delivery") },
    { value: "manual", label: t("يدوي", "Manual") },
  ];

  return (
    <div className="space-y-5" data-testid="archive-view">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {onNavigateToActive && (
            <button
              onClick={onNavigateToActive}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white/40 border border-white/[0.06] hover:text-white/60 hover:border-white/[0.12] transition-all"
              data-testid="tab-back-to-active"
            >
              {t("الطلبات النشطة", "Active Orders")}
            </button>
          )}
          <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }} data-testid="text-archive-title">
            {t("أرشيف الطلبات", "Order Archive")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchOrders()}
            className="border-white/10 text-white/60 hover:text-white gap-1.5"
            data-testid="button-archive-refresh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-xs">{t("تحديث", "Refresh")}</span>
          </Button>
          <Button
            size="sm"
            onClick={exportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            data-testid="button-archive-export"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="text-xs">{t("تصدير إلى Excel", "Export to Excel")}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-[#111] border-white/[0.06]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">{t("إجمالي الإيرادات", "Total Revenue")}</p>
              <p className="text-white text-lg font-bold" data-testid="text-archive-revenue">{stats.revenue.toFixed(2)} SAR</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#111] border-white/[0.06]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">{t("عدد الطلبات", "Total Orders")}</p>
              <p className="text-white text-lg font-bold" data-testid="text-archive-count">{stats.count}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#111] border-white/[0.06]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">{t("متوسط قيمة الطلب", "Avg Order Value")}</p>
              <p className="text-white text-lg font-bold" data-testid="text-archive-avg">{stats.avg.toFixed(2)} SAR</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#111] border-white/[0.06]">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("بحث بالاسم، الجوال، أو رقم الطلب...", "Search by name, phone, or order ID...")}
                className="ps-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 h-9 text-sm"
                data-testid="input-archive-search"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-white/30" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] text-white text-xs rounded-lg px-2 py-1.5 h-9"
                data-testid="input-archive-date-from"
              />
              <span className="text-white/30 text-xs">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] text-white text-xs rounded-lg px-2 py-1.5 h-9"
                data-testid="input-archive-date-to"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-white/30 me-1" />
            {typeChips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setTypeFilter(chip.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  typeFilter === chip.value
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/60"
                }`}
                data-testid={`button-archive-filter-${chip.value}`}
              >
                {chip.label}
              </button>
            ))}
            {(searchQuery || typeFilter !== "all" || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearchQuery(""); setTypeFilter("all"); setDateFrom(""); setDateTo(""); }}
                className="px-3 py-1 rounded-full text-xs font-medium text-red-400/80 border border-red-500/20 hover:bg-red-500/10 transition-all"
                data-testid="button-archive-clear-filters"
              >
                {t("مسح الفلاتر", "Clear Filters")}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16" data-testid="archive-loading">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : paginatedOrders.length === 0 ? (
        <div className="text-center py-16" data-testid="archive-empty">
          <Package className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">{t("لا توجد طلبات في الأرشيف", "No archived orders found")}</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm" data-testid="archive-table">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-start text-white/40 text-[10px] uppercase tracking-wider py-3 px-3 font-medium">{t("رقم الطلب", "Order ID")}</th>
                  <th className="text-start text-white/40 text-[10px] uppercase tracking-wider py-3 px-3 font-medium">{t("التاريخ", "Date")}</th>
                  <th className="text-start text-white/40 text-[10px] uppercase tracking-wider py-3 px-3 font-medium">{t("العميل", "Customer")}</th>
                  <th className="text-start text-white/40 text-[10px] uppercase tracking-wider py-3 px-3 font-medium">{t("النوع", "Type")}</th>
                  <th className="text-start text-white/40 text-[10px] uppercase tracking-wider py-3 px-3 font-medium">{t("الحالة", "Status")}</th>
                  <th className="text-start text-white/40 text-[10px] uppercase tracking-wider py-3 px-3 font-medium">{t("الإجمالي", "Total")}</th>
                  <th className="text-start text-white/40 text-[10px] uppercase tracking-wider py-3 px-3 font-medium">{t("الدفع", "Payment")}</th>
                  <th className="text-start text-white/40 text-[10px] uppercase tracking-wider py-3 px-3 font-medium">{t("إجراءات", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors" data-testid={`archive-row-${order.id}`}>
                    <td className="py-3 px-3">
                      <span className="text-white font-mono font-bold text-sm" data-testid={`text-archive-id-${order.id}`}>
                        {order.displayOrderId || order.orderNumber || order.id.slice(0, 6)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <p className="text-white/70 text-xs">{formatDate(order.createdAt)}</p>
                        <p className="text-white/30 text-[10px]">{formatTime(order.createdAt)}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <p className="text-white/80 text-xs">{order.customerName || "-"}</p>
                        <p className="text-white/30 text-[10px] font-mono" dir="ltr">{order.customerPhone || "-"}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getDiningColor(order.diningType || (order.orderType === "manual" ? "manual" : ""))}`}>
                        {getDiningIcon(order.diningType || (order.orderType === "manual" ? "manual" : ""))}
                        {getDiningLabel(order.diningType || (order.orderType === "manual" ? "manual" : ""), t)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status, t)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-white font-bold text-sm">{order.total.toFixed(2)}</span>
                      <span className="text-white/30 text-[10px] ms-1">SAR</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-white/50 text-xs">
                        {order.paymentMethod === "cod" ? t("نقدي", "COD") : order.paymentMethod || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {order.orderType !== "manual" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewReceipt?.(order.id)}
                            className="h-7 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10 gap-1"
                            data-testid={`button-archive-receipt-${order.id}`}
                          >
                            <Printer className="w-3 h-3" />
                            {t("الفاتورة", "Receipt")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          className="h-7 px-2 text-[10px] text-blue-400 hover:bg-blue-500/10 gap-1"
                          data-testid={`button-archive-details-${order.id}`}
                        >
                          <Eye className="w-3 h-3" />
                          {t("تفاصيل", "Details")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {paginatedOrders.map((order) => (
              <Card key={order.id} className="bg-[#111] border-white/[0.06]" data-testid={`archive-card-${order.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-mono font-bold text-base" data-testid={`text-archive-mobile-id-${order.id}`}>
                        {order.displayOrderId || order.orderNumber || order.id.slice(0, 6)}
                      </p>
                      <p className="text-white/30 text-[10px]">{formatDate(order.createdAt)} • {formatTime(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getDiningColor(order.diningType || (order.orderType === "manual" ? "manual" : ""))}`}>
                        {getDiningIcon(order.diningType || (order.orderType === "manual" ? "manual" : ""))}
                        {getDiningLabel(order.diningType || (order.orderType === "manual" ? "manual" : ""), t)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status, t)}
                      </span>
                    </div>
                  </div>
                  {order.customerName && (
                    <div className="flex items-center justify-between">
                      <p className="text-white/60 text-xs">{order.customerName}</p>
                      <p className="text-white/30 text-[10px] font-mono" dir="ltr">{order.customerPhone}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <div>
                      <span className="text-white font-bold">{order.total.toFixed(2)}</span>
                      <span className="text-white/30 text-xs ms-1">SAR</span>
                      <span className="text-white/20 text-[10px] ms-2">
                        {order.paymentMethod === "cod" ? t("نقدي", "COD") : order.paymentMethod}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {order.orderType !== "manual" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewReceipt?.(order.id)}
                          className="h-7 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10 gap-1"
                          data-testid={`button-archive-receipt-mobile-${order.id}`}
                        >
                          <Printer className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="h-7 px-2 text-[10px] text-blue-400 hover:bg-blue-500/10 gap-1"
                        data-testid={`button-archive-details-mobile-${order.id}`}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {expandedOrder === order.id && (
                    <div className="pt-3 border-t border-white/[0.04] space-y-2 animate-in fade-in slide-in-from-top-2 duration-200" data-testid={`archive-details-${order.id}`}>
                      {order.items.length > 0 && (
                        <div>
                          <p className="text-white/30 text-[10px] uppercase mb-1">{t("المنتجات", "Items")}</p>
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-white/60">{item.name} × {item.quantity}</span>
                              <span className="text-white/40">{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {order.deliveryFee > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/30">{t("رسوم التوصيل", "Delivery Fee")}</span>
                          <span className="text-white/40">{order.deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                      {order.customerNotes && (
                        <p className="text-white/30 text-[10px]">📝 {order.customerNotes}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {expandedOrder && (
            <div className="hidden md:block">
              {paginatedOrders.filter((o) => o.id === expandedOrder).map((order) => (
                <Card key={order.id} className="bg-[#0d0d0d] border-white/[0.06] mt-2" data-testid={`archive-details-desktop-${order.id}`}>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-white/50 text-xs font-medium">{t("تفاصيل الطلب", "Order Details")} — {order.displayOrderId || order.orderNumber}</p>
                    {order.items.length > 0 && (
                      <div className="space-y-1">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-white/60">{item.name} × {item.quantity}</span>
                            <span className="text-white/40">{(item.price * item.quantity).toFixed(2)} SAR</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {order.deliveryFee > 0 && (
                      <div className="flex items-center justify-between text-xs border-t border-white/[0.04] pt-1">
                        <span className="text-white/30">{t("رسوم التوصيل", "Delivery Fee")}</span>
                        <span className="text-white/40">{order.deliveryFee.toFixed(2)} SAR</span>
                      </div>
                    )}
                    {order.customerNotes && (
                      <p className="text-white/30 text-[10px] mt-1">📝 {order.customerNotes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-white/30 text-xs">
              {t("عرض", "Showing")} {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} {t("من", "of")} {filteredOrders.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0 border-white/10"
                data-testid="button-archive-prev"
              >
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
              <span className="text-white/50 text-xs font-mono">{currentPage}/{totalPages}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 p-0 border-white/10"
                data-testid="button-archive-next"
              >
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
