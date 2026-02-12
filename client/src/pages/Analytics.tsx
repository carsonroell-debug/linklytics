import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { BarChart3, Globe, Monitor, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1"];

export default function Analytics() {
  const { user, loading } = useAuth();
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<number>(30);

  const { data: links } = trpc.links.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: analytics, isLoading: analyticsLoading } = trpc.analytics.getLinkAnalytics.useQuery(
    { linkId: selectedLinkId!, daysAgo: timeRange },
    { enabled: !!selectedLinkId }
  );

  if (loading) {
    return <DashboardLayout><div className="p-8">Loading...</div></DashboardLayout>;
  }

  if (!user) {
    return null;
  }

  // Prepare chart data
  const clickTrendData = analytics?.clicksByDate
    ? Object.entries(analytics.clicksByDate).map(([date, clicks]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        clicks,
      }))
    : [];

  const deviceData = analytics?.clicksByDevice
    ? Object.entries(analytics.clicksByDevice).map(([device, count]) => ({
        name: device.charAt(0).toUpperCase() + device.slice(1),
        value: count,
      }))
    : [];

  const browserData = analytics?.clicksByBrowser
    ? Object.entries(analytics.clicksByBrowser).map(([browser, count]) => ({
        browser,
        clicks: count,
      }))
    : [];

  const countryData = analytics?.clicksByCountry
    ? Object.entries(analytics.clicksByCountry)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([country, count]) => ({
          country,
          clicks: count,
        }))
    : [];

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed insights into your link performance
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <Select
              value={selectedLinkId?.toString() || ""}
              onValueChange={(value) => setSelectedLinkId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a link to analyze" />
              </SelectTrigger>
              <SelectContent>
                {links?.map((link) => (
                  <SelectItem key={link.id} value={link.id.toString()}>
                    {link.slug} - {link.clickCount} clicks
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select
            value={timeRange.toString()}
            onValueChange={(value) => setTimeRange(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!selectedLinkId && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a link above to view detailed analytics
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedLinkId && analyticsLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedLinkId && analytics && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalClicks}</div>
                  <p className="text-xs text-muted-foreground">
                    Last {timeRange} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Countries</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.keys(analytics.clicksByCountry || {}).length}</div>
                  <p className="text-xs text-muted-foreground">
                    Unique locations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Devices</CardTitle>
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.keys(analytics.clicksByDevice || {}).length}</div>
                  <p className="text-xs text-muted-foreground">
                    Device types
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Browsers</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.keys(analytics.clicksByBrowser || {}).length}</div>
                  <p className="text-xs text-muted-foreground">
                    Browser types
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Click Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Click Trend</CardTitle>
                <CardDescription>
                  Daily clicks over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clickTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={clickTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="clicks"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No click data available for this period
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Device Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Breakdown</CardTitle>
                  <CardDescription>
                    Clicks by device type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {deviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={deviceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {deviceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No device data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Browser Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Browser Distribution</CardTitle>
                  <CardDescription>
                    Clicks by browser
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {browserData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={browserData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="browser" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="clicks" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No browser data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Geographic Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
                <CardDescription>
                  Geographic distribution of clicks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {countryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={countryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="country" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="clicks" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No geographic data available
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
