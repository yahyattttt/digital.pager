import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, MapPin, Check } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_ZOOM = 17;

const REVERSE_GEOCODE_DEBOUNCE = 600;

interface DeliveryMapPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationConfirmed: (lat: number, lng: number, address: string) => void;
  onLocationDirty?: () => void;
  onGeoError?: (type: "unsupported" | "denied") => void;
  isRTL: boolean;
  t: (ar: string, en: string) => string;
  confirmed?: boolean;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ar`,
      { headers: { "User-Agent": "DigitalPager/1.0" } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const a = data.address || {};
    const parts: string[] = [];
    if (a.road) parts.push(a.road);
    if (a.neighbourhood || a.suburb) parts.push(a.neighbourhood || a.suburb);
    if (a.city || a.town || a.village) parts.push(a.city || a.town || a.village);
    return parts.length > 0 ? parts.join("، ") : (data.display_name || "").split(",").slice(0, 3).join("،");
  } catch {
    return "";
  }
}

export default function DeliveryMapPicker({ lat, lng, onLocationConfirmed, onLocationDirty, onGeoError, isRTL, t, confirmed: externalConfirmed }: DeliveryMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pulseRef = useRef<L.CircleMarker | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [pendingLat, setPendingLat] = useState<number | null>(lat);
  const [pendingLng, setPendingLng] = useState<number | null>(lng);
  const [geocodedAddress, setGeocodedAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(!!externalConfirmed);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPinSet = pendingLat !== null && pendingLng !== null;

  const redIcon = L.divIcon({
    className: "delivery-pin-icon",
    html: `<div style="position:relative;width:40px;height:52px;">
      <svg viewBox="0 0 40 52" width="40" height="52" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5"/>
        <circle cx="20" cy="18" r="8" fill="white" opacity="0.9"/>
        <circle cx="20" cy="18" r="4" fill="#ef4444"/>
      </svg>
    </div>`,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
  });

  function triggerReverseGeocode(newLat: number, newLng: number) {
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    setGeocoding(true);
    geocodeTimerRef.current = setTimeout(async () => {
      const addr = await reverseGeocode(newLat, newLng);
      setGeocodedAddress(addr);
      setGeocoding(false);
    }, REVERSE_GEOCODE_DEBOUNCE);
  }

  const handlePinMove = useCallback((newLat: number, newLng: number) => {
    setPendingLat(newLat);
    setPendingLng(newLng);
    setIsConfirmed(false);
    onLocationDirty?.();
    triggerReverseGeocode(newLat, newLng);

    if (pulseRef.current) {
      pulseRef.current.setLatLng([newLat, newLng]);
    }
  }, [onLocationDirty]);

  function handleConfirmLocation() {
    if (pendingLat === null || pendingLng === null) return;
    setIsConfirmed(true);
    onLocationConfirmed(pendingLat, pendingLng, geocodedAddress);
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center: [number, number] = pendingLat !== null && pendingLng !== null ? [pendingLat, pendingLng] : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
    }).addTo(map);

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
    }).addTo(map);

    L.tileLayer("https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png", {
      maxZoom: 19,
      opacity: 0.7,
    }).addTo(map);

    const pulse = L.circleMarker(center, {
      radius: 18,
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.15,
      weight: 2,
      opacity: 0.4,
      className: "delivery-pulse-ring",
    }).addTo(map);
    pulseRef.current = pulse;

    const marker = L.marker(center, {
      draggable: true,
      icon: redIcon,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      handlePinMove(pos.lat, pos.lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      handlePinMove(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    setTimeout(() => map.invalidateSize(), 200);

    if (pendingLat !== null && pendingLng !== null) {
      triggerReverseGeocode(pendingLat, pendingLng);
    }

    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      pulseRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && markerRef.current && lat !== null && lng !== null) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
      if (pulseRef.current) pulseRef.current.setLatLng([lat, lng]);
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
        setPendingLat(newLat);
        setPendingLng(newLng);
        setIsConfirmed(false);
        onLocationDirty?.();
        if (mapRef.current) {
          mapRef.current.setView([newLat, newLng], DEFAULT_ZOOM);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        }
        if (pulseRef.current) {
          pulseRef.current.setLatLng([newLat, newLng]);
        }
        triggerReverseGeocode(newLat, newLng);
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
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="w-full h-[250px] rounded-xl overflow-hidden border-2 border-emerald-500/30"
          style={{ zIndex: 0 }}
          data-testid="map-container"
        />

        {hasPinSet && (
          <div className="absolute top-2 left-2 right-2 z-[1000]" data-testid="floating-address-label">
            <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
              {geocoding ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-emerald-400 animate-spin shrink-0" />
                  <span className="text-white/50 text-[11px]">{t("جاري تحديد العنوان...", "Fetching address...")}</span>
                </div>
              ) : geocodedAddress ? (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  <p className="text-white/80 text-[11px] font-medium leading-snug truncate" dir="rtl" data-testid="text-geocoded-address">{geocodedAddress}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-white/30 shrink-0" />
                  <span className="text-white/40 text-[11px]">{t("حرّك الدبوس لعرض العنوان", "Move pin to see address")}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleGetLocation}
        disabled={geoLoading}
        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all active:scale-[0.98] disabled:opacity-50"
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

      {hasPinSet && !isConfirmed && (
        <button
          type="button"
          onClick={handleConfirmLocation}
          disabled={geocoding}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-600/20"
          data-testid="button-confirm-location"
        >
          <MapPin className="w-5 h-5 text-white" />
          <span className="text-white text-sm font-bold">{t("تثبيت الموقع 📍", "Confirm Location 📍")}</span>
        </button>
      )}

      {isConfirmed && pendingLat !== null && pendingLng !== null && (
        <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20" data-testid="text-location-confirmed">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold">{t("تم تثبيت الموقع بنجاح", "Location confirmed successfully")}</span>
          </div>
          {geocodedAddress && (
            <p className="text-emerald-300/70 text-[11px] leading-snug ps-5" dir="rtl" data-testid="text-confirmed-address">{geocodedAddress}</p>
          )}
        </div>
      )}

      <p className="text-[10px] text-white/30 text-center">
        {t("اسحب الدبوس أو اضغط على الخريطة ثم اضغط تثبيت الموقع", "Drag the pin or tap on the map, then press Confirm Location")}
      </p>

      <style>{`
        .delivery-pulse-ring {
          animation: pulse-ring 2s ease-out infinite;
        }
        @keyframes pulse-ring {
          0% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.5); }
          100% { opacity: 0; transform: scale(2); }
        }
        .delivery-pin-icon {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
