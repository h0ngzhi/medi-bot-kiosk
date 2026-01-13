import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, CheckCircle2, Phone, User, Printer, Loader2, FileText } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { speakText } from '@/utils/speechUtils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { NavigationPdfModal } from './NavigationPdfModal';

interface ProgrammeSignupFormProps {
  isOpen: boolean;
  onClose: () => void;
  programme: {
    id: string;
    title: string;
    event_date?: string | null;
    location?: string | null;
    admin_email?: string | null;
    contact_number?: string | null;
    is_online?: boolean | null;
    navigation_pdf_url?: string | null;
  };
  onSuccess: () => void;
}

export function ProgrammeSignupForm({ isOpen, onClose, programme }: ProgrammeSignupFormProps) {
  const { user, t, language, isTtsEnabled } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const handlePrintGuide = () => {
    // If there's a PDF, show the modal
    if (programme.navigation_pdf_url) {
      setShowPdfModal(true);
    } else {
      // Fallback to simulated print
      setIsPrinting(true);
      setTimeout(() => {
        setIsPrinting(false);
        setHasPrinted(true);
        toast.success(t('community.printSuccess'));
      }, 2000);
    }
  };

  const handleClose = () => {
    onClose();
    setSubmitted(false);
    setName(user?.name || '');
    setPhone('');
    setIsPrinting(false);
    setHasPrinted(false);
    setShowPdfModal(false);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Please scan your card first');
      return;
    }

    if (!name.trim() || !phone.trim()) {
      toast.error(t('community.fillAllFields'));
      return;
    }

    // Simple phone validation for Singapore numbers
    const phoneRegex = /^[689]\d{7}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      toast.error(t('community.invalidPhone'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert signup into database with name and phone
      const { error } = await supabase
        .from('user_programme_signups')
        .insert({
          kiosk_user_id: user.id,
          programme_id: programme.id,
          status: 'signed_up',
          participant_name: name.trim(),
          phone_number: phone.replace(/\s/g, '')
        });

      if (error) throw error;

      // Call webhook for n8n automation (fire and forget - don't block on this)
      try {
        await supabase.functions.invoke('programme-signup-webhook', {
          body: {
            participant_name: name.trim(),
            participant_phone: phone.replace(/\s/g, ''),
            programme_title: programme.title,
            programme_date: programme.event_date,
            programme_location: programme.location,
            admin_email: programme.admin_email,
            admin_phone: programme.contact_number,
            // n8n webhook URL will be configured in the edge function or passed here later
            webhook_url: null, // Will be configured in n8n settings
          }
        });
      } catch (webhookError) {
        // Don't fail signup if webhook fails
        console.log('Webhook notification skipped or failed:', webhookError);
      }

      setSubmitted(true);
      toast.success(t('community.signupSuccess'));
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(t('community.signupFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Only show print option for physical location programmes
  const showPrintOption = !programme.is_online && programme.location;
  const hasPdfCard = !!programme.navigation_pdf_url;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-card rounded-3xl shadow-lg max-w-md w-full p-6 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h3 
              className="text-xl font-bold text-foreground cursor-default"
              onMouseEnter={() => handleSpeak(t('community.signupFor') + ' ' + programme.title)}
            >
              {t('community.signupFor')}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <p className="text-lg font-semibold text-primary mb-6">{programme.title}</p>

          {!submitted ? (
            <>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-base text-muted-foreground mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    {t('community.yourName')}
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('community.enterName')}
                    className="h-14 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base text-muted-foreground mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    {t('community.phoneNumber')}
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9123 4567"
                    className="h-14 text-lg"
                    type="tel"
                  />
                </div>
              </div>

              <Button
                variant="warm"
                size="lg"
                onClick={handleSubmit}
                onMouseEnter={() => handleSpeak(t('community.confirmSignup'))}
                disabled={isSubmitting}
                className="w-full h-14 text-lg"
              >
                {isSubmitting ? t('community.submitting') : t('community.confirmSignup')}
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <p className="text-xl font-bold text-foreground mb-2">{t('community.thankyouRegistering')}</p>
              <p className="text-muted-foreground text-base mb-6">{t('community.organiserContact')}</p>
              
              {showPrintOption && (
                <div className="border-t pt-6">
                  <p className="text-sm text-muted-foreground mb-4">{t('community.needDirections')}</p>
                  
                  {hasPrinted && !hasPdfCard ? (
                    <div className="flex items-center justify-center gap-2 text-success">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">{t('community.printed')}</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handlePrintGuide}
                      disabled={isPrinting}
                      className="w-full h-12"
                    >
                      {isPrinting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {t('community.printing')}
                        </>
                      ) : hasPdfCard ? (
                        <>
                          <FileText className="w-5 h-5 mr-2" />
                          {t('community.viewNavigationCard')}
                        </>
                      ) : (
                        <>
                          <Printer className="w-5 h-5 mr-2" />
                          {t('community.printGuide')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
              
              <Button
                variant="ghost"
                size="lg"
                onClick={handleClose}
                className="w-full mt-4"
              >
                {t('community.close')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* PDF Modal */}
      {programme.navigation_pdf_url && (
        <NavigationPdfModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          pdfUrl={programme.navigation_pdf_url}
          programmeTitle={programme.title}
        />
      )}
    </>
  );
}