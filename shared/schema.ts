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

export const pagerSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  orderNumber: z.string().min(1),
  status: pagerStatusEnum.default("waiting"),
  createdAt: z.string(),
  notifiedAt: z.string().nullable().optional(),
});

export type Pager = z.infer<typeof pagerSchema>;

export const merchantSchema = z.object({
  id: z.string(),
  uid: z.string(),
  storeName: z.string().min(2, "اسم المتجر يجب أن يكون حرفين على الأقل"),
  businessType: businessTypeEnum,
  ownerName: z.string().min(2, "اسم المالك يجب أن يكون حرفين على الأقل"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  logoUrl: z.string().optional(),
  googleMapsReviewUrl: z.string().url("رابط جوجل ماب غير صالح"),
  status: merchantStatusEnum.default("pending"),
  subscriptionStatus: subscriptionStatusEnum.default("pending"),
  plan: planEnum.default("trial"),
  createdAt: z.string(),
});

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
  ownerName: z.string().min(2, "اسم المالك يجب أن يكون حرفين على الأقل"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  googleMapsReviewUrl: z.string().url("يرجى إدخال رابط جوجل ماب صالح"),
});

export type RegisterFormData = z.infer<typeof registerFormSchema>;
