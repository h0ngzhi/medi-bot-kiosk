import { useState, useEffect } from 'react';
import { Star, User, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

interface ProgrammeFeedbackDisplayProps {
  programmeId: string;
  seriesId?: string;
  onEditFeedback?: (feedback: Feedback) => void;
}

export function ProgrammeFeedbackDisplay({ programmeId, seriesId, onEditFeedback }: ProgrammeFeedbackDisplayProps) {
  const { t, user } = useApp();
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
    fetchFeedbacks();
  }, [programmeId, seriesId]);

  const handleDelete = async (feedbackId: string) => {
    setDeleting(feedbackId);
    try {
      const { error } = await supabase
        .from('programme_feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
      toast.success(t('community.feedbackDeleted') || 'Feedback deleted');
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error(t('community.feedbackDeleteError') || 'Failed to delete feedback');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return null;
  if (feedbacks.length === 0) return null;

  const averageRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-base font-semibold text-foreground">
          {t('community.participantFeedback')}
        </h4>
        <div className="flex items-center gap-1.5">
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
          <span className="text-sm text-muted-foreground">
            ({feedbacks.length})
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-48 overflow-y-auto">
        {feedbacks.slice(0, 5).map((feedback) => {
          const isOwner = user?.id === feedback.kiosk_user_id;
          
          return (
            <div key={feedback.id} className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {feedback.participant_name}
                        {isOwner && (
                          <span className="text-xs text-primary ml-1">(You)</span>
                        )}
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
                  </div>
                  {feedback.comment && (
                    <p className="text-sm text-muted-foreground pl-6">
                      "{feedback.comment}"
                    </p>
                  )}
                </div>
                
                {isOwner && (
                  <div className="flex gap-1">
                    {onEditFeedback && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEditFeedback(feedback)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          disabled={deleting === feedback.id}
                        >
                          {deleting === feedback.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('community.deleteFeedback') || 'Delete Feedback?'}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('community.deleteFeedbackConfirm') || 'This will permanently delete your feedback. This action cannot be undone.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(feedback.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('common.delete') || 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
