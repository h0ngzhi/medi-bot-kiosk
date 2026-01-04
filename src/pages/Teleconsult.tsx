import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { 
  ArrowLeft, 
  Building2, 
  Hospital,
  CreditCard,
  Banknote,
  AlertTriangle,
  Video,
  Loader2,
  CheckCircle2
} from 'lucide-react';

type ConsultState = 'select' | 'payment' | 'connecting' | 'connected';

export default function Teleconsult() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [state, setState] = useState<ConsultState>('select');
  const [doctorType, setDoctorType] = useState<'polyclinic' | 'hospital' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | null>(null);

  const handleSelectDoctor = (type: 'polyclinic' | 'hospital') => {
    setDoctorType(type);
    setState('payment');
  };

  const handleSelectPayment = (method: 'card' | 'cash') => {
    setPaymentMethod(method);
  };

  const handleStartConsult = () => {
    if (!paymentMethod) return;
    
    setState('connecting');
    
    setTimeout(() => {
      setState('connected');
    }, 3000);
  };

  const handleBack = () => {
    if (state === 'select') {
      navigate('/dashboard');
    } else if (state === 'payment') {
      setState('select');
      setDoctorType(null);
      setPaymentMethod(null);
    } else {
      setState('select');
      setDoctorType(null);
      setPaymentMethod(null);
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
          <div>
            <h1 className="text-heading text-foreground">{t('teleconsult.title')}</h1>
            <p className="text-base text-muted-foreground">{t('teleconsult.subtitle')}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        {/* Doctor selection */}
        {state === 'select' && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-4">
              <Button
                variant="menu"
                size="menu"
                onClick={() => handleSelectDoctor('polyclinic')}
                className="w-full"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-foreground">{t('teleconsult.polyclinic')}</h3>
                </div>
              </Button>

              <Button
                variant="menu"
                size="menu"
                onClick={() => handleSelectDoctor('hospital')}
                className="w-full"
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Hospital className="w-8 h-8 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-foreground">{t('teleconsult.hospital')}</h3>
                </div>
              </Button>
            </div>

            {/* Warning notice */}
            <div className="bg-warning/10 rounded-2xl p-6 flex gap-4 border border-warning/20">
              <AlertTriangle className="w-8 h-8 text-warning flex-shrink-0" />
              <p className="text-base text-foreground">
                {t('teleconsult.serious')}
              </p>
            </div>
          </div>
        )}

        {/* Payment selection */}
        {state === 'payment' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-heading text-foreground">{t('teleconsult.payment')}</h2>

            <div className="space-y-4">
              <Button
                variant={paymentMethod === 'card' ? 'default' : 'menu'}
                size="menu"
                onClick={() => handleSelectPayment('card')}
                className="w-full"
              >
                <div className={`w-16 h-16 rounded-2xl ${paymentMethod === 'card' ? 'bg-primary-foreground/20' : 'bg-primary/10'} flex items-center justify-center flex-shrink-0`}>
                  <CreditCard className={`w-8 h-8 ${paymentMethod === 'card' ? 'text-primary-foreground' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xl font-bold ${paymentMethod === 'card' ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {t('teleconsult.card')}
                  </h3>
                </div>
                {paymentMethod === 'card' && (
                  <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
                )}
              </Button>

              <Button
                variant={paymentMethod === 'cash' ? 'default' : 'menu'}
                size="menu"
                onClick={() => handleSelectPayment('cash')}
                className="w-full"
              >
                <div className={`w-16 h-16 rounded-2xl ${paymentMethod === 'cash' ? 'bg-primary-foreground/20' : 'bg-success/10'} flex items-center justify-center flex-shrink-0`}>
                  <Banknote className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-primary-foreground' : 'text-success'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xl font-bold ${paymentMethod === 'cash' ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {t('teleconsult.cash')}
                  </h3>
                </div>
                {paymentMethod === 'cash' && (
                  <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
                )}
              </Button>
            </div>

            <Button
              variant="warm"
              size="xl"
              onClick={handleStartConsult}
              disabled={!paymentMethod}
              className="w-full mt-8"
            >
              <Video className="w-6 h-6" />
              {t('teleconsult.start')}
            </Button>
          </div>
        )}

        {/* Connecting state */}
        {state === 'connecting' && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-secondary/10 flex items-center justify-center mb-8">
              <Loader2 className="w-16 h-16 text-secondary animate-spin" />
            </div>
            <p className="text-heading text-foreground mb-2">
              {t('teleconsult.connecting')}
            </p>
            <div className="mt-8 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-3 h-3 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-3 h-3 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {/* Connected state - simulated video call */}
        {state === 'connected' && (
          <div className="animate-fade-in">
            <div className="aspect-video bg-card rounded-3xl shadow-medium overflow-hidden mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Video className="w-12 h-12 text-primary" />
                  </div>
                  <p className="text-heading text-foreground">Dr. Lim Wei Ming</p>
                  <p className="text-muted-foreground">{doctorType === 'polyclinic' ? t('teleconsult.polyclinic') : t('teleconsult.hospital')}</p>
                </div>
              </div>
              
              {/* Self view */}
              <div className="absolute bottom-4 right-4 w-24 h-32 bg-muted rounded-xl shadow-medium" />
            </div>

            <Button
              variant="destructive"
              size="xl"
              onClick={handleBack}
              className="w-full"
            >
              End Call
            </Button>
          </div>
        )}
      </main>

      <AccessibilityBar />
    </div>
  );
}
