import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ShoppingCart, Plus, Minus, X, AlertTriangle, Loader2, Check, ArrowLeft, Clock } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

interface CartItem {
  product: Product;
  quantity: number;
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
  const [pledgeAccepted, setPledgeAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [, setTimeTick] = useState(0);

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

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function isWithinBusinessHours(): boolean {
    if (!merchant) return true;
    const { businessOpenTime, businessCloseTime } = merchant;
    if (!businessOpenTime || !businessCloseTime) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = businessOpenTime.split(":").map(Number);
    const [closeH, closeM] = businessCloseTime.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  const orderingDisabled = merchant ? (!merchant.onlineOrdersEnabled || !isWithinBusinessHours()) : false;

  function getClosedReason(): { messageAr: string; messageEn: string; reopenTime?: string } {
    if (!merchant) return { messageAr: "", messageEn: "" };
    if (!merchant.onlineOrdersEnabled) {
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

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(prev => {
      return prev.map(i => {
        if (i.product.id !== productId) return i;
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }).filter(i => i.quantity > 0);
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }

  function getCartQuantity(productId: string): number {
    return cart.find(i => i.product.id === productId)?.quantity || 0;
  }

  async function handleConfirmOrder() {
    if (!merchantId || !customerName.trim() || !customerPhone.trim() || !pledgeAccepted || cart.length === 0) return;
    if (orderingDisabled) {
      toast({ title: "عذراً", description: closedInfo.messageAr || "Online ordering unavailable", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
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

      const trackingUrl = `${window.location.origin}/track/${orderId}?m=${merchantId}`;
      let whatsappMsg = `🛒 *طلب جديد - New Order*\n\n`;
      whatsappMsg += `👤 ${customerName.trim()}\n📱 ${customerPhone.trim()}\n\n`;
      whatsappMsg += `📋 *تفاصيل الطلب:*\n`;
      cart.forEach(item => {
        whatsappMsg += `• ${item.product.name} × ${item.quantity} = ${(item.product.price * item.quantity).toFixed(2)} SAR\n`;
      });
      whatsappMsg += `\n💰 *المجموع: ${cartTotal.toFixed(2)} SAR*\n\n`;
      whatsappMsg += `🔗 *رابط التتبع:*\n${trackingUrl}\n\n`;
      whatsappMsg += `⚠️ تم التعهد بالاستلام من الفرع`;

      const whatsappNumber = merchant?.whatsappNumber?.replace(/[^0-9]/g, "") || "";
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`;

      window.open(whatsappUrl, "_blank");

      setTimeout(() => {
        window.location.href = `/track/${orderId}?m=${merchantId}`;
      }, 1000);
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
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50" data-testid={`checkout-item-${item.product.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.product.name}</p>
                  <p className="text-red-400 text-xs">{item.product.price.toFixed(2)} SAR × {item.quantity}</p>
                </div>
                <p className="text-white font-bold text-sm ml-3">{(item.product.price * item.quantity).toFixed(2)}</p>
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
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                type="tel"
                className="h-12 bg-zinc-900/80 border-zinc-700 text-white placeholder:text-white/20 focus:border-red-500 rounded-xl"
                dir="ltr"
                data-testid="input-customer-phone"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/30 cursor-pointer mb-6" data-testid="label-pledge">
            <input
              type="checkbox"
              checked={pledgeAccepted}
              onChange={(e) => setPledgeAccepted(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-red-600/50 text-red-600 focus:ring-red-500 bg-transparent accent-red-600"
              data-testid="checkbox-pledge"
            />
            <div>
              <p className="text-white/80 text-sm leading-relaxed" dir="rtl">
                أتعهد باستلام طلبي من الفرع لكونه غير مدفوع إلكترونياً
              </p>
              <p className="text-white/30 text-[11px] mt-1">
                I pledge to pick up my order from the branch as it is not paid online
              </p>
            </div>
          </label>

          <Button
            onClick={handleConfirmOrder}
            disabled={!customerName.trim() || !customerPhone.trim() || !pledgeAccepted || submitting}
            className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700 text-white disabled:opacity-30 rounded-xl gap-2"
            style={{ boxShadow: "0 0 25px rgba(34,197,94,0.15)" }}
            data-testid="button-confirm-whatsapp"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <SiWhatsapp className="w-5 h-5" />
            )}
            <span dir="rtl">{submitting ? "جاري الإرسال..." : "تأكيد وإرسال عبر واتساب"}</span>
          </Button>
        </div>
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
              const qty = getCartQuantity(product.id);
              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 overflow-hidden flex flex-col"
                  style={{ boxShadow: "0 2px 12px rgba(255,0,0,0.03)" }}
                  data-testid={`product-card-${product.id}`}
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
                      <span className="text-red-400 font-bold text-sm" data-testid={`text-product-price-${product.id}`}>{product.price.toFixed(2)}</span>
                      {orderingDisabled ? (
                        <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center opacity-30" data-testid={`button-add-disabled-${product.id}`}>
                          <Plus className="w-4 h-4 text-white/30" />
                        </div>
                      ) : qty === 0 ? (
                        <button
                          onClick={() => addToCart(product)}
                          className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-600/20 flex items-center justify-center hover:bg-red-600/20 transition-colors"
                          data-testid={`button-add-${product.id}`}
                        >
                          <Plus className="w-4 h-4 text-red-500" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                            data-testid={`button-decrease-${product.id}`}
                          >
                            <Minus className="w-3 h-3 text-white/60" />
                          </button>
                          <span className="w-6 text-center text-white text-sm font-bold" data-testid={`text-qty-${product.id}`}>{qty}</span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="w-7 h-7 rounded-md bg-red-600/20 flex items-center justify-center hover:bg-red-600/30 transition-colors"
                            data-testid={`button-increase-${product.id}`}
                          >
                            <Plus className="w-3 h-3 text-red-400" />
                          </button>
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
