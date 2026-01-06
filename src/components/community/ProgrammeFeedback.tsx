import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, X, Send, Mic, Loader2, Square } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { speakText } from '@/utils/speechUtils';
import { toast } from 'sonner';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface ProgrammeFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  programmeName?: string;
}

export function ProgrammeFeedback({ isOpen, onClose, programmeName }: ProgrammeFeedbackProps) {
  const { t, language, isTtsEnabled } = useApp();
  const [rating, setRating] = useState<'yes' | 'no' | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { isRecording, isProcessing, recordingTime, toggleRecording } = useVoiceInput({
    language,
    autoStopMs: 15000, // Auto-stop after 15 seconds
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

  const handleSubmit = () => {
    // In a real app, this would send to backend
    console.log('Feedback submitted:', { rating, comment, programmeName });
    setSubmitted(true);
    toast.success(t('community.feedbackThanks'), {
      description: t('community.feedbackSubmitted') || 'Your feedback helps us improve our services.',
      duration: 3000,
    });
    setTimeout(() => {
      onClose();
      setRating(null);
      setComment('');
      setSubmitted(false);
    }, 2000);
  };

  const handleVoiceClick = async () => {
    await toggleRecording();
    if (!isRecording) {
      // Starting recording
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
        <div className="flex items-center justify-between mb-6">
          <h3 
            className="text-xl font-bold text-foreground cursor-default"
            onMouseEnter={() => handleSpeak(t('community.feedbackTitle'))}
          >
            {t('community.feedbackTitle')}
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

        {!submitted ? (
          <>
            <p 
              className="text-lg text-muted-foreground mb-6 cursor-default"
              onMouseEnter={() => handleSpeak(t('community.wasHelpful'))}
            >
              {t('community.wasHelpful')}
            </p>

            <div className="flex gap-4 mb-6">
              <Button
                variant={rating === 'yes' ? 'success' : 'outline'}
                size="lg"
                onClick={() => setRating('yes')}
                onMouseEnter={() => handleSpeak(t('common.yes'))}
                className="flex-1 h-16 text-lg"
              >
                <ThumbsUp className={`w-6 h-6 mr-2 ${rating === 'yes' ? 'fill-current' : ''}`} />
                {t('common.yes')}
              </Button>
              <Button
                variant={rating === 'no' ? 'destructive' : 'outline'}
                size="lg"
                onClick={() => setRating('no')}
                onMouseEnter={() => handleSpeak(t('common.no'))}
                className="flex-1 h-16 text-lg"
              >
                <ThumbsDown className={`w-6 h-6 mr-2 ${rating === 'no' ? 'fill-current' : ''}`} />
                {t('common.no')}
              </Button>
            </div>

            <div className="mb-6">
              <label 
                className="block text-base text-muted-foreground mb-2 cursor-default"
                onMouseEnter={() => handleSpeak(t('community.optionalComment'))}
              >
                {t('community.optionalComment')}
              </label>
              <div className="relative">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('community.commentPlaceholder')}
                  className="min-h-[100px] text-lg pr-24"
                  disabled={isRecording}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-2">
                  {isRecording && (
                    <span className="text-sm font-medium text-destructive animate-pulse">
                      {formatTime(recordingTime)}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant={isRecording ? 'destructive' : 'outline'}
                    size="icon"
                    onClick={handleVoiceClick}
                    disabled={isProcessing}
                    className={`rounded-full h-12 w-12 ${
                      isRecording ? 'animate-pulse ring-4 ring-destructive/30' : ''
                    }`}
                    title={isRecording ? 'Tap to stop' : 'Tap to speak'}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isRecording ? (
                      <Square className="w-5 h-5 fill-current" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {isRecording 
                  ? t('community.tapToStop') || '🔴 Recording... Tap the button to stop'
                  : t('community.voiceHint') || 'Tap the microphone to speak your feedback'
                }
              </p>
            </div>

            <Button
              variant="warm"
              size="lg"
              onClick={handleSubmit}
              onMouseEnter={() => handleSpeak(t('community.submitFeedback'))}
              disabled={!rating}
              className="w-full h-14 text-lg"
            >
              <Send className="w-5 h-5 mr-2" />
              {t('community.submitFeedback')}
            </Button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ThumbsUp className="w-8 h-8 text-success" />
            </div>
            <p className="text-xl font-bold text-foreground">{t('community.feedbackThanks')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
