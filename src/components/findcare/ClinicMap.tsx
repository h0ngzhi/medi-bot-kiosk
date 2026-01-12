import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Phone, Navigation, MapPin } from "lucide-react";

// Fix for default marker icons in React-Leaflet
const DefaultIcon = L.icon({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom marker icons by clinic type
const createClinicIcon = (color: string) => {
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    className: "custom-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

const userIcon = L.divIcon({
  html: `<div style="
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 0 3px #3b82f6, 0 4px 10px rgba(0,0,0,0.3);
  "></div>`,
  className: "user-marker",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const clinicIcons = {
  gp: createClinicIcon("#14b8a6"),
  dental: createClinicIcon("#f97316"),
  polyclinic: createClinicIcon("#8b5cf6"),
  hospital: createClinicIcon("#ef4444"),
};

export interface MapClinic {
  id: string;
  name: string;
  type: "gp" | "dental" | "polyclinic" | "hospital";
  address: string;
  postalCode: string;
  phone: string;
  hours: string;
  region: string;
  lat: number;
  lng: number;
  distance?: number;
}

interface ClinicMapProps {
  clinics: MapClinic[];
  userLocation: { lat: number; lng: number } | null;
  distanceFilter: number | null;
  onClinicSelect: (clinic: MapClinic) => void;
  onCall: (phone: string) => void;
  onDirections: (address: string, postalCode: string) => void;
  t: (key: string) => string;
}

// Component to update map view when user location changes
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

export function ClinicMap({
  clinics,
  userLocation,
  distanceFilter,
  onClinicSelect,
  onCall,
  onDirections,
  t,
}: ClinicMapProps) {
  // Singapore center as default
  const defaultCenter: [number, number] = [1.3521, 103.8198];
  const mapCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : defaultCenter;
  
  // Filter clinics by distance if user location is available
  const visibleClinics = useMemo(() => {
    if (!userLocation || !distanceFilter) return clinics;
    return clinics.filter(c => c.distance && c.distance <= distanceFilter);
  }, [clinics, userLocation, distanceFilter]);

  // Determine zoom based on distance filter
  const zoom = useMemo(() => {
    if (!distanceFilter) return 12;
    if (distanceFilter <= 1) return 15;
    if (distanceFilter <= 3) return 14;
    return 12;
  }, [distanceFilter]);

  const getTypeLabel = (type: MapClinic["type"]) => {
    switch (type) {
      case "gp": return t("findcare.gpClinic");
      case "dental": return t("findcare.dentalClinic");
      case "polyclinic": return t("findcare.polyclinic");
      case "hospital": return t("findcare.hospital");
    }
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      scrollWheelZoom={true}
      className="w-full h-full rounded-xl"
      style={{ minHeight: "400px", zIndex: 0 }}
    >
      <MapController center={mapCenter} zoom={zoom} />
      
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Distance circle */}
      {userLocation && distanceFilter && (
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={distanceFilter * 1000}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.1,
            weight: 2,
            dashArray: "5, 5",
          }}
        />
      )}

      {/* User location marker */}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="text-center font-semibold text-blue-600">
              📍 You are here
            </div>
          </Popup>
        </Marker>
      )}

      {/* Clinic markers */}
      {visibleClinics.map((clinic) => (
        <Marker
          key={clinic.id}
          position={[clinic.lat, clinic.lng]}
          icon={clinicIcons[clinic.type]}
          eventHandlers={{
            click: () => onClinicSelect(clinic),
          }}
        >
          <Popup>
            <div className="min-w-[220px] p-1">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {getTypeLabel(clinic.type)}
                </span>
                {clinic.distance !== undefined && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {clinic.distance.toFixed(1)} km
                  </span>
                )}
              </div>
              
              <h3 className="font-bold text-sm mb-2 leading-tight">{clinic.name}</h3>
              
              <div className="space-y-1 text-xs text-gray-600 mb-3">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{clinic.address}</span>
                </div>
                {clinic.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span>{clinic.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {clinic.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
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
                  className="flex-1 h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDirections(clinic.address, clinic.postalCode);
                  }}
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  Go
                </Button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
