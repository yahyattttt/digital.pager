import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ShoppingCart, Plus, Minus, X, AlertTriangle, Loader2, Check, ArrowLeft, Clock, Banknote, Tag, CreditCard, Wallet, UtensilsCrossed, ShoppingBag, Globe, Truck, MapPin, Navigation } from "lucide-react";
import { lazy, Suspense } from "react";
const DeliveryMapPicker = lazy(() => import("@/components/delivery-map-picker"));
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import type { Product, ProductVariant, ProductAddon } from "@shared/schema";

interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant: ProductVariant | null;
  selectedAddons: ProductAddon[];
  selectedRemovals: string[];
  itemPrice: number;
}

interface MerchantInfo {
  storeName: string;
  logoUrl: string;
  whatsappNumber: string;
  status: string;
  subscriptionStatus: string;
  storeOpen: boolean;
  onlineOrdersEnabled: boolean;
  businessOpenTime: string;
  businessCloseTime: string;
  storeTermsEnabled: boolean;
  storeTermsText: string;
  storePrivacyText: string;
  moyasarPublishableKey: string;
  onlinePaymentEnabled: boolean;
  codEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  deliveryRange: number;
  storeLat: number | null;
  storeLng: number | null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PublicMenuPage() {
  const params = useParams<{ merchantId: string }>();
  const merchantId = params.merchantId;
  const { toast } = useToast();
  const { lang, isRTL, toggleLanguage, t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, setTimeTick] = useState(0);
  const [diningType, setDiningType] = useState<"dine_in" | "takeaway" | "delivery" | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [deliveryLocationConfirmed, setDeliveryLocationConfirmed] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");

  const [storeTermsAccepted, setStoreTermsAccepted] = useState(false);
  const [showStoreTermsModal, setShowStoreTermsModal] = useState<"terms" | "privacy" | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [couponValid, setCouponValid] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"online" | "cod" | null>(null);
  const [moyasarPaymentCompleted, setMoyasarPaymentCompleted] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [paymentSourceType, setPaymentSourceType] = useState("");
  const [moyasarLoaded, setMoyasarLoaded] = useState(false);
  const [moyasarInitialized, setMoyasarInitialized] = useState(false);
  const prevFinalTotalRef = useRef(0);

  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalVariant, setModalVariant] = useState<ProductVariant | null>(null);
  const [modalAddons, setModalAddons] = useState<ProductAddon[]>([]);
  const [modalRemovals, setModalRemovals] = useState<string[]>([]);
  const [modalQty, setModalQty] = useState(1);

  const fetchMenu = useCallback(async (isRefresh = false) => {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/menu/${merchantId}`);
      if (!res.ok) { if (!isRefresh) setNotFound(true); return; }
      const data = await res.json();
      if (!data.merchant || data.merchant.status !== "approved" || data.merchant.subscriptionStatus !== "active") {
        if (!isRefresh) setNotFound(true);
        return;
      }
      setMerchant(data.merchant);
      if (!isRefresh) setProducts(data.products || []);
    } catch {
      if (!isRefresh) setNotFound(true);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchMenu(false);
  }, [fetchMenu]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
      fetchMenu(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchMenu]);

  function getItemTotal(item: CartItem): number {
    return item.itemPrice * item.quantity;
  }

  const cartTotal = cart.reduce((sum, item) => sum + getItemTotal(item), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const discountAmount = couponValid ? Math.round(cartTotal * couponDiscount / 100 * 100) / 100 : 0;
  const deliveryFeeAmount = (diningType === "delivery" && merchant?.deliveryEnabled && merchant?.deliveryFee > 0) ? merchant.deliveryFee : 0;
  const finalTotal = Math.round((cartTotal - discountAmount + deliveryFeeAmount) * 100) / 100;

  useEffect(() => {
    if (!merchant?.onlinePaymentEnabled || !merchant?.moyasarPublishableKey) return;
    if (moyasarLoaded) return;

    const existingScript = document.querySelector('script[src*="moyasar"]');
    if (existingScript) { setMoyasarLoaded(true); return; }

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
    script.async = true;
    script.onload = () => setMoyasarLoaded(true);
    document.head.appendChild(script);
  }, [merchant?.onlinePaymentEnabled, merchant?.moyasarPublishableKey, moyasarLoaded]);

  useEffect(() => {
    if (prevFinalTotalRef.current !== 0 && prevFinalTotalRef.current !== finalTotal && moyasarInitialized) {
      setMoyasarInitialized(false);
    }
    prevFinalTotalRef.current = finalTotal;
  }, [finalTotal, moyasarInitialized]);

  useEffect(() => {
    if (selectedPaymentMethod !== "online" || !moyasarLoaded || moyasarInitialized) return;
    if (!merchant?.moyasarPublishableKey || !finalTotal || finalTotal <= 0) return;
    if (!diningType) return;

    const container = document.getElementById("moyasar-payment-form");
    if (!container) return;

    const timer = setTimeout(() => {
      try {
        const w = window as any;
        if (!w.Moyasar) return;
        container.innerHTML = "";
        w.Moyasar.init({
          element: "#moyasar-payment-form",
          amount: Math.round(finalTotal * 100),
          currency: "SAR",
          description: `Order from ${merchant.storeName}`,
          publishable_api_key: merchant.moyasarPublishableKey,
          callback_url: window.location.href,
          methods: ["creditcard", "applepay", "stcpay"],
          on_completed: function (payment: any) {
            const sourceType = payment?.source?.type || "credit_card";
            const methodMap: Record<string, string> = {
              creditcard: "credit_card",
              applepay: "apple_pay",
              stcpay: "stc_pay",
              mada: "mada",
            };
            setTransactionId(payment?.id || "");
            setPaymentSourceType(methodMap[sourceType] || sourceType);
            setMoyasarPaymentCompleted(true);
          },
        });
        setMoyasarInitialized(true);
      } catch (err) {
        console.error("[Moyasar] Init error:", err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedPaymentMethod, moyasarLoaded, moyasarInitialized, merchant, finalTotal, diningType]);

  useEffect(() => {
    if (!merchant) return;
    if (merchant.onlinePaymentEnabled && !merchant.codEnabled) {
      setSelectedPaymentMethod("online");
    } else if (!merchant.onlinePaymentEnabled && merchant.codEnabled) {
      setSelectedPaymentMethod("cod");
    }
  }, [merchant]);

  async function handleApplyCoupon() {
    if (!couponCode.trim() || !merchantId) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponValid(false);
    try {
      const res = await fetch(`/api/coupons/${merchantId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponValid(true);
        setCouponDiscount(data.discountPercent);
        setCouponError("");
      } else {
        setCouponValid(false);
        setCouponDiscount(0);
        setCouponError(t("كود الخصم غير صالح أو منتهي", "Coupon code is invalid or expired"));
      }
    } catch {
      setCouponError(t("فشل التحقق من كود الخصم", "Failed to verify coupon code"));
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponCode("");
    setCouponValid(false);
    setCouponDiscount(0);
    setCouponError("");
  }

  function getRiyadhTime(): { hours: number; minutes: number } {
    const now = new Date();
    const riyadh = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
    return { hours: riyadh.getHours(), minutes: riyadh.getMinutes() };
  }

  function isWithinBusinessHours(): boolean {
    if (!merchant) return true;
    if (!merchant.businessOpenTime || !merchant.businessCloseTime) return true;
    const { hours, minutes } = getRiyadhTime();
    const currentMinutes = hours * 60 + minutes;
    const [openH, openM] = merchant.businessOpenTime.split(":").map(Number);
    const [closeH, closeM] = merchant.businessCloseTime.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  const orderingDisabled = (() => {
    if (!merchant) return false;
    const withinHours = isWithinBusinessHours();
    const { hours, minutes } = getRiyadhTime();
    let disabled = false;
    let reason = "open";
    if (!merchant.storeOpen) {
      disabled = true;
      reason = "store_manually_closed";
    } else if (merchant.onlineOrdersEnabled === false) {
      disabled = true;
      reason = "online_orders_disabled";
    } else if (merchant.businessOpenTime && merchant.businessCloseTime && !withinHours) {
      disabled = true;
      reason = "outside_business_hours";
    }
    return disabled;
  })();

  function getClosedReason(): { messageAr: string; messageEn: string; reopenTime?: string } {
    if (!merchant) return { messageAr: "", messageEn: "" };
    if (!merchant.storeOpen) {
      return {
        messageAr: "المعذرة، المتجر مغلق حالياً",
        messageEn: "Sorry, the store is currently closed",
      };
    }
    if (merchant.onlineOrdersEnabled === false) {
      return {
        messageAr: "المعذرة، المتجر لا يستقبل طلبات أونلاين حالياً",
        messageEn: "Sorry, the store is not accepting online orders at the moment",
      };
    }
    if (merchant.businessOpenTime && merchant.businessCloseTime && !isWithinBusinessHours()) {
      return {
        messageAr: "المعذرة، المتجر خارج أوقات العمل",
        messageEn: "Sorry, the store is outside business hours",
        reopenTime: merchant.businessOpenTime,
      };
    }
    return { messageAr: "", messageEn: "" };
  }

  const closedInfo = getClosedReason();

  function openProductModal(product: Product) {
    setModalProduct(product);
    const hasVariants = product.variants && product.variants.length > 0;
    setModalVariant(hasVariants ? product.variants![0] : null);
    setModalAddons([]);
    setModalRemovals([]);
    setModalQty(1);
  }

  function getModalPrice(): number {
    if (!modalProduct) return 0;
    const base = modalVariant ? modalVariant.price : modalProduct.price;
    const addonsTotal = modalAddons.reduce((s, a) => s + a.price, 0);
    return base + addonsTotal;
  }

  function toggleModalAddon(addon: ProductAddon) {
    setModalAddons(prev => {
      const exists = prev.find(a => a.name === addon.name);
      if (exists) return prev.filter(a => a.name !== addon.name);
      return [...prev, addon];
    });
  }

  function toggleModalRemoval(name: string) {
    setModalRemovals(prev => prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name]);
  }

  function confirmAddToCart() {
    if (!modalProduct) return;
    const hasVariants = modalProduct.variants && modalProduct.variants.length > 0;
    if (hasVariants && !modalVariant) return;

    const itemPrice = getModalPrice();
    const addonKey = modalAddons.map(a => a.name).sort().join(",");
    const removalKey = modalRemovals.sort().join(",");

    setCart(prev => {
      const existing = prev.find(i =>
        i.product.id === modalProduct.id &&
        (i.selectedVariant?.name || "base") === (modalVariant?.name || "base") &&
        i.selectedAddons.map(a => a.name).sort().join(",") === addonKey &&
        (i.selectedRemovals || []).sort().join(",") === removalKey
      );
      if (existing) {
        return prev.map(i =>
          i.product.id === modalProduct.id &&
          (i.selectedVariant?.name || "base") === (modalVariant?.name || "base") &&
          i.selectedAddons.map(a => a.name).sort().join(",") === addonKey &&
          (i.selectedRemovals || []).sort().join(",") === removalKey
            ? { ...i, quantity: i.quantity + modalQty }
            : i
        );
      }
      return [...prev, {
        product: modalProduct,
        quantity: modalQty,
        selectedVariant: modalVariant,
        selectedAddons: [...modalAddons],
        selectedRemovals: [...modalRemovals],
        itemPrice,
      }];
    });

    setModalProduct(null);
  }

  function cartItemKey(item: CartItem): string {
    return `${item.product.id}-${item.selectedVariant?.name || "base"}-${item.selectedAddons.map(a => a.name).sort().join(",")}-${(item.selectedRemovals || []).sort().join(",")}`;
  }

  function updateQuantity(item: CartItem, delta: number) {
    const key = cartItemKey(item);
    setCart(prev => {
      return prev.map(i => {
        if (cartItemKey(i) !== key) return i;
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }).filter(i => i.quantity > 0);
    });
  }

  function removeFromCart(item: CartItem) {
    const key = cartItemKey(item);
    setCart(prev => prev.filter(i => cartItemKey(i) !== key));
  }

  function getCartQuantityForProduct(productId: string): number {
    return cart.filter(i => i.product.id === productId).reduce((s, i) => s + i.quantity, 0);
  }

  function formatCartItemLabel(item: CartItem): string {
    let label = item.product.name;
    if (item.selectedVariant) label += ` (${item.selectedVariant.name})`;
    if (item.selectedAddons.length > 0) label += ` + ${item.selectedAddons.map(a => a.name).join(", ")}`;
    if (item.selectedRemovals && item.selectedRemovals.length > 0) label += ` — بدون ${item.selectedRemovals.join("، ")}`;
    return label;
  }

  async function handleConfirmOrder(overridePaymentMethod?: string, overrideTransactionId?: string) {
    if (!merchantId || cart.length === 0) return;
    if (!customerName.trim()) {
      toast({ title: t("مطلوب", "Required"), description: t("يرجى إدخال الاسم الكامل", "Please enter your full name"), variant: "destructive" });
      return;
    }
    if (customerPhone.length !== 10) {
      toast({ title: t("مطلوب", "Required"), description: t("يرجى إدخال رقم جوال صحيح من 10 أرقام", "Please enter a valid 10-digit phone number"), variant: "destructive" });
      return;
    }
    if (!diningType) {
      toast({ title: t("مطلوب", "Required"), description: t("يرجى اختيار نوع الطلب", "Please select order type"), variant: "destructive" });
      return;
    }
    if (diningType === "delivery" && !deliveryLocationConfirmed) {
      toast({ title: t("مطلوب", "Required"), description: t("يرجى تحديد وتثبيت موقع التوصيل على الخريطة", "Please set and confirm your delivery location on the map"), variant: "destructive" });
      return;
    }
    if (merchant?.storeTermsEnabled && !storeTermsAccepted) {
      toast({ title: t("مطلوب", "Required"), description: t("يرجى الموافقة على الشروط والأحكام", "Please accept the terms and conditions"), variant: "destructive" });
      return;
    }
    if (orderingDisabled) {
      toast({ title: t("عذراً", "Sorry"), description: t(closedInfo.messageAr || "الطلب غير متاح حالياً", closedInfo.messageEn || "Online ordering unavailable"), variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.itemPrice,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant?.name || null,
        extras: item.selectedAddons.map(a => a.name),
        removals: item.selectedRemovals || [],
      }));

      const urlParams = new URLSearchParams(window.location.search);
      const orderSource = urlParams.get("source") || "";

      const finalPaymentMethod = overridePaymentMethod || paymentSourceType || (selectedPaymentMethod === "cod" ? "cod" : "credit_card");
      const finalTransactionId = overrideTransactionId || transactionId;

      const orderBody: any = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: orderItems,
        total: cartTotal,
        paymentMethod: finalPaymentMethod,
        diningType: diningType,
      };
      if (customerNotes.trim()) {
        orderBody.customerNotes = customerNotes.trim();
      }
      if (diningType === "delivery" && deliveryLat !== null && deliveryLng !== null) {
        orderBody.deliveryLat = deliveryLat;
        orderBody.deliveryLng = deliveryLng;
        if (deliveryAddress.trim()) {
          orderBody.deliveryAddress = deliveryAddress.trim();
        }
      }
      if (finalTransactionId) {
        orderBody.transactionId = finalTransactionId;
      }
      if (orderSource) {
        orderBody.source = orderSource;
      }
      if (couponValid && couponCode.trim()) {
        orderBody.couponCode = couponCode.trim();
      }

      const res = await fetch(`/api/whatsapp-orders/${merchantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to create order");
      }
      const data = await res.json();
      const orderId = data.orderId;

      if (diningType === "delivery") {
        window.location.href = `/delivery-tracker/${orderId}?m=${merchantId}`;
      } else {
        window.location.href = `/digital-pager/${orderId}?m=${merchantId}`;
      }
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      let description = t("فشل في إرسال الطلب. يرجى المحاولة مرة أخرى", "Failed to submit order. Please try again");
      if (msg.includes("closed") || msg.includes("business hours")) {
        description = t("المتجر مغلق حالياً", "Store is currently closed");
      } else if (msg.includes("not available") || msg.includes("not found")) {
        description = t("المتجر غير متاح حالياً", "Store is currently unavailable");
      } else if (msg.includes("online order")) {
        description = t("الطلب أونلاين غير مفعّل حالياً", "Online ordering is currently disabled");
      }
      toast({ title: t("عذراً", "Sorry"), description, variant: "destructive" });
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (moyasarPaymentCompleted && transactionId) {
      handleConfirmOrder(paymentSourceType, transactionId);
    }
  }, [moyasarPaymentCompleted, transactionId]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/30 text-xs tracking-[0.3em] uppercase">{t("جاري التحميل", "LOADING MENU")}</span>
        </div>
      </div>
    );
  }

  if (notFound || !merchant) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6">
        <Card className="w-full max-w-sm border-red-600/20 bg-black">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2" data-testid="text-menu-not-found">{t("القائمة غير متاحة", "Menu Not Available")}</h2>
            <p className="text-gray-400 text-sm" data-testid="text-menu-not-found-en">{t("المتجر غير موجود أو القائمة غير متاحة", "Store not found or menu not available")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showCheckout) {
    if (cart.length === 0) {
      setTimeout(() => setShowCheckout(false), 0);
      return (
        <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}>
          <p className="text-white/40 text-sm">{t("لا توجد عناصر في السلة", "No items in cart")}</p>
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] flex flex-col" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }} dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex-shrink-0 p-4 border-b border-red-600/10 flex items-center justify-between">
          <button onClick={() => setShowCheckout(false)} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors" data-testid="button-back-to-menu">
            <ArrowLeft className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
            <span className="text-sm">{t("العودة للقائمة", "Back to Menu")}</span>
          </button>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700/50 bg-zinc-900/60 hover:bg-zinc-800/60 transition-colors"
            data-testid="button-lang-toggle-checkout"
          >
            <Globe className="w-3.5 h-3.5 text-white/50" />
            <span className="text-white/70 text-xs font-bold">{lang === "ar" ? "EN" : "AR"}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <h2 className="text-white text-xl font-bold mb-1 text-center" data-testid="text-checkout-title">{t("ملخص الطلب", "Order Summary")}</h2>
          <p className="text-white/40 text-sm text-center mb-6">{t("راجع طلبك قبل الإرسال", "Review your order before submitting")}</p>

          <div className="space-y-3 mb-6">
            {cart.map((item, idx) => (
              <div key={cartItemKey(item)} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50" data-testid={`checkout-item-${item.product.id}-${idx}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{item.product.name}</p>
                    {item.selectedVariant && (
                      <p className="text-white/50 text-[11px]">{item.selectedVariant.name}</p>
                    )}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-emerald-400/70 text-[11px]">+ {item.selectedAddons.map(a => a.name).join(", ")}</p>
                    )}
                    {item.selectedRemovals && item.selectedRemovals.length > 0 && (
                      <p className="text-amber-400/70 text-[11px]">— {t("بدون", "No")} {item.selectedRemovals.join(", ")}</p>
                    )}
                    <p className="text-red-400 text-xs mt-0.5">{item.itemPrice.toFixed(2)} SAR</p>
                  </div>
                  <p className="text-white font-bold text-sm ml-3">{getItemTotal(item).toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/30">
                  <button
                    onClick={() => removeFromCart(item)}
                    className="text-red-500/60 hover:text-red-400 text-xs transition-colors"
                    data-testid={`button-remove-checkout-${idx}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item, -1)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                      data-testid={`button-checkout-decrease-${idx}`}
                    >
                      <Minus className="w-3 h-3 text-white/60" />
                    </button>
                    <span className="w-6 text-center text-white text-sm font-bold" data-testid={`text-checkout-qty-${idx}`}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item, 1)}
                      className="w-7 h-7 rounded-lg bg-red-600/20 flex items-center justify-center hover:bg-red-600/30 transition-colors"
                      data-testid={`button-checkout-increase-${idx}`}
                    >
                      <Plus className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-red-600/5 border border-red-600/20">
              <span className="text-white/70 font-medium">{(couponValid || deliveryFeeAmount > 0) ? t("المجموع الأصلي", "Subtotal") : t("المجموع", "Total")}</span>
              <span className={`text-xl font-bold ${(couponValid || deliveryFeeAmount > 0) ? "text-white/40 line-through" : "text-red-400"}`} data-testid="text-checkout-total">{cartTotal.toFixed(2)} SAR</span>
            </div>

            {couponValid && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                <span className="text-emerald-400 text-sm font-medium">{t("الخصم", "Discount")} ({couponDiscount}%)</span>
                <span className="text-emerald-400 text-sm font-bold" data-testid="text-discount-amount">-{discountAmount.toFixed(2)} SAR</span>
              </div>
            )}

            {deliveryFeeAmount > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15" data-testid="delivery-fee-line">
                <span className="text-emerald-400 text-sm font-medium flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  {t("رسوم التوصيل", "Delivery Fee")}
                </span>
                <span className="text-emerald-400 text-sm font-bold">+{deliveryFeeAmount.toFixed(2)} SAR</span>
              </div>
            )}

            {(couponValid || deliveryFeeAmount > 0) && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/20">
                <span className="text-white font-bold">{t("الإجمالي", "Total")}</span>
                <span className="text-emerald-400 text-xl font-bold" data-testid="text-final-total">{finalTotal.toFixed(2)} SAR</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="text-white/60 text-xs mb-1.5 block">{t("هل لديك كود خصم؟", "Have a coupon code?")}</label>
            {!couponValid ? (
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                  placeholder={t("مثال: SAVE20", "e.g. SAVE20")}
                  className="flex-1 h-11 bg-zinc-900/80 border-zinc-700 text-white placeholder:text-white/20 focus:border-red-500 rounded-xl uppercase"
                  dir="ltr"
                  data-testid="input-coupon-code"
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || couponLoading}
                  className="h-11 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/20 rounded-xl font-medium text-sm disabled:opacity-30"
                  data-testid="button-apply-coupon"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                  <span className="ms-1.5">{t("تطبيق", "Apply")}</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-bold" dir="ltr" data-testid="text-applied-coupon">{couponCode}</span>
                  <span className="text-emerald-400/60 text-xs">({couponDiscount}% {t("خصم", "off")})</span>
                </div>
                <button onClick={handleRemoveCoupon} className="text-white/40 hover:text-white/60 p-1" data-testid="button-remove-coupon">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {couponError && <p className="text-red-400/70 text-[11px] mt-1.5" data-testid="text-coupon-error">{couponError}</p>}
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">{t("الاسم", "Name")}</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t("اسمك", "Your Name")}
                className="h-12 bg-zinc-900/80 border-zinc-700 text-white placeholder:text-white/20 focus:border-red-500 rounded-xl"
                data-testid="input-customer-name"
              />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">{t("رقم الجوال", "Phone Number")}</label>
              <Input
                value={customerPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  if (val.length <= 10) setCustomerPhone(val);
                }}
                placeholder="05xxxxxxxx"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                className="h-12 bg-zinc-900/80 border-zinc-700 text-white placeholder:text-white/20 focus:border-red-500 rounded-xl"
                dir="ltr"
                data-testid="input-customer-phone"
              />
              {customerPhone.length > 0 && customerPhone.length < 10 && (
                <p className="text-red-400/60 text-[10px] mt-1">{t("يجب إدخال 10 أرقام", "Must be 10 digits")}</p>
              )}
            </div>
          </div>

          <div className="mb-6" data-testid="section-order-type">
            <p className="text-white/50 text-xs font-medium mb-3">{t("نوع الطلب", "Order Type")}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDiningType("dine_in")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2.5 ${diningType === "dine_in" ? "bg-sky-500/10 border-sky-500/40" : "bg-zinc-900/40 border-zinc-800/30 hover:border-zinc-700/50"}`}
                style={diningType === "dine_in" ? { boxShadow: "0 0 20px rgba(14,165,233,0.08)" } : undefined}
                data-testid="button-dining-dine-in"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${diningType === "dine_in" ? "bg-sky-500/20" : "bg-zinc-800/50"}`}>
                  <UtensilsCrossed className={`w-6 h-6 ${diningType === "dine_in" ? "text-sky-400" : "text-white/40"}`} />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${diningType === "dine_in" ? "text-white" : "text-white/70"}`}>{t("محلي", "Dine-in")}</p>
                  <p className="text-white/30 text-[11px] mt-0.5">{t("تناول في المتجر", "Eat at the store")}</p>
                </div>
                {diningType === "dine_in" && <Check className="w-5 h-5 text-sky-400" />}
              </button>
              <button
                type="button"
                onClick={() => setDiningType("takeaway")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2.5 ${diningType === "takeaway" ? "bg-orange-500/10 border-orange-500/40" : "bg-zinc-900/40 border-zinc-800/30 hover:border-zinc-700/50"}`}
                style={diningType === "takeaway" ? { boxShadow: "0 0 20px rgba(249,115,22,0.08)" } : undefined}
                data-testid="button-dining-takeaway"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${diningType === "takeaway" ? "bg-orange-500/20" : "bg-zinc-800/50"}`}>
                  <ShoppingBag className={`w-6 h-6 ${diningType === "takeaway" ? "text-orange-400" : "text-white/40"}`} />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${diningType === "takeaway" ? "text-white" : "text-white/70"}`}>{t("سفري", "Takeaway")}</p>
                  <p className="text-white/30 text-[11px] mt-0.5">{t("طلب للخارج", "Take it to go")}</p>
                </div>
                {diningType === "takeaway" && <Check className="w-5 h-5 text-orange-400" />}
              </button>
              {merchant.deliveryEnabled && (
                <button
                  type="button"
                  onClick={() => setDiningType("delivery")}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2.5 col-span-2 ${diningType === "delivery" ? "bg-emerald-500/10 border-emerald-500/40" : "bg-zinc-900/40 border-zinc-800/30 hover:border-zinc-700/50"}`}
                  style={diningType === "delivery" ? { boxShadow: "0 0 20px rgba(16,185,129,0.08)" } : undefined}
                  data-testid="button-dining-delivery"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${diningType === "delivery" ? "bg-emerald-500/20" : "bg-zinc-800/50"}`}>
                    <Truck className={`w-6 h-6 ${diningType === "delivery" ? "text-emerald-400" : "text-white/40"}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${diningType === "delivery" ? "text-white" : "text-white/70"}`}>{t("المتجر يوصلك", "Delivery")}</p>
                    <p className="text-white/30 text-[11px] mt-0.5">{t("توصيل لموقعك", "Delivered to your location")}</p>
                  </div>
                  {merchant.deliveryFee > 0 && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${diningType === "delivery" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-white/40"}`}>
                      +{merchant.deliveryFee.toFixed(2)} SAR
                    </span>
                  )}
                  {diningType === "delivery" && <Check className="w-5 h-5 text-emerald-400" />}
                </button>
              )}
            </div>
            {diningType && (
              <div className="mt-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/20">
                <p className="text-white/50 text-xs text-center">
                  {t("نوع الطلب:", "Order Type:")} <span className={`font-bold ${diningType === "delivery" ? "text-emerald-400" : diningType === "takeaway" ? "text-orange-400" : "text-sky-400"}`}>{diningType === "dine_in" ? t("محلي", "Dine-in") : diningType === "takeaway" ? t("سفري", "Takeaway") : t("المتجر يوصلك", "Delivery")}</span>
                </p>
              </div>
            )}
          </div>

          {diningType === "delivery" && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3" data-testid="delivery-address-section">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <label className="text-emerald-400 text-xs font-bold">{t("حدد موقع التوصيل", "Set Delivery Location")} <span className="text-red-400">*</span></label>
                </div>
                {merchant?.deliveryRange && merchant.deliveryRange > 0 && (
                  <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-mono" data-testid="text-delivery-range">
                    {t("نطاق", "Range")}: {merchant.deliveryRange} km
                  </span>
                )}
              </div>
              <Suspense fallback={<div className="w-full h-[220px] rounded-xl bg-white/[0.03] flex items-center justify-center"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>}>
                <DeliveryMapPicker
                  lat={deliveryLat}
                  lng={deliveryLng}
                  confirmed={deliveryLocationConfirmed}
                  onLocationConfirmed={(lat, lng, address) => {
                    setDeliveryLat(lat);
                    setDeliveryLng(lng);
                    if (address) setDeliveryAddress(address);

                    const range = merchant?.deliveryRange ?? 0;
                    const sLat = merchant?.storeLat ?? null;
                    const sLng = merchant?.storeLng ?? null;

                    if (range > 0 && sLat !== null && sLng !== null) {
                      const distKm = haversineKm(sLat, sLng, lat, lng);
                      if (distKm > range) {
                        toast({
                          title: t("خارج نطاق التوصيل", "Outside Delivery Range"),
                          description: t(
                            `موقعك يبعد ${distKm.toFixed(1)} كم، وأقصى نطاق توصيل هو ${range} كم.`,
                            `Your location is ${distKm.toFixed(1)} km away. Max delivery range is ${range} km.`
                          ),
                          variant: "destructive",
                        });
                        setDeliveryLocationConfirmed(false);
                        return;
                      }
                    }

                    setDeliveryLocationConfirmed(true);
                  }}
                  onLocationDirty={() => {
                    setDeliveryLocationConfirmed(false);
                  }}
                  onGeoError={(type) => {
                    if (type === "unsupported") {
                      toast({ title: t("غير مدعوم", "Not Supported"), description: t("المتصفح لا يدعم تحديد الموقع، حدد الموقع يدوياً على الخريطة", "Browser does not support geolocation, please set location manually on map"), variant: "destructive" });
                    } else {
                      toast({ title: t("خطأ", "Error"), description: t("فشل في تحديد الموقع، يرجى السماح بالوصول أو حدد الموقع يدوياً", "Failed to get location, please allow access or set manually"), variant: "destructive" });
                    }
                  }}
                  isRTL={isRTL}
                  t={t}
                />
              </Suspense>
              <div className="space-y-1">
                <label className="text-white/40 text-[10px]">{t("العنوان (يتم تعبئته تلقائياً من الخريطة)", "Address (auto-filled from map)")}</label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={t("العنوان سيظهر هنا بعد تثبيت الموقع", "Address will appear after confirming location")}
                  maxLength={300}
                  className="h-10 bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 text-xs"
                  dir="rtl"
                  data-testid="input-delivery-address"
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="text-white/50 text-xs font-medium mb-2 block">{t("ملاحظات إضافية", "Special Instructions")}</label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder={t("مثلاً: بدون بصل، الصوص جانبي...", "e.g., No onions, sauce on the side...")}
              maxLength={500}
              rows={3}
              className="w-full p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/30 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-red-500/40 resize-none"
              dir={isRTL ? "rtl" : "ltr"}
              data-testid="textarea-customer-notes"
            />
          </div>

          {!merchant.onlinePaymentEnabled && !merchant.codEnabled && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-4" data-testid="text-no-payment-methods">
              <p className="text-red-400 text-sm font-bold text-center">{t("لا توجد طرق دفع متاحة", "No payment methods available")}</p>
            </div>
          )}

          {merchant.onlinePaymentEnabled && merchant.codEnabled && (
            <div className="mb-4 space-y-2" data-testid="payment-method-selection">
              <p className="text-white/50 text-xs font-medium mb-2">{t("اختر طريقة الدفع", "Choose payment method")}</p>
              <button
                type="button"
                onClick={() => { setSelectedPaymentMethod("online"); setMoyasarInitialized(false); setMoyasarPaymentCompleted(false); setTransactionId(""); setPaymentSourceType(""); }}
                className={`w-full p-4 rounded-xl border transition-all flex items-center gap-3 ${selectedPaymentMethod === "online" ? "bg-red-500/10 border-red-500/40" : "bg-zinc-900/40 border-zinc-800/30 hover:border-zinc-700/50"}`}
                data-testid="button-payment-online"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selectedPaymentMethod === "online" ? "bg-red-500/20" : "bg-zinc-800/50"}`}>
                  <CreditCard className={`w-5 h-5 ${selectedPaymentMethod === "online" ? "text-red-400" : "text-white/40"}`} />
                </div>
                <div className={`${isRTL ? "text-right" : "text-left"} flex-1`}>
                  <p className={`text-sm font-bold ${selectedPaymentMethod === "online" ? "text-white" : "text-white/70"}`}>{t("الدفع إلكترونياً", "Online Payment")}</p>
                  <p className="text-white/30 text-[11px] mt-0.5">{t("بطاقة / Apple Pay / STC Pay", "Card / Apple Pay / STC Pay")}</p>
                </div>
                {selectedPaymentMethod === "online" && <Check className="w-5 h-5 text-red-400 flex-shrink-0" />}
              </button>
              <button
                type="button"
                onClick={() => { setSelectedPaymentMethod("cod"); setMoyasarPaymentCompleted(false); setTransactionId(""); setPaymentSourceType(""); setMoyasarInitialized(false); }}
                className={`w-full p-4 rounded-xl border transition-all flex items-center gap-3 ${selectedPaymentMethod === "cod" ? "bg-emerald-500/10 border-emerald-500/40" : "bg-zinc-900/40 border-zinc-800/30 hover:border-zinc-700/50"}`}
                data-testid="button-payment-cod"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selectedPaymentMethod === "cod" ? "bg-emerald-500/20" : "bg-zinc-800/50"}`}>
                  <Banknote className={`w-5 h-5 ${selectedPaymentMethod === "cod" ? "text-emerald-400" : "text-white/40"}`} />
                </div>
                <div className={`${isRTL ? "text-right" : "text-left"} flex-1`}>
                  <p className={`text-sm font-bold ${selectedPaymentMethod === "cod" ? "text-white" : "text-white/70"}`}>{t("الدفع عند الاستلام (كاش)", "Cash on Delivery")}</p>
                  <p className="text-white/30 text-[11px] mt-0.5">{t("الدفع نقداً عند الاستلام", "Pay cash when you collect")}</p>
                </div>
                {selectedPaymentMethod === "cod" && <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
              </button>
            </div>
          )}

          {!merchant.onlinePaymentEnabled && merchant.codEnabled && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 mb-4" data-testid="payment-method-display">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white/80 text-base font-bold" data-testid="text-payment-method">{t("طريقة الدفع: الدفع عند الاستلام (كاش)", "Payment: Cash on Delivery")}</p>
                </div>
              </div>
            </div>
          )}

          {selectedPaymentMethod === "online" && merchant.onlinePaymentEnabled && (
            <div className="mb-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/40" data-testid="moyasar-form-container">
              {!diningType ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400/80 text-sm">{t("يرجى اختيار نوع الطلب أولاً", "Please select order type first")}</span>
                </div>
              ) : !moyasarLoaded ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-red-400" />
                  <span className="text-white/50 text-sm">{t("جاري تحميل بوابة الدفع...", "Loading payment gateway...")}</span>
                </div>
              ) : moyasarPaymentCompleted ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-bold">{t("تم الدفع بنجاح", "Payment successful")}</span>
                </div>
              ) : (
                <div id="moyasar-payment-form" />
              )}
            </div>
          )}

          {merchant.storeTermsEnabled && (
            <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/30 cursor-pointer mb-6" data-testid="label-store-terms">
              <input
                type="checkbox"
                checked={storeTermsAccepted}
                onChange={(e) => setStoreTermsAccepted(e.target.checked)}
                className="w-5 h-5 rounded border-red-600/50 text-red-600 focus:ring-red-500 bg-transparent accent-red-600 flex-shrink-0"
                data-testid="checkbox-store-terms"
              />
              <div className="text-sm leading-relaxed">
                <span className="text-white/80">{t("أوافق على ", "I agree to the ")}</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowStoreTermsModal("terms"); }}
                  className="text-red-400 font-medium hover:underline"
                  data-testid="link-store-terms"
                >
                  {t("الشروط والأحكام", "Terms & Conditions")}
                </button>
                <span className="text-white/80">{t(" و", " and ")}</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowStoreTermsModal("privacy"); }}
                  className="text-red-400 font-medium hover:underline"
                  data-testid="link-store-privacy"
                >
                  {t("سياسة الخصوصية", "Privacy Policy")}
                </button>
                <span className="text-white/80">{t(" الخاصة بالمتجر", "")}</span>
              </div>
            </label>
          )}

          {!merchant.storeTermsEnabled && <div className="mb-2" />}

          {(selectedPaymentMethod === "cod" || (!merchant.onlinePaymentEnabled && merchant.codEnabled)) && (
            <Button
              onClick={() => handleConfirmOrder()}
              disabled={!customerName.trim() || customerPhone.length !== 10 || !diningType || (diningType === "delivery" && !deliveryLocationConfirmed) || (merchant.storeTermsEnabled && !storeTermsAccepted) || submitting || (!merchant.onlinePaymentEnabled && !merchant.codEnabled) || (merchant.onlinePaymentEnabled && merchant.codEnabled && !selectedPaymentMethod)}
              className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 rounded-xl gap-2"
              style={{ boxShadow: "0 0 25px rgba(16,185,129,0.15)" }}
              data-testid="button-confirm-order"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              <span>{submitting ? t("جاري إرسال الطلب...", "Submitting order...") : t("إرسال الطلب وبدء التتبع", "Submit Order & Start Tracking")}</span>
            </Button>
          )}

          {selectedPaymentMethod === "online" && !moyasarPaymentCompleted && (
            <p className="text-white/30 text-[11px] text-center mt-2">{t("أكمل الدفع أعلاه لإرسال الطلب تلقائياً", "Complete payment above to submit order automatically")}</p>
          )}

          {submitting && selectedPaymentMethod === "online" && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              <span className="text-emerald-400 text-sm">{t("جاري إرسال الطلب...", "Submitting order...")}</span>
            </div>
          )}
        </div>

        {showStoreTermsModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center" data-testid="modal-store-legal">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowStoreTermsModal(null)} />
            <div className="relative w-full max-w-lg max-h-[80dvh] bg-[#111] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden mx-4">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
                <h3 className="text-white font-bold text-base" data-testid="modal-store-legal-title">
                  {showStoreTermsModal === "terms" ? t("شروط وأحكام المتجر", "Store Terms & Conditions") : t("سياسة الخصوصية", "Privacy Policy")}
                </h3>
                <button onClick={() => setShowStoreTermsModal(null)} className="p-1 text-white/40 hover:text-white" data-testid="button-close-store-legal">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap" dir={isRTL ? "rtl" : "ltr"} data-testid="text-store-legal-content">
                  {showStoreTermsModal === "terms" ? (merchant.storeTermsText || "") : (merchant.storePrivacyText || "")}
                </div>
              </div>
              <div className="p-4 border-t border-zinc-800/50">
                <button
                  onClick={() => setShowStoreTermsModal(null)}
                  className="w-full h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
                  data-testid="button-close-store-legal-bottom"
                >
                  {t("إغلاق", "Close")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }} dir={isRTL ? "rtl" : "ltr"} data-testid="public-menu-page">
      <div className="flex-shrink-0 pt-6 pb-4 px-5">
        <div className="flex justify-end mb-3">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700/50 bg-zinc-900/60 hover:bg-zinc-800/60 transition-colors"
            data-testid="button-lang-toggle"
          >
            <Globe className="w-3.5 h-3.5 text-white/50" />
            <span className="text-white/70 text-xs font-bold">{lang === "ar" ? "EN" : "AR"}</span>
          </button>
        </div>
        <div className="text-center">
          {merchant.logoUrl ? (
            <img
              src={merchant.logoUrl}
              alt={merchant.storeName}
              className="w-20 h-20 rounded-full object-cover border-2 border-red-600/30 mx-auto mb-2.5"
              style={{ boxShadow: "0 0 20px rgba(255,0,0,0.15)" }}
              data-testid="img-menu-logo"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-black border-2 border-red-600/30 flex items-center justify-center mx-auto mb-2.5" style={{ boxShadow: "0 0 20px rgba(255,0,0,0.15)" }}>
              <Store className="w-10 h-10 text-red-500" />
            </div>
          )}
          <h1 className="text-white text-xl font-bold" data-testid="text-menu-store-name">{merchant.storeName}</h1>
        </div>
      </div>

      {orderingDisabled && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20" data-testid="banner-ordering-disabled">
          <div className="flex items-center gap-3 justify-center">
            <Clock className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div className="text-center">
              <p className="text-orange-300 text-sm font-semibold" data-testid="text-closed-message">{t(closedInfo.messageAr, closedInfo.messageEn)}</p>
              {closedInfo.reopenTime && (
                <p className="text-orange-400 text-xs mt-1.5 font-mono" data-testid="text-reopen-time">
                  {t("يفتح الساعة", "Reopening at")} {closedInfo.reopenTime}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {(() => {
        const visibleProducts = products.filter(p => p.visible !== false);
        const categories = Array.from(new Set(visibleProducts.map(p => p.category).filter((c): c is string => !!c && c.trim() !== "")));
        const hasCategories = categories.length > 0;
        const filteredProducts = selectedCategory
          ? visibleProducts.filter(p => p.category === selectedCategory)
          : visibleProducts;
        const grouped: { label: string; items: typeof visibleProducts }[] = hasCategories
          ? (selectedCategory
              ? [{ label: selectedCategory, items: filteredProducts }]
              : [
                  ...categories.map(cat => ({ label: cat, items: visibleProducts.filter(p => p.category === cat) })),
                  ...(visibleProducts.some(p => !p.category || p.category.trim() === "")
                    ? [{ label: t("أخرى", "Other"), items: visibleProducts.filter(p => !p.category || p.category.trim() === "") }]
                    : []),
                ])
          : [];

        function ProductCard({ product }: { product: (typeof visibleProducts)[number] }) {
          const qty = getCartQuantityForProduct(product.id);
          const hasVariants = product.variants && product.variants.length > 0;
          const startPrice = hasVariants ? Math.min(...product.variants!.map(v => v.price)) : product.price;
          return (
            <div
              className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 overflow-hidden flex flex-col cursor-pointer active:scale-[0.98] transition-transform"
              style={{ boxShadow: "0 2px 12px rgba(255,0,0,0.03)" }}
              data-testid={`product-card-${product.id}`}
              onClick={() => { if (!orderingDisabled) openProductModal(product); }}
            >
              {product.imageUrl ? (
                <div className="aspect-square overflow-hidden">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" style={{ borderRadius: "0.75rem 0.75rem 0 0" }} />
                </div>
              ) : (
                <div className="aspect-square bg-zinc-800/30 flex items-center justify-center" style={{ borderRadius: "0.75rem 0.75rem 0 0" }}>
                  <Store className="w-8 h-8 text-white/10" />
                </div>
              )}
              <div className="p-3 flex-1 flex flex-col">
                <p className="text-white text-sm font-semibold truncate" data-testid={`text-product-name-${product.id}`}>{product.name}</p>
                {product.description && <p className="text-white/30 text-[11px] mt-0.5 line-clamp-2">{product.description}</p>}
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="text-red-400 font-bold text-sm" data-testid={`text-product-price-${product.id}`}>
                    {hasVariants ? `${startPrice.toFixed(2)}+` : product.price.toFixed(2)}
                  </span>
                  {orderingDisabled ? (
                    <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center opacity-30" data-testid={`button-add-disabled-${product.id}`}>
                      <Plus className="w-4 h-4 text-white/30" />
                    </div>
                  ) : qty > 0 ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <span className="bg-red-600/20 text-red-400 text-xs font-bold rounded-full px-2 py-0.5" data-testid={`text-qty-${product.id}`}>{qty}</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-600/20 flex items-center justify-center hover:bg-red-600/20 transition-colors" data-testid={`button-add-${product.id}`}>
                      <Plus className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return (
          <>
            {hasCategories && (
              <div className="px-4 mb-2 overflow-x-auto" data-testid="category-nav-bar">
                <div className="flex gap-2 pb-2" style={{ width: "max-content" }}>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === null
                        ? "bg-red-600 text-white shadow-md shadow-red-900/30"
                        : "bg-zinc-800/60 text-white/50 hover:text-white/80 hover:bg-zinc-700/60 border border-white/[0.06]"
                    }`}
                    data-testid="category-pill-all"
                  >
                    {t("الكل", "All")}
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? "bg-red-600 text-white shadow-md shadow-red-900/30"
                          : "bg-zinc-800/60 text-white/50 hover:text-white/80 hover:bg-zinc-700/60 border border-white/[0.06]"
                      }`}
                      data-testid={`category-pill-${cat}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 pb-28">
              {visibleProducts.length === 0 ? (
                <div className="text-center py-16" data-testid="empty-menu-state">
                  <p className="text-white/40 text-sm">{t("لا توجد منتجات متاحة حالياً", "No products available at the moment")}</p>
                </div>
              ) : hasCategories ? (
                <div className="space-y-6" data-testid="menu-product-grid">
                  {grouped.map(group => group.items.length > 0 && (
                    <div key={group.label} id={`cat-${group.label}`} data-testid={`category-section-${group.label}`}>
                      <h2 className="text-white/80 font-bold text-sm mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-red-500 rounded-full inline-block" />
                        {group.label}
                        <span className="text-white/25 font-normal text-xs">({group.items.length})</span>
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {group.items.map(product => <ProductCard key={product.id} product={product} />)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="menu-product-grid">
                  {visibleProducts.map(product => <ProductCard key={product.id} product={product} />)}
                </div>
              )}
            </div>
          </>
        );
      })()}

      {modalProduct && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" data-testid="modal-product-selection">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalProduct(null)} />
          <div className="relative w-full max-w-md max-h-[85dvh] bg-[#111] border border-zinc-800 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-zinc-800/50">
              <h3 className="text-white font-bold text-base truncate flex-1" data-testid="modal-product-name">{modalProduct.name}</h3>
              <button onClick={() => setModalProduct(null)} className="p-1 text-white/40 hover:text-white" data-testid="button-close-modal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {modalProduct.imageUrl && (
                <div className="aspect-video rounded-xl overflow-hidden">
                  <img src={modalProduct.imageUrl} alt={modalProduct.name} className="w-full h-full object-cover" />
                </div>
              )}

              {modalProduct.description && (
                <p className="text-white/50 text-sm">{modalProduct.description}</p>
              )}

              {modalProduct.variants && modalProduct.variants.length > 0 && (
                <div data-testid="section-variants">
                  <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2">{t("الحجم", "Size")}</p>
                  <div className="space-y-2">
                    {modalProduct.variants.map((variant, idx) => (
                      <div
                        key={idx}
                        onClick={() => setModalVariant(variant)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                          modalVariant?.name === variant.name
                            ? "border-red-500/40 bg-red-600/10"
                            : "border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600"
                        }`}
                        data-testid={`variant-option-${idx}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            modalVariant?.name === variant.name ? "border-red-500" : "border-zinc-600"
                          }`}>
                            {modalVariant?.name === variant.name && (
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            )}
                          </div>
                          <span className="text-white text-sm">{variant.name}</span>
                        </div>
                        <span className="text-red-400 text-sm font-bold">{variant.price.toFixed(2)} SAR</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const extras: ProductAddon[] = (modalProduct as any).extras?.length > 0
                  ? (modalProduct as any).extras
                  : (modalProduct.addons || []);
                if (extras.length === 0) return null;
                return (
                  <div data-testid="section-addons">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2">{t("إضافات", "Extras")}</p>
                    <div className="space-y-2">
                      {extras.map((addon, idx) => {
                        const selected = modalAddons.some(a => a.name === addon.name);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleModalAddon(addon)}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                              selected
                                ? "border-emerald-500/40 bg-emerald-600/10"
                                : "border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600"
                            }`}
                            data-testid={`addon-option-${idx}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                                selected ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
                              }`}>
                                {selected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-white text-sm">{addon.name}</span>
                            </div>
                            <span className="text-emerald-400/80 text-sm font-medium">{addon.price > 0 ? `+${addon.price.toFixed(2)} SAR` : t("مجاني", "Free")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const removals: { name: string }[] = (modalProduct as any).removals || [];
                if (removals.length === 0) return null;
                return (
                  <div data-testid="section-removals">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2">{t("تعديلات", "Modifications")}</p>
                    <div className="space-y-2">
                      {removals.map((removal, idx) => {
                        const selected = modalRemovals.includes(removal.name);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleModalRemoval(removal.name)}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                              selected
                                ? "border-amber-500/40 bg-amber-600/10"
                                : "border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600"
                            }`}
                            data-testid={`removal-option-${idx}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                                selected ? "border-amber-500 bg-amber-500" : "border-zinc-600"
                              }`}>
                                {selected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-white text-sm">{t(`بدون ${removal.name}`, `No ${removal.name}`)}</span>
                            </div>
                            <span className="text-amber-400/60 text-xs">{t("مجاني", "Free")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div data-testid="section-quantity">
                <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2">{t("الكمية", "Quantity")}</p>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={() => setModalQty(q => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                    data-testid="button-modal-qty-minus"
                  >
                    <Minus className="w-4 h-4 text-white/60" />
                  </button>
                  <span className="text-white text-xl font-bold w-10 text-center" data-testid="text-modal-qty">{modalQty}</span>
                  <button
                    onClick={() => setModalQty(q => q + 1)}
                    className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center hover:bg-red-600/30 transition-colors"
                    data-testid="button-modal-qty-plus"
                  >
                    <Plus className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 p-4 border-t border-zinc-800/50 bg-[#111]">
              <Button
                onClick={confirmAddToCart}
                disabled={!!(modalProduct.variants && modalProduct.variants.length > 0 && !modalVariant)}
                className="w-full h-14 text-base font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2"
                data-testid="button-modal-add-to-cart"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{t("أضف للسلة", "Add to Cart")}</span>
                <span className="text-white/80">·</span>
                <span>{(getModalPrice() * modalQty).toFixed(2)} SAR</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {cartCount > 0 && !orderingDisabled && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3">
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full max-w-md mx-auto flex items-center justify-between h-14 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors"
            style={{ boxShadow: "0 -4px 30px rgba(255,0,0,0.2), 0 0 0 1px rgba(255,0,0,0.3)" }}
            data-testid="button-view-cart"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-sm">{t("عرض السلة", "View Cart")}</span>
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">{cartCount}</span>
            </div>
            <span className="text-sm font-bold">{cartTotal.toFixed(2)} SAR</span>
          </button>
        </div>
      )}
    </div>
  );
}
