/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import AuthPage from './components/AuthPage';
import Gateway from './components/Gateway';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { 
  Role, 
  Language, 
  Pharmacy, 
  CustomerRequest, 
  PharmacyResponse, 
  Reservation, 
  UserProfile, 
  SystemEvent 
} from './types';
import InteractiveMap from './components/InteractiveMap';
import CustomerPortal from './components/CustomerPortal';
import PharmacyPortal from './components/PharmacyPortal';
import AdminPortal from './components/AdminPortal';
import { 
  Heart, 
  LayoutGrid, 
  Activity, 
  Globe, 
  Users, 
  Coins, 
  Info, 
  MapPin, 
  ArrowRightLeft, 
  HeartHandshake,
  Bot,
  Building2,
  LogOut,
  Lock,
  ShieldAlert
} from 'lucide-react';
import {
  listenToPharmacies,
  listenToActiveRequest,
  listenToResponses,
  listenToActiveReservation,
  listenToSystemEvents,
  addOrUpdatePharmacy,
  createCustomerRequest,
  updateCustomerRequestStatus,
  submitPharmacyResponse,
  createReservation,
  updateReservationStatus,
  addSystemEvent,
  wipeFirestoreData
} from './lib/firebase';

// INITIAL PRE-SEEDED PHARMACIES (Centered on Unaizah coordinates)
const INITIAL_PHARMACIES: Pharmacy[] = [
  {
    id: 'p-sina',
    nameAr: 'صيدلية ابن سينا المتميزة',
    nameEn: 'Ibn Sina Elite Pharmacy',
    addressAr: 'حي الخبيب، طريق الملك فهد، عنيزة',
    addressEn: 'Al Khubeib, King Fahd Rd, Unaizah',
    latitude: 26.086,
    longitude: 43.992,
    isVerified: true,
    licenseNumber: 'MoH-10221-X',
    rating: 4.9,
    responseRate: 98,
    avgResponseTimeSec: 85,
    status: 'active'
  },
  {
    id: 'p-fahd',
    nameAr: 'صيدلية الفهد التخصصية',
    nameEn: 'Al Fahd Specialty Pharmacy',
    addressAr: 'حي الريان، طريق الملك عبدالعزيز، عنيزة',
    addressEn: 'Al Rayyan, King Abdulaziz Rd, Unaizah',
    latitude: 26.095,
    longitude: 43.982,
    isVerified: true,
    licenseNumber: 'MoH-22091-B',
    rating: 4.7,
    responseRate: 95,
    avgResponseTimeSec: 140,
    status: 'active'
  },
  {
    id: 'p-nahdi',
    nameAr: 'صيدلية النهدي الكبرى',
    nameEn: 'Al Nahdi Grand Pharmacy',
    addressAr: 'حي الصفاء، شارع زامل السليم، عنيزة',
    addressEn: 'Al Safa, Zamil Al-Saleem St, Unaizah',
    latitude: 26.082,
    longitude: 43.974,
    isVerified: true,
    licenseNumber: 'MoH-44112-C',
    rating: 4.8,
    responseRate: 90,
    avgResponseTimeSec: 195,
    status: 'active'
  },
  {
    id: 'p-kunooz',
    nameAr: 'صيدلية كنوز الدواء',
    nameEn: 'Kunooz El-Dawaa Pharmacy',
    addressAr: 'حي المطار، طريق الملك سعود، عنيزة',
    addressEn: 'Al Matar, King Saud Rd, Unaizah',
    latitude: 26.071,
    longitude: 44.004,
    isVerified: true,
    licenseNumber: 'MoH-55099-H',
    rating: 4.6,
    responseRate: 88,
    avgResponseTimeSec: 210,
    status: 'active'
  },
  {
    id: 'p-care',
    nameAr: 'صيدلية عناية القصيم الطبية',
    nameEn: 'Qassim Medical Care Pharmacy',
    addressAr: 'حي الأشرفية، شارع الثلاثين، عنيزة',
    addressEn: 'Al Ashrafyah, Al Thalatheen St, Unaizah',
    latitude: 26.098,
    longitude: 44.008,
    isVerified: true,
    licenseNumber: 'MoH-88321-Y',
    rating: 4.5,
    responseRate: 85,
    avgResponseTimeSec: 245,
    status: 'active'
  }
];

export default function App() {
  const [lang, setLang] = useState<Language>('ar');

  // Customer Coordinates (Stateful so map interactions can shift customer location)
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number }>(() => {
    const saved = localStorage.getItem('wenhoboh_customerCoords');
    return saved ? JSON.parse(saved) : { lat: 26.085, lng: 43.990 };
  });

  // Global State (Synchronized with Firestore in real-time)
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>(INITIAL_PHARMACIES);
  const [activeRequest, setActiveRequest] = useState<CustomerRequest | null>(null);
  const [responses, setResponses] = useState<PharmacyResponse[]>([]);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [events, setEvents] = useState<SystemEvent[]>([]);

  // User Profile
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('wenhoboh_user');
    return saved ? JSON.parse(saved) : { phone: '', name: '', isRegistered: false };
  });

  // Set up Firestore Listeners on Mount
  useEffect(() => {
    // 1. Listen to pharmacies
    const unsubPharmacies = listenToPharmacies((list) => {
      if (list.length === 0) {
        // Seed initial pharmacies if empty in Firestore
        INITIAL_PHARMACIES.forEach(p => {
          addOrUpdatePharmacy(p);
        });
      } else {
        setPharmacies(list);
      }
    });

    // 2. Listen to activeRequest
    const unsubRequest = listenToActiveRequest((req) => {
      setActiveRequest(req);
    });

    // 3. Listen to responses
    const unsubResponses = listenToResponses((list) => {
      setResponses(list);
    });

    // 4. Listen to activeReservation
    const unsubReservation = listenToActiveReservation((res) => {
      setActiveReservation(res);
    });

    // 5. Listen to systemEvents
    const unsubEvents = listenToSystemEvents((list) => {
      setEvents(list);
    });

    return () => {
      unsubPharmacies();
      unsubRequest();
      unsubResponses();
      unsubReservation();
      unsubEvents();
    };
  }, []);

  // Sync coords and user to localStorage (local client preferences)
  useEffect(() => {
    localStorage.setItem('wenhoboh_customerCoords', JSON.stringify(customerCoords));
  }, [customerCoords]);

  useEffect(() => {
    localStorage.setItem('wenhoboh_user', JSON.stringify(user));
  }, [user]);

  // Sound generator function for alert beeps
  const triggerNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio context blocked by browser gesture
    }
  };

  // Helper logger for system event panel (Saves to Firestore!)
  const handleLogEvent = (type: any, msgAr: string, msgEn: string) => {
    const newEvent: SystemEvent = {
      id: Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toLocaleTimeString(),
      type,
      messageAr: msgAr,
      messageEn: msgEn
    };
    addSystemEvent(newEvent);
    triggerNotificationSound();
  };

  // Clear database to clean slate (Wipes Firestore!)
  const handleClearDatabase = async () => {
    try {
      await wipeFirestoreData();

      // Reset local states instantly for seamless real-time visual transition
      setActiveRequest(null);
      setResponses([]);
      setActiveReservation(null);
      setEvents([]);
      setPharmacies(INITIAL_PHARMACIES);

      // Re-seed pharmacies
      for (const p of INITIAL_PHARMACIES) {
        await addOrUpdatePharmacy(p);
      }
      
      const clearTime = new Date().toLocaleTimeString();
      const cleanEvent: SystemEvent = {
        id: Math.random().toString(36).substr(2, 5),
        timestamp: clearTime,
        type: 'verification_approved',
        messageAr: 'تم مسح قاعدة البيانات بنجاح من جميع بيانات التجارب السابقة والبدء بسجل حقيقي معتمد صيدلانياً.',
        messageEn: 'Database cleared successfully from all experimental logs. Pharmacological network reset to fresh state.'
      };
      await addSystemEvent(cleanEvent);
      triggerNotificationSound();
      alert(lang === 'ar' ? '✅ تم مسح قاعدة البيانات بنجاح وإعادة تهيئة الصيدليات!' : '✅ Database wiped and pharmacies re-seeded successfully!');
    } catch (error) {
      console.error("Wipe failed:", error);
      alert((lang === 'ar' ? '❌ فشل مسح قاعدة البيانات: ' : '❌ Database wipe failed: ') + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Log initial system boot if events are empty (First boot seed)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (events.length === 0) {
        handleLogEvent(
          'verification_approved',
          'تم إطلاق نظام وينهوبه بنجاح لخدمة محافظة عنيزة - منطقة القصيم',
          'Wenhoboh Platform successfully launched to serve Unaizah, Qassim Province'
        );
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [events.length]);

  const addResponse = (res: PharmacyResponse) => {
    submitPharmacyResponse(res);
  };

  const handleSetActiveRequest = (req: CustomerRequest | null) => {
    if (req) {
      createCustomerRequest(req);
    } else if (activeRequest) {
      updateCustomerRequestStatus(activeRequest.id, 'cancelled');
    }
  };

  const handleSetActiveReservation = (res: Reservation | null) => {
    if (res) {
      createReservation(res);
      if (activeRequest) {
        updateCustomerRequestStatus(activeRequest.id, 'fulfilled');
      }
    } else if (activeReservation) {
      updateReservationStatus(activeReservation.id, 'cancelled_customer');
      if (activeRequest) {
        updateCustomerRequestStatus(activeRequest.id, 'active');
      }
    }
  };

  const handleSetPharmacies = (updater: any) => {
    if (typeof updater === 'function') {
      const newList = updater(pharmacies);
      newList.forEach((p: Pharmacy) => {
        addOrUpdatePharmacy(p);
      });
    } else {
      updater.forEach((p: Pharmacy) => {
        addOrUpdatePharmacy(p);
      });
    }
  };

  const getPharmacyName = (id: string, currentLang: Language) => {
    const pharm = pharmacies.find(p => p.id === id);
    if (!pharm) return id;
    return currentLang === 'ar' ? pharm.nameAr : pharm.nameEn;
  };

  return (
    <Routes>
      <Route element={<Layout lang={lang} setLang={setLang} />}>
        <Route index element={<Gateway lang={lang} />} />
        
        <Route path="auth/customer" element={<AuthPage role="customer" lang={lang} />} />
        <Route path="partner-pharmacy-login" element={<AuthPage role="pharmacy" lang={lang} />} />
        <Route path="system-admin-portal" element={<AuthPage role="admin" lang={lang} />} />

        <Route path="customer" element={
          <ProtectedRoute role="customer">
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
              <div className="lg:col-span-5 space-y-6">
                <InteractiveMap 
                  pharmacies={pharmacies}
                  customerCoords={customerCoords}
                  onCustomerCoordsChange={setCustomerCoords}
                  activeRequest={activeRequest}
                  activeReservation={activeReservation}
                  selectedPharmacyId={activeReservation ? activeReservation.pharmacyId : null}
                  lang={lang}
                />
                <StartupThesis lang={lang} />
              </div>
              <div className="lg:col-span-7">
                <CustomerPortal 
                  pharmacies={pharmacies}
                  activeRequest={activeRequest}
                  setActiveRequest={handleSetActiveRequest}
                  responses={responses}
                  addResponse={addResponse}
                  activeReservation={activeReservation}
                  setActiveReservation={handleSetActiveReservation}
                  lang={lang}
                  onLogEvent={handleLogEvent}
                  customerCoords={customerCoords}
                />
              </div>
            </main>
          </ProtectedRoute>
        } />

        <Route path="pharmacy" element={
          <ProtectedRoute role="pharmacy">
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
              <div className="lg:col-span-5 space-y-6">
                <InteractiveMap 
                  pharmacies={pharmacies}
                  customerCoords={customerCoords}
                  onCustomerCoordsChange={setCustomerCoords}
                  activeRequest={activeRequest}
                  activeReservation={activeReservation}
                  selectedPharmacyId={activeReservation ? activeReservation.pharmacyId : null}
                  lang={lang}
                />
                <StartupThesis lang={lang} />
              </div>
              <div className="lg:col-span-7">
                <PharmacyPortal 
                  pharmacies={pharmacies}
                  activeRequest={activeRequest}
                  responses={responses}
                  addResponse={addResponse}
                  activeReservation={activeReservation}
                  setActiveReservation={handleSetActiveReservation}
                  lang={lang}
                  onLogEvent={handleLogEvent}
                />
              </div>
            </main>
          </ProtectedRoute>
        } />

        <Route path="admin" element={
          <ProtectedRoute role="admin">
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
              <div className="lg:col-span-5 space-y-6">
                <InteractiveMap 
                  pharmacies={pharmacies}
                  customerCoords={customerCoords}
                  onCustomerCoordsChange={setCustomerCoords}
                  activeRequest={activeRequest}
                  activeReservation={activeReservation}
                  selectedPharmacyId={activeReservation ? activeReservation.pharmacyId : null}
                  lang={lang}
                />
                <StartupThesis lang={lang} />
              </div>
              <div className="lg:col-span-7">
                <AdminPortal 
                  pharmacies={pharmacies}
                  setPharmacies={handleSetPharmacies}
                  events={events}
                  lang={lang}
                  onLogEvent={handleLogEvent}
                  onClearDatabase={handleClearDatabase}
                />
              </div>
            </main>
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

function StartupThesis({ lang }: { lang: Language }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
        <Info className="w-4 h-4 text-emerald-500" />
        {lang === 'ar' ? 'نبذة عن نموذج عمل وينهوبه (و)' : 'WENHOBOH STARTUP THESIS'}
      </h3>

      <div className="text-xs space-y-3 leading-relaxed text-slate-300">
        <p>
          {lang === 'ar' 
            ? 'نموذج بث الطلب هو الحل الأمثل لمشكلة توفر الأدوية. لا نحتاج للربط التقني مع أنظمة مخزون الصيدليات المتناثرة والمعقدة (Zero ERP Integration)!' 
            : 'Wenhoboh reverses the pharmacy model: instead of heavy POS/ERP stock integrations, patients broadcast requests directly to nearby pharmacists. No onboarding friction!'}
        </p>
        
        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/50">
          <div className="bg-slate-900 p-2.5 rounded-xl">
            <span className="text-[9px] text-slate-500 block font-semibold">TARGET MARKET</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">Qassim, KSA</span>
          </div>
          <div className="bg-slate-900 p-2.5 rounded-xl">
            <span className="text-[9px] text-slate-500 block font-semibold">ONBOARDING TIME</span>
            <span className="text-xs font-bold text-white font-mono">5 Minutes</span>
          </div>
          <div className="bg-slate-900 p-2.5 rounded-xl">
            <span className="text-[9px] text-slate-500 block font-semibold">EST. LTV:CAC</span>
            <span className="text-xs font-bold text-white font-mono">17 : 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
