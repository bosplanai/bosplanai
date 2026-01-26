import { useState, useEffect, useRef } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { ArrowLeft, Building2, Palette, Globe, FileText, Bell, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useInvoiceSettings, InvoiceSettings } from "@/hooks/useInvoiceSettings";
import SideNavigation from "@/components/SideNavigation";
import bosplanLogo from "@/assets/bosplan-logo-icon.png";

const InvoicingSettings = () => {
  const { navigate } = useOrgNavigation();
  const { settings, loading, saving, saveSettings, uploadLogo } = useInvoiceSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
  // Local form state
  const [formData, setFormData] = useState<Partial<InvoiceSettings>>({});
  const [activeSection, setActiveSection] = useState("profile");

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateField = <K extends keyof InvoiceSettings>(field: K, value: InvoiceSettings[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await saveSettings(formData);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadLogo(file);
      if (url) {
        updateField('logo_url', url);
        // Also save immediately
        await saveSettings({ ...formData, logo_url: url });
      }
    } finally {
      setUploading(false);
    }
  };

  const menuItems = [
    { id: "profile", label: "Profile", icon: Building2, section: "organisation" },
    { id: "branding", label: "Branding", icon: Palette, section: "organisation" },
    { id: "general", label: "General", icon: Globe, section: "setup" },
    { id: "customisation", label: "Customisation", icon: FileText, section: "setup" },
    { id: "reminders", label: "Reminders", icon: Bell, section: "workflows" },
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
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Organisation Profile</h2>
              <p className="text-sm text-muted-foreground">
                Manage your business details that appear on invoices
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={formData.business_name || ""}
                  onChange={(e) => updateField('business_name', e.target.value)}
                  placeholder="Your Business Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Textarea
                  id="businessAddress"
                  value={formData.business_address || ""}
                  onChange={(e) => updateField('business_address', e.target.value)}
                  placeholder="123 Business Street&#10;City, Postcode&#10;Country"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Email Address</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={formData.business_email || ""}
                    onChange={(e) => updateField('business_email', e.target.value)}
                    placeholder="billing@yourbusiness.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Phone Number</Label>
                  <Input
                    id="businessPhone"
                    value={formData.business_phone || ""}
                    onChange={(e) => updateField('business_phone', e.target.value)}
                    placeholder="+44 123 456 7890"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessWebsite">Website</Label>
                  <Input
                    id="businessWebsite"
                    value={formData.business_website || ""}
                    onChange={(e) => updateField('business_website', e.target.value)}
                    placeholder="https://yourbusiness.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNumber">Tax/VAT Number</Label>
                  <Input
                    id="taxNumber"
                    value={formData.tax_number || ""}
                    onChange={(e) => updateField('tax_number', e.target.value)}
                    placeholder="GB123456789"
                  />
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
                Customise how your invoices look with your brand colors and logo
              </p>
            </div>
            <Separator />
            <div className="grid gap-6 max-w-2xl">
              <div className="space-y-4">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground text-center px-2">
                        Upload logo
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload Logo
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recommended: 400x100px, PNG or SVG
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
                      value={formData.primary_color || "#1B9AAA"}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color || "#1B9AAA"}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for headers and accents</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Colour</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={formData.secondary_color || "#E0523A"}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color || "#E0523A"}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for buttons and highlights</p>
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
                Configure currency, location, and tax settings
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency || "GBP"} onValueChange={(v) => updateField('currency', v)}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                      <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                      <SelectItem value="CAD">CAD ($) - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD ($) - Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select value={formData.location || "GB"} onValueChange={(v) => updateField('location', v)}>
                    <SelectTrigger id="location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxLabel">Tax Label</Label>
                  <Input
                    id="taxLabel"
                    value={formData.tax_label || "VAT"}
                    onChange={(e) => updateField('tax_label', e.target.value)}
                    placeholder="VAT, GST, Tax, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={formData.tax_rate || 20}
                    onChange={(e) => updateField('tax_rate', parseFloat(e.target.value) || 0)}
                    placeholder="20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="financialYearStart">Financial Year Starts</Label>
                <Select value={formData.financial_year_start || "april"} onValueChange={(v) => updateField('financial_year_start', v)}>
                  <SelectTrigger id="financialYearStart" className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="january">January</SelectItem>
                    <SelectItem value="april">April</SelectItem>
                    <SelectItem value="july">July</SelectItem>
                    <SelectItem value="october">October</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "customisation":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Invoice Customisation</h2>
              <p className="text-sm text-muted-foreground">
                Customise the layout and content of your invoices
              </p>
            </div>
            <Separator />
            <div className="grid gap-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
                <Input
                  id="invoicePrefix"
                  value={formData.invoice_prefix || "INV-"}
                  onChange={(e) => updateField('invoice_prefix', e.target.value)}
                  placeholder="INV-"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  E.g., INV-000001, INVOICE-000001
                </p>
              </div>
              
              <div className="space-y-4">
                <Label>Display Options</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Show Logo on Invoice</p>
                      <p className="text-xs text-muted-foreground">Display your company logo at the top</p>
                    </div>
                    <Switch 
                      checked={formData.show_logo ?? true} 
                      onCheckedChange={(v) => updateField('show_logo', v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Show Tax Number</p>
                      <p className="text-xs text-muted-foreground">Display VAT/Tax registration number</p>
                    </div>
                    <Switch 
                      checked={formData.show_tax_number ?? true} 
                      onCheckedChange={(v) => updateField('show_tax_number', v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Show Payment Terms</p>
                      <p className="text-xs text-muted-foreground">Display payment terms on invoice</p>
                    </div>
                    <Switch 
                      checked={formData.show_payment_terms ?? true} 
                      onCheckedChange={(v) => updateField('show_payment_terms', v)} 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultPaymentTerms">Default Payment Terms (Days)</Label>
                <Select 
                  value={formData.default_payment_terms || "30"} 
                  onValueChange={(v) => updateField('default_payment_terms', v)}
                >
                  <SelectTrigger id="defaultPaymentTerms" className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Due on Receipt</SelectItem>
                    <SelectItem value="7">Net 7</SelectItem>
                    <SelectItem value="14">Net 14</SelectItem>
                    <SelectItem value="30">Net 30</SelectItem>
                    <SelectItem value="60">Net 60</SelectItem>
                    <SelectItem value="90">Net 90</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="termsUrl">Terms & Conditions URL</Label>
                <Input
                  id="termsUrl"
                  value={formData.terms_and_conditions_url || ""}
                  onChange={(e) => updateField('terms_and_conditions_url', e.target.value)}
                  placeholder="https://yourbusiness.com/terms"
                />
                <p className="text-xs text-muted-foreground">
                  Link to your full terms and conditions
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerNote">Invoice Footer Note</Label>
                <Textarea
                  id="footerNote"
                  value={formData.footer_note || ""}
                  onChange={(e) => updateField('footer_note', e.target.value)}
                  placeholder="Thank you for your business!"
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case "reminders":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Payment Reminders</h2>
              <p className="text-sm text-muted-foreground">
                Configure automatic payment reminders for your invoices
              </p>
            </div>
            <Separator />
            <div className="grid gap-6 max-w-2xl">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Payment Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically send reminders for unpaid invoices
                  </p>
                </div>
                <Switch 
                  checked={formData.enable_reminders ?? true} 
                  onCheckedChange={(v) => updateField('enable_reminders', v)} 
                />
              </div>

              {formData.enable_reminders && (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Before Due Date</CardTitle>
                      <CardDescription>
                        Send a friendly reminder before the invoice is due
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={formData.reminder_before_due || 3}
                          onChange={(e) => updateField('reminder_before_due', parseInt(e.target.value) || 3)}
                          className="w-20"
                          min="1"
                          max="30"
                        />
                        <span className="text-sm text-muted-foreground">days before due date</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">On Due Date</CardTitle>
                      <CardDescription>
                        Send a reminder on the day the invoice is due
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Send reminder on due date</span>
                        <Switch 
                          checked={formData.reminder_on_due ?? true} 
                          onCheckedChange={(v) => updateField('reminder_on_due', v)} 
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">After Due Date (Overdue)</CardTitle>
                      <CardDescription>
                        Send reminders for overdue invoices
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Send reminder every</span>
                        <Input
                          type="number"
                          value={formData.reminder_after_due || 7}
                          onChange={(e) => updateField('reminder_after_due', parseInt(e.target.value) || 7)}
                          className="w-20"
                          min="1"
                          max="30"
                        />
                        <span className="text-sm text-muted-foreground">days after due date</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Maximum reminders</span>
                        <Select 
                          value={String(formData.max_reminders || 3)} 
                          onValueChange={(v) => updateField('max_reminders', parseInt(v))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar Menu */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Dashboard</span>
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-6">
            <img src={bosplanLogo} alt="Bosplan" className="w-6 h-6 object-contain" />
            <span className="font-semibold">Invoice Settings</span>
          </div>

          {/* Organisation Section */}
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Organisation
            </p>
            {menuItems
              .filter(item => item.section === "organisation")
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
          </div>

          {/* Setup Section */}
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Setup
            </p>
            {menuItems
              .filter(item => item.section === "setup")
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
          </div>

          {/* Workflows Section */}
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Workflows
            </p>
            {menuItems
              .filter(item => item.section === "workflows")
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
          
          <div className="mt-8 pt-6 border-t max-w-2xl">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side Navigation */}
      <SideNavigation />
    </div>
  );
};

export default InvoicingSettings;
