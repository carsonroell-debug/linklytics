import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, BarChart3, TrendingUp, Zap, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: overview, isLoading } = trpc.analytics.getOverview.useQuery({ daysAgo: 30 });
  const { data: links } = trpc.links.list.useQuery();
  const { data: subscriptionStatus } = trpc.subscription.getStatus.useQuery();

  const stats = [
    {
      title: "Total Links",
      value: overview?.totalLinks ?? 0,
      limit: overview?.linkLimit,
      icon: Link2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Clicks",
      value: overview?.totalClicks ?? 0,
      icon: BarChart3,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Subscription",
      value: subscriptionStatus?.tier === "paid" ? "Pro" : "Free",
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's an overview of your link performance.
            </p>
          </div>
          <Button onClick={() => setLocation("/links")} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Link
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {isLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`h-10 w-10 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stat.value}
                      {stat.limit && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          / {stat.limit}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Top Performing Links */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Links</CardTitle>
            <CardDescription>Your most clicked links in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : overview?.topLinks && overview.topLinks.length > 0 ? (
              <div className="space-y-4">
                {overview.topLinks.map((item, index) => (
                  <div
                    key={item.link.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.link.title || item.link.slug}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          /{item.link.slug}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">{item.clicks}</span>
                      <span className="text-muted-foreground">clicks</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No data yet</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first link to start tracking clicks
                </p>
                <Button onClick={() => setLocation("/links")} className="mt-4">
                  Create Link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade CTA for free users */}
        {subscriptionStatus?.tier === "free" && (
          <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Upgrade to Pro
              </CardTitle>
              <CardDescription>
                Unlock unlimited links, AI insights, and API access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/subscription")} size="lg">
                View Plans
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
