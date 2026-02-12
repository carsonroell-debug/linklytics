import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Link as LinkIcon, BarChart3, Copy, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CampaignDetail() {
  const [, params] = useRoute("/campaigns/:id");
  const [, setLocation] = useLocation();
  const campaignId = params?.id ? parseInt(params.id) : 0;

  const { data: campaign, isLoading } = trpc.campaigns.get.useQuery(
    { campaignId },
    { enabled: campaignId > 0 }
  );

  const deleteLinkMutation = trpc.links.delete.useMutation({
    onSuccess: () => {
      toast.success("Link deleted successfully");
      // Refetch campaign data
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleDelete = (linkId: number) => {
    if (confirm("Are you sure you want to delete this link?")) {
      deleteLinkMutation.mutate({ linkId });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">Loading campaign...</div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Campaign not found</h2>
          <Button onClick={() => setLocation("/campaigns")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" onClick={() => setLocation("/campaigns")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: campaign.color || "#3b82f6" }}
            />
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
          </div>
          {campaign.description && (
            <p className="text-muted-foreground">{campaign.description}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.linkCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.totalClicks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Clicks/Link</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaign.linkCount > 0 ? Math.round(campaign.totalClicks / campaign.linkCount) : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Links in this Campaign</h2>
          {campaign.links && campaign.links.length > 0 ? (
            <div className="space-y-4">
              {campaign.links.map((link) => (
                <Card key={link.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{link.title || link.slug}</h3>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              link.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {link.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <a
                          href={`${window.location.origin}/${link.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {window.location.origin}/{link.slug}
                        </a>
                        <p className="text-sm text-muted-foreground mt-1">→ {link.originalUrl}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{link.clickCount} clicks</span>
                          <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(`${window.location.origin}/${link.slug}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/analytics?linkId=${link.id}`)}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(link.id)}
                          disabled={deleteLinkMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No links in this campaign yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create links and assign them to this campaign from the My Links page
                </p>
                <Button onClick={() => setLocation("/links")}>Go to My Links</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
