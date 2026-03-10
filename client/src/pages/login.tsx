import { useState, useRef, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Mail, Loader2, ArrowRight, ArrowLeft, Globe, KeyRound } from "lucide-react";
import neonBellLogo from "@assets/image0_(1)_1773118136698.png";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const { t, toggleLanguage, isRTL } = useLanguage();

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
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

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  async function handleSendOtp() {
    if (cooldown > 0) return;

    const trimmed = email.trim();
    if (!trimmed || !z.string().email().safeParse(trimmed).success) {
      toast({
        title: t("البريد الإلكتروني مطلوب", "Email required"),
        description: t("يرجى إدخال بريد إلكتروني صالح.", "Please enter a valid email address."),
        variant: "destructive",
      });
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
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
      setIsSendingOtp(false);
    }
  }

  async function handleVerifyAndLogin() {
    if (otpCode.length !== 6) {
      toast({
        title: t("رمز غير صحيح", "Invalid code"),
        description: t("يرجى إدخال الرمز المكون من 6 أرقام.", "Please enter the 6-digit code."),
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    console.log("[Login] Verifying OTP for:", email.trim());
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: otpCode }),
      });
      const data = await res.json();
      console.log("[Login] Verify response:", { ok: res.ok, verified: data.verified, uid: data.uid, isNewUser: data.isNewUser, isAdmin: data.isAdmin });

      if (!res.ok || !data.verified) {
        let description = data.message || t("فشل التحقق.", "Verification failed.");
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
        return;
      }

      const emailLower = email.trim().toLowerCase();

      if (emailLower === "yahiatohary@hotmail.com" || data.isAdmin) {
        login(data.uid, emailLower);
        window.location.href = "/super-admin";
        return;
      }

      if (data.isNewUser) {
        toast({
          title: t("حساب جديد", "New Account"),
          description: t("لم يتم العثور على متجر مسجل. يرجى التسجيل أولاً.", "No store found. Please register first."),
          variant: "destructive",
        });
        setLocation("/register");
        return;
      }

      console.log("[Login] Fetching merchant doc for uid:", data.uid);
      const merchantDoc = await getDoc(doc(db, "merchants", data.uid));
      if (!merchantDoc.exists()) {
        console.log("[Login] Merchant doc NOT found, redirecting to register");
        toast({
          title: t("حساب غير مسجل", "Not Registered"),
          description: t("لم يتم العثور على متجر مرتبط بهذا البريد. يرجى التسجيل.", "No store found for this email. Please register."),
          variant: "destructive",
        });
        setLocation("/register");
        return;
      }

      const merchantData = merchantDoc.data();
      console.log("[Login] Merchant doc found:", { status: merchantData.status, subscriptionStatus: merchantData.subscriptionStatus || "none", role: merchantData.role || "none" });
      if (merchantData.status === "rejected") {
        toast({
          title: t("تم رفض الحساب", "Account Rejected"),
          description: t("تم رفض تسجيل متجرك. يرجى التواصل مع الدعم الفني.", "Your store registration was rejected. Please contact support."),
          variant: "destructive",
        });
        return;
      }
      if (merchantData.status === "suspended") {
        toast({
          title: t("الحساب موقوف", "Account Suspended"),
          description: t("تم إيقاف حسابك. يرجى التواصل مع الدعم الفني.", "Your account has been suspended. Please contact support."),
          variant: "destructive",
        });
        return;
      }

      console.log("[Login] Calling login() and navigating to /dashboard");
      login(data.uid, emailLower);
      setLocation("/dashboard");
    } catch (error: any) {
      console.error("[Login] Login error:", error);
      toast({
        title: t("خطأ في تسجيل الدخول", "Login Error"),
        description: error?.message || t("فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.", "Login failed. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
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
            <div className="w-12 h-12 rounded-full bg-black border border-red-500/30 flex items-center justify-center overflow-hidden">
              <img src={neonBellLogo} alt="Digital Pager" className="w-[75%] h-[75%] object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(255, 0, 0, 0.8))" }} />
            </div>
          </div>

          <h1
            className="text-3xl font-bold tracking-tight"
            data-testid="text-login-title"
          >
            {t("مرحباً بعودتك", "Welcome Back")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("سجل دخولك إلى لوحة تحكم", "Sign in to your")}{" "}
            <span className="text-primary font-semibold">Digital Pager</span>{" "}
            {t("", "dashboard")}
          </p>
        </div>

        <Card className="border-primary/10 bg-card">
          <CardContent className="pt-6 pb-6 px-6 sm:px-8">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t("البريد الإلكتروني", "Email")}
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@store.com"
                    className="pr-10 h-12 bg-background border-border text-foreground"
                    dir="ltr"
                    data-testid="input-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={otpSent}
                  />
                </div>
              </div>

              {!otpSent ? (
                <Button
                  type="button"
                  className="w-full h-12 text-base font-bold"
                  disabled={isSendingOtp}
                  onClick={handleSendOtp}
                  data-testid="button-send-otp"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      {t("جاري الإرسال...", "Sending...")}
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 me-2" />
                      {t("إرسال رمز الدخول", "Send Login Code")}
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("أدخل الرمز المكون من 6 أرقام الذي تم إرساله إلى بريدك الإلكتروني", "Enter the 6-digit code sent to your email")}
                    </p>
                    <div className="flex gap-3 items-center justify-center">
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
                        autoFocus
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                        }}
                        className="text-xs text-primary hover:underline"
                        data-testid="button-change-email"
                      >
                        {t("تغيير البريد الإلكتروني", "Change email")}
                      </button>
                      <span className="mx-2 text-muted-foreground">|</span>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || cooldown > 0}
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                        data-testid="button-resend-otp"
                      >
                        {cooldown > 0
                          ? t(`إعادة الإرسال بعد ${cooldown} ث`, `Resend in ${cooldown}s`)
                          : t("إعادة إرسال الرمز", "Resend Code")}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full h-12 text-base font-bold"
                    disabled={isVerifying || otpCode.length !== 6}
                    onClick={handleVerifyAndLogin}
                    data-testid="button-login-submit"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 me-2 animate-spin" />
                        {t("جاري تسجيل الدخول...", "Signing in...")}
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 me-2" />
                        {t("تسجيل الدخول", "Sign In")}
                      </>
                    )}
                  </Button>
                </>
              )}

              <p className="text-center text-sm text-muted-foreground">
                {t("ليس لديك حساب؟", "Don't have an account?")}{" "}
                <button
                  type="button"
                  onClick={() => setLocation("/register")}
                  className="text-primary font-medium hover:underline"
                  data-testid="link-to-register"
                >
                  {t("سجل متجرك", "Register")}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
