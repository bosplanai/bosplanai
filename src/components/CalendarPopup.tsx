import { useState, useRef, useEffect } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useCalendar } from '@/contexts/CalendarContext';
import { useTasks } from '@/hooks/useTasks';
import { usePersonalChecklist } from '@/hooks/usePersonalChecklist';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CalendarItem {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
  source: 'task' | 'checklist';
  project?: { title: string } | null;
}

const CalendarPopup = () => {
  const { isCalendarOpen, closeCalendar } = useCalendar();
  const { tasks } = useTasks();
  const { items: checklistItems } = usePersonalChecklist();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  // Combine tasks and checklist items
  const allItems: CalendarItem[] = [
    ...tasks
      .filter((task) => task.due_date && task.status !== 'complete')
      .map((task) => ({
        id: task.id,
        title: task.title,
        due_date: task.due_date!,
        priority: task.priority,
        status: task.status,
        source: 'task' as const,
        project: task.project,
      })),
    ...checklistItems
      .filter((item) => item.due_date && !item.is_completed)
      .map((item) => ({
        id: item.id,
        title: item.title,
        due_date: item.due_date!,
        priority: item.priority,
        status: item.is_completed ? 'complete' : 'pending',
        source: 'checklist' as const,
        project: null,
      })),
  ];

  // Get items for selected date
  const itemsForSelectedDate = selectedDate
    ? allItems.filter((item) =>
        item.due_date && isSameDay(parseISO(item.due_date), selectedDate)
      )
    : [];

  // Get dates that have deadlines for highlighting
  const datesWithDeadlines = allItems
    .map((item) => (item.due_date ? parseISO(item.due_date) : null))
    .filter((date): date is Date => date !== null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (popupRef.current) {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isCalendarOpen) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-card border border-border/40 rounded-2xl shadow-xl"
      style={{
        left: position.x,
        top: position.y,
        minWidth: '340px',
      }}
    >
      {/* Header with drag handle and close button */}
      <div
        className="flex items-center justify-between px-4 py-3.5 border-b border-border/40 cursor-move select-none bg-muted/30 rounded-t-2xl"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2.5 text-foreground font-semibold">
          <GripHorizontal className="w-4 h-4 text-muted-foreground" />
          <span>Task Calendar</span>
        </div>
        <button
          onClick={closeCalendar}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar */}
      <div className="p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="pointer-events-auto"
          modifiers={{
            hasDeadline: datesWithDeadlines,
          }}
          modifiersClassNames={{
            hasDeadline: 'bg-primary/20 text-primary font-semibold',
          }}
        />
      </div>

      {/* Items for selected date */}
      <div className="border-t border-border/40 px-4 py-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
        </h4>
        <ScrollArea className="max-h-40">
          {itemsForSelectedDate.length > 0 ? (
            <div className="space-y-2.5">
              {itemsForSelectedDate.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-3 rounded-xl text-sm bg-muted/30 border border-border/30 transition-all duration-200 hover:bg-muted/50',
                    item.priority === 'high' && 'border-l-2 border-l-destructive',
                    item.priority === 'medium' && 'border-l-2 border-l-yellow-500',
                    item.priority === 'low' && 'border-l-2 border-l-green-500'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate flex-1">{item.title}</p>
                    {item.source === 'checklist' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Personal
                      </span>
                    )}
                  </div>
                  {item.project && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.project.title}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No deadlines on this date</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default CalendarPopup;
