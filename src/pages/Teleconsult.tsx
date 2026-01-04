import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { AccessibilityBar } from "@/components/AccessibilityBar";
import { useToast } from "@/hooks/use-toast";
import { speakText } from "@/utils/speechUtils";
import { PricingDisplay, getPrice, type CHASCardType } from "@/components/teleconsult/PricingDisplay";
import { CardPaymentForm } from "@/components/teleconsult/CardPaymentForm";
import { CashBillingForm } from "@/components/teleconsult/CashBillingForm";
import {
  ArrowLeft,
  Building2,
  Hospital,
  CreditCard,
  Banknote,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type ConsultState = "pricing" | "payment" | "connecting" | "connected" | "error";

export default function Teleconsult() {
  const { t, user, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<ConsultState>("pricing");
  const [doctorType, setDoctorType] = useState<"polyclinic" | "hospital" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  // Map user's chasType to our pricing tier
  const getChasType = (): CHASCardType => {
    const userChasType = user?.chasType?.toLowerCase() || 'blue';
    if (userChasType.includes('merdeka')) return 'merdeka';
    if (userChasType.includes('pioneer')) return 'pioneer';
    const validTypes: CHASCardType[] = ['blue', 'orange', 'green'];
    return validTypes.includes(userChasType as CHASCardType) ? userChasType as CHASCardType : 'blue';
  };

  const chasType = getChasType();
  const currentPrice = doctorType ? getPrice(chasType, doctorType) : 0;

  const handleSelectDoctor = (type: "polyclinic" | "hospital") => {
    setDoctorType(type);
  };

  const handleProceedToPayment = () => {
    if (!doctorType) return;
    setState("payment");
  };

  const handleSelectPayment = (method: "card" | "cash") => {
    setPaymentMethod(method);
  };

  // Validate meeting URL is from a trusted video conferencing provider
  const isValidMeetingUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return false;
      const allowedDomains = [
        'zoom.us', 'meet.google.com', 'teams.microsoft.com', 'whereby.com',
        'webex.com', 'gotomeeting.com', 'jitsi.org', 'meet.jit.si', 'daily.co', 'around.co',
      ];
      return allowedDomains.some(domain => 
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  };

  const handleStartConsult = async () => {
    if (!paymentMethod || !doctorType) return;

    setState("connecting");
    setErrorMessage("");

    try {
      const consultationReason =
        doctorType === "polyclinic" ? "General consultation - Polyclinic" : "Specialist consultation - Hospital";

      const response = await fetch("https://hongzhi.app.n8n.cloud/webhook/teleconsult/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kiosk_user_id: user?.id || "unknown",
          user_name: user?.name || "Guest User",
          consultation_reason: consultationReason,
          payment_method: paymentMethod,
          amount: currentPrice,
          chas_type: chasType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.meetingUrl && data.status === "scheduled") {
        let sanitizedUrl = data.meetingUrl.trim();
        if (sanitizedUrl.startsWith('=')) {
          sanitizedUrl = sanitizedUrl.substring(1);
        }
        
        if (!isValidMeetingUrl(sanitizedUrl)) {
          throw new Error("Invalid or untrusted meeting URL received");
        }
        window.open(sanitizedUrl, "_blank", "noopener,noreferrer");
        setState("connected");
        toast({
          title: "Consultation Started",
          description: "Your video consultation has been opened in a new tab.",
        });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Teleconsult error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to start consultation");
      setState("error");
      toast({
        title: "Connection Failed",
        description: "Unable to start the teleconsultation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (state === "pricing") {
      navigate("/dashboard");
    } else if (state === "payment") {
      setState("pricing");
      setPaymentMethod(null);
    } else {
      setState("pricing");
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
            onMouseEnter={() => handleSpeak(t('common.back'))}
            className="w-14 h-14 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div onMouseEnter={() => handleSpeak(`${t("teleconsult.title")}. ${t("teleconsult.subtitle")}`)}>
            <h1 className="text-heading text-foreground cursor-default">{t("teleconsult.title")}</h1>
            <p className="text-base text-muted-foreground cursor-default">{t("teleconsult.subtitle")}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        {/* Step 1: Doctor type selection with pricing */}
        {state === "pricing" && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-foreground cursor-default" onMouseEnter={() => handleSpeak(t('teleconsult.selectType'))}>{t('teleconsult.selectType')}</h2>
            
            <div className="space-y-4">
              {/* Polyclinic Option */}
              <button
                onClick={() => handleSelectDoctor("polyclinic")}
                onMouseEnter={() => handleSpeak(t('teleconsult.polyclinic'))}
                className={`w-full text-left transition-all ${
                  doctorType === 'polyclinic' ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
              >
                <PricingDisplay chasType={chasType} doctorType="polyclinic" />
              </button>

              {/* Hospital Option */}
              <button
                onClick={() => handleSelectDoctor("hospital")}
                onMouseEnter={() => handleSpeak(t('teleconsult.hospital'))}
                className={`w-full text-left transition-all ${
                  doctorType === 'hospital' ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
              >
                <PricingDisplay chasType={chasType} doctorType="hospital" />
              </button>
            </div>

            {/* Warning notice */}
            <div className="bg-warning/10 rounded-2xl p-6 flex gap-4 border border-warning/20">
              <AlertTriangle className="w-8 h-8 text-warning flex-shrink-0" />
              <p className="text-base text-foreground">{t("teleconsult.serious")}</p>
            </div>

            {/* Continue Button */}
            <Button
              variant="warm"
              size="xl"
              onClick={handleProceedToPayment}
              onMouseEnter={() => handleSpeak(t('teleconsult.continuePayment'))}
              disabled={!doctorType}
              className="w-full"
            >
              {t('teleconsult.continuePayment')}
            </Button>
          </div>
        )}

        {/* Step 2: Payment method selection */}
        {state === "payment" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-card rounded-2xl p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {doctorType === 'polyclinic' ? (
                    <Building2 className="w-6 h-6 text-primary" />
                  ) : (
                    <Hospital className="w-6 h-6 text-secondary" />
                  )}
                  <span className="font-medium">
                    {doctorType === 'polyclinic' ? t('teleconsult.polyclinicDoctor') : t('teleconsult.hospitalSpecialist')}
                  </span>
                </div>
                <span className="text-xl font-bold">
                  {currentPrice === 0 ? t('teleconsult.free') : `S$${currentPrice.toFixed(2)}`}
                </span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-foreground cursor-default" onMouseEnter={() => handleSpeak(t("teleconsult.payment"))}>{t("teleconsult.payment")}</h2>

            {/* Payment method tabs */}
            <div className="flex gap-2">
              <Button
                variant={paymentMethod === "card" ? "default" : "outline"}
                onClick={() => handleSelectPayment("card")}
                onMouseEnter={() => handleSpeak(t('teleconsult.payByCard'))}
                className="flex-1"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {t('teleconsult.payByCard')}
              </Button>
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                onClick={() => handleSelectPayment("cash")}
                onMouseEnter={() => handleSpeak(t('teleconsult.billHome'))}
                className="flex-1"
              >
                <Banknote className="w-5 h-5 mr-2" />
                {t('teleconsult.billHome')}
              </Button>
            </div>

            {/* Payment Forms */}
            {paymentMethod === "card" && (
              <CardPaymentForm
                amount={currentPrice}
                onSubmit={handleStartConsult}
                isProcessing={false}
                userName={user?.name || "Guest User"}
              />
            )}

            {paymentMethod === "cash" && (
              <CashBillingForm
                amount={currentPrice}
                onSubmit={handleStartConsult}
                isProcessing={false}
                userName={user?.name || "Guest User"}
              />
            )}
          </div>
        )}

        {/* Connecting state */}
        {state === "connecting" && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-secondary/10 flex items-center justify-center mb-8">
              <Loader2 className="w-16 h-16 text-secondary animate-spin" />
            </div>
            <p className="text-heading text-foreground mb-2 cursor-default" onMouseEnter={() => handleSpeak(t("teleconsult.connecting"))}>{t("teleconsult.connecting")}</p>
            <div className="mt-8 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary animate-bounce" style={{ animationDelay: "0s" }} />
              <div className="w-3 h-3 rounded-full bg-secondary animate-bounce" style={{ animationDelay: "0.2s" }} />
              <div className="w-3 h-3 rounded-full bg-secondary animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}

        {/* Connected state */}
        {state === "connected" && (
          <div className="animate-fade-in">
            <div className="bg-card rounded-3xl shadow-medium overflow-hidden mb-6 p-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12 text-success" />
                </div>
                <h2 className="text-heading text-foreground mb-2 cursor-default" onMouseEnter={() => handleSpeak(t('teleconsult.connected'))}>{t('teleconsult.connected')}</h2>
                <p className="text-muted-foreground mb-4 cursor-default" onMouseEnter={() => handleSpeak(t('teleconsult.connected.desc'))}>
                  {t('teleconsult.connected.desc')}
                </p>
                <p className="text-sm text-muted-foreground cursor-default" onMouseEnter={() => handleSpeak(doctorType === "polyclinic" ? t("teleconsult.polyclinic") : t("teleconsult.hospital"))}>
                  {doctorType === "polyclinic" ? t("teleconsult.polyclinic") : t("teleconsult.hospital")}
                </p>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="xl" 
              onClick={handleBack} 
              onMouseEnter={() => handleSpeak(t('teleconsult.returnDashboard'))}
              className="w-full"
            >
              {t('teleconsult.returnDashboard')}
            </Button>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="animate-fade-in">
            <div className="bg-card rounded-3xl shadow-medium overflow-hidden mb-6 p-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
                  <XCircle className="w-12 h-12 text-destructive" />
                </div>
                <h2 className="text-heading text-foreground mb-2 cursor-default" onMouseEnter={() => handleSpeak(t('teleconsult.failed'))}>{t('teleconsult.failed')}</h2>
                <p className="text-muted-foreground mb-4 cursor-default" onMouseEnter={() => handleSpeak(errorMessage || t('teleconsult.failed.desc'))}>
                  {errorMessage || t('teleconsult.failed.desc')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Button 
                variant="warm" 
                size="xl" 
                onClick={() => setState("payment")} 
                onMouseEnter={() => handleSpeak(t('teleconsult.tryAgain'))}
                className="w-full"
              >
                {t('teleconsult.tryAgain')}
              </Button>
              <Button 
                variant="outline" 
                size="xl" 
                onClick={handleBack} 
                onMouseEnter={() => handleSpeak(t('teleconsult.goBack'))}
                className="w-full"
              >
                {t('teleconsult.goBack')}
              </Button>
            </div>
          </div>
        )}
      </main>

      <AccessibilityBar />
    </div>
  );
}
