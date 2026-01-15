import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { AccessibilityBar } from "@/components/AccessibilityBar";
import { useDebouncedSpeak } from "@/hooks/useDebouncedSpeak";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Building2,
  Hospital,
  Phone,
  MapPin,
  Clock,
  Search,
  Stethoscope,
  Loader2,
  Locate,
  Map,
  List,
  AlertCircle,
  Info,
  Heart,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClinicMap, clinicColors, type MapClinic } from "@/components/findcare/ClinicMap";
import { ClinicListPanel } from "@/components/findcare/ClinicListPanel";
import { allGovernmentFacilities } from "@/data/governmentHealthFacilities";

interface GeoJSONFeature {
  type: string;
  properties: {
    Name: string;
    Description: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number, number]; // [lng, lat, alt]
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

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Parse HTML operation hours to readable format
const parseOperationHours = (html: string): string => {
  if (!html) return "";
  const cleaned = html
    .replace(/<strong>/g, "")
    .replace(/<\/strong>/g, "")
    .replace(/<BR>/gi, "\n")
    .replace(/ : /g, ": ")
    .trim();
  
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
  
  const formatted = Object.entries(dayMap)
    .map(([day, times]) => `${day}: ${times.join(" & ")}`)
    .join(" | ");
  
  return formatted || "";
};

// Parse HTML description from GeoJSON
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
  
  if ([1, 2, 3, 4, 5, 6].includes(prefix)) return "Central";
  if ([7, 8].includes(prefix)) return "Central";
  if ([14, 15, 16].includes(prefix)) return "East";
  if ([17, 18].includes(prefix)) return "East";
  if ([38, 39, 40, 41].includes(prefix)) return "East";
  if ([46, 47, 48, 49, 50, 51, 52].includes(prefix)) return "East";
  if ([9, 10].includes(prefix)) return "Central";
  if ([11, 12, 13].includes(prefix)) return "Central";
  if ([19, 20].includes(prefix)) return "North-East";
  if ([28, 29, 30].includes(prefix)) return "Central";
  if ([31, 32, 33, 34].includes(prefix)) return "Central";
  if ([53, 54, 55, 56, 57].includes(prefix)) return "North-East";
  if ([72, 73].includes(prefix)) return "North";
  if ([75, 76].includes(prefix)) return "North";
  if ([77, 78].includes(prefix)) return "North";
  if ([79, 80].includes(prefix)) return "North";
  if ([58, 59].includes(prefix)) return "North";
  if ([60, 61, 62, 63, 64].includes(prefix)) return "West";
  if ([65, 66, 67, 68].includes(prefix)) return "West";
  if ([69, 70, 71].includes(prefix)) return "West";
  if ([21, 22, 23].includes(prefix)) return "West";
  if ([24, 25, 26, 27].includes(prefix)) return "West";
  if ([35, 36, 37].includes(prefix)) return "Central";
  if ([42, 43, 44, 45].includes(prefix)) return "East";
  if ([81, 82].includes(prefix)) return "North-East";
  
  return "Central";
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
  
  if (streetName) parts.push(streetName);
  if (floorNo && unitNo) parts.push(`#${floorNo}-${unitNo}`);
  if (buildingName) parts.push(buildingName);
  
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

type FilterType = "all" | "gp" | "polyclinic" | "hospital";
type DistanceFilter = 1 | 3 | 5 | null;
type ViewMode = "map" | "list";

export default function FindCare() {
  const { t, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  
  // State
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [clinics, setClinics] = useState<MapClinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHoursClinic, setSelectedHoursClinic] = useState<MapClinic | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<MapClinic | null>(null);
  
  // Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>(3);
  
  // View mode (map vs list)
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  
  // CCN Info expanded state
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showWhyMatters, setShowWhyMatters] = useState(false);

  // Request user location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
        setDistanceFilter(3); // Default to 3km when location is available
        toast.success(t("findcare.locationFound"), { duration: 5000 });
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = t("findcare.locationError");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = t("findcare.locationDenied");
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = t("findcare.locationUnavailable");
            break;
          case error.TIMEOUT:
            errorMsg = t("findcare.locationTimeout");
            break;
        }
        setLocationError(errorMsg);
        toast.error(errorMsg, { duration: 8000 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Load clinics data
  useEffect(() => {
    const loadClinics = async () => {
      try {
        const [geoResponse, hoursResponse, cachedHoursResult] = await Promise.all([
          fetch("/data/CHASClinics.geojson"),
          fetch("/data/ClinicHours.json"),
          supabase.from("clinic_hours_cache").select("*")
        ]);
        
        const geoData: GeoJSONData = await geoResponse.json();
        const hoursData: ClinicHoursData[] = await hoursResponse.json();
        
        const hoursMap: Record<string, string> = {};
        hoursData.forEach(clinic => {
          if (clinic.Phone) {
            const cleanedPhone = clinic.Phone.replace(/\D/g, "");
            const formattedHours = parseOperationHours(clinic.OperationHours);
            if (formattedHours) {
              hoursMap[cleanedPhone] = formattedHours;
            }
          }
        });

        const cachedHoursMap: Record<string, { hours: string; phone: string; name: string; status: string }> = {};
        if (cachedHoursResult.data) {
          cachedHoursResult.data.forEach(cached => {
            cachedHoursMap[cached.clinic_id] = {
              hours: cached.hours || "",
              phone: cached.phone || "",
              name: cached.clinic_name,
              status: cached.status
            };
          });
        }
        
        const parsedClinics: MapClinic[] = [];
        
        geoData.features.forEach((feature, index) => {
          const parsed = parseDescription(feature.properties.Description);
          const clinicId = parsed["HCI_CODE"] || `clinic-${index}`;
          
          const cached = cachedHoursMap[clinicId];
          if (cached?.status === "closed") {
            return; // Skip closed clinics
          }
          
          const postalCode = parsed["POSTAL_CD"] || "";
          const region = getRegionFromPostal(postalCode);
          const licenceType = parsed["LICENCE_TYPE"] || "";
          
          // CHAS clinics are categorized as GP clinics (including dental)
          // Real government polyclinics/hospitals are added separately
          const type: MapClinic["type"] = "gp";
          
          const rawPhone = parsed["HCI_TEL"] || "";
          const cleanedPhone = rawPhone.replace(/\D/g, "");
          
          let matchedHours = "";
          let finalPhone = formatPhone(rawPhone);
          let finalName = parsed["HCI_NAME"] || "Unknown Clinic";
          
          if (cached?.hours) {
            matchedHours = cached.hours;
            if (cached.phone) finalPhone = cached.phone;
            if (cached.name) finalName = cached.name;
          } else {
            matchedHours = hoursMap[cleanedPhone] || "";
          }
          
          // Get coordinates from GeoJSON (format: [lng, lat, alt])
          const [lng, lat] = feature.geometry.coordinates;
          
          parsedClinics.push({
            id: clinicId,
            name: finalName,
            type,
            address: formatAddress(parsed),
            postalCode,
            phone: finalPhone,
            hours: matchedHours,
            region,
            lat,
            lng,
          });
        });
        
        // Add real government polyclinics and hospitals
        const allClinics = [...parsedClinics, ...allGovernmentFacilities];
        allClinics.sort((a, b) => a.name.localeCompare(b.name));
        setClinics(allClinics);
      } catch (error) {
        console.error("Failed to load clinics data:", error);
        toast.error(t("findcare.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClinics();
  }, []);

  // Calculate distances when user location changes
  const clinicsWithDistance = useMemo(() => {
    if (!userLocation) return clinics;
    
    return clinics.map(clinic => ({
      ...clinic,
      distance: calculateDistance(userLocation.lat, userLocation.lng, clinic.lat, clinic.lng),
    })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [clinics, userLocation]);

  // Filter clinics
  const filteredClinics = useMemo(() => {
    let result = clinicsWithDistance;
    
    // Filter by type
    if (filterType !== "all") {
      result = result.filter(c => c.type === filterType);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query) ||
        c.postalCode.includes(query)
      );
    }
    
    // Filter by distance
    if (userLocation && distanceFilter) {
      result = result.filter(c => c.distance && c.distance <= distanceFilter);
    }
    
    return result;
  }, [clinicsWithDistance, filterType, searchQuery, distanceFilter, userLocation]);

  const { handleMouseEnter, handleMouseLeave } = useDebouncedSpeak(isTtsEnabled, language);

  const handleOpenMaps = (address: string, postalCode: string) => {
    const query = encodeURIComponent(`${address}, Singapore ${postalCode}`);
    window.open(`https://maps.google.com/?q=${query}`, "_blank", "noopener,noreferrer");
  };

  // Phone popup state
  const [phonePopup, setPhonePopup] = useState<{ phone: string; name: string } | null>(null);

  const handleShowPhone = (phone: string, clinicName: string) => {
    setPhonePopup({ phone, name: clinicName });
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card shadow-soft p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            onMouseEnter={() => handleMouseEnter(t("common.back"))}
            onMouseLeave={handleMouseLeave}
            className="w-12 h-12 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1" onMouseEnter={() => handleMouseEnter(`${t("findcare.title")}. ${t("findcare.subtitle")}`)} onMouseLeave={handleMouseLeave}>
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">{t("findcare.title")}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{t("findcare.titleSubtext")}</p>
          </div>
          
          {/* View toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="h-9"
            >
              <Map className="w-4 h-4 mr-2" />
              {t("findcare.mapView")}
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-9"
            >
              <List className="w-4 h-4 mr-2" />
              {t("findcare.listView")}
            </Button>
          </div>
        </div>
      </header>

      {/* CCN Intro Section */}
      <div className="bg-primary/5 border-b border-primary/20 px-4 py-3 flex-shrink-0">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Intro text */}
          <div className="text-base text-foreground leading-relaxed" onMouseEnter={() => handleMouseEnter(`${t("findcare.ccnIntro1")} ${t("findcare.ccnIntro2")}`)} onMouseLeave={handleMouseLeave}>
            <p>{t("findcare.ccnIntro1")}</p>
            <p className="text-muted-foreground mt-1">{t("findcare.ccnIntro2")}</p>
          </div>
          
          {/* How It Works - Collapsible */}
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-2"
              onClick={() => setShowHowItWorks(!showHowItWorks)}
            >
              <Info className="w-4 h-4 text-primary" />
              {t("findcare.howItWorks")}
              {showHowItWorks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-2"
              onClick={() => setShowWhyMatters(!showWhyMatters)}
            >
              <Heart className="w-4 h-4 text-primary" />
              {t("findcare.whyMatters")}
              {showWhyMatters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {/* Gentle nudge */}
            <span className="text-sm text-primary font-medium flex items-center gap-1 ml-auto">
              💡 {t("findcare.ccnNudge")}
            </span>
          </div>
          
          {/* How It Works expanded content */}
          {showHowItWorks && (
            <div className="bg-card rounded-xl p-4 border shadow-sm space-y-2" onMouseEnter={() => handleMouseEnter(`${t("findcare.howItWorks1")}. ${t("findcare.howItWorks2")}. ${t("findcare.howItWorks3")}`)} onMouseLeave={handleMouseLeave}>
              <ul className="space-y-2 text-base">
                <li className="flex items-start gap-3">
                  <Stethoscope className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{t("findcare.howItWorks1")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Hospital className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{t("findcare.howItWorks2")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{t("findcare.howItWorks3")}</span>
                </li>
              </ul>
            </div>
          )}
          
          {/* Why It Matters expanded content */}
          {showWhyMatters && (
            <div className="bg-card rounded-xl p-4 border shadow-sm" onMouseEnter={() => handleMouseEnter(t("findcare.whyMattersText"))} onMouseLeave={handleMouseLeave}>
              <p className="text-base text-foreground">{t("findcare.whyMattersText")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border-b p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Search and location */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("findcare.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Button
              variant={userLocation ? "secondary" : "default"}
              onClick={requestLocation}
              disabled={isLocating}
              className="h-11 px-4"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Locate className="w-4 h-4 mr-2" />
                  {userLocation ? t("findcare.located") : t("findcare.findMe")}
                </>
              )}
            </Button>
          </div>

          {/* Location error */}
          {locationError && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{locationError}</span>
            </div>
          )}

          {/* Distance filters (only show when location available) */}
          {userLocation && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground">{t("findcare.distance")}:</span>
              {[1, 3, 5, null].map((dist) => (
                <Button
                  key={dist ?? "all"}
                  variant={distanceFilter === dist ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDistanceFilter(dist as DistanceFilter)}
                  className="h-8"
                >
                  {dist ? `${dist} ${t("findcare.km")}` : t("findcare.all")}
                </Button>
              ))}
            </div>
          )}

          {/* Type filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              size="sm"
              className="h-8"
            >
              {t("findcare.all")}
            </Button>
            <Button
              variant={filterType === "gp" ? "default" : "outline"}
              onClick={() => setFilterType("gp")}
              size="sm"
              className="h-8"
            >
              <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
              {t("findcare.gp")}
            </Button>
            <Button
              variant={filterType === "polyclinic" ? "default" : "outline"}
              onClick={() => setFilterType("polyclinic")}
              size="sm"
              className="h-8"
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              {t("findcare.polyclinic")}
            </Button>
            <Button
              variant={filterType === "hospital" ? "default" : "outline"}
              onClick={() => setFilterType("hospital")}
              size="sm"
              className="h-8"
            >
              <Hospital className="w-3.5 h-3.5 mr-1.5" />
              {t("findcare.hospital")}
            </Button>
            
            {/* Results count */}
            <div className="flex-1 flex items-center justify-end">
              <span className="text-sm text-muted-foreground">
                {isLoading ? t("findcare.loading") : `${filteredClinics.length} ${t("findcare.clinicsFound")}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">{t("findcare.loadingClinics")}</p>
            </div>
          </div>
        ) : viewMode === "map" ? (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Map */}
            <div className="flex-1 relative min-h-[300px] lg:min-h-0">
              <ClinicMap
                clinics={filteredClinics}
                userLocation={userLocation}
                distanceFilter={distanceFilter}
                onClinicSelect={setSelectedClinic}
                onShowPhone={handleShowPhone}
                onViewHours={setSelectedHoursClinic}
                t={t}
              />
              
              {/* Recenter button */}
              {userLocation && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 lg:top-4 lg:right-4 shadow-lg z-10"
                  onClick={requestLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Locate className="w-4 h-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">{t("findcare.recenter")}</span>
                </Button>
              )}
              
              {/* Legend with CCN labels - responsive positioning */}
              <div className="absolute bottom-2 left-2 lg:bottom-4 lg:left-4 bg-card/95 backdrop-blur-sm p-2 lg:p-4 rounded-xl shadow-lg text-xs lg:text-sm space-y-1 lg:space-y-2 max-w-[180px] lg:max-w-none">
                <div className="font-bold text-foreground mb-1 lg:mb-3">{t("findcare.clinicTypes")}</div>
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full flex-shrink-0" style={{ backgroundColor: clinicColors.gp }}></div>
                  <div>
                    <span className="font-medium">{t("findcare.gpLabel")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full flex-shrink-0" style={{ backgroundColor: clinicColors.polyclinic }}></div>
                  <div>
                    <span className="font-medium">{t("findcare.polyclinicLabel")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full flex-shrink-0" style={{ backgroundColor: clinicColors.hospital }}></div>
                  <div>
                    <span className="font-medium">{t("findcare.hospitalLabel")}</span>
                  </div>
                </div>
                {userLocation && (
                  <div className="flex items-center gap-2 lg:gap-3 pt-1 lg:pt-2 border-t mt-1 lg:mt-2">
                    <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <span className="font-medium">{t("findcare.yourLocation")}</span>
                  </div>
                )}
                <p className="text-[10px] lg:text-xs text-muted-foreground pt-1 lg:pt-2 border-t mt-1 lg:mt-2 hidden sm:block">{t("findcare.partOfCommunity")}</p>
              </div>
            </div>

            {/* Side panel - responsive width */}
            <div className="w-full lg:w-80 xl:w-96 bg-card border-t lg:border-t-0 lg:border-l flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none">
              <div className="p-3 border-b bg-muted/50">
                <h2 className="font-semibold text-foreground text-sm lg:text-base">
                  {t("findcare.nearbyClinics")}
                  {distanceFilter && <span className="text-muted-foreground font-normal"> ({t("findcare.within")} {distanceFilter} {t("findcare.km")})</span>}
                </h2>
              </div>
              <ClinicListPanel
                clinics={filteredClinics.slice(0, 100)}
                selectedClinic={selectedClinic}
                onClinicSelect={setSelectedClinic}
                onShowPhone={handleShowPhone}
                t={t}
                handleMouseEnter={handleMouseEnter}
                handleMouseLeave={handleMouseLeave}
              />
            </div>
          </div>
        ) : (
          /* List view */
          <div className="flex-1 overflow-auto p-4">
            <div className="max-w-2xl mx-auto">
              <ClinicListPanel
                clinics={filteredClinics.slice(0, 100)}
                selectedClinic={selectedClinic}
                onClinicSelect={setSelectedClinic}
                onShowPhone={handleShowPhone}
                t={t}
                handleMouseEnter={handleMouseEnter}
                handleMouseLeave={handleMouseLeave}
              />
            </div>
          </div>
        )}
      </main>

      {/* CCN Awareness Footer */}
      <div className="flex-shrink-0 bg-muted/50 border-t px-4 py-2">
        <p className="text-xs text-muted-foreground text-center max-w-4xl mx-auto">
          {t("findcare.ccnFooter")}
        </p>
      </div>

      {/* Emergency notice */}
      <div className="flex-shrink-0 bg-destructive/10 border-t border-destructive/20 p-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-sm text-foreground">
            <strong>{t("findcare.emergencyTitle")}</strong> {t("findcare.emergencyDesc")}
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => window.location.href = "tel:995"}
          >
            <Phone className="w-4 h-4 mr-2" />
            {t("findcare.call995")}
          </Button>
        </div>
      </div>

      <AccessibilityBar />

      {/* Operating Hours Dialog */}
      <Dialog open={!!selectedHoursClinic} onOpenChange={() => setSelectedHoursClinic(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              {t("findcare.openingHours")}
            </DialogTitle>
          </DialogHeader>
          {selectedHoursClinic && (
            <div className="space-y-4">
              <p className="font-semibold text-lg text-foreground">
                {selectedHoursClinic.name}
              </p>
              <div className="space-y-2 text-base">
                {selectedHoursClinic.hours.split(" | ").map((dayHours, index) => {
                  const [day, ...times] = dayHours.split(": ");
                  return (
                    <div key={index} className="flex justify-between items-start py-2 border-b border-border last:border-0">
                      <span className="font-medium text-foreground">{day}</span>
                      <span className="text-muted-foreground text-right">{times.join(": ")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Phone Number Popup Dialog */}
      <Dialog open={!!phonePopup} onOpenChange={() => setPhonePopup(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Phone className="w-6 h-6 text-primary" />
              {t("findcare.contactNumber")}
            </DialogTitle>
          </DialogHeader>
          {phonePopup && (
            <div className="space-y-4 text-center">
              <p className="font-medium text-foreground">
                {phonePopup.name}
              </p>
              <p className="text-3xl font-bold text-primary tracking-wide">
                {phonePopup.phone}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
