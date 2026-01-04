import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Pill, 
  Truck, 
  Building2,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  Stethoscope
} from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  purpose: string;
  status: 'ongoing' | 'completed' | 'upcoming';
  deliveryStatus: string;
  prescribedBy: string;
}

export default function Medications() {
  const { user, t } = useApp();
  const navigate = useNavigate();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [deliveryOption, setDeliveryOption] = useState<'home' | 'clinic' | null>(null);
  const [paymentOption, setPaymentOption] = useState<'card' | 'bill' | null>(null);

  useEffect(() => {
    const fetchMedications = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('kiosk_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching medications:', error);
        return;
      }

      if (data && data.length > 0) {
        const mappedMedications: Medication[] = data.map(med => ({
          id: med.id,
          name: med.name,
          purpose: getPurpose(med.name),
          status: med.is_current ? 'ongoing' : 'completed',
          deliveryStatus: getDeliveryStatusText(med.delivery_status),
          prescribedBy: 'Polyclinic doctor',
        }));
        setMedications(mappedMedications);
      } else {
        // Show demo medications for demonstration
        setMedications([
          {
            id: '1',
            name: 'Amlodipine',
            purpose: t('meds.purpose.bp'),
            status: 'ongoing',
            deliveryStatus: t('meds.delivery.scheduled'),
            prescribedBy: t('meds.prescriber.polyclinic'),
          },
          {
            id: '2',
            name: 'Metformin',
            purpose: t('meds.purpose.chronic'),
            status: 'ongoing',
            deliveryStatus: t('meds.delivery.ready'),
            prescribedBy: t('meds.prescriber.hospital'),
          },
          {
            id: '3',
            name: 'Omeprazole',
            purpose: t('meds.purpose.digestive'),
            status: 'completed',
            deliveryStatus: t('meds.delivery.delivered'),
            prescribedBy: t('meds.prescriber.polyclinic'),
          },
        ]);
      }
    };

    fetchMedications();
  }, [user?.id, t]);

  const getPurpose = (name: string): string => {
    const purposes: Record<string, string> = {
      'Amlodipine': t('meds.purpose.bp'),
      'Metformin': t('meds.purpose.chronic'),
      'Omeprazole': t('meds.purpose.digestive'),
    };
    return purposes[name] || t('meds.purpose.general');
  };

  const getDeliveryStatusText = (status: string): string => {
    switch (status) {
      case 'pending': return t('meds.delivery.scheduled');
      case 'shipped': return t('meds.delivery.shipped');
      case 'delivered': return t('meds.delivery.delivered');
      default: return t('meds.delivery.ready');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ongoing': return <Clock className="w-5 h-5 text-primary" />;
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'upcoming': return <Calendar className="w-5 h-5 text-warning" />;
      default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ongoing': return t('meds.status.ongoing');
      case 'completed': return t('meds.status.completed');
      case 'upcoming': return t('meds.status.upcoming');
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
      {/* Header */}
      <header className="bg-card shadow-soft p-6 mb-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 -ml-2 text-lg h-14"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            {t('common.back')}
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Pill className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-heading text-foreground">{t('meds.title')}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 space-y-6">
        {/* Medication Cards */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">{t('meds.yourMeds')}</h2>
          <div className="space-y-4">
            {medications.map((med) => (
              <div
                key={med.id}
                className="bg-card rounded-2xl p-5 shadow-soft border border-border"
              >
                {/* Medication Name & Purpose */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{med.name}</h3>
                    <p className="text-lg text-muted-foreground">{med.purpose}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
                    {getStatusIcon(med.status)}
                    <span className="text-base font-medium text-foreground">
                      {getStatusText(med.status)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-lg">
                    <Truck className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{med.deliveryStatus}</span>
                  </div>
                  <div className="flex items-center gap-3 text-lg">
                    <Stethoscope className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{med.prescribedBy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery Options */}
        <section className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <h2 className="text-xl font-bold text-foreground mb-2">{t('meds.deliveryTitle')}</h2>
          <p className="text-lg text-muted-foreground mb-4">{t('meds.deliveryInfo')}</p>
          
          <div className="space-y-3">
            <Button
              variant={deliveryOption === 'home' ? 'default' : 'outline'}
              className="w-full h-16 text-lg justify-start gap-4"
              onClick={() => setDeliveryOption('home')}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              {t('meds.delivery.home')}
            </Button>
            <Button
              variant={deliveryOption === 'clinic' ? 'default' : 'outline'}
              className="w-full h-16 text-lg justify-start gap-4"
              onClick={() => setDeliveryOption('clinic')}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-secondary" />
              </div>
              {t('meds.delivery.clinic')}
            </Button>
          </div>
        </section>

        {/* Payment Options */}
        <section className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <h2 className="text-xl font-bold text-foreground mb-4">{t('meds.paymentTitle')}</h2>
          
          <div className="space-y-3">
            <Button
              variant={paymentOption === 'card' ? 'default' : 'outline'}
              className="w-full h-16 text-lg justify-start gap-4"
              onClick={() => setPaymentOption('card')}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              {t('meds.payment.card')}
            </Button>
            <Button
              variant={paymentOption === 'bill' ? 'default' : 'outline'}
              className="w-full h-16 text-lg justify-start gap-4"
              onClick={() => setPaymentOption('bill')}
            >
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-warning" />
              </div>
              <div className="text-left">
                <span>{t('meds.payment.bill')}</span>
                <p className="text-sm text-muted-foreground font-normal">{t('meds.payment.billDesc')}</p>
              </div>
            </Button>
          </div>
        </section>

        {/* Disclaimer */}
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <p className="text-base text-muted-foreground text-center leading-relaxed">
            {t('meds.disclaimer')}
          </p>
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
