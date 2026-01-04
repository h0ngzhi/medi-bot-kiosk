import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Clock, Check } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface Clinic {
  id: string;
  name: string;
  address: string;
  hours: string;
  distance: string;
}

interface ClinicSelectorProps {
  selectedClinic: string | null;
  onSelect: (clinicId: string) => void;
}

const clinics: Clinic[] = [
  {
    id: 'amk',
    name: 'Ang Mo Kio Polyclinic',
    address: '21 Ang Mo Kio Central 2, Singapore 569666',
    hours: '8:00 AM - 4:00 PM',
    distance: '0.5 km',
  },
  {
    id: 'bishan',
    name: 'Bishan Polyclinic',
    address: '53 Bishan Street 13, Singapore 579799',
    hours: '8:00 AM - 4:00 PM',
    distance: '2.1 km',
  },
  {
    id: 'tpy',
    name: 'Toa Payoh Polyclinic',
    address: '2003 Toa Payoh Lor 8, Singapore 319260',
    hours: '8:00 AM - 4:00 PM',
    distance: '3.4 km',
  },
];

export const ClinicSelector = ({ selectedClinic, onSelect }: ClinicSelectorProps) => {
  const { t } = useApp();

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">{t('meds.selectClinic')}</h3>
      
      {clinics.map((clinic) => (
        <Card 
          key={clinic.id}
          className={`cursor-pointer transition-all ${
            selectedClinic === clinic.id 
              ? 'border-2 border-primary bg-primary/5' 
              : 'border border-border hover:border-primary/50'
          }`}
          onClick={() => onSelect(clinic.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedClinic === clinic.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{clinic.name}</h4>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{clinic.address}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {clinic.hours}
                    </span>
                    <span className="text-primary font-medium">{clinic.distance}</span>
                  </div>
                </div>
              </div>
              {selectedClinic === clinic.id && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
