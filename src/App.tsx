/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import AuthPage from './components/AuthPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { 
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
import { playAlertSound } from './lib/utils';
import {
  listenToPharmacies,
  listenToActiveRequest,
  listenToResponses,
  listenToActiveReservation,
  listenToSystemEvents,
  listenToAllRequests,
  listenToAllReservations,
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
    try {
      return saved ? JSON.parse(saved) : { lat: 26.085, lng: 43.990 };
    } catch {
      return { lat: 26.085, lng: 43.990 };
    }
  });

  // Global State (Synchronized with Firestore in real-time)
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>(INITIAL_PHARMACIES);
  const [activeRequest, setActiveRequest] = useState<CustomerRequest | null>(null);
  const [responses, setResponses] = useState<PharmacyResponse[]>([]);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  // Admin-specific: full lists for admin portal (avoids duplicate listeners in AdminPortal)
  const [allRequests, setAllRequests] = useState<CustomerRequest[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);

  // User Profile
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('wenhoboh_user');
    try {
      return saved ? JSON.parse(saved) : { phone: '', name: '', isRegistered: false };
    } catch {
      return { phone: '', name: '', isRegistered: false };
    }
  });

  // Set up Firestore Listeners on Mount
  useEffect(() => {
    // 1. Listen to pharmacies
    const unsubPharmacies = listenToPharmacies((list) => {
      setPharmacies(list);
    });

    // 2. Listen to activeRequest
    const unsubRequest = listenToActiveRequest((req) => {
      setActiveRequest(req);
    });

    // 3. Listen to responses — scoped to active request
    let unsubResponses = listenToResponses(null, (list) => {
      setResponses(list);
    });

    // When activeRequest changes, re-subscribe with the new requestId
    const handleRequestChange = (req: CustomerRequest | null) => {
      unsubResponses();
      unsubResponses = listenToResponses(req?.id ?? null, (list) => {
        setResponses(list);
      });
    };

    // 4. Listen to activeReservation
    const unsubReservation = listenToActiveReservation((res) => {
      setActiveReservation(res);
    });

    // 5. Listen to systemEvents
    const unsubEvents = listenToSystemEvents((list) => {
      setEvents(list);
    });

    // 6. Admin: listen to all requests and reservations
    const unsubAllRequests = listenToAllRequests((list) => {
      setAllRequests(list);
    });
    const unsubAllReservations = listenToAllReservations((list) => {
      setAllReservations(list);
    });

    return () => {
      unsubPharmacies();
      unsubRequest();
      unsubResponses();
      unsubReservation();
      unsubEvents();
      unsubAllRequests();
      unsubAllReservations();
    };
  }, []);
  useEffect(() => {
    localStorage.setItem('wenhoboh_customerCoords', JSON.stringify(customerCoords));
  }, [customerCoords]);

  useEffect(() => {
    localStorage.setItem('wenhoboh_user', JSON.stringify(user));
  }, [user]);

  // Helper logger for system event panel (Saves to Firestore!)
  const handleLogEvent = (type: SystemEvent['type'], msgAr: string, msgEn: string) => {
    const newEvent: SystemEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      messageAr: msgAr,
      messageEn: msgEn
    };
    addSystemEvent(newEvent);
    playAlertSound();
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
      setPharmacies([]);
      
      const clearTime = new Date().toISOString();
      const cleanEvent: SystemEvent = {
        id: crypto.randomUUID(),
        timestamp: clearTime,
        type: 'verification_approved',
        messageAr: 'تم مسح قاعدة البيانات بنجاح من جميع بيانات التجارب السابقة والبدء بسجل حقيقي معتمد صيدلانياً.',
        messageEn: 'Database cleared successfully from all experimental logs. Pharmacological network reset to fresh state.'
      };
      await addSystemEvent(cleanEvent);
      playAlertSound();
      alert(lang === 'ar' ? '✅ تم مسح قاعدة البيانات بنجاح!' : '✅ Database wiped successfully!');
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

  // Write only the changed pharmacy to Firestore (not the entire list)
  const handleSetPharmacies = (updaterOrPharmacy: React.SetStateAction<Pharmacy[]> | Pharmacy) => {
    if (typeof updaterOrPharmacy !== 'function' && 'id' in updaterOrPharmacy) {
      // Single pharmacy update — write only this one
      addOrUpdatePharmacy(updaterOrPharmacy as Pharmacy);
    } else if (typeof updaterOrPharmacy === 'function') {
      const newList = (updaterOrPharmacy as (prev: Pharmacy[]) => Pharmacy[])(pharmacies);
      newList.forEach((p: Pharmacy) => addOrUpdatePharmacy(p));
    } else {
      (updaterOrPharmacy as Pharmacy[]).forEach((p: Pharmacy) => addOrUpdatePharmacy(p));
    }
  };

  return (
    <Routes>
      <Route element={<Layout lang={lang} setLang={setLang} />}>
        <Route index element={<Navigate to="/customer" replace />} />
        
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
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 animate-fade-in">
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
                
              </div>
              <div className="lg:col-span-7">
                <AdminPortal 
                  pharmacies={pharmacies}
                  setPharmacies={handleSetPharmacies}
                  events={events}
                  lang={lang}
                  onLogEvent={handleLogEvent}
                  onClearDatabase={handleClearDatabase}
                  allRequests={allRequests}
                  allReservations={allReservations}
                />
              </div>
            </main>
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

