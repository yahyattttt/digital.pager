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

  if (!merchant || merchant.status === "pending") {
    return <Redirect to="/pending" />;
  }

  if (merchant.status === "rejected" || merchant.status === "suspended") {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function PendingRoute() {
  const { user, merchant, loading } = useAuth();

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

  if (merchant?.status === "approved") {
    return <Redirect to="/dashboard" />;
  }

  if (merchant?.status === "suspended" || merchant?.status === "rejected") {
    return <Redirect to="/login" />;
  }

  return <PendingPage />;
}

function GuestRoute({ component: Component }: { component: () => JSX.Element | null }) {
  const { user, merchant, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    if (user.email === SUPER_ADMIN_EMAIL) {
      return <Redirect to="/super-admin" />;
    }
    if (merchant) {
      if (merchant.status === "approved") {
        return <Redirect to="/dashboard" />;
      }
      return <Redirect to="/pending" />;
    }
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
      <Route path="/s/:storeId" component={StorePagerPage} />
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
