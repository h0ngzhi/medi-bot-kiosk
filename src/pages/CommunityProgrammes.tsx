import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { ProgrammeCard, Programme } from '@/components/community/ProgrammeCard';
import { ProgrammeSignupForm } from '@/components/community/ProgrammeSignupForm';
import { ProgrammeFeedback } from '@/components/community/ProgrammeFeedback';
import { speakText } from '@/utils/speechUtils';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Filter,
  Heart,
  Brain,
  Users,
  HandHeart,
  Smartphone,
  X,
  Loader2
} from 'lucide-react';

type Category = 'all' | 'active_ageing' | 'health' | 'social' | 'caregiver' | 'digital';

const categories: { id: Category; icon: React.ElementType; labelKey: string }[] = [
  { id: 'all', icon: Filter, labelKey: 'community.filterAll' },
  { id: 'active_ageing', icon: Heart, labelKey: 'community.filterActive' },
  { id: 'health', icon: Brain, labelKey: 'community.filterHealth' },
  { id: 'social', icon: Users, labelKey: 'community.filterSocial' },
  { id: 'caregiver', icon: HandHeart, labelKey: 'community.filterCaregiver' },
  { id: 'digital', icon: Smartphone, labelKey: 'community.filterDigital' },
];

export default function CommunityProgrammes() {
  const { user, t, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  // Fetch programmes from database
  useEffect(() => {
    const fetchProgrammes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('community_programmes')
          .select('*')
          .eq('is_active', true)
          .order('event_date', { ascending: true });

        if (error) throw error;

        // Now fetch user's signups to mark signed-up programmes
        let signedUpIds: string[] = [];
        if (user?.id) {
          const { data: signups } = await supabase
            .from('user_programme_signups')
            .select('programme_id')
            .eq('kiosk_user_id', user.id);
          
          if (signups) {
            signedUpIds = signups.map(s => s.programme_id);
          }
        }

        const programmesWithSignup = (data || []).map(p => ({
          ...p,
          isSignedUp: signedUpIds.includes(p.id)
        }));

        setProgrammes(programmesWithSignup);
      } catch (error) {
        console.error('Error fetching programmes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgrammes();
  }, [user?.id]);

  const handleSignUp = (programme: Programme) => {
    setSelectedProgramme(programme);
    setShowSignupForm(true);
  };

  const handleSignupSuccess = () => {
    if (selectedProgramme) {
      setProgrammes(prev =>
        prev.map(p =>
          p.id === selectedProgramme.id
            ? { ...p, isSignedUp: true, current_signups: p.current_signups + 1 }
            : p
        )
      );
      
      // Show feedback after successful signup (only once per session)
      if (!feedbackDismissed) {
        setTimeout(() => {
          setShowFeedback(true);
        }, 1500);
      }
    }
  };

  const filteredProgrammes = activeCategory === 'all'
    ? programmes
    : programmes.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
      {/* Header */}
      <header className="bg-card shadow-soft p-6 mb-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            onMouseEnter={() => handleSpeak(t('common.back'))}
            className="w-14 h-14 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 
              className="text-heading text-foreground cursor-default" 
              onMouseEnter={() => handleSpeak(t('community.title'))}
            >
              {t('community.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('community.subtitle')}</p>
          </div>
        </div>
      </header>

      {/* Category filters */}
      <div className="max-w-2xl mx-auto px-6 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <Button
                key={cat.id}
                variant={isActive ? 'default' : 'outline'}
                size="lg"
                onClick={() => setActiveCategory(cat.id)}
                onMouseEnter={() => handleSpeak(t(cat.labelKey))}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 ${
                  isActive ? '' : 'bg-card'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-base">{t(cat.labelKey)}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Programme cards */}
      <div className="max-w-2xl mx-auto px-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProgrammes.length > 0 ? (
          filteredProgrammes.map((programme, index) => (
            <ProgrammeCard
              key={programme.id}
              programme={programme}
              onSignUp={handleSignUp}
              index={index}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">{t('community.noProgrammes')}</p>
          </div>
        )}
      </div>

      {/* Signup form modal */}
      {selectedProgramme && (
        <ProgrammeSignupForm
          isOpen={showSignupForm}
          onClose={() => setShowSignupForm(false)}
          programme={{
            id: selectedProgramme.id,
            title: selectedProgramme.title
          }}
          onSuccess={handleSignupSuccess}
        />
      )}

      {/* Feedback component */}
      <ProgrammeFeedback
        isOpen={showFeedback}
        onClose={() => {
          setShowFeedback(false);
          setFeedbackDismissed(true);
        }}
      />

      <AccessibilityBar />
    </div>
  );
}
