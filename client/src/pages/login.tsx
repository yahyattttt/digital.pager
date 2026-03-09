import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { z } from "zod";
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
import { Mail, Lock, Loader2, ArrowRight, ArrowLeft, Globe } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, toggleLanguage, isRTL } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  async function onSubmit(data: LoginFormData) {
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const merchantDoc = await getDoc(
        doc(db, "merchants", userCredential.user.uid)
      );

      if (!merchantDoc.exists()) {
        toast({
          title: t("الحساب غير موجود", "Account not found"),
          description: t(
            "لم يتم العثور على حساب متجر مرتبط بهذا البريد الإلكتروني.",
            "No store account found for this email."
          ),
          variant: "destructive",
        });
        return;
      }

      const merchant = merchantDoc.data();

      if (merchant.status === "pending") {
        setLocation("/pending");
        return;
      }

      if (merchant.status === "rejected") {
        toast({
          title: t("تم رفض الحساب", "Account Rejected"),
          description: t(
            "تم رفض تسجيل متجرك. يرجى التواصل مع الدعم الفني.",
            "Your store registration was rejected. Please contact support."
          ),
          variant: "destructive",
        });
        return;
      }

      setLocation("/dashboard");
    } catch (error: any) {
      let message = t(
        "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.",
        "Login failed. Please try again."
      );
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        message = t(
          "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
          "Invalid email or password."
        );
      }
      toast({
        title: t("خطأ في تسجيل الدخول", "Login Error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setLocation("/")}
              className="inline-flex items-center gap-2 text-muted-foreground text-sm hover-elevate px-3 py-1.5 rounded-md"
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

        <Card className="border-primary/10">
          <CardContent className="pt-6 pb-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("البريد الإلكتروني", "Email")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="you@store.com"
                            className="pr-10"
                            dir="ltr"
                            data-testid="input-email"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("كلمة المرور", "Password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder={t("أدخل كلمة المرور", "Enter password")}
                            className="pr-10"
                            dir="ltr"
                            data-testid="input-password"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-login-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      {t("جاري تسجيل الدخول...", "Signing in...")}
                    </>
                  ) : (
                    t("تسجيل الدخول", "Sign In")
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {t("ليس لديك حساب؟", "Don't have an account?")}{" "}
                  <button
                    type="button"
                    onClick={() => setLocation("/register")}
                    className="text-primary font-medium"
                    data-testid="link-to-register"
                  >
                    {t("سجل متجرك", "Register")}
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
