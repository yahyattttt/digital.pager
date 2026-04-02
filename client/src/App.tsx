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
import StorePagerPage from "@/pages/store-pager";
import PublicMenuPage from "@/pages/public-menu";
import OrderTrackingPage from "@/pages/order-tracking";
import OrderReceiptPage from "@/pages/order-receipt";
import DriverControlPage from "@/pages/driver-control";
import DigitalPagerPage from "@/pages/digital-pager";
import DeliveryTrackerPage from "@/pages/delivery-tracker";
import CheckOrderPage from "@/pages/check-order";
import OrderCompletedPage from "@/pages/order-completed";
import OnlineOrderPage from "@/pages/online-order";
import PlatformTermsPage from "@/pages/platform-terms";
import PlatformPrivacyPage from "@/pages/platform-privacy";
import FloatingWhatsApp from "@/components/floating-whatsapp";

function SuperAdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return <Redirect to="/" />;
  }

  return <SuperAdminPage />;
}

function ProtectedRoute({ component: Component }: { component: () => JSX.Element | null }) {
  const { user, merchant, loading } = useAuth();
  const [merchantTimeout, setMerchantTimeout] = useState(false);

  useEffect(() => {
    if (user && !merchant && !loading) {
      const timer = setTimeout(() => setMerchantTimeout(true), 5000);
      return () => clearTimeout(timer);
    }
    setMerchantTimeout(false);
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

  if (!merchant && !merchantTimeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!merchant && merchantTimeout) {
    return <Redirect to="/pending" />;
  }

  if (merchant?.status === "rejected" || merchant?.status === "suspended") {
    return <Redirect to="/login" />;
  }

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
      const timer = setTimeout(() => setGuestTimeout(true), 5000);
      return () => clearTimeout(timer);
    }
    setGuestTimeout(false);
  }, [user, merchant, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    if (user.isAdmin) {
      return <Redirect to="/super-admin" />;
    }
    if (!merchant && !guestTimeout) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    if (merchant && (merchant.status === "approved" || merchant.status === "pending")) {
      return <Redirect to="/dashboard" />;
    }
  }

  return <Component />;
}

function Router() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "share_moment") {
      const merchantId = params.get("m") || "";
      if (merchantId) {
        const key = `share_view_tracked_${merchantId}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          console.log("Viral Visit Detected!");
          fetch(`/api/track/sharedlinkview/${merchantId}`, { method: "POST" }).catch(() => {});
        }
      }
    }
  }, []);

  return (
    <>
    <FloatingWhatsApp />
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
      <Route path="/s/:storeId" component={StorePagerPage} />
      <Route path="/menu/:merchantId" component={PublicMenuPage} />
      <Route path="/track/:orderId" component={OrderTrackingPage} />
      <Route path="/receipt/:orderId" component={OrderReceiptPage} />
      <Route path="/driver-control/:orderId" component={DriverControlPage} />
      <Route path="/digital-pager/:orderId" component={DigitalPagerPage} />
      <Route path="/delivery-tracker/:orderId" component={DeliveryTrackerPage} />
      <Route path="/check-order/:merchantId" component={CheckOrderPage} />
      <Route path="/order-completed/:merchantId" component={OrderCompletedPage} />
      <Route path="/online-order/:slug" component={OnlineOrderPage} />
      <Route path="/platform-terms" component={PlatformTermsPage} />
      <Route path="/platform-privacy" component={PlatformPrivacyPage} />
      <Route component={NotFound} />
    </Switch>
    </>
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
