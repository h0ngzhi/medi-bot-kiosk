import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Banknote, Video, Loader2, MapPin, Mail } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface CashBillingFormProps {
  amount: number;
  onSubmit: () => void;
  isProcessing: boolean;
  userName: string;
}

export const CashBillingForm = ({ amount, onSubmit, isProcessing, userName }: CashBillingFormProps) => {
  const { t } = useApp();
  
  // Prefilled demo address data
  const [addressData, setAddressData] = useState({
    name: userName,
    block: '123',
    street: 'Ang Mo Kio Avenue 3',
    unit: '#08-456',
    postalCode: '560123',
  });

  return (
    <Card className="border-2 border-success/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Banknote className="w-5 h-5 text-success" />
          {t('teleconsult.billCash')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Banner */}
        <div className="bg-success/10 rounded-xl p-4 border border-success/20">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-medium text-foreground">{t('teleconsult.billDelivery')}</p>
              <p className="text-sm text-muted-foreground">
                {t('teleconsult.billInfo')}
              </p>
            </div>
          </div>
        </div>

        {/* Address Form */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="name" className="text-sm">{t('teleconsult.fullName')}</Label>
            <Input
              id="name"
              value={addressData.name}
              onChange={(e) => setAddressData({ ...addressData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="block" className="text-sm">{t('teleconsult.blockNo')}</Label>
              <Input
                id="block"
                value={addressData.block}
                onChange={(e) => setAddressData({ ...addressData, block: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="unit" className="text-sm">{t('teleconsult.unitNo')}</Label>
              <Input
                id="unit"
                placeholder="#00-000"
                value={addressData.unit}
                onChange={(e) => setAddressData({ ...addressData, unit: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="street" className="text-sm">{t('teleconsult.street')}</Label>
            <Input
              id="street"
              value={addressData.street}
              onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="postalCode" className="text-sm">{t('teleconsult.postalCode')}</Label>
            <Input
              id="postalCode"
              value={addressData.postalCode}
              onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              maxLength={6}
            />
          </div>
        </div>

        {/* Address Preview */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{addressData.name}</p>
              <p className="text-sm text-muted-foreground">
                Block {addressData.block} {addressData.street}
              </p>
              <p className="text-sm text-muted-foreground">
                {addressData.unit}
              </p>
              <p className="text-sm text-muted-foreground">
                Singapore {addressData.postalCode}
              </p>
            </div>
          </div>
        </div>

        {/* Amount Display */}
        <div className="bg-warning/10 rounded-lg p-3 flex justify-between items-center border border-warning/20">
          <span className="text-sm text-muted-foreground">{t('teleconsult.amountDue')}</span>
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
              {t('teleconsult.confirming')}
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              {t('teleconsult.confirmStart')}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {t('teleconsult.agreePayBill')}
        </p>
      </CardContent>
    </Card>
  );
};
