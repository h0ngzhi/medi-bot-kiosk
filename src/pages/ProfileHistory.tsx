import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { supabase } from '@/integrations/supabase/client';
import { speakText } from '@/utils/speechUtils';
import { 
  ArrowLeft, 
  History,
  CheckCircle2,
  Calendar,
  MapPin,
  Award,
  Loader2
} from 'lucide-react';

interface ProgrammeSignup {
  id: string;
  signed_up_at: string;
  status: string;
  attended_at: string | null;
  programme: {
    title: string;
    event_date: string | null;
    location: string | null;
    points_reward: number;
  } | null;
}

export default function ProfileHistory() {
  const { user, t, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [signups, setSignups] = useState<ProgrammeSignup[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_programme_signups')
        .select(`
          id,
          signed_up_at,
          status,
          attended_at,
          community_programmes (
            title,
            event_date,
            location,
            points_reward
          )
        `)
        .eq('kiosk_user_id', user.id)
        .order('signed_up_at', { ascending: false });

      if (!error && data) {
        setSignups(data.map(s => ({
          ...s,
          programme: s.community_programmes as ProgrammeSignup['programme']
        })));
      }
      setLoading(false);
    };

    fetchHistory();
  }, [user, navigate]);

  if (!user) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-SG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
      {/* Header */}
      <header className="bg-card shadow-soft p-6 mb-6">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            onMouseEnter={() => handleSpeak(t('common.back'))}
            className="w-14 h-14 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 
              className="text-heading text-foreground cursor-default" 
              onMouseEnter={() => handleSpeak(t('profile.history'))}
            >
              {t('profile.history')}
            </h1>
            <p className="text-lg text-muted-foreground">{t('profile.historySubtitle')}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : signups.length === 0 ? (
          <div className="bg-card rounded-3xl shadow-soft p-8 text-center">
            <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">{t('profile.noHistory')}</p>
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate('/community')}
              className="mt-6"
            >
              {t('profile.browseProgrammes')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {signups.map((signup) => (
              <div 
                key={signup.id}
                className="bg-card rounded-2xl shadow-soft p-5 animate-fade-in"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    signup.attended_at ? 'bg-success/10' : 'bg-primary/10'
                  }`}>
                    {signup.attended_at ? (
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    ) : (
                      <Calendar className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {signup.programme?.title || 'Programme'}
                    </h3>
                    
                    {signup.programme?.event_date && (
                      <p className="text-base text-muted-foreground flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(signup.programme.event_date)}
                      </p>
                    )}
                    
                    {signup.programme?.location && (
                      <p className="text-base text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {signup.programme.location}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-3">
                      <span className={`text-sm px-3 py-1 rounded-full ${
                        signup.attended_at 
                          ? 'bg-success/10 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {signup.attended_at ? t('profile.attended') : t('profile.registered')}
                      </span>
                      
                      {signup.programme?.points_reward && signup.attended_at && (
                        <span className="text-sm text-warning flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          +{signup.programme.points_reward} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AccessibilityBar />
    </div>
  );
}
