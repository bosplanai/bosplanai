import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eraser, Check, Pen, Type, RotateCcw, Star, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SavedSignature {
  id: string;
  name: string;
  signature_data: string;
  is_default: boolean;
  created_at: string;
}

interface SignaturePadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertSignature: (signatureDataUrl: string) => void;
}

export function SignaturePadDialog({
  open,
  onOpenChange,
  onInsertSignature,
}: SignaturePadDialogProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState<"script" | "formal" | "casual">("script");
  const [penColor, setPenColor] = useState("#000000");
  const [penSize, setPenSize] = useState(2);
  const [signatureName, setSignatureName] = useState("");
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("saved");

  const fonts = {
    script: "'Brush Script MT', 'Segoe Script', cursive",
    formal: "'Times New Roman', Georgia, serif",
    casual: "'Comic Sans MS', 'Marker Felt', cursive",
  };

  // Fetch saved signatures
  useEffect(() => {
    if (open && user) {
      fetchSavedSignatures();
    }
  }, [open, user]);

  const fetchSavedSignatures = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_signatures")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedSignatures(data || []);
      
      // If user has saved signatures, show saved tab, otherwise show draw tab
      if (data && data.length > 0) {
        setActiveTab("saved");
      } else {
        setActiveTab("draw");
      }
    } catch (error) {
      console.error("Error fetching signatures:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize canvas
  useEffect(() => {
    if (open && canvasRef.current && activeTab === "draw") {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [open, penColor, penSize, activeTab]);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const generateTypedSignature = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `48px ${fonts[selectedFont]}`;
    ctx.fillStyle = penColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
  }, [typedName, selectedFont, penColor, fonts]);

  const getSignatureData = useCallback(() => {
    if (activeTab === "draw") {
      const canvas = canvasRef.current;
      if (canvas && hasSignature) {
        return canvas.toDataURL("image/png");
      }
    } else if (activeTab === "type" && typedName.trim()) {
      return generateTypedSignature();
    }
    return null;
  }, [activeTab, hasSignature, typedName, generateTypedSignature]);

  const handleSaveSignature = async () => {
    if (!user) {
      toast.error("Please sign in to save signatures");
      return;
    }

    const signatureData = getSignatureData();
    if (!signatureData) {
      toast.error("Please create a signature first");
      return;
    }

    if (!signatureName.trim()) {
      toast.error("Please enter a name for your signature");
      return;
    }

    setIsSaving(true);
    try {
      const isFirst = savedSignatures.length === 0;
      
      const { error } = await supabase
        .from("user_signatures")
        .insert({
          user_id: user.id,
          name: signatureName.trim(),
          signature_data: signatureData,
          is_default: isFirst,
        });

      if (error) throw error;

      toast.success("Signature saved");
      setSignatureName("");
      fetchSavedSignatures();
      setActiveTab("saved");
    } catch (error) {
      console.error("Error saving signature:", error);
      toast.error("Failed to save signature");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (signatureId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_signatures")
        .update({ is_default: true })
        .eq("id", signatureId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Default signature updated");
      fetchSavedSignatures();
    } catch (error) {
      console.error("Error updating default:", error);
      toast.error("Failed to update default signature");
    }
  };

  const handleDeleteSignature = async (signatureId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_signatures")
        .delete()
        .eq("id", signatureId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Signature deleted");
      fetchSavedSignatures();
    } catch (error) {
      console.error("Error deleting signature:", error);
      toast.error("Failed to delete signature");
    }
  };

  const handleInsertSaved = (signature: SavedSignature) => {
    onInsertSignature(signature.signature_data);
    onOpenChange(false);
  };

  const handleInsert = useCallback(() => {
    const signatureData = getSignatureData();
    if (signatureData) {
      onInsertSignature(signatureData);
      onOpenChange(false);
      // Reset state
      setTypedName("");
      setHasSignature(false);
      setSignatureName("");
      clearCanvas();
    }
  }, [getSignatureData, onInsertSignature, onOpenChange, clearCanvas]);

  const colorOptions = [
    { value: "#000000", label: "Black" },
    { value: "#1a365d", label: "Navy" },
    { value: "#2d3748", label: "Dark Gray" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5" />
            Insert Digital Signature
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="saved" className="gap-2">
              <Star className="w-4 h-4" />
              Saved
            </TabsTrigger>
            <TabsTrigger value="draw" className="gap-2">
              <Pen className="w-4 h-4" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="gap-2">
              <Type className="w-4 h-4" />
              Type
            </TabsTrigger>
          </TabsList>

          {/* Saved Signatures Tab */}
          <TabsContent value="saved" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedSignatures.length === 0 ? (
              <div className="text-center py-8">
                <Pen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No saved signatures yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create one in the Draw or Type tab
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-3 pr-4">
                  {savedSignatures.map((signature) => (
                    <div
                      key={signature.id}
                      className={cn(
                        "border rounded-lg p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors",
                        signature.is_default && "border-primary bg-primary/5"
                      )}
                    >
                      <div
                        className="flex-1 h-16 bg-white rounded border overflow-hidden cursor-pointer"
                        onClick={() => handleInsertSaved(signature)}
                      >
                        <img
                          src={signature.signature_data}
                          alt={signature.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{signature.name}</span>
                        {signature.is_default && (
                          <span className="text-xs text-primary">Default</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!signature.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSetDefault(signature.id)}
                            title="Set as default"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSignature(signature.id)}
                          title="Delete signature"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Draw Tab */}
          <TabsContent value="draw" className="space-y-4">
            {/* Drawing Options */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Color:</Label>
                <div className="flex gap-1">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setPenColor(color.value)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-transform",
                        penColor === color.value ? "border-primary scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Size:</Label>
                <select
                  value={penSize}
                  onChange={(e) => setPenSize(Number(e.target.value))}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value={1}>Fine</option>
                  <option value={2}>Medium</option>
                  <option value={3}>Bold</option>
                </select>
              </div>
            </div>

            {/* Canvas */}
            <div className="border rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={450}
                height={150}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Draw your signature above
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </Button>
            </div>

            {/* Save signature option */}
            {hasSignature && user && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Signature name (e.g., Main Signature)"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveSignature}
                  disabled={isSaving || !signatureName.trim()}
                  className="gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                  Save
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInsert}
                disabled={!hasSignature}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                Insert Signature
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Type Tab */}
          <TabsContent value="type" className="space-y-4">
            {/* Typed Name Input */}
            <div className="space-y-2">
              <Label>Type your name</Label>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="John Doe"
                className="text-lg"
              />
            </div>

            {/* Font Selection */}
            <div className="space-y-2">
              <Label>Select style</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["script", "formal", "casual"] as const).map((font) => (
                  <button
                    key={font}
                    onClick={() => setSelectedFont(font)}
                    className={cn(
                      "p-3 border rounded-lg text-center transition-colors",
                      selectedFont === font
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span
                      style={{ fontFamily: fonts[font], color: penColor }}
                      className="text-xl"
                    >
                      {typedName || "Preview"}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {font}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">Color:</Label>
              <div className="flex gap-1">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setPenColor(color.value)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform",
                      penColor === color.value ? "border-primary scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            {typedName && (
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div
                  style={{
                    fontFamily: fonts[selectedFont],
                    fontSize: "48px",
                    color: penColor,
                    textAlign: "center",
                  }}
                >
                  {typedName}
                </div>
              </div>
            )}

            {/* Save signature option */}
            {typedName.trim() && user && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Signature name (e.g., Typed Signature)"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveSignature}
                  disabled={isSaving || !signatureName.trim()}
                  className="gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                  Save
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInsert}
                disabled={!typedName.trim()}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                Insert Signature
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
