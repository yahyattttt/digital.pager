import { z } from "zod";

export const merchantStatusEnum = z.enum(["pending", "approved", "rejected", "suspended"]);
export type MerchantStatus = z.infer<typeof merchantStatusEnum>;

export const businessTypeEnum = z.enum(["restaurant", "cafe", "clinic", "other"]);
export type BusinessType = z.infer<typeof businessTypeEnum>;

export const businessTypeLabels: Record<string, string> = {
  restaurant: "مطعم",
  cafe: "مقهى",
  clinic: "عيادة",
  other: "أخرى",
};

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
  createdAt: z.string(),
});

export const insertMerchantSchema = merchantSchema.omit({
  id: true,
  status: true,
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
