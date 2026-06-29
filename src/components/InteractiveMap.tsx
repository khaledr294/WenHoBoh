/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Pharmacy, CustomerRequest, Reservation, Language } from '../types';
import { MapPin, Navigation, Map as MapIcon, Building2 } from 'lucide-react';

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

// Map Boundary coordinates for realistic 2D vector coordinates projection
const MIN_LAT = 26.065;
const MAX_LAT = 26.105;
const MIN_LNG = 43.965;
const MAX_LNG = 44.015;

/**
 * Helper to map (lat, lng) coordinates to percentage on a 100x100 SVG container
 */
const mapCoordsToPercent = (lat: number, lng: number) => {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 100;
  const y = (1 - (lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 100;
  return { 
    x: Math.max(2, Math.min(98, x)), 
    y: Math.max(2, Math.min(98, y)) 
  };
};

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
  
  // Choose default mode. We default to Vector Map to guarantee a pristine, zero-error load experience.
  const [useLiveMap, setUseLiveMap] = useState<boolean>(false);
  const [leafletMap, setLeafletMap] = useState<any>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletCustomerMarkerRef = useRef<any>(null);
  const leafletPharmacyMarkersRef = useRef<any[]>([]);
  const leafletCircleRef = useRef<any>(null);
  const leafletRoutePolylineRef = useRef<any>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!useLiveMap || !mapContainerRef.current) {
      if (leafletMap) {
        leafletMap.remove();
        setLeafletMap(null);
      }
      return;
    }

    const L = (window as any).L;
    if (!L) {
      console.error("Leaflet global L is not loaded. Make sure the CDN links are in index.html");
      return;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView([customerCoords.lat, customerCoords.lng], 13);

    // CartoDB Voyager tiles (completely free and premium looking)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    setLeafletMap(map);

    return () => {
      map.remove();
      setLeafletMap(null);
    };
  }, [useLiveMap]);

  // Synchronize Leaflet map state with props
  useEffect(() => {
    if (!leafletMap) return;

    const L = (window as any).L;
    if (!L) return;

    // 1. Manage Customer Marker
    if (!leafletCustomerMarkerRef.current) {
      const customerIcon = L.divIcon({
        className: 'custom-customer-leaflet-icon',
        html: `
          <div class="flex flex-col items-center" style="transform: translate(-15px, -30px); width: 30px; height: 30px;">
            <div class="bg-red-500 p-2 rounded-full border border-white shadow-xl scale-110 relative flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      const customerMarker = L.marker([customerCoords.lat, customerCoords.lng], {
        icon: customerIcon,
        draggable: true
      }).addTo(leafletMap);

      customerMarker.on('dragend', () => {
        const position = customerMarker.getLatLng();
        if (onCustomerCoordsChange) {
          onCustomerCoordsChange({ lat: position.lat, lng: position.lng });
        }
      });

      leafletCustomerMarkerRef.current = customerMarker;
    } else {
      const currentLatLng = leafletCustomerMarkerRef.current.getLatLng();
      if (currentLatLng.lat !== customerCoords.lat || currentLatLng.lng !== customerCoords.lng) {
        leafletCustomerMarkerRef.current.setLatLng([customerCoords.lat, customerCoords.lng]);
        leafletMap.panTo([customerCoords.lat, customerCoords.lng]);
      }
    }

    // 2. Manage Broadcast Area Circle
    if (leafletCircleRef.current) {
      leafletMap.removeLayer(leafletCircleRef.current);
      leafletCircleRef.current = null;
    }
    if (activeRequest && activeRequest.status === 'active') {
      const circle = L.circle([customerCoords.lat, customerCoords.lng], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '5, 5',
        radius: activeRequest.radiusKm * 1000 // Convert km to meters
      }).addTo(leafletMap);
      leafletCircleRef.current = circle;
    }

    // 3. Manage Pharmacy Markers
    leafletPharmacyMarkersRef.current.forEach(m => leafletMap.removeLayer(m));
    leafletPharmacyMarkersRef.current = [];

    pharmacies.forEach(pharmacy => {
      const isSelected = selectedPharmacyId === pharmacy.id;
      const isReserved = activeReservation?.pharmacyId === pharmacy.id;

      let markerColor = 'bg-emerald-600 border-emerald-500 text-white';
      if (isReserved) {
        markerColor = 'bg-blue-600 border-blue-500 text-white animate-bounce';
      } else if (isSelected) {
        markerColor = 'bg-amber-500 border-amber-400 text-white scale-110';
      }

      const pharmacyIcon = L.divIcon({
        className: 'custom-pharmacy-leaflet-icon',
        html: `
          <div class="flex flex-col items-center cursor-pointer select-none" style="transform: translate(-15px, -15px)">
            <div class="p-1.5 rounded-xl border-2 ${markerColor} shadow-lg transition-all flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2005/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2Z"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2Z"/><path d="M10 6h4Z"/><path d="M10 10h4Z"/><path d="M10 14h4Z"/><path d="M10 18h4Z"/></svg>
            </div>
            <div class="bg-white/95 text-[9px] font-bold text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5 whitespace-nowrap shadow">
              ${lang === 'ar' ? pharmacy.nameAr : pharmacy.nameEn}
            </div>
          </div>
        `,
        iconSize: [30, 30]
      });

      const marker = L.marker([pharmacy.latitude, pharmacy.longitude], {
        icon: pharmacyIcon
      }).addTo(leafletMap);

      marker.on('click', () => {
        if (onSelectPharmacy) onSelectPharmacy(pharmacy.id);
      });

      leafletPharmacyMarkersRef.current.push(marker);
    });

    // 4. Manage Routing Polyline
    if (leafletRoutePolylineRef.current) {
      leafletMap.removeLayer(leafletRoutePolylineRef.current);
      leafletRoutePolylineRef.current = null;
    }

    const reservedPharmacy = activeReservation
      ? pharmacies.find(p => p.id === activeReservation.pharmacyId)
      : null;

    if (reservedPharmacy) {
      const latlngs = [
        [customerCoords.lat, customerCoords.lng],
        [reservedPharmacy.latitude, reservedPharmacy.longitude]
      ];
      const polyline = L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 6'
      }).addTo(leafletMap);
      
      leafletRoutePolylineRef.current = polyline;
      leafletMap.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }

  }, [leafletMap, customerCoords, pharmacies, activeRequest, activeReservation, selectedPharmacyId, lang]);

  // Clean up refs on unmount
  useEffect(() => {
    return () => {
      if (leafletCustomerMarkerRef.current) leafletCustomerMarkerRef.current = null;
      if (leafletCircleRef.current) leafletCircleRef.current = null;
      if (leafletRoutePolylineRef.current) leafletRoutePolylineRef.current = null;
      leafletPharmacyMarkersRef.current = [];
    };
  }, []);

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert(lang === 'ar' ? 'المتصفح لا يدعم تحديد الموقع الجغرافي' : 'Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        if (onCustomerCoordsChange) {
          onCustomerCoordsChange(coords);
        }
        
        // Pan Leaflet map to new coords if available
        if (leafletMap) {
          leafletMap.setView([coords.lat, coords.lng], 14);
        }

        // Clamp check for Simulated Vector Map fallback warning
        const isOutside = coords.lat < MIN_LAT || coords.lat > MAX_LAT || coords.lng < MIN_LNG || coords.lng > MAX_LNG;
        if (isOutside && !useLiveMap) {
          alert(
            lang === 'ar'
              ? '📍 تم جلب موقعك الجغرافي بنجاح! بما أن موقعك الحالي يقع خارج نطاق عنيزة، سيتم تقريبه وتثبيته على الخريطة التفاعلية الرقمية لتجربة محاكاة النظام.'
              : '📍 Location fetched successfully! Since you are outside Unaizah, your coordinates are clamped for simulation on the Digital Map.'
          );
        }
      },
      (error) => {
        console.error("Manual geolocation retrieval failed:", error);
        alert(
          lang === 'ar'
            ? '❌ فشل سحب الموقع الجغرافي. يرجى تفعيل صلاحيات تحديد الموقع في المتصفح.'
            : '❌ Failed to fetch your location. Please enable location services in your browser.'
        );
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const reservedPharmacy = activeReservation 
    ? pharmacies.find(p => p.id === activeReservation.pharmacyId)
    : null;

  // Calculate realistic distance/duration for the local Vector Map mode
  const getSimulatedRouting = () => {
    if (!reservedPharmacy) return null;
    
    // Roughly 1 degree of latitude in Unaizah ~ 111 km, longitude ~ 100 km
    const dLat = (customerCoords.lat - reservedPharmacy.latitude) * 111;
    const dLng = (customerCoords.lng - reservedPharmacy.longitude) * 100;
    const distanceKm = Math.sqrt(dLat * dLat + dLng * dLng);
    
    // Average urban speed ~ 40 km/h
    const durationMinutes = Math.max(3, Math.round((distanceKm / 40) * 60));
    
    return {
      distanceText: distanceKm.toFixed(1) + ' km',
      durationText: durationMinutes + ' ' + (lang === 'ar' ? 'دقائق' : 'mins'),
      distanceKm
    };
  };

  const simulatedRoute = getSimulatedRouting();

  // Handle manual dragging on the vector map
  const handleVectorMapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onCustomerCoordsChange) return;
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    const updatePosition = (clientX: number, clientY: number) => {
      const relativeX = clientX - rect.left;
      const relativeY = clientY - rect.top;
      
      const percentX = (relativeX / rect.width) * 100;
      const percentY = (relativeY / rect.height) * 100;
      
      const lng = MIN_LNG + (percentX / 100) * (MAX_LNG - MIN_LNG);
      const lat = MIN_LAT + (1 - percentY / 100) * (MAX_LAT - MIN_LAT);
      
      onCustomerCoordsChange({
        lat: Math.max(MIN_LAT, Math.min(MAX_LAT, lat)),
        lng: Math.max(MIN_LNG, Math.min(MAX_LNG, lng))
      });
    };

    updatePosition(e.clientX, e.clientY);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Convert current state into coordinates mapping
  const pPatient = mapCoordsToPercent(customerCoords.lat, customerCoords.lng);

  return (
    <div className="relative w-full h-[400px] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl font-sans flex flex-col">
      
      {/* Map Control HUD Header */}
      <div className="bg-white border-b border-slate-200/80 p-3 flex flex-wrap justify-between items-center gap-2 z-20">
        
        {/* Title Badge */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="text-xs font-bold text-slate-900 font-mono tracking-tight flex items-center gap-1.5">
            <MapIcon className="w-3.5 h-3.5 text-emerald-455" />
            {useLiveMap 
              ? (lang === 'ar' ? 'الخريطة المباشرة الجغرافية' : 'Live Geographic Map')
              : (lang === 'ar' ? 'خريطة عنيزة التفاعلية' : 'Interactive Map (Unaizah)')
            }
          </span>
        </div>

        {/* Seamless Selector & Status Indicator */}
        <div className="flex items-center gap-2">
          {/* Locate Me Button */}
          <button
            onClick={handleLocateUser}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 active:scale-95 transition text-[10px] font-bold px-2.5 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"
            title={lang === 'ar' ? 'تحديد الموقع تلقائياً من نظام العميل' : 'Fetch location from device'}
          >
            <Navigation className="w-3 h-3 text-emerald-600" />
            <span>{lang === 'ar' ? 'تحديد موقعي' : 'تحديد موقعي'}</span>
          </button>

          {/* Toggle Button */}
          <button
            onClick={() => setUseLiveMap(!useLiveMap)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 active:scale-95 transition text-[10px] font-bold text-slate-700 px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"
          >
            {useLiveMap 
              ? (lang === 'ar' ? '🗺️ الخريطة الرقمية' : '🗺️ Switch to Vector Map')
              : (lang === 'ar' ? '🌐 الخريطة الحية' : '🌐 Switch to Live Map')
            }
          </button>
        </div>

      </div>

      {/* Main Map Content Window */}
      <div className="flex-1 relative overflow-hidden">
        
        {useLiveMap ? (
          /* Live Leaflet Map Container */
          <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
        ) : (
          /* High-Fidelity local Simulated Vector Map of Unaizah */
          <div 
            className="w-full h-full relative cursor-crosshair select-none bg-white/95 flex flex-col justify-between"
            onPointerDown={handleVectorMapPointerDown}
          >
            
            {/* Visual Grid Backdrop */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none"></div>

            {/* Custom stylized SVG city grid (Roads of Unaizah) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
              
              {/* King Fahd Road (Vertical-ish corridor) */}
              <path d="M M50,0 Q53,30 56,55 T60,100" fill="none" stroke="#334155" strokeWidth="8" />
              <path d="M M50,0 Q53,30 56,55 T60,100" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="5,5" />
              
              {/* King Abdulaziz Road (Diagonal crossing) */}
              <path d="M M15,0 Q30,40 28,60 T10,100" fill="none" stroke="#334155" strokeWidth="8" />
              
              {/* Zamil Al-Saleem St (Horizontal corridor) */}
              <path d="M M0,55 Q50,58 100,53" fill="none" stroke="#334155" strokeWidth="6" />

              {/* King Saud Road (Bottom diagonal) */}
              <path d="M M0,85 Q45,80 100,75" fill="none" stroke="#334155" strokeWidth="6" />

              {/* Al Thalatheen St (Top Horizontal corridor) */}
              <path d="M M0,20 Q50,18 100,23" fill="none" stroke="#334155" strokeWidth="6" />

            </svg>

            {/* Simulated Street Names & Area Indicators */}
            <div className="absolute top-4 right-12 text-[8px] font-bold text-slate-700 pointer-events-none font-mono">
              AL ASHRAFYAH AREA / حي الأشرفية
            </div>
            <div className="absolute top-24 left-10 text-[8px] font-bold text-slate-700 pointer-events-none font-mono">
              AL RAYYAN DISTRICT / حي الريان
            </div>
            <div className="absolute bottom-20 left-12 text-[8px] font-bold text-slate-700 pointer-events-none font-mono">
              AL SAFA DISTRICT / حي الصفاء
            </div>
            <div className="absolute bottom-12 right-12 text-[8px] font-bold text-slate-700 pointer-events-none font-mono">
              AL MATAR DISTRICT / حي المطار
            </div>

            {/* SVG Overlays for Active Radial Radii & Routes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              
              {/* Broadcast Area Radius Circle overlay */}
              {activeRequest && activeRequest.status === 'active' && (
                <circle 
                  cx={`${pPatient.x}%`} 
                  cy={`${pPatient.y}%`} 
                  r={`${Math.min(80, activeRequest.radiusKm * 15)}`} 
                  fill="#10b981" 
                  fillOpacity="0.08" 
                  stroke="#10b981" 
                  strokeOpacity="0.4" 
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
              )}

              {/* Active Route display line */}
              {reservedPharmacy && (
                <>
                  {(() => {
                    const pPharm = mapCoordsToPercent(reservedPharmacy.latitude, reservedPharmacy.longitude);
                    return (
                      <>
                        {/* Shadow backing */}
                        <path 
                          d={`M ${pPatient.x},${pPatient.y} Q ${(pPatient.x + pPharm.x)/2 - 5},${(pPatient.y + pPharm.y)/2 - 5} ${pPharm.x},${pPharm.y}`}
                          fill="none" 
                          stroke="#1e3a8a" 
                          strokeWidth="6" 
                          strokeOpacity="0.4"
                        />
                        {/* Live route path */}
                        <path 
                          d={`M ${pPatient.x},${pPatient.y} Q ${(pPatient.x + pPharm.x)/2 - 5},${(pPatient.y + pPharm.y)/2 - 5} ${pPharm.x},${pPharm.y}`}
                          fill="none" 
                          stroke="#3b82f6" 
                          strokeWidth="3.5" 
                          strokeLinecap="round"
                          strokeDasharray="6,4"
                          style={{
                            animation: 'dash 0.8s linear infinite'
                          }}
                        />
                      </>
                    );
                  })()}
                </>
              )}

            </svg>

            {/* Draggable Patient Marker */}
            <div 
              className="absolute pointer-events-none flex flex-col items-center"
              style={{ 
                left: `${pPatient.x}%`, 
                top: `${pPatient.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 30
              }}
            >
              <div className="bg-red-500 p-2 rounded-full border border-white shadow-xl scale-110 relative flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                <MapPin className="w-4 h-4 text-slate-900" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
              </div>
              <div className="bg-white/95 text-[9px] font-bold text-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 mt-1 whitespace-nowrap">
                {lang === 'ar' ? 'موقعك (انقر لنقله)' : 'You (Click map)'}
              </div>
            </div>

            {/* Pharmacies Markers */}
            {pharmacies.map((pharmacy) => {
              const pPharm = mapCoordsToPercent(pharmacy.latitude, pharmacy.longitude);
              const isSelected = selectedPharmacyId === pharmacy.id;
              const isReserved = activeReservation?.pharmacyId === pharmacy.id;

              let markerColor = 'bg-emerald-600 border-emerald-500';
              if (isReserved) {
                markerColor = 'bg-blue-600 border-blue-500 animate-bounce';
              } else if (isSelected) {
                markerColor = 'bg-amber-500 border-amber-400 scale-110';
              }

              return (
                <div
                  key={pharmacy.id}
                  className="absolute cursor-pointer flex flex-col items-center"
                  style={{
                    left: `${pPharm.x}%`,
                    top: `${pPharm.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isReserved ? 35 : 25
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation(); // Prevent map dragging when clicking pharmacy pins
                    if (onSelectPharmacy) onSelectPharmacy(pharmacy.id);
                  }}
                >
                  <div className={`p-1.5 rounded-xl border-2 ${markerColor} text-slate-900 shadow-lg transition-all hover:scale-115`}>
                    <Building2 className="w-3 h-3" />
                  </div>
                  <div className="bg-white/95 text-[9px] font-bold text-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 mt-0.5 whitespace-nowrap shadow">
                    {lang === 'ar' ? pharmacy.nameAr : pharmacy.nameEn}
                  </div>
                </div>
              );
            })}

            {/* Drag instruction overlay footer inside Map */}
            <div className="absolute top-2 start-2 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-xl text-[9px] text-slate-700 font-semibold pointer-events-none">
              💡 {lang === 'ar' ? 'انقر على أي مكان بالخريطة لنقل موقعك الجغرافي وبث الطلب!' : 'Click or drag anywhere on map to update your broadcast coordinates!'}
            </div>

          </div>
        )}

      </div>

      {/* Real-time Routing HUD Footer Overlay */}
      {activeReservation && (
        <div className="absolute bottom-3 start-3 end-3 bg-white/95 backdrop-blur-md border border-blue-500/50 p-2.5 rounded-2xl shadow-2xl z-20 flex items-center justify-between text-end font-sans">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-950 rounded-lg flex items-center justify-center border border-blue-800/40">
              <Navigation className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[8px] text-slate-500 uppercase font-mono block leading-none mb-0.5">
                {lang === 'ar' ? 'الاتجاه والمسار الجغرافي الفعلي' : 'ACTUAL GEOGRAPHICAL ROUTING'}
              </span>
              <span className="text-[10px] md:text-[11px] font-bold text-slate-900 block">
                {lang === 'ar'
                  ? `صيدلية: ${reservedPharmacy?.nameAr} • المسافة: ${simulatedRoute?.distanceText} (${simulatedRoute?.durationText})`
                  : `Pharmacy: ${reservedPharmacy?.nameEn} • Distance: ${simulatedRoute?.distanceText} (${simulatedRoute?.durationText})`}
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

      {/* Quick Legend indicators */}
      <div className="absolute bottom-3 end-3 z-10 flex flex-col gap-0.5 pointer-events-none text-end">
        <div className="bg-white/95 backdrop-blur-md px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          <span className="text-[8px] text-slate-700">{lang === 'ar' ? 'موقعك (انقر لنقله)' : 'You (Click to move)'}</span>
        </div>
        <div className="bg-white/95 backdrop-blur-md px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-[8px] text-slate-700">{lang === 'ar' ? 'صيدلية' : 'Pharmacy'}</span>
        </div>
        <div className="bg-white/95 backdrop-blur-md px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span className="text-[8px] text-slate-700">{lang === 'ar' ? 'محجوز' : 'Reserved'}</span>
        </div>
      </div>

    </div>
  );
}
