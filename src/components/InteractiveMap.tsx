/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Pharmacy, CustomerRequest, Reservation, Language } from '../types';
import { Navigation, Map as MapIcon, Building2 } from 'lucide-react';

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
  
  const [leafletMap, setLeafletMap] = useState<any>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletCustomerMarkerRef = useRef<any>(null);
  const leafletPharmacyMarkersRef = useRef<any[]>([]);
  const leafletCircleRef = useRef<any>(null);
  const leafletRoutePolylineRef = useRef<any>(null);

  // Initialize Leaflet Map once on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent double initialization
    if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
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
  }, []);

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
          <div class="flex flex-col items-center animate-pulse" style="transform: translate(-15px, -30px); width: 30px; height: 30px;">
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
              <svg xmlns="http://www.w3.org/2005/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2Z"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2Z"/><path d="M10 6h4Z"/><path d="M10 10h4Z"/><path d="M10 14h4Z"/><path d="M10 18h4Z"/></svg>
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

  const getSimulatedRouting = () => {
    if (!reservedPharmacy) return null;
    const dLat = (customerCoords.lat - reservedPharmacy.latitude) * 111;
    const dLng = (customerCoords.lng - reservedPharmacy.longitude) * 100;
    const distanceKm = Math.sqrt(dLat * dLat + dLng * dLng);
    const durationMinutes = Math.max(3, Math.round((distanceKm / 40) * 60));
    return {
      distanceText: distanceKm.toFixed(1) + ' km',
      durationText: durationMinutes + ' ' + (lang === 'ar' ? 'دقائق' : 'mins'),
      distanceKm
    };
  };

  const simulatedRoute = getSimulatedRouting();

  return (
    <div className="relative w-full h-[400px] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl font-sans flex flex-col">
      
      {/* Map Control HUD Header */}
      <div className="bg-white border-b border-slate-200/80 p-3 flex flex-wrap justify-between items-center gap-2 z-20">
        
        {/* Title Badge */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="text-xs font-bold text-slate-900 font-mono tracking-tight flex items-center gap-1.5">
            <MapIcon className="w-3.5 h-3.5 text-emerald-450" />
            {lang === 'ar' ? 'خريطة عنيزة المباشرة الجغرافية' : 'Live Geographic Map (Unaizah)'}
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
        </div>

      </div>

      {/* Main Map Content Window */}
      <div className="flex-1 relative overflow-hidden">
        {/* Live Leaflet Map Container */}
        <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
      </div>

      {/* Real-time Routing HUD Footer Overlay */}
      {activeReservation && reservedPharmacy && simulatedRoute && (
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
                  ? `صيدلية: ${reservedPharmacy.nameAr} • المسافة: ${simulatedRoute.distanceText} (${simulatedRoute.durationText})`
                  : `Pharmacy: ${reservedPharmacy.nameEn} • Distance: ${simulatedRoute.distanceText} (${simulatedRoute.durationText})`}
              </span>
            </div>
          </div>
          <a 
            href={`https://www.google.com/maps/dir/?api=1&origin=${customerCoords.lat},${customerCoords.lng}&destination=${reservedPharmacy.latitude},${reservedPharmacy.longitude}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px] px-2.5 py-1.5 rounded-xl transition cursor-pointer"
          >
            {lang === 'ar' ? 'افتح الاتجاهات' : 'Open Directions'}
          </a>
        </div>
      )}

      {/* Quick Legend indicators */}
      <div className="absolute bottom-3 end-3 z-10 flex flex-col gap-0.5 pointer-events-none text-end" style={{ zIndex: 10 }}>
        <div className="bg-white/95 backdrop-blur-md px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          <span className="text-[8px] text-slate-700">{lang === 'ar' ? 'موقعك (اسحب الدبوس)' : 'You (Drag pin)'}</span>
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
