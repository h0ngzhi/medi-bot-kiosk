import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Stethoscope,
  Building2,
  Hospital,
  Phone,
  MapPin,
  Clock,
  Eye,
} from "lucide-react";
import type { MapClinic } from "./ClinicMap";
import { useState, useCallback, memo } from "react";

interface ClinicListPanelProps {
  clinics: MapClinic[];
  selectedClinic: MapClinic | null;
  onClinicSelect: (clinic: MapClinic) => void;
  onShowPhone: (phone: string, clinicName: string) => void;
  onClinicDetailOpen: (clinic: MapClinic) => void;
  t: (key: string) => string;
  handleMouseEnter: (text: string) => void;
  handleMouseLeave: () => void;
}

const ITEMS_PER_PAGE = 50;

// Memoized clinic card for better performance
const ClinicCardItem = memo(function ClinicCardItem({
  clinic,
  isSelected,
  onClinicSelect,
  onShowPhone,
  onClinicDetailOpen,
  t,
  handleMouseEnter,
  handleMouseLeave,
  getClinicIcon,
  getTypeLabel,
}: {
  clinic: MapClinic;
  isSelected: boolean;
  onClinicSelect: (clinic: MapClinic) => void;
  onShowPhone: (phone: string, clinicName: string) => void;
  onClinicDetailOpen: (clinic: MapClinic) => void;
  t: (key: string) => string;
  handleMouseEnter: (text: string) => void;
  handleMouseLeave: () => void;
  getClinicIcon: (type: MapClinic["type"]) => React.ReactNode;
  getTypeLabel: (type: MapClinic["type"]) => string;
}) {
  return (
    <Card
      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary bg-primary/5" : ""
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
              onMouseEnter={() => handleMouseEnter(clinic.name)}
              onMouseLeave={handleMouseLeave}
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
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="text-xs line-clamp-2">{clinic.hours}</span>
              </div>
            )}
            
            {clinic.phone && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <Phone className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="text-xs">{clinic.phone}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-10 text-sm font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onClinicDetailOpen(clinic);
              }}
            >
              <Eye className="w-4 h-4 mr-1.5" />
              {t("findcare.viewDetails")}
            </Button>
            {clinic.phone && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-3"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowPhone(clinic.phone, clinic.name);
                }}
              >
                <Phone className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
});

export function ClinicListPanel({
  clinics,
  selectedClinic,
  onClinicSelect,
  onShowPhone,
  onClinicDetailOpen,
  t,
  handleMouseEnter,
  handleMouseLeave,
}: ClinicListPanelProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const getClinicIcon = useCallback((type: MapClinic["type"]) => {
    switch (type) {
      case "gp":
        return <Stethoscope className="w-5 h-5 text-primary" />;
      case "polyclinic":
        return <Building2 className="w-5 h-5 text-purple-500" />;
      case "hospital":
        return <Hospital className="w-5 h-5 text-red-500" />;
      default:
        return <Stethoscope className="w-5 h-5 text-primary" />;
    }
  }, []);

  const getTypeLabel = useCallback((type: MapClinic["type"]) => {
    switch (type) {
      case "gp": return t("findcare.gpClinic");
      case "polyclinic": return t("findcare.polyclinic");
      case "hospital": return t("findcare.hospital");
      default: return t("findcare.gpClinic");
    }
  }, [t]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, clinics.length));
  }, [clinics.length]);

  if (clinics.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">No clinics found</p>
        <p className="text-sm mt-1">Try expanding your search radius or changing filters</p>
      </div>
    );
  }

  const visibleClinics = clinics.slice(0, visibleCount);
  const hasMore = visibleCount < clinics.length;

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {visibleClinics.map((clinic) => (
          <ClinicCardItem
            key={clinic.id}
            clinic={clinic}
            isSelected={selectedClinic?.id === clinic.id}
            onClinicSelect={onClinicSelect}
            onShowPhone={onShowPhone}
            onClinicDetailOpen={onClinicDetailOpen}
            t={t}
            handleMouseEnter={handleMouseEnter}
            handleMouseLeave={handleMouseLeave}
            getClinicIcon={getClinicIcon}
            getTypeLabel={getTypeLabel}
          />
        ))}
        
        {hasMore && (
          <div className="pt-2 pb-4">
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={handleLoadMore}
            >
              Load More ({clinics.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
