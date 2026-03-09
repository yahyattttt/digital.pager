import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Users, Zap, Shield, ArrowRight, Star } from "lucide-react";

const features = [
  {
    icon: Bell,
    title: "Instant Notifications",
    description: "Page your guests via SMS or push notification when their table is ready.",
  },
  {
    icon: Users,
    title: "Smart Waitlist",
    description: "Manage your queue efficiently with real-time updates and estimated wait times.",
  },
  {
    icon: Zap,
    title: "Quick Setup",
    description: "Get started in minutes. No hardware needed — just your phone or tablet.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Security",
    description: "Your data is fully isolated. Each restaurant gets its own secure workspace.",
  },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <nav className="relative z-10 border-b border-border/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight" data-testid="text-brand-name">
              Digital Pager
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/login")}
              data-testid="button-nav-login"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation("/register")}
              data-testid="button-nav-register"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Star className="w-3.5 h-3.5" />
            The Modern Waitlist Solution
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight"
            data-testid="text-hero-title"
          >
            Ditch the Buzzer.
            <br />
            <span className="text-primary">Go Digital.</span>
          </h1>

          <p
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            data-testid="text-hero-subtitle"
          >
            Digital Pager replaces outdated pager systems with a sleek, modern solution. Notify guests instantly, manage your waitlist in real-time, and deliver a premium dining experience.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Button
              size="lg"
              onClick={() => setLocation("/register")}
              data-testid="button-hero-register"
            >
              Register Your Restaurant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/login")}
              data-testid="button-hero-login"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border/30 hover-elevate"
            >
              <CardContent className="pt-6 pb-6">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3
                  className="font-semibold mb-2"
                  data-testid={`text-feature-title-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4" data-testid="text-cta-title">
            Ready to Modernize Your Waitlist?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join hundreds of restaurants that trust Digital Pager to deliver a seamless guest experience.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/register")}
            data-testid="button-cta-register"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4 flex-wrap text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Bell className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-medium">Digital Pager</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Digital Pager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
