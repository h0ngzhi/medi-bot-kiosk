import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Stethoscope,
  Building2,
  Hospital,
  Phone,
  Navigation,
  Clock,
  MapPin,
} from "lucide-react";
import type { MapClinic } from "./ClinicMap";

interface ClinicListPanelProps {
  clinics: MapClinic[];
  selectedClinic: MapClinic | null;
  onClinicSelect: (clinic: MapClinic) => void;
  onCall: (phone: string) => void;
  onDirections: (address: string, postalCode: string) => void;
  onViewHours: (clinic: MapClinic) => void;
  t: (key: string) => string;
  handleSpeak: (text: string) => void;
}

export function ClinicListPanel({
  clinics,
  selectedClinic,
  onClinicSelect,
  onCall,
  onDirections,
  onViewHours,
  t,
  handleSpeak,
}: ClinicListPanelProps) {
  const getClinicIcon = (type: MapClinic["type"]) => {
    switch (type) {
      case "gp":
        return <Stethoscope className="w-5 h-5 text-primary" />;
      case "dental":
        return <Building2 className="w-5 h-5 text-orange-500" />;
      case "polyclinic":
        return <Building2 className="w-5 h-5 text-purple-500" />;
      case "hospital":
        return <Hospital className="w-5 h-5 text-red-500" />;
    }
  };

  const getTypeLabel = (type: MapClinic["type"]) => {
    switch (type) {
      case "gp": return t("findcare.gpClinic");
      case "dental": return t("findcare.dentalClinic");
      case "polyclinic": return t("findcare.polyclinic");
      case "hospital": return t("findcare.hospital");
    }
  };

  if (clinics.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">No clinics found</p>
        <p className="text-sm mt-1">Try expanding your search radius or changing filters</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {clinics.map((clinic) => (
          <Card
            key={clinic.id}
            className={`p-3 cursor-pointer transition-all hover:shadow-md ${
              selectedClinic?.id === clinic.id
                ? "ring-2 ring-primary bg-primary/5"
                : ""
            }`}
            onClick={() => onClinicSelect(clinic)}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {getClinicIcon(clinic.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="font-semibold text-foreground text-sm leading-tight line-clamp-2"
                    onMouseEnter={() => handleSpeak(clinic.name)}
                  >
                    {clinic.name}
                  </h3>
                  {clinic.distance !== undefined && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">
                      {clinic.distance.toFixed(1)} km
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getTypeLabel(clinic.type)} • {clinic.region}
                </p>
                
                <div className="mt-2 space-y-1">
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="text-xs line-clamp-1">{clinic.address}</span>
                  </div>
                  {clinic.hours && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHours(clinic);
                      }}
                      className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors"
                    >
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="text-xs font-medium underline">View Hours</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  {clinic.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCall(clinic.phone);
                      }}
                    >
                      <Phone className="w-3 h-3 mr-1" />
                      Call
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDirections(clinic.address, clinic.postalCode);
                    }}
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    Directions
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
