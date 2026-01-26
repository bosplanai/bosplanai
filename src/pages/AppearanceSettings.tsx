import { useState } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { ArrowLeft, Palette, Type, Sun, Moon, RotateCcw, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAppearance, ThemeMode } from "@/contexts/AppearanceContext";
import SideNavigation from "@/components/SideNavigation";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Color input component
const ColorInput = ({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
}) => (
  <div className="flex items-center gap-3">
    <div
      className="w-10 h-10 rounded-lg border border-border cursor-pointer overflow-hidden relative"
      style={{ backgroundColor: value }}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
    </div>
    <div className="flex-1">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground uppercase">{value}</p>
    </div>
    {value !== defaultValue && (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(defaultValue)}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="w-3 h-3" />
      </Button>
    )}
  </div>
);

// Theme option component
const ThemeOption = ({
  mode,
  label,
  icon: Icon,
  selected,
  onSelect,
}: {
  mode: ThemeMode;
  label: string;
  icon: React.ElementType;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    onClick={onSelect}
    className={cn(
      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
      selected
        ? "border-primary bg-primary/5"
        : "border-border hover:border-primary/50 hover:bg-muted/50"
    )}
  >
    <div
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center",
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="w-5 h-5" />
    </div>
    <span className={cn("text-sm font-medium", selected && "text-primary")}>{label}</span>
  </button>
);

// Text size control component
const TextSizeControl = ({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) => {
  const percentage = Math.round(value * 100);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="text-sm font-medium text-primary">{percentage}%</span>
      </div>
      <Slider
        value={[value]}
        min={0.75}
        max={1.5}
        step={0.05}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>75%</span>
        <span>100%</span>
        <span>150%</span>
      </div>
    </div>
  );
};

const AppearanceSettings = () => {
  const { navigate } = useOrgNavigation();
  const { toast } = useToast();
  const {
    pendingSettings,
    isLoading,
    isSaving,
    hasChanges,
    updatePendingSetting,
    saveSettings,
    undoChanges,
    resetToDefaults,
  } = useAppearance();

  const handleSave = async () => {
    try {
      await saveSettings();
      toast({
        title: "Settings saved",
        description: "Your appearance preferences have been saved.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save appearance settings.",
        variant: "destructive",
      });
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      toast({
        title: "Settings reset",
        description: "Your appearance has been reset to defaults.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to reset appearance settings.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
        <SideNavigation activeItem="settings" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Appearance</h1>
                  <p className="text-muted-foreground mt-1">
                    Customise how the platform looks for you
                  </p>
                </div>
                {hasChanges && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={undoChanges}
                      disabled={isSaving}
                    >
                      <Undo2 className="w-4 h-4 mr-2" />
                      Undo
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Theme */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sun className="w-5 h-5" />
                    Theme
                  </CardTitle>
                  <CardDescription>
                    Choose between light and dark mode
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <ThemeOption
                      mode="light"
                      label="Light"
                      icon={Sun}
                      selected={pendingSettings.theme === "light"}
                      onSelect={() => updatePendingSetting("theme", "light")}
                    />
                    <ThemeOption
                      mode="dark"
                      label="Dark"
                      icon={Moon}
                      selected={pendingSettings.theme === "dark"}
                      onSelect={() => updatePendingSetting("theme", "dark")}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to System Settings
                  </Button>
                </CardContent>
              </Card>

              {/* Typography */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="w-5 h-5" />
                    Typography
                  </CardTitle>
                  <CardDescription>
                    Adjust text sizes throughout the platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TextSizeControl
                    label="Task Cards"
                    description="Text size on task cards in the dashboard"
                    value={pendingSettings.taskCardTextSize}
                    onChange={(v) => updatePendingSetting("taskCardTextSize", v)}
                  />
                  <TextSizeControl
                    label="Project Cards"
                    description="Text size on project cards"
                    value={pendingSettings.projectCardTextSize}
                    onChange={(v) => updatePendingSetting("projectCardTextSize", v)}
                  />
                  <TextSizeControl
                    label="Drive Files"
                    description="Text size for files in Drive"
                    value={pendingSettings.driveFileTextSize}
                    onChange={(v) => updatePendingSetting("driveFileTextSize", v)}
                  />
                </CardContent>
              </Card>

              {/* Brand Colors - Only show in Light mode */}
              {pendingSettings.theme === "light" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Brand Colors
                    </CardTitle>
                    <CardDescription>
                      Customise the primary accent colours
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ColorInput
                      label="Green (Approved)"
                      value={pendingSettings.brandGreen}
                      defaultValue="#8CC646"
                      onChange={(v) => updatePendingSetting("brandGreen", v)}
                    />
                    <ColorInput
                      label="Coral (Rejected/Alert)"
                      value={pendingSettings.brandCoral}
                      defaultValue="#DF4C33"
                      onChange={(v) => updatePendingSetting("brandCoral", v)}
                    />
                    <ColorInput
                      label="Orange (Pending)"
                      value={pendingSettings.brandOrange}
                      defaultValue="#F5B536"
                      onChange={(v) => updatePendingSetting("brandOrange", v)}
                    />
                    <ColorInput
                      label="Teal (In Review)"
                      value={pendingSettings.brandTeal}
                      defaultValue="#176884"
                      onChange={(v) => updatePendingSetting("brandTeal", v)}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Secondary Colors - Only show in Light mode */}
              {pendingSettings.theme === "light" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Secondary Colors
                    </CardTitle>
                    <CardDescription>
                      Optional custom colours for backgrounds and text
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer overflow-hidden relative"
                        style={{ backgroundColor: pendingSettings.secondaryBackground || "#f4f4f5" }}
                      >
                        <input
                          type="color"
                          value={pendingSettings.secondaryBackground || "#f4f4f5"}
                          onChange={(e) => updatePendingSetting("secondaryBackground", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Secondary Background</Label>
                        <p className="text-xs text-muted-foreground">
                          {pendingSettings.secondaryBackground ? pendingSettings.secondaryBackground.toUpperCase() : "Default"}
                        </p>
                      </div>
                      {pendingSettings.secondaryBackground && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePendingSetting("secondaryBackground", null)}
                          className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer overflow-hidden relative"
                        style={{ backgroundColor: pendingSettings.secondaryForeground || "#52525b" }}
                      >
                        <input
                          type="color"
                          value={pendingSettings.secondaryForeground || "#52525b"}
                          onChange={(e) => updatePendingSetting("secondaryForeground", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Secondary Foreground</Label>
                        <p className="text-xs text-muted-foreground">
                          {pendingSettings.secondaryForeground ? pendingSettings.secondaryForeground.toUpperCase() : "Default"}
                        </p>
                      </div>
                      {pendingSettings.secondaryForeground && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePendingSetting("secondaryForeground", null)}
                          className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status Background Colors - Only show in Light mode */}
              {pendingSettings.theme === "light" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Status Backgrounds
                    </CardTitle>
                    <CardDescription>
                      Customise background colours for task and project status columns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer overflow-hidden relative"
                        style={{ backgroundColor: pendingSettings.statusTodoBg || "#ffffff" }}
                      >
                        <input
                          type="color"
                          value={pendingSettings.statusTodoBg || "#ffffff"}
                          onChange={(e) => updatePendingSetting("statusTodoBg", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-sm font-medium">To Do Background</Label>
                        <p className="text-xs text-muted-foreground">
                          {pendingSettings.statusTodoBg ? pendingSettings.statusTodoBg.toUpperCase() : "Default"}
                        </p>
                      </div>
                      {pendingSettings.statusTodoBg && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePendingSetting("statusTodoBg", null)}
                          className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer overflow-hidden relative"
                        style={{ backgroundColor: pendingSettings.statusInProgressBg || "#ffffff" }}
                      >
                        <input
                          type="color"
                          value={pendingSettings.statusInProgressBg || "#ffffff"}
                          onChange={(e) => updatePendingSetting("statusInProgressBg", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-sm font-medium">In Progress Background</Label>
                        <p className="text-xs text-muted-foreground">
                          {pendingSettings.statusInProgressBg ? pendingSettings.statusInProgressBg.toUpperCase() : "Default"}
                        </p>
                      </div>
                      {pendingSettings.statusInProgressBg && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePendingSetting("statusInProgressBg", null)}
                          className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer overflow-hidden relative"
                        style={{ backgroundColor: pendingSettings.statusCompleteBg || "#ffffff" }}
                      >
                        <input
                          type="color"
                          value={pendingSettings.statusCompleteBg || "#ffffff"}
                          onChange={(e) => updatePendingSetting("statusCompleteBg", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Complete Background</Label>
                        <p className="text-xs text-muted-foreground">
                          {pendingSettings.statusCompleteBg ? pendingSettings.statusCompleteBg.toUpperCase() : "Default"}
                        </p>
                      </div>
                      {pendingSettings.statusCompleteBg && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePendingSetting("statusCompleteBg", null)}
                          className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reset to Defaults */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <RotateCcw className="w-5 h-5" />
                    Reset to Default
                  </CardTitle>
                  <CardDescription>
                    Restore all appearance settings to their original values
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        Reset All Settings
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Appearance Settings?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reset all your appearance customisations including colours, text sizes, and theme preferences to their default values. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleReset}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Reset to Defaults
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>

            {/* Floating save bar */}
            {hasChanges && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full shadow-lg px-6 py-3 flex items-center gap-4 z-50">
                <span className="text-sm text-muted-foreground">You have unsaved changes</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undoChanges}
                    disabled={isSaving}
                  >
                    Undo
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <SideNavigation activeItem="settings" />
    </div>
  );
};

export default AppearanceSettings;
