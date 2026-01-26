import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { ReactNode, forwardRef } from "react";
interface SortableColumnProps {
  id: string;
  title: string;
  variant: "todo" | "complete";
  items: string[];
  children: ReactNode;
}
const SortableColumn = forwardRef<HTMLDivElement, SortableColumnProps>(({
  id,
  title,
  variant,
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
  // Get custom background style from CSS variable (light mode only)
  const getCustomBgStyle = () => {
    const cssVar = variant === "todo" ? "--status-todo-bg" : "--status-complete-bg";
    const customColor = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    if (customColor && !document.documentElement.classList.contains("dark")) {
      return { backgroundColor: customColor };
    }
    return {};
  };

  return (
    <div
      ref={setRefs}
      style={getCustomBgStyle()}
      className={cn(
        "flex-1 min-w-0 rounded-2xl p-4 sm:p-6 min-h-[300px] sm:min-h-[500px] transition-all duration-300 ease-out backdrop-blur-sm relative overflow-hidden",
        variant === "todo" ? "bg-todo/80" : "bg-complete/80",
        isOver && "ring-2 ring-primary/30 ring-inset scale-[1.01]"
      )}
    >
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <h3 className="text-xs font-semibold tracking-wider text-white uppercase">
          {title}
        </h3>
        <span className="text-xs text-white/70 ml-auto">{items.length}</span>
      </div>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 sm:gap-4">{children}</div>
      </SortableContext>
    </div>
  );
});
SortableColumn.displayName = "SortableColumn";
export default SortableColumn;