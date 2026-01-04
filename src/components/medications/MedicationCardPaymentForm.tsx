import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface MedicationCardPaymentFormProps {
  amount: number;
  onSubmit: () => void;
  isProcessing: boolean;
  userName: string;
}

export const MedicationCardPaymentForm = ({ amount, onSubmit, isProcessing, userName }: MedicationCardPaymentFormProps) => {
  const { t } = useApp();
  
  // Prefilled demo card data
  const [cardData, setCardData] = useState({
    cardNumber: '4242 4242 4242 4242',
    cardName: userName.toUpperCase(),
    expiry: '12/28',
    cvv: '123',
  });

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="w-5 h-5 text-primary" />
          {t('meds.cardPayment')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Card Preview */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded" />
            <span className="text-xs opacity-60">VISA</span>
          </div>
          <div className="font-mono text-lg tracking-wider mb-4">
            {cardData.cardNumber || '•••• •••• •••• ••••'}
          </div>
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-[10px] opacity-60 mb-0.5">CARD HOLDER</p>
              <p className="font-medium">{cardData.cardName || 'YOUR NAME'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] opacity-60 mb-0.5">EXPIRES</p>
              <p className="font-medium">{cardData.expiry || 'MM/YY'}</p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="cardNumber" className="text-sm">{t('meds.cardNumber')}</Label>
            <Input
              id="cardNumber"
              value={cardData.cardNumber}
              onChange={(e) => setCardData({ ...cardData, cardNumber: formatCardNumber(e.target.value) })}
              maxLength={19}
              className="font-mono"
            />
          </div>
          
          <div>
            <Label htmlFor="cardName" className="text-sm">{t('meds.cardHolder')}</Label>
            <Input
              id="cardName"
              value={cardData.cardName}
              onChange={(e) => setCardData({ ...cardData, cardName: e.target.value.toUpperCase() })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="expiry" className="text-sm">{t('meds.expiryDate')}</Label>
              <Input
                id="expiry"
                placeholder="MM/YY"
                value={cardData.expiry}
                onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                maxLength={5}
              />
            </div>
            <div>
              <Label htmlFor="cvv" className="text-sm">CVV</Label>
              <Input
                id="cvv"
                type="password"
                value={cardData.cvv}
                onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                maxLength={3}
              />
            </div>
          </div>
        </div>

        {/* Amount Display */}
        <div className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('meds.totalAmount')}</span>
          <span className="text-xl font-bold text-foreground">S${amount.toFixed(2)}</span>
        </div>

        {/* Submit Button */}
        <Button 
          variant="warm" 
          size="xl" 
          className="w-full" 
          onClick={onSubmit}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('meds.processing')}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              {t('meds.payConfirm')} - S${amount.toFixed(2)}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          {t('meds.securePayment')}
        </p>
      </CardContent>
    </Card>
  );
};
