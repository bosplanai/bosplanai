import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bold,
  Italic,
  Underline,
  Paperclip,
  Send,
  Save,
  FileText,
  Loader2,
  Mail,
  Phone,
  Globe,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpdeskTicket } from "@/hooks/useHelpdeskTickets";
import { useResponseTemplates, ResponseTemplate } from "@/hooks/useResponseTemplates";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TicketDetailDialogProps {
  ticket: HelpdeskTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  open: { label: "Open", className: "bg-brand-green text-white" },
  under_review: { label: "Under Review", className: "bg-brand-orange text-white" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

const channelIcons = {
  web: Globe,
  email: Mail,
  phone: Phone,
};

export const TicketDetailDialog = ({
  ticket,
  open,
  onOpenChange,
}: TicketDetailDialogProps) => {
  const [responseContent, setResponseContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { templates, createTemplate } = useResponseTemplates();
  const { organization } = useOrganization();
  const { toast } = useToast();

  if (!ticket) return null;

  const status = statusConfig[ticket.status];
  const ChannelIcon = channelIcons[ticket.channel];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " at " + date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const applyFormatting = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async () => {
    const urls: string[] = [];
    
    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      const filePath = `${organization?.id}/${ticket.id}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('helpdesk-response-attachments')
        .upload(filePath, file);

      if (error) {
        console.error('Error uploading file:', error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('helpdesk-response-attachments')
        .getPublicUrl(filePath);

      urls.push(urlData.publicUrl);
    }

    return urls;
  };

  const handleSendResponse = async () => {
    const content = editorRef.current?.innerHTML || "";
    
    if (!content.trim()) {
      toast({
        title: "Empty response",
        description: "Please write a response before sending.",
        variant: "destructive",
      });
      return;
    }

    if (!ticket.contact_email) {
      toast({
        title: "No email address",
        description: "This ticket does not have a contact email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Upload attachments first
      const attachmentUrls = await uploadAttachments();

      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-ticket-response', {
        body: {
          ticketId: ticket.id,
          responseContent: content,
          attachmentUrls,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send response');
      }

      toast({
        title: "Response sent",
        description: "Your response has been sent to the customer.",
      });

      // Clear the editor
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setResponseContent("");
      setAttachments([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending response:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    const content = editorRef.current?.innerHTML || "";
    
    if (!content.trim()) {
      toast({
        title: "Empty response",
        description: "Please write a response before saving as template.",
        variant: "destructive",
      });
      return;
    }

    if (!templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a name for your template.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingTemplate(true);
    await createTemplate(templateName, content);
    setIsSavingTemplate(false);
    setShowTemplateInput(false);
    setTemplateName("");
  };

  const insertTemplate = (template: ResponseTemplate) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = template.content;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-brand-teal font-mono">{ticket.ticket_number}</span>
            <Badge className={cn("font-medium", status.className)}>
              {status.label}
            </Badge>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <ChannelIcon className="w-4 h-4" />
              <span className="capitalize">{ticket.channel}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Ticket Details */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{ticket.subject}</h3>
              <p className="text-sm text-muted-foreground">
                Created {formatDate(ticket.created_at)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {ticket.contact_name && (
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">{ticket.contact_name}</span>
                </div>
              )}
              {ticket.contact_email && (
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-medium">{ticket.contact_email}</span>
                </div>
              )}
              {ticket.contact_phone && (
                <div>
                  <span className="text-muted-foreground">Phone:</span>{" "}
                  <span className="font-medium">{ticket.contact_phone}</span>
                </div>
              )}
            </div>

            {ticket.details && (
              <div className="bg-secondary/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Details</h4>
                <p className="text-sm whitespace-pre-wrap">{ticket.details}</p>
              </div>
            )}

            {ticket.attachment_url && (
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <a
                  href={ticket.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-teal hover:underline text-sm"
                >
                  {ticket.attachment_name || "View Attachment"}
                </a>
              </div>
            )}

            <Separator />

            {/* Response Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Write Response</h4>
                
                {/* Template Library */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Templates ({templates.length})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end">
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">Response Templates</h5>
                      {templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No templates saved yet. Write a response and save it as a template.
                        </p>
                      ) : (
                        <ScrollArea className="h-48">
                          <div className="space-y-1">
                            {templates.map((template) => (
                              <button
                                key={template.id}
                                onClick={() => insertTemplate(template)}
                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors"
                              >
                                {template.name}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Rich Text Toolbar */}
              <div className="flex items-center gap-1 border rounded-t-lg p-2 bg-secondary/30">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormatting("bold")}
                  className="h-8 w-8 p-0"
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormatting("italic")}
                  className="h-8 w-8 p-0"
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormatting("underline")}
                  className="h-8 w-8 p-0"
                >
                  <Underline className="w-4 h-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-2" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-2"
                >
                  <Paperclip className="w-4 h-4 mr-1" />
                  Attach
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Editor */}
              <div
                ref={editorRef}
                contentEditable
                className="min-h-[150px] border border-t-0 rounded-b-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-1 empty:before:content-['Write_your_response_here...'] empty:before:text-muted-foreground"
                onInput={(e) => setResponseContent(e.currentTarget.innerHTML)}
              />

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1 text-sm"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="max-w-32 truncate">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleSendResponse}
                  disabled={isSending}
                  className="bg-brand-teal hover:bg-brand-teal/90"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Response
                </Button>

                {showTemplateInput ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      placeholder="Template name..."
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="max-w-48"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveAsTemplate}
                      disabled={isSavingTemplate}
                    >
                      {isSavingTemplate ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowTemplateInput(false);
                        setTemplateName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowTemplateInput(true)}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Template
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
