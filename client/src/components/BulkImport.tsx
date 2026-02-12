import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Upload, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "./ui/card";

export function BulkImport() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{
    successful: string[];
    failed: { slug: string; error: string }[];
  } | null>(null);

  const utils = trpc.useUtils();
  const bulkImport = trpc.links.bulkImport.useMutation({
    onSuccess: () => {
      utils.links.list.invalidate();
    },
  });

  const downloadTemplate = () => {
    const csvContent = "slug,originalUrl,title,description\nmy-link,https://example.com,Example Link,This is an example\nsummer-sale,https://mystore.com/sale,Summer Sale,Check out our summer deals";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "linklytics-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded!");
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header row and one data row");
    }

    const headers = lines[0].split(",").map(h => h.trim());
    const requiredHeaders = ["slug", "originalUrl"];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
    }

    const links = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      if (values.length < 2) continue; // Skip empty lines

      const link: any = {};
      headers.forEach((header, index) => {
        if (values[index]) {
          link[header] = values[index];
        }
      });

      links.push(link);
    }

    return links;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setImporting(true);
    setResults(null);

    try {
      const text = await file.text();
      const links = parseCSV(text);

      if (links.length === 0) {
        toast.error("No valid links found in CSV file");
        setImporting(false);
        return;
      }

      const result = await bulkImport.mutateAsync({ links });
      setResults(result);

      if (result.successful.length > 0) {
        toast.success(`Successfully imported ${result.successful.length} link(s)`);
      }
      if (result.failed.length > 0) {
        toast.error(`Failed to import ${result.failed.length} link(s)`);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to import links");
      }
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setResults(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        resetDialog();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Links</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple short links at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Download CSV Template</h4>
                  <p className="text-sm text-muted-foreground">
                    Get started with our template file that shows the correct format
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CSV Format Info */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">CSV Format</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Your CSV file should have the following columns:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>slug</strong> (required): The short URL slug (letters, numbers, hyphens, underscores)</li>
                  <li><strong>originalUrl</strong> (required): The full URL to redirect to</li>
                  <li><strong>title</strong> (optional): A descriptive title for the link</li>
                  <li><strong>description</strong> (optional): Additional description</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Import Results */}
          {results && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-medium mb-3">Import Results</h4>
                
                {results.successful.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">
                        Successfully imported {results.successful.length} link(s)
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto text-sm text-muted-foreground">
                      {results.successful.map((slug, i) => (
                        <div key={i}>• {slug}</div>
                      ))}
                    </div>
                  </div>
                )}

                {results.failed.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">
                        Failed to import {results.failed.length} link(s)
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                      {results.failed.map((item, i) => (
                        <div key={i} className="text-muted-foreground">
                          • <strong>{item.slug}</strong>: {item.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetDialog}>
              {results ? "Close" : "Cancel"}
            </Button>
            {!results && (
              <Button onClick={handleImport} disabled={!file || importing}>
                {importing ? "Importing..." : "Import Links"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
