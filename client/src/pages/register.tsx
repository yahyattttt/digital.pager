import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { registerFormSchema, type RegisterFormData, businessTypeLabels } from "@shared/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Store, User, Mail, Lock, MapPin, Loader2, CheckCircle, ArrowRight, ArrowLeft, Briefcase, Globe, Bell } from "lucide-react";

const businessTypeLabelsEn: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  clinic: "Clinic",
  other: "Other",
};

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, toggleLanguage, isRTL, lang } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      storeName: "",
      businessType: undefined,
      ownerName: "",
      email: "",
      password: "",
      googleMapsReviewUrl: "",
    },
    mode: "onBlur",
  });

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const btLabels = lang === "ar" ? businessTypeLabels : businessTypeLabelsEn;

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t("الملف كبير جداً", "File too large"),
          description: t("يجب أن يكون حجم الشعار أقل من 5 ميجابايت", "Logo must be under 5MB"),
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function uploadLogo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("logo", file);
    const res = await fetch("/api/upload-logo", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url;
  }

  async function onSubmit(data: RegisterFormData) {
    if (!logoFile) {
      toast({
        title: t("الشعار مطلوب", "Logo required"),
        description: t("يرجى رفع شعار المتجر.", "Please upload your store logo."),
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await sendEmailVerification(userCredential.user);

      let logoUrl = "";
      if (logoFile) logoUrl = await uploadLogo(logoFile);

      await setDoc(doc(db, "merchants", userCredential.user.uid), {
        id: userCredential.user.uid,
        uid: userCredential.user.uid,
        storeName: data.storeName,
        businessType: data.businessType,
        ownerName: data.ownerName,
        email: data.email,
        logoUrl,
        googleMapsReviewUrl: data.googleMapsReviewUrl,
        status: "pending",
        subscriptionStatus: "pending",
        plan: "trial",
        createdAt: new Date().toISOString(),
      });

      setRegistrationComplete(true);
    } catch (error: any) {
      let message = t("فشل التسجيل. يرجى المحاولة مرة أخرى.", "Registration failed. Please try again.");
      if (error.code === "auth/email-already-in-use") {
        message = t("هذا البريد الإلكتروني مسجل بالفعل.", "This email is already registered.");
      } else if (error.code === "auth/weak-password") {
        message = t("كلمة المرور ضعيفة.", "Password is too weak.");
      } else if (error.code === "auth/invalid-email") {
        message = t("البريد الإلكتروني غير صالح.", "Invalid email address.");
      }
      toast({
        title: t("خطأ في التسجيل", "Registration Error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        </div>
        <Card className="w-full max-w-lg relative border-primary/20">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-primary" data-testid="icon-success" />
            </div>
            <h2 className="text-2xl font-bold mb-3" data-testid="text-success-title">
              {t("تم استلام طلبك بنجاح", "Request Received")}
            </h2>
            <p className="text-muted-foreground text-sm mb-6" data-testid="text-success-message">
              {t(
                "تم استلام طلبك بنجاح. سيقوم فريق الإدارة بمراجعته وتفعيل حسابك قريباً.",
                "Your request has been received. Our team will review and activate your account soon."
              )}
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setLocation("/login")} className="h-12 font-bold" data-testid="button-go-to-login">
                {t("تسجيل الدخول", "Sign In")}
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back-home">
                {t("العودة للرئيسية", "Back to Home")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-2xl relative">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setLocation("/")}
              className="inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors px-3 py-1.5 rounded-md"
              data-testid="link-back-home"
            >
              <BackArrow className="w-4 h-4" />
              {t("العودة للرئيسية", "Back to Home")}
            </button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLanguage}
              className="border-primary/30 hover:border-primary/60"
              data-testid="button-toggle-language"
            >
              <Globe className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-register-title">
            {t("سجل متجرك", "Register Your Store")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("انضم إلى", "Join")}{" "}
            <span className="text-primary font-semibold">Digital Pager</span>{" "}
            {t("وطوّر نظام الانتظار لديك", "and upgrade your waitlist")}
          </p>
        </div>

        <Card className="border-primary/10 bg-card">
          <CardContent className="pt-6 pb-6 px-6 sm:px-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="flex flex-col items-center mb-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden transition-colors relative group hover:border-primary/60"
                    data-testid="button-upload-logo"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt={t("معاينة الشعار", "Logo preview")} className="w-full h-full object-cover" data-testid="img-logo-preview" />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-[10px]">{t("رفع الشعار", "Upload Logo")}</span>
                      </div>
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" data-testid="input-logo-file" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {logoFile ? logoFile.name : t("PNG, JPG حتى 5 ميجابايت", "PNG, JPG up to 5MB")}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">{t("اسم المتجر", "Store Name")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder={t("اسم المتجر", "Store Name")} className="pr-10 h-12 bg-background border-border text-foreground" data-testid="input-store-name" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">{t("نوع النشاط", "Business Type")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-background border-border text-foreground" data-testid="select-business-type">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-muted-foreground" />
                                <SelectValue placeholder={t("اختر نوع النشاط", "Select business type")} />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="restaurant" data-testid="option-restaurant">{btLabels.restaurant}</SelectItem>
                            <SelectItem value="cafe" data-testid="option-cafe">{btLabels.cafe}</SelectItem>
                            <SelectItem value="clinic" data-testid="option-clinic">{btLabels.clinic}</SelectItem>
                            <SelectItem value="other" data-testid="option-other">{btLabels.other}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">{t("اسم المالك", "Owner Name")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder={t("الاسم الكامل", "Full Name")} className="pr-10 h-12 bg-background border-border text-foreground" data-testid="input-owner-name" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">{t("البريد الإلكتروني", "Email")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="email" placeholder="you@store.com" className="pr-10 h-12 bg-background border-border text-foreground" dir="ltr" data-testid="input-email" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">{t("كلمة المرور", "Password")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="password" placeholder={t("6 أحرف على الأقل", "At least 6 characters")} className="pr-10 h-12 bg-background border-border text-foreground" dir="ltr" data-testid="input-password" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="googleMapsReviewUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">{t("رابط تقييم جوجل ماب", "Google Maps Review URL")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="https://maps.google.com/..." className="pr-10 h-12 bg-background border-border text-foreground" dir="ltr" data-testid="input-google-maps-url" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-base font-bold" disabled={isSubmitting} data-testid="button-register-submit">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      {t("جاري إنشاء الحساب...", "Creating account...")}
                    </>
                  ) : (
                    t("سجل متجرك الآن", "Register Now")
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {t("لديك حساب بالفعل؟", "Already have an account?")}{" "}
                  <button type="button" onClick={() => setLocation("/login")} className="text-primary font-medium hover:underline" data-testid="link-to-login">
                    {t("تسجيل الدخول", "Sign In")}
                  </button>
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
