import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { ProgrammeCard, Programme } from '@/components/community/ProgrammeCard';
import { ProgrammeSignupForm } from '@/components/community/ProgrammeSignupForm';
import { ProgrammeFeedbackForm } from '@/components/community/ProgrammeFeedbackForm';
import { ProgrammeFeedbackDisplay } from '@/components/community/ProgrammeFeedbackDisplay';
import { speakText } from '@/utils/speechUtils';
import { supabase } from '@/integrations/supabase/client';
import { isRegistrationOpen, getProgrammeStatus } from '@/utils/programmeUtils';
import { 
  ArrowLeft, 
  Filter,
  Heart,
  Brain,
  Users,
  HandHeart,
  Smartphone,
  X,
  Loader2,
  UserCheck,
  Calendar,
  MapPin,
  CheckCircle,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

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

        // Now fetch user's signups and feedback to mark signed-up programmes
        let signedUpIds: string[] = [];
        let feedbackSubmittedIds: string[] = [];
        
        if (user?.id) {
          const { data: signups } = await supabase
            .from('user_programme_signups')
            .select('programme_id')
            .eq('kiosk_user_id', user.id);
          
          if (signups) {
            signedUpIds = signups.map(s => s.programme_id);
          }

          // Check for submitted feedback
          const { data: feedbacks } = await supabase
            .from('programme_feedback')
            .select('programme_id')
            .eq('kiosk_user_id', user.id);

          if (feedbacks) {
            feedbackSubmittedIds = feedbacks.map(f => f.programme_id);
          }
        }

        const programmesWithState = (data || []).map(p => ({
          ...p,
          isSignedUp: signedUpIds.includes(p.id),
          hasSubmittedFeedback: feedbackSubmittedIds.includes(p.id)
        }));

        setProgrammes(programmesWithState);
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

  const handleFeedback = (programme: Programme) => {
    setSelectedProgramme(programme);
    setShowFeedbackForm(true);
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
    }
  };

  const handleFeedbackSuccess = () => {
    if (selectedProgramme) {
      setProgrammes(prev =>
        prev.map(p =>
          p.id === selectedProgramme.id
            ? { ...p, hasSubmittedFeedback: true }
            : p
        )
      );
    }
  };

  const handleCancelParticipation = async (programme: Programme) => {
    if (!user?.id) return;

    // Check if programme has started - cancel not allowed
    const canCancel = isRegistrationOpen(programme.event_date, programme.event_time);
    if (!canCancel) {
      toast.error(t('community.cannotCancelStarted'));
      return;
    }

    try {
      // Delete the signup record
      const { error } = await supabase
        .from('user_programme_signups')
        .delete()
        .eq('kiosk_user_id', user.id)
        .eq('programme_id', programme.id);

      if (error) throw error;

      // Update local state
      setProgrammes(prev =>
        prev.map(p =>
          p.id === programme.id
            ? { ...p, isSignedUp: false, current_signups: Math.max(0, p.current_signups - 1) }
            : p
        )
      );

      // Decrement the signup count in database
      await supabase
        .from('community_programmes')
        .update({ current_signups: Math.max(0, programme.current_signups - 1) })
        .eq('id', programme.id);

      toast.success(t('community.cancelSuccess'));
    } catch (error) {
      console.error('Error cancelling participation:', error);
      toast.error(t('community.cancelError'));
    }
  };

  // Separate programmes into upcoming and completed
  const upcomingProgrammes = programmes.filter(p => 
    getProgrammeStatus(p.event_date, p.event_time, p.duration) === 'upcoming'
  );
  
  const completedProgrammes = programmes.filter(p => 
    getProgrammeStatus(p.event_date, p.event_time, p.duration) === 'completed'
  );

  const filteredUpcomingProgrammes = activeCategory === 'all'
    ? upcomingProgrammes
    : upcomingProgrammes.filter(p => p.category === activeCategory);

  const filteredCompletedProgrammes = activeCategory === 'all'
    ? completedProgrammes
    : completedProgrammes.filter(p => p.category === activeCategory);

  // Get user's signed up programmes (only upcoming ones where registration is still open)
  const myProgrammes = upcomingProgrammes.filter(p => 
    p.isSignedUp && isRegistrationOpen(p.event_date, p.event_time)
  );

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
            <p className="text-lg text-muted-foreground">{t('community.subtitle')}</p>
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

      {/* Your Programmes Section - Only shows upcoming programmes where cancel is allowed */}
      {!loading && myProgrammes.length > 0 && (
        <div className="max-w-2xl mx-auto px-6 mb-8">
          <div className="bg-success/10 border-2 border-success/30 rounded-3xl p-6">
            <h2 
              className="text-xl font-bold text-success mb-4 flex items-center gap-3"
              onMouseEnter={() => handleSpeak(t('community.yourProgrammes'))}
            >
              <UserCheck className="w-7 h-7" />
              {t('community.yourProgrammes')}
            </h2>
            <div className="space-y-4">
              {myProgrammes.map((programme) => (
                <div 
                  key={programme.id}
                  className="bg-card rounded-2xl p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => {
                    const element = document.getElementById(`programme-${programme.id}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      element.classList.add('ring-2', 'ring-primary');
                      setTimeout(() => element.classList.remove('ring-2', 'ring-primary'), 2000);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">{programme.title}</h3>
                      {programme.event_date && (
                        <p className="text-base text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          {new Date(programme.event_date).toLocaleDateString('en-SG', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </p>
                      )}
                      {programme.location && (
                        <p className="text-base text-muted-foreground flex items-center gap-2 mt-1">
                          <MapPin className="w-5 h-5 text-primary" />
                          {programme.location}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelParticipation(programme);
                      }}
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground h-12 px-4"
                    >
                      <X className="w-5 h-5 mr-2" />
                      {t('community.cancel')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Programme cards */}
      <div className="max-w-2xl mx-auto px-6 space-y-6">
        <h2 
          className="text-xl font-bold text-foreground"
          onMouseEnter={() => handleSpeak(t('community.allProgrammes'))}
        >
          {t('community.allProgrammes')}
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredUpcomingProgrammes.length > 0 ? (
          filteredUpcomingProgrammes.map((programme, index) => (
            <ProgrammeCard
              key={programme.id}
              programme={programme}
              onSignUp={handleSignUp}
              onCancel={handleCancelParticipation}
              onFeedback={handleFeedback}
              index={index}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">{t('community.noProgrammes')}</p>
          </div>
        )}
      </div>

      {/* Completed Programmes Section */}
      {!loading && filteredCompletedProgrammes.length > 0 && (
        <div className="max-w-2xl mx-auto px-6 space-y-6 mt-10">
          <h2 
            className="text-xl font-bold text-foreground flex items-center gap-3"
            onMouseEnter={() => handleSpeak(t('community.completedProgrammes'))}
          >
            <CheckCircle className="w-6 h-6 text-muted-foreground" />
            {t('community.completedProgrammes')}
          </h2>
          <p className="text-muted-foreground text-base -mt-4">
            {t('community.completedProgrammesDesc')}
          </p>
          
          {filteredCompletedProgrammes.map((programme) => (
            <div 
              key={programme.id}
              className="bg-card rounded-3xl shadow-soft overflow-hidden opacity-90"
            >
              {/* Header */}
              <div className="bg-muted/50 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-muted-foreground">{programme.category}</span>
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    {t('community.completed')}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-2">{programme.title}</h3>
                
                {programme.event_date && (
                  <p className="text-base text-muted-foreground flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5" />
                    {new Date(programme.event_date).toLocaleDateString('en-SG', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}

                {programme.location && (
                  <p className="text-base text-muted-foreground flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5" />
                    {programme.location}
                  </p>
                )}

                {/* Public Feedback Display - uses series_id to show all reviews from recurring sessions */}
                <ProgrammeFeedbackDisplay programmeId={programme.id} seriesId={(programme as any).series_id} />

                {/* Leave feedback button for signed-up users */}
                {programme.isSignedUp && !programme.hasSubmittedFeedback && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleFeedback(programme)}
                    className="w-full h-14 text-lg mt-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Star className="w-5 h-5 mr-2" />
                    {t('community.leaveFeedback')}
                  </Button>
                )}

                {programme.isSignedUp && programme.hasSubmittedFeedback && (
                  <Button
                    variant="outline"
                    size="lg"
                    disabled
                    className="w-full h-14 text-lg mt-4"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {t('community.feedbackSubmittedShort')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signup form modal */}
      {selectedProgramme && (
        <ProgrammeSignupForm
          isOpen={showSignupForm}
          onClose={() => setShowSignupForm(false)}
          programme={{
            id: selectedProgramme.id,
            title: selectedProgramme.title,
            event_date: selectedProgramme.event_date,
            location: selectedProgramme.location,
            admin_email: selectedProgramme.admin_email,
            contact_number: selectedProgramme.contact_number
          }}
          onSuccess={handleSignupSuccess}
        />
      )}

      {/* Feedback form modal */}
      {selectedProgramme && (
        <ProgrammeFeedbackForm
          isOpen={showFeedbackForm}
          onClose={() => setShowFeedbackForm(false)}
          programmeId={selectedProgramme.id}
          programmeName={selectedProgramme.title}
          onSuccess={handleFeedbackSuccess}
        />
      )}

      <AccessibilityBar />
    </div>
  );
}
