import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";
interface ProductBoardColumnProps {
  id: string;
  title: string;
  items: string[];
  children: React.ReactNode;
}
const ProductBoardColumn = forwardRef<HTMLDivElement, ProductBoardColumnProps>(({
  id,
  title,
  items,
  children
}, ref) => {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id
  });

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };
  const getVariantStyles = () => {
    switch (id) {
      case "todo":
        return {
          bg: "bg-todo/80",
          dot: "bg-primary"
        };
      case "in_progress":
        return {
          bg: "bg-[#F5B536]/80",
          dot: "bg-amber-500"
        };
      case "done":
        return {
          bg: "bg-complete/80",
          dot: "bg-brand-green"
        };
      default:
        return {
          bg: "bg-muted/80",
          dot: "bg-muted-foreground"
        };
    }
  };

  // Get custom background style from CSS variable (light mode only)
  const getCustomBgStyle = () => {
    const cssVarMap: Record<string, string> = {
      todo: "--status-todo-bg",
      in_progress: "--status-in-progress-bg",
      done: "--status-complete-bg",
    };
    const cssVar = cssVarMap[id];
    if (cssVar) {
      const customColor = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
      if (customColor && !document.documentElement.classList.contains("dark")) {
        return { backgroundColor: customColor };
      }
    }
    return {};
  };

  const styles = getVariantStyles();
  return <div ref={setRefs} style={getCustomBgStyle()} className={cn("flex-1 min-w-0 rounded-2xl p-4 sm:p-6 min-h-[200px] sm:min-h-[500px] transition-all duration-300 ease-out backdrop-blur-sm relative overflow-hidden", styles.bg, "dark:bg-[#1D2128]", isOver && "ring-2 ring-primary/30 ring-inset scale-[1.01]")}>
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          
          <h3 className="text-xs font-semibold tracking-wider text-white uppercase">
            {title}
          </h3>
          <span className="text-xs text-white/70 ml-auto">
            {items.length}
          </span>
        </div>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3 sm:gap-4">
            {children}
          </div>
        </SortableContext>
      </div>;
});
ProductBoardColumn.displayName = "ProductBoardColumn";
export default ProductBoardColumn;