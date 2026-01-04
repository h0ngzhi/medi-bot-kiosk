import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package, Truck, Building2, Tag } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface MedicationItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderSummaryProps {
  medications: MedicationItem[];
  deliveryOption: 'home' | 'clinic';
  deliveryFee: number;
  subsidyPercent: number;
  chasType: string;
}

export const OrderSummary = ({ 
  medications, 
  deliveryOption, 
  deliveryFee, 
  subsidyPercent,
  chasType 
}: OrderSummaryProps) => {
  const { t } = useApp();

  const subtotal = medications.reduce((sum, med) => sum + (med.price * med.quantity), 0);
  const subsidyAmount = subtotal * (subsidyPercent / 100);
  const afterSubsidy = subtotal - subsidyAmount;
  const total = afterSubsidy + deliveryFee;

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5 text-primary" />
          {t('meds.orderSummary')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Medications List */}
        <div className="space-y-2">
          {medications.map((med, index) => (
            <div key={index} className="flex justify-between items-center">
              <div>
                <p className="font-medium text-foreground">{med.name}</p>
                <p className="text-sm text-muted-foreground">x{med.quantity}</p>
              </div>
              <span className="font-medium text-foreground">S${(med.price * med.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('meds.subtotal')}</span>
          <span className="text-foreground">S${subtotal.toFixed(2)}</span>
        </div>

        {/* CHAS Subsidy */}
        {subsidyPercent > 0 && (
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1 text-success">
              <Tag className="w-3 h-3" />
              {t('meds.chasSubsidy')} ({chasType})
            </span>
            <span className="text-success">-S${subsidyAmount.toFixed(2)}</span>
          </div>
        )}

        {/* Delivery */}
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            {deliveryOption === 'home' ? (
              <Truck className="w-3 h-3" />
            ) : (
              <Building2 className="w-3 h-3" />
            )}
            {deliveryOption === 'home' ? t('meds.deliveryFee') : t('meds.selfCollection')}
          </span>
          <span className="text-foreground">
            {deliveryFee === 0 ? t('meds.free') : `S$${deliveryFee.toFixed(2)}`}
          </span>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-foreground">{t('meds.total')}</span>
          <span className="text-2xl font-bold text-primary">S${total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
};
