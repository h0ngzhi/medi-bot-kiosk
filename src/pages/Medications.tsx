import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
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
  Stethoscope,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';
import { MedicationCardPaymentForm } from '@/components/medications/MedicationCardPaymentForm';
import { MedicationBillingForm } from '@/components/medications/MedicationBillingForm';
import { ClinicSelector } from '@/components/medications/ClinicSelector';
import { OrderSummary } from '@/components/medications/OrderSummary';
import { Checkbox } from '@/components/ui/checkbox';

interface Medication {
  id: string;
  name: string;
  purpose: string;
  status: 'ongoing' | 'completed' | 'upcoming';
  deliveryStatus: string;
  prescribedBy: string;
  price: number;
  quantity: number;
  selected?: boolean;
}

type Step = 'select' | 'delivery' | 'confirmation';

export default function Medications() {
  const { user, t } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [step, setStep] = useState<Step>('select');
  const [deliveryOption, setDeliveryOption] = useState<'home' | 'clinic' | null>(null);
  const [paymentOption, setPaymentOption] = useState<'card' | 'bill' | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // CHAS subsidy percentages
  const subsidyMap: Record<string, number> = {
    'Blue': 50,
    'Orange': 65,
    'Green': 75,
    'Merdeka Generation': 80,
    'Pioneer Generation': 85,
  };

  const chasType = user?.chasType || 'Blue';
  const subsidyPercent = subsidyMap[chasType] || 0;
  const deliveryFee = deliveryOption === 'home' ? 5.00 : 0;

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
          price: getPrice(med.name),
          quantity: 1,
          selected: med.is_current,
        }));
        setMedications(mappedMedications);
      } else {
        // Show demo medications for demonstration
        setMedications([
          {
            id: '1',
            name: 'Amlodipine 5mg',
            purpose: t('meds.purpose.bp'),
            status: 'ongoing',
            deliveryStatus: t('meds.delivery.scheduled'),
            prescribedBy: t('meds.prescriber.polyclinic'),
            price: 12.50,
            quantity: 30,
            selected: true,
          },
          {
            id: '2',
            name: 'Metformin 500mg',
            purpose: t('meds.purpose.chronic'),
            status: 'ongoing',
            deliveryStatus: t('meds.delivery.ready'),
            prescribedBy: t('meds.prescriber.hospital'),
            price: 18.00,
            quantity: 60,
            selected: true,
          },
          {
            id: '3',
            name: 'Omeprazole 20mg',
            purpose: t('meds.purpose.digestive'),
            status: 'completed',
            deliveryStatus: t('meds.delivery.delivered'),
            prescribedBy: t('meds.prescriber.polyclinic'),
            price: 8.50,
            quantity: 14,
            selected: false,
          },
        ]);
      }
    };

    fetchMedications();
  }, [user?.id, t]);

  const getPrice = (name: string): number => {
    const prices: Record<string, number> = {
      'Amlodipine': 12.50,
      'Metformin': 18.00,
      'Omeprazole': 8.50,
    };
    return prices[name] || 10.00;
  };

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

  const toggleMedicationSelection = (id: string) => {
    setMedications(prev => prev.map(med => 
      med.id === id ? { ...med, selected: !med.selected } : med
    ));
  };

  const selectedMeds = medications.filter(m => m.selected);
  const canProceed = selectedMeds.length > 0;

  const handlePaymentSubmit = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setOrderComplete(true);
    toast({
      title: t('meds.orderPlaced'),
      description: t('meds.orderPlacedDesc'),
    });
  };

  const handleBack = () => {
    if (step === 'delivery') {
      setStep('select');
    } else if (step === 'confirmation') {
      setStep('delivery');
      setPaymentOption(null);
    }
  };

  // Order complete view
  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
        <header className="bg-card shadow-soft p-6 mb-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-heading text-foreground">{t('meds.orderPlaced')}</h1>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 space-y-6">
          <div className="bg-card rounded-2xl p-6 shadow-soft border border-border text-center">
            <CheckCircle2 className="w-20 h-20 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('meds.orderPlaced')}</h2>
            <p className="text-lg text-muted-foreground mb-6">{t('meds.orderPlacedDesc')}</p>
            
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <p className="text-foreground">
                {deliveryOption === 'home' 
                  ? t('meds.delivery.scheduled')
                  : t('meds.collectAt')}
              </p>
            </div>

            <Button variant="warm" size="xl" className="w-full" onClick={() => navigate('/dashboard')}>
              {t('teleconsult.returnDashboard')}
            </Button>
          </div>
        </main>

        <AccessibilityBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
      {/* Header */}
      <header className="bg-card shadow-soft p-6 mb-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={step === 'select' ? () => navigate('/dashboard') : handleBack}
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

          {/* Step Indicator */}
          <div className="flex items-center justify-between mt-6">
            {['select', 'delivery', 'confirmation'].map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s 
                    ? 'bg-primary text-primary-foreground' 
                    : i < ['select', 'delivery', 'confirmation'].indexOf(step)
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    i < ['select', 'delivery', 'confirmation'].indexOf(step)
                      ? 'bg-success'
                      : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{t('meds.step1')}</span>
            <span>{t('meds.step2')}</span>
            <span>{t('meds.step3')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 space-y-6">
        {/* Step 1: Select Medications */}
        {step === 'select' && (
          <>
            <section>
              <h2 className="text-xl font-bold text-foreground mb-4">{t('meds.yourMeds')}</h2>
              <div className="space-y-4">
                {medications.map((med) => (
                  <div
                    key={med.id}
                    className={`bg-card rounded-2xl p-5 shadow-soft border-2 transition-all cursor-pointer ${
                      med.selected ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onClick={() => toggleMedicationSelection(med.id)}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox 
                        checked={med.selected}
                        className="mt-1 h-6 w-6"
                      />
                      <div className="flex-1">
                        {/* Medication Name & Purpose */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-foreground">{med.name}</h3>
                            <p className="text-lg text-muted-foreground">{med.purpose}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-primary">S${med.price.toFixed(2)}</span>
                            <p className="text-sm text-muted-foreground">x{med.quantity} tablets</p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
                            {getStatusIcon(med.status)}
                            <span className="font-medium text-foreground">
                              {getStatusText(med.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Stethoscope className="w-4 h-4" />
                            <span>{med.prescribedBy}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Continue Button */}
            <Button
              variant="warm"
              size="xl"
              className="w-full"
              disabled={!canProceed}
              onClick={() => setStep('delivery')}
            >
              <ShoppingCart className="w-5 h-5" />
              {t('meds.continuePayment')} ({selectedMeds.length})
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            {/* Disclaimer */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <p className="text-base text-muted-foreground text-center leading-relaxed">
                {t('meds.disclaimer')}
              </p>
            </div>
          </>
        )}

        {/* Step 2: Delivery & Payment Options */}
        {step === 'delivery' && (
          <>
            {/* Order Summary */}
            <OrderSummary
              medications={selectedMeds.map(m => ({ name: m.name, quantity: m.quantity, price: m.price }))}
              deliveryOption={deliveryOption || 'home'}
              deliveryFee={deliveryOption === 'home' ? 5.00 : 0}
              subsidyPercent={subsidyPercent}
              chasType={chasType}
            />

            {/* Delivery Options */}
            <section className="bg-card rounded-2xl p-5 shadow-soft border border-border">
              <h2 className="text-xl font-bold text-foreground mb-2">{t('meds.deliveryTitle')}</h2>
              <p className="text-lg text-muted-foreground mb-4">{t('meds.deliveryInfo')}</p>
              
              <div className="space-y-3">
                <Button
                  variant={deliveryOption === 'home' ? 'default' : 'outline'}
                  className="w-full h-16 text-lg justify-start gap-4"
                  onClick={() => {
                    setDeliveryOption('home');
                    setSelectedClinic(null);
                  }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    deliveryOption === 'home' ? 'bg-primary-foreground/20' : 'bg-primary/10'
                  }`}>
                    <Truck className={`w-6 h-6 ${deliveryOption === 'home' ? 'text-primary-foreground' : 'text-primary'}`} />
                  </div>
                  <div className="text-left flex-1">
                    <span>{t('meds.delivery.home')}</span>
                    <p className={`text-sm font-normal ${deliveryOption === 'home' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      +S$5.00
                    </p>
                  </div>
                </Button>
                <Button
                  variant={deliveryOption === 'clinic' ? 'default' : 'outline'}
                  className="w-full h-16 text-lg justify-start gap-4"
                  onClick={() => setDeliveryOption('clinic')}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    deliveryOption === 'clinic' ? 'bg-primary-foreground/20' : 'bg-secondary/10'
                  }`}>
                    <Building2 className={`w-6 h-6 ${deliveryOption === 'clinic' ? 'text-primary-foreground' : 'text-secondary'}`} />
                  </div>
                  <div className="text-left flex-1">
                    <span>{t('meds.delivery.clinic')}</span>
                    <p className={`text-sm font-normal ${deliveryOption === 'clinic' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {t('meds.free')}
                    </p>
                  </div>
                </Button>
              </div>
            </section>

            {/* Clinic Selector - shown when clinic delivery selected */}
            {deliveryOption === 'clinic' && (
              <ClinicSelector 
                selectedClinic={selectedClinic}
                onSelect={setSelectedClinic}
              />
            )}

            {/* Payment Options */}
            {deliveryOption && (deliveryOption === 'home' || selectedClinic) && (
              <section className="bg-card rounded-2xl p-5 shadow-soft border border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">{t('meds.paymentTitle')}</h2>
                
                <div className="space-y-3">
                  <Button
                    variant={paymentOption === 'card' ? 'default' : 'outline'}
                    className="w-full h-16 text-lg justify-start gap-4"
                    onClick={() => {
                      setPaymentOption('card');
                      setStep('confirmation');
                    }}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      paymentOption === 'card' ? 'bg-primary-foreground/20' : 'bg-primary/10'
                    }`}>
                      <CreditCard className={`w-6 h-6 ${paymentOption === 'card' ? 'text-primary-foreground' : 'text-primary'}`} />
                    </div>
                    {t('meds.payment.card')}
                  </Button>
                  <Button
                    variant={paymentOption === 'bill' ? 'default' : 'outline'}
                    className="w-full h-16 text-lg justify-start gap-4"
                    onClick={() => {
                      setPaymentOption('bill');
                      setStep('confirmation');
                    }}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      paymentOption === 'bill' ? 'bg-primary-foreground/20' : 'bg-warning/10'
                    }`}>
                      <FileText className={`w-6 h-6 ${paymentOption === 'bill' ? 'text-primary-foreground' : 'text-warning'}`} />
                    </div>
                    <div className="text-left">
                      <span>{t('meds.payment.bill')}</span>
                      <p className={`text-sm font-normal ${paymentOption === 'bill' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {t('meds.payment.billDesc')}
                      </p>
                    </div>
                  </Button>
                </div>
              </section>
            )}
          </>
        )}

        {/* Step 3: Payment Confirmation */}
        {step === 'confirmation' && (
          <>
            {/* Order Summary */}
            <OrderSummary
              medications={selectedMeds.map(m => ({ name: m.name, quantity: m.quantity, price: m.price }))}
              deliveryOption={deliveryOption || 'home'}
              deliveryFee={deliveryOption === 'home' ? 5.00 : 0}
              subsidyPercent={subsidyPercent}
              chasType={chasType}
            />

            {/* Payment Form */}
            {paymentOption === 'card' ? (
              <MedicationCardPaymentForm
                amount={calculateTotal()}
                onSubmit={handlePaymentSubmit}
                isProcessing={isProcessing}
                userName={user?.name || 'Guest'}
              />
            ) : (
              <MedicationBillingForm
                amount={calculateTotal()}
                onSubmit={handlePaymentSubmit}
                isProcessing={isProcessing}
                userName={user?.name || 'Guest'}
                isHomeDelivery={deliveryOption === 'home'}
              />
            )}
          </>
        )}
      </main>

      <AccessibilityBar />
    </div>
  );

  function calculateTotal(): number {
    const subtotal = selectedMeds.reduce((sum, med) => sum + (med.price * med.quantity), 0);
    const subsidyAmount = subtotal * (subsidyPercent / 100);
    const afterSubsidy = subtotal - subsidyAmount;
    return afterSubsidy + deliveryFee;
  }
}
