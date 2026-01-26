import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Folder, MoreVertical, Edit, Trash2, FolderOpen } from "lucide-react";
import { TemplateFolder } from "@/hooks/useTemplateFolders";
import { Template } from "@/hooks/useTemplates";

interface TemplateFolderCardProps {
  folder: TemplateFolder;
  templates: Template[];
  onOpen: (folder: TemplateFolder) => void;
  onEdit: (folder: TemplateFolder) => void;
  onDelete: (folder: TemplateFolder) => void;
}

const TemplateFolderCard = ({ folder, templates, onOpen, onEdit, onDelete }: TemplateFolderCardProps) => {
  const templateCount = templates.filter(t => t.folder_id === folder.id).length;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onOpen(folder)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${folder.color}20` }}
            >
              <Folder className="w-5 h-5" style={{ color: folder.color }} />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{folder.name}</h3>
              {folder.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">{folder.description}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(folder); }}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(folder); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(folder); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3">
          <Badge variant="secondary" className="text-xs">
            {templateCount} {templateCount === 1 ? "template" : "templates"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default TemplateFolderCard;
