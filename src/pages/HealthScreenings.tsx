import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { ProgrammeRecommendations } from '@/components/health/ProgrammeRecommendations';
import { supabase } from '@/integrations/supabase/client';
import { useDebouncedSpeak } from '@/hooks/useDebouncedSpeak';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Heart, 
  Ruler,
  CheckCircle2,
  Activity,
  History,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

type ScreeningType = 'bp' | 'weight' | null;
type ScreeningState = 'select' | 'measuring' | 'result';

interface ScreeningResult {
  type: ScreeningType;
  values: Record<string, string | number>;
  status: 'normal' | 'warning' | 'high';
  date: string;
}

interface PastResult {
  id: string;
  screening_type: string;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  status: string;
  recorded_at: string;
}

const screeningOptions = [
  {
    id: 'bp' as const,
    icon: Heart,
    titleKey: 'health.bp',
    descKey: 'health.bp.desc',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  {
    id: 'weight' as const,
    icon: Ruler,
    titleKey: 'health.weight',
    descKey: 'health.weight.desc',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

export default function HealthScreenings() {
  const { t, user, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [state, setState] = useState<ScreeningState>('select');
  const [selectedType, setSelectedType] = useState<ScreeningType>(null);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [pastResults, setPastResults] = useState<PastResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAge, setUserAge] = useState<number | undefined>(undefined);
  const [userGender, setUserGender] = useState<'male' | 'female' | undefined>(undefined);
  const [aiReason, setAiReason] = useState<string>('');
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);

  const { handleMouseEnter, handleMouseLeave } = useDebouncedSpeak(isTtsEnabled, language);

  // Calculate age from date of birth
  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Fetch past results and user DOB/gender on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's date_of_birth and gender
        const { data: userData } = await supabase
          .from('kiosk_users')
          .select('date_of_birth, gender')
          .eq('id', user.id)
          .single();
        
        if (userData?.date_of_birth) {
          setUserAge(calculateAge(userData.date_of_birth));
        }
        if (userData?.gender) {
          setUserGender(userData.gender as 'male' | 'female');
        }

        // Fetch past screening results
        const { data, error } = await supabase
          .from('screening_results')
          .select('*')
          .eq('kiosk_user_id', user.id)
          .order('recorded_at', { ascending: false });

        if (error) throw error;
        setPastResults(data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const saveResult = async (mockResult: ScreeningResult) => {
    if (!user?.id) return;

    try {
      const insertData = {
        kiosk_user_id: user.id,
        screening_type: mockResult.type,
        status: mockResult.status,
        ...(mockResult.type === 'bp' ? {
          systolic: mockResult.values.systolic as number,
          diastolic: mockResult.values.diastolic as number,
          pulse: mockResult.values.pulse as number,
        } : {
          height: mockResult.values.height as number,
          weight: mockResult.values.weight as number,
          bmi: mockResult.values.bmi as number,
        }),
      };

      const { error } = await supabase
        .from('screening_results')
        .insert(insertData);

      if (error) throw error;

      toast.success(t('health.saved'));

      // Refresh past results
      const { data } = await supabase
        .from('screening_results')
        .select('*')
        .eq('kiosk_user_id', user.id)
        .order('recorded_at', { ascending: false });

      if (data) setPastResults(data);
    } catch (error) {
      console.error('Error saving result:', error);
      toast.error(t('health.saveFailed'));
    }
  };

  const handleSelectScreening = (type: ScreeningType) => {
    setSelectedType(type);
    setState('measuring');
    setAiReason('');
    setAiRecommendations([]);

    // Simulate measurement with varied realistic values (including some elevated/high)
    setTimeout(async () => {
      // Generate values with realistic variation including some concerning readings
      const randomChance = Math.random();
      
      let mockResult: ScreeningResult;
      
      if (type === 'bp') {
        // 30% chance of elevated, 20% chance of high BP for more realistic testing
        let systolic: number, diastolic: number, pulse: number;
        
        if (randomChance < 0.5) {
          // Normal range
          systolic = Math.floor(Math.random() * (119 - 100) + 100);
          diastolic = Math.floor(Math.random() * (79 - 60) + 60);
        } else if (randomChance < 0.8) {
          // Elevated/Warning range
          systolic = Math.floor(Math.random() * (139 - 120) + 120);
          diastolic = Math.floor(Math.random() * (89 - 75) + 75);
        } else {
          // High range
          systolic = Math.floor(Math.random() * (170 - 140) + 140);
          diastolic = Math.floor(Math.random() * (100 - 90) + 90);
        }
        
        pulse = Math.floor(Math.random() * (100 - 55) + 55);
        
        mockResult = {
          type: 'bp',
          values: { systolic, diastolic, pulse },
          status: 'normal', // Will be updated by AI
          date: new Date().toLocaleDateString(),
        };
      } else {
        // Weight/BMI - 30% chance of at-risk, 20% chance of obese for testing
        const height = Math.floor(Math.random() * (180 - 150) + 150);
        let weight: number;
        
        if (randomChance < 0.5) {
          // Normal BMI range (18.5-22.9 for Asians)
          const targetBmi = Math.random() * (22.9 - 18.5) + 18.5;
          weight = Math.round(targetBmi * Math.pow(height / 100, 2));
        } else if (randomChance < 0.8) {
          // At-risk/Overweight BMI (23-27)
          const targetBmi = Math.random() * (27 - 23) + 23;
          weight = Math.round(targetBmi * Math.pow(height / 100, 2));
        } else {
          // Obese BMI (28+)
          const targetBmi = Math.random() * (35 - 28) + 28;
          weight = Math.round(targetBmi * Math.pow(height / 100, 2));
        }
        
        const bmi = parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
        
        mockResult = {
          type: 'weight',
          values: { height, weight, bmi },
          status: 'normal', // Will be updated by AI
          date: new Date().toLocaleDateString(),
        };
      }

      // Call AI to assess severity based on age and gender
      try {
        const healthData = {
          type: mockResult.type,
          ...(mockResult.type === 'bp' ? {
            systolic: mockResult.values.systolic as number,
            diastolic: mockResult.values.diastolic as number,
            pulse: mockResult.values.pulse as number,
          } : {
            height: mockResult.values.height as number,
            weight: mockResult.values.weight as number,
            bmi: mockResult.values.bmi as number,
          }),
          age: userAge,
          gender: userGender,
        };

        const { data: assessmentData, error: assessmentError } = await supabase.functions.invoke(
          'assess-health-severity',
          { body: { healthData } }
        );

        if (!assessmentError && assessmentData) {
          mockResult.status = assessmentData.status || 'normal';
          setAiReason(assessmentData.reason || '');
          setAiRecommendations(assessmentData.recommendations || []);
        }
      } catch (error) {
        console.error('Error getting AI assessment:', error);
      }
      
      setResult(mockResult);
      setState('result');
      await saveResult(mockResult);
    }, 3000);
  };

  const handleBack = () => {
    if (state === 'select') {
      navigate('/dashboard');
    } else {
      setState('select');
      setSelectedType(null);
      setResult(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const bpResults = pastResults.filter(r => r.screening_type === 'bp');
  const weightResults = pastResults.filter(r => r.screening_type === 'weight');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
      {/* Header */}
      <header className="bg-card shadow-soft p-6 mb-8">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            onMouseEnter={() => handleMouseEnter(t('common.back'))}
            onMouseLeave={handleMouseLeave}
            className="w-14 h-14 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-heading text-foreground cursor-default" onMouseEnter={() => handleMouseEnter(t('health.title'))} onMouseLeave={handleMouseLeave}>{t('health.title')}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        {/* Selection state */}
        {state === 'select' && (
          <div className="space-y-6">
            {/* Screening options */}
            <div className="space-y-4">
              {screeningOptions.map((option, index) => (
                <Button
                  key={option.id}
                  variant="menu"
                  size="menu"
                  onClick={() => handleSelectScreening(option.id)}
                  onMouseEnter={() => handleMouseEnter(t(option.titleKey))}
                  onMouseLeave={handleMouseLeave}
                  className="w-full animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-16 h-16 rounded-2xl ${option.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <option.icon className={`w-8 h-8 ${option.color}`} />
                  </div>
                  <div className="flex-1 min-w-0" onMouseEnter={() => handleMouseEnter(`${t(option.titleKey)}. ${t(option.descKey)}`)} onMouseLeave={handleMouseLeave}>
                    <h3 className="text-xl font-bold text-foreground">{t(option.titleKey)}</h3>
                    <p className="text-base text-muted-foreground">{t(option.descKey)}</p>
                  </div>
                </Button>
              ))}
            </div>

            {/* Past Results Section */}
            {!loading && (bpResults.length > 0 || weightResults.length > 0) && (
              <div className="mt-8 animate-fade-in">
                <div className="flex items-center gap-2 mb-4" onMouseEnter={() => handleMouseEnter(t('health.pastResults'))} onMouseLeave={handleMouseLeave}>
                  <History className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground cursor-default">{t('health.pastResults')}</h2>
                </div>

                <div className="space-y-4">
                  {/* Blood Pressure Results */}
                  {bpResults.length > 0 && (
                    <div className="bg-card rounded-2xl shadow-soft p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-destructive" />
                        </div>
                        <p className="font-semibold text-foreground">{t('health.bp')}</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                        {bpResults.map((bp) => (
                          <div key={bp.id} className="bg-muted rounded-xl p-3">
                            <p className="text-xs text-muted-foreground mb-2">{formatDate(bp.recorded_at)}</p>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Systolic</p>
                                <p className="text-lg font-bold text-foreground">{bp.systolic}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Diastolic</p>
                                <p className="text-lg font-bold text-foreground">{bp.diastolic}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Pulse</p>
                                <p className="text-lg font-bold text-foreground">{bp.pulse}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Weight Results */}
                  {weightResults.length > 0 && (
                    <div className="bg-card rounded-2xl shadow-soft p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Ruler className="w-5 h-5 text-primary" />
                        </div>
                        <p className="font-semibold text-foreground">{t('health.weight')}</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                        {weightResults.map((weight) => (
                          <div key={weight.id} className="bg-muted rounded-xl p-3">
                            <p className="text-xs text-muted-foreground mb-2">{formatDate(weight.recorded_at)}</p>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Height</p>
                                <p className="text-lg font-bold text-foreground">{weight.height}</p>
                                <p className="text-xs text-muted-foreground">cm</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Weight</p>
                                <p className="text-lg font-bold text-foreground">{weight.weight}</p>
                                <p className="text-xs text-muted-foreground">kg</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">BMI</p>
                                <p className="text-lg font-bold text-foreground">{weight.bmi}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Measuring state */}
        {state === 'measuring' && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-8">
              <Activity className="w-16 h-16 text-primary animate-pulse" />
            </div>
            <p 
              className="text-heading text-foreground mb-2 cursor-default"
              onMouseEnter={() => handleMouseEnter(selectedType === 'bp' ? t('health.bp') : t('health.weight'))}
              onMouseLeave={handleMouseLeave}
            >
              {selectedType === 'bp' ? t('health.bp') : t('health.weight')}
            </p>
            <p 
              className="text-body-large text-muted-foreground cursor-default"
              onMouseEnter={() => handleMouseEnter(t('scan.scanning'))}
              onMouseLeave={handleMouseLeave}
            >
              {t('scan.scanning')}
            </p>
            <div className="mt-8 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {/* Result state */}
        {state === 'result' && result && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-card rounded-3xl shadow-medium p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  result.status === 'normal' ? 'bg-success/20' : 
                  result.status === 'warning' ? 'bg-warning/20' : 'bg-destructive/20'
                }`}>
                  {result.status === 'normal' ? (
                    <CheckCircle2 className="w-10 h-10 text-success" />
                  ) : result.status === 'warning' ? (
                    <AlertTriangle className="w-10 h-10 text-warning" />
                  ) : (
                    <AlertCircle className="w-10 h-10 text-destructive" />
                  )}
                </div>
                <div onMouseEnter={() => handleMouseEnter(`${t('health.result')}: ${t(`health.${result.status}`)}`)} onMouseLeave={handleMouseLeave}>
                  <p className="text-lg text-muted-foreground cursor-default">{t('health.result')}</p>
                  <p className={`text-2xl font-bold cursor-default ${
                    result.status === 'normal' ? 'text-success' : 
                    result.status === 'warning' ? 'text-warning' : 'text-destructive'
                  }`}>
                    {result.status === 'normal' ? t('health.normal') : 
                     result.status === 'warning' ? t('health.warning') : t('health.high')}
                  </p>
                </div>
              </div>

              {result.type === 'bp' ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Systolic</p>
                    <p className="text-3xl font-bold text-foreground">{result.values.systolic}</p>
                    <p className="text-sm text-muted-foreground">mmHg</p>
                  </div>
                  <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Diastolic</p>
                    <p className="text-3xl font-bold text-foreground">{result.values.diastolic}</p>
                    <p className="text-sm text-muted-foreground">mmHg</p>
                  </div>
                  <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Pulse</p>
                    <p className="text-3xl font-bold text-foreground">{result.values.pulse}</p>
                    <p className="text-sm text-muted-foreground">bpm</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Height</p>
                    <p className="text-3xl font-bold text-foreground">{result.values.height}</p>
                    <p className="text-sm text-muted-foreground">cm</p>
                  </div>
                  <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Weight</p>
                    <p className="text-3xl font-bold text-foreground">{result.values.weight}</p>
                    <p className="text-sm text-muted-foreground">kg</p>
                  </div>
                  <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">BMI</p>
                    <p className="text-3xl font-bold text-foreground">{result.values.bmi}</p>
                    <p className="text-sm text-muted-foreground">kg/m²</p>
                  </div>
                </div>
              )}

              {/* AI Assessment Reason */}
              {aiReason && (
                <div className="mt-6 p-4 bg-muted rounded-2xl">
                  <p className="text-base text-foreground font-medium mb-2">{t('health.assessment')}</p>
                  <p className="text-base text-muted-foreground">{aiReason}</p>
                  {aiRecommendations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-foreground mb-1">{t('health.recommendations')}</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {aiRecommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <p className="text-center text-muted-foreground mt-6">
                {t('health.date')}: {result.date}
              </p>
            </div>

            {/* AI Programme Recommendations */}
            <ProgrammeRecommendations 
              healthData={
                result.type === 'bp' 
                  ? {
                      systolic: result.values.systolic as number,
                      diastolic: result.values.diastolic as number,
                      pulse: result.values.pulse as number,
                      age: userAge,
                      gender: userGender,
                    }
                  : {
                      height: result.values.height as number,
                      weight: result.values.weight as number,
                      bmi: result.values.bmi as number,
                      age: userAge,
                      gender: userGender,
                    }
              }
            />

            <Button
              variant="default"
              size="xl"
              onClick={handleBack}
              onMouseEnter={() => handleMouseEnter(t('common.done'))}
              onMouseLeave={handleMouseLeave}
              className="w-full"
            >
              {t('common.done')}
            </Button>
          </div>
        )}
      </main>

      <AccessibilityBar />
    </div>
  );
}
