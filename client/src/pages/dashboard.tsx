import { useLocation } from "wouter";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { businessTypeLabels } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Store, Users, Bell, Settings } from "lucide-react";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { merchant, loading } = useAuth();

  async function handleSignOut() {
    await signOut(auth);
    setLocation("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!merchant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {merchant.logoUrl ? (
              <img
                src={merchant.logoUrl}
                alt="الشعار"
                className="w-10 h-10 rounded-full object-cover border border-border"
                data-testid="img-dashboard-logo"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg" data-testid="text-dashboard-store">
                {merchant.storeName}
              </h1>
              <p className="text-xs text-muted-foreground">
                {businessTypeLabels[merchant.businessType] || merchant.businessType} - {merchant.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" data-testid="badge-status-approved">
              مفعّل
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              data-testid="button-sign-out"
            >
              <LogOut className="w-4 h-4 me-2" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6" data-testid="text-dashboard-title">
          لوحة التحكم
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover-elevate border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-waitlist-count">0</p>
                  <p className="text-sm text-muted-foreground">قائمة الانتظار الحالية</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-paged-count">0</p>
                  <p className="text-sm text-muted-foreground">تم تنبيههم اليوم</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-settings-label">إعداد</p>
                  <p className="text-sm text-muted-foreground">إعدادات البيجر</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 border-border/50">
          <CardHeader>
            <h3 className="text-lg font-semibold">مرحباً بك في Digital Pager</h3>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground" data-testid="text-welcome-message">
              متجرك مفعّل وجاهز لاستخدام نظام البيجر الرقمي. ابدأ بإدارة قائمة الانتظار، وأشعر عملاءك، وسهّل عملية الاستقبال.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
