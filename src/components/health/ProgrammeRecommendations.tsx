import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { speakText } from '@/utils/speechUtils';
import { Sparkles, Calendar, MapPin, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface HealthData {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  age?: number; // Age in years for age-adjusted thresholds
  gender?: 'male' | 'female'; // Gender for gender-adjusted thresholds
}

interface RecommendedProgramme {
  id: string;
  title: string;
  description: string;
  category: string;
  event_date: string;
  event_time: string;
  location: string;
  is_online: boolean;
  reason: string;
  priority: number;
}

interface ProgrammeRecommendationsProps {
  healthData: HealthData;
}

export function ProgrammeRecommendations({ healthData }: ProgrammeRecommendationsProps) {
  const { t, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendedProgramme[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('recommend-programmes', {
        body: { healthData, language }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setRecommendations(data.recommendations || []);
      setSummary(data.summary || '');
      setHasFetched(true);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Stringify healthData to prevent re-fetching on object reference changes
  const healthDataKey = JSON.stringify(healthData);

  useEffect(() => {
    // Only fetch once per unique healthData + language combination
    if (healthData && Object.keys(healthData).length > 0 && !hasFetched) {
      fetchRecommendations();
    }
  }, [healthDataKey, language, hasFetched]);

  const formatEventDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'EEE, d MMM');
    } catch {
      return dateStr;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      active_ageing: 'bg-emerald-100 text-emerald-700',
      chronic_disease: 'bg-rose-100 text-rose-700',
      mental_wellness: 'bg-violet-100 text-violet-700',
      nutrition: 'bg-amber-100 text-amber-700',
      social_activities: 'bg-sky-100 text-sky-700',
    };
    return colors[category] || 'bg-primary/10 text-primary';
  };

  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t('health.findingProgrammes')}</p>
            <p className="text-sm text-muted-foreground">{t('health.analyzingResults')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-muted rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">{t('health.recommendationError')}</p>
          <Button variant="outline" size="sm" onClick={fetchRecommendations}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 rounded-3xl p-6 shadow-soft animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div onMouseEnter={() => handleSpeak(t('health.recommendedForYou'))}>
          <h3 className="font-bold text-lg text-foreground cursor-default">{t('health.recommendedForYou')}</h3>
          <p className="text-sm text-muted-foreground">{t('health.basedOnScreening')}</p>
        </div>
      </div>

      {/* AI Summary */}
      {summary && (
        <p 
          className="text-base text-foreground/80 mb-5 leading-relaxed cursor-default"
          onMouseEnter={() => handleSpeak(summary)}
        >
          {summary}
        </p>
      )}

      {/* Programme Cards */}
      <div className="space-y-3">
        {recommendations.map((programme, index) => (
          <div 
            key={programme.id}
            className="bg-card rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/community')}
            onMouseEnter={() => handleSpeak(`${programme.title}. ${programme.reason}`)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Category Badge */}
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${getCategoryColor(programme.category)}`}>
                  {formatCategory(programme.category)}
                </span>
                
                {/* Title */}
                <h4 className="font-bold text-foreground mb-1 line-clamp-2">{programme.title}</h4>
                
                {/* Reason */}
                <p className="text-sm text-primary font-medium mb-2">💡 {programme.reason}</p>
                
                {/* Details */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatEventDate(programme.event_date)} • {programme.event_time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {programme.is_online ? t('community.online') : programme.location}
                  </span>
                </div>
              </div>
              
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>

      {/* View All Button */}
      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => navigate('/community')}
        onMouseEnter={() => handleSpeak(t('health.viewAllProgrammes'))}
      >
        {t('health.viewAllProgrammes')}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
