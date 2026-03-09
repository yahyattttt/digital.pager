import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { registerFormSchema, type RegisterFormData } from "@shared/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Upload, Store, User, Mail, Lock, MapPin, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

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
      restaurantName: "",
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
          title: "File too large",
          description: "Logo must be under 5MB",
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
    if (!res.ok) throw new Error("Failed to upload logo");
    const data = await res.json();
    return data.url;
  }

  async function onSubmit(data: RegisterFormData) {
    if (!logoFile) {
      toast({
        title: "Logo Required",
        description: "Please upload your restaurant logo.",
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
        restaurantName: data.restaurantName,
        ownerName: data.ownerName,
        email: data.email,
        logoUrl,
        googleMapsReviewUrl: data.googleMapsReviewUrl || "",
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setRegistrationComplete(true);
    } catch (error: any) {
      let message = "Registration failed. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        message = "This email is already registered. Please log in instead.";
      } else if (error.code === "auth/weak-password") {
        message = "Password is too weak. Please use at least 6 characters.";
      } else if (error.code === "auth/invalid-email") {
        message = "Invalid email address.";
      }
      toast({
        title: "Registration Error",
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
              Registration Submitted
            </h2>
            <p className="text-muted-foreground mb-2" data-testid="text-success-message">
              Your restaurant has been registered successfully.
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              A verification email has been sent to your inbox. Your account is now
              <span className="text-yellow-500 font-semibold"> pending approval </span>
              by our admin team. You'll be notified once your account is activated.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setLocation("/login")}
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                data-testid="button-back-home"
              >
                Back to Home
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
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-register-title">
            Register Your Restaurant
          </h1>
          <p className="text-muted-foreground mt-2">
            Join <span className="text-primary font-semibold">Digital Pager</span> and modernize your waitlist
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
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                        data-testid="img-logo-preview"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-[10px]">Upload Logo</span>
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
                    {logoFile ? logoFile.name : "PNG, JPG up to 5MB"}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="restaurantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Your Restaurant Name"
                            className="pl-10"
                            data-testid="input-restaurant-name"
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
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Full Name"
                            className="pl-10"
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="you@restaurant.com"
                            className="pl-10"
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Min. 6 characters"
                            className="pl-10"
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
                      <FormLabel>Google Maps Review URL</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="https://maps.google.com/..."
                            className="pl-10"
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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Register Restaurant"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setLocation("/login")}
                    className="text-primary font-medium"
                    data-testid="link-to-login"
                  >
                    Sign in
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
