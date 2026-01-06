import { useState, useEffect } from 'react';
import { Star, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

interface Feedback {
  id: string;
  participant_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface ProgrammeFeedbackDisplayProps {
  programmeId: string;
  seriesId?: string; // Optional series_id to fetch reviews from all sessions
}

export function ProgrammeFeedbackDisplay({ programmeId, seriesId }: ProgrammeFeedbackDisplayProps) {
  const { t } = useApp();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      setLoading(true);
      
      if (seriesId) {
        // First get all programme IDs in this series
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
        // Fallback to single programme
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

    fetchFeedbacks();
  }, [programmeId, seriesId]);

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
        {feedbacks.slice(0, 5).map((feedback) => (
          <div key={feedback.id} className="bg-muted/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
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
            </div>
            {feedback.comment && (
              <p className="text-sm text-muted-foreground pl-6">
                "{feedback.comment}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
