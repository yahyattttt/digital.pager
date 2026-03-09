import { z } from "zod";

export const merchantStatusEnum = z.enum(["pending", "approved", "rejected"]);
export type MerchantStatus = z.infer<typeof merchantStatusEnum>;

export const merchantSchema = z.object({
  id: z.string(),
  uid: z.string(),
  restaurantName: z.string().min(2, "Restaurant name must be at least 2 characters"),
  ownerName: z.string().min(2, "Owner name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  logoUrl: z.string().optional(),
  googleMapsReviewUrl: z.string().url("Invalid Google Maps URL"),
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
  restaurantName: z.string().min(2, "Restaurant name must be at least 2 characters"),
  ownerName: z.string().min(2, "Owner name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  googleMapsReviewUrl: z.string().url("Please enter a valid Google Maps URL"),
});

export type RegisterFormData = z.infer<typeof registerFormSchema>;
