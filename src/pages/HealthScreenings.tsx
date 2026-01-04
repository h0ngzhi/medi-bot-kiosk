import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { 
  ArrowLeft, 
  Heart, 
  Ruler,
  CheckCircle2,
  Activity
} from 'lucide-react';

type ScreeningType = 'bp' | 'weight' | null;
type ScreeningState = 'select' | 'measuring' | 'result';

interface ScreeningResult {
  type: ScreeningType;
  values: Record<string, string | number>;
  status: 'normal' | 'warning' | 'high';
  date: string;
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
  const { t } = useApp();
  const navigate = useNavigate();
  const [state, setState] = useState<ScreeningState>('select');
  const [selectedType, setSelectedType] = useState<ScreeningType>(null);
  const [result, setResult] = useState<ScreeningResult | null>(null);

  const handleSelectScreening = (type: ScreeningType) => {
    setSelectedType(type);
    setState('measuring');

    // Simulate measurement
    setTimeout(() => {
      const mockResult: ScreeningResult = type === 'bp' 
        ? {
            type: 'bp',
            values: { systolic: 120, diastolic: 80, pulse: 72 },
            status: 'normal',
            date: new Date().toLocaleDateString(),
          }
        : {
            type: 'weight',
            values: { height: 158, weight: 62, bmi: 24.8 },
            status: 'normal',
            date: new Date().toLocaleDateString(),
          };
      
      setResult(mockResult);
      setState('result');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
      {/* Header */}
      <header className="bg-card shadow-soft p-6 mb-8">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="w-14 h-14 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-heading text-foreground">{t('health.title')}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        {/* Selection state */}
        {state === 'select' && (
          <div className="space-y-4">
            {screeningOptions.map((option, index) => (
              <Button
                key={option.id}
                variant="menu"
                size="menu"
                onClick={() => handleSelectScreening(option.id)}
                className="w-full animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-16 h-16 rounded-2xl ${option.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <option.icon className={`w-8 h-8 ${option.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-foreground">{t(option.titleKey)}</h3>
                  <p className="text-base text-muted-foreground">{t(option.descKey)}</p>
                </div>
              </Button>
            ))}
          </div>
        )}

        {/* Measuring state */}
        {state === 'measuring' && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-8">
              <Activity className="w-16 h-16 text-primary animate-pulse" />
            </div>
            <p className="text-heading text-foreground mb-2">
              {selectedType === 'bp' ? t('health.bp') : t('health.weight')}
            </p>
            <p className="text-body-large text-muted-foreground">
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
          <div className="animate-fade-in">
            <div className="bg-card rounded-3xl shadow-medium p-8 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </div>
                <div>
                  <p className="text-lg text-muted-foreground">{t('health.result')}</p>
                  <p className="text-2xl font-bold text-success">{t('health.normal')}</p>
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

              <p className="text-center text-muted-foreground mt-6">
                {t('health.date')}: {result.date}
              </p>
            </div>

            <Button
              variant="default"
              size="xl"
              onClick={handleBack}
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
