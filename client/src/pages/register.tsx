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
import { Upload, Store, User, Mail, Lock, MapPin, Loader2, CheckCircle, ArrowRight, Briefcase } from "lucide-react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "الملف كبير جداً",
          description: "يجب أن يكون حجم الشعار أقل من 5 ميجابايت",
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function uploadLogo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("logo", file);
    const res = await fetch("/api/upload-logo", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("فشل رفع الشعار");
    const data = await res.json();
    return data.url;
  }

  async function onSubmit(data: RegisterFormData) {
    if (!logoFile) {
      toast({
        title: "الشعار مطلوب",
        description: "يرجى رفع شعار المتجر.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      await sendEmailVerification(userCredential.user);

      let logoUrl = "";
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

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
        createdAt: new Date().toISOString(),
      });

      setRegistrationComplete(true);
    } catch (error: any) {
      let message = "فشل التسجيل. يرجى المحاولة مرة أخرى.";
      if (error.code === "auth/email-already-in-use") {
        message = "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.";
      } else if (error.code === "auth/weak-password") {
        message = "كلمة المرور ضعيفة. يرجى استخدام 6 أحرف على الأقل.";
      } else if (error.code === "auth/invalid-email") {
        message = "البريد الإلكتروني غير صالح.";
      }
      toast({
        title: "خطأ في التسجيل",
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

        <Card className="w-full max-w-md relative border-primary/20">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-primary" data-testid="icon-success" />
            </div>
            <h2 className="text-2xl font-bold mb-3" data-testid="text-success-title">
              تم استلام طلبك بنجاح
            </h2>
            <p className="text-muted-foreground text-sm mb-6" data-testid="text-success-message">
              تم استلام طلبك بنجاح. سيقوم فريق الإدارة بمراجعته وتفعيل حسابك قريباً.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setLocation("/login")}
                data-testid="button-go-to-login"
              >
                تسجيل الدخول
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                data-testid="button-back-home"
              >
                العودة للرئيسية
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        <div className="mb-8 text-center">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-2 text-muted-foreground text-sm mb-6 hover-elevate px-3 py-1.5 rounded-md"
            data-testid="link-back-home"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </button>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-register-title">
            سجل متجرك
          </h1>
          <p className="text-muted-foreground mt-2">
            انضم إلى <span className="text-primary font-semibold">Digital Pager</span> وطوّر نظام الانتظار لديك
          </p>
        </div>

        <Card className="border-primary/10">
          <CardContent className="pt-6 pb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="flex flex-col items-center mb-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden transition-colors relative group"
                    data-testid="button-upload-logo"
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="معاينة الشعار"
                        className="w-full h-full object-cover"
                        data-testid="img-logo-preview"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-[10px]">رفع الشعار</span>
                      </div>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    data-testid="input-logo-file"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {logoFile ? logoFile.name : "PNG, JPG حتى 5 ميجابايت"}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المتجر</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="اسم المتجر"
                            className="pr-10"
                            data-testid="input-store-name"
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
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع النشاط</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-business-type">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-muted-foreground" />
                              <SelectValue placeholder="اختر نوع النشاط" />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="restaurant" data-testid="option-restaurant">مطعم</SelectItem>
                          <SelectItem value="cafe" data-testid="option-cafe">مقهى</SelectItem>
                          <SelectItem value="clinic" data-testid="option-clinic">عيادة</SelectItem>
                          <SelectItem value="other" data-testid="option-other">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المالك</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="الاسم الكامل"
                            className="pr-10"
                            data-testid="input-owner-name"
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
                            placeholder="6 أحرف على الأقل"
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

                <FormField
                  control={form.control}
                  name="googleMapsReviewUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رابط تقييم جوجل ماب</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="https://maps.google.com/..."
                            className="pr-10"
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-register-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      جاري إنشاء الحساب...
                    </>
                  ) : (
                    "سجل متجرك الآن"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  لديك حساب بالفعل؟{" "}
                  <button
                    type="button"
                    onClick={() => setLocation("/login")}
                    className="text-primary font-medium"
                    data-testid="link-to-login"
                  >
                    تسجيل الدخول
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
