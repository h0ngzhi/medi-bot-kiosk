import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, X, Send, Mic, Loader2, Square } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { speakText } from '@/utils/speechUtils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface ProgrammeFeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  programmeId: string;
  programmeName: string;
  onSuccess?: () => void;
}

export function ProgrammeFeedbackForm({
  isOpen,
  onClose,
  programmeId,
  programmeName,
  onSuccess
}: ProgrammeFeedbackFormProps) {
  const { t, language, isTtsEnabled, user } = useApp();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { isRecording, isProcessing, recordingTime, toggleRecording } = useVoiceInput({
    language,
    autoStopMs: 15000,
    onTranscript: (text) => {
      setComment((prev) => prev ? `${prev} ${text}` : text);
      toast.success(t('community.voiceRecorded') || 'Voice recorded successfully');
    }
  });

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const handleSubmit = async () => {
    if (!rating || !user?.id) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('programme_feedback')
        .insert({
          programme_id: programmeId,
          kiosk_user_id: user.id,
          participant_name: user.name,
          rating,
          comment: comment.trim() || null
        });

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - already submitted
          toast.error(t('community.feedbackAlreadySubmitted'));
        } else {
          throw error;
        }
      } else {
        toast.success(t('community.feedbackThanks'));
        onSuccess?.();
        onClose();
        setRating(0);
        setComment('');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(t('community.feedbackError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceClick = async () => {
    await toggleRecording();
    if (!isRecording) {
      toast.info(t('community.speakNow') || 'Speak now... Tap again to stop', {
        duration: 2000,
      });
    }
  };

  const formatTime = (seconds: number) => {
    return `0:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card rounded-3xl shadow-lg max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 
            className="text-xl font-bold text-foreground cursor-default"
            onMouseEnter={() => handleSpeak(t('community.shareFeedback'))}
          >
            {t('community.shareFeedback')}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-base text-muted-foreground mb-4">
          {programmeName}
        </p>

        {/* Star Rating */}
        <div className="mb-6">
          <label className="block text-base text-foreground mb-3 font-medium">
            {t('community.rateExperience')}
          </label>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-2 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'text-warning fill-warning'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-base text-muted-foreground mb-2">
            {t('community.optionalComment')}
          </label>
          <div className="relative">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('community.commentPlaceholder')}
              className="min-h-[80px] text-lg pr-24"
              disabled={isRecording}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-2">
              {isRecording && (
                <span className="text-base font-medium text-destructive animate-pulse">
                  {formatTime(recordingTime)}
                </span>
              )}
              <Button
                type="button"
                variant={isRecording ? 'destructive' : 'outline'}
                size="icon"
                onClick={handleVoiceClick}
                disabled={isProcessing}
                className={`rounded-full h-10 w-10 ${
                  isRecording ? 'animate-pulse ring-4 ring-destructive/30' : ''
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isRecording ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <Button
          variant="default"
          size="lg"
          onClick={handleSubmit}
          disabled={!rating || submitting}
          className="w-full h-14 text-lg"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Send className="w-5 h-5 mr-2" />
          )}
          {t('community.submitFeedback')}
        </Button>
      </div>
    </div>
  );
}
