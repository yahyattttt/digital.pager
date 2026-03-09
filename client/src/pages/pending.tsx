import { useLocation } from "wouter";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LogOut, Mail } from "lucide-react";

export default function PendingPage() {
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative border-yellow-500/20">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
            <Clock className="w-10 h-10 text-yellow-500" data-testid="icon-pending" />
          </div>

          <h2 className="text-2xl font-bold mb-3" data-testid="text-pending-title">
            Pending Approval
          </h2>

          {merchant && (
            <div className="mb-4 p-3 rounded-md bg-muted/50">
              <p className="text-sm font-medium" data-testid="text-restaurant-name">
                {merchant.restaurantName}
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Mail className="w-3 h-3" />
                {merchant.email}
              </p>
            </div>
          )}

          <p className="text-muted-foreground text-sm mb-6" data-testid="text-pending-message">
            Your restaurant registration is currently under review. Our admin team will verify your details and approve your account shortly. You'll receive access to the dashboard once approved.
          </p>

          <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-md bg-primary/5 border border-primary/10">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">Status: <span className="text-yellow-500 font-semibold">Pending Review</span></span>
          </div>

          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full"
            data-testid="button-sign-out"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
