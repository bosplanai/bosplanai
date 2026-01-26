import { Archive, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface ArchiveChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "task" | "project";
  itemTitle: string;
  onArchive: () => void;
  onRecycleBin: () => void;
}

const ArchiveChoiceDialog = ({
  open,
  onOpenChange,
  itemType,
  itemTitle,
  onArchive,
  onRecycleBin,
}: ArchiveChoiceDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove "{itemTitle}"</AlertDialogTitle>
          <AlertDialogDescription>
            What would you like to do with this completed {itemType}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <button
            onClick={() => {
              onArchive();
              onOpenChange(false);
            }}
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Archive className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Move to Archive</p>
              <p className="text-sm text-muted-foreground">
                Keep for reference. Can be restored anytime.
              </p>
            </div>
          </button>
          <button
            onClick={() => {
              onRecycleBin();
              onOpenChange(false);
            }}
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-destructive/5 hover:border-destructive/30 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-foreground">Move to Recycling Bin</p>
              <p className="text-sm text-muted-foreground">
                Will be permanently deleted after 30 days.
              </p>
            </div>
          </button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ArchiveChoiceDialog;
