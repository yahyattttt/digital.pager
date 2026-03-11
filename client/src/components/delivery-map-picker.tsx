import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, MapPin, Check, Search, X, Navigation } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";
mapboxgl.accessToken = MAPBOX_TOKEN;

const DEFAULT_CENTER: [number, number] = [46.6753, 24.7136];
const DEFAULT_ZOOM = 16;
const REVERSE_GEOCODE_DEBOUNCE = 500;
const SEARCH_DEBOUNCE = 400;

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

interface SearchResult {
  id: string;
  place_name: string;
  place_name_ar?: string;
  center: [number, number];
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=ar&types=address,poi,neighborhood,locality,place&limit=1`
    );
    if (!res.ok) return "";
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const feat = data.features[0];
      const ctx = feat.context || [];
      const parts: string[] = [];
      if (feat.text_ar || feat.text) parts.push(feat.text_ar || feat.text);
      for (const c of ctx) {
        if (c.id?.startsWith("neighborhood") || c.id?.startsWith("locality")) {
          parts.push(c.text_ar || c.text);
        }
        if (c.id?.startsWith("place")) {
          parts.push(c.text_ar || c.text);
        }
      }
      return parts.length > 0 ? parts.join("، ") : feat.place_name || "";
    }
    return "";
  } catch {
    return "";
  }
}

async function searchPlaces(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=ar&country=sa&limit=5&types=address,poi,neighborhood,locality,place,district`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map((f: any) => ({
      id: f.id,
      place_name: f.place_name_ar || f.place_name,
      center: f.center,
    }));
  } catch {
    return [];
  }
}

export default function DeliveryMapPicker({ lat, lng, onLocationConfirmed, onLocationDirty, onGeoError, isRTL, t, confirmed: externalConfirmed }: DeliveryMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [pendingLat, setPendingLat] = useState<number | null>(lat);
  const [pendingLng, setPendingLng] = useState<number | null>(lng);
  const [geocodedAddress, setGeocodedAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(!!externalConfirmed);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mapError, setMapError] = useState(false);

  const hasPinSet = pendingLat !== null && pendingLng !== null;

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
  }, [onLocationDirty]);

  function handleConfirmLocation() {
    if (pendingLat === null || pendingLng === null) return;
    setIsConfirmed(true);
    onLocationConfirmed(pendingLat, pendingLng, geocodedAddress);
  }

  function handleSearchSelect(result: SearchResult) {
    const [sLng, sLat] = result.center;
    setPendingLat(sLat);
    setPendingLng(sLng);
    setIsConfirmed(false);
    onLocationDirty?.();

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [sLng, sLat], zoom: DEFAULT_ZOOM, duration: 1200 });
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([sLng, sLat]);
    }

    triggerReverseGeocode(sLat, sLng);
    setSearchQuery(result.place_name.split("،")[0] || result.place_name.split(",")[0]);
    setShowResults(false);
    setSearchResults([]);
  }

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim() || value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    setShowResults(true);
    searchTimerRef.current = setTimeout(async () => {
      const results = await searchPlaces(value.trim());
      setSearchResults(results);
      setSearching(false);
    }, SEARCH_DEBOUNCE);
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    if (searchInputRef.current) searchInputRef.current.focus();
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initLng = pendingLng ?? DEFAULT_CENTER[0];
    const initLat = pendingLat ?? DEFAULT_CENTER[1];

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [initLng, initLat],
        zoom: DEFAULT_ZOOM,
      });
    } catch {
      setMapError(true);
      return;
    }

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    const pinEl = document.createElement("div");
    pinEl.innerHTML = `<div style="position:relative;width:40px;height:52px;cursor:grab;">
      <svg viewBox="0 0 40 52" width="40" height="52" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5"/>
        <circle cx="20" cy="18" r="8" fill="white" opacity="0.9"/>
        <circle cx="20" cy="18" r="4" fill="#ef4444"/>
      </svg>
      <div class="mapbox-pin-pulse"></div>
    </div>`;

    const marker = new mapboxgl.Marker({
      element: pinEl,
      draggable: true,
      anchor: "bottom",
    })
      .setLngLat([initLng, initLat])
      .addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      handlePinMove(pos.lat, pos.lng);
    });

    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      handlePinMove(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    if (pendingLat !== null && pendingLng !== null) {
      triggerReverseGeocode(pendingLat, pendingLng);
    }

    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && markerRef.current && lat !== null && lng !== null) {
      markerRef.current.setLngLat([lng, lat]);
      mapRef.current.setCenter([lng, lat]);
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
          mapRef.current.flyTo({ center: [newLng, newLat], zoom: DEFAULT_ZOOM, duration: 1200 });
        }
        if (markerRef.current) {
          markerRef.current.setLngLat([newLng, newLat]);
        }

        triggerReverseGeocode(newLat, newLng);
        setSearchQuery("");
        setSearchResults([]);
        setShowResults(false);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        onGeoError?.("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (mapError) {
    return (
      <div className="space-y-2" data-testid="delivery-map-picker">
        <div className="w-full h-[280px] rounded-xl overflow-hidden border-2 border-emerald-500/30 bg-black/40 flex flex-col items-center justify-center gap-3 px-4" data-testid="map-container">
          <MapPin className="w-8 h-8 text-emerald-400/50" />
          <p className="text-white/50 text-xs text-center leading-relaxed">{t("لم يتم تحميل الخريطة. يرجى استخدام البحث أو تحديد الموقع الحالي", "Map could not load. Please use search or GPS location")}</p>
        </div>

        <div className="relative" data-testid="search-bar-container">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
              placeholder={t("ابحث عن حي، شارع، أو مكان...", "Search for area, street, or place...")}
              className="w-full h-9 ps-8 pe-8 text-xs bg-black/85 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              dir={isRTL ? "rtl" : "ltr"}
              autoComplete="off"
              data-testid="input-location-search"
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} className="absolute end-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors" data-testid="button-clear-search">
                <X className="w-3 h-3 text-white/50" />
              </button>
            )}
          </div>
          {showResults && (
            <div className="mt-1 bg-black/90 border border-white/10 rounded-lg overflow-hidden max-h-[160px] overflow-y-auto" data-testid="search-results-dropdown">
              {searching ? (
                <div className="flex items-center gap-2 px-3 py-2.5"><Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" /><span className="text-white/40 text-[11px]">{t("جاري البحث...", "Searching...")}</span></div>
              ) : searchResults.length === 0 ? (
                <div className="px-3 py-2.5"><span className="text-white/30 text-[11px]">{t("لا توجد نتائج", "No results found")}</span></div>
              ) : (
                searchResults.map((result, idx) => (
                  <button key={result.id || idx} type="button" onClick={() => handleSearchSelect(result)} className="w-full text-start px-3 py-2 hover:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-b-0" data-testid={`search-result-${idx}`}>
                    <div className="flex items-start gap-2"><MapPin className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /><p className="text-white/70 text-[11px] leading-snug line-clamp-2" dir="rtl">{result.place_name}</p></div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {hasPinSet && (
          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/[0.08]" data-testid="floating-address-label">
            {geocoding ? (
              <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 text-emerald-400 animate-spin shrink-0" /><span className="text-white/50 text-[11px]">{t("جاري تحديد العنوان...", "Fetching address...")}</span></div>
            ) : geocodedAddress ? (
              <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" /><p className="text-white/80 text-[11px] font-medium leading-snug" dir="rtl" data-testid="text-geocoded-address">{geocodedAddress}</p></div>
            ) : null}
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={handleGetLocation} disabled={geoLoading} className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all active:scale-[0.98] disabled:opacity-50" data-testid="button-get-location">
            {geoLoading ? <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" /> : <span className="text-base">🎯</span>}
            <span className="text-emerald-400 text-xs font-bold">{geoLoading ? t("جاري التحديد...", "Locating...") : t("حدد موقعي الحالي", "My Location")}</span>
          </button>
        </div>

        {hasPinSet && !isConfirmed && (
          <button type="button" onClick={handleConfirmLocation} disabled={geocoding} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-600/20" data-testid="button-confirm-location">
            <MapPin className="w-5 h-5 text-white" /><span className="text-white text-sm font-bold">{t("تثبيت الموقع 📍", "Confirm Location 📍")}</span>
          </button>
        )}

        {isConfirmed && pendingLat !== null && pendingLng !== null && (
          <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20" data-testid="text-location-confirmed">
            <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400 text-xs font-bold">{t("تم تثبيت الموقع بنجاح", "Location confirmed successfully")}</span></div>
            {geocodedAddress && <p className="text-emerald-300/70 text-[11px] leading-snug ps-5" dir="rtl" data-testid="text-confirmed-address">{geocodedAddress}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="delivery-map-picker">
      <div className="relative">
        <div className="absolute top-2 left-2 right-2 z-[5]" data-testid="search-bar-container">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
              placeholder={t("ابحث عن حي، شارع، أو مكان...", "Search for area, street, or place...")}
              className="w-full h-9 ps-8 pe-8 text-xs bg-black/85 backdrop-blur-sm border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              dir={isRTL ? "rtl" : "ltr"}
              autoComplete="off"
              data-testid="input-location-search"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute end-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                data-testid="button-clear-search"
              >
                <X className="w-3 h-3 text-white/50" />
              </button>
            )}
          </div>

          {showResults && (
            <div className="mt-1 bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden max-h-[160px] overflow-y-auto" data-testid="search-results-dropdown">
              {searching ? (
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span className="text-white/40 text-[11px]">{t("جاري البحث...", "Searching...")}</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-3 py-2.5">
                  <span className="text-white/30 text-[11px]">{t("لا توجد نتائج", "No results found")}</span>
                </div>
              ) : (
                searchResults.map((result, idx) => (
                  <button
                    key={result.id || idx}
                    type="button"
                    onClick={() => handleSearchSelect(result)}
                    className="w-full text-start px-3 py-2 hover:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-b-0"
                    data-testid={`search-result-${idx}`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-white/70 text-[11px] leading-snug line-clamp-2" dir="rtl">{result.place_name}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div
          ref={mapContainerRef}
          className="w-full h-[280px] rounded-xl overflow-hidden border-2 border-emerald-500/30"
          data-testid="map-container"
        />
      </div>

      {hasPinSet && (
        <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/[0.08]" data-testid="floating-address-label">
          {geocoding ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-emerald-400 animate-spin shrink-0" />
              <span className="text-white/50 text-[11px]">{t("جاري تحديد العنوان...", "Fetching address...")}</span>
            </div>
          ) : geocodedAddress ? (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <p className="text-white/80 text-[11px] font-medium leading-snug" dir="rtl" data-testid="text-geocoded-address">{geocodedAddress}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-white/30 shrink-0" />
              <span className="text-white/40 text-[11px]">{t("حرّك الدبوس لعرض العنوان", "Move pin to see address")}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={geoLoading}
          className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all active:scale-[0.98] disabled:opacity-50"
          data-testid="button-get-location"
        >
          {geoLoading ? (
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          ) : (
            <span className="text-base">🎯</span>
          )}
          <span className="text-emerald-400 text-xs font-bold">
            {geoLoading ? t("جاري التحديد...", "Locating...") : t("حدد موقعي الحالي", "My Location")}
          </span>
        </button>
      </div>

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
        {t("ابحث أو حدد موقعك ثم اسحب الدبوس للمكان الدقيق واضغط تثبيت", "Search or locate, drag pin to exact spot, then confirm")}
      </p>

      <style>{`
        .mapbox-pin-pulse {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.25);
          animation: mapbox-pulse-ring 2s ease-out infinite;
          pointer-events: none;
        }
        @keyframes mapbox-pulse-ring {
          0% { opacity: 0.6; transform: translateX(-50%) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) scale(2.5); }
        }
        .mapboxgl-ctrl-attrib {
          font-size: 9px !important;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
