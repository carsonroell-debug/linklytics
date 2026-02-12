import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Bell, BellOff, ExternalLink } from "lucide-react";

export default function Webhooks() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    platform: "slack" as "slack" | "discord" | "custom",
    events: ["milestone_reached"],
  });

  const { data: webhooks, isLoading, refetch } = trpc.webhooks.list.useQuery();
  
  const createMutation = trpc.webhooks.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook created successfully");
      setCreateDialogOpen(false);
      setFormData({ name: "", url: "", platform: "slack", events: ["milestone_reached"] });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.webhooks.update.useMutation({
    onSuccess: () => {
      toast.success("Webhook updated successfully");
      setEditingWebhook(null);
      setFormData({ name: "", url: "", platform: "slack", events: ["milestone_reached"] });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.webhooks.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.url) {
      toast.error("Name and URL are required");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingWebhook || !formData.name || !formData.url) return;
    updateMutation.mutate({
      webhookId: editingWebhook,
      ...formData,
    });
  };

  const handleDelete = (webhookId: number) => {
    if (confirm("Are you sure you want to delete this webhook?")) {
      deleteMutation.mutate({ webhookId });
    }
  };

  const handleToggleActive = (webhookId: number, isActive: boolean) => {
    updateMutation.mutate({
      webhookId,
      isActive: !isActive,
    });
  };

  const startEdit = (webhook: any) => {
    setEditingWebhook(webhook.id);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      platform: webhook.platform,
      events: webhook.events,
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "slack":
        return "💬";
      case "discord":
        return "🎮";
      default:
        return "🔗";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Webhook Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Get real-time alerts when your links hit click milestones
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Webhook</DialogTitle>
                <DialogDescription>
                  Configure a webhook to receive notifications for link milestones
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Webhook Name</Label>
                  <Input
                    id="name"
                    placeholder="Marketing Team Slack"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value: any) => setFormData({ ...formData, platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slack">💬 Slack</SelectItem>
                      <SelectItem value="discord">🎮 Discord</SelectItem>
                      <SelectItem value="custom">🔗 Custom Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="url">Webhook URL</Label>
                  <Input
                    id="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.platform === "slack" && "Get your webhook URL from Slack's Incoming Webhooks app"}
                    {formData.platform === "discord" && "Create a webhook in your Discord server settings"}
                    {formData.platform === "custom" && "Enter your custom webhook endpoint URL"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Webhook"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm">Milestone Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Webhooks will be triggered when your links reach <strong>100</strong>, <strong>1,000</strong>, and <strong>10,000</strong> clicks.
              Each milestone is only triggered once per link.
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading webhooks...</div>
        ) : webhooks && webhooks.length > 0 ? (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <Card key={webhook.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPlatformIcon(webhook.platform)}</span>
                      <div>
                        <CardTitle className="text-lg">{webhook.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {webhook.platform.charAt(0).toUpperCase() + webhook.platform.slice(1)} webhook
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {webhook.isActive ? (
                        <Bell className="h-4 w-4 text-green-600" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                      <p className="text-sm font-mono truncate">{webhook.url}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.isActive}
                          onCheckedChange={() => handleToggleActive(webhook.id, webhook.isActive)}
                        />
                        <Label className="text-sm">
                          {webhook.isActive ? "Active" : "Inactive"}
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Dialog
                          open={editingWebhook === webhook.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setEditingWebhook(null);
                              setFormData({ name: "", url: "", platform: "slack", events: ["milestone_reached"] });
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => startEdit(webhook)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Webhook</DialogTitle>
                              <DialogDescription>Update webhook configuration</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-name">Webhook Name</Label>
                                <Input
                                  id="edit-name"
                                  value={formData.name}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-platform">Platform</Label>
                                <Select
                                  value={formData.platform}
                                  onValueChange={(value: any) => setFormData({ ...formData, platform: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="slack">💬 Slack</SelectItem>
                                    <SelectItem value="discord">🎮 Discord</SelectItem>
                                    <SelectItem value="custom">🔗 Custom Webhook</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-url">Webhook URL</Label>
                                <Input
                                  id="edit-url"
                                  value={formData.url}
                                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingWebhook(null);
                                  setFormData({ name: "", url: "", platform: "slack", events: ["milestone_reached"] });
                                }}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? "Updating..." : "Update"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(webhook.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No webhooks configured</h3>
              <p className="text-muted-foreground mb-4">
                Add a webhook to receive real-time notifications when your links hit click milestones
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Webhook
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
