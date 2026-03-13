import { z } from "zod";

export const merchantStatusEnum = z.enum(["pending", "approved", "rejected", "suspended"]);
export type MerchantStatus = z.infer<typeof merchantStatusEnum>;

export const subscriptionStatusEnum = z.enum(["pending", "active", "expired", "cancelled"]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;

export const planEnum = z.enum(["trial", "basic", "premium", "enterprise"]);
export type Plan = z.infer<typeof planEnum>;

export const planLabels: Record<string, { ar: string; en: string }> = {
  trial: { ar: "تجريبي", en: "Trial" },
  basic: { ar: "أساسي", en: "Basic" },
  premium: { ar: "متقدم", en: "Premium" },
  enterprise: { ar: "مؤسسي", en: "Enterprise" },
};

export const businessTypeEnum = z.enum(["restaurant", "cafe", "clinic", "other"]);
export type BusinessType = z.infer<typeof businessTypeEnum>;

export const businessTypeLabels: Record<string, string> = {
  restaurant: "مطعم",
  cafe: "مقهى",
  clinic: "عيادة",
  other: "أخرى",
};

export const pagerStatusEnum = z.enum(["waiting", "notified", "completed"]);
export type PagerStatus = z.infer<typeof pagerStatusEnum>;

export const whatsappOrderStatusEnum = z.enum(["pending_verification", "awaiting_confirmation", "preparing", "ready", "completed", "archived", "uncollected", "rejected"]);
export type WhatsAppOrderStatus = z.infer<typeof whatsappOrderStatusEnum>;

export const productVariantSchema = z.object({
  name: z.string(),
  price: z.number().min(0),
});

export type ProductVariant = z.infer<typeof productVariantSchema>;

export const productAddonSchema = z.object({
  name: z.string(),
  price: z.number().min(0),
});

export type ProductAddon = z.infer<typeof productAddonSchema>;

export const productRemovalSchema = z.object({
  name: z.string(),
});

export type ProductRemoval = z.infer<typeof productRemovalSchema>;

export const productSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  name: z.string().min(1),
  price: z.number().min(0),
  pricingType: z.enum(["fixed", "variable"]).default("fixed"),
  category: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  visible: z.boolean().default(true),
  variants: z.array(productVariantSchema).optional(),
  addons: z.array(productAddonSchema).optional(),
  extras: z.array(productAddonSchema).optional(),
  removals: z.array(productRemovalSchema).optional(),
  createdAt: z.string(),
});

export type Product = z.infer<typeof productSchema>;

export const insertProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;

export const whatsappOrderItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number().min(1),
});

export const whatsappOrderSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(5),
  items: z.array(whatsappOrderItemSchema).min(1),
  total: z.number().min(0),
  status: whatsappOrderStatusEnum.default("pending_verification"),
  paymentMethod: z.string().default("cod"),
  orderNumber: z.string().optional(),
  displayOrderId: z.string().optional(),
  orderType: z.enum(["online", "manual"]).optional(),
  diningType: z.enum(["dine_in", "takeaway", "delivery"]).optional(),
  deliveryFee: z.number().optional(),
  deliveryAddress: z.string().optional(),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  deliveryMapLink: z.string().optional(),
  customerNotes: z.string().optional(),
  createdAt: z.string(),
});

export type WhatsAppOrder = z.infer<typeof whatsappOrderSchema>;

export const insertWhatsAppOrderSchema = whatsappOrderSchema.omit({
  id: true,
  status: true,
  orderNumber: true,
  displayOrderId: true,
  createdAt: true,
});

export type InsertWhatsAppOrder = z.infer<typeof insertWhatsAppOrderSchema>;

export const pagerSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  orderNumber: z.string().min(1),
  displayOrderId: z.string().optional(),
  orderType: z.enum(["online", "manual"]).optional(),
  status: pagerStatusEnum.default("waiting"),
  createdAt: z.string(),
  notifiedAt: z.string().nullable().optional(),
  fcmToken: z.string().nullable().optional(),
});

export type Pager = z.infer<typeof pagerSchema>;

export const merchantSchema = z.object({
  id: z.string(),
  uid: z.string(),
  storeName: z.string().min(2, "اسم المتجر يجب أن يكون حرفين على الأقل"),
  businessType: businessTypeEnum,
  ownerName: z.string().optional(),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  cityCode: z.string().regex(/^\d{2}$/).optional(),
  logoUrl: z.string().optional(),
  commercialRegisterURL: z.string().optional(),
  googleMapsReviewUrl: z.string().url("رابط جوجل ماب غير صالح"),
  whatsappNumber: z.string().optional(),
  status: merchantStatusEnum.default("pending"),
  subscriptionStatus: subscriptionStatusEnum.default("pending"),
  subscriptionExpiry: z.string().nullable().optional(),
  plan: planEnum.default("trial"),
  sharesCount: z.number().default(0),
  googleMapsClicks: z.number().default(0),
  qrScans: z.number().default(0),
  createdAt: z.string(),
});

export const systemSettingsSchema = z.object({
  appName: z.string().default("Digital Pager"),
  globalLogoUrl: z.string().optional(),
  supportWhatsapp: z.string().default("966500000000"),
  globalThemeColor: z.string().default("#ef0000"),
  platformTermsEnabled: z.boolean().default(false),
  platformTermsText: z.string().default(""),
  platformPrivacyText: z.string().default(""),
});

export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export const insertMerchantSchema = merchantSchema.omit({
  id: true,
  status: true,
  subscriptionStatus: true,
  plan: true,
  createdAt: true,
});

export type Merchant = z.infer<typeof merchantSchema>;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;

export const registerFormSchema = z.object({
  storeName: z.string().min(2, "اسم المتجر يجب أن يكون حرفين على الأقل"),
  businessType: businessTypeEnum,
  email: z.string().email("البريد الإلكتروني غير صالح"),
  googleMapsReviewUrl: z.string().url("يرجى إدخال رابط جوجل ماب صالح"),
});

export type RegisterFormData = z.infer<typeof registerFormSchema>;
