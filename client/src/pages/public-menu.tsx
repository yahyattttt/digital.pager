import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ShoppingCart, Plus, Minus, X, AlertTriangle, Loader2, Check, ArrowLeft, Clock, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductVariant, ProductAddon } from "@shared/schema";

interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant: ProductVariant | null;
  selectedAddons: ProductAddon[];
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
}

export default function PublicMenuPage() {
  const params = useParams<{ merchantId: string }>();
  const merchantId = params.merchantId;
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, setTimeTick] = useState(0);

  const [storeTermsAccepted, setStoreTermsAccepted] = useState(false);
  const [showStoreTermsModal, setShowStoreTermsModal] = useState<"terms" | "privacy" | null>(null);

  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalVariant, setModalVariant] = useState<ProductVariant | null>(null);
  const [modalAddons, setModalAddons] = useState<ProductAddon[]>([]);
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

  function isWithinBusinessHours(): boolean {
    if (!merchant) return true;
    if (!merchant.businessOpenTime || !merchant.businessCloseTime) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = merchant.businessOpenTime.split(":").map(Number);
    const [closeH, closeM] = merchant.businessCloseTime.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  const orderingDisabled = !merchant?.storeOpen || merchant?.onlineOrdersEnabled === false || !isWithinBusinessHours();

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
    if (!isWithinBusinessHours() && merchant.businessOpenTime) {
      return {
        messageAr: "المعذرة، المتجر لا يستقبل طلبات أونلاين حالياً",
        messageEn: "Sorry, the store is not accepting online orders at the moment",
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

  function confirmAddToCart() {
    if (!modalProduct) return;
    const hasVariants = modalProduct.variants && modalProduct.variants.length > 0;
    if (hasVariants && !modalVariant) return;

    const itemPrice = getModalPrice();
    const cartKey = `${modalProduct.id}-${modalVariant?.name || "base"}-${modalAddons.map(a => a.name).sort().join(",")}`;

    setCart(prev => {
      const existing = prev.find(i =>
        i.product.id === modalProduct.id &&
        (i.selectedVariant?.name || "base") === (modalVariant?.name || "base") &&
        i.selectedAddons.map(a => a.name).sort().join(",") === modalAddons.map(a => a.name).sort().join(",")
      );
      if (existing) {
        return prev.map(i =>
          i.product.id === modalProduct.id &&
          (i.selectedVariant?.name || "base") === (modalVariant?.name || "base") &&
          i.selectedAddons.map(a => a.name).sort().join(",") === modalAddons.map(a => a.name).sort().join(",")
            ? { ...i, quantity: i.quantity + modalQty }
            : i
        );
      }
      return [...prev, {
        product: modalProduct,
        quantity: modalQty,
        selectedVariant: modalVariant,
        selectedAddons: [...modalAddons],
        itemPrice,
      }];
    });

    setModalProduct(null);
  }

  function cartItemKey(item: CartItem): string {
    return `${item.product.id}-${item.selectedVariant?.name || "base"}-${item.selectedAddons.map(a => a.name).sort().join(",")}`;
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
    return label;
  }

  async function handleConfirmOrder() {
    if (!merchantId || !customerName.trim() || customerPhone.length !== 10 || cart.length === 0) return;
    if (merchant?.storeTermsEnabled && !storeTermsAccepted) return;
    if (orderingDisabled) {
      toast({ title: "عذراً", description: closedInfo.messageAr || "Online ordering unavailable", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        name: formatCartItemLabel(item),
        price: item.itemPrice,
        quantity: item.quantity,
      }));

      const res = await fetch(`/api/whatsapp-orders/${merchantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: orderItems,
          total: cartTotal,
        }),
      });

      if (!res.ok) throw new Error("Failed to create order");
      const data = await res.json();
      const orderId = data.orderId;

      window.location.href = `/track/${orderId}?m=${merchantId}`;
    } catch {
      toast({ title: "خطأ", description: "Failed to create order", variant: "destructive" });
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/30 text-xs tracking-[0.3em] uppercase">LOADING MENU</span>
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
            <h2 className="text-white text-xl font-bold mb-2" dir="rtl" data-testid="text-menu-not-found">القائمة غير متاحة</h2>
            <p className="text-gray-400 text-sm" data-testid="text-menu-not-found-en">Menu not available or store not found.</p>
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
          <p className="text-white/40 text-sm">No items in cart</p>
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] flex flex-col" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }}>
        <div className="flex-shrink-0 p-4 border-b border-red-600/10">
          <button onClick={() => setShowCheckout(false)} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors" data-testid="button-back-to-menu">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Menu</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <h2 className="text-white text-xl font-bold mb-1 text-center" dir="rtl" data-testid="text-checkout-title">ملخص الطلب</h2>
          <p className="text-white/40 text-sm text-center mb-6">Order Summary</p>

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
                      <p className="text-white/40 text-[11px]">+ {item.selectedAddons.map(a => a.name).join(", ")}</p>
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

          <div className="flex items-center justify-between p-4 rounded-xl bg-red-600/5 border border-red-600/20 mb-6">
            <span className="text-white/70 font-medium" dir="rtl">المجموع</span>
            <span className="text-red-400 text-xl font-bold" data-testid="text-checkout-total">{cartTotal.toFixed(2)} SAR</span>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-white/60 text-xs mb-1.5 block" dir="rtl">الاسم / Name</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اسمك / Your Name"
                className="h-12 bg-zinc-900/80 border-zinc-700 text-white placeholder:text-white/20 focus:border-red-500 rounded-xl"
                data-testid="input-customer-name"
              />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block" dir="rtl">رقم الجوال / Phone</label>
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
                <p className="text-red-400/60 text-[10px] mt-1" dir="rtl">يجب إدخال 10 أرقام</p>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 mb-4" data-testid="payment-method-display">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Banknote className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-white/80 text-base font-bold" dir="rtl" data-testid="text-payment-method">طريقة الدفع: الدفع عند الاستلام (كاش)</p>
                <p className="text-white/30 text-[11px] mt-0.5">Payment Method: Cash on Delivery</p>
              </div>
            </div>
          </div>

          {merchant.storeTermsEnabled && (
            <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/30 cursor-pointer mb-6" dir="rtl" data-testid="label-store-terms">
              <input
                type="checkbox"
                checked={storeTermsAccepted}
                onChange={(e) => setStoreTermsAccepted(e.target.checked)}
                className="w-5 h-5 rounded border-red-600/50 text-red-600 focus:ring-red-500 bg-transparent accent-red-600 flex-shrink-0"
                data-testid="checkbox-store-terms"
              />
              <div className="text-sm leading-relaxed" dir="rtl">
                <span className="text-white/80">أوافق على </span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowStoreTermsModal("terms"); }}
                  className="text-red-400 font-medium hover:underline"
                  data-testid="link-store-terms"
                >
                  الشروط والأحكام
                </button>
                <span className="text-white/80"> و</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowStoreTermsModal("privacy"); }}
                  className="text-red-400 font-medium hover:underline"
                  data-testid="link-store-privacy"
                >
                  سياسة الخصوصية
                </button>
                <span className="text-white/80"> الخاصة بالمتجر</span>
                <p className="text-white/30 text-[11px] mt-1">
                  I agree to the store's Terms & Conditions and Privacy Policy
                </p>
              </div>
            </label>
          )}

          {!merchant.storeTermsEnabled && <div className="mb-2" />}

          <Button
            onClick={handleConfirmOrder}
            disabled={!customerName.trim() || customerPhone.length !== 10 || (merchant.storeTermsEnabled && !storeTermsAccepted) || submitting}
            className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 rounded-xl gap-2"
            style={{ boxShadow: "0 0 25px rgba(16,185,129,0.15)" }}
            data-testid="button-confirm-order"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            <span dir="rtl">{submitting ? "جاري إرسال الطلب..." : "إرسال الطلب وبدء التتبع"}</span>
          </Button>
        </div>

        {showStoreTermsModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center" data-testid="modal-store-legal">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowStoreTermsModal(null)} />
            <div className="relative w-full max-w-lg max-h-[80dvh] bg-[#111] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden mx-4">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
                <h3 className="text-white font-bold text-base" dir="rtl" data-testid="modal-store-legal-title">
                  {showStoreTermsModal === "terms" ? "شروط وأحكام المتجر" : "سياسة الخصوصية"}
                </h3>
                <button onClick={() => setShowStoreTermsModal(null)} className="p-1 text-white/40 hover:text-white" data-testid="button-close-store-legal">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap" dir="rtl" data-testid="text-store-legal-content">
                  {showStoreTermsModal === "terms" ? (merchant.storeTermsText || "") : (merchant.storePrivacyText || "")}
                </div>
              </div>
              <div className="p-4 border-t border-zinc-800/50">
                <button
                  onClick={() => setShowStoreTermsModal(null)}
                  className="w-full h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
                  data-testid="button-close-store-legal-bottom"
                >
                  إغلاق / Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)" }} data-testid="public-menu-page">
      <div className="flex-shrink-0 pt-8 pb-4 px-5 text-center">
        {merchant.logoUrl ? (
          <img
            src={merchant.logoUrl}
            alt={merchant.storeName}
            className="w-16 h-16 rounded-full object-cover border-2 border-red-600/30 mx-auto mb-3"
            style={{ boxShadow: "0 0 20px rgba(255,0,0,0.15)" }}
            data-testid="img-menu-logo"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-black border-2 border-red-600/30 flex items-center justify-center mx-auto mb-3" style={{ boxShadow: "0 0 20px rgba(255,0,0,0.15)" }}>
            <Store className="w-8 h-8 text-red-500" />
          </div>
        )}
        <h1 className="text-white text-xl font-bold" data-testid="text-menu-store-name">{merchant.storeName}</h1>
        <p className="text-white/40 text-sm mt-1" dir="rtl">القائمة الرقمية</p>
        <p className="text-white/30 text-xs">Digital Menu</p>
      </div>

      {orderingDisabled && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20" data-testid="banner-ordering-disabled">
          <div className="flex items-center gap-3 justify-center">
            <Clock className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div className="text-center">
              <p className="text-orange-300 text-sm font-semibold" dir="rtl" data-testid="text-closed-message-ar">{closedInfo.messageAr}</p>
              <p className="text-orange-300/60 text-xs mt-0.5" data-testid="text-closed-message-en">{closedInfo.messageEn}</p>
              {closedInfo.reopenTime && (
                <p className="text-orange-400 text-xs mt-1.5 font-mono" data-testid="text-reopen-time">
                  <span dir="rtl">يفتح الساعة</span> {closedInfo.reopenTime} <span className="text-orange-400/50">• Reopening at {closedInfo.reopenTime}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {products.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-menu-state">
            <p className="text-white/40 text-sm" dir="rtl">لا توجد منتجات متاحة حالياً</p>
            <p className="text-white/25 text-xs mt-1">No products available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="menu-product-grid">
            {products.map(product => {
              const qty = getCartQuantityForProduct(product.id);
              const hasVariants = product.variants && product.variants.length > 0;
              const startPrice = hasVariants
                ? Math.min(...product.variants!.map(v => v.price))
                : product.price;

              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 overflow-hidden flex flex-col cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ boxShadow: "0 2px 12px rgba(255,0,0,0.03)" }}
                  data-testid={`product-card-${product.id}`}
                  onClick={() => { if (!orderingDisabled) openProductModal(product); }}
                >
                  {product.imageUrl ? (
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        style={{ borderRadius: "0.75rem 0.75rem 0 0", boxShadow: "0 2px 8px rgba(255,0,0,0.06)" }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-zinc-800/30 flex items-center justify-center" style={{ borderRadius: "0.75rem 0.75rem 0 0" }}>
                      <Store className="w-8 h-8 text-white/10" />
                    </div>
                  )}
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="text-white text-sm font-semibold truncate" data-testid={`text-product-name-${product.id}`}>{product.name}</p>
                    {product.description && (
                      <p className="text-white/30 text-[11px] mt-0.5 line-clamp-2">{product.description}</p>
                    )}
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
                        <div
                          className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-600/20 flex items-center justify-center hover:bg-red-600/20 transition-colors"
                          data-testid={`button-add-${product.id}`}
                        >
                          <Plus className="w-4 h-4 text-red-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                  <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2" dir="rtl">الحجم / Size</p>
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

              {modalProduct.addons && modalProduct.addons.length > 0 && (
                <div data-testid="section-addons">
                  <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2" dir="rtl">إضافات / Extras</p>
                  <div className="space-y-2">
                    {modalProduct.addons.map((addon, idx) => {
                      const selected = modalAddons.some(a => a.name === addon.name);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleModalAddon(addon)}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                            selected
                              ? "border-red-500/40 bg-red-600/10"
                              : "border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600"
                          }`}
                          data-testid={`addon-option-${idx}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                              selected ? "border-red-500 bg-red-500" : "border-zinc-600"
                            }`}>
                              {selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-white text-sm">{addon.name}</span>
                          </div>
                          <span className="text-white/50 text-sm">{addon.price > 0 ? `+${addon.price.toFixed(2)}` : "Free"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div data-testid="section-quantity">
                <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2" dir="rtl">الكمية / Quantity</p>
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
                <span dir="rtl">أضف للسلة</span>
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
              <span className="text-sm" dir="rtl">عرض السلة</span>
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">{cartCount}</span>
            </div>
            <span className="text-sm font-bold">{cartTotal.toFixed(2)} SAR</span>
          </button>
        </div>
      )}
    </div>
  );
}
