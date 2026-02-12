import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface UTMBuilderProps {
  baseUrl: string;
  onUrlChange: (url: string) => void;
}

export function UTMBuilder({ baseUrl, onUrlChange }: UTMBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [utmParams, setUtmParams] = useState({
    source: "",
    medium: "",
    campaign: "",
    term: "",
    content: "",
  });

  const buildUrl = () => {
    if (!baseUrl) return "";
    
    const url = new URL(baseUrl);
    const params = new URLSearchParams(url.search);
    
    if (utmParams.source) params.set("utm_source", utmParams.source);
    if (utmParams.medium) params.set("utm_medium", utmParams.medium);
    if (utmParams.campaign) params.set("utm_campaign", utmParams.campaign);
    if (utmParams.term) params.set("utm_term", utmParams.term);
    if (utmParams.content) params.set("utm_content", utmParams.content);
    
    const finalUrl = `${url.origin}${url.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    return finalUrl;
  };

  const handleApply = () => {
    const urlWithUTM = buildUrl();
    if (urlWithUTM) {
      onUrlChange(urlWithUTM);
      toast.success("UTM parameters applied to destination URL");
    }
  };

  const handleClear = () => {
    setUtmParams({
      source: "",
      medium: "",
      campaign: "",
      term: "",
      content: "",
    });
    onUrlChange(baseUrl.split("?")[0]); // Remove any existing UTM params
    toast.success("UTM parameters cleared");
  };

  const handleCopy = () => {
    const urlWithUTM = buildUrl();
    if (urlWithUTM) {
      navigator.clipboard.writeText(urlWithUTM);
      toast.success("URL with UTM parameters copied");
    }
  };

  const hasUTMParams = Object.values(utmParams).some(v => v !== "");
  const previewUrl = buildUrl();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">UTM Parameter Builder</CardTitle>
              <CardDescription className="text-xs">
                Add tracking parameters for Google Analytics
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="utm_source" className="text-xs">
                  Source * <span className="text-muted-foreground">(e.g., google, newsletter)</span>
                </Label>
                <Input
                  id="utm_source"
                  placeholder="google"
                  value={utmParams.source}
                  onChange={(e) => setUtmParams({ ...utmParams, source: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm_medium" className="text-xs">
                  Medium * <span className="text-muted-foreground">(e.g., cpc, email, social)</span>
                </Label>
                <Input
                  id="utm_medium"
                  placeholder="cpc"
                  value={utmParams.medium}
                  onChange={(e) => setUtmParams({ ...utmParams, medium: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm_campaign" className="text-xs">
                  Campaign * <span className="text-muted-foreground">(e.g., summer_sale)</span>
                </Label>
                <Input
                  id="utm_campaign"
                  placeholder="summer_sale"
                  value={utmParams.campaign}
                  onChange={(e) => setUtmParams({ ...utmParams, campaign: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm_term" className="text-xs">
                  Term <span className="text-muted-foreground">(optional, for paid keywords)</span>
                </Label>
                <Input
                  id="utm_term"
                  placeholder="running+shoes"
                  value={utmParams.term}
                  onChange={(e) => setUtmParams({ ...utmParams, term: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="utm_content" className="text-xs">
                  Content <span className="text-muted-foreground">(optional, for A/B testing)</span>
                </Label>
                <Input
                  id="utm_content"
                  placeholder="logolink"
                  value={utmParams.content}
                  onChange={(e) => setUtmParams({ ...utmParams, content: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {hasUTMParams && previewUrl && (
              <div className="space-y-2 p-3 bg-muted rounded-md">
                <Label className="text-xs font-medium">Preview URL:</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs break-all bg-background p-2 rounded border">
                    {previewUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleApply} 
                size="sm" 
                disabled={!utmParams.source || !utmParams.medium || !utmParams.campaign || !baseUrl}
                className="flex-1"
              >
                Apply UTM Parameters
              </Button>
              <Button onClick={handleClear} variant="outline" size="sm" disabled={!hasUTMParams}>
                Clear
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              * Required fields: Source, Medium, and Campaign are needed for proper tracking in Google Analytics.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
