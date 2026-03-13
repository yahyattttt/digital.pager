import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, setDoc } from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { registerFormSchema, type RegisterFormData, businessTypeLabels } from "@shared/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import neonBellLogo from "@assets/image0_(1)_1773118136698.png";
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
import { Upload, Store, User, Mail, MapPin, Loader2, CheckCircle, ArrowRight, ArrowLeft, Briefcase, Globe, ShieldCheck, KeyRound, X, FileText } from "lucide-react";
import { getDoc, doc as firestoreDoc } from "firebase/firestore";
import type { SystemSettings } from "@shared/schema";

const businessTypeLabelsEn: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  clinic: "Clinic",
  other: "Other",
};

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const { t, toggleLanguage, isRTL, lang } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [crFile, setCrFile] = useState<File | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const crInputRef = useRef<HTMLInputElement>(null);

  const [otpCode, setOtpCode] = useState("");
  const [platformTermsEnabled, setPlatformTermsEnabled] = useState(false);
  const [platformTermsText, setPlatformTermsText] = useState("");
  const [platformPrivacyText, setPlatformPrivacyText] = useState("");
  const [platformTermsAccepted, setPlatformTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState<"terms" | "privacy" | null>(null);

  useEffect(() => {
    async function fetchPlatformTerms() {
      try {
        const docSnap = await getDoc(firestoreDoc(db, "systemSettings", "global"));
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemSettings;
          if (data.platformTermsEnabled) {
            setPlatformTermsEnabled(true);
            setPlatformTermsText(data.platformTermsText || "");
            setPlatformPrivacyText(data.platformPrivacyText || "");
          }
        }
      } catch {
        // silent
      }
    }
    fetchPlatformTerms();
  }, []);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [customToken, setCustomToken] = useState<string | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      storeName: "",
      businessType: undefined,
      email: "",
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

  function handleCrChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t("الملف كبير جداً", "File too large"),
          description: t("يجب أن يكون حجم السجل التجاري أقل من 10 ميجابايت", "Commercial register must be under 10MB"),
          variant: "destructive",
        });
        return;
      }
      if (file.type !== "application/pdf") {
        toast({
          title: t("نوع ملف غير صالح", "Invalid file type"),
          description: t("يرجى رفع ملف PDF فقط", "Please upload a PDF file only"),
          variant: "destructive",
        });
        return;
      }
      setCrFile(file);
    }
  }

  async function uploadCr(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("cr", file);
    const res = await fetch("/api/upload-cr", { method: "POST", body: formData });
    if (!res.ok) throw new Error("CR upload failed");
    const data = await res.json();
    return data.url;
  }

  async function handleSendOtp() {
    if (cooldown > 0) return;

    const email = form.getValues("email");
    if (!email) {
      toast({
        title: t("البريد الإلكتروني مطلوب", "Email required"),
        description: t("يرجى إدخال البريد الإلكتروني أولاً.", "Please enter your email first."),
        variant: "destructive",
      });
      return;
    }

    const emailValid = await form.trigger("email");
    if (!emailValid) return;

    setOtpSending(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        startCooldown();
        toast({
          title: t("تم إرسال رمز التحقق", "OTP Sent"),
          description: t("تحقق من بريدك الإلكتروني للحصول على الرمز المكون من 6 أرقام.", "Check your email for the 6-digit code."),
        });
      } else {
        toast({
          title: t("خطأ", "Error"),
          description: data.message || t("فشل إرسال رمز التحقق.", "Failed to send OTP."),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل إرسال رمز التحقق.", "Failed to send OTP."),
        variant: "destructive",
      });
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) {
      toast({
        title: t("رمز غير صحيح", "Invalid code"),
        description: t("يرجى إدخال الرمز المكون من 6 أرقام.", "Please enter the 6-digit code."),
        variant: "destructive",
      });
      return;
    }

    setOtpVerifying(true);
    try {
      const email = form.getValues("email");
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setOtpVerified(true);
        setCustomToken(data.customToken);
        setFirebaseUid(data.uid);
        toast({
          title: t("تم التحقق", "Verified"),
          description: t("تم التحقق من البريد الإلكتروني بنجاح.", "Email verified successfully."),
        });
      } else {
        let description = data.message || t("الرمز غير صحيح. حاول مرة أخرى.", "Invalid code. Try again.");
        if (data.errorCode === "OTP_EXPIRED") {
          description = t("انتهت صلاحية الرمز. يرجى طلب رمز جديد.", "OTP expired. Please request a new one.");
        } else if (data.errorCode === "INVALID_CODE") {
          description = t("الرمز غير صحيح. حاول مرة أخرى.", "Invalid code. Try again.");
        } else if (data.errorCode === "TOO_MANY_ATTEMPTS") {
          description = t("محاولات كثيرة. يرجى طلب رمز جديد.", "Too many attempts. Please request a new OTP.");
        }
        toast({
          title: t("خطأ في التحقق", "Verification Error"),
          description,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل التحقق.", "Verification failed."),
        variant: "destructive",
      });
    } finally {
      setOtpVerifying(false);
    }
  }

  async function onSubmit(data: RegisterFormData) {
    if (platformTermsEnabled && !platformTermsAccepted) {
      toast({
        title: t("مطلوب", "Required"),
        description: t("يجب الموافقة على شروط وأحكام المنصة وسياسة الخصوصية", "You must accept the platform terms and privacy policy"),
        variant: "destructive",
      });
      return;
    }
    if (!logoFile) {
      toast({
        title: t("الشعار مطلوب", "Logo required"),
        description: t("يرجى رفع شعار المتجر.", "Please upload your store logo."),
        variant: "destructive",
      });
      return;
    }
    if (!crFile) {
      toast({
        title: t("السجل التجاري مطلوب", "Commercial Register required"),
        description: t("يرجى رفع نسخة PDF من السجل التجاري.", "Please upload a PDF copy of the commercial register."),
        variant: "destructive",
      });
      return;
    }
    if (!otpVerified || !customToken || !firebaseUid) {
      toast({
        title: t("التحقق من البريد مطلوب", "Email verification required"),
        description: t("يرجى التحقق من بريدك الإلكتروني أولاً.", "Please verify your email first."),
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      login(firebaseUid, data.email.toLowerCase().trim());

      let logoUrl = "";
      try {
        if (logoFile) logoUrl = await uploadLogo(logoFile);
      } catch (uploadError) {
        console.error("Logo upload error:", uploadError);
      }

      let commercialRegisterURL = "";
      try {
        if (crFile) commercialRegisterURL = await uploadCr(crFile);
      } catch (crUploadError) {
        console.error("CR upload error:", crUploadError);
        toast({
          title: t("خطأ في رفع السجل التجاري", "CR Upload Error"),
          description: t("فشل رفع السجل التجاري. يرجى المحاولة مرة أخرى.", "Failed to upload commercial register. Please try again."),
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const merchantData = {
        id: firebaseUid,
        uid: firebaseUid,
        storeName: data.storeName,
        businessType: data.businessType,
        email: data.email,
        logoUrl,
        commercialRegisterURL,
        googleMapsReviewUrl: data.googleMapsReviewUrl,
        status: "pending",
        subscriptionStatus: "pending",
        plan: "trial",
        createdAt: new Date().toISOString(),
      };

      try {
        await signInWithCustomToken(auth, customToken);
      } catch (authError: any) {
        void authError;
      }

      try {
        await setDoc(doc(db, "merchants", firebaseUid), merchantData);
      } catch (firestoreError: any) {
        console.error("Firestore write error:", firestoreError.code, firestoreError.message);
        try {
          const res = await fetch("/api/register-merchant", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${customToken}`,
            },
            body: JSON.stringify(merchantData),
          });
          if (!res.ok) {
            throw new Error("Server registration failed");
          }
        } catch (serverError) {
          console.error("Server registration fallback error:", serverError);
          toast({
            title: t("خطأ في حفظ البيانات", "Data Save Error"),
            description: t(
              "تم إنشاء الحساب لكن فشل حفظ بيانات المتجر. يرجى التواصل مع الدعم.",
              "Account created but store data save failed. Please contact support."
            ),
            variant: "destructive",
          });
          return;
        }
      }

      setRegistrationComplete(true);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: t("خطأ في التسجيل", "Registration Error"),
        description: t("فشل التسجيل. يرجى المحاولة مرة أخرى.", "Registration failed. Please try again."),
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
              <Button onClick={() => setLocation("/pending")} className="h-12 font-bold" data-testid="button-go-to-pending">
                {t("حالة الطلب", "Check Status")}
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

          <div className="flex items-center justify-center mb-4">
            <img src={neonBellLogo} alt="Digital Pager" className="h-[60px] w-auto object-contain" style={{ mixBlendMode: "screen" }} />
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">{t("البريد الإلكتروني", "Email")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="you@store.com"
                              className="pr-10 h-12 bg-background border-border text-foreground"
                              dir="ltr"
                              data-testid="input-email"
                              disabled={otpVerified}
                              {...field}
                            />
                            {otpVerified && (
                              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                        {!otpVerified && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSendOtp}
                            disabled={otpSending || otpVerified || cooldown > 0}
                            className="mt-2 h-8 text-xs border-primary/30 hover:border-primary/60"
                            data-testid="button-send-otp"
                          >
                            {otpSending ? (
                              <><Loader2 className="w-3 h-3 me-1 animate-spin" />{t("جاري الإرسال...", "Sending...")}</>
                            ) : cooldown > 0 ? (
                              t(`إعادة الإرسال بعد ${cooldown} ث`, `Resend in ${cooldown}s`)
                            ) : otpSent ? (
                              t("إعادة إرسال الرمز", "Resend Code")
                            ) : (
                              t("إرسال رمز التحقق", "Send Verification Code")
                            )}
                          </Button>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                {otpSent && !otpVerified && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("أدخل الرمز المكون من 6 أرقام الذي تم إرساله إلى بريدك الإلكتروني", "Enter the 6-digit code sent to your email")}
                    </p>
                    <div className="flex gap-3 items-center">
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="h-12 text-center text-2xl tracking-[0.5em] font-mono bg-background border-border max-w-[200px]"
                        dir="ltr"
                        data-testid="input-otp-code"
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpVerifying || otpCode.length !== 6}
                        className="h-12"
                        data-testid="button-verify-otp"
                      >
                        {otpVerifying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <><KeyRound className="w-4 h-4 me-1" />{t("تحقق", "Verify")}</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {otpVerified && (
                  <div className="flex items-center gap-2 text-green-500 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <ShieldCheck className="w-4 h-4" />
                    {t("تم التحقق من البريد الإلكتروني بنجاح", "Email verified successfully")}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="googleMapsReviewUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">{t("رابط جوجل ماب للتقييم", "Google Maps Review Link")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="url"
                            placeholder="https://maps.google.com/..."
                            className="pr-10 h-12 bg-background border-border text-foreground"
                            dir="ltr"
                            data-testid="input-google-maps-url"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t("السجل التجاري (PDF)", "Commercial Register (PDF)")}</label>
                  <div
                    onClick={() => crInputRef.current?.click()}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 cursor-pointer transition-colors bg-background"
                    data-testid="button-upload-cr"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {crFile ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground truncate" data-testid="text-cr-filename">{crFile.name}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCrFile(null); if (crInputRef.current) crInputRef.current.value = ""; }}
                            className="text-muted-foreground hover:text-destructive flex-shrink-0"
                            data-testid="button-remove-cr"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">{t("اضغط لرفع السجل التجاري", "Click to upload commercial register")}</p>
                          <p className="text-xs text-muted-foreground/60">{t("PDF حتى 10 ميجابايت", "PDF up to 10MB")}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <input ref={crInputRef} type="file" accept="application/pdf" onChange={handleCrChange} className="hidden" data-testid="input-cr-file" />
                </div>

                {platformTermsEnabled && (
                  <label className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-border/30 cursor-pointer" dir="rtl" data-testid="label-platform-terms">
                    <input
                      type="checkbox"
                      checked={platformTermsAccepted}
                      onChange={(e) => setPlatformTermsAccepted(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-primary/50 text-primary focus:ring-primary bg-transparent accent-primary flex-shrink-0"
                      data-testid="checkbox-platform-terms"
                    />
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      <span>{t("أوافق على ", "I agree to the ")}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTermsModal("terms"); }}
                        className="text-primary font-medium hover:underline"
                        data-testid="link-platform-terms"
                      >
                        {t("شروط وأحكام المنصة", "Platform Terms & Conditions")}
                      </button>
                      <span>{t(" و", " and ")}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTermsModal("privacy"); }}
                        className="text-primary font-medium hover:underline"
                        data-testid="link-platform-privacy"
                      >
                        {t("سياسة الخصوصية", "Privacy Policy")}
                      </button>
                    </div>
                  </label>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-bold"
                  disabled={isSubmitting || !otpVerified || (platformTermsEnabled && !platformTermsAccepted)}
                  data-testid="button-register-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      {t("جاري التسجيل...", "Registering...")}
                    </>
                  ) : (
                    t("تسجيل المتجر", "Register Store")
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {t("لديك حساب بالفعل؟", "Already have an account?")}{" "}
                  <button
                    type="button"
                    onClick={() => setLocation("/login")}
                    className="text-primary font-medium hover:underline"
                    data-testid="link-to-login"
                  >
                    {t("تسجيل الدخول", "Sign In")}
                  </button>
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {showTermsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" data-testid="modal-platform-legal">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTermsModal(null)} />
          <div className="relative w-full max-w-lg max-h-[80dvh] bg-background border border-border rounded-2xl flex flex-col overflow-hidden mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h3 className="font-bold text-base" dir="rtl" data-testid="modal-legal-title">
                {showTermsModal === "terms"
                  ? t("شروط وأحكام المنصة", "Platform Terms & Conditions")
                  : t("سياسة الخصوصية للمنصة", "Platform Privacy Policy")
                }
              </h3>
              <button onClick={() => setShowTermsModal(null)} className="p-1 text-muted-foreground hover:text-foreground" data-testid="button-close-legal-modal">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" dir="rtl" data-testid="text-legal-content">
                {showTermsModal === "terms" ? platformTermsText : platformPrivacyText}
              </div>
            </div>
            <div className="p-4 border-t border-border/30">
              <Button onClick={() => setShowTermsModal(null)} className="w-full h-12" data-testid="button-close-legal">
                {t("إغلاق", "Close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
