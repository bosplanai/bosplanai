import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Default colors in HEX
const DEFAULT_COLORS = {
  brandGreen: "#8CC646",
  brandCoral: "#DF4C33",
  brandOrange: "#F5B536",
  brandTeal: "#176884",
  secondaryBackground: null as string | null,
  secondaryForeground: null as string | null,
  statusTodoBg: null as string | null,
  statusInProgressBg: null as string | null,
  statusCompleteBg: null as string | null,
};

// Default text sizes (1.0 = 100% = default)
const DEFAULT_TEXT_SIZES = {
  taskCard: 1.0,
  projectCard: 1.0,
  driveFile: 1.0,
};

export type ThemeMode = "light" | "dark";

export interface AppearanceSettings {
  // Typography
  taskCardTextSize: number;
  projectCardTextSize: number;
  driveFileTextSize: number;
  
  // Brand colors
  brandGreen: string;
  brandCoral: string;
  brandOrange: string;
  brandTeal: string;
  
  // Secondary colors
  secondaryBackground: string | null;
  secondaryForeground: string | null;
  
  // Status background colors
  statusTodoBg: string | null;
  statusInProgressBg: string | null;
  statusCompleteBg: string | null;
  
  // Theme
  theme: ThemeMode;
}

interface AppearanceContextType {
  settings: AppearanceSettings;
  pendingSettings: AppearanceSettings;
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  
  // Actions
  updatePendingSetting: <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => void;
  saveSettings: () => Promise<void>;
  undoChanges: () => void;
  resetToDefaults: () => Promise<void>;
}

const defaultSettings: AppearanceSettings = {
  taskCardTextSize: DEFAULT_TEXT_SIZES.taskCard,
  projectCardTextSize: DEFAULT_TEXT_SIZES.projectCard,
  driveFileTextSize: DEFAULT_TEXT_SIZES.driveFile,
  brandGreen: DEFAULT_COLORS.brandGreen,
  brandCoral: DEFAULT_COLORS.brandCoral,
  brandOrange: DEFAULT_COLORS.brandOrange,
  brandTeal: DEFAULT_COLORS.brandTeal,
  secondaryBackground: DEFAULT_COLORS.secondaryBackground,
  secondaryForeground: DEFAULT_COLORS.secondaryForeground,
  statusTodoBg: DEFAULT_COLORS.statusTodoBg,
  statusInProgressBg: DEFAULT_COLORS.statusInProgressBg,
  statusCompleteBg: DEFAULT_COLORS.statusCompleteBg,
  theme: "light",
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

// Helper to convert hex to HSL values string
function hexToHSL(hex: string): string {
  // Remove #
  hex = hex.replace(/^#/, "");
  
  // Parse
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Apply CSS variables for colors
function applyColorVariables(settings: AppearanceSettings) {
  const root = document.documentElement;
  
  // Apply brand colors directly to the base CSS variables so all components using them update
  root.style.setProperty("--brand-green", hexToHSL(settings.brandGreen));
  root.style.setProperty("--brand-coral", hexToHSL(settings.brandCoral));
  root.style.setProperty("--brand-orange", hexToHSL(settings.brandOrange));
  root.style.setProperty("--brand-teal", hexToHSL(settings.brandTeal));
  
  // Apply text size multipliers
  root.style.setProperty("--task-card-text-size", `${settings.taskCardTextSize}`);
  root.style.setProperty("--project-card-text-size", `${settings.projectCardTextSize}`);
  root.style.setProperty("--drive-file-text-size", `${settings.driveFileTextSize}`);
  
  // Apply secondary colors if set
  if (settings.secondaryBackground) {
    root.style.setProperty("--secondary", hexToHSL(settings.secondaryBackground));
  }
  
  if (settings.secondaryForeground) {
    root.style.setProperty("--secondary-foreground", hexToHSL(settings.secondaryForeground));
  }
  
  // Apply status background colors if set (light mode only)
  if (settings.statusTodoBg) {
    root.style.setProperty("--status-todo-bg", settings.statusTodoBg);
  } else {
    root.style.removeProperty("--status-todo-bg");
  }
  
  if (settings.statusInProgressBg) {
    root.style.setProperty("--status-in-progress-bg", settings.statusInProgressBg);
  } else {
    root.style.removeProperty("--status-in-progress-bg");
  }
  
  if (settings.statusCompleteBg) {
    root.style.setProperty("--status-complete-bg", settings.statusCompleteBg);
  } else {
    root.style.removeProperty("--status-complete-bg");
  }
}

// Apply theme
// Apply theme
function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [pendingSettings, setPendingSettings] = useState<AppearanceSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(pendingSettings);
  
  // Fetch settings from database
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) {
        setSettings(defaultSettings);
        setPendingSettings(defaultSettings);
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from("user_appearance_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          // Database stores text sizes as integers (100 = 100%), convert to decimal (1.0 = 100%)
          const toDecimal = (val: number | null | undefined, defaultVal: number) => {
            if (val === null || val === undefined) return defaultVal;
            // If value is > 10, it's stored as percentage (e.g., 100), convert to decimal
            return val > 10 ? val / 100 : val;
          };
          
          const loadedSettings: AppearanceSettings = {
            taskCardTextSize: toDecimal(data.task_card_text_size, 1.0),
            projectCardTextSize: toDecimal(data.project_card_text_size, 1.0),
            driveFileTextSize: toDecimal(data.drive_file_text_size, 1.0),
            brandGreen: data.brand_green || DEFAULT_COLORS.brandGreen,
            brandCoral: data.brand_coral || DEFAULT_COLORS.brandCoral,
            brandOrange: data.brand_orange || DEFAULT_COLORS.brandOrange,
            brandTeal: data.brand_teal || DEFAULT_COLORS.brandTeal,
            secondaryBackground: data.secondary_background,
            secondaryForeground: data.secondary_foreground,
            statusTodoBg: (data as any).status_todo_bg || null,
            statusInProgressBg: (data as any).status_in_progress_bg || null,
            statusCompleteBg: (data as any).status_complete_bg || null,
            theme: (data.theme === "light" || data.theme === "dark") ? data.theme : "light",
          };
          setSettings(loadedSettings);
          setPendingSettings(loadedSettings);
        } else {
          setSettings(defaultSettings);
          setPendingSettings(defaultSettings);
        }
      } catch (err) {
        console.error("Failed to load appearance settings:", err);
        setSettings(defaultSettings);
        setPendingSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [user]);
  
  // Apply settings when they change (live preview uses pendingSettings)
  useEffect(() => {
    applyColorVariables(pendingSettings);
    applyTheme(pendingSettings.theme);
  }, [pendingSettings]);
  
  
  const updatePendingSetting = useCallback(<K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    setPendingSettings(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const saveSettings = useCallback(async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_appearance_settings")
        .upsert({
          user_id: user.id,
          task_card_text_size: pendingSettings.taskCardTextSize,
          project_card_text_size: pendingSettings.projectCardTextSize,
          drive_file_text_size: pendingSettings.driveFileTextSize,
          brand_green: pendingSettings.brandGreen,
          brand_coral: pendingSettings.brandCoral,
          brand_orange: pendingSettings.brandOrange,
          brand_teal: pendingSettings.brandTeal,
          secondary_background: pendingSettings.secondaryBackground,
          secondary_foreground: pendingSettings.secondaryForeground,
          status_todo_bg: pendingSettings.statusTodoBg,
          status_in_progress_bg: pendingSettings.statusInProgressBg,
          status_complete_bg: pendingSettings.statusCompleteBg,
          theme: pendingSettings.theme,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: "user_id",
        });
      
      if (error) throw error;
      
      setSettings(pendingSettings);
    } catch (err) {
      console.error("Failed to save appearance settings:", err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [user, pendingSettings]);
  
  const undoChanges = useCallback(() => {
    setPendingSettings(settings);
  }, [settings]);
  
  const resetToDefaults = useCallback(async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Delete the user's settings to reset to defaults
      await supabase
        .from("user_appearance_settings")
        .delete()
        .eq("user_id", user.id);
      
      setSettings(defaultSettings);
      setPendingSettings(defaultSettings);
    } catch (err) {
      console.error("Failed to reset appearance settings:", err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [user]);
  
  return (
    <AppearanceContext.Provider
      value={{
        settings,
        pendingSettings,
        isLoading,
        isSaving,
        hasChanges,
        updatePendingSetting,
        saveSettings,
        undoChanges,
        resetToDefaults,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}
