import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Award,
  ChevronDown,
  ChevronUp,
  Info,
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
  MessageSquare,
  Video,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { speakText } from '@/utils/speechUtils';
import { getProgrammeStatus, isRegistrationOpen, ProgrammeStatus } from '@/utils/programmeUtils';
import { ProgrammeFeedbackDisplay } from './ProgrammeFeedbackDisplay';

export interface Programme {
  id: string;
  title: string;
  description: string | null;
  category: string;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  points_reward: number;
  is_active: boolean;
  is_online?: boolean | null;
  online_link?: string | null;
  // Capacity tracking
  max_capacity: number;
  current_signups: number;
  // Enhanced details from DB
  duration: string | null;
  group_size: string | null;
  languages: string[] | null;
  conducted_by: string | null;
  learning_objectives: string[] | null;
  // Admin contact info
  contact_number?: string | null;
  admin_email?: string | null;
  // Guest option tag
  guest_option?: string | null;
  // Recurrence type
  recurrence_type?: string | null;
  // Local state
  isSignedUp?: boolean;
  hasSubmittedFeedback?: boolean;
}

interface ProgrammeCardProps {
  programme: Programme;
  onSignUp: (programme: Programme) => void;
  onCancel?: (programme: Programme) => void;
  onFeedback?: (programme: Programme) => void;
  index: number;
}

const categoryColors: Record<string, { bg: string; text: string; label: string }> = {
  'active_ageing': { bg: 'bg-success/10', text: 'text-success', label: 'Active Ageing' },
  'health': { bg: 'bg-primary/10', text: 'text-primary', label: 'Health Talk' },
  'social': { bg: 'bg-warning/10', text: 'text-warning', label: 'Social Activity' },
  'caregiver': { bg: 'bg-info/10', text: 'text-info', label: 'Caregiver Support' },
  'digital': { bg: 'bg-secondary/10', text: 'text-secondary', label: 'Digital Skills' },
};

export function ProgrammeCard({ programme, onSignUp, onCancel, onFeedback, index }: ProgrammeCardProps) {
  const { t, language, isTtsEnabled } = useApp();
  const [expanded, setExpanded] = useState(false);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const category = categoryColors[programme.category] || categoryColors['health'];
  
  // Calculate programme status
  const status: ProgrammeStatus = getProgrammeStatus(
    programme.event_date,
    programme.event_time,
    programme.duration
  );
  
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
    <div
      id={`programme-${programme.id}`}
      className={`bg-card rounded-3xl shadow-soft overflow-hidden animate-slide-up scroll-mt-6 ${
        isCompleted ? 'opacity-80' : ''
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Header with category and status */}
      <div className={`${category.bg} px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className={`font-semibold ${category.text}`}>{category.label}</span>
          {isCompleted && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              {t('community.completed')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-warning">
          <Award className="w-5 h-5" />
          <span className="font-bold text-base">{programme.points_reward} {t('community.points')}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6">
        <h3 
          className="text-xl font-bold text-foreground mb-3 cursor-default"
          onMouseEnter={() => handleSpeak(programme.title)}
        >
          {programme.title}
        </h3>

        {programme.description && (
          <p 
            className="text-base text-muted-foreground mb-4 cursor-default"
            onMouseEnter={() => handleSpeak(programme.description || '')}
          >
            {programme.description}
          </p>
        )}

        {/* Quick info badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {programme.duration && (
            <Badge variant="outline" className="text-base py-1.5 px-4">
              <Clock className="w-4 h-4 mr-2" />
              {programme.duration}
            </Badge>
          )}
          {programme.group_size && (
            <Badge variant="outline" className="text-base py-1.5 px-4">
              <Users className="w-4 h-4 mr-2" />
              {programme.group_size}
            </Badge>
          )}
          {programme.languages && programme.languages.length > 0 && (
            <Badge variant="outline" className="text-base py-1.5 px-4">
              <Languages className="w-4 h-4 mr-2" />
              {programme.languages.join(' / ')}
            </Badge>
          )}
          {programme.guest_option && (
            <Badge variant="outline" className="text-base py-1.5 px-4 bg-primary/10 border-primary/30 text-primary">
              {programme.guest_option === 'caregiver_welcome' ? (
                <><Heart className="w-4 h-4 mr-2" />{t('community.caregiverWelcome')}</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" />{t('community.bringFriend')}</>
              )}
            </Badge>
          )}
        </div>

        {/* Key details */}
        <div className="space-y-2 mb-4">
          {programme.event_date && (
            <div 
              className="flex items-center gap-3 text-foreground cursor-default"
              onMouseEnter={() => handleSpeak(formatDate(programme.event_date))}
            >
              <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-base font-medium">{formatDate(programme.event_date)}</span>
            </div>
          )}

          {programme.event_time && (
            <div 
              className="flex items-center gap-3 text-foreground cursor-default"
              onMouseEnter={() => handleSpeak(programme.event_time || '')}
            >
              <Clock className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-base">{programme.event_time}</span>
            </div>
          )}
          
          {programme.is_online && programme.online_link ? (
            <div 
              className="flex items-center gap-3 text-foreground cursor-default"
              onMouseEnter={() => handleSpeak('Online programme')}
            >
              <Video className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-base font-medium">{t('community.onlineProgramme')}</span>
              {programme.isSignedUp && (
                <a 
                  href={programme.online_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{t('community.joinOnline')}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ) : programme.location && (
            <div 
              className="flex items-center gap-3 text-foreground cursor-default"
              onMouseEnter={() => handleSpeak(programme.location || '')}
            >
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-base">{programme.location}</span>
            </div>
          )}

          {programme.conducted_by && (
            <div 
              className="flex items-center gap-3 text-foreground cursor-default"
              onMouseEnter={() => handleSpeak(`Conducted by ${programme.conducted_by}`)}
            >
              <User className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-base">{t('community.conductedBy')}: <span className="font-medium">{programme.conducted_by}</span></span>
            </div>
          )}

          {/* Spots remaining - only show if not completed */}
          {!isCompleted && (
            <div className="flex items-center gap-3 text-foreground cursor-default">
              <Users className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-base">
                {spotsRemaining > 0 
                  ? <><span className="font-bold text-success">{spotsRemaining}</span> {t('community.spotsLeft')} (of {programme.max_capacity})</>
                  : <span className="text-destructive font-medium">{t('community.fullCapacity')}</span>
                }
              </span>
            </div>
          )}

          {/* Admin contact info */}
          {(programme.contact_number || programme.admin_email) && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-base font-semibold text-foreground mb-2">{t('community.contactOrganiser')}</p>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-base">
                {programme.contact_number && (
                  <a 
                    href={`tel:${programme.contact_number}`}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span>{programme.contact_number}</span>
                  </a>
                )}
                {programme.admin_email && (
                  <a 
                    href={`mailto:${programme.admin_email}`}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    <span>{programme.admin_email}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Expandable details */}
        {programme.learning_objectives && programme.learning_objectives.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="default"
              onClick={() => setExpanded(!expanded)}
              className="w-full justify-between mb-4 text-muted-foreground hover:text-foreground text-base"
            >
              <span className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                {t('community.moreDetails')}
              </span>
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>

            {expanded && (
              <div className="bg-muted rounded-2xl p-4 mb-4 space-y-4 animate-fade-in">
                {/* Learning Objectives */}
                <div>
                  <p className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    {t('community.learningObjectives')}
                  </p>
                  <ul className="space-y-2 ml-6">
                    {programme.learning_objectives.map((objective, idx) => (
                      <li 
                        key={idx} 
                        className="text-base text-muted-foreground list-disc cursor-default"
                        onMouseEnter={() => handleSpeak(objective)}
                      >
                        {objective}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        {/* Public feedback display for completed programmes */}
        {isCompleted && (
          <ProgrammeFeedbackDisplay programmeId={programme.id} />
        )}

        {/* Action buttons */}
        {isCompleted ? (
          // Completed programme - show feedback button for registered participants
          programme.isSignedUp && !programme.hasSubmittedFeedback ? (
            <Button
              variant="outline"
              size="lg"
              onClick={() => onFeedback?.(programme)}
              className="w-full h-14 text-lg border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Star className="w-5 h-5 mr-2" />
              {t('community.leaveFeedback')}
            </Button>
          ) : programme.isSignedUp && programme.hasSubmittedFeedback ? (
            <Button
              variant="outline"
              size="lg"
              disabled
              className="w-full h-14 text-lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {t('community.feedbackSubmittedShort')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              disabled
              className="w-full h-14 text-lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {t('community.completed')}
            </Button>
          )
        ) : !registrationOpen ? (
          // Registration closed - programme has started
          <div className="space-y-2">
            <Button
              variant="outline"
              size="lg"
              disabled
              className="w-full h-14 text-lg"
            >
              <Lock className="w-5 h-5 mr-2" />
              {t('community.registrationClosed')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('community.programmeStarted')}
            </p>
          </div>
        ) : programme.isSignedUp ? (
          <div className="flex gap-3">
            <Button
              variant="success"
              size="lg"
              disabled
              className="flex-1 h-14 text-lg"
            >
              <Award className="w-5 h-5 mr-2" />
              {t('community.signed')}
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => onCancel(programme)}
                onMouseEnter={() => handleSpeak(t('community.cancel'))}
                className="h-14 px-6 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
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
            className="w-full h-14 text-lg"
          >
            {t('community.fullCapacity')}
          </Button>
        ) : (
          <Button
            variant="default"
            size="lg"
            onClick={() => onSignUp(programme)}
            onMouseEnter={() => handleSpeak(t('community.signup'))}
            className="w-full h-14 text-lg"
          >
            {t('community.signup')}
          </Button>
        )}
      </div>
    </div>
  );
}
