import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_ZOOM = 15;

interface DeliveryMapPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  onGeoError?: (type: "unsupported" | "denied") => void;
  isRTL: boolean;
  t: (ar: string, en: string) => string;
}

export default function DeliveryMapPicker({ lat, lng, onLocationChange, onGeoError, isRTL, t }: DeliveryMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(lat !== null && lng !== null);

  const redIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const updateMarkerPosition = useCallback((newLat: number, newLng: number) => {
    onLocationChange(newLat, newLng);
    setConfirmed(true);
  }, [onLocationChange]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(center, {
      draggable: true,
      icon: redIcon,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      updateMarkerPosition(pos.lat, pos.lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      updateMarkerPosition(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && markerRef.current && lat !== null && lng !== null) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }
  }, [lat, lng]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      onGeoError?.("unsupported");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        updateMarkerPosition(newLat, newLng);
        if (mapRef.current) {
          mapRef.current.setView([newLat, newLng], DEFAULT_ZOOM);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        }
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        onGeoError?.("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2" data-testid="delivery-map-picker">
      <div
        ref={mapContainerRef}
        className="w-full h-[220px] rounded-xl overflow-hidden border border-emerald-500/30"
        style={{ zIndex: 0 }}
        data-testid="map-container"
      />

      <button
        type="button"
        onClick={handleGetLocation}
        disabled={geoLoading}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all active:scale-[0.98] disabled:opacity-50"
        data-testid="button-get-location"
      >
        {geoLoading ? (
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
        ) : (
          <span className="text-base">🎯</span>
        )}
        <span className="text-emerald-400 text-sm font-bold">
          {geoLoading ? t("جاري التحديد...", "Getting location...") : t("حدد موقعي الحالي 🎯", "Get My Current Location 🎯")}
        </span>
      </button>

      {confirmed && lat !== null && lng !== null && (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15" data-testid="text-location-confirmed">
          <span className="text-emerald-400 text-sm">✅</span>
          <span className="text-emerald-400/80 text-[11px] font-medium">{t("تم تحديد الموقع بنجاح", "Location selected successfully")}</span>
        </div>
      )}

      <p className="text-[10px] text-white/30 text-center">
        {t("اسحب الدبوس أو اضغط على الخريطة لتحديد موقع التوصيل", "Drag the pin or tap on the map to set delivery location")}
      </p>
    </div>
  );
}
