import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom marker icons with distinct colors per category
const createClinicIcon = (color: string, borderColor: string) => {
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
      ">
        <div style="
          background-color: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid ${borderColor};
          box-shadow: 0 3px 8px rgba(0,0,0,0.4);
          position: absolute;
          top: 0;
          left: 2px;
        "></div>
        <div style="
          position: absolute;
          top: 6px;
          left: 10px;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        "></div>
      </div>
    `,
    className: "custom-clinic-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

const userIcon = L.divIcon({
  html: `
    <div style="
      position: relative;
      width: 28px;
      height: 28px;
    ">
      <div style="
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 0 0 3px #3b82f6, 0 4px 12px rgba(0,0,0,0.4);
        position: absolute;
        top: 2px;
        left: 2px;
      "></div>
    </div>
  `,
  className: "user-location-marker",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Distinct colors for each clinic type
const clinicIcons = {
  gp: createClinicIcon("#10b981", "#059669"),        // Emerald/Green for GP
  dental: createClinicIcon("#f59e0b", "#d97706"),    // Amber/Orange for Dental
  polyclinic: createClinicIcon("#8b5cf6", "#7c3aed"), // Purple for Polyclinic
  hospital: createClinicIcon("#ef4444", "#dc2626"),  // Red for Hospital
};

// Color mapping for legend
export const clinicColors = {
  gp: "#10b981",
  dental: "#f59e0b",
  polyclinic: "#8b5cf6",
  hospital: "#ef4444",
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
  onShowPhone: (phone: string, clinicName: string) => void;
  onViewHours: (clinic: MapClinic) => void;
  t: (key: string) => string;
}

export function ClinicMap({
  clinics,
  userLocation,
  distanceFilter,
  onClinicSelect,
  onShowPhone,
  onViewHours,
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

  const getTypeLabel = (type: MapClinic["type"]) => {
    switch (type) {
      case "gp": return t("findcare.gpClinic");
      case "dental": return t("findcare.dentalClinic");
      case "polyclinic": return t("findcare.polyclinic");
      case "hospital": return t("findcare.hospital");
    }
  };

  const getTypeColor = (type: MapClinic["type"]) => {
    return clinicColors[type];
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
        .bindPopup("<div style='text-align: center; font-weight: bold; color: #3b82f6;'>📍 You are here</div>");

      if (distanceFilter) {
        // Create circle for distance radius
        circleRef.current = L.circle([userLocation.lat, userLocation.lng], {
          radius: distanceFilter * 1000,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.08,
          weight: 3,
          dashArray: "8, 8",
        }).addTo(mapRef.current);
      }
    }
  }, [userLocation, distanceFilter]);

  // Center map on user location whenever distance filter changes
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    // Calculate zoom level based on distance
    let targetZoom = 13;
    if (distanceFilter) {
      if (distanceFilter <= 1) targetZoom = 15;
      else if (distanceFilter <= 3) targetZoom = 14;
      else if (distanceFilter <= 5) targetZoom = 13;
      else targetZoom = 12;
    }

    // Always center on user location when distance filter changes
    mapRef.current.setView([userLocation.lat, userLocation.lng], targetZoom, {
      animate: true,
      duration: 0.5,
    });
  }, [distanceFilter, userLocation]);

  // Initial map positioning when user location is first available
  useEffect(() => {
    if (!mapRef.current) return;

    if (!userLocation) {
      // No user location - show all of Singapore
      mapRef.current.setView(defaultCenter, 12, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [userLocation]);

  // Update clinic markers
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    // Set up global handlers for popup buttons
    (window as any).__clinicMapShowPhone = (phone: string, name: string) => {
      onShowPhone(phone, name);
    };
    (window as any).__clinicMapViewHours = (clinicId: string) => {
      const clinic = visibleClinics.find(c => c.id === clinicId);
      if (clinic) {
        onViewHours(clinic);
      }
    };

    // Add new markers
    visibleClinics.forEach((clinic) => {
      const marker = L.marker([clinic.lat, clinic.lng], {
        icon: clinicIcons[clinic.type],
      });

      const typeColor = getTypeColor(clinic.type);
      const escapedName = clinic.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
      const escapedPhone = clinic.phone.replace(/'/g, "\\'").replace(/"/g, '\\"');
      
      const popupContent = `
        <div style="min-width: 220px; padding: 8px;">
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
            <span style="
              font-size: 11px; 
              background: ${typeColor}20; 
              color: ${typeColor}; 
              padding: 3px 10px; 
              border-radius: 9999px;
              font-weight: 600;
              border: 1px solid ${typeColor}40;
            ">
              ${getTypeLabel(clinic.type)}
            </span>
            ${clinic.distance !== undefined ? `
              <span style="
                font-size: 11px; 
                background: #dbeafe; 
                color: #1d4ed8; 
                padding: 3px 10px; 
                border-radius: 9999px;
                font-weight: 600;
              ">
                ${clinic.distance.toFixed(1)} km away
              </span>
            ` : ''}
          </div>
          <h3 style="font-weight: bold; font-size: 15px; margin-bottom: 10px; line-height: 1.4; color: #1f2937;">${clinic.name}</h3>
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 14px;">
            <div style="margin-bottom: 6px; display: flex; align-items: flex-start; gap: 6px;">
              <span>📍</span>
              <span>${clinic.address}</span>
            </div>
            ${clinic.phone ? `
              <div style="display: flex; align-items: center; gap: 6px;">
                <span>📞</span>
                <span>${clinic.phone}</span>
              </div>
            ` : ''}
          </div>
          <div style="display: flex; gap: 8px;">
            ${clinic.phone ? `
              <button 
                onclick="window.__clinicMapShowPhone('${escapedPhone}', '${escapedName}')"
                style="
                  flex: 1; 
                  padding: 10px 12px; 
                  font-size: 13px; 
                  font-weight: 600;
                  background: white; 
                  border: 2px solid #e5e7eb; 
                  border-radius: 8px; 
                  cursor: pointer;
                  transition: all 0.2s;
                "
                onmouseover="this.style.borderColor='#3b82f6'; this.style.color='#3b82f6';"
                onmouseout="this.style.borderColor='#e5e7eb'; this.style.color='inherit';"
              >
                📞 Call
              </button>
            ` : ''}
            <button 
              onclick="window.__clinicMapViewHours('${clinic.id}')"
              style="
                flex: 1; 
                padding: 10px 12px; 
                font-size: 13px; 
                font-weight: 600;
                background: ${typeColor}; 
                color: white; 
                border: none; 
                border-radius: 8px; 
                cursor: pointer;
                transition: all 0.2s;
              "
            >
              🕐 View Hours
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });
      marker.on("click", () => onClinicSelect(clinic));
      marker.addTo(markersRef.current!);
    });

    // Cleanup global handlers
    return () => {
      delete (window as any).__clinicMapShowPhone;
      delete (window as any).__clinicMapViewHours;
    };
  }, [visibleClinics, onClinicSelect, onShowPhone, onViewHours, t]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-xl"
      style={{ minHeight: "400px", zIndex: 0 }}
    />
  );
}
