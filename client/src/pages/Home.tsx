import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link2, BarChart3, Zap, QrCode, Lock, Calendar, TrendingUp, Globe } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Link2,
      title: "Custom Short Links",
      description: "Create memorable, branded short links with custom slugs",
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Track clicks, locations, devices, and browsers in real-time",
    },
    {
      icon: Globe,
      title: "Geographic Heatmaps",
      description: "Visualize where your audience is clicking from around the world",
    },
    {
      icon: Zap,
      title: "AI-Powered Insights",
      description: "Get intelligent recommendations on optimal posting times",
    },
    {
      icon: QrCode,
      title: "QR Code Generation",
      description: "Instantly generate QR codes for any short link",
    },
    {
      icon: Lock,
      title: "Password Protection",
      description: "Secure your links with optional password protection",
    },
    {
      icon: Calendar,
      title: "Link Expiration",
      description: "Set expiration dates for time-sensitive campaigns",
    },
    {
      icon: TrendingUp,
      title: "API Access",
      description: "Automate link creation and analytics with our REST API",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Zap className="h-6 w-6 text-primary" />
            Linklytics
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button onClick={() => setLocation("/dashboard")}>
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => window.location.href = getLoginUrl()}>
                  Sign In
                </Button>
                <Button onClick={() => window.location.href = getLoginUrl()}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
            Smart Link Shortener with{" "}
            <span className="text-primary">Powerful Analytics</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Create branded short links, track performance in real-time, and get AI-powered insights to optimize your marketing campaigns.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => window.location.href = getLoginUrl()}>
              <Zap className="mr-2 h-5 w-5" />
              Start Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/subscription")}>
              View Pricing
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Free tier includes 5 links • No credit card required
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-24 bg-background">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Everything you need to manage your links
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From basic link shortening to advanced analytics and AI insights, we've got you covered.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex flex-col items-start p-6 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="mx-auto max-w-3xl text-center bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl p-12 border border-primary/20">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Ready to optimize your links?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of marketers and businesses using Linklytics to track and optimize their campaigns.
          </p>
          <Button size="lg" onClick={() => window.location.href = getLoginUrl()}>
            <Zap className="mr-2 h-5 w-5" />
            Get Started for Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="container py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <Zap className="h-5 w-5 text-primary" />
              Linklytics
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Linklytics. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
