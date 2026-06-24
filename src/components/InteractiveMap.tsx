/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Pharmacy, CustomerRequest, Reservation, Language } from '../types';
import { MapPin, Navigation, Map as MapIcon, Landmark, Building2, HelpCircle, RefreshCw } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

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
// Scale factor to convert Lat/Lng to SVG pixels for simulated map (width: 600, height: 400)
const SCALE_X = 6000; 
const SCALE_Y = 6000; 

// Fetch API Key from env configurations
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Inner component to calculate and display routes on the Google Map
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
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;
    
    // Reset previous route drawings
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    routesLib.Route.computeRoutes({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    }).then(({ routes }) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({
            strokeColor: '#3b82f6',
            strokeOpacity: 0.8,
            strokeWeight: 6,
          });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (routes[0].viewport) {
          map.fitBounds(routes[0].viewport);
        }

        const distanceKm = (routes[0].distanceMeters || 0) / 1000;
        const durationMin = Math.round((routes[0].durationMillis || 0) / 60000);

        const distanceText = lang === 'ar' 
          ? `${distanceKm.toFixed(1)} كم` 
          : `${distanceKm.toFixed(1)} km`;

        const durationText = lang === 'ar' 
          ? `${durationMin} دقيقة` 
          : `${durationMin} mins`;

        onRouteComputed({ distanceText, durationText });
      }
    }).catch(err => {
      console.error("Error computing driving route: ", err);
      onRouteComputed(null);
    });

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng, lang]);

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
  
  // Decide if we should fall back to the simulated map
  const [useSimulated, setUseSimulated] = useState(!hasValidKey);
  const [routeInfo, setRouteInfo] = useState<{ distanceText: string; durationText: string } | null>(null);

  // Coordinate converter to SVG viewbox coordinates (width 600, height 400) for simulation mode
  const getSimCoords = (lat: number, lng: number) => {
    const x = 300 + (lng - MAP_CENTER.lng) * SCALE_X;
    const y = 200 - (lat - MAP_CENTER.lat) * SCALE_Y;
    return { x, y };
  };

  const customerSimPos = getSimCoords(customerCoords.lat, customerCoords.lng);

  // Simulated roads
  const roads = [
    { nameAr: 'طريق الملك فهد', nameEn: 'King Fahd Rd', points: [{ lat: 26.110, lng: 43.990 }, { lat: 26.060, lng: 43.990 }] },
    { nameAr: 'طريق الملك عبدالعزيز', nameEn: 'King Abdulaziz Rd', points: [{ lat: 26.085, lng: 43.960 }, { lat: 26.085, lng: 44.020 }] },
    { nameAr: 'الطريق الدائري', nameEn: 'Ring Rd', points: [{ lat: 26.105, lng: 43.970 }, { lat: 26.085, lng: 43.965 }, { lat: 26.065, lng: 43.975 }] },
  ];

  const landmarks = [
    { nameAr: 'ساعة عنيزة', nameEn: 'Clock Tower', lat: 26.085, lng: 43.990 },
    { nameAr: 'عنيزة مول', nameEn: 'Unaizah Mall', lat: 26.091, lng: 43.980 },
    { nameAr: 'مستشفى الملك سعود', nameEn: 'King Saud Hospital', lat: 26.075, lng: 44.005 },
  ];

  // Active reservation pharmacy coordinate
  const reservedPharmacy = activeReservation 
    ? pharmacies.find(p => p.id === activeReservation.pharmacyId)
    : null;
  
  const reservedSimPos = reservedPharmacy ? getSimCoords(reservedPharmacy.latitude, reservedPharmacy.longitude) : null;

  // Render simulated SVG Map if Google Maps is disabled or not set up
  if (useSimulated) {
    return (
      <div className="relative w-full h-[380px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-inner font-sans">
        
        {/* Map Header Overlay */}
        <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-center pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 shadow">
            <MapIcon className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-slate-200">
              {lang === 'ar' ? 'محاكاة خريطة عنيزة التفاعلية' : 'Unaizah Simulated Map'}
            </span>
          </div>
          
          <div className="flex gap-2 pointer-events-auto">
            {hasValidKey && (
              <button
                onClick={() => setUseSimulated(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg border border-emerald-500 shadow cursor-pointer transition"
              >
                {lang === 'ar' ? 'تفعيل خرائط جوجل 🌐' : 'Switch to Google Maps 🌐'}
              </button>
            )}
            
            {activeRequest && (
              <div className="bg-emerald-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-800/50 flex items-center gap-2 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] md:text-xs font-semibold text-emerald-300 font-mono">
                  {lang === 'ar' ? `بث: ${activeRequest.radiusKm}كم` : `Radius: ${activeRequest.radiusKm}km`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Google Maps setup instruction badge if key is missing */}
        {!hasValidKey && (
          <div className="absolute top-16 left-3 right-3 z-10 bg-slate-950/95 border border-amber-500/30 p-3 rounded-xl shadow-lg flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-[10px] leading-relaxed text-slate-300">
              <p className="font-bold text-amber-400">
                {lang === 'ar' ? 'خرائط جوجل الحقيقية والاتجاهات متاحة' : 'Real Google Maps & Directions Available'}
              </p>
              <p className="mt-0.5">
                {lang === 'ar' 
                  ? 'لمطابقة المسارات والاتجاهات الواقعية بدقة، قم بتسجيل مفتاح المنصة في الإعدادات.' 
                  : 'Add your GOOGLE_MAPS_PLATFORM_KEY in Secrets (⚙️ Settings) to enable real route computation.'}
              </p>
            </div>
          </div>
        )}

        {/* SVG Map Canvas */}
        <svg className="w-full h-full select-none" viewBox="0 0 600 400">
          <defs>
            <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.2" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Roads */}
          {roads.map((road, idx) => {
            let pathD = '';
            road.points.forEach((pt, pIdx) => {
              const svgPt = getSimCoords(pt.lat, pt.lng);
              if (pIdx === 0) pathD += `M ${svgPt.x} ${svgPt.y}`;
              else pathD += ` L ${svgPt.x} ${svgPt.y}`;
            });

            return (
              <g key={idx}>
                <path
                  d={pathD}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.6"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />
              </g>
            );
          })}

          {/* Landmarks */}
          {landmarks.map((lm, idx) => {
            const pos = getSimCoords(lm.lat, lm.lng);
            return (
              <g key={idx} className="opacity-40">
                <circle cx={pos.x} cy={pos.y} r="4" fill="#64748b" />
                <text
                  x={pos.x}
                  y={pos.y - 8}
                  textAnchor="middle"
                  fill="#94a3b8"
                  className="text-[9px] font-medium animate-pulse"
                >
                  {lang === 'ar' ? lm.nameAr : lm.nameEn}
                </text>
              </g>
            );
          })}

          {/* Radar circle */}
          {activeRequest && (
            <g>
              <circle
                cx={customerSimPos.x}
                cy={customerSimPos.y}
                r={activeRequest.radiusKm * 18}
                fill="url(#radarGrad)"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeOpacity="0.4"
                strokeDasharray="4,4"
              />
              <circle
                cx={customerSimPos.x}
                cy={customerSimPos.y}
                r={activeRequest.radiusKm * 18}
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeOpacity="0.6"
                className="animate-ping"
                style={{ transformOrigin: `${customerSimPos.x}px ${customerSimPos.y}px`, animationDuration: '3s' }}
              />
            </g>
          )}

          {/* Simulated direction lines */}
          {reservedSimPos && (
            <g>
              <path
                d={`M ${customerSimPos.x} ${customerSimPos.y} Q ${(customerSimPos.x + reservedSimPos.x) / 2} ${(customerSimPos.y + reservedSimPos.y) / 2 - 30}, ${reservedSimPos.x} ${reservedSimPos.y}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="8,6"
              />
            </g>
          )}

          {/* Pharmacy markers */}
          {pharmacies.map((pharmacy) => {
            const pos = getSimCoords(pharmacy.latitude, pharmacy.longitude);
            const isSelected = selectedPharmacyId === pharmacy.id;
            const isReserved = activeReservation?.pharmacyId === pharmacy.id;

            let pinColor = '#475569';
            let ringColor = 'rgba(71, 85, 105, 0.2)';
            if (pharmacy.status === 'active') {
              pinColor = '#10b981';
              ringColor = 'rgba(16, 185, 129, 0.3)';
            }
            if (isReserved) {
              pinColor = '#3b82f6';
              ringColor = 'rgba(59, 130, 246, 0.4)';
            } else if (isSelected) {
              pinColor = '#f59e0b';
              ringColor = 'rgba(245, 158, 11, 0.5)';
            }

            return (
              <g
                key={pharmacy.id}
                className="cursor-pointer transition-transform duration-200 hover:scale-125 hover:z-30"
                onClick={() => onSelectPharmacy && onSelectPharmacy(pharmacy.id)}
              >
                <circle cx={pos.x} cy={pos.y} r="16" fill={ringColor} />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="7"
                  fill={pinColor}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  filter={isSelected || isReserved ? 'url(#glow)' : undefined}
                />
                <circle cx={pos.x} cy={pos.y} r="2.5" fill="#ffffff" />
                
                <g className="opacity-0 hover:opacity-100 transition-opacity duration-150">
                  <rect
                    x={pos.x - 60}
                    y={pos.y - 32}
                    width="120"
                    height="18"
                    rx="4"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x={pos.x}
                    y={pos.y - 20}
                    textAnchor="middle"
                    fill="#f1f5f9"
                    className="text-[9px] font-semibold"
                  >
                    {lang === 'ar' ? pharmacy.nameAr : pharmacy.nameEn}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Customer Location */}
          <g>
            <circle cx={customerSimPos.x} cy={customerSimPos.y} r="24" fill="rgba(239, 68, 68, 0.05)" />
            <circle cx={customerSimPos.x} cy={customerSimPos.y} r="14" fill="rgba(239, 68, 68, 0.15)" />
            <circle cx={customerSimPos.x} cy={customerSimPos.y} r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx={customerSimPos.x} cy={customerSimPos.y} r="2" fill="#ffffff" />
          </g>
        </svg>

        {/* Direction details panel on simulation map */}
        {activeReservation && (
          <div className="absolute bottom-16 left-3 right-3 bg-slate-950/95 border border-blue-500/40 p-4 rounded-xl shadow-lg z-20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-blue-400 animate-bounce" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono block">SIMULATED ROUTE</span>
                <span className="text-xs font-bold text-slate-200">
                  {lang === 'ar' ? 'المسافة: ٢.٨ كم • الزمن المقدر: ٦ د' : 'Distance: 2.8 km • Drive: 6 mins'}
                </span>
              </div>
            </div>
            <a 
              href={`https://www.google.com/maps/dir/?api=1&origin=${customerCoords.lat},${customerCoords.lng}&destination=${reservedPharmacy?.latitude},${reservedPharmacy?.longitude}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition"
            >
              {lang === 'ar' ? 'افتح خرائط جوجل 🧭' : 'Google Maps 🧭'}
            </a>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex gap-2 justify-center flex-wrap pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            <span className="text-[9px] text-slate-400">
              {lang === 'ar' ? 'موقعك' : 'You'}
            </span>
          </div>
          <div className="bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[9px] text-slate-400">
              {lang === 'ar' ? 'صيدلية' : 'Pharmacy'}
            </span>
          </div>
          <div className="bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span className="text-[9px] text-slate-400">
              {lang === 'ar' ? 'محجوز' : 'Reserved'}
            </span>
          </div>
        </div>

      </div>
    );
  }

  // Otherwise, render REAL Google Maps
  return (
    <div className="relative w-full h-[380px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl font-sans">
      
      {/* Map Control HUD */}
      <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-center pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 shadow-md">
          <MapIcon className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="text-xs font-semibold text-slate-100 font-mono tracking-tight">
            {lang === 'ar' ? 'خرائط جوجل الحية عنيزة' : 'Google Maps Live: Unaizah'}
          </span>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setUseSimulated(true)}
            className="bg-slate-950/95 hover:bg-slate-900 text-slate-300 font-bold text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-800 shadow cursor-pointer transition"
          >
            {lang === 'ar' ? 'عرض الخريطة البديلة 🗺️' : 'View Simulated Map 🗺️'}
          </button>
        </div>
      </div>

      {/* Floating Instructions HUD */}
      <div className="absolute top-14 left-3 bg-slate-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[9px] text-slate-400 z-10 max-w-[180px] pointer-events-none">
        💡 {lang === 'ar' ? 'اسحب النقطة الحمراء لتغيير موقعك وإعادة حساب المسارات!' : 'Drag the red marker to shift your location and recalculate driving distance!'}
      </div>

      {/* API Provider Context */}
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
              <div className="bg-slate-950/90 text-[8px] font-bold text-white px-1.5 py-0.5 rounded border border-slate-800 mt-1 whitespace-nowrap">
                {lang === 'ar' ? 'اسحبني لتعديل موقعك' : 'DRAG ME'}
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
                  <div className="bg-slate-950/90 text-[8px] font-bold text-slate-100 px-1.5 py-0.5 rounded border border-slate-800 mt-0.5 whitespace-nowrap">
                    {lang === 'ar' ? pharmacy.nameAr : pharmacy.nameEn}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Direction route calculator */}
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

      {/* Real-time direction card overlay */}
      {activeReservation && routeInfo && (
        <div className="absolute bottom-4 left-3 right-3 bg-slate-950/95 backdrop-blur-md border border-blue-500/50 p-3.5 rounded-xl shadow-2xl z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-950 rounded-lg flex items-center justify-center border border-blue-800/40">
              <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase font-mono block">
                {lang === 'ar' ? 'الاتجاه والمسار الجغرافي الفعلي' : 'ACTUAL GEOGRAPHICAL ROUTING'}
              </span>
              <span className="text-xs font-bold text-white block">
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px] px-2.5 py-1.5 rounded-lg transition"
          >
            {lang === 'ar' ? 'افتح الخرائط' : 'Open Directions'}
          </a>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          <span className="text-[8px] text-slate-300">{lang === 'ar' ? 'موقعك (اسحب)' : 'You (Drag)'}</span>
        </div>
        <div className="bg-slate-950/90 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-[8px] text-slate-300">{lang === 'ar' ? 'صيدلية' : 'Pharmacy'}</span>
        </div>
        <div className="bg-slate-950/90 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span className="text-[8px] text-slate-300">{lang === 'ar' ? 'محجوز' : 'Reserved'}</span>
        </div>
      </div>

    </div>
  );
}
