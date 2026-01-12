import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Award,
  User,
  Languages,
  Target,
  Phone,
  Mail,
  Heart,
  UserPlus,
  Lock,
  CheckCircle,
  Star,
  Video,
  ExternalLink,
  Hash
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { speakText } from '@/utils/speechUtils';
import { getProgrammeStatus, isRegistrationOpen } from '@/utils/programmeUtils';
import { ProgrammeFeedbackDisplay } from './ProgrammeFeedbackDisplay';
import { Programme } from './ProgrammeCard';
import { supabase } from '@/integrations/supabase/client';

interface ProgrammeDetailModalProps {
  programme: Programme | null;
  isOpen: boolean;
  onClose: () => void;
  onSignUp: (programme: Programme) => void;
  onCancel?: (programme: Programme) => void;
  onFeedback?: (programme: Programme) => void;
  onEditFeedback?: (feedback: { id: string; rating: number; comment: string | null }) => void;
}

const categoryColors: Record<string, { bg: string; text: string; label: string }> = {
  'active_ageing': { bg: 'bg-success/10', text: 'text-success', label: 'Active Ageing' },
  'health': { bg: 'bg-primary/10', text: 'text-primary', label: 'Health Talk' },
  'social': { bg: 'bg-warning/10', text: 'text-warning', label: 'Social Activity' },
  'caregiver': { bg: 'bg-info/10', text: 'text-info', label: 'Caregiver Support' },
  'digital': { bg: 'bg-secondary/10', text: 'text-secondary', label: 'Digital Skills' },
};

export function ProgrammeDetailModal({ 
  programme, 
  isOpen, 
  onClose, 
  onSignUp, 
  onCancel, 
  onFeedback,
  onEditFeedback
}: ProgrammeDetailModalProps) {
  const { t, language, isTtsEnabled, user } = useApp();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };
    
    checkAdminStatus();
  }, [user?.id]);

  if (!programme) return null;

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const category = categoryColors[programme.category] || categoryColors['health'];
  const status = getProgrammeStatus(programme.event_date, programme.event_time, programme.duration);
  const registrationOpen = isRegistrationOpen(programme.event_date, programme.event_time);
  const isCompleted = status === 'completed';
  const spotsRemaining = programme.max_capacity - programme.current_signups;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-SG', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header with category */}
        <div className={`${category.bg} px-6 py-4 flex items-center justify-between sticky top-0 z-10`}>
          <div className="flex items-center gap-3">
            <span className={`font-semibold text-lg ${category.text}`}>{category.label}</span>
            {isCompleted && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                {t('community.completed')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Serial ID */}
            {(programme as any).serial_id && (
              <Badge variant="outline" className="text-sm font-mono">
                <Hash className="w-3.5 h-3.5 mr-1" />
                {(programme as any).serial_id}
              </Badge>
            )}
            <div className="flex items-center gap-1.5 text-warning">
              <Award className="w-5 h-5" />
              <span className="font-bold text-base">{programme.points_reward} {t('community.points')}</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="p-6 space-y-6">
          <DialogHeader className="text-left">
            <DialogTitle 
              className="text-2xl font-bold text-foreground cursor-default"
              onMouseEnter={() => handleSpeak(programme.title)}
            >
              {programme.title}
            </DialogTitle>
          </DialogHeader>

          {programme.description && (
            <p 
              className="text-lg text-muted-foreground cursor-default"
              onMouseEnter={() => handleSpeak(programme.description || '')}
            >
              {programme.description}
            </p>
          )}

          {/* Quick info badges */}
          <div className="flex flex-wrap gap-2">
            {programme.duration && (
              <Badge variant="outline" className="text-base py-2 px-4">
                <Clock className="w-4 h-4 mr-2" />
                {programme.duration}
              </Badge>
            )}
            {programme.group_size && (
              <Badge variant="outline" className="text-base py-2 px-4">
                <Users className="w-4 h-4 mr-2" />
                {programme.group_size}
              </Badge>
            )}
            {programme.languages && programme.languages.length > 0 && (
              <Badge variant="outline" className="text-base py-2 px-4">
                <Languages className="w-4 h-4 mr-2" />
                {programme.languages.join(' / ')}
              </Badge>
            )}
            {programme.guest_option && (
              <Badge variant="outline" className="text-base py-2 px-4 bg-primary/10 border-primary/30 text-primary">
                {programme.guest_option === 'caregiver_welcome' ? (
                  <><Heart className="w-4 h-4 mr-2" />{t('community.caregiverWelcome')}</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" />{t('community.bringFriend')}</>
                )}
              </Badge>
            )}
          </div>

          {/* Key details */}
          <div className="bg-muted/50 rounded-2xl p-5 space-y-3">
            {programme.event_date && (
              <div 
                className="flex items-center gap-3 text-foreground cursor-default text-lg"
                onMouseEnter={() => handleSpeak(formatDate(programme.event_date))}
              >
                <Calendar className="w-6 h-6 text-primary flex-shrink-0" />
                <span className="font-medium">{formatDate(programme.event_date)}</span>
              </div>
            )}

            {programme.event_time && (
              <div 
                className="flex items-center gap-3 text-foreground cursor-default text-lg"
                onMouseEnter={() => handleSpeak(programme.event_time || '')}
              >
                <Clock className="w-6 h-6 text-primary flex-shrink-0" />
                <span>{programme.event_time}</span>
              </div>
            )}
            
            {programme.is_online && programme.online_link ? (
              <div 
                className="flex items-center gap-3 text-foreground cursor-default text-lg"
                onMouseEnter={() => handleSpeak('Online programme')}
              >
                <Video className="w-6 h-6 text-primary flex-shrink-0" />
                <span className="font-medium">{t('community.onlineProgramme')}</span>
                {programme.isSignedUp && (
                  <a 
                    href={programme.online_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>{t('community.joinOnline')}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ) : programme.location && (
              <div 
                className="flex items-center gap-3 text-foreground cursor-default text-lg"
                onMouseEnter={() => handleSpeak(programme.location || '')}
              >
                <MapPin className="w-6 h-6 text-primary flex-shrink-0" />
                <span>{programme.location}</span>
              </div>
            )}

            {programme.conducted_by && (
              <div 
                className="flex items-center gap-3 text-foreground cursor-default text-lg"
                onMouseEnter={() => handleSpeak(`Conducted by ${programme.conducted_by}`)}
              >
                <User className="w-6 h-6 text-primary flex-shrink-0" />
                <span>{t('community.conductedBy')}: <span className="font-medium">{programme.conducted_by}</span></span>
              </div>
            )}

            {/* Spots remaining */}
            {!isCompleted && (
              <div className="flex items-center gap-3 text-foreground cursor-default text-lg">
                <Users className="w-6 h-6 text-primary flex-shrink-0" />
                <span>
                  {spotsRemaining > 0 
                    ? <><span className="font-bold text-success">{spotsRemaining}</span> {t('community.spotsLeft')} (of {programme.max_capacity})</>
                    : <span className="text-destructive font-medium">{t('community.fullCapacity')}</span>
                  }
                </span>
              </div>
            )}
          </div>

          {/* Learning Objectives */}
          {programme.learning_objectives && programme.learning_objectives.length > 0 && (
            <div className="bg-muted/50 rounded-2xl p-5">
              <p className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                {t('community.learningObjectives')}
              </p>
              <ul className="space-y-2 ml-8">
                {programme.learning_objectives.map((objective, idx) => (
                  <li 
                    key={idx} 
                    className="text-lg text-muted-foreground list-disc cursor-default"
                    onMouseEnter={() => handleSpeak(objective)}
                  >
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Admin contact info */}
          {(programme.contact_number || programme.admin_email) && (
            <div className="bg-muted/50 rounded-2xl p-5">
              <p className="text-lg font-semibold text-foreground mb-3">{t('community.contactOrganiser')}</p>
              <div className="flex flex-wrap items-center gap-6 text-muted-foreground text-lg">
                {programme.contact_number && (
                  <a 
                    href={`tel:${programme.contact_number}`}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <Phone className="w-6 h-6" />
                    <span>{programme.contact_number}</span>
                  </a>
                )}
                {programme.admin_email && (
                  <a 
                    href={`mailto:${programme.admin_email}`}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <Mail className="w-6 h-6" />
                    <span>{programme.admin_email}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Reviews section - show for all programmes */}
          <ProgrammeFeedbackDisplay 
            programmeId={programme.id} 
            seriesId={(programme as any).series_id}
            onEditFeedback={onEditFeedback}
          />

          {/* Action buttons */}
          <div className="pt-4 border-t border-border">
            {isCompleted ? (
              // For completed programmes: allow feedback if signed up OR if admin
              (programme.isSignedUp || isAdmin) && !programme.hasSubmittedFeedback ? (
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => {
                    onFeedback?.(programme);
                    onClose();
                  }}
                  className="w-full h-16 text-xl"
                >
                  <Star className="w-6 h-6 mr-2" />
                  {t('community.leaveFeedback')}
                </Button>
              ) : (programme.isSignedUp || isAdmin) && programme.hasSubmittedFeedback ? (
                <Button
                  variant="outline"
                  size="lg"
                  disabled
                  className="w-full h-16 text-xl"
                >
                  <CheckCircle className="w-6 h-6 mr-2" />
                  {t('community.feedbackSubmittedShort')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  disabled
                  className="w-full h-16 text-xl"
                >
                  <CheckCircle className="w-6 h-6 mr-2" />
                  {t('community.completed')}
                </Button>
              )
            ) : !registrationOpen ? (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="lg"
                  disabled
                  className="w-full h-16 text-xl"
                >
                  <Lock className="w-6 h-6 mr-2" />
                  {t('community.registrationClosed')}
                </Button>
                <p className="text-center text-base text-muted-foreground">
                  {t('community.programmeStarted')}
                </p>
              </div>
            ) : programme.isSignedUp ? (
              <div className="flex gap-3">
                <Button
                  variant="success"
                  size="lg"
                  disabled
                  className="flex-1 h-16 text-xl"
                >
                  <Award className="w-6 h-6 mr-2" />
                  {t('community.signed')}
                </Button>
                {onCancel && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      onCancel(programme);
                      onClose();
                    }}
                    className="h-16 px-8 text-xl text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    {t('community.cancel')}
                  </Button>
                )}
              </div>
            ) : spotsRemaining <= 0 ? (
              <Button
                variant="outline"
                size="lg"
                disabled
                className="w-full h-16 text-xl"
              >
                {t('community.fullCapacity')}
              </Button>
            ) : (
              <Button
                variant="default"
                size="lg"
                onClick={() => {
                  onSignUp(programme);
                  onClose();
                }}
                className="w-full h-16 text-xl"
              >
                {t('community.signup')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
