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
import Link from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import FontFamily from "@tiptap/extension-font-family";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Link as LinkIcon,
  Palette,
  Type,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  contentType: "rich_text" | "plain_text";
  isReadOnly?: boolean;
  className?: string;
}

// Font family options
const fontFamilies = [
  { value: "default", label: "Default" },
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
  { value: "Courier New", label: "Courier New" },
  { value: "Calibri", label: "Calibri" },
  { value: "Tahoma", label: "Tahoma" },
];

// Common text colors
const textColors = [
  { value: "#000000", label: "Black" },
  { value: "#374151", label: "Gray" },
  { value: "#DC2626", label: "Red" },
  { value: "#2563EB", label: "Blue" },
  { value: "#16A34A", label: "Green" },
  { value: "#9333EA", label: "Purple" },
  { value: "#EA580C", label: "Orange" },
  { value: "#0891B2", label: "Cyan" },
];

export function DocumentEditor({
  content,
  onContentChange,
  contentType,
  isReadOnly = false,
  className,
}: DocumentEditorProps) {
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  
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
        multicolor: true,
        HTMLAttributes: {
          class: 'highlight',
        },
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
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'document-link',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Subscript,
      Superscript,
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

  const handleSetLink = () => {
    if (!editor) return;
    
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setShowLinkPopover(false);
    setLinkUrl("");
  };

  const handleSetColor = (color: string) => {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
  };

  const handleSetFontFamily = (fontFamily: string) => {
    if (!editor) return;
    if (fontFamily === "default") {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      editor.chain().focus().setFontFamily(fontFamily).run();
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

          {/* Font Family Selector */}
          <Select onValueChange={handleSetFontFamily} defaultValue="default">
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <Type className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map((font) => (
                <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value !== 'default' ? font.value : 'inherit' }}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              active={editor.isActive("subscript")}
              tooltip="Subscript"
            >
              <SubscriptIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              active={editor.isActive("superscript")}
              tooltip="Superscript"
            >
              <SuperscriptIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Text Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center">
                      <Palette className="h-4 w-4" />
                      <div 
                        className="h-1 w-4 mt-0.5 rounded-sm" 
                        style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Text Color</TooltipContent>
                </Tooltip>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-4 gap-1">
                {textColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleSetColor(color.value)}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-1">
                <Input
                  type="color"
                  className="w-8 h-8 p-0 border-0"
                  onChange={(e) => handleSetColor(e.target.value)}
                />
                <span className="text-xs text-muted-foreground self-center">Custom</span>
              </div>
            </PopoverContent>
          </Popover>

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

          {/* Link Button */}
          <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", editor.isActive("link") && "bg-accent text-accent-foreground")}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <LinkIcon className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Insert Link</TooltipContent>
                </Tooltip>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Link URL</label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetLink()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSetLink}>
                    {editor.isActive("link") ? "Update Link" : "Add Link"}
                  </Button>
                  {editor.isActive("link") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        editor.chain().focus().unsetLink().run();
                        setShowLinkPopover(false);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

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
            page-break-after: always;
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
          
          /* Links */
          .document-editor-content a,
          .document-editor-content .document-link {
            color: hsl(var(--primary));
            text-decoration: underline;
            cursor: pointer;
          }
          .document-editor-content a:hover,
          .document-editor-content .document-link:hover {
            color: hsl(var(--primary) / 0.8);
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
          
          /* Subscript and Superscript */
          .document-editor-content sub {
            font-size: 0.75em;
            vertical-align: sub;
          }
          .document-editor-content sup {
            font-size: 0.75em;
            vertical-align: super;
          }
          
          /* Highlight colors */
          .document-editor-content mark,
          .document-editor-content .highlight {
            background-color: #ffff00;
            padding: 0.1em 0.2em;
            border-radius: 2px;
          }
          
          /* Preserve inline styles from Word documents */
          .document-editor-content [style*="color"] { color: inherit; }
          .document-editor-content [style*="font-family"] { font-family: inherit; }
          .document-editor-content [style*="font-size"] { font-size: inherit; }
          .document-editor-content [style*="background-color"] { background-color: inherit; }
          .document-editor-content [style*="text-align"] { text-align: inherit; }
          .document-editor-content [style*="margin-left"] { margin-left: inherit; }
          .document-editor-content [style*="text-indent"] { text-indent: inherit; }
          .document-editor-content [style*="line-height"] { line-height: inherit; }
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
