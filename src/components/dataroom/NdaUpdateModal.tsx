import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileSignature, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface NdaUpdateModalProps {
  open: boolean;
  onClose: () => void;
  onSigned: () => void;
  dataRoomId: string;
  dataRoomName: string;
  ndaContent: string | null;
  userId: string;
  userEmail: string;
  userName: string;
}

const NdaUpdateModal = ({
  open,
  onClose,
  onSigned,
  dataRoomId,
  dataRoomName,
  ndaContent,
  userId,
  userEmail,
  userName,
}: NdaUpdateModalProps) => {
  const [signerName, setSignerName] = useState(userName || "");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Keyboard scroll handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const scrollAmount = 100;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        scrollContainer.scrollTop += scrollAmount;
        break;
      case 'ArrowUp':
        e.preventDefault();
        scrollContainer.scrollTop -= scrollAmount;
        break;
      case 'PageDown':
        e.preventDefault();
        scrollContainer.scrollTop += scrollContainer.clientHeight;
        break;
      case 'PageUp':
        e.preventDefault();
        scrollContainer.scrollTop -= scrollContainer.clientHeight;
        break;
      case 'Home':
        if (e.ctrlKey) {
          e.preventDefault();
          scrollContainer.scrollTop = 0;
        }
        break;
      case 'End':
        if (e.ctrlKey) {
          e.preventDefault();
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
        break;
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      setSignerName(userName || "");
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown, userName]);

  const defaultNdaContent = `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of the date of electronic signature.

1. CONFIDENTIAL INFORMATION
The Receiving Party agrees to hold in confidence all confidential information disclosed through this Data Room, including but not limited to: business plans, financial data, technical specifications, customer information, and any other proprietary materials.

2. PERMITTED USE
Confidential information may only be used for the purpose of evaluating a potential business relationship and may not be disclosed to any third party without prior written consent.

3. DURATION
This Agreement shall remain in effect for a period of two (2) years from the date of signature.

4. RETURN OF MATERIALS
Upon request, the Receiving Party shall return or destroy all confidential materials and certify such destruction in writing.

By signing below, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement.`;

  const displayContent = ndaContent || defaultNdaContent;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!signerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name to sign the NDA.",
        variant: "destructive",
      });
      return;
    }

    if (!agreed) {
      toast({
        title: "Agreement required",
        description: "Please confirm that you have read and agree to the updated NDA.",
        variant: "destructive",
      });
      return;
    }

    if (!hasSignature) {
      toast({
        title: "Signature required",
        description: "Please draw your signature in the signature box.",
        variant: "destructive",
      });
      return;
    }

    setSigning(true);

    try {
      // Create hash of NDA content
      const encoder = new TextEncoder();
      const data = encoder.encode(displayContent);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      // Upload signature to storage
      let signatureUrl: string | null = null;
      const canvas = canvasRef.current;
      if (canvas) {
        const signatureBlob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/png");
        });
        
        if (signatureBlob) {
          const fileName = `${userId}/${dataRoomId}_${Date.now()}.png`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("nda-signatures")
            .upload(fileName, signatureBlob, {
              contentType: "image/png",
              upsert: false,
            });

          if (uploadError) {
            console.error("Signature upload error:", uploadError);
          } else if (uploadData) {
            const { data: urlData } = supabase.storage
              .from("nda-signatures")
              .getPublicUrl(uploadData.path);
            signatureUrl = urlData.publicUrl;
          }
        }
      }

      // Insert new signature record (creates a new entry, keeping history)
      const { error } = await supabase
        .from("data_room_nda_signatures")
        .insert({
          data_room_id: dataRoomId,
          user_id: userId,
          signer_email: userEmail,
          signer_name: signerName.trim(),
          nda_content_hash: hashHex,
          signed_at: new Date().toISOString(),
          signature_url: signatureUrl,
        });

      if (error) throw error;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["nda-resign-check"] });
      queryClient.invalidateQueries({ queryKey: ["nda-signatures"] });
      queryClient.invalidateQueries({ queryKey: ["user-nda-signatures"] });

      toast({
        title: "NDA Re-Signed Successfully",
        description: "You can continue accessing the data room.",
      });

      onSigned();
    } catch (error: any) {
      console.error("Error re-signing NDA:", error);
      toast({
        title: "Failed to sign NDA",
        description: error.message || "An error occurred while signing.",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl h-[90vh] overflow-hidden flex flex-col min-h-0" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-500" />
            NDA Has Been Updated
          </DialogTitle>
          <DialogDescription>
            The NDA for "{dataRoomName}" has been updated. Please review and re-sign to continue access.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 pr-4" tabIndex={0}>
          <div className="space-y-4">
            {/* Warning Banner */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Action Required</p>
                <p>The data room owner has updated the Non-Disclosure Agreement. Your previous signature is no longer valid for the current terms. Please review and sign the updated agreement to regain access.</p>
              </div>
            </div>

            {/* NDA Content */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Updated Agreement Terms</Label>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <pre className="text-xs whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">
                  {displayContent}
                </pre>
              </div>
            </div>

            {/* Signer Name */}
            <div className="space-y-2">
              <Label htmlFor="signer-name" className="text-sm font-medium">
                Full Legal Name
              </Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full legal name"
                disabled={signing}
              />
            </div>

            {/* Signature Canvas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Digital Signature</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                  disabled={signing}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
              <div className="relative border rounded-lg bg-white overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={120}
                  className="w-full h-28 cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-sm text-muted-foreground/50">
                      Draw your signature here
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-start gap-3 pb-2">
              <Checkbox
                id="agree-nda-update"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                disabled={signing}
              />
              <label
                htmlFor="agree-nda-update"
                className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
              >
                I have read and understood the updated Non-Disclosure Agreement above, and I agree to be bound by its terms and conditions.
              </label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            onClick={handleSign}
            disabled={signing || !signerName.trim() || !agreed || !hasSignature}
            className="gap-2 bg-emerald-500 hover:bg-emerald-600 w-full sm:w-auto"
          >
            {signing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <FileSignature className="w-4 h-4" />
                Re-Sign & Accept
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NdaUpdateModal;
