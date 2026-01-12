import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
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

// Custom marker icons
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

export function ClinicMap({
  clinics,
  userLocation,
  distanceFilter,
  onClinicSelect,
  onCall,
  onDirections,
  t,
}: ClinicMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Singapore center as default
  const defaultCenter: [number, number] = [1.3521, 103.8198];
  
  // Filter clinics by distance
  const visibleClinics = useMemo(() => {
    if (!userLocation || !distanceFilter) return clinics;
    return clinics.filter(c => c.distance && c.distance <= distanceFilter);
  }, [clinics, userLocation, distanceFilter]);

  // Calculate zoom based on distance filter
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

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map center and zoom when user location or filter changes
  useEffect(() => {
    if (!mapRef.current) return;

    const center: [number, number] = userLocation 
      ? [userLocation.lat, userLocation.lng] 
      : defaultCenter;

    mapRef.current.setView(center, zoom);
  }, [userLocation, zoom]);

  // Update user location marker and circle
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old user marker and circle
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    // Add new user marker and circle
    if (userLocation) {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup("<strong class='text-blue-600'>📍 You are here</strong>");

      if (distanceFilter) {
        circleRef.current = L.circle([userLocation.lat, userLocation.lng], {
          radius: distanceFilter * 1000,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.1,
          weight: 2,
          dashArray: "5, 5",
        }).addTo(mapRef.current);
      }
    }
  }, [userLocation, distanceFilter]);

  // Update clinic markers
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    // Add new markers
    visibleClinics.forEach((clinic) => {
      const marker = L.marker([clinic.lat, clinic.lng], {
        icon: clinicIcons[clinic.type],
      });

      const popupContent = `
        <div style="min-width: 200px; padding: 4px;">
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 11px; background: #f3f4f6; padding: 2px 8px; border-radius: 9999px;">
              ${getTypeLabel(clinic.type)}
            </span>
            ${clinic.distance !== undefined ? `
              <span style="font-size: 11px; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 9999px;">
                ${clinic.distance.toFixed(1)} km
              </span>
            ` : ''}
          </div>
          <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 8px; line-height: 1.3;">${clinic.name}</h3>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">
            <div style="margin-bottom: 4px;">📍 ${clinic.address}</div>
            ${clinic.phone ? `<div>📞 ${clinic.phone}</div>` : ''}
          </div>
          <div style="display: flex; gap: 8px;">
            ${clinic.phone ? `
              <button 
                onclick="window.location.href='tel:${clinic.phone.replace(/\s/g, '')}'"
                style="flex: 1; padding: 6px 12px; font-size: 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;"
              >
                📞 Call
              </button>
            ` : ''}
            <button 
              onclick="window.open('https://maps.google.com/?q=${encodeURIComponent(clinic.address + ', Singapore ' + clinic.postalCode)}', '_blank')"
              style="flex: 1; padding: 6px 12px; font-size: 12px; background: #14b8a6; color: white; border: none; border-radius: 6px; cursor: pointer;"
            >
              🧭 Directions
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280 });
      marker.on("click", () => onClinicSelect(clinic));
      marker.addTo(markersRef.current!);
    });
  }, [visibleClinics, onClinicSelect, t]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-xl"
      style={{ minHeight: "400px", zIndex: 0 }}
    />
  );
}
