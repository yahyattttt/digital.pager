import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, useAuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import RegisterPage from "@/pages/register";
import LoginPage from "@/pages/login";
import PendingPage from "@/pages/pending";
import DashboardPage from "@/pages/dashboard";

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

  if (merchant.status === "rejected") {
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

  if (user && merchant) {
    if (merchant.status === "approved") {
      return <Redirect to="/dashboard" />;
    }
    return <Redirect to="/pending" />;
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const authValue = useAuthProvider();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContext.Provider value={authValue}>
          <Toaster />
          <Router />
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
