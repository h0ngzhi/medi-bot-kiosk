import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  Building2,
  Hospital,
  Phone,
  MapPin,
  Clock,
  Navigation,
} from "lucide-react";
import type { MapClinic } from "./ClinicMap";

interface ClinicDetailModalProps {
  clinic: MapClinic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowPhone: (phone: string, clinicName: string) => void;
  onOpenMaps: (address: string) => void;
  t: (key: string) => string;
}

export function ClinicDetailModal({
  clinic,
  open,
  onOpenChange,
  onShowPhone,
  onOpenMaps,
  t,
}: ClinicDetailModalProps) {
  if (!clinic) return null;

  const getClinicIcon = (type: MapClinic["type"]) => {
    switch (type) {
      case "gp":
        return <Stethoscope className="w-8 h-8 text-primary" />;
      case "polyclinic":
        return <Building2 className="w-8 h-8 text-purple-500" />;
      case "hospital":
        return <Hospital className="w-8 h-8 text-red-500" />;
      default:
        return <Stethoscope className="w-8 h-8 text-primary" />;
    }
  };

  const getTypeLabel = (type: MapClinic["type"]) => {
    switch (type) {
      case "gp": return t("findcare.gpClinic");
      case "polyclinic": return t("findcare.polyclinic");
      case "hospital": return t("findcare.hospital");
      default: return t("findcare.gpClinic");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              {getClinicIcon(clinic.type)}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold leading-tight">
                {clinic.name}
              </DialogTitle>
              <p className="text-lg text-muted-foreground mt-1">
                {getTypeLabel(clinic.type)}
                {clinic.distance !== undefined && (
                  <span className="ml-2 text-primary font-semibold">
                    • {clinic.distance.toFixed(1)} km
                  </span>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Address */}
          <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
            <MapPin className="w-7 h-7 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
              <p className="text-xl font-medium text-foreground leading-relaxed">
                {clinic.address}
              </p>
              {clinic.region && (
                <p className="text-lg text-muted-foreground mt-1">{clinic.region}</p>
              )}
            </div>
          </div>

          {/* Opening Hours */}
          {clinic.hours && (
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
              <Clock className="w-7 h-7 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t("findcare.openingHours")}
                </p>
                <p className="text-xl font-medium text-foreground leading-relaxed whitespace-pre-line">
                  {clinic.hours}
                </p>
              </div>
            </div>
          )}

          {/* Phone Number */}
          {clinic.phone && (
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
              <Phone className="w-7 h-7 text-info flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t("findcare.contactNumber")}
                </p>
                <p className="text-2xl font-bold text-foreground tracking-wide">
                  {clinic.phone}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {clinic.phone && (
          <div className="mt-6">
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold"
              onClick={() => {
                onShowPhone(clinic.phone, clinic.name);
                onOpenChange(false);
              }}
            >
              <Phone className="w-5 h-5 mr-2" />
              {t("findcare.call")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
