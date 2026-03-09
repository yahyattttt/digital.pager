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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

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
          title: "الحساب غير موجود",
          description: "لم يتم العثور على حساب متجر مرتبط بهذا البريد الإلكتروني.",
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
          title: "تم رفض الحساب",
          description: "تم رفض تسجيل متجرك. يرجى التواصل مع الدعم الفني.",
          variant: "destructive",
        });
        return;
      }

      setLocation("/dashboard");
    } catch (error: any) {
      let message = "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.";
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        message = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      }
      toast({
        title: "خطأ في تسجيل الدخول",
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
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-2 text-muted-foreground text-sm mb-6 hover-elevate px-3 py-1.5 rounded-md"
            data-testid="link-back-home"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </button>
          <h1
            className="text-3xl font-bold tracking-tight"
            data-testid="text-login-title"
          >
            مرحباً بعودتك
          </h1>
          <p className="text-muted-foreground mt-2">
            سجل دخولك إلى لوحة تحكم{" "}
            <span className="text-primary font-semibold">Digital Pager</span>
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
                      <FormLabel>البريد الإلكتروني</FormLabel>
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
                      <FormLabel>كلمة المرور</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="أدخل كلمة المرور"
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
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    "تسجيل الدخول"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  ليس لديك حساب؟{" "}
                  <button
                    type="button"
                    onClick={() => setLocation("/register")}
                    className="text-primary font-medium"
                    data-testid="link-to-register"
                  >
                    سجل متجرك
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
