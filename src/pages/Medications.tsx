import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { speakText } from '@/utils/speechUtils';
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
  ArrowRight,
  Plus,
  Minus
} from 'lucide-react';
import { MedicationCardPaymentForm } from '@/components/medications/MedicationCardPaymentForm';
import { MedicationBillingForm } from '@/components/medications/MedicationBillingForm';
import { ClinicSelector } from '@/components/medications/ClinicSelector';
import { OrderSummary } from '@/components/medications/OrderSummary';
import { Checkbox } from '@/components/ui/checkbox';

interface PastMedication {
  id: string;
  name: string;
  purpose: string;
  status: 'ongoing' | 'completed';
  deliveryStatus: string;
  deliveryMethod: 'home' | 'clinic' | null;
  collectionClinic: string | null;
  prescribedBy: string;
  lastOrderDate: string;
}

interface OrderableMedication {
  id: string;
  name: string;
  purpose: string;
  pricePerBox: number;
  tabletsPerBox: number;
  prescribedBy: string;
  selected?: boolean;
  quantity: number;
}

type Step = 'select' | 'delivery' | 'confirmation';

export default function Medications() {
  const { user, t, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };
  
  const [pastMedications, setPastMedications] = useState<PastMedication[]>([]);
  const [orderableMedications, setOrderableMedications] = useState<OrderableMedication[]>([]);
  const [step, setStep] = useState<Step>('select');
  const [deliveryOption, setDeliveryOption] = useState<'home' | 'clinic' | null>(null);
  const [paymentOption, setPaymentOption] = useState<'card' | 'bill' | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // CHAS subsidy percentages - keys match the chasType from user profile
  const getSubsidyPercent = (type: string): number => {
    const lower = type?.toLowerCase() || 'blue';
    if (lower.includes('pioneer')) return 85;
    if (lower.includes('merdeka')) return 80;
    if (lower === 'green') return 75;
    if (lower === 'orange') return 65;
    return 50; // Blue default
  };

  const chasType = user?.chasType || 'Blue';
  const subsidyPercent = getSubsidyPercent(chasType);
  const deliveryFee = deliveryOption === 'home' ? 5.00 : 0;

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const fetchMedications = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('kiosk_user_id', user.id)
      .order('order_completed_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching medications:', error);
      return;
    }

    if (data && data.length > 0) {
      const mappedPast: PastMedication[] = data.map(med => ({
        id: med.id,
        name: med.name,
        purpose: getPurpose(med.name),
        status: med.is_current ? 'ongoing' : 'completed',
        deliveryStatus: getDeliveryStatusText(med.delivery_status, med.delivery_method, med.collection_clinic),
        deliveryMethod: med.delivery_method as 'home' | 'clinic' | null,
        collectionClinic: med.collection_clinic,
        prescribedBy: 'Polyclinic doctor',
        lastOrderDate: formatDateTime(med.order_completed_at || med.created_at),
      }));
      setPastMedications(mappedPast);
    } else {
      // Show demo medications for demonstration
      setPastMedications([
        {
          id: '1',
          name: 'Amlodipine 5mg',
          purpose: t('meds.purpose.bp'),
          status: 'ongoing',
          deliveryStatus: t('meds.delivery.scheduled'),
          deliveryMethod: 'home',
          collectionClinic: null,
          prescribedBy: t('meds.prescriber.polyclinic'),
          lastOrderDate: '15 Dec 2025',
        },
        {
          id: '2',
          name: 'Metformin 500mg',
          purpose: t('meds.purpose.chronic'),
          status: 'ongoing',
          deliveryStatus: t('meds.delivery.ready'),
          deliveryMethod: 'clinic',
          collectionClinic: 'Bedok Polyclinic',
          prescribedBy: t('meds.prescriber.hospital'),
          lastOrderDate: '10 Dec 2025',
        },
        {
          id: '3',
          name: 'Omeprazole 20mg',
          purpose: t('meds.purpose.digestive'),
          status: 'completed',
          deliveryStatus: t('meds.delivery.delivered'),
          deliveryMethod: 'home',
          collectionClinic: null,
          prescribedBy: t('meds.prescriber.polyclinic'),
          lastOrderDate: '01 Nov 2025',
        },
      ]);
    }
    
    // Always show all available medications for ordering
    setOrderableMedications([
      {
        id: 'order-1',
        name: 'Amlodipine 5mg',
        purpose: t('meds.purpose.bp'),
        pricePerBox: 12.50,
        tabletsPerBox: 30,
        prescribedBy: t('meds.prescriber.polyclinic'),
        selected: false,
        quantity: 1,
      },
      {
        id: 'order-2',
        name: 'Metformin 500mg',
        purpose: t('meds.purpose.chronic'),
        pricePerBox: 18.00,
        tabletsPerBox: 60,
        prescribedBy: t('meds.prescriber.hospital'),
        selected: false,
        quantity: 1,
      },
      {
        id: 'order-3',
        name: 'Omeprazole 20mg',
        purpose: t('meds.purpose.digestive'),
        pricePerBox: 8.50,
        tabletsPerBox: 14,
        prescribedBy: t('meds.prescriber.polyclinic'),
        selected: false,
        quantity: 1,
      },
    ]);
  };

  useEffect(() => {
    fetchMedications();
  }, [user?.id, t]);

  // Real-time subscription for delivery status updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('medications-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'medications',
          filter: `kiosk_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Medication update received:', payload);
          // Update the past medications list with new delivery status
          setPastMedications(prev => prev.map(med => {
            if (med.id === payload.new.id) {
              return {
                ...med,
                deliveryStatus: getDeliveryStatusText(payload.new.delivery_status, payload.new.delivery_method, payload.new.collection_clinic),
                deliveryMethod: payload.new.delivery_method,
                collectionClinic: payload.new.collection_clinic,
                status: payload.new.is_current ? 'ongoing' : 'completed',
              };
            }
            return med;
          }));
          
          toast({
            title: t('meds.statusUpdate'),
            description: `${payload.new.name}: ${getDeliveryStatusText(payload.new.delivery_status, payload.new.delivery_method, payload.new.collection_clinic)}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, t, toast]);

  const getPrice = (name: string): number => {
    if (name.includes('Amlodipine')) return 12.50;
    if (name.includes('Metformin')) return 18.00;
    if (name.includes('Omeprazole')) return 8.50;
    return 10.00;
  };

  const getTablets = (name: string): number => {
    if (name.includes('Amlodipine')) return 30;
    if (name.includes('Metformin')) return 60;
    if (name.includes('Omeprazole')) return 14;
    return 30;
  };

  const getPurpose = (name: string): string => {
    if (name.includes('Amlodipine')) return t('meds.purpose.bp');
    if (name.includes('Metformin')) return t('meds.purpose.chronic');
    if (name.includes('Omeprazole')) return t('meds.purpose.digestive');
    return t('meds.purpose.general');
  };

  const getDeliveryStatusText = (status: string, deliveryMethod?: string | null, clinicName?: string | null): string => {
    // For clinic collection
    if (deliveryMethod === 'clinic') {
      switch (status) {
        case 'pending': return `Ready for collection${clinicName ? ` at ${clinicName}` : ''}`;
        case 'delivered': return 'Collected';
        default: return t('meds.delivery.ready');
      }
    }
    // For home delivery
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
    setOrderableMedications(prev => prev.map(med => 
      med.id === id ? { ...med, selected: !med.selected } : med
    ));
  };

  const updateQuantity = (id: string, delta: number) => {
    setOrderableMedications(prev => prev.map(med => {
      if (med.id === id) {
        const newQty = Math.max(1, Math.min(10, med.quantity + delta));
        return { ...med, quantity: newQty, selected: true };
      }
      return med;
    }));
  };

  const selectedMeds = orderableMedications.filter(m => m.selected);
  const canProceed = selectedMeds.length > 0;

  const calculateSubtotal = (): number => {
    return selectedMeds.reduce((sum, med) => sum + (med.pricePerBox * med.quantity), 0);
  };

  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal();
    const subsidyAmount = subtotal * (subsidyPercent / 100);
    return subtotal - subsidyAmount + deliveryFee;
  };

  const getTotalBoxes = (): number => {
    return selectedMeds.reduce((sum, med) => sum + med.quantity, 0);
  };

  const handlePaymentSubmit = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not found. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const now = new Date().toISOString();

      // Insert each selected medication as a new order (one record per box)
      const medicationsToInsert = selectedMeds.flatMap(med => {
        const perBoxAfterSubsidy = med.pricePerBox * (1 - subsidyPercent / 100);
        return Array.from({ length: med.quantity }, () => ({
          kiosk_user_id: user.id,
          name: med.name,
          dosage: med.name.split(' ').pop() || null,
          price_per_box: med.pricePerBox,
          tablets_per_box: med.tabletsPerBox,
          payment_method: paymentOption,
          delivery_method: deliveryOption,
          collection_clinic: deliveryOption === 'clinic' ? selectedClinic : null,
          delivery_status: 'pending',
          is_current: true,
          order_completed_at: now,
          subsidy_percent: subsidyPercent,
          total_paid: perBoxAfterSubsidy,
        }));
      });

      const { error } = await supabase
        .from('medications')
        .insert(medicationsToInsert);

      if (error) {
        throw error;
      }

      // Refetch medications to update past medications list
      await fetchMedications();

      setOrderComplete(true);
      toast({
        title: t('meds.orderPlaced'),
        description: t('meds.orderPlacedDesc'),
      });
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
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

            <Button 
              variant="warm" 
              size="xl" 
              className="w-full" 
              onClick={() => navigate('/dashboard')}
              onMouseEnter={() => handleSpeak(t('teleconsult.returnDashboard'))}
            >
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
            onMouseEnter={() => handleSpeak(t('common.back'))}
            className="mb-4 -ml-2 text-lg h-14"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            {t('common.back')}
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Pill className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-heading text-foreground cursor-default" onMouseEnter={() => handleSpeak(t('meds.title'))}>{t('meds.title')}</h1>
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
            <span className="cursor-default" onMouseEnter={() => handleSpeak(t('meds.step1'))}>{t('meds.step1')}</span>
            <span className="cursor-default" onMouseEnter={() => handleSpeak(t('meds.step2'))}>{t('meds.step2')}</span>
            <span className="cursor-default" onMouseEnter={() => handleSpeak(t('meds.step3'))}>{t('meds.step3')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 space-y-6">
        {/* Step 1: Select Medications */}
        {step === 'select' && (
          <>
            {/* Past Medications - Reference Only */}
            <section>
              <h2 className="text-xl font-bold text-foreground mb-2 cursor-default" onMouseEnter={() => handleSpeak(t('meds.pastMeds'))}>{t('meds.pastMeds')}</h2>
              <p className="text-muted-foreground mb-4 cursor-default" onMouseEnter={() => handleSpeak(t('meds.pastMedsDesc'))}>{t('meds.pastMedsDesc')}</p>
              <div className="space-y-3">
                {pastMedications.map((med) => (
                  <div
                    key={med.id}
                    className="bg-card rounded-2xl p-4 shadow-soft border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1" onMouseEnter={() => handleSpeak(`${med.name}. ${med.purpose}. ${getStatusText(med.status)}. ${med.deliveryStatus}`)}>
                        <h3 className="text-lg font-bold text-foreground cursor-default">{med.name}</h3>
                        <p className="text-muted-foreground cursor-default">{med.purpose}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
                            {getStatusIcon(med.status)}
                            <span className="font-medium text-foreground">
                              {getStatusText(med.status)}
                            </span>
                          </div>
                          <span className="text-muted-foreground">{med.deliveryStatus}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{t('meds.lastOrder')}</p>
                        <p className="font-medium text-foreground">{med.lastOrderDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Order Medications */}
            <section>
              <h2 className="text-xl font-bold text-foreground mb-2 cursor-default" onMouseEnter={() => handleSpeak(t('meds.orderMeds'))}>{t('meds.orderMeds')}</h2>
              <p className="text-muted-foreground mb-4 cursor-default" onMouseEnter={() => handleSpeak(t('meds.orderMedsDesc'))}>{t('meds.orderMedsDesc')}</p>
              <div className="space-y-4">
                {orderableMedications.map((med) => (
                  <div
                    key={med.id}
                    className={`bg-card rounded-2xl p-5 shadow-soft border-2 transition-all ${
                      med.selected ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox 
                        checked={med.selected}
                        className="mt-1 h-6 w-6 cursor-pointer"
                        onClick={() => toggleMedicationSelection(med.id)}
                      />
                      <div className="flex-1">
                        <div 
                          className="flex items-start justify-between mb-2 cursor-pointer"
                          onClick={() => toggleMedicationSelection(med.id)}
                          onMouseEnter={() => handleSpeak(`${med.name}. ${med.purpose}. S$${(med.pricePerBox * med.quantity).toFixed(2)}`)}
                        >
                          <div>
                            <h3 className="text-xl font-bold text-foreground">{med.name}</h3>
                            <p className="text-lg text-muted-foreground">{med.purpose}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-primary">S${(med.pricePerBox * med.quantity).toFixed(2)}</span>
                            <p className="text-sm text-muted-foreground">{t('meds.perBox')} ({med.tabletsPerBox} {t('meds.tablets')})</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Stethoscope className="w-4 h-4" />
                            <span>{med.prescribedBy}</span>
                          </div>
                          {/* Quantity Selector */}
                          <div className="flex items-center gap-3 bg-muted rounded-xl p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(med.id, -1);
                              }}
                              disabled={med.quantity <= 1}
                            >
                              <Minus className="w-5 h-5" />
                            </Button>
                            <span className="text-xl font-bold text-foreground min-w-[2rem] text-center">
                              {med.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(med.id, 1);
                              }}
                              disabled={med.quantity >= 10}
                            >
                              <Plus className="w-5 h-5" />
                            </Button>
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
              onMouseEnter={() => handleSpeak(t('meds.continuePayment'))}
            >
              <ShoppingCart className="w-5 h-5" />
              {t('meds.continuePayment')} ({getTotalBoxes()} {getTotalBoxes() === 1 ? 'box' : 'boxes'})
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            {/* Disclaimer */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <p className="text-base text-muted-foreground text-center leading-relaxed cursor-default" onMouseEnter={() => handleSpeak(t('meds.disclaimer'))}>
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
              medications={selectedMeds.map(m => ({ name: m.name, quantity: m.quantity, price: m.pricePerBox }))}
              deliveryOption={deliveryOption || 'home'}
              deliveryFee={deliveryOption === 'home' ? 5.00 : 0}
              subsidyPercent={subsidyPercent}
              chasType={chasType}
            />

            {/* Delivery Options */}
            <section className="bg-card rounded-2xl p-5 shadow-soft border border-border">
              <h2 className="text-xl font-bold text-foreground mb-2 cursor-default" onMouseEnter={() => handleSpeak(t('meds.deliveryTitle'))}>{t('meds.deliveryTitle')}</h2>
              <p className="text-lg text-muted-foreground mb-4 cursor-default" onMouseEnter={() => handleSpeak(t('meds.deliveryInfo'))}>{t('meds.deliveryInfo')}</p>
              
              <div className="space-y-3">
                <Button
                  variant={deliveryOption === 'home' ? 'default' : 'outline'}
                  className="w-full h-16 text-lg justify-start gap-4"
                  onClick={() => {
                    setDeliveryOption('home');
                    setSelectedClinic(null);
                  }}
                  onMouseEnter={() => handleSpeak(t('meds.delivery.home'))}
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
                  onMouseEnter={() => handleSpeak(t('meds.delivery.clinic'))}
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
                <h2 className="text-xl font-bold text-foreground mb-4 cursor-default" onMouseEnter={() => handleSpeak(t('meds.paymentTitle'))}>{t('meds.paymentTitle')}</h2>
                
                <div className="space-y-3">
                  <Button
                    variant={paymentOption === 'card' ? 'default' : 'outline'}
                    className="w-full h-16 text-lg justify-start gap-4"
                    onClick={() => {
                      setPaymentOption('card');
                      setStep('confirmation');
                    }}
                    onMouseEnter={() => handleSpeak(t('meds.payment.card'))}
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
                    onMouseEnter={() => handleSpeak(t('meds.payment.bill'))}
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
              medications={selectedMeds.map(m => ({ name: m.name, quantity: m.quantity, price: m.pricePerBox }))}
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
}
