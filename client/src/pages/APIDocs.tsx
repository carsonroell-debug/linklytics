import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Check, Copy, Key } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function APIDocs() {
  const { user, loading } = useAuth();
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const { data: apiKeys } = trpc.apiKeys.list.useQuery(undefined, {
    enabled: !!user,
  });

  const apiKey = apiKeys?.[0]?.keyPreview || "YOUR_API_KEY";
  const baseUrl = window.location.origin;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(label);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  if (loading) {
    return <DashboardLayout><div className="p-8">Loading...</div></DashboardLayout>;
  }

  if (!user) {
    return null;
  }

  const endpoints = [
    {
      id: "create-link",
      title: "Create Short Link",
      method: "POST",
      path: "/api/links",
      description: "Create a new short link with optional customization",
      requestBody: {
        originalUrl: "https://example.com/my-long-url",
        slug: "my-custom-slug",
        expiresAt: "2026-12-31T23:59:59Z",
        password: "optional-password",
      },
      response: {
        id: 123,
        slug: "my-custom-slug",
        originalUrl: "https://example.com/my-long-url",
        shortUrl: `${baseUrl}/my-custom-slug`,
        clickCount: 0,
        isActive: true,
        createdAt: "2026-02-11T20:00:00Z",
      },
    },
    {
      id: "get-links",
      title: "Get All Links",
      method: "GET",
      path: "/api/links",
      description: "Retrieve all your short links",
      requestBody: null,
      response: [
        {
          id: 123,
          slug: "my-link",
          originalUrl: "https://example.com",
          shortUrl: `${baseUrl}/my-link`,
          clickCount: 42,
          isActive: true,
          createdAt: "2026-02-11T20:00:00Z",
        },
      ],
    },
    {
      id: "get-analytics",
      title: "Get Link Analytics",
      method: "GET",
      path: "/api/analytics/:linkId",
      description: "Retrieve detailed analytics for a specific link",
      requestBody: null,
      response: {
        totalClicks: 42,
        clicksByDate: {
          "2026-02-11": 15,
          "2026-02-10": 27,
        },
        clicksByCountry: {
          "United States": 25,
          "Canada": 10,
          "United Kingdom": 7,
        },
        clicksByDevice: {
          desktop: 30,
          mobile: 10,
          tablet: 2,
        },
        clicksByBrowser: {
          Chrome: 25,
          Firefox: 10,
          Safari: 7,
        },
      },
    },
    {
      id: "delete-link",
      title: "Delete Link",
      method: "DELETE",
      path: "/api/links/:linkId",
      description: "Delete a short link permanently",
      requestBody: null,
      response: {
        success: true,
        message: "Link deleted successfully",
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
          <p className="text-muted-foreground">
            Integrate Linklytics into your applications with our REST API
          </p>
        </div>

        {/* API Key Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Your API Key
            </CardTitle>
            <CardDescription>
              Use this key to authenticate your API requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiKeys && apiKeys.length > 0 ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                  {apiKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apiKey, "api-key")}
                >
                  {copiedEndpoint === "api-key" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  You don't have an API key yet. Create one from the API Keys page.
                </p>
                <Button onClick={() => window.location.href = "/api-keys"}>
                  Create API Key
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              All API requests must include your API key in the Authorization header
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md">
              <code className="text-sm font-mono">
                Authorization: Bearer {apiKey}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">API Endpoints</h2>
          
          {endpoints.map((endpoint) => (
            <Card key={endpoint.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        endpoint.method === "GET" ? "bg-blue-100 text-blue-700" :
                        endpoint.method === "POST" ? "bg-green-100 text-green-700" :
                        endpoint.method === "DELETE" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {endpoint.method}
                      </span>
                      {endpoint.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {endpoint.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="curl" className="space-y-4">
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                        <code className="text-sm font-mono">
{`curl -X ${endpoint.method} '${baseUrl}${endpoint.path}' \\
  -H 'Authorization: Bearer ${apiKey}' \\
  -H 'Content-Type: application/json'${endpoint.requestBody ? ` \\
  -d '${JSON.stringify(endpoint.requestBody, null, 2)}'` : ''}`}
                        </code>
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(
                          `curl -X ${endpoint.method} '${baseUrl}${endpoint.path}' -H 'Authorization: Bearer ${apiKey}' -H 'Content-Type: application/json'${endpoint.requestBody ? ` -d '${JSON.stringify(endpoint.requestBody)}'` : ''}`,
                          `${endpoint.id}-curl`
                        )}
                      >
                        {copiedEndpoint === `${endpoint.id}-curl` ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="javascript" className="space-y-4">
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                        <code className="text-sm font-mono">
{`const response = await fetch('${baseUrl}${endpoint.path}', {
  method: '${endpoint.method}',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  }${endpoint.requestBody ? `,
  body: JSON.stringify(${JSON.stringify(endpoint.requestBody, null, 2)})` : ''}
});

const data = await response.json();
console.log(data);`}
                        </code>
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(
                          `const response = await fetch('${baseUrl}${endpoint.path}', {method: '${endpoint.method}', headers: {'Authorization': 'Bearer ${apiKey}', 'Content-Type': 'application/json'}${endpoint.requestBody ? `, body: JSON.stringify(${JSON.stringify(endpoint.requestBody)})` : ''}});`,
                          `${endpoint.id}-js`
                        )}
                      >
                        {copiedEndpoint === `${endpoint.id}-js` ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="python" className="space-y-4">
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                        <code className="text-sm font-mono">
{`import requests

url = '${baseUrl}${endpoint.path}'
headers = {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
}${endpoint.requestBody ? `
data = ${JSON.stringify(endpoint.requestBody, null, 2)}

response = requests.${endpoint.method.toLowerCase()}(url, headers=headers, json=data)` : `

response = requests.${endpoint.method.toLowerCase()}(url, headers=headers)`}
print(response.json())`}
                        </code>
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(
                          `import requests\nurl = '${baseUrl}${endpoint.path}'\nheaders = {'Authorization': 'Bearer ${apiKey}', 'Content-Type': 'application/json'}\nresponse = requests.${endpoint.method.toLowerCase()}(url, headers=headers${endpoint.requestBody ? `, json=${JSON.stringify(endpoint.requestBody)}` : ''})\nprint(response.json())`,
                          `${endpoint.id}-py`
                        )}
                      >
                        {copiedEndpoint === `${endpoint.id}-py` ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Response Example */}
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Response Example</h4>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                    <code className="text-sm font-mono">
                      {JSON.stringify(endpoint.response, null, 2)}
                    </code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rate Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Limits</CardTitle>
            <CardDescription>
              API usage limits and best practices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Free tier: 100 requests per hour</li>
              <li>Pro tier: 1,000 requests per hour</li>
              <li>Rate limit headers are included in all responses</li>
              <li>Exceeding limits returns HTTP 429 (Too Many Requests)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
