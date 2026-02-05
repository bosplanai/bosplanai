import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Link as LinkIcon,
  ExternalLink,
  Calendar,
  FileText,
  Users,
  Settings,
  Star,
  Heart,
  Bell,
  Mail,
  Phone,
  Globe,
  HelpCircle,
  Info,
  MessageSquare,
  Bookmark,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomButton {
  id: string;
  title: string;
  icon: string;
  url: string;
  is_enabled: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_ICONS = [
  { value: "link", label: "Link", icon: LinkIcon },
  { value: "external-link", label: "External Link", icon: ExternalLink },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "file-text", label: "Document", icon: FileText },
  { value: "users", label: "Users", icon: Users },
  { value: "settings", label: "Settings", icon: Settings },
  { value: "star", label: "Star", icon: Star },
  { value: "heart", label: "Heart", icon: Heart },
  { value: "bell", label: "Bell", icon: Bell },
  { value: "mail", label: "Mail", icon: Mail },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "globe", label: "Globe", icon: Globe },
  { value: "help-circle", label: "Help", icon: HelpCircle },
  { value: "info", label: "Info", icon: Info },
  { value: "message-square", label: "Message", icon: MessageSquare },
  { value: "bookmark", label: "Bookmark", icon: Bookmark },
];

const getIconComponent = (iconName: string) => {
  const iconConfig = AVAILABLE_ICONS.find(i => i.value === iconName);
  return iconConfig?.icon || LinkIcon;
};

const CustomButtonsSection = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<CustomButton | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    icon: "link",
    url: "",
  });

  // Fetch all custom buttons
  const { data: buttons = [], isLoading } = useQuery({
    queryKey: ["custom-nav-buttons-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-custom-buttons", {
        body: { action: "list" },
      });
      if (error) throw error;
      return (data?.buttons || []) as CustomButton[];
    },
  });

  // Create button mutation
  const createMutation = useMutation({
    mutationFn: async (buttonData: { title: string; icon: string; url: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-custom-buttons", {
        body: { 
          action: "create", 
          button: { 
            ...buttonData, 
            is_enabled: true, 
            position: buttons.length 
          } 
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-nav-buttons-admin"] });
      queryClient.invalidateQueries({ queryKey: ["custom-nav-buttons"] });
      setIsAddDialogOpen(false);
      setFormData({ title: "", icon: "link", url: "" });
      toast.success("Custom button created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create button");
    },
  });

  // Update button mutation
  const updateMutation = useMutation({
    mutationFn: async (button: Partial<CustomButton> & { id: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-custom-buttons", {
        body: { action: "update", button },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-nav-buttons-admin"] });
      queryClient.invalidateQueries({ queryKey: ["custom-nav-buttons"] });
      setEditingButton(null);
      setFormData({ title: "", icon: "link", url: "" });
      toast.success("Custom button updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update button");
    },
  });

  // Delete button mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("manage-custom-buttons", {
        body: { action: "delete", button: { id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-nav-buttons-admin"] });
      queryClient.invalidateQueries({ queryKey: ["custom-nav-buttons"] });
      toast.success("Custom button deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete button");
    },
  });

  // Toggle button enabled state
  const handleToggle = (button: CustomButton) => {
    updateMutation.mutate({ id: button.id, is_enabled: !button.is_enabled });
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.url.trim()) {
      toast.error("Title and URL are required");
      return;
    }

    if (editingButton) {
      updateMutation.mutate({
        id: editingButton.id,
        title: formData.title,
        icon: formData.icon,
        url: formData.url,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (button: CustomButton) => {
    setEditingButton(button);
    setFormData({
      title: button.title,
      icon: button.icon,
      url: button.url,
    });
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingButton(null);
    setFormData({ title: "", icon: "link", url: "" });
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-violet-400" />
              Custom Buttons
            </CardTitle>
            <CardDescription className="text-slate-400">
              Add custom buttons to the right-hand side navigation menu
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
                <Plus className="w-4 h-4" />
                Add Button
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Add Custom Button</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Create a new button for the navigation menu
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Button title"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Icon</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select an icon" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {AVAILABLE_ICONS.map((iconOption) => {
                        const IconComp = iconOption.icon;
                        return (
                          <SelectItem 
                            key={iconOption.value} 
                            value={iconOption.value}
                            className="text-white hover:bg-slate-600"
                          >
                            <div className="flex items-center gap-2">
                              <IconComp className="w-4 h-4" />
                              {iconOption.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">URL</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={closeDialog} className="text-slate-300">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Button
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : buttons.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No custom buttons yet</p>
            <p className="text-sm">Click "Add Button" to create your first custom navigation button</p>
          </div>
        ) : (
          <div className="space-y-3">
            {buttons.map((button) => {
              const IconComp = getIconComponent(button.icon);
              return (
                <div
                  key={button.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50 border border-slate-600"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <IconComp className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{button.title}</h4>
                      <p className="text-sm text-slate-400 truncate max-w-[300px]">{button.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">
                        {button.is_enabled ? "Visible" : "Hidden"}
                      </span>
                      <Switch
                        checked={button.is_enabled}
                        onCheckedChange={() => handleToggle(button)}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                    <Dialog open={editingButton?.id === button.id} onOpenChange={(open) => !open && closeDialog()}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-white"
                          onClick={() => openEditDialog(button)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-800 border-slate-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">Edit Custom Button</DialogTitle>
                          <DialogDescription className="text-slate-400">
                            Update the button details
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label className="text-slate-300">Title</Label>
                            <Input
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              placeholder="Button title"
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-300">Icon</Label>
                            <Select
                              value={formData.icon}
                              onValueChange={(value) => setFormData({ ...formData, icon: value })}
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                <SelectValue placeholder="Select an icon" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600">
                                {AVAILABLE_ICONS.map((iconOption) => {
                                  const IconComp = iconOption.icon;
                                  return (
                                    <SelectItem 
                                      key={iconOption.value} 
                                      value={iconOption.value}
                                      className="text-white hover:bg-slate-600"
                                    >
                                      <div className="flex items-center gap-2">
                                        <IconComp className="w-4 h-4" />
                                        {iconOption.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-300">URL</Label>
                            <Input
                              value={formData.url}
                              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                              placeholder="https://example.com"
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="ghost" onClick={closeDialog} className="text-slate-300">
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleSubmit} 
                            disabled={updateMutation.isPending}
                            className="bg-violet-600 hover:bg-violet-700"
                          >
                            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => deleteMutation.mutate(button.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomButtonsSection;
