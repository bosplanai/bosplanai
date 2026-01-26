import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Image } from "@tiptap/extension-image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SignaturePadDialog } from "./SignaturePadDialog";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Redo,
  Undo,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Highlighter,
  Minus,
  PenTool,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  contentType: "rich_text" | "plain_text";
  isReadOnly?: boolean;
  className?: string;
}

export function DocumentEditor({
  content,
  onContentChange,
  contentType,
  isReadOnly = false,
  className,
}: DocumentEditorProps) {
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing your document...",
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph", "tableCell", "tableHeader"],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'document-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'document-image',
        },
      }),
    ],
    content: content,
    editable: !isReadOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6 document-editor-content",
      },
    },
  });

  // Update content when it changes externally (from realtime sync)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // Update editable state when isReadOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly);
    }
  }, [editor, isReadOnly]);

  const handleInsertSignature = (signatureDataUrl: string) => {
    if (editor) {
      editor.chain().focus().setImage({ 
        src: signatureDataUrl,
        alt: 'Digital Signature',
      }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Toolbar */}
      {!isReadOnly && (
        <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              tooltip="Undo"
            >
              <Undo className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              tooltip="Redo"
            >
              <Redo className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive("heading", { level: 1 })}
              tooltip="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive("heading", { level: 2 })}
              tooltip="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive("heading", { level: 3 })}
              tooltip="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              tooltip="Bold"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              tooltip="Italic"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              tooltip="Underline"
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              tooltip="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              active={editor.isActive("highlight")}
              tooltip="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive("code")}
              tooltip="Inline Code"
            >
              <Code className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={editor.isActive({ textAlign: "left" })}
              tooltip="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              active={editor.isActive({ textAlign: "center" })}
              tooltip="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              active={editor.isActive({ textAlign: "right" })}
              tooltip="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              tooltip="Bullet List"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              tooltip="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              tooltip="Quote"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              tooltip="Horizontal Rule"
            >
              <Minus className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Signature Button */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => setShowSignatureDialog(true)}
              tooltip="Insert Digital Signature"
            >
              <PenTool className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>
      )}

      {/* Signature Dialog */}
      <SignaturePadDialog
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        onInsertSignature={handleInsertSignature}
      />


      {/* Editor Content with document styling */}
      <div className="flex-1 overflow-auto bg-white dark:bg-background">
        <style>{`
          .document-editor-content .document-content { all: unset; display: block; }
          .document-editor-content .docx-content,
          .document-editor-content .xlsx-content,
          .document-editor-content .pdf-content { font-family: inherit; }
          
          /* Table styles */
          .document-editor-content table,
          .document-editor-content .document-table,
          .document-editor-content .excel-table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
          }
          .document-editor-content table td,
          .document-editor-content table th {
            border: 1px solid hsl(var(--border));
            padding: 8px 12px;
            min-width: 50px;
          }
          .document-editor-content table th {
            background-color: hsl(var(--muted));
            font-weight: 600;
          }
          .document-editor-content table tr:nth-child(even) td {
            background-color: hsl(var(--muted) / 0.3);
          }
          
          /* Excel specific */
          .document-editor-content .sheet-name {
            font-size: 1.25em;
            font-weight: bold;
            margin: 1.5em 0 0.5em 0;
            padding-bottom: 0.25em;
            border-bottom: 2px solid hsl(var(--primary));
            color: hsl(var(--foreground));
          }
          .document-editor-content .excel-sheet {
            margin-bottom: 2em;
          }
          
          /* PDF specific */
          .document-editor-content .pdf-page {
            padding: 1em 0;
          }
          .document-editor-content .page-break {
            border: none;
            border-top: 2px dashed hsl(var(--border));
            margin: 2em 0;
          }
          
          /* Document title/subtitle */
          .document-editor-content .document-title {
            font-size: 2em;
            text-align: center;
            margin-bottom: 0.5em;
          }
          .document-editor-content .document-subtitle {
            font-size: 1.25em;
            text-align: center;
            color: hsl(var(--muted-foreground));
            margin-bottom: 1.5em;
          }
          
          /* Images */
          .document-editor-content img,
          .document-editor-content .document-image {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
          }
          
          /* Digital Signature styles */
          .document-editor-content img[alt="Digital Signature"] {
            max-width: 250px;
            height: auto;
            margin: 0.5em 0;
            padding: 4px;
            border: 1px dashed hsl(var(--border));
            border-radius: 4px;
            background: transparent;
          }
          .document-editor-content img[alt="Digital Signature"]:hover {
            border-color: hsl(var(--primary));
          }
          
          /* Blockquotes */
          .document-editor-content blockquote {
            border-left: 4px solid hsl(var(--border));
            margin: 1em 0;
            padding-left: 1em;
            color: hsl(var(--muted-foreground));
          }
          .document-editor-content blockquote.intense {
            border-left-color: hsl(var(--primary));
            font-style: italic;
          }
        `}</style>
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  size?: "default" | "sm";
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  tooltip,
  size = "default",
  children,
}: ToolbarButtonProps) {
  const button = (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        size === "sm" ? "h-6 w-6" : "h-8 w-8",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </Button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
