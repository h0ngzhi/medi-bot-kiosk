import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { ProgrammeCard, Programme } from '@/components/community/ProgrammeCard';
import { ProgrammeSignupForm } from '@/components/community/ProgrammeSignupForm';
import { ProgrammeFeedbackForm } from '@/components/community/ProgrammeFeedbackForm';
import { ProgrammeFeedbackDisplay } from '@/components/community/ProgrammeFeedbackDisplay';
import { ProgrammeDetailModal } from '@/components/community/ProgrammeDetailModal';
import { NavigationPdfModal } from '@/components/community/NavigationPdfModal';
import { useDebouncedSpeak } from '@/hooks/useDebouncedSpeak';
import { supabase } from '@/integrations/supabase/client';
import { isRegistrationOpen, getProgrammeStatus } from '@/utils/programmeUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Star,
  ClipboardList,
  History,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

type Category = 'all' | 'active_ageing' | 'health' | 'social' | 'digital';

const categories: { id: Category; icon: React.ElementType; labelKey: string }[] = [
  { id: 'all', icon: Filter, labelKey: 'community.filterAll' },
  { id: 'active_ageing', icon: Heart, labelKey: 'community.filterActive' },
  { id: 'health', icon: Brain, labelKey: 'community.filterHealth' },
  { id: 'social', icon: Users, labelKey: 'community.filterSocial' },
  { id: 'digital', icon: Smartphone, labelKey: 'community.filterDigital' },
];

interface EditingFeedback {
  id: string;
  rating: number;
  comment: string | null;
}

export default function CommunityProgrammes() {
  const { user, t, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<EditingFeedback | null>(null);
  const [feedbackRefreshKey, setFeedbackRefreshKey] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'completed'>('all');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfProgramme, setPdfProgramme] = useState<Programme | null>(null);

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

  const { handleMouseEnter, handleMouseLeave } = useDebouncedSpeak(isTtsEnabled, language);

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

          // Check for submitted feedback - get programme_ids that have feedback
          const { data: feedbacks } = await supabase
            .from('programme_feedback')
            .select('programme_id')
            .eq('kiosk_user_id', user.id);

          if (feedbacks) {
            feedbackSubmittedIds = feedbacks.map(f => f.programme_id);
          }
        }

        // Build maps of series_id to signup/feedback status
        // If user has signed up for or submitted feedback for ANY programme in a series, mark all programmes in that series
        const seriesSignupMap = new Map<string, boolean>();
        const seriesFeedbackMap = new Map<string, boolean>();
        
        // First pass: identify which series have signups and feedback
        (data || []).forEach(p => {
          if (signedUpIds.includes(p.id) && p.series_id) {
            seriesSignupMap.set(p.series_id, true);
          }
          if (feedbackSubmittedIds.includes(p.id) && p.series_id) {
            seriesFeedbackMap.set(p.series_id, true);
          }
        });

        const programmesWithState = (data || []).map(p => ({
          ...p,
          // User is signed up if they signed up for this specific programme OR any programme in the same series
          isSignedUp: signedUpIds.includes(p.id) || (p.series_id && seriesSignupMap.has(p.series_id)),
          // User has submitted feedback if they submitted for this specific programme OR any programme in the same series
          hasSubmittedFeedback: feedbackSubmittedIds.includes(p.id) || (p.series_id && seriesFeedbackMap.has(p.series_id))
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

  const handleExpand = (programme: Programme) => {
    setSelectedProgramme(programme);
    setShowDetailModal(true);
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
      const seriesId = (selectedProgramme as any).series_id;
      setProgrammes(prev =>
        prev.map(p =>
          // Mark feedback submitted for this programme AND all programmes in the same series
          p.id === selectedProgramme.id || (seriesId && (p as any).series_id === seriesId)
            ? { ...p, hasSubmittedFeedback: true }
            : p
        )
      );
    }
    setEditingFeedback(null);
    setFeedbackRefreshKey(prev => prev + 1);
  };

  const handleEditFeedback = (feedback: { id: string; rating: number; comment: string | null }, programme: Programme) => {
    setSelectedProgramme(programme);
    setEditingFeedback({
      id: feedback.id,
      rating: feedback.rating,
      comment: feedback.comment
    });
    setShowFeedbackForm(true);
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

  // Sort completed programmes: reviewable ones first (signed up but no feedback yet)
  const sortedCompletedProgrammes = [...completedProgrammes].sort((a, b) => {
    const aCanReview = (a.isSignedUp || isAdmin) && !a.hasSubmittedFeedback;
    const bCanReview = (b.isSignedUp || isAdmin) && !b.hasSubmittedFeedback;
    if (aCanReview && !bCanReview) return -1;
    if (!aCanReview && bCanReview) return 1;
    return 0;
  });

  const filteredCompletedProgrammes = activeCategory === 'all'
    ? sortedCompletedProgrammes
    : sortedCompletedProgrammes.filter(p => p.category === activeCategory);

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
            onMouseEnter={() => handleMouseEnter(t('common.back'))}
            onMouseLeave={handleMouseLeave}
            className="w-14 h-14 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 
              className="text-heading text-foreground cursor-default" 
              onMouseEnter={() => handleMouseEnter(t('community.title'))}
              onMouseLeave={handleMouseLeave}
            >
              {t('community.title')}
            </h1>
            <p className="text-lg text-muted-foreground">{t('community.subtitle')}</p>
          </div>
        </div>
      </header>

      {/* Tabs for All Programmes vs Completed */}
      <div className="max-w-2xl mx-auto px-6 mb-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'completed')} className="w-full">
          <TabsList className="w-full h-16 bg-muted/50 p-1 rounded-2xl grid grid-cols-2 gap-2">
            <TabsTrigger 
              value="all" 
              className="h-full rounded-xl text-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center justify-center gap-2"
              onMouseEnter={() => handleMouseEnter(t('community.allProgrammes'))}
              onMouseLeave={handleMouseLeave}
            >
              <ClipboardList className="w-5 h-5" />
              {t('community.allProgrammes')}
              {filteredUpcomingProgrammes.length > 0 && (
                <span className="ml-1 bg-primary-foreground/20 px-2 py-0.5 rounded-full text-sm">
                  {filteredUpcomingProgrammes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className="h-full rounded-xl text-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center justify-center gap-2"
              onMouseEnter={() => handleMouseEnter(t('community.completedProgrammes'))}
              onMouseLeave={handleMouseLeave}
            >
              <History className="w-5 h-5" />
              {t('community.completedProgrammes')}
              {filteredCompletedProgrammes.length > 0 && (
                <span className="ml-1 bg-primary-foreground/20 px-2 py-0.5 rounded-full text-sm">
                  {filteredCompletedProgrammes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
                onMouseEnter={() => handleMouseEnter(t(cat.labelKey))}
                onMouseLeave={handleMouseLeave}
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

      {/* Tab Content */}
      {activeTab === 'all' && (
        <>
          {/* Your Programmes Section - Only shows upcoming programmes where cancel is allowed */}
          {!loading && myProgrammes.length > 0 && (
            <div className="max-w-2xl mx-auto px-6 mb-8">
              <div className="bg-success/10 border-2 border-success/30 rounded-3xl p-6">
                <h2 
                  className="text-xl font-bold text-success mb-4 flex items-center gap-3"
                  onMouseEnter={() => handleMouseEnter(t('community.yourProgrammes'))}
                  onMouseLeave={handleMouseLeave}
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
                        <div className="flex flex-col gap-2">
                          {/* View Navigation Card button - only for physical programmes with PDF */}
                          {!programme.is_online && programme.navigation_pdf_url && (
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPdfProgramme(programme);
                                setShowPdfModal(true);
                              }}
                              className="h-12 px-4"
                            >
                              <FileText className="w-5 h-5 mr-2" />
                              {t('community.viewNavigationCard')}
                            </Button>
                          )}
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
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Programme cards */}
          <div className="max-w-2xl mx-auto px-6 space-y-6">
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
                  onExpand={handleExpand}
                  index={index}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground text-lg">{t('community.noProgrammes')}</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'completed' && (
        <div className="max-w-2xl mx-auto px-6 space-y-6">
          <p className="text-muted-foreground text-base">
            {t('community.completedProgrammesDesc')}
          </p>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCompletedProgrammes.length > 0 ? (
            filteredCompletedProgrammes.map((programme) => (
              <div 
                key={programme.id}
                className="bg-card rounded-3xl shadow-soft overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => handleExpand(programme)}
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
                  <span className="text-sm text-primary font-medium">{t('community.tapToView')}</span>
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

                  {/* Quick feedback summary */}
                  <ProgrammeFeedbackDisplay 
                    key={feedbackRefreshKey}
                    programmeId={programme.id} 
                    seriesId={(programme as any).series_id}
                    onEditFeedback={(feedback) => {
                      handleEditFeedback(feedback, programme);
                    }}
                    compact
                  />

                  {/* Leave feedback button - for signed-up users OR admins */}
                  {(programme.isSignedUp || isAdmin) && !programme.hasSubmittedFeedback && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedback(programme);
                      }}
                      className="w-full h-14 text-lg mt-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Star className="w-5 h-5 mr-2" />
                      {t('community.leaveFeedback')}
                    </Button>
                  )}

                  {(programme.isSignedUp || isAdmin) && programme.hasSubmittedFeedback && (
                    <Button
                      variant="outline"
                      size="lg"
                      disabled
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-14 text-lg mt-4"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {t('community.feedbackSubmittedShort')}
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground text-lg">{t('community.noCompletedProgrammes')}</p>
            </div>
          )}
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
            contact_number: selectedProgramme.contact_number,
            is_online: selectedProgramme.is_online,
            navigation_pdf_url: selectedProgramme.navigation_pdf_url
          }}
          onSuccess={handleSignupSuccess}
        />
      )}

      {/* Feedback form modal */}
      {selectedProgramme && (
        <ProgrammeFeedbackForm
          isOpen={showFeedbackForm}
          onClose={() => {
            setShowFeedbackForm(false);
            setEditingFeedback(null);
          }}
          programmeId={selectedProgramme.id}
          programmeName={selectedProgramme.title}
          onSuccess={handleFeedbackSuccess}
          editingFeedback={editingFeedback}
        />
      )}

      {/* Programme detail modal */}
      <ProgrammeDetailModal
        programme={selectedProgramme}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onSignUp={handleSignUp}
        onCancel={handleCancelParticipation}
        onFeedback={handleFeedback}
        onEditFeedback={selectedProgramme ? (feedback) => handleEditFeedback(feedback, selectedProgramme) : undefined}
      />

      {/* Navigation PDF modal */}
      {pdfProgramme && pdfProgramme.navigation_pdf_url && (
        <NavigationPdfModal
          isOpen={showPdfModal}
          onClose={() => {
            setShowPdfModal(false);
            setPdfProgramme(null);
          }}
          pdfUrl={pdfProgramme.navigation_pdf_url}
          programmeTitle={pdfProgramme.title}
        />
      )}

      <AccessibilityBar />
    </div>
  );
}
