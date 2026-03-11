import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, useAuthProvider, useAuth } from "@/hooks/use-auth";
import { LanguageContext, useLanguageProvider } from "@/hooks/use-language";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import RegisterPage from "@/pages/register";
import LoginPage from "@/pages/login";
import PendingPage from "@/pages/pending";
import DashboardPage from "@/pages/dashboard";
import SuperAdminPage from "@/pages/super-admin";
import PublicMenuPage from "@/pages/public-menu";
import OrderTrackingPage from "@/pages/order-tracking";
import OrderReceiptPage from "@/pages/order-receipt";
import DriverControlPage from "@/pages/driver-control";

const SUPER_ADMIN_EMAIL = "yahiatohary@hotmail.com";

function SuperAdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    return <Redirect to="/" />;
  }

  return <SuperAdminPage />;
}

function ProtectedRoute({ component: Component }: { component: () => JSX.Element | null }) {
  const { user, merchant, loading } = useAuth();
  const [merchantTimeout, setMerchantTimeout] = useState(false);

  useEffect(() => {
    if (user && !merchant && !loading) {
      console.log("[ProtectedRoute] User exists but no merchant data, starting 5s timeout");
      const timer = setTimeout(() => setMerchantTimeout(true), 5000);
      return () => clearTimeout(timer);
    }
    setMerchantTimeout(false);
  }, [user, merchant, loading]);

  console.log("[ProtectedRoute] State:", { loading, hasUser: !!user, hasMerchant: !!merchant, merchantTimeout, status: merchant?.status });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    console.log("[ProtectedRoute] No user → redirecting to /login");
    return <Redirect to="/login" />;
  }

  if (!merchant && !merchantTimeout) {
    console.log("[ProtectedRoute] Waiting for merchant data...");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!merchant && merchantTimeout) {
    console.log("[ProtectedRoute] Merchant timeout → redirecting to /pending");
    return <Redirect to="/pending" />;
  }

  if (merchant?.status === "rejected" || merchant?.status === "suspended") {
    console.log("[ProtectedRoute] Merchant status:", merchant.status, "→ redirecting to /login");
    return <Redirect to="/login" />;
  }

  console.log("[ProtectedRoute] Rendering dashboard, merchant status:", merchant?.status, "subscription:", merchant?.subscriptionStatus);
  return <Component />;
}

function PendingRoute() {
  const { user, merchant, loading } = useAuth();
  const [pendingTimeout, setPendingTimeout] = useState(false);

  useEffect(() => {
    if (user && !merchant && !loading) {
      const timer = setTimeout(() => setPendingTimeout(true), 5000);
      return () => clearTimeout(timer);
    }
    setPendingTimeout(false);
  }, [user, merchant, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!merchant && !pendingTimeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (merchant && (merchant.status === "approved" || merchant.status === "pending")) {
    return <Redirect to="/dashboard" />;
  }

  return <PendingPage />;
}

function GuestRoute({ component: Component }: { component: () => JSX.Element | null }) {
  const { user, merchant, loading } = useAuth();
  const [guestTimeout, setGuestTimeout] = useState(false);

  useEffect(() => {
    if (user && !merchant && !loading) {
      console.log("[GuestRoute] User exists but no merchant, starting 5s timeout");
      const timer = setTimeout(() => setGuestTimeout(true), 5000);
      return () => clearTimeout(timer);
    }
    setGuestTimeout(false);
  }, [user, merchant, loading]);

  console.log("[GuestRoute] State:", { loading, hasUser: !!user, hasMerchant: !!merchant, guestTimeout, status: merchant?.status });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    if (user.email === SUPER_ADMIN_EMAIL) {
      console.log("[GuestRoute] Admin user → redirecting to /super-admin");
      return <Redirect to="/super-admin" />;
    }
    if (!merchant && !guestTimeout) {
      console.log("[GuestRoute] Waiting for merchant data...");
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    if (merchant && (merchant.status === "approved" || merchant.status === "pending")) {
      console.log("[GuestRoute] Merchant found, status:", merchant.status, "→ redirecting to /dashboard");
      return <Redirect to="/dashboard" />;
    }
    console.log("[GuestRoute] User has no merchant or merchant status prevents redirect, showing guest component");
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/register">
        <GuestRoute component={RegisterPage} />
      </Route>
      <Route path="/login">
        <GuestRoute component={LoginPage} />
      </Route>
      <Route path="/pending">
        <PendingRoute />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/super-admin">
        <SuperAdminRoute />
      </Route>
      <Route path="/menu/:merchantId" component={PublicMenuPage} />
      <Route path="/track/:orderId" component={OrderTrackingPage} />
      <Route path="/receipt/:orderId" component={OrderReceiptPage} />
      <Route path="/driver-control/:orderId" component={DriverControlPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const authValue = useAuthProvider();
  const langValue = useLanguageProvider();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageContext.Provider value={langValue}>
          <AuthContext.Provider value={authValue}>
            <Toaster />
            <Router />
          </AuthContext.Provider>
        </LanguageContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
