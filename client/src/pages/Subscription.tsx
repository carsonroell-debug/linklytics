import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, Zap, Loader2 } from "lucide-react";
import { useState } from "react";

export default function Subscription() {
  const { data: subscriptionStatus, isLoading } = trpc.subscription.getStatus.useQuery();
  const createCheckoutMutation = trpc.subscription.createCheckout.useMutation();
  const createPortalMutation = trpc.subscription.createPortal.useMutation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      const { checkoutUrl } = await createCheckoutMutation.mutateAsync({
        origin: window.location.origin,
      });
      
      if (checkoutUrl) {
        toast.info("Redirecting to checkout...");
        window.open(checkoutUrl, "_blank");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create checkout session");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsProcessing(true);
    try {
      const { portalUrl } = await createPortalMutation.mutateAsync({
        origin: window.location.origin,
      });
      
      if (portalUrl) {
        toast.info("Redirecting to customer portal...");
        window.open(portalUrl, "_blank");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to open customer portal");
    } finally {
      setIsProcessing(false);
    }
  };

  const freeFeatures = [
    "Up to 5 short links",
    "Basic analytics",
    "QR code generation",
    "Password protection",
    "Link expiration dates",
  ];

  const proFeatures = [
    "Unlimited short links",
    "Advanced analytics with charts",
    "Geographic heatmaps",
    "Device & browser tracking",
    "AI-powered insights",
    "Optimal posting time suggestions",
    "API access for automation",
    "Priority support",
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const isPro = subscriptionStatus?.tier === "paid";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and billing
          </p>
        </div>

        {/* Current Plan */}
        {isPro && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Current Plan: Pro
              </CardTitle>
              <CardDescription>
                You're on the Pro plan with unlimited access to all features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleManageSubscription} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Manage Subscription"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <Card className={!isPro ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              {!isPro && (
                <div className="pt-4">
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={isPro ? "border-primary" : "border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5"}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Pro
                </CardTitle>
                {!isPro && (
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full">
                    POPULAR
                  </span>
                )}
              </div>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$9</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4">
                {isPro ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleUpgrade}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Upgrade to Pro
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens to my links if I downgrade?</h3>
              <p className="text-sm text-muted-foreground">
                Your existing links will continue to work, but you won't be able to create new ones if you exceed the free tier limit of 5 links.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-sm text-muted-foreground">
                We offer a 7-day money-back guarantee. If you're not satisfied, contact support for a full refund.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
