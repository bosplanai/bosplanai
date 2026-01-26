import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Send, Loader2, Trash2, FileDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

interface TaskNote {
  id: string;
  content: string;
  user_name: string;
  user_id: string;
  created_at: string;
}

interface TaskNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

export const TaskNotesDialog = ({ open, onOpenChange, taskId, taskTitle }: TaskNotesDialogProps) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingToDrive, setSavingToDrive] = useState(false);
  const [userName, setUserName] = useState<string>('Unknown User');

  // Fetch current user's profile name
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (data?.full_name) {
        setUserName(data.full_name);
      }
    };
    fetchUserName();
  }, [user]);

  const fetchNotes = async () => {
    if (!taskId || !organization) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_notes')
        .select('id, content, user_name, user_id, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && taskId) {
      fetchNotes();
    }
  }, [open, taskId]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !user || !organization) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('task_notes')
        .insert({
          task_id: taskId,
          organization_id: organization.id,
          user_id: user.id,
          user_name: userName,
          content: newNote.trim(),
        });

      if (error) throw error;

      setNewNote('');
      fetchNotes();
      toast({
        title: 'Note added',
        description: 'Your note has been saved.',
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('task_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      fetchNotes();
      toast({
        title: 'Note deleted',
        description: 'The note has been removed.',
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete note.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveToBosdrive = async () => {
    if (!user || !organization || notes.length === 0) {
      toast({
        title: 'Cannot save',
        description: 'No notes to save to Bosdrive.',
        variant: 'destructive',
      });
      return;
    }

    setSavingToDrive(true);
    try {
      // Generate PDF using jsPDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      const maxWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(taskTitle, maxWidth);
      doc.text(titleLines, margin, yPosition);
      yPosition += titleLines.length * 10 + 8;

      // Subtitle - Generated date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}`, margin, yPosition);
      yPosition += 12;

      // Line separator
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;
      doc.setTextColor(0, 0, 0);

      // Notes - ordered by oldest first for chronological reading
      const sortedNotes = [...notes].reverse();
      
      for (let i = 0; i < sortedNotes.length; i++) {
        const note = sortedNotes[i];
        
        // Calculate space needed for this note
        doc.setFontSize(10);
        const contentLines = doc.splitTextToSize(note.content, maxWidth);
        const lineHeight = 5;
        const headerHeight = 14; // author line + date line
        const noteSpacing = 15;
        const totalNoteHeight = headerHeight + (contentLines.length * lineHeight) + noteSpacing;

        // Check if we need a new page
        if (yPosition + totalNoteHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }

        // Note header - Author then Date on next line (prevents overlap)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(note.user_name, margin, yPosition);
        yPosition += 6;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(format(parseISO(note.created_at), "MMM d, yyyy 'at' h:mm a"), margin, yPosition);
        yPosition += 8;

        // Note content
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        
        for (const line of contentLines) {
          // Check for page break within content
          if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += lineHeight;
        }
        
        // Add spacing between notes (except for last note)
        if (i < sortedNotes.length - 1) {
          yPosition += 10;
          
          // Light divider line between notes
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.3);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;
        }
      }

      // Convert to blob
      const pdfBlob = doc.output('blob');
      const fileName = `${taskTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim()}_Notes.pdf`;
      const folderName = taskTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim();

      // Check if folder already exists
      const { data: existingFolders } = await supabase
        .from('drive_folders')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('name', folderName)
        .is('parent_id', null);

      let folderId: string;

      if (existingFolders && existingFolders.length > 0) {
        folderId = existingFolders[0].id;
      } else {
        // Create new folder
        const { data: newFolder, error: folderError } = await supabase
          .from('drive_folders')
          .insert({
            organization_id: organization.id,
            name: folderName,
            created_by: user.id,
            parent_id: null,
          })
          .select('id')
          .single();

        if (folderError) throw folderError;
        folderId = newFolder.id;
      }

      // Upload PDF to storage
      const timestamp = Date.now();
      const filePath = `${organization.id}/${timestamp}_${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('drive-files')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create drive file record
      const { error: fileError } = await supabase
        .from('drive_files')
        .insert({
          organization_id: organization.id,
          folder_id: folderId,
          name: fileName,
          file_path: filePath,
          file_size: pdfBlob.size,
          mime_type: 'application/pdf',
          uploaded_by: user.id,
          version: 1,
          status: 'not_opened',
        });

      if (fileError) throw fileError;

      toast({
        title: 'Saved to Bosdrive',
        description: `Notes saved as "${fileName}" in folder "${folderName}"`,
      });
    } catch (error) {
      console.error('Error saving to Bosdrive:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes to Bosdrive.',
        variant: 'destructive',
      });
    } finally {
      setSavingToDrive(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Task Notes
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{taskTitle}</p>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Notes List */}
          <ScrollArea className="flex-1 min-h-[200px] max-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : notes.length > 0 ? (
              <div className="space-y-3 pr-4">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 rounded-lg bg-muted/50 border border-border/30">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(note.user_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{note.user_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {format(parseISO(note.created_at), 'MMM d, yyyy h:mm a')}
                        </Badge>
                        {note.user_id === user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
                <p className="text-xs text-muted-foreground/70">Add a note to track progress or observations</p>
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Add Note Form */}
          <div className="space-y-2">
            <Textarea
              placeholder="Add a note about this task..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-between gap-2">
              <Button
                onClick={handleSaveToBosdrive}
                disabled={notes.length === 0 || savingToDrive}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                {savingToDrive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                Save to Bosdrive
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || submitting}
                size="sm"
                className="gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Add Note
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
