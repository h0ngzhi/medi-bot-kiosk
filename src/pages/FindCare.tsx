import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { AccessibilityBar } from "@/components/AccessibilityBar";
import { speakText } from "@/utils/speechUtils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Hospital,
  Phone,
  MapPin,
  Clock,
  Navigation,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

interface Facility {
  id: string;
  name: string;
  type: "polyclinic" | "hospital";
  address: string;
  phone: string;
  hours: string;
  distance: string;
  mapsUrl: string;
  availableSlots: string[];
}

// Sample nearby facilities data for Singapore
const nearbyFacilities: Facility[] = [
  {
    id: "1",
    name: "Bedok Polyclinic",
    type: "polyclinic",
    address: "11 Bedok North Street 1, Singapore 469662",
    phone: "6443 6969",
    hours: "8:00 AM - 1:00 PM, 2:00 PM - 4:30 PM",
    distance: "0.8 km",
    mapsUrl: "https://maps.google.com/?q=Bedok+Polyclinic+Singapore",
    availableSlots: ["9:00 AM", "10:30 AM", "2:00 PM", "3:30 PM"],
  },
  {
    id: "2",
    name: "Tampines Polyclinic",
    type: "polyclinic",
    address: "1 Tampines Street 41, Singapore 529203",
    phone: "6788 0833",
    hours: "8:00 AM - 1:00 PM, 2:00 PM - 4:30 PM",
    distance: "2.3 km",
    mapsUrl: "https://maps.google.com/?q=Tampines+Polyclinic+Singapore",
    availableSlots: ["9:30 AM", "11:00 AM", "2:30 PM"],
  },
  {
    id: "3",
    name: "Changi General Hospital",
    type: "hospital",
    address: "2 Simei Street 3, Singapore 529889",
    phone: "6788 8833",
    hours: "24 Hours (Emergency)",
    distance: "3.1 km",
    mapsUrl: "https://maps.google.com/?q=Changi+General+Hospital+Singapore",
    availableSlots: ["10:00 AM", "11:30 AM", "3:00 PM", "4:00 PM"],
  },
  {
    id: "4",
    name: "Pasir Ris Polyclinic",
    type: "polyclinic",
    address: "1 Pasir Ris Drive 4, Singapore 519457",
    phone: "6585 3333",
    hours: "8:00 AM - 1:00 PM, 2:00 PM - 4:30 PM",
    distance: "4.5 km",
    mapsUrl: "https://maps.google.com/?q=Pasir+Ris+Polyclinic+Singapore",
    availableSlots: ["8:30 AM", "10:00 AM", "2:00 PM"],
  },
];

type ViewState = "list" | "booking" | "confirmed";

export default function FindCare() {
  const { t, user, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "polyclinic" | "hospital">("all");

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const filteredFacilities = nearbyFacilities.filter(
    (f) => filterType === "all" || f.type === filterType
  );

  const handleSelectFacility = (facility: Facility) => {
    setSelectedFacility(facility);
    setViewState("booking");
  };

  const handleOpenMaps = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleConfirmBooking = () => {
    if (!selectedDate || !selectedSlot) return;
    setViewState("confirmed");
  };

  const handleBack = () => {
    if (viewState === "list") {
      navigate("/dashboard");
    } else if (viewState === "booking") {
      setViewState("list");
      setSelectedFacility(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
    } else {
      setViewState("list");
      setSelectedFacility(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
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
            onMouseEnter={() => handleSpeak(t("common.back"))}
            className="w-14 h-14 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div onMouseEnter={() => handleSpeak(`${t("findcare.title")}. ${t("findcare.subtitle")}`)}>
            <h1 className="text-heading text-foreground cursor-default">{t("findcare.title")}</h1>
            <p className="text-base text-muted-foreground cursor-default">{t("findcare.subtitle")}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        {/* Facility List View */}
        {viewState === "list" && (
          <div className="space-y-6 animate-fade-in">
            {/* Filter buttons */}
            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                onClick={() => setFilterType("all")}
                onMouseEnter={() => handleSpeak(t("findcare.all"))}
                className="flex-1"
              >
                {t("findcare.all")}
              </Button>
              <Button
                variant={filterType === "polyclinic" ? "default" : "outline"}
                onClick={() => setFilterType("polyclinic")}
                onMouseEnter={() => handleSpeak(t("findcare.polyclinics"))}
                className="flex-1"
              >
                <Building2 className="w-4 h-4 mr-2" />
                {t("findcare.polyclinics")}
              </Button>
              <Button
                variant={filterType === "hospital" ? "default" : "outline"}
                onClick={() => setFilterType("hospital")}
                onMouseEnter={() => handleSpeak(t("findcare.hospitals"))}
                className="flex-1"
              >
                <Hospital className="w-4 h-4 mr-2" />
                {t("findcare.hospitals")}
              </Button>
            </div>

            {/* Facilities list */}
            <div className="space-y-4">
              {filteredFacilities.map((facility) => (
                <Card key={facility.id} className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          facility.type === "polyclinic" ? "bg-primary/10" : "bg-secondary/10"
                        }`}
                      >
                        {facility.type === "polyclinic" ? (
                          <Building2 className="w-6 h-6 text-primary" />
                        ) : (
                          <Hospital className="w-6 h-6 text-secondary" />
                        )}
                      </div>
                      <div>
                        <h3
                          className="font-bold text-foreground cursor-default"
                          onMouseEnter={() => handleSpeak(facility.name)}
                        >
                          {facility.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{facility.distance}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{facility.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>{facility.hours}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{facility.phone}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCall(facility.phone)}
                      onMouseEnter={() => handleSpeak(t("findcare.call"))}
                      className="flex-1"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      {t("findcare.call")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenMaps(facility.mapsUrl)}
                      onMouseEnter={() => handleSpeak(t("findcare.directions"))}
                      className="flex-1"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      {t("findcare.directions")}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSelectFacility(facility)}
                      onMouseEnter={() => handleSpeak(t("findcare.book"))}
                      className="flex-1"
                    >
                      <CalendarDays className="w-4 h-4 mr-2" />
                      {t("findcare.book")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Emergency notice */}
            <Card className="p-4 bg-destructive/10 border-destructive/20">
              <p className="text-sm text-foreground">
                <strong>{t("findcare.emergencyTitle")}</strong> {t("findcare.emergencyDesc")}
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={() => handleCall("995")}
              >
                <Phone className="w-4 h-4 mr-2" />
                {t("findcare.call995")}
              </Button>
            </Card>
          </div>
        )}

        {/* Booking View */}
        {viewState === "booking" && selectedFacility && (
          <div className="space-y-6 animate-fade-in">
            {/* Selected facility summary */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedFacility.type === "polyclinic" ? "bg-primary/10" : "bg-secondary/10"
                  }`}
                >
                  {selectedFacility.type === "polyclinic" ? (
                    <Building2 className="w-6 h-6 text-primary" />
                  ) : (
                    <Hospital className="w-6 h-6 text-secondary" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{selectedFacility.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedFacility.address}</p>
                </div>
              </div>
            </Card>

            {/* Date picker */}
            <div>
              <h3
                className="font-bold text-foreground mb-3 cursor-default"
                onMouseEnter={() => handleSpeak(t("findcare.selectDate"))}
              >
                {t("findcare.selectDate")}
              </h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : t("findcare.pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <h3
                  className="font-bold text-foreground mb-3 cursor-default"
                  onMouseEnter={() => handleSpeak(t("findcare.selectTime"))}
                >
                  {t("findcare.selectTime")}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedFacility.availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedSlot === slot ? "default" : "outline"}
                      onClick={() => setSelectedSlot(slot)}
                      onMouseEnter={() => handleSpeak(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Patient name */}
            <div>
              <h3 className="font-bold text-foreground mb-3">{t("findcare.patientName")}</h3>
              <Input value={user?.name || ""} disabled className="bg-muted" />
            </div>

            {/* Confirm button */}
            <Button
              variant="warm"
              size="xl"
              onClick={handleConfirmBooking}
              disabled={!selectedDate || !selectedSlot}
              onMouseEnter={() => handleSpeak(t("findcare.confirmBooking"))}
              className="w-full"
            >
              {t("findcare.confirmBooking")}
            </Button>
          </div>
        )}

        {/* Confirmation View */}
        {viewState === "confirmed" && selectedFacility && (
          <div className="animate-fade-in">
            <Card className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h2
                className="text-heading text-foreground mb-2 cursor-default"
                onMouseEnter={() => handleSpeak(t("findcare.bookingConfirmed"))}
              >
                {t("findcare.bookingConfirmed")}
              </h2>
              <p className="text-muted-foreground mb-6">{t("findcare.bookingConfirmedDesc")}</p>

              <div className="bg-muted rounded-xl p-4 text-left space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("findcare.facility")}</span>
                  <span className="font-medium">{selectedFacility.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("findcare.date")}</span>
                  <span className="font-medium">{selectedDate && format(selectedDate, "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("findcare.time")}</span>
                  <span className="font-medium">{selectedSlot}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOpenMaps(selectedFacility.mapsUrl)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t("findcare.getDirections")}
                </Button>
                <Button variant="warm" size="xl" onClick={handleBack} className="w-full">
                  {t("findcare.returnDashboard")}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>

      <AccessibilityBar />
    </div>
  );
}
