import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import bosplanLogo from "@/assets/bosplan-helpdesk-logo.png";
interface PortalSettings {
  id: string;
  organization_id: string;
  company_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  portal_enabled: boolean;
  show_name_field: boolean;
  show_email_field: boolean;
  show_phone_field: boolean;
  show_details_field: boolean;
  show_attachment_field: boolean;
}
const HelpdeskPortal = () => {
  const {
    slug
  } = useParams<{
    slug: string;
  }>();
  const {
    toast
  } = useToast();
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    details: ""
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  useEffect(() => {
    const fetchSettings = async () => {
      if (!slug) {
        setError("Invalid portal URL");
        setLoading(false);
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.rpc("get_helpdesk_by_slug", {
          _slug: slug
        });
        if (error) throw error;
        if (!data || data.length === 0) {
          setError("Portal not found or disabled");
          setSettings(null);
        } else {
          setSettings(data[0] as PortalSettings);
        }
      } catch (err) {
        console.error("Error fetching portal settings:", err);
        setError("Failed to load portal");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [slug]);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Max 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive"
        });
        return;
      }
      setAttachment(file);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    // Validate required fields
    if (!formData.subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter a subject for your enquiry",
        variant: "destructive"
      });
      return;
    }
    setSubmitting(true);
    try {
      let attachmentUrl = null;
      let attachmentName = null;

      // Upload attachment if present
      if (attachment) {
        const fileExt = attachment.name.split(".").pop();
        const fileName = `${settings.organization_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from("helpdesk-attachments").upload(fileName, attachment);
        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const {
            data: urlData
          } = supabase.storage.from("helpdesk-attachments").getPublicUrl(fileName);
          attachmentUrl = urlData.publicUrl;
          attachmentName = attachment.name;
        }
      }

      // Submit ticket using the security definer function
      const {
        error: submitError
      } = await supabase.rpc("submit_helpdesk_ticket", {
        _organization_id: settings.organization_id,
        _subject: formData.subject,
        _contact_name: formData.name || null,
        _contact_email: formData.email || null,
        _contact_phone: formData.phone || null,
        _details: formData.details || null,
        _attachment_url: attachmentUrl,
        _attachment_name: attachmentName
      });
      if (submitError) throw submitError;
      setSubmitted(true);
    } catch (err: any) {
      console.error("Error submitting ticket:", err);
      toast({
        title: "Submission failed",
        description: err.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>;
  }
  if (error || !settings) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Portal Unavailable</h2>
            <p className="text-muted-foreground">
              {error || "This support portal is not available."}
            </p>
          </CardContent>
        </Card>
      </div>;
  }
  if (submitted) {
    return <div className="min-h-screen flex items-center justify-center p-4" style={{
      backgroundColor: settings.primary_color || "#1B9AAA"
    }}>
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-brand-green mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Ticket Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for contacting us. We'll get back to you as soon as possible.
            </p>
            <Button onClick={() => {
            setSubmitted(false);
            setFormData({
              name: "",
              email: "",
              phone: "",
              subject: "",
              details: ""
            });
            setAttachment(null);
          }} style={{
            backgroundColor: settings.primary_color || "#1B9AAA"
          }}>
              Submit Another Ticket
            </Button>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen py-8 px-4" style={{
    backgroundColor: settings.primary_color || "#1B9AAA"
  }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {settings.logo_url && <img src={settings.logo_url} alt={settings.company_name || "Company"} className="h-16 mx-auto mb-4 object-contain" />}
          <h1 className="text-3xl font-bold mb-2 text-neutral-950">
            {settings.company_name || "Support"}
          </h1>
          <p className="text-black">
            Submit a support ticket and we'll get back to you
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Submit a Support Request</CardTitle>
            <CardDescription>
              Fill out the form below and our team will respond as soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {settings.show_name_field && <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
                ...prev,
                name: e.target.value
              }))} placeholder="John Smith" />
                </div>}

              {settings.show_email_field && <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData(prev => ({
                ...prev,
                email: e.target.value
              }))} placeholder="john@example.com" />
                </div>}

              {settings.show_phone_field && <div className="space-y-2">
                  <Label htmlFor="phone">Contact Number</Label>
                  <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData(prev => ({
                ...prev,
                phone: e.target.value
              }))} placeholder="+44 123 456 7890" />
                </div>}

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input id="subject" value={formData.subject} onChange={e => setFormData(prev => ({
                ...prev,
                subject: e.target.value
              }))} placeholder="Brief description of your enquiry" required />
              </div>

              {settings.show_details_field && <div className="space-y-2">
                  <Label htmlFor="details">Details of Enquiry</Label>
                  <Textarea id="details" value={formData.details} onChange={e => setFormData(prev => ({
                ...prev,
                details: e.target.value
              }))} placeholder="Please provide as much detail as possible..." rows={5} />
                </div>}

              {settings.show_attachment_field && <div className="space-y-2">
                  <Label>Attachment</Label>
                  {attachment ? <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <span className="text-sm flex-1 truncate">{attachment.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAttachment(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div> : <div>
                      <input type="file" id="attachment" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt" />
                      <label htmlFor="attachment" className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Click to upload a file (max 10MB)
                        </span>
                      </label>
                    </div>}
                </div>}

              <Button type="submit" className="w-full" disabled={submitting} style={{
              backgroundColor: settings.secondary_color || "#E0523A"
            }}>
                {submitting ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </> : "Submit Ticket"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <img src={bosplanLogo} alt="Bosplan" className="h-5 w-5 object-contain" />
          <p className="text-sm text-[#050505] font-medium">
            Powered by Bosplan HelpDesk
          </p>
        </div>
      </div>
    </div>;
};
export default HelpdeskPortal;