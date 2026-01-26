import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileIcon, Download, Eye, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SharedFileData {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  organization_id: string;
}

interface ShareData {
  id: string;
  file_id: string;
  organization_id: string;
  permission: string;
  drive_files: SharedFileData;
}

const SharedFile = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to auth with return URL
      const returnUrl = `/shared/${token}`;
      navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    validateAccess();
  }, [user, authLoading, token]);

  const validateAccess = async () => {
    if (!token || !user) return;

    setLoading(true);
    setError(null);

    try {
      // First, fetch the share record by token
      const { data: share, error: shareError } = await supabase
        .from("drive_file_shares")
        .select(`
          id,
          file_id,
          organization_id,
          permission,
          drive_files (
            id,
            name,
            file_type,
            file_size,
            storage_path,
            organization_id
          )
        `)
        .eq("share_token", token)
        .eq("is_link_share", true)
        .single();

      if (shareError || !share) {
        setError("This share link is invalid or has expired.");
        setLoading(false);
        return;
      }

      // Check if the user is a member of the organization
      const { data: memberCheck, error: memberError } = await supabase.rpc(
        "is_org_member",
        { _user_id: user.id, _org_id: share.organization_id }
      );

      if (memberError) {
        console.error("Error checking membership:", memberError);
        setError("Unable to verify your access permissions.");
        setLoading(false);
        return;
      }

      if (!memberCheck) {
        setError("You must be a member of this organization to access this file.");
        setIsMember(false);
        setLoading(false);
        return;
      }

      setIsMember(true);
      setShareData(share as unknown as ShareData);
    } catch (err) {
      console.error("Error validating access:", err);
      setError("An error occurred while loading the shared file.");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isPreviewable = (fileType: string) => {
    return (
      fileType.startsWith("image/") ||
      fileType.startsWith("video/") ||
      fileType.startsWith("audio/") ||
      fileType === "application/pdf"
    );
  };

  const handleView = async () => {
    if (!shareData?.drive_files) return;

    const file = shareData.drive_files;
    
    try {
      const { data, error } = await supabase.storage
        .from("drive-files")
        .createSignedUrl(file.storage_path, 3600);

      if (error) throw error;

      if (isPreviewable(file.file_type)) {
        setPreviewUrl(data.signedUrl);
        setPreviewOpen(true);
      } else {
        // For non-previewable files, just download
        handleDownload();
      }
    } catch (err) {
      console.error("Error creating preview URL:", err);
      toast.error("Failed to load file preview");
    }
  };

  const handleDownload = async () => {
    if (!shareData?.drive_files) return;

    const file = shareData.drive_files;
    setDownloading(true);

    try {
      const { data, error } = await supabase.storage
        .from("drive-files")
        .createSignedUrl(file.storage_path, 60);

      if (error) throw error;

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Download started");
    } catch (err) {
      console.error("Error downloading file:", err);
      toast.error("Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  const renderPreview = () => {
    if (!previewUrl || !shareData?.drive_files) return null;

    const file = shareData.drive_files;
    const fileType = file.file_type;

    if (fileType.startsWith("image/")) {
      return (
        <img
          src={previewUrl}
          alt={file.name}
          className="max-w-full max-h-[70vh] object-contain mx-auto"
        />
      );
    }

    if (fileType.startsWith("video/")) {
      return (
        <video controls className="max-w-full max-h-[70vh] mx-auto">
          <source src={previewUrl} type={fileType} />
          Your browser does not support video playback.
        </video>
      );
    }

    if (fileType.startsWith("audio/")) {
      return (
        <audio controls className="w-full">
          <source src={previewUrl} type={fileType} />
          Your browser does not support audio playback.
        </audio>
      );
    }

    if (fileType === "application/pdf") {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[70vh]"
          title={file.name}
        />
      );
    }

    return null;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              {isMember === false ? (
                <Lock className="w-6 h-6 text-destructive" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              )}
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/drive")}>Go to Drive</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareData?.drive_files) {
    return null;
  }

  const file = shareData.drive_files;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileIcon className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="break-all">{file.name}</CardTitle>
          <CardDescription>
            {formatFileSize(file.file_size)} • {file.file_type.split("/")[1]?.toUpperCase() || file.file_type}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isPreviewable(file.file_type) && (
            <Button onClick={handleView} className="w-full gap-2">
              <Eye className="w-4 h-4" />
              View File
            </Button>
          )}
          <Button
            onClick={handleDownload}
            variant={isPreviewable(file.file_type) ? "outline" : "default"}
            className="w-full gap-2"
            disabled={downloading}
          >
            <Download className="w-4 h-4" />
            {downloading ? "Downloading..." : "Download File"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate("/drive")}
          >
            Go to Drive
          </Button>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{file.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">{renderPreview()}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SharedFile;
