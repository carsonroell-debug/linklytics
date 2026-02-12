import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { BulkImport } from "@/components/BulkImport";
import { UTMBuilder } from "@/components/UTMBuilder";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Copy, QrCode, BarChart3, Trash2, ExternalLink, Lock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Links() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null);
  
  const utils = trpc.useUtils();
  const { data: links, isLoading } = trpc.links.list.useQuery();
  const { data: subscriptionStatus } = trpc.subscription.getStatus.useQuery();
  const createMutation = trpc.links.create.useMutation();
  const deleteMutation = trpc.links.delete.useMutation();
  const updateMutation = trpc.links.update.useMutation();
  const { data: qrData } = trpc.links.generateQR.useQuery(
    { linkId: selectedLinkId! },
    { enabled: !!selectedLinkId && qrDialogOpen }
  );

  const [formData, setFormData] = useState({
    slug: "",
    originalUrl: "",
    title: "",
    description: "",
    password: "",
    expiresAt: "",
    campaignId: undefined as number | undefined,
  });

  const { data: campaigns } = trpc.campaigns.list.useQuery();

  const handleCreate = async () => {
    try {
      const data: any = {
        slug: formData.slug,
        originalUrl: formData.originalUrl,
      };
      
      if (formData.title) data.title = formData.title;
      if (formData.description) data.description = formData.description;
      if (formData.password) data.password = formData.password;
      if (formData.expiresAt) data.expiresAt = new Date(formData.expiresAt);
      if (formData.campaignId) data.campaignId = formData.campaignId;

      await createMutation.mutateAsync(data);
      toast.success("Link created successfully!");
      setCreateDialogOpen(false);
      setFormData({
        slug: "",
        originalUrl: "",
        title: "",
        description: "",
        password: "",
        expiresAt: "",
        campaignId: undefined,
      });
      utils.links.list.invalidate();
      utils.analytics.getOverview.invalidate();
    } catch (error: any) {
      toast.error(error.message || "Failed to create link");
    }
  };

  const handleDelete = async (linkId: number) => {
    if (!confirm("Are you sure you want to delete this link?")) return;
    
    try {
      await deleteMutation.mutateAsync({ linkId });
      toast.success("Link deleted successfully!");
      utils.links.list.invalidate();
      utils.analytics.getOverview.invalidate();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete link");
    }
  };

  const handleToggleActive = async (linkId: number, currentStatus: boolean) => {
    try {
      await updateMutation.mutateAsync({ 
        linkId, 
        isActive: !currentStatus 
      });
      toast.success(`Link ${!currentStatus ? "activated" : "deactivated"}`);
      utils.links.list.invalidate();
    } catch (error: any) {
      toast.error(error.message || "Failed to update link");
    }
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const openQRDialog = (linkId: number) => {
    setSelectedLinkId(linkId);
    setQrDialogOpen(true);
  };

  const canCreateMore = subscriptionStatus?.tier === "paid" || (links?.length ?? 0) < 5;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Links</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your short links
            </p>
          </div>
          <div className="flex gap-2">
            <BulkImport />
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" disabled={!canCreateMore}>
                  <Plus className="mr-2 h-5 w-5" />
                  Create Link
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Short Link</DialogTitle>
                <DialogDescription>
                  Enter the details for your new short link
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="originalUrl">Destination URL *</Label>
                  <Input
                    id="originalUrl"
                    placeholder="https://example.com/very-long-url"
                    value={formData.originalUrl}
                    onChange={(e) => setFormData({ ...formData, originalUrl: e.target.value })}
                  />
                </div>
                <UTMBuilder
                  baseUrl={formData.originalUrl}
                  onUrlChange={(url) => setFormData({ ...formData, originalUrl: url })}
                />
                <div className="space-y-2">
                  <Label htmlFor="slug">Short Slug *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{window.location.origin}/</span>
                    <Input
                      id="slug"
                      placeholder="my-link"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "") })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    placeholder="My awesome link"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What is this link for?"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password Protection (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign">Campaign (optional)</Label>
                  <Select
                    value={formData.campaignId?.toString()}
                    onValueChange={(value) => setFormData({ ...formData, campaignId: value ? parseInt(value) : undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No campaign</SelectItem>
                      {campaigns?.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: campaign.color || "#3b82f6" }}
                            />
                            {campaign.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!formData.slug || !formData.originalUrl || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Link"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Limit warning */}
        {!canCreateMore && (
          <Card className="border-yellow-500/50 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">
                You've reached the free tier limit of 5 links. Upgrade to Pro for unlimited links.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Links List */}
        {isLoading ? (
          <div>Loading...</div>
        ) : links && links.length > 0 ? (
          <div className="grid gap-4">
            {links.map((link) => (
              <Card key={link.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2">
                        {link.title || link.slug}
                        {link.password && <Lock className="h-4 w-4 text-muted-foreground" />}
                        {link.expiresAt && <Calendar className="h-4 w-4 text-muted-foreground" />}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <a 
                          href={`/${link.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {window.location.origin}/{link.slug}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </CardDescription>
                      <p className="text-sm text-muted-foreground mt-2 truncate">
                        → {link.originalUrl}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${link.id}`} className="text-sm">
                          {link.isActive ? "Active" : "Inactive"}
                        </Label>
                        <Switch
                          id={`active-${link.id}`}
                          checked={link.isActive}
                          onCheckedChange={() => handleToggleActive(link.id, link.isActive)}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{link.clickCount} clicks</span>
                      {link.expiresAt && (
                        <span>Expires: {format(new Date(link.expiresAt), "MMM d, yyyy")}</span>
                      )}
                      <span>Created: {format(new Date(link.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(link.slug)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openQRDialog(link.id)}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/analytics?linkId=${link.id}`}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(link.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Plus className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No links yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first short link to get started
              </p>
          <div className="flex gap-2">
            <BulkImport />
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Link
            </Button>
          </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to access your short link
            </DialogDescription>
          </DialogHeader>
          {qrData && (
            <div className="flex flex-col items-center gap-4 py-4">
              <img src={qrData.qrCode} alt="QR Code" className="w-64 h-64" />
              <p className="text-sm text-muted-foreground">{qrData.shortUrl}</p>
              <Button onClick={() => {
                const link = document.createElement("a");
                link.download = "qrcode.png";
                link.href = qrData.qrCode;
                link.click();
              }}>
                Download QR Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
