import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { AccessibilityBar } from "@/components/AccessibilityBar";
import { speakText } from "@/utils/speechUtils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Building2,
  Hospital,
  Phone,
  MapPin,
  Clock,
  Navigation,
  Search,
  Stethoscope,
} from "lucide-react";

interface Clinic {
  id: string;
  name: string;
  type: "gp" | "dental" | "polyclinic" | "hospital";
  address: string;
  postalCode: string;
  phone: string;
  hours: string;
  region: string;
}

// Sample CHAS clinics data based on data.gov.sg structure
// In production, this would be fetched from the API
const chasClinics: Clinic[] = [
  {
    id: "1",
    name: "Bedok Family Clinic",
    type: "gp",
    address: "Blk 201 Bedok North Street 1, #01-421",
    postalCode: "460201",
    phone: "6445 1234",
    hours: "Mon-Fri: 8:30AM-12:30PM, 2PM-5PM, 7PM-9PM",
    region: "East",
  },
  {
    id: "2",
    name: "Tampines Medical Centre",
    type: "gp",
    address: "Blk 827 Tampines Street 81, #01-140",
    postalCode: "520827",
    phone: "6789 5678",
    hours: "Mon-Fri: 8AM-1PM, 2PM-5PM | Sat: 8AM-12PM",
    region: "East",
  },
  {
    id: "3",
    name: "Pasir Ris Family Clinic",
    type: "gp",
    address: "Blk 442 Pasir Ris Drive 6, #01-28",
    postalCode: "510442",
    phone: "6583 9012",
    hours: "Mon-Fri: 9AM-12PM, 2PM-5PM, 7PM-9PM",
    region: "East",
  },
  {
    id: "4",
    name: "Simei Medical Centre",
    type: "gp",
    address: "Blk 247 Simei Street 5, #01-128",
    postalCode: "520247",
    phone: "6786 3456",
    hours: "Mon-Sat: 8:30AM-12:30PM, 2PM-4:30PM",
    region: "East",
  },
  {
    id: "5",
    name: "Geylang Dental Clinic",
    type: "dental",
    address: "Blk 125 Geylang East Avenue 1, #01-253",
    postalCode: "380125",
    phone: "6744 7890",
    hours: "Mon-Fri: 9AM-6PM | Sat: 9AM-1PM",
    region: "Central",
  },
  {
    id: "6",
    name: "Marine Parade Family Clinic",
    type: "gp",
    address: "Blk 84 Marine Parade Central, #01-606",
    postalCode: "440084",
    phone: "6345 6789",
    hours: "Mon-Fri: 8:30AM-12:30PM, 2PM-5PM",
    region: "Central",
  },
  {
    id: "7",
    name: "Ang Mo Kio Medical Centre",
    type: "gp",
    address: "Blk 722 Ang Mo Kio Avenue 8, #01-2821",
    postalCode: "560722",
    phone: "6456 1234",
    hours: "Mon-Fri: 8AM-1PM, 2PM-9PM | Sat-Sun: 8AM-1PM",
    region: "North",
  },
  {
    id: "8",
    name: "Yishun Family Clinic",
    type: "gp",
    address: "Blk 846 Yishun Ring Road, #01-3539",
    postalCode: "760846",
    phone: "6852 4567",
    hours: "Mon-Fri: 8:30AM-12:30PM, 2PM-5PM, 7PM-9PM",
    region: "North",
  },
  {
    id: "9",
    name: "Woodlands Dental Surgery",
    type: "dental",
    address: "Blk 302 Woodlands Street 31, #01-271",
    postalCode: "730302",
    phone: "6365 7890",
    hours: "Mon-Fri: 9AM-5PM | Sat: 9AM-12PM",
    region: "North",
  },
  {
    id: "10",
    name: "Jurong West Medical Clinic",
    type: "gp",
    address: "Blk 501 Jurong West Street 51, #01-257",
    postalCode: "640501",
    phone: "6567 8901",
    hours: "Mon-Fri: 8AM-12PM, 2PM-5PM, 7PM-9PM",
    region: "West",
  },
  {
    id: "11",
    name: "Clementi Family Practice",
    type: "gp",
    address: "Blk 442 Clementi Avenue 3, #01-63",
    postalCode: "120442",
    phone: "6778 2345",
    hours: "Mon-Sat: 9AM-1PM, 2PM-5PM",
    region: "West",
  },
  {
    id: "12",
    name: "Bukit Batok Medical Centre",
    type: "gp",
    address: "Blk 283 Bukit Batok East Avenue 3, #01-269",
    postalCode: "650283",
    phone: "6569 3456",
    hours: "Mon-Fri: 8:30AM-12:30PM, 2PM-4:30PM, 7PM-9PM",
    region: "West",
  },
  {
    id: "13",
    name: "Bedok Polyclinic",
    type: "polyclinic",
    address: "11 Bedok North Street 1",
    postalCode: "469662",
    phone: "6443 6969",
    hours: "Mon-Fri: 8AM-1PM, 2PM-4:30PM",
    region: "East",
  },
  {
    id: "14",
    name: "Tampines Polyclinic",
    type: "polyclinic",
    address: "1 Tampines Street 41",
    postalCode: "529203",
    phone: "6788 0833",
    hours: "Mon-Fri: 8AM-1PM, 2PM-4:30PM",
    region: "East",
  },
  {
    id: "15",
    name: "Changi General Hospital",
    type: "hospital",
    address: "2 Simei Street 3",
    postalCode: "529889",
    phone: "6788 8833",
    hours: "24 Hours (Emergency)",
    region: "East",
  },
  {
    id: "16",
    name: "Singapore General Hospital",
    type: "hospital",
    address: "Outram Road",
    postalCode: "169608",
    phone: "6222 3322",
    hours: "24 Hours (Emergency)",
    region: "Central",
  },
];

type FilterType = "all" | "gp" | "dental" | "polyclinic" | "hospital";

export default function FindCare() {
  const { t, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const filteredClinics = chasClinics.filter((clinic) => {
    const matchesType = filterType === "all" || clinic.type === filterType;
    const matchesRegion = selectedRegion === "all" || clinic.region === selectedRegion;
    const matchesSearch =
      searchQuery === "" ||
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.postalCode.includes(searchQuery);
    return matchesType && matchesRegion && matchesSearch;
  });

  const handleOpenMaps = (address: string, postalCode: string) => {
    const query = encodeURIComponent(`${address}, Singapore ${postalCode}`);
    window.open(`https://maps.google.com/?q=${query}`, "_blank", "noopener,noreferrer");
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\s/g, "")}`;
  };

  const getClinicIcon = (type: Clinic["type"]) => {
    switch (type) {
      case "gp":
        return <Stethoscope className="w-6 h-6 text-primary" />;
      case "dental":
        return <Building2 className="w-6 h-6 text-accent" />;
      case "polyclinic":
        return <Building2 className="w-6 h-6 text-primary" />;
      case "hospital":
        return <Hospital className="w-6 h-6 text-secondary" />;
    }
  };

  const getClinicTypeLabel = (type: Clinic["type"]) => {
    switch (type) {
      case "gp":
        return t("findcare.gpClinic");
      case "dental":
        return t("findcare.dentalClinic");
      case "polyclinic":
        return t("findcare.polyclinic");
      case "hospital":
        return t("findcare.hospital");
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
            onClick={() => navigate("/dashboard")}
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
        <div className="space-y-6 animate-fade-in">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("findcare.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>

          {/* Filter buttons - Type */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              onMouseEnter={() => handleSpeak(t("findcare.all"))}
              size="sm"
            >
              {t("findcare.all")}
            </Button>
            <Button
              variant={filterType === "gp" ? "default" : "outline"}
              onClick={() => setFilterType("gp")}
              onMouseEnter={() => handleSpeak(t("findcare.gpClinic"))}
              size="sm"
            >
              <Stethoscope className="w-4 h-4 mr-2" />
              {t("findcare.gpClinic")}
            </Button>
            <Button
              variant={filterType === "dental" ? "default" : "outline"}
              onClick={() => setFilterType("dental")}
              onMouseEnter={() => handleSpeak(t("findcare.dentalClinic"))}
              size="sm"
            >
              <Building2 className="w-4 h-4 mr-2" />
              {t("findcare.dentalClinic")}
            </Button>
            <Button
              variant={filterType === "polyclinic" ? "default" : "outline"}
              onClick={() => setFilterType("polyclinic")}
              onMouseEnter={() => handleSpeak(t("findcare.polyclinics"))}
              size="sm"
            >
              <Building2 className="w-4 h-4 mr-2" />
              {t("findcare.polyclinics")}
            </Button>
            <Button
              variant={filterType === "hospital" ? "default" : "outline"}
              onClick={() => setFilterType("hospital")}
              onMouseEnter={() => handleSpeak(t("findcare.hospitals"))}
              size="sm"
            >
              <Hospital className="w-4 h-4 mr-2" />
              {t("findcare.hospitals")}
            </Button>
          </div>

          {/* Filter buttons - Region */}
          <div className="flex flex-wrap gap-2">
            {["all", "East", "West", "North", "Central"].map((region) => (
              <Button
                key={region}
                variant={selectedRegion === region ? "secondary" : "outline"}
                onClick={() => setSelectedRegion(region)}
                onMouseEnter={() =>
                  handleSpeak(region === "all" ? t("findcare.allRegions") : region)
                }
                size="sm"
              >
                {region === "all" ? t("findcare.allRegions") : region}
              </Button>
            ))}
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            {t("findcare.resultsCount").replace("{count}", filteredClinics.length.toString())}
          </p>

          {/* Clinics list */}
          <div className="space-y-4">
            {filteredClinics.map((clinic) => (
              <Card key={clinic.id} className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {getClinicIcon(clinic.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="font-bold text-foreground cursor-default text-lg"
                        onMouseEnter={() => handleSpeak(clinic.name)}
                      >
                        {clinic.name}
                      </h3>
                      <span className="text-xs bg-muted px-2 py-1 rounded-full flex-shrink-0">
                        {getClinicTypeLabel(clinic.type)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{clinic.region}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {clinic.address}, Singapore {clinic.postalCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{clinic.hours}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{clinic.phone}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCall(clinic.phone)}
                    onMouseEnter={() => handleSpeak(t("findcare.call"))}
                    className="flex-1"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {t("findcare.call")}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleOpenMaps(clinic.address, clinic.postalCode)}
                    onMouseEnter={() => handleSpeak(t("findcare.directions"))}
                    className="flex-1"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    {t("findcare.directions")}
                  </Button>
                </div>
              </Card>
            ))}

            {filteredClinics.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">{t("findcare.noResults")}</p>
              </Card>
            )}
          </div>

          {/* CHAS info notice */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-foreground">
              <strong>{t("findcare.chasNoticeTitle")}</strong> {t("findcare.chasNoticeDesc")}
            </p>
          </Card>

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
      </main>

      <AccessibilityBar />
    </div>
  );
}
