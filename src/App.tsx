/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  // Read role from URL query parameters (e.g. ?role=customer) or local storage, or default to gateway
  const [role, setRole] = useState<Role>(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRole = params.get('role') as Role | null;
    if (queryRole && ['customer', 'pharmacy', 'admin', 'splitscreen', 'gateway'].includes(queryRole)) {
      return queryRole;
    }
    const savedRole = localStorage.getItem('wenhoboh_user_role') as Role | null;
    if (savedRole && ['customer', 'pharmacy', 'admin', 'splitscreen', 'gateway'].includes(savedRole)) {
      return savedRole;
    }
    return 'gateway'; // Default to gateway landing for clean production entry
  });

  // Check if role was locked via URL query parameter (for direct standalone links)
  const [isUrlLocked] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRole = params.get('role');
    return !!(queryRole && ['customer', 'pharmacy', 'admin', 'splitscreen'].includes(queryRole));
  });

  const handleSelectRole = (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem('wenhoboh_user_role', newRole);
  };

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

  // Simulated AI replies toggler (highly helpful for showing direct value)
  const [aiRepliesEnabled, setAiRepliesEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('wenhoboh_aiRepliesEnabled');
    return saved ? JSON.parse(saved) === 'true' : true;
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

  useEffect(() => {
    localStorage.setItem('wenhoboh_aiRepliesEnabled', String(aiRepliesEnabled));
  }, [aiRepliesEnabled]);

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

  // AUTOMATED AI PHARMACY REPLIES SIMULATOR
  useEffect(() => {
    if (!activeRequest || !aiRepliesEnabled || activeRequest.status !== 'active') return;

    // Simulate random replies from pharmacies not currently navigated by the user
    const pIds = pharmacies.map(p => p.id);
    
    // Choose 2 random pharmacies to respond automatically
    const timeoutIds: any[] = [];

    // Pharmacy 1 responds as "Available" after 3 seconds
    const timer1 = setTimeout(() => {
      const pharm = pharmacies.find(p => p.id === 'p-nahdi');
      if (pharm && activeRequest.status === 'active') {
        const alreadyResponded = responses.some(r => r.requestId === activeRequest.id && r.pharmacyId === pharm.id);
        if (!alreadyResponded) {
          const newResponse: PharmacyResponse = {
            id: 'resp-' + Math.random().toString(36).substr(2, 5),
            requestId: activeRequest.id,
            pharmacyId: pharm.id,
            status: 'available',
            price: activeRequest.category === 'rx' ? 74.50 : 15.00,
            notes: lang === 'ar' ? 'متوفر لدينا وجاهز للتسليم الفوري' : 'In stock, ready for immediate delivery',
            respondedAt: new Date().toLocaleTimeString()
          };
          submitPharmacyResponse(newResponse);
          handleLogEvent(
            'response_sent',
            `أرسلت صيدلية النهدي الكبرى رداً تلقائياً بـ: متوفر - السعر ${newResponse.price} ريال`,
            `Al Nahdi Pharmacy sent auto-response: Available - Price ${newResponse.price} SAR`
          );
        }
      }
    }, 3200);
    timeoutIds.push(timer1);

    // Pharmacy 2 responds as "Alternative Available" after 6.5 seconds
    const timer2 = setTimeout(() => {
      const pharm = pharmacies.find(p => p.id === 'p-kunooz');
      if (pharm && activeRequest.status === 'active') {
        const alreadyResponded = responses.some(r => r.requestId === activeRequest.id && r.pharmacyId === pharm.id);
        if (!alreadyResponded) {
          const isInsulin = activeRequest.productName.toLowerCase().includes('insul') || activeRequest.productName.includes('أنسولين');
          const altName = isInsulin ? 'Humalog Mix 50' : 'Solpadeine Soluble';
          const newResponse: PharmacyResponse = {
            id: 'resp-' + Math.random().toString(36).substr(2, 5),
            requestId: activeRequest.id,
            pharmacyId: pharm.id,
            status: 'alternative',
            alternativeName: altName,
            price: isInsulin ? 120.00 : 18.00,
            notes: lang === 'ar' ? 'لدينا هذا البديل بنفس الفعالية الطبية' : 'We carry this identical clinical substitute',
            respondedAt: new Date().toLocaleTimeString()
          };
          submitPharmacyResponse(newResponse);
          handleLogEvent(
            'response_sent',
            `أقرت صيدلية كنوز الدواء بتوفر بديل للمريض: (${altName}) بسعر ${newResponse.price} ريال`,
            `Kunooz Pharmacy proposed alternative: (${altName}) - Price ${newResponse.price} SAR`
          );
        }
      }
    }, 6500);
    timeoutIds.push(timer2);

    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [activeRequest, aiRepliesEnabled]);

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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Platform Upper Top Bar */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-4 py-3 md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-md shadow-emerald-950">
              و
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight font-display">
                  {lang === 'ar' ? 'وينهوبه' : 'WENHOBOH'}
                </h1>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/60 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">
                  {lang === 'ar' ? 'عنيزة' : 'Unaizah'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                {lang === 'ar' ? 'اكتشاف وتأكيد توفر دواءك في دقائق معدودة' : 'Medication demand-broadcast & reservation engine'}
              </span>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="flex items-center gap-2.5">
            {/* AI replies simulator toggler */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[9px] md:text-xs text-slate-300 font-semibold hidden md:inline">
                {lang === 'ar' ? 'محاكاة ردود الصيدليات' : 'Auto AI Replies'}
              </span>
              <button
                onClick={() => setAiRepliesEnabled(!aiRepliesEnabled)}
                className={`w-7 h-4 rounded-full transition-colors relative flex items-center ${aiRepliesEnabled ? 'bg-emerald-500' : 'bg-slate-800'}`}
              >
                <span className={`w-3 h-3 rounded-full bg-white shadow transition-transform absolute ${aiRepliesEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`}></span>
              </button>
            </div>

            {/* Exit/Logout Button (Only if not URL locked and not in gateway) */}
            {!isUrlLocked && role !== 'gateway' && (
              <button
                onClick={() => handleSelectRole('gateway')}
                className="bg-red-950/70 hover:bg-red-900 border border-red-800/60 px-3 py-1.5 rounded-xl text-xs font-bold text-red-200 transition duration-150 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>{lang === 'ar' ? 'بوابة الدخول' : 'Exit Portal'}</span>
              </button>
            )}

            {/* Language switch */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 transition duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Role Navigation Bar (Only visible in playground splitscreen mode) */}
      {role === 'splitscreen' && (
        <nav className="bg-slate-950/80 border-b border-slate-800/60 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex gap-1 justify-center overflow-x-auto">
            <button
              onClick={() => setRole('splitscreen')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-1.5 ${role === 'splitscreen' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20' : 'text-slate-400 hover:bg-slate-900'}`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'ساحة التجربة المشتركة' : 'Splitscreen Playground'}
            </button>
            <button
              onClick={() => setRole('customer')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-1.5 ${role === 'customer' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20' : 'text-slate-400 hover:bg-slate-900'}`}
            >
              <Users className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'بوابة العميل' : 'Customer Portal'}
            </button>
            <button
              onClick={() => setRole('pharmacy')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-1.5 ${role === 'pharmacy' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20' : 'text-slate-400 hover:bg-slate-900'}`}
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              {lang === 'ar' ? 'بوابة الصيدلي' : 'Pharmacist Desk'}
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-1.5 ${role === 'admin' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20' : 'text-slate-400 hover:bg-slate-900'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-red-400" />
              {lang === 'ar' ? 'إدارة المنصة' : 'Admin back-office'}
            </button>
          </div>
        </nav>
      )}

      {/* Unified Gateway Landing Page or Dedicated Main Workspace */}
      {role === 'gateway' ? (
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-16 flex flex-col justify-center items-center">
          
          {/* Main Hero Header */}
          <div className="text-center max-w-2xl mb-12 space-y-4">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center font-bold text-white text-3xl shadow-lg shadow-emerald-950 mx-auto animate-pulse">
              و
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                {lang === 'ar' ? 'بوابة الدخول الموحدة' : 'Unified Entrance Portal'}
              </h1>
              <p className="text-sm md:text-base text-slate-300">
                {lang === 'ar' 
                  ? 'منصة الربط المباشر لطلب الأدوية واستقبال عروض الأسعار والحجوزات الفورية - محافظة عنيزة' 
                  : 'Direct broadcast engine for medication searches, quotes, and instant pickup reservations - Unaizah'}
              </p>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-emerald-950/40 text-emerald-400 border border-emerald-900/60 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider">
              <MapPin className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'منطقة القصيم - المملكة العربية السعودية' : 'Qassim Region - Kingdom of Saudi Arabia'}
            </div>
          </div>

          {/* Selector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            
            {/* Card 1: Patient / Customer Portal */}
            <div 
              onClick={() => handleSelectRole('customer')}
              className="group bg-slate-950 hover:bg-slate-900/80 border border-slate-800 hover:border-emerald-500/60 rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-950/10 text-right"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-950 border border-emerald-800 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition duration-300">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">
                    {lang === 'ar' ? 'بوابة المريض' : 'Patient Portal'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'ar' 
                      ? 'ابحث عن الأدوية، ارفع الوصفة الطبية، وابث طلبك لجميع الصيدليات المحيطة بك لتصلك العروض فوراً.' 
                      : 'Search for medicines, upload prescriptions, and broadcast your request to get instant pharmacist quotes.'}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-between items-center text-xs font-bold text-emerald-400">
                <span>{lang === 'ar' ? 'دخول الخدمة' : 'Enter Portal'}</span>
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>

            {/* Card 2: Pharmacist Desk */}
            <div 
              onClick={() => handleSelectRole('pharmacy')}
              className="group bg-slate-950 hover:bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl hover:shadow-cyan-950/10 text-right"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-cyan-950 border border-cyan-800 rounded-2xl flex items-center justify-center text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white transition duration-300">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition">
                    {lang === 'ar' ? 'مكتب الصيدلي الشريك' : 'Pharmacist Desk'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'ar' 
                      ? 'للصيدليات المسجلة: استقبل طلبات المرضى في منطقتك الجغرافية، قدم الأسعار، البدائل وأكد الحجوزات.' 
                      : 'For verified partner pharmacists: view active local requests, reply with offers/substitutes, and confirm pickups.'}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-between items-center text-xs font-bold text-cyan-400">
                <span>{lang === 'ar' ? 'دخول مكتب العمل' : 'Enter Desk'}</span>
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>

            {/* Card 3: Admin back-office */}
            <div 
              onClick={() => handleSelectRole('admin')}
              className="group bg-slate-950 hover:bg-slate-900/80 border border-slate-800 hover:border-red-500/60 rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl hover:shadow-red-950/10 text-right"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-red-950 border border-red-800 rounded-2xl flex items-center justify-center text-red-400 group-hover:bg-red-600 group-hover:text-white transition duration-300">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition">
                    {lang === 'ar' ? 'إدارة المنصة الموحدة' : 'Central Admin'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'ar' 
                      ? 'لوحة الإدارة الخلفية لتثبيت ومسح البيانات التجريبية، مراقبة سجلات الأحداث، وضبط أداء النظام.' 
                      : 'Central back-office control panel to wipe/reseed clinical databases, monitor system events, and audit network metrics.'}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-between items-center text-xs font-bold text-red-400">
                <span>{lang === 'ar' ? 'الدخول كمسؤول' : 'Enter Back-Office'}</span>
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>

          </div>

          {/* Evaluation Note: Splitscreen link */}
          <div className="mt-12 text-center">
            <button
              onClick={() => handleSelectRole('splitscreen')}
              className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 px-5 py-3 rounded-2xl transition-colors cursor-pointer hover:border-emerald-600"
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              <span>
                {lang === 'ar' 
                  ? '💡 مقيمي النظام؟ انقر لتشغيل ساحة التجربة المشتركة (Splitscreen Dual Play)' 
                  : '💡 System Evaluators? Click to open Splitscreen Dual Play Arena'}
              </span>
            </button>
          </div>

        </div>
      ) : (
        /* Main Workspace Layout */
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* Left Side: Map and Interactive stats */}
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

            {/* Quick Business Proposition Summary (Interactive widget) */}
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
          </div>

          {/* Right Side: Active Workspace */}
          <div className="lg:col-span-7">
            
            {role === 'splitscreen' && (
              <div className="space-y-6">
                {/* Splitscreen Disclaimer Banner */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                    <span>
                      {lang === 'ar' 
                        ? '💡 محاكاة ذكية للجهتين: يمكنك تجربة دور المريض والصيدلي معاً في شاشة واحدة!' 
                        : '💡 Simulated Split-Screen: Experience the entire loop side-by-side!'}
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Dual Interfaces */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl w-fit">
                      <Users className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase font-mono">
                        {lang === 'ar' ? 'جهة المريض' : 'Customer View'}
                      </span>
                    </div>
                    <CustomerPortal 
                      user={user}
                      setUser={setUser}
                      pharmacies={pharmacies}
                      activeRequest={activeRequest}
                      setActiveRequest={handleSetActiveRequest}
                      responses={responses}
                      addResponse={addResponse}
                      activeReservation={activeReservation}
                      setActiveReservation={handleSetActiveReservation}
                      lang={lang}
                      onLogEvent={handleLogEvent}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl w-fit">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono">
                        {lang === 'ar' ? 'جهة الصيدلي' : 'Pharmacist View'}
                      </span>
                    </div>
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
                </div>
              </div>
            )}

            {role === 'customer' && (
              <CustomerPortal 
                user={user}
                setUser={setUser}
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
            )}

            {role === 'pharmacy' && (
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
            )}

            {role === 'admin' && (
              <AdminPortal 
                pharmacies={pharmacies}
                setPharmacies={handleSetPharmacies}
                events={events}
                lang={lang}
                onLogEvent={handleLogEvent}
                onClearDatabase={handleClearDatabase}
              />
            )}

          </div>

        </main>
      )}

      {/* Platform Branding Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 text-xs text-slate-500 py-6 px-4 text-center mt-12 space-y-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <p>
            {lang === 'ar' 
              ? 'مُطوّر لمنصة وينهوبه (و) بمحافظة عنيزة، منطقة القصيم، المملكة العربية السعودية © ٢٠٢٦' 
              : 'Developed for WENHOBOH Platform, Unaizah, Qassim Region, Saudi Arabia © 2026'}
          </p>
          <div className="flex gap-4">
            <span className="hover:text-slate-300 transition cursor-default flex items-center gap-1 text-[11px]">
              <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              Vision 2030 Healthcare Digitalization
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
