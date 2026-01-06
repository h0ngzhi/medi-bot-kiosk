import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Trash2, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Feedback {
  id: string;
  participant_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  kiosk_user_id: string;
}

interface FeedbackManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  programmeId: string;
  programmeName: string;
  seriesId?: string;
  onFeedbackDeleted?: () => void;
}

export function FeedbackManagementDialog({
  isOpen,
  onClose,
  programmeId,
  programmeName,
  seriesId,
  onFeedbackDeleted
}: FeedbackManagementDialogProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    setLoading(true);
    
    if (seriesId) {
      const { data: seriesProgrammes } = await supabase
        .from('community_programmes')
        .select('id')
        .eq('series_id', seriesId);
      
      if (seriesProgrammes && seriesProgrammes.length > 0) {
        const programmeIds = seriesProgrammes.map(p => p.id);
        const { data, error } = await supabase
          .from('programme_feedback')
          .select('*')
          .in('programme_id', programmeIds)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setFeedbacks(data);
        }
      }
    } else {
      const { data, error } = await supabase
        .from('programme_feedback')
        .select('*')
        .eq('programme_id', programmeId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setFeedbacks(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
    }
  }, [isOpen, programmeId, seriesId]);

  const handleDelete = async (feedbackId: string) => {
    setDeleting(feedbackId);
    try {
      const { error } = await supabase
        .from('programme_feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
      toast.success('Feedback deleted successfully');
      onFeedbackDeleted?.();
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Failed to delete feedback');
    } finally {
      setDeleting(null);
    }
  };

  const averageRating = feedbacks.length > 0 
    ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            Feedback for {programmeName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No feedback has been submitted for this programme yet.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(averageRating)
                          ? 'text-warning fill-warning'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Badge variant="secondary">{feedbacks.length} review{feedbacks.length !== 1 ? 's' : ''}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="bg-muted/30 rounded-xl p-4 border border-border/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="font-medium text-foreground">
                            {feedback.participant_name}
                          </span>
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= feedback.rating
                                  ? 'text-warning fill-warning'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(feedback.created_at), 'dd MMM yyyy')}
                        </span>
                      </div>
                      {feedback.comment && (
                        <p className="text-sm text-muted-foreground pl-6">
                          "{feedback.comment}"
                        </p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          disabled={deleting === feedback.id}
                        >
                          {deleting === feedback.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Feedback?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the feedback from {feedback.participant_name}. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(feedback.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
