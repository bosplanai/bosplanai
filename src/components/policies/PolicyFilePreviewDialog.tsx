import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type PolicyPreviewFile = {
  name: string;
  file_path: string;
  mime_type: string | null;
};

function inferMimeTypeFromName(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "txt") return "text/plain";
  if (ext === "html" || ext === "htm") return "text/html";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "doc") return "application/msword";
  if (ext === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (ext === "ppt") return "application/vnd.ms-powerpoint";
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === "xls") return "application/vnd.ms-excel";
  return null;
}

function getPreviewKind(mimeType: string | null): "image" | "pdf" | "document" | "other" {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";

  const docTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  if (docTypes.includes(mimeType)) return "document";
  return "other";
}

export function PolicyFilePreviewDialog({
  file,
  onClose,
}: {
  file: PolicyPreviewFile | null;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mimeType = useMemo(() => {
    if (!file) return null;
    return file.mime_type || inferMimeTypeFromName(file.name);
  }, [file]);

  const kind = useMemo(() => getPreviewKind(mimeType), [mimeType]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!file) {
        setPreviewUrl(null);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from("drive-files")
          .createSignedUrl(file.file_path, 3600);

        if (error) throw error;
        if (!cancelled) setPreviewUrl(data.signedUrl);
      } catch (e) {
        console.error(e);
        if (!cancelled) setPreviewUrl(null);
        toast.error("Failed to load preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const handleDownload = async () => {
    if (!file) return;
    try {
      const { data, error } = await supabase.storage
        .from("drive-files")
        .download(file.file_path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Failed to download file");
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden">
        <div className="h-full flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="truncate">{file?.name}</DialogTitle>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-muted/20">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading preview…
              </div>
            )}

            {!loading && previewUrl && kind === "image" && (
              <img
                src={previewUrl}
                alt={file?.name || "Policy file"}
                className="max-w-full max-h-full object-contain rounded-lg border bg-background"
                loading="lazy"
              />
            )}

            {!loading && previewUrl && kind === "pdf" && (
              <iframe
                src={previewUrl}
                title={file?.name || "Policy PDF"}
                className="w-full h-full rounded-lg border bg-background"
              />
            )}

            {!loading && previewUrl && kind === "document" && (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                title={file?.name || "Policy document"}
                className="w-full h-full rounded-lg border bg-background"
              />
            )}

            {!loading && (!previewUrl || kind === "other") && (
              <div className="flex flex-col items-center justify-center text-center p-8 max-w-xl">
                <FileText className="w-12 h-12 text-muted-foreground/60 mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">Preview not available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This file type can’t be previewed in the app yet — please download to view it.
                </p>
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
