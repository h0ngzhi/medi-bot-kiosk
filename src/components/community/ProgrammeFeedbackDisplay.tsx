import { useState, useEffect } from 'react';
import { Star, User, Pencil, Trash2, Loader2, Trophy, Calendar } from 'lucide-react';
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

interface UserProfileInfo {
  name: string;
  events_attended: number;
  medal_title: string | null;
  medal_image_url: string | null;
}

interface ProgrammeFeedbackDisplayProps {
  programmeId: string;
  seriesId?: string;
  onEditFeedback?: (feedback: Feedback) => void;
  compact?: boolean;
}

export function ProgrammeFeedbackDisplay({ programmeId, seriesId, onEditFeedback, compact = false }: ProgrammeFeedbackDisplayProps) {
  const { t, user, language } = useApp();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileInfo>>({});

  const getLocalizedTitle = (reward: { title: string; title_zh?: string | null; title_ms?: string | null; title_ta?: string | null }) => {
    if (language === 'en') return reward.title;
    const langKey = `title_${language}` as keyof typeof reward;
    return (reward[langKey] as string | null) || reward.title;
  };

  const fetchFeedbacks = async () => {
    setLoading(true);
    let feedbackData: Feedback[] = [];
    
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
          feedbackData = data;
        }
      }
    } else {
      const { data, error } = await supabase
        .from('programme_feedback')
        .select('*')
        .eq('programme_id', programmeId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        feedbackData = data;
      }
    }
    
    setFeedbacks(feedbackData);

    // Fetch user profiles with equipped medals and events attended
    if (feedbackData.length > 0) {
      const userIds = [...new Set(feedbackData.map(f => f.kiosk_user_id))];
      
      const { data: usersData } = await supabase
        .from('kiosk_users')
        .select('id, name, events_attended, equipped_medal_id')
        .in('id', userIds);

      if (usersData && usersData.length > 0) {
        const profilesMap: Record<string, UserProfileInfo> = {};
        
        // Get medal info for users with equipped medals
        const usersWithMedals = usersData.filter(u => u.equipped_medal_id);
        const medalIds = usersWithMedals.map(u => u.equipped_medal_id).filter((id): id is string => id !== null);

        let medalsData: Record<string, { title: string; title_zh?: string | null; title_ms?: string | null; title_ta?: string | null; image_url: string | null }> = {};
        
        if (medalIds.length > 0) {
          const { data: redemptionsData } = await supabase
            .from('user_reward_redemptions')
            .select(`
              id,
              rewards (title, title_zh, title_ms, title_ta, image_url)
            `)
            .in('id', medalIds);

          if (redemptionsData) {
            redemptionsData.forEach(r => {
              if (r.rewards) {
                medalsData[r.id] = r.rewards as unknown as { title: string; title_zh?: string | null; title_ms?: string | null; title_ta?: string | null; image_url: string | null };
              }
            });
          }
        }

        // Build profiles map
        usersData.forEach(userData => {
          const medal = userData.equipped_medal_id ? medalsData[userData.equipped_medal_id] : null;
          profilesMap[userData.id] = {
            name: userData.name,
            events_attended: userData.events_attended || 0,
            medal_title: medal ? getLocalizedTitle(medal) : null,
            medal_image_url: medal?.image_url || null
          };
        });
        
        setUserProfiles(profilesMap);
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

  // Compact mode for card view - just show summary
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${
                star <= Math.round(averageRating)
                  ? 'text-warning fill-warning'
                  : 'text-muted-foreground/30'
              }`}
            />
          ))}
        </div>
        <span className="text-lg font-medium">
          {averageRating.toFixed(1)} ({feedbacks.length} {t('community.reviews')})
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-foreground">
          {t('community.participantFeedback')}
        </h4>
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(averageRating)
                    ? 'text-warning fill-warning'
                    : 'text-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <span className="text-lg text-muted-foreground font-medium">
            {averageRating.toFixed(1)} ({feedbacks.length})
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {feedbacks.slice(0, 5).map((feedback) => {
          const isOwner = user?.id === feedback.kiosk_user_id;
          const profile = userProfiles[feedback.kiosk_user_id];
          
          return (
            <div key={feedback.id} className="bg-muted/50 rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
              {/* User Profile Header - Enhanced for elderly visibility */}
              <div className="flex items-start gap-4 mb-3">
                {/* Medal/Avatar */}
                <div className="flex-shrink-0">
                  {profile?.medal_image_url ? (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-300 flex items-center justify-center shadow-md">
                      <img 
                        src={profile.medal_image_url} 
                        alt={profile.medal_title || 'Medal'}
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-foreground">
                      {feedback.participant_name}
                    </span>
                    {isOwner && (
                      <span className="text-sm bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                        {t('community.you') || 'You'}
                      </span>
                    )}
                  </div>
                  
                  {/* Medal Title - Prominent Display */}
                  {profile?.medal_title && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-base font-semibold text-amber-600">
                        {profile.medal_title}
                      </span>
                    </div>
                  )}
                  
                  {/* Events Attended */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-base text-muted-foreground">
                      {profile?.events_attended || 0} {t('community.eventsAttended') || 'events attended'}
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= feedback.rating
                            ? 'text-warning fill-warning'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Edit/Delete buttons for owner */}
                  {isOwner && (
                    <div className="flex gap-1 mt-1">
                      {onEditFeedback && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditFeedback(feedback);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            disabled={deleting === feedback.id}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {deleting === feedback.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
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

              {/* Comment */}
              {feedback.comment && (
                <p className="text-lg text-foreground bg-background/50 rounded-xl p-3 italic">
                  "{feedback.comment}"
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}