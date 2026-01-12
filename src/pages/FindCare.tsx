import { useState, useEffect } from "react";
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
  Loader2,
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
  programmes: string[];
}

interface GeoJSONFeature {
  type: string;
  properties: {
    Name: string;
    Description: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number, number];
  };
}

interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

interface ClinicHoursData {
  Name: string;
  Phone: string;
  OperationHours: string;
}

// Parse HTML operation hours to readable format
const parseOperationHours = (html: string): string => {
  if (!html) return "";
  // Remove HTML tags and format nicely
  const cleaned = html
    .replace(/<strong>/g, "")
    .replace(/<\/strong>/g, "")
    .replace(/<BR>/gi, "\n")
    .replace(/ : /g, ": ")
    .trim();
  
  // Get unique day entries (some days may have multiple time slots)
  const lines = cleaned.split("\n").filter(Boolean);
  const dayMap: Record<string, string[]> = {};
  
  lines.forEach(line => {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const day = match[1];
      const time = match[2];
      if (!dayMap[day]) {
        dayMap[day] = [];
      }
      dayMap[day].push(time);
    }
  });
  
  // Format: combine same-day times with " & "
  const formatted = Object.entries(dayMap)
    .map(([day, times]) => `${day}: ${times.join(" & ")}`)
    .join(" | ");
  
  return formatted || "";
};

// Parse HTML description from GeoJSON to extract clinic data
const parseDescription = (html: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const matches = html.matchAll(/<th>([^<]+)<\/th>\s*<td>([^<]*)<\/td>/g);
  for (const match of matches) {
    result[match[1]] = match[2];
  }
  return result;
};

// Determine region based on postal code
const getRegionFromPostal = (postalCode: string): string => {
  const prefix = parseInt(postalCode.substring(0, 2), 10);
  
  // Singapore postal code regions
  if ([1, 2, 3, 4, 5, 6].includes(prefix)) return "Central";
  if ([7, 8].includes(prefix)) return "Central"; // Downtown
  if ([14, 15, 16].includes(prefix)) return "East"; // Geylang, Eunos
  if ([17, 18].includes(prefix)) return "East"; // Changi
  if ([38, 39, 40, 41].includes(prefix)) return "East"; // Tampines, Pasir Ris
  if ([46, 47, 48, 49, 50, 51, 52].includes(prefix)) return "East"; // Bedok, Upper East Coast
  if ([9, 10].includes(prefix)) return "Central"; // Orchard
  if ([11, 12, 13].includes(prefix)) return "Central"; // Newton, Novena
  if ([19, 20].includes(prefix)) return "North-East"; // Serangoon
  if ([28, 29, 30].includes(prefix)) return "Central"; // Bishan
  if ([31, 32, 33, 34].includes(prefix)) return "Central"; // Toa Payoh, Braddell
  if ([53, 54, 55, 56, 57].includes(prefix)) return "North-East"; // Serangoon, Hougang
  if ([72, 73].includes(prefix)) return "North"; // Woodlands
  if ([75, 76].includes(prefix)) return "North"; // Yishun
  if ([77, 78].includes(prefix)) return "North"; // Sembawang
  if ([79, 80].includes(prefix)) return "North"; // Seletar
  if ([58, 59].includes(prefix)) return "North"; // Ang Mo Kio
  if ([60, 61, 62, 63, 64].includes(prefix)) return "West"; // Jurong
  if ([65, 66, 67, 68].includes(prefix)) return "West"; // Jurong, Tuas
  if ([69, 70, 71].includes(prefix)) return "West"; // Bukit Batok, Choa Chu Kang
  if ([21, 22, 23].includes(prefix)) return "West"; // Bukit Timah, Clementi
  if ([24, 25, 26, 27].includes(prefix)) return "West"; // Holland, Queenstown
  if ([35, 36, 37].includes(prefix)) return "Central"; // Kallang, Macpherson
  if ([42, 43, 44, 45].includes(prefix)) return "East"; // Katong, Marine Parade
  if ([81, 82].includes(prefix)) return "North-East"; // Punggol, Sengkang
  
  return "Central"; // Default
};

// Format address from parsed data
const formatAddress = (data: Record<string, string>): string => {
  const parts: string[] = [];
  
  const blkHseNo = data["BLK_HSE_NO"];
  const streetName = data["STREET_NAME"];
  const floorNo = data["FLOOR_NO"];
  const unitNo = data["UNIT_NO"];
  const buildingName = data["BUILDING_NAME"];
  
  if (blkHseNo) {
    if (data["ADDR_TYPE"] === "A") {
      parts.push(`Blk ${blkHseNo}`);
    } else {
      parts.push(blkHseNo);
    }
  }
  
  if (streetName) {
    parts.push(streetName);
  }
  
  if (floorNo && unitNo) {
    parts.push(`#${floorNo}-${unitNo}`);
  }
  
  if (buildingName) {
    parts.push(buildingName);
  }
  
  return parts.join(" ").toUpperCase();
};

// Format phone number
const formatPhone = (phone: string): string => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 8) {
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4)}`;
  }
  return phone;
};

type FilterType = "all" | "gp" | "dental" | "polyclinic" | "hospital";

export default function FindCare() {
  const { t, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [regions, setRegions] = useState<string[]>(["all"]);

  useEffect(() => {
    const loadClinics = async () => {
      try {
        // Load both datasets in parallel
        const [geoResponse, hoursResponse] = await Promise.all([
          fetch("/data/CHASClinics.geojson"),
          fetch("/data/ClinicHours.json")
        ]);
        
        const geoData: GeoJSONData = await geoResponse.json();
        const hoursData: ClinicHoursData[] = await hoursResponse.json();
        
        // Create a map of phone number to operation hours for quick lookup
        const hoursMap = new Map<string, string>();
        hoursData.forEach(clinic => {
          if (clinic.Phone) {
            const cleanedPhone = clinic.Phone.replace(/\D/g, "");
            const formattedHours = parseOperationHours(clinic.OperationHours);
            if (formattedHours) {
              hoursMap.set(cleanedPhone, formattedHours);
            }
          }
        });
        
        const parsedClinics: Clinic[] = geoData.features.map((feature, index) => {
          const parsed = parseDescription(feature.properties.Description);
          const postalCode = parsed["POSTAL_CD"] || "";
          const region = getRegionFromPostal(postalCode);
          const licenceType = parsed["LICENCE_TYPE"] || "";
          const programmes = (parsed["CLINIC_PROGRAMME_CODE"] || "").split(",").map(p => p.trim()).filter(Boolean);
          
          // Determine clinic type based on licence type and name
          let type: Clinic["type"] = "gp";
          const name = (parsed["HCI_NAME"] || "").toLowerCase();
          if (name.includes("dental") || licenceType === "DC") {
            type = "dental";
          } else if (name.includes("polyclinic")) {
            type = "polyclinic";
          } else if (name.includes("hospital")) {
            type = "hospital";
          }
          
          // Get phone and match with hours data
          const rawPhone = parsed["HCI_TEL"] || "";
          const cleanedPhone = rawPhone.replace(/\D/g, "");
          const matchedHours = hoursMap.get(cleanedPhone) || "";
          
          return {
            id: parsed["HCI_CODE"] || `clinic-${index}`,
            name: parsed["HCI_NAME"] || "Unknown Clinic",
            type,
            address: formatAddress(parsed),
            postalCode,
            phone: formatPhone(rawPhone),
            hours: matchedHours,
            region,
            programmes,
          };
        });
        
        // Sort alphabetically by name
        parsedClinics.sort((a, b) => a.name.localeCompare(b.name));
        
        // Extract unique regions
        const uniqueRegions = ["all", ...new Set(parsedClinics.map(c => c.region))].sort();
        setRegions(uniqueRegions);
        
        setClinics(parsedClinics);
      } catch (error) {
        console.error("Failed to load clinics data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClinics();
  }, []);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const filteredClinics = clinics.filter((clinic) => {
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
            {regions.map((region) => (
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
            {isLoading 
              ? t("common.loading") || "Loading..."
              : t("findcare.resultsCount").replace("{count}", filteredClinics.length.toString())
            }
          </p>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Clinics list */}
          {!isLoading && (
            <div className="space-y-4">
              {filteredClinics.slice(0, 50).map((clinic) => (
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
                      {clinic.programmes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {clinic.programmes.map((prog) => (
                            <span key={prog} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {prog}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {clinic.address}, Singapore {clinic.postalCode}
                      </span>
                    </div>
                    {clinic.hours && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-xs leading-relaxed">{clinic.hours}</span>
                      </div>
                    )}
                    {clinic.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span>{clinic.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {clinic.phone && (
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
                    )}
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

              {filteredClinics.length > 50 && (
                <Card className="p-4 text-center bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Showing 50 of {filteredClinics.length} results. Use search to find specific clinics.
                  </p>
                </Card>
              )}

              {filteredClinics.length === 0 && !isLoading && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">{t("findcare.noResults")}</p>
                </Card>
              )}
            </div>
          )}

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
