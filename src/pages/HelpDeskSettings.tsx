import { useState, useEffect } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { ArrowLeft, Building2, Palette, Globe, FileText, Loader2, Clock, Copy, ExternalLink, Check, Upload, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import SideNavigation from "@/components/SideNavigation";
import helpdeskLogo from "@/assets/bosplan-helpdesk-logo.png";
import { useHelpdeskSettings } from "@/hooks/useHelpdeskSettings";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";

const HelpDeskSettings = () => {
  const { navigate } = useOrgNavigation();
  const { settings, loading, saving, saveSettings } = useHelpdeskSettings();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [activeSection, setActiveSection] = useState("company");
  const [copied, setCopied] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Local form state
  const [formData, setFormData] = useState({
    company_name: "",
    support_email: "",
    support_phone: "",
    timezone: "Europe/London",
    business_hours_start: "09:00",
    business_hours_end: "17:00",
    working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"] as string[],
    logo_url: "",
    primary_color: "#1B9AAA",
    secondary_color: "#E0523A",
    portal_slug: "",
    portal_enabled: true,
    show_name_field: true,
    show_email_field: true,
    show_phone_field: true,
    show_details_field: true,
    show_attachment_field: true,
  });

  // Sync settings to form
  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || "",
        support_email: settings.support_email || "",
        support_phone: settings.support_phone || "",
        timezone: settings.timezone || "Europe/London",
        business_hours_start: settings.business_hours_start || "09:00",
        business_hours_end: settings.business_hours_end || "17:00",
        working_days: settings.working_days || ["monday", "tuesday", "wednesday", "thursday", "friday"],
        logo_url: settings.logo_url || "",
        primary_color: settings.primary_color || "#1B9AAA",
        secondary_color: settings.secondary_color || "#E0523A",
        portal_slug: settings.portal_slug || "",
        portal_enabled: settings.portal_enabled ?? true,
        show_name_field: settings.show_name_field ?? true,
        show_email_field: settings.show_email_field ?? true,
        show_phone_field: settings.show_phone_field ?? true,
        show_details_field: settings.show_details_field ?? true,
        show_attachment_field: settings.show_attachment_field ?? true,
      });
    }
  }, [settings]);

  const updateField = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await saveSettings(formData);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const getPortalUrl = () => {
    if (!formData.portal_slug) return "";
    // Use the current origin for the portal URL
    return `${window.location.origin}/helpdesk/portal/${formData.portal_slug}`;
  };

  const copyPortalUrl = () => {
    const url = getPortalUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Portal URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.id}/helpdesk-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('org-logos')
        .getPublicUrl(fileName);

      updateField('logo_url', urlData.publicUrl);
      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    updateField('logo_url', '');
  };

  const menuItems = [
    { id: "company", label: "Company", icon: Building2, section: "organisation" },
    { id: "branding", label: "Branding", icon: Palette, section: "organisation" },
    { id: "general", label: "General", icon: Globe, section: "setup" },
    { id: "customisation", label: "Customisation", icon: FileText, section: "setup" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "company":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Company Settings</h2>
              <p className="text-sm text-muted-foreground">
                Manage your organisation details, business hours, and agent settings
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="companyName">Organisation Name</Label>
                <Input
                  id="companyName"
                  value={formData.company_name}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  placeholder="Your Organisation Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={formData.support_email}
                    onChange={(e) => updateField('support_email', e.target.value)}
                    placeholder="support@yourcompany.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <Input
                    id="supportPhone"
                    value={formData.support_phone}
                    onChange={(e) => updateField('support_phone', e.target.value)}
                    placeholder="+44 123 456 7890"
                  />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-base font-medium">Business Hours</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={formData.timezone} onValueChange={(v) => updateField('timezone', v)}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los Angeles (PST)</SelectItem>
                        <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hoursStart">Opening Time</Label>
                    <Input
                      id="hoursStart"
                      type="time"
                      value={formData.business_hours_start}
                      onChange={(e) => updateField('business_hours_start', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hoursEnd">Closing Time</Label>
                    <Input
                      id="hoursEnd"
                      type="time"
                      value={formData.business_hours_end}
                      onChange={(e) => updateField('business_hours_end', e.target.value)}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        );

      case "branding":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Branding</h2>
              <p className="text-sm text-muted-foreground">
                Customise the look and feel of your customer portal
              </p>
            </div>
            <Separator />
            <div className="grid gap-6 max-w-2xl">
              <div className="space-y-4">
                <Label>Portal Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden relative">
                    {formData.logo_url ? (
                      <>
                        <img src={formData.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-0 right-0 h-6 w-6 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={handleRemoveLogo}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground text-center px-2">
                        Upload logo
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      id="logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingLogo}
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Upload your logo (max 2MB, PNG or JPG recommended)
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Colour</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for portal headers and background</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Colour</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for buttons and accents</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">General Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure your customer portal access
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable Customer Portal</p>
                  <p className="text-xs text-muted-foreground">Allow customers to submit tickets online</p>
                </div>
                <Switch 
                  checked={formData.portal_enabled} 
                  onCheckedChange={(v) => updateField('portal_enabled', v)} 
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="portalSlug">Portal URL Slug</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 text-sm text-muted-foreground">
                      /helpdesk/portal/
                    </div>
                    <Input
                      id="portalSlug"
                      value={formData.portal_slug}
                      onChange={(e) => updateField('portal_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="your-company"
                      className="flex-1 rounded-l-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use lowercase letters, numbers, and hyphens only
                  </p>
                </div>

                {formData.portal_slug && (
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Your Customer Portal URL</p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={copyPortalUrl}
                        >
                          {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(getPortalUrl(), '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground break-all font-mono bg-background p-2 rounded">
                      {getPortalUrl()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "customisation":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Ticket Form Customisation</h2>
              <p className="text-sm text-muted-foreground">
                Configure which fields appear on the customer ticket submission form
              </p>
            </div>
            <Separator />
            <div className="grid gap-6 max-w-2xl">
              <div className="space-y-4">
                <Label>Ticket Form Fields</Label>
                <p className="text-xs text-muted-foreground">
                  Subject is always required. Toggle additional fields below.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-xs text-muted-foreground">Customer's name</p>
                    </div>
                    <Switch 
                      checked={formData.show_name_field} 
                      onCheckedChange={(v) => updateField('show_name_field', v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-xs text-muted-foreground">Customer's email address</p>
                    </div>
                    <Switch 
                      checked={formData.show_email_field} 
                      onCheckedChange={(v) => updateField('show_email_field', v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Contact Number</p>
                      <p className="text-xs text-muted-foreground">Customer's phone number</p>
                    </div>
                    <Switch 
                      checked={formData.show_phone_field} 
                      onCheckedChange={(v) => updateField('show_phone_field', v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Details of Enquiry</p>
                      <p className="text-xs text-muted-foreground">Extended description field for ticket details</p>
                    </div>
                    <Switch 
                      checked={formData.show_details_field} 
                      onCheckedChange={(v) => updateField('show_details_field', v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">File Attachments</p>
                      <p className="text-xs text-muted-foreground">Allow customers to upload files with their ticket</p>
                    </div>
                    <Switch 
                      checked={formData.show_attachment_field} 
                      onCheckedChange={(v) => updateField('show_attachment_field', v)} 
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="pt-4">
                <Label className="mb-3 block">Form Preview</Label>
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  {formData.show_name_field && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Name</p>
                      <div className="h-8 bg-background rounded border"></div>
                    </div>
                  )}
                  {formData.show_email_field && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Email</p>
                      <div className="h-8 bg-background rounded border"></div>
                    </div>
                  )}
                  {formData.show_phone_field && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Contact Number</p>
                      <div className="h-8 bg-background rounded border"></div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Subject *</p>
                    <div className="h-8 bg-background rounded border"></div>
                  </div>
                  {formData.show_details_field && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Details</p>
                      <div className="h-20 bg-background rounded border"></div>
                    </div>
                  )}
                  {formData.show_attachment_field && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Attachment</p>
                      <div className="h-12 bg-background rounded border border-dashed flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Drop files here</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-brand-teal flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10 hover:text-brand-orange"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3 ml-auto">
            <img src={helpdeskLogo} alt="Bosplan" className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="text-base sm:text-lg font-semibold text-white">Settings</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row">
          {/* Settings Sidebar */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r bg-card p-4">
            <div className="space-y-6">
              {/* Organisation Section */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  Organisation
                </p>
                <div className="space-y-1">
                  {menuItems
                    .filter((item) => item.section === "organisation")
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeSection === item.id
                              ? "bg-brand-green text-white"
                              : "text-foreground hover:bg-secondary"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Setup Section */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  Setup
                </p>
                <div className="space-y-1">
                  {menuItems
                    .filter((item) => item.section === "setup")
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeSection === item.id
                              ? "bg-brand-green text-white"
                              : "text-foreground hover:bg-secondary"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            <Card className="max-w-4xl">
              <CardContent className="p-6">
                {renderContent()}

                <div className="mt-8 pt-6 border-t flex justify-end">
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-brand-green hover:bg-brand-green/90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* Right Side Navigation */}
      <SideNavigation />
    </div>
  );
};

export default HelpDeskSettings;
