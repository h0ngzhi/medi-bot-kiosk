import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Award,
  Phone,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Info,
  BookOpen,
  User,
  Languages,
  Target
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { speakText } from '@/utils/speechUtils';

export interface Programme {
  id: string;
  title: string;
  description: string;
  category: 'active-ageing' | 'health-education' | 'social' | 'caregiver' | 'digital';
  date: string;
  time: string;
  venue: string;
  region: 'North' | 'Central' | 'East' | 'West' | 'North-East';
  eligibility?: string;
  registrationMethod: 'form' | 'phone' | 'walkin';
  phoneNumber?: string;
  pointsReward: number;
  spotsLeft?: number;
  lastUpdated: string;
  isSignedUp?: boolean;
  // Enhanced details
  duration?: string;
  groupSize?: string;
  languages?: string[];
  conductedBy?: string;
  learningObjectives?: string[];
}

interface ProgrammeCardProps {
  programme: Programme;
  onSignUp: (programme: Programme) => void;
  index: number;
}

const categoryColors: Record<string, { bg: string; text: string; label: string }> = {
  'active-ageing': { bg: 'bg-success/10', text: 'text-success', label: 'Active Ageing' },
  'health-education': { bg: 'bg-primary/10', text: 'text-primary', label: 'Health Talk' },
  'social': { bg: 'bg-warning/10', text: 'text-warning', label: 'Social Activity' },
  'caregiver': { bg: 'bg-info/10', text: 'text-info', label: 'Caregiver Support' },
  'digital': { bg: 'bg-secondary/10', text: 'text-secondary', label: 'Digital Skills' },
};

const regionColors: Record<string, string> = {
  'North': 'bg-blue-100 text-blue-700',
  'Central': 'bg-purple-100 text-purple-700',
  'East': 'bg-green-100 text-green-700',
  'West': 'bg-orange-100 text-orange-700',
  'North-East': 'bg-teal-100 text-teal-700',
};

export function ProgrammeCard({ programme, onSignUp, index }: ProgrammeCardProps) {
  const { t, language, isTtsEnabled } = useApp();
  const [expanded, setExpanded] = useState(false);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const category = categoryColors[programme.category];
  const regionColor = regionColors[programme.region];

  const getRegistrationText = () => {
    switch (programme.registrationMethod) {
      case 'form': return t('community.registerOnline');
      case 'phone': return t('community.callToBook');
      case 'walkin': return t('community.walkInWelcome');
    }
  };

  return (
    <div
      className="bg-card rounded-3xl shadow-soft overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Header with category */}
      <div className={`${category.bg} px-6 py-3 flex items-center justify-between`}>
        <span className={`font-semibold ${category.text}`}>{category.label}</span>
        <div className="flex items-center gap-2">
          <Badge className={regionColor}>{programme.region}</Badge>
          <div className="flex items-center gap-1 text-warning">
            <Award className="w-4 h-4" />
            <span className="font-bold text-sm">{programme.pointsReward} {t('community.points')}</span>
          </div>
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

        <p 
          className="text-base text-muted-foreground mb-4 cursor-default"
          onMouseEnter={() => handleSpeak(programme.description)}
        >
          {programme.description}
        </p>

        {/* Quick info badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {programme.duration && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              {programme.duration}
            </Badge>
          )}
          {programme.groupSize && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              {programme.groupSize}
            </Badge>
          )}
          {programme.languages && programme.languages.length > 0 && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              <Languages className="w-3.5 h-3.5 mr-1.5" />
              {programme.languages.join(' / ')}
            </Badge>
          )}
        </div>

        {/* Key details */}
        <div className="space-y-2 mb-4">
          <div 
            className="flex items-center gap-3 text-foreground cursor-default"
            onMouseEnter={() => handleSpeak(`${programme.date}, ${programme.time}`)}
          >
            <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-base font-medium">{programme.date}</span>
            <Clock className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
            <span className="text-base font-medium">{programme.time}</span>
          </div>
          
          <div 
            className="flex items-center gap-3 text-foreground cursor-default"
            onMouseEnter={() => handleSpeak(programme.venue)}
          >
            <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-base">{programme.venue}</span>
          </div>

          {programme.conductedBy && (
            <div 
              className="flex items-center gap-3 text-foreground cursor-default"
              onMouseEnter={() => handleSpeak(`Conducted by ${programme.conductedBy}`)}
            >
              <User className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-base">{t('community.conductedBy')}: <span className="font-medium">{programme.conductedBy}</span></span>
            </div>
          )}

          {programme.spotsLeft !== undefined && (
            <div className="flex items-center gap-3 text-foreground cursor-default">
              <Users className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-base">
                {programme.spotsLeft > 0 
                  ? `${programme.spotsLeft} ${t('community.spotsLeft')}`
                  : t('community.fullCapacity')
                }
              </span>
            </div>
          )}
        </div>

        {/* Expandable details */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full justify-between mb-4 text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            {t('community.moreDetails')}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {expanded && (
          <div className="bg-muted rounded-2xl p-4 mb-4 space-y-4 animate-fade-in">
            {/* Learning Objectives */}
            {programme.learningObjectives && programme.learningObjectives.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  {t('community.learningObjectives')}
                </p>
                <ul className="space-y-1.5 ml-6">
                  {programme.learningObjectives.map((objective, idx) => (
                    <li 
                      key={idx} 
                      className="text-sm text-muted-foreground list-disc cursor-default"
                      onMouseEnter={() => handleSpeak(objective)}
                    >
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {programme.eligibility && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  {t('community.eligibility')}
                </p>
                <p className="text-sm text-muted-foreground ml-6">{programme.eligibility}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">{t('community.howToJoin')}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-2 ml-6">
                {programme.registrationMethod === 'phone' && <Phone className="w-4 h-4" />}
                {programme.registrationMethod === 'walkin' && <UserCheck className="w-4 h-4" />}
                {getRegistrationText()}
                {programme.registrationMethod === 'phone' && programme.phoneNumber && (
                  <span className="font-semibold text-primary ml-1">{programme.phoneNumber}</span>
                )}
              </p>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {t('community.lastUpdated')}: {programme.lastUpdated}
              </p>
              <p className="text-xs text-muted-foreground italic mt-1">
                {t('community.quarterlyReview')}
              </p>
            </div>
          </div>
        )}

        {/* Sign up button */}
        {programme.isSignedUp ? (
          <Button
            variant="success"
            size="lg"
            disabled
            className="w-full h-14 text-lg"
          >
            <Award className="w-5 h-5 mr-2" />
            {t('community.signed')}
          </Button>
        ) : programme.spotsLeft === 0 ? (
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
