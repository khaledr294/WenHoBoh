/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Pharmacy, CustomerRequest, Reservation, Language } from '../types';
import { MapPin, Navigation, Map as MapIcon, Building2, AlertTriangle, Copy, Check } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

interface InteractiveMapProps {
  pharmacies: Pharmacy[];
  customerCoords: { lat: number; lng: number };
  onCustomerCoordsChange?: (coords: { lat: number; lng: number }) => void;
  activeRequest: CustomerRequest | null;
  activeReservation: Reservation | null;
  selectedPharmacyId: string | null;
  onSelectPharmacy?: (pharmacyId: string) => void;
  lang: Language;
}

// Center of Unaizah is roughly Lat: 26.085, Lng: 43.990
const MAP_CENTER = { lat: 26.085, lng: 43.990 };

// Fetch API Key from env configurations
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Global flag to track map authentication status
let globalMapAuthFailed = false;

if (typeof window !== 'undefined') {
  const originalAuthFailure = (window as any).gm_authFailure;
  (window as any).gm_authFailure = () => {
    console.warn("Google Maps Auth Failure (RefererNotAllowedMapError) caught at module level.");
    globalMapAuthFailed = true;
    window.dispatchEvent(new CustomEvent('google_maps_auth_failed'));
    if (originalAuthFailure) {
      try {
        originalAuthFailure();
      } catch (e) {
        // ignore
      }
    }
  };
}

/**
 * MapCircle: Geographically accurate circle for active requests
 */
function MapCircle({ center, radiusKm }: { center: { lat: number; lng: number }; radiusKm: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof window === 'undefined' || !(window as any).google || !(window as any).google.maps) return;

    try {
      const circle = new (window as any).google.maps.Circle({
        strokeColor: '#10b981',
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: '#10b981',
        fillOpacity: 0.12,
        map,
        center,
        radius: radiusKm * 1000, // convert km to meters
      });

      return () => {
        circle.setMap(null);
      };
    } catch (e) {
      console.error("Failed to render Google Maps Circle:", e);
    }
  }, [map, center.lat, center.lng, radiusKm]);

  return null;
}

/**
 * MapController: Re-centers map smoothly when location changes
 */
function MapController({ customerCoords }: { customerCoords: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      try {
        map.panTo(customerCoords);
      } catch (e) {
        console.error("Failed to pan map to customer coordinates:", e);
      }
    }
  }, [map, customerCoords.lat, customerCoords.lng]);
  return null;
}

/**
 * RouteDisplay: Uses Google Maps standard Directions Service to render real driving routes with safe try/catches
 */
function RouteDisplay({ 
  origin, 
  destination, 
  lang,
  onRouteComputed 
}: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  lang: Language;
  onRouteComputed: (info: { distanceText: string; durationText: string } | null) => void;
}) {
  const map = useMap();
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);

  useEffect(() => {
    if (!map || typeof window === 'undefined' || !(window as any).google || !(window as any).google.maps) return;

    try {
      const renderer = new (window as any).google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 6,
        }
      });
      setDirectionsRenderer(renderer);

      return () => {
        renderer.setMap(null);
      };
    } catch (e) {
      console.error("Failed to construct DirectionsRenderer:", e);
    }
  }, [map]);

  useEffect(() => {
    if (!directionsRenderer || typeof window === 'undefined' || !(window as any).google || !(window as any).google.maps || !origin || !destination) return;

    try {
      const directionsService = new (window as any).google.maps.DirectionsService();
      directionsService.route(
        {
          origin: new (window as any).google.maps.LatLng(origin.lat, origin.lng),
          destination: new (window as any).google.maps.LatLng(destination.lat, destination.lng),
          travelMode: (window as any).google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === 'OK' && result) {
            try {
              directionsRenderer.setDirections(result);
              const route = result.routes[0];
              if (route && route.legs[0]) {
                const leg = route.legs[0];
                onRouteComputed({
                  distanceText: leg.distance.text,
                  durationText: leg.duration.text,
                });
              }
            } catch (err) {
              console.error("Error setting directions in renderer:", err);
            }
          } else {
            console.warn("Directions request failed due to: " + status);
            onRouteComputed(null);
          }
        }
      );
    } catch (e) {
      console.error("Directions service failed:", e);
      onRouteComputed(null);
    }
  }, [directionsRenderer, origin.lat, origin.lng, destination.lat, destination.lng, lang, onRouteComputed]);

  return null;
}

export default function InteractiveMap({
  pharmacies,
  customerCoords,
  onCustomerCoordsChange,
  activeRequest,
  activeReservation,
  selectedPharmacyId,
  onSelectPharmacy,
  lang,
}: InteractiveMapProps) {
  
  const [mapAuthError, setMapAuthError] = useState(globalMapAuthFailed);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distanceText: string; durationText: string } | null>(null);

  // Synchronize state with module-level auth failure event
  useEffect(() => {
    const handleAuthFailed = () => {
      setMapAuthError(true);
    };

    window.addEventListener('google_maps_auth_failed', handleAuthFailed);
    return () => {
      window.removeEventListener('google_maps_auth_failed', handleAuthFailed);
    };
  }, []);

  const handleCopyOrigin = () => {
    const origin = window.location.origin + '/*';
    navigator.clipboard.writeText(origin);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const reservedPharmacy = activeReservation 
    ? pharmacies.find(p => p.id === activeReservation.pharmacyId)
    : null;

  // Render setup instructions or error screen directly to avoid mounting map elements that throw Script Errors
  const showGoogleMap = hasValidKey && !mapAuthError;

  if (!showGoogleMap) {
    return (
      <div className="w-full min-h-[380px] bg-slate-950 border border-red-900/30 rounded-3xl p-6 md:p-8 flex flex-col justify-between text-right font-sans relative overflow-hidden shadow-2xl">
        {/* Glow background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-5 z-10">
          <div className="flex items-center gap-3 border-b border-slate-900 pb-4">
            <div className="p-3 bg-red-950/70 border border-red-900/30 rounded-2xl text-red-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-right">
              <h3 className="text-sm font-black text-white">
                {lang === 'ar' ? 'تنبيه: قيود مفتاح خرائط جوجل (Google Maps)' : 'Google Maps API Key Action Required'}
              </h3>
              <p className="text-[10px] text-red-400 font-mono">
                {!hasValidKey ? 'Missing API Key' : 'RefererNotAllowedMapError'}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-3.5 leading-relaxed">
            {lang === 'ar' ? (
              <>
                <p>
                  يواجه التطبيق قيود روابط (HTTP Referer) لمفتاح الخرائط الحالي، أو أن المفتاح غير معرّف. لتفعيل التتبع الحي وحساب المسارات الواقعية، يرجى تهيئة المفتاح أو ترخيص رابط هذا الموقع في منصة جوجل السحابية:
                </p>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-400 block font-bold">الرابط المطلوب ترخيصه:</span>
                  <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <button 
                      onClick={handleCopyOrigin}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer text-[10px]"
                    >
                      {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span className="font-bold">{copiedUrl ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                    <span className="text-[11px] text-slate-200 font-mono select-all break-all text-left font-bold">
                      {window.location.origin}/*
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  💡 يمكنك ضبط المفتاح كـ سر (Secret) في إعدادات المنصة باسم: <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded font-mono">GOOGLE_MAPS_PLATFORM_KEY</code>
                </p>
              </>
            ) : (
              <>
                <p>
                  The current Google Maps API key is missing or has HTTP referrer restrictions. To load live map views and real driving routes, please authorize this dev environment URL in your Google Cloud Platform Console:
                </p>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-2 text-left">
                  <span className="text-[10px] text-slate-400 block font-bold">URL to authorize:</span>
                  <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-200 font-mono select-all break-all font-bold">
                      {window.location.origin}/*
                    </span>
                    <button 
                      onClick={handleCopyOrigin}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer text-[10px]"
                    >
                      {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span className="font-bold">{copiedUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 text-left">
                  💡 Set the key in Settings &rarr; Secrets under: <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded font-mono">GOOGLE_MAPS_PLATFORM_KEY</code>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-900 flex justify-between items-center z-10">
          <a
            href="https://console.cloud.google.com/google/maps-apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-emerald-400 font-bold hover:underline"
          >
            {lang === 'ar' ? 'منصة جوجل السحابية (GCP Console) 🌐' : 'GCP Console Credentials 🌐'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[380px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl font-sans">
      
      {/* Map Control HUD */}
      <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-center pointer-events-none">
        <div className="bg-slate-950/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80 flex items-center gap-2 shadow-md text-right">
          <MapIcon className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-xs font-bold text-slate-100 font-mono tracking-tight">
            {lang === 'ar' ? 'خرائط جوجل المباشرة - عنيزة' : 'Google Maps Live - Unaizah'}
          </span>
        </div>
      </div>

      {/* Floating Instructions HUD */}
      <div className="absolute top-14 left-3 bg-slate-950/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-300 z-10 max-w-[200px] pointer-events-none text-right">
        💡 {lang === 'ar' ? 'اسحب الدبوس الأحمر لتعديل موقعك وإعادة بث الطلب!' : 'Drag the red pin to shift your location and broadcast details!'}
      </div>

      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={MAP_CENTER}
          defaultZoom={13}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          disableDefaultUI={true}
          zoomControl={true}
        >
          {/* Smooth controller to center map */}
          <MapController customerCoords={customerCoords} />

          {/* Broadcast Area Radius Circle */}
          {activeRequest && (
            <MapCircle 
              center={customerCoords} 
              radiusKm={activeRequest.radiusKm} 
            />
          )}
          
          {/* Customer Location Draggable Pin */}
          <AdvancedMarker
            position={customerCoords}
            gmpDraggable={true}
            onDragEnd={(e) => {
              if (e.latLng && onCustomerCoordsChange) {
                onCustomerCoordsChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
              }
            }}
          >
            <div className="flex flex-col items-center select-none" style={{ transform: 'translate(0, -10px)' }}>
              <div className="bg-red-500 p-2 rounded-full border-2 border-white shadow-xl scale-110 cursor-move relative flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
              </div>
              <div className="bg-slate-950/95 text-[9px] font-bold text-white px-2 py-0.5 rounded-lg border border-slate-800 mt-1 whitespace-nowrap">
                {lang === 'ar' ? 'موقع المريض (اسحبني)' : 'Patient (Drag Me)'}
              </div>
            </div>
          </AdvancedMarker>

          {/* Pharmacy markers */}
          {pharmacies.map((pharmacy) => {
            const isSelected = selectedPharmacyId === pharmacy.id;
            const isReserved = activeReservation?.pharmacyId === pharmacy.id;

            let markerColor = 'bg-emerald-600 border-emerald-500';
            if (isReserved) {
              markerColor = 'bg-blue-600 border-blue-500 animate-bounce';
            } else if (isSelected) {
              markerColor = 'bg-amber-500 border-amber-400 scale-110';
            }

            return (
              <AdvancedMarker
                key={pharmacy.id}
                position={{ lat: pharmacy.latitude, lng: pharmacy.longitude }}
                onClick={() => onSelectPharmacy && onSelectPharmacy(pharmacy.id)}
              >
                <div className="flex flex-col items-center cursor-pointer select-none">
                  <div className={`p-1.5 rounded-xl border-2 ${markerColor} text-white shadow-lg transition-all`}>
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-slate-950/95 text-[9px] font-bold text-slate-100 px-2 py-0.5 rounded-lg border border-slate-800 mt-0.5 whitespace-nowrap">
                    {lang === 'ar' ? pharmacy.nameAr : pharmacy.nameEn}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Direction route calculator and polylines overlay */}
          {reservedPharmacy && (
            <RouteDisplay
              origin={customerCoords}
              destination={{ lat: reservedPharmacy.latitude, lng: reservedPharmacy.longitude }}
              lang={lang}
              onRouteComputed={setRouteInfo}
            />
          )}

        </Map>
      </APIProvider>

      {/* Real-time routing overlay details */}
      {activeReservation && routeInfo && (
        <div className="absolute bottom-4 left-3 right-3 bg-slate-950/95 backdrop-blur-md border border-blue-500/50 p-3 rounded-2xl shadow-2xl z-20 flex items-center justify-between text-right font-sans">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-950 rounded-lg flex items-center justify-center border border-blue-800/40">
              <Navigation className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[8px] text-slate-500 uppercase font-mono block leading-none mb-0.5">
                {lang === 'ar' ? 'الاتجاه والمسار الجغرافي الفعلي' : 'ACTUAL GEOGRAPHICAL ROUTING'}
              </span>
              <span className="text-[11px] font-bold text-white block">
                {lang === 'ar' 
                  ? `صيدلية: ${reservedPharmacy?.nameAr} • المسافة: ${routeInfo.distanceText} (${routeInfo.durationText})` 
                  : `Pharmacy: ${reservedPharmacy?.nameEn} • Distance: ${routeInfo.distanceText} (${routeInfo.durationText})`}
              </span>
            </div>
          </div>
          <a 
            href={`https://www.google.com/maps/dir/?api=1&origin=${customerCoords.lat},${customerCoords.lng}&destination=${reservedPharmacy?.latitude},${reservedPharmacy?.longitude}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px] px-2.5 py-1.5 rounded-xl transition cursor-pointer"
          >
            {lang === 'ar' ? 'افتح الاتجاهات' : 'Open Directions'}
          </a>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1 pointer-events-none text-right">
        <div className="bg-slate-950/95 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          <span className="text-[8px] text-slate-300">{lang === 'ar' ? 'موقعك (اسحب)' : 'You (Drag)'}</span>
        </div>
        <div className="bg-slate-950/95 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-[8px] text-slate-300">{lang === 'ar' ? 'صيدلية' : 'Pharmacy'}</span>
        </div>
        <div className="bg-slate-950/95 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span className="text-[8px] text-slate-300">{lang === 'ar' ? 'محجوز' : 'Reserved'}</span>
        </div>
      </div>

    </div>
  );
}
