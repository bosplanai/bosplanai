import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  FolderOpen,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Calculator,
  Megaphone,
  Users,
  Sparkles,
} from "lucide-react";
import {
  useBosplanTemplates,
  BosplanTemplateCategory,
  BOSPLAN_CATEGORY_LABELS,
  BOSPLAN_CATEGORY_COLORS,
} from "@/hooks/useBosplanTemplates";

const categoryIcons: Record<BosplanTemplateCategory, React.ElementType> = {
  business_management: Briefcase,
  accounting_management: Calculator,
  marketing: Megaphone,
  team_management: Users,
};

const BosplanTemplatesFolder = () => {
  const { templates, loading, getTemplatesByCategory, downloadTemplate } = useBosplanTemplates();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<BosplanTemplateCategory>>(new Set());

  const categories: BosplanTemplateCategory[] = [
    "business_management",
    "accounting_management",
    "marketing",
    "team_management",
  ];

  const toggleCategory = (category: BosplanTemplateCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const totalTemplates = templates.length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Bosplan Business Templates
                    <Badge variant="secondary" className="text-xs">
                      Free
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Ready-to-use templates curated by Bosplan to help you manage your business
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{totalTemplates} templates</Badge>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading templates...</div>
            ) : totalTemplates === 0 ? (
              <div className="py-8 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No templates available yet</p>
                <p className="text-sm text-muted-foreground">Check back soon for free business templates!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => {
                  const categoryTemplates = getTemplatesByCategory(category);
                  const Icon = categoryIcons[category];
                  const isExpanded = expandedCategories.has(category);

                  return (
                    <Collapsible
                      key={category}
                      open={isExpanded}
                      onOpenChange={() => toggleCategory(category)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{BOSPLAN_CATEGORY_LABELS[category]}</p>
                              <p className="text-sm text-muted-foreground">
                                {categoryTemplates.length} template{categoryTemplates.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        {categoryTemplates.length === 0 ? (
                          <div className="py-4 pl-14 text-sm text-muted-foreground">
                            No templates in this category yet
                          </div>
                        ) : (
                          <div className="pl-6 pt-2 space-y-2">
                            {categoryTemplates.map((template) => (
                              <div
                                key={template.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium text-sm">{template.name}</p>
                                    {template.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-1">
                                        {template.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={BOSPLAN_CATEGORY_COLORS[template.category]}
                                  >
                                    {template.template_type}
                                  </Badge>
                                  {template.file_path && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadTemplate(template);
                                      }}
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default BosplanTemplatesFolder;
