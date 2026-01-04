import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Hospital } from "lucide-react";

export type CHASCardType = 'blue' | 'orange' | 'green' | 'merdeka' | 'pioneer';

interface PricingDisplayProps {
  chasType: CHASCardType;
  doctorType: 'polyclinic' | 'hospital';
}

// Pricing based on CHAS card type (in SGD)
const PRICING: Record<CHASCardType, { polyclinic: number; hospital: number }> = {
  green: { polyclinic: 0, hospital: 10 },        // Highest subsidy
  orange: { polyclinic: 10, hospital: 25 },
  blue: { polyclinic: 18.50, hospital: 35 },
  merdeka: { polyclinic: 5, hospital: 16 },      // Merdeka Generation
  pioneer: { polyclinic: 0, hospital: 5 },       // Pioneer Generation (FREE for polyclinic)
};

const CARD_COLORS: Record<CHASCardType, { bg: string; text: string; label: string }> = {
  blue: { bg: 'bg-blue-500', text: 'text-blue-500', label: 'CHAS Blue' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-500', label: 'CHAS Orange' },
  green: { bg: 'bg-green-500', text: 'text-green-500', label: 'CHAS Green' },
  merdeka: { bg: 'bg-purple-600', text: 'text-purple-600', label: 'Merdeka Generation' },
  pioneer: { bg: 'bg-amber-600', text: 'text-amber-600', label: 'Pioneer Generation' },
};

export const getPrice = (chasType: CHASCardType, doctorType: 'polyclinic' | 'hospital'): number => {
  return PRICING[chasType][doctorType];
};

export const PricingDisplay = ({ chasType, doctorType }: PricingDisplayProps) => {
  const price = getPrice(chasType, doctorType);
  const cardInfo = CARD_COLORS[chasType];
  const Icon = doctorType === 'polyclinic' ? Building2 : Hospital;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-muted/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${cardInfo.bg} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                {doctorType === 'polyclinic' ? 'Polyclinic Doctor' : 'Hospital Specialist'}
              </h3>
              <Badge variant="outline" className={`${cardInfo.text} border-current`}>
                {cardInfo.label}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="bg-background/80 rounded-2xl p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Consultation Fee</p>
          <div className="flex items-baseline justify-center gap-1">
            {price === 0 ? (
              <span className="text-4xl font-bold text-success">FREE</span>
            ) : (
              <>
                <span className="text-2xl font-semibold text-muted-foreground">S$</span>
                <span className="text-4xl font-bold text-foreground">{price.toFixed(2)}</span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Subsidised rate for {cardInfo.label} cardholders
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
