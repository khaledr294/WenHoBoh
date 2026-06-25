/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { 
  CustomerRequest, 
  Pharmacy, 
  PharmacyResponse, 
  Reservation, 
  UserProfile, 
  ProductCategory,
  Language
} from '../types';
import { 
  Phone, 
  FileText, 
  Sliders, 
  Clock, 
  UploadCloud, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MapPin, 
  Navigation, 
  ShieldAlert, 
  Star,
  RefreshCw
} from 'lucide-react';

interface CustomerPortalProps {
  pharmacies: Pharmacy[];
  activeRequest: CustomerRequest | null;
  setActiveRequest: (req: CustomerRequest | null) => void;
  responses: PharmacyResponse[];
  addResponse: (res: PharmacyResponse) => void;
  activeReservation: Reservation | null;
  setActiveReservation: (res: Reservation | null) => void;
  lang: Language;
  onLogEvent: (type: any, msgAr: string, msgEn: string) => void;
  customerCoords?: { lat: number; lng: number };
}

const PRESET_PRODUCTS = [
  { nameAr: 'أنسولين لانتوس سولوشتار', nameEn: 'Insulin Lantus Solostar', category: 'rx' as const, notes: 'تحتاج للتبريد، عدد ٢ قلم' },
  { nameAr: 'بنادول إكسترا خافض حرارة', nameEn: 'Panadol Extra Analgesic', category: 'otc' as const, notes: 'علبة واحدة كافية' },
  { nameAr: 'حليب أطفال سيميلاك جولد رقم ١', nameEn: 'Similac Gold Infant Formula No.1', category: 'baby' as const, notes: 'علبة حجم ٤٠٠ جرام' },
  { nameAr: 'واقي شمس يوسيرين 50+', nameEn: 'Eucerin Sunscreen Gel-Cream SPF50+', category: 'cosmetics' as const, notes: 'للبشرة الدهنية' },
  { nameAr: 'فيتامين سي ١٠٠٠ مجم فوار', nameEn: 'Vitamin C 1000mg Effervescent', category: 'supplements' as const, notes: 'علبة بنكهة البرتقال' },
];

export default function CustomerPortal({
  pharmacies,
  activeRequest,
  setActiveRequest,
  responses,
  addResponse,
  activeReservation,
  setActiveReservation,
  lang,
  onLogEvent,
  customerCoords,
}: CustomerPortalProps) {
  const { user: firebaseUser } = useAuth();
  
  // Extract user info from Firebase user
  const user = {
    phone: firebaseUser?.phoneNumber || firebaseUser?.email || '',
    name: firebaseUser?.displayName || 'عميل مسجل',
    isRegistered: true,
  };

  // Request form states
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('otc');
  const [radiusKm, setRadiusKm] = useState(3);
  const [notes, setNotes] = useState('');
  const [prescriptionAttached, setPrescriptionAttached] = useState(false);
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);

  // Demo helper states
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [showRadiusExpansionPrompt, setShowRadiusExpansionPrompt] = useState(false);
  
  // Rating states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // 30-minute Countdown Timer logic for reservation
  const [reservationTimeLeft, setReservationTimeLeft] = useState<number>(1800); // 30 minutes in seconds

  useEffect(() => {
    let timer: any;
    if (activeReservation && reservationTimeLeft > 0 && activeReservation.status === 'active') {
      timer = setInterval(() => {
        setReservationTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Expire reservation
            setActiveReservation({
              ...activeReservation,
              status: 'expired'
            });
            onLogEvent(
              'reservation_completed',
              `انتهى وقت حجز الطلب لدى صيدلية ${getPharmacyName(activeReservation.pharmacyId, 'ar')}`,
              `Reservation expired for pharmacy ${getPharmacyName(activeReservation.pharmacyId, 'en')}`
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeReservation, reservationTimeLeft]);

  // Preset fill helper
  const handleSelectPreset = (preset: typeof PRESET_PRODUCTS[0]) => {
    setProductName(lang === 'ar' ? preset.nameAr : preset.nameEn);
    setCategory(preset.category);
    setNotes(preset.notes);
    if (preset.category === 'rx') {
      setPrescriptionAttached(true);
      setPrescriptionUrl('https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=300&auto=format&fit=crop');
    } else {
      setPrescriptionAttached(false);
      setPrescriptionUrl(null);
    }
  };

  // Submit Broadcast Request
  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;

    setIsBroadcasting(true);
    setBroadcastProgress(0);

    const newRequest: CustomerRequest = {
      id: Math.random().toString(36).substr(2, 9),
      productName: productName.trim(),
      category,
      latitude: 26.085, // Unaizah center
      longitude: 43.990,
      radiusKm,
      prescriptionImage: prescriptionUrl,
      notes: notes.trim() || null,
      status: 'active',
      createdAt: new Date().toLocaleTimeString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString(),
    };

    setActiveRequest(newRequest);
    onLogEvent(
      'request_created',
      `تم بث طلب جديد: "${newRequest.productName}" بنطاق ${newRequest.radiusKm}كم في عنيزة`,
      `New request broadcasted: "${newRequest.productName}" with radius ${newRequest.radiusKm}km in Unaizah`
    );

    // Simulate progress / radar wave broadcast animation
    const interval = setInterval(() => {
      setBroadcastProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBroadcasting(false);
          return 100;
        }
        return prev + 25;
      });
    }, 500);

    // Set up a mock timeout for radius expansion if no responses occur (for simulation)
    setTimeout(() => {
      setShowRadiusExpansionPrompt(true);
    }, 12000);
  };

  // Expand radius helper
  const handleExpandRadius = () => {
    if (!activeRequest) return;
    const newRadius = radiusKm === 3 ? 5 : radiusKm === 5 ? 10 : 15;
    setRadiusKm(newRadius);
    setActiveRequest({
      ...activeRequest,
      radiusKm: newRadius
    });
    setShowRadiusExpansionPrompt(false);
    onLogEvent(
      'request_created',
      `قام العميل بتوسيع نطاق البحث إلى ${newRadius}كم للعثور على بدائل أسرع`,
      `Customer expanded search radius to ${newRadius}km to find faster matches`
    );
  };

  // Filter responses relative to current request
  const activeRequestResponses = responses.filter(r => r.requestId === activeRequest?.id);

  const getPharmacyName = (id: string, currentLang: Language) => {
    const pharm = pharmacies.find(p => p.id === id);
    if (!pharm) return id;
    return currentLang === 'ar' ? pharm.nameAr : pharm.nameEn;
  };

  const getPharmacyDistance = (id: string) => {
    // Simulated distance based on pharmacy ID
    const distances: Record<string, number> = {
      'p-sina': 1.2,
      'p-fahd': 2.5,
      'p-nahdi': 3.1,
      'p-kunooz': 4.8,
      'p-care': 6.2
    };
    return distances[id] || 3.5;
  };

  const getPharmacyRating = (id: string) => {
    const pharm = pharmacies.find(p => p.id === id);
    return pharm ? pharm.rating : 4.5;
  };

  // Book/Reserve product
  const handleReserve = (response: PharmacyResponse) => {
    if (!activeRequest) return;
    
    const newReservation: Reservation = {
      id: 'res-' + Math.random().toString(36).substr(2, 5),
      requestId: activeRequest.id,
      responseId: response.id,
      customerPhone: user.phone,
      pharmacyId: response.pharmacyId,
      status: 'active',
      reservedAt: new Date().toLocaleTimeString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString()
    };

    setActiveReservation(newReservation);
    setReservationTimeLeft(1800); // 30 mins reset
    
    // Update active request to fulfilled
    setActiveRequest({
      ...activeRequest,
      status: 'fulfilled'
    });

    onLogEvent(
      'reservation_created',
      `تم إنشاء حجز مؤقت برقم ${newReservation.id} في صيدلية ${getPharmacyName(response.pharmacyId, 'ar')}`,
      `Temporary reservation #${newReservation.id} created at ${getPharmacyName(response.pharmacyId, 'en')}`
    );
  };

  // Cancel reservation
  const handleCancelReservation = (reason: string) => {
    if (!activeReservation) return;
    
    setActiveReservation({
      ...activeReservation,
      status: 'cancelled_customer'
    });

    onLogEvent(
      'reservation_completed',
      `ألغى العميل الحجز برقم ${activeReservation.id}. السبب: ${reason}`,
      `Customer cancelled reservation #${activeReservation.id}. Reason: ${reason}`
    );
  };

  const handleCompletePickup = () => {
    if (!activeReservation) return;

    setActiveReservation({
      ...activeReservation,
      status: 'completed'
    });

    onLogEvent(
      'reservation_completed',
      `أكد العميل استلام المنتج بنجاح واكتملت الدورة!`,
      `Customer successfully confirmed picking up the product!`
    );

    setShowRatingModal(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRatingModal(false);
    setReviewText('');
    onLogEvent(
      'verification_approved',
      `تم تقديم تقييم ${selectedRating} نجوم للصيدلية. شكراً لتقييمك!`,
      `Submitted ${selectedRating} stars review for the pharmacy. Thank you!`
    );
  };

  // Helper formatting seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ACTIVE RESERVATION VIEW
  if (activeReservation) {
    const reservationPharmacy = pharmacies.find(p => p.id === activeReservation.pharmacyId);
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl font-sans text-slate-900 space-y-6">
        {/* Ticket Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/50 rounded-full text-[10px] font-semibold tracking-wide uppercase font-mono">
                {lang === 'ar' ? 'حجز مؤكد مسبقاً' : 'CONFIRMED RESERVATION'}
              </span>
              <span className="text-base font-medium text-slate-500 font-mono">
                #{activeReservation.id}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {lang === 'ar' ? 'تذكرة استلام الدواء' : 'Medicine Pickup Ticket'}
            </h2>
          </div>

          {/* Countdown Clock */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-md">
            <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
            <div>
              <span className="text-[9px] text-slate-500 block font-semibold uppercase tracking-wider">
                {lang === 'ar' ? 'الوقت المتبقي للاستلام' : 'TIMER REMAINING'}
              </span>
              <span className="text-3xl font-bold font-mono text-amber-400 tracking-wider">
                {formatTime(reservationTimeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Reservation Status Alert */}
        {activeReservation.status === 'active' && (
          <div className="p-4 bg-emerald-950/45 border border-emerald-800/40 rounded-2xl flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-base font-medium">
              <p className="font-semibold text-emerald-200">
                {lang === 'ar' ? 'تم حجز الدواء بنجاح!' : 'Product Reserved Successfully!'}
              </p>
              <p className="text-slate-600 text-base font-medium mt-1">
                {lang === 'ar' 
                  ? 'قم بزيارة الصيدلية خلال ٣٠ دقيقة المحددة. أظهر رقم الحجز للصيدلي لاستلام الدواء.' 
                  : 'Please visit the pharmacy within 30 minutes. Present this ticket to the pharmacist.'}
              </p>
            </div>
          </div>
        )}

        {activeReservation.status === 'completed' && (
          <div className="p-4 bg-blue-950/45 border border-blue-800/40 rounded-2xl flex gap-3">
            <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-base font-medium">
              <p className="font-semibold text-blue-200">
                {lang === 'ar' ? 'تم الاستلام بنجاح!' : 'Successfully Picked Up!'}
              </p>
              <p className="text-slate-600 text-base font-medium mt-1">
                {lang === 'ar' 
                  ? 'شكراً لك على استخدام منصة وينهوبه لخدمة اكتشاف الأدوية في عنيزة.' 
                  : 'Thank you for using Wenhoboh for pharmacy discovery in Unaizah.'}
              </p>
            </div>
          </div>
        )}

        {activeReservation.status === 'expired' && (
          <div className="p-4 bg-amber-950/45 border border-amber-800/40 rounded-2xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-base font-medium">
              <p className="font-semibold text-amber-200">
                {lang === 'ar' ? 'انتهت صلاحية الحجز' : 'Reservation Expired'}
              </p>
              <p className="text-slate-600 text-base font-medium mt-1">
                {lang === 'ar' 
                  ? 'مرت ٣٠ دقيقة دون استلام، تم الإفراج عن المنتج للصيدلية.' 
                  : '30 minutes passed without pickup. The reserved item has been released.'}
              </p>
            </div>
          </div>
        )}

        {activeReservation.status.startsWith('cancelled') && (
          <div className="p-4 bg-red-950/45 border border-red-800/40 rounded-2xl flex gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-base font-medium">
              <p className="font-semibold text-red-200">
                {lang === 'ar' ? 'تم إلغاء الحجز' : 'Reservation Cancelled'}
              </p>
              <p className="text-slate-600 text-base font-medium mt-1">
                {lang === 'ar' 
                  ? 'تم إلغاء هذا الحجز. يمكنك إجراء بث جديد إذا لزم الأمر.' 
                  : 'This reservation has been cancelled. You can make a new broadcast if needed.'}
              </p>
            </div>
          </div>
        )}

        {/* Pharmacy Details Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'ar' ? reservationPharmacy?.nameAr : reservationPharmacy?.nameEn}
              </h3>
              <p className="text-base font-medium text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {lang === 'ar' ? reservationPharmacy?.addressAr : reservationPharmacy?.addressEn}
              </p>
            </div>
            
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-base font-medium text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-800/20 font-mono">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {getPharmacyRating(activeReservation.pharmacyId)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">
                {getPharmacyDistance(activeReservation.pharmacyId)} كم بعيداً عنك
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-3 flex flex-wrap gap-4 text-base font-medium justify-between">
            <div>
              <span className="text-slate-500 uppercase tracking-wide block text-[9px] font-mono mb-0.5">
                {lang === 'ar' ? 'المنتج المحجوز' : 'RESERVED PRODUCT'}
              </span>
              <span className="font-semibold text-slate-200">
                {activeRequest?.productName}
              </span>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wide block text-[9px] font-mono mb-0.5">
                {lang === 'ar' ? 'السعر المحدد' : 'PRICE QUOTED'}
              </span>
              <span className="font-semibold text-emerald-400 font-mono">
                {responses.find(r => r.id === activeReservation.responseId)?.price 
                  ? `${responses.find(r => r.id === activeReservation.responseId)?.price} SAR`
                  : (lang === 'ar' ? 'سعر المعيار الحكومي' : 'Standard SFDA Pricing')}
              </span>
            </div>
          </div>

          {/* Real-time Google Maps Navigation Widget */}
          {reservationPharmacy && (
            <div className="border-t border-slate-200/60 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/40 p-3 rounded-xl border border-blue-950/50">
              <div className="flex items-center gap-2.5">
                <Navigation className="w-4 h-4 text-blue-400 animate-pulse flex-shrink-0" />
                <div>
                  <span className="font-semibold text-base font-medium text-slate-200 block">
                    {lang === 'ar' ? 'اتجاهات الملاحة والمسار الحي' : 'Live Navigation & Driving Route'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {lang === 'ar' ? 'مخطط الملاحة المباشر جاهز لتوجيهك نحو الصيدلية' : 'Real-time driving path mapping active for your trip'}
                  </span>
                </div>
              </div>
              <a 
                href={`https://www.google.com/maps/dir/?api=1&origin=${customerCoords?.lat || 26.085},${customerCoords?.lng || 43.990}&destination=${reservationPharmacy.latitude},${reservationPharmacy.longitude}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition text-center whitespace-nowrap"
              >
                {lang === 'ar' ? 'تشغيل الملاحة 🧭' : 'Start Navigation 🧭'}
              </a>
            </div>
          )}
        </div>

        {/* Pickup Action Buttons */}
        <div className="flex gap-3">
          {activeReservation.status === 'active' && (
            <>
              <button
                onClick={handleCompletePickup}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/20 active:scale-98 transition flex items-center justify-center gap-2 text-base font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                {lang === 'ar' ? 'تأكيد الاستلام من الصيدلي' : 'Confirm Pickup at Pharmacy'}
              </button>

              <button
                onClick={() => handleCancelReservation(lang === 'ar' ? 'وجدت بديل آخر' : 'Found alternative')}
                className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold py-3 px-4 rounded-xl text-base font-medium transition"
              >
                {lang === 'ar' ? 'إلغاء الحجز' : 'Cancel Hold'}
              </button>
            </>
          )}

          {activeReservation.status !== 'active' && (
            <button
              onClick={() => {
                setActiveReservation(null);
                setActiveRequest(null);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-200 border border-slate-200 font-semibold py-3 rounded-xl transition text-base font-medium"
            >
              {lang === 'ar' ? 'الرجوع للرئيسية وإجراء بحث جديد' : 'Back to Dashboard & Search Again'}
            </button>
          )}
        </div>

        {/* Rating Modal */}
        {showRatingModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-950 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900">
                  {lang === 'ar' ? 'تقييم تجربة الاستلام' : 'Rate Your Experience'}
                </h3>
                <p className="text-base font-medium text-slate-500 mt-1">
                  {lang === 'ar' 
                    ? 'يساعد تقييمك في تحسين جودة صيدليات شبكة وينهوبه بمحافظة عنيزة' 
                    : 'Your rating builds reliability for pharmacy network in Unaizah'}
                </p>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      className="p-1 transition duration-100 hover:scale-125"
                    >
                      <Star 
                        className={`w-8 h-8 ${selectedRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} 
                      />
                    </button>
                  ))}
                </div>

                <div>
                  <textarea
                    placeholder={lang === 'ar' ? 'اكتب تجربتك هنا باختصار...' : 'Write a brief review...'}
                    rows={3}
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-3 text-base font-medium text-slate-900 focus:outline-none placeholder-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl py-2.5 text-base font-medium transition"
                >
                  {lang === 'ar' ? 'إرسال التقييم' : 'Submit Review'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl font-sans text-slate-900 space-y-6">
      {/* Customer Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">
            {lang === 'ar' ? 'مرحبًا بك' : 'WELCOME'}
          </span>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
            {user.name}
          </h2>
        </div>
      </div>

      {/* Main Form (Hidden if there's an active request awaiting results) */}
      {!activeRequest ? (
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base font-medium font-bold text-slate-600">
                {lang === 'ar' ? '💡 تعبئة سريعة للتجربة' : '💡 Demo Quick-Fill Presets'}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRESET_PRODUCTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="text-[10px] md:text-base font-medium bg-white hover:bg-slate-850 hover:border-emerald-500/50 border border-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg transition active:scale-95"
                >
                  {lang === 'ar' ? preset.nameAr : preset.nameEn}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-base font-medium font-semibold text-slate-600 uppercase tracking-wider mb-2 font-mono">
              {lang === 'ar' ? 'اسم الدواء أو المنتج المطلوب' : 'Product Name / Description'}
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-3 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'أدخل الدواء بالتفصيل (مثل: أنسولين لانتوس)' : 'Enter exact product name...'}
                required
                value={productName}
                onChange={e => setProductName(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-2.5 text-base font-medium text-slate-900 placeholder-slate-600 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-base font-medium font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">
                {lang === 'ar' ? 'الفئة الطبية' : 'Category'}
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base font-medium text-slate-200 focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="otc">{lang === 'ar' ? 'لا وصفة (OTC)' : 'Over the Counter'}</option>
                <option value="rx">{lang === 'ar' ? 'بوصفة طبيب (Rx)' : 'Prescription'}</option>
                <option value="baby">{lang === 'ar' ? 'عناية بالطفل' : 'Baby Care'}</option>
                <option value="cosmetics">{lang === 'ar' ? 'مستحضرات تجميل' : 'Cosmetics'}</option>
                <option value="supplements">{lang === 'ar' ? 'مكملات غذائية' : 'Supplements'}</option>
                <option value="devices">{lang === 'ar' ? 'أجهزة طبية' : 'Medical Devices'}</option>
                <option value="other">{lang === 'ar' ? 'أخرى' : 'Other'}</option>
              </select>
            </div>

            <div>
              <label className="block text-base font-medium font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">
                {lang === 'ar' ? 'نطاق البحث الجغرافي' : 'Search Radius'}
              </label>
              <select
                value={radiusKm}
                onChange={e => setRadiusKm(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base font-medium text-slate-200 focus:outline-none focus:border-emerald-500 transition font-mono"
              >
                <option value={3}>{lang === 'ar' ? '٣ كم (محيطك المباشر)' : '3 km (Local)'}</option>
                <option value={5}>{lang === 'ar' ? '٥ كم (أغلب المدينة)' : '5 km (Moderate)'}</option>
                <option value={10}>{lang === 'ar' ? '١٠ كم (عنيزة بالكامل)' : '10 km (Citywide)'}</option>
                <option value={50}>{lang === 'ar' ? 'إقليمي (منطقة القصيم)' : 'Regional'}</option>
              </select>
            </div>
          </div>

          {/* Prescription Attachment Mock */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-base font-medium font-semibold text-slate-200">
                {lang === 'ar' ? 'صورة الوصفة الطبية (Rx)' : 'Prescription Photo (Rx)'}
              </span>
              <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">
                {lang === 'ar' ? 'موصى به للأدوية المقيدة' : 'Recommended for Rx'}
              </span>
            </div>

            {!prescriptionAttached ? (
              <button
                type="button"
                onClick={() => {
                  setPrescriptionAttached(true);
                  setPrescriptionUrl('https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=300&auto=format&fit=crop');
                  onLogEvent(
                    'request_created',
                    `أرفق العميل صورة وصفة طبية لطلب الدواء`,
                    `Customer attached a prescription image for the medication`
                  );
                }}
                className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-500/50 rounded-xl py-4 flex flex-col items-center justify-center gap-1.5 transition group"
              >
                <UploadCloud className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition" />
                <span className="text-[10px] text-slate-500">
                  {lang === 'ar' ? 'انقر لمحاكاة إرفاق صورة الوصفة' : 'Click to simulate prescription upload'}
                </span>
              </button>
            ) : (
              <div className="flex items-center justify-between bg-white p-2.5 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-base font-medium font-mono text-slate-600">Prescription_Mock.jpg</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPrescriptionAttached(false);
                    setPrescriptionUrl(null);
                  }}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  {lang === 'ar' ? 'إزالة' : 'Remove'}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-base font-medium font-semibold text-slate-600 uppercase tracking-wider mb-2 font-mono">
              {lang === 'ar' ? 'ملاحظات إضافية للصيدلي (اختياري)' : 'Additional Notes (Optional)'}
            </label>
            <textarea
              placeholder={lang === 'ar' ? 'مثال: أحتاج علبتين، أو اسأل عن توفر التأمين...' : 'e.g., need 2 boxes...'}
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-base font-medium text-slate-900 placeholder-slate-600 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={isBroadcasting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 text-white font-semibold rounded-xl py-3 shadow-lg shadow-emerald-950/20 active:scale-98 transition duration-150 flex items-center justify-center gap-2 text-base font-medium"
          >
            {isBroadcasting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {lang === 'ar' ? `جاري البث (${broadcastProgress}%)...` : `Broadcasting (${broadcastProgress}%)...`}
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                {lang === 'ar' ? 'بث طلب الدواء الآن 📡' : 'Broadcast Medication Demand Now 📡'}
              </>
            )}
          </button>
        </form>
      ) : (
        /* LIVE RESULTS MONITORING PANEL */
        <div className="space-y-5">
          {/* Active Request Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  {lang === 'ar' ? 'بث جاري حالياً' : 'LIVE BROADCAST'}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">
                  {activeRequest.productName}
                </h3>
              </div>
              
              <button
                onClick={() => {
                  setActiveRequest(null);
                  setShowRadiusExpansionPrompt(false);
                  onLogEvent(
                    'request_created',
                    `ألغى العميل طلب البحث الحالي`,
                    `Customer cancelled the active search broadcast`
                  );
                }}
                className="text-base font-medium text-red-400 hover:underline"
              >
                {lang === 'ar' ? 'إلغاء البحث' : 'Stop Search'}
              </button>
            </div>

            <div className="flex items-center justify-between text-base font-medium text-slate-500 border-t border-slate-200/60 pt-3">
              <span>{lang === 'ar' ? `نطاق البحث: ${activeRequest.radiusKm}كم` : `Radius: ${activeRequest.radiusKm}km`}</span>
              <span className="font-mono text-[11px]">{activeRequest.createdAt}</span>
            </div>
          </div>

          {/* Real-time Streaming Response Status */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium font-semibold uppercase tracking-wider text-slate-600 font-mono">
                {lang === 'ar' ? 'الردود المستلمة من الصيدليات' : 'STREAMING PHARMACY RESPONSES'}
              </h3>
              
              <span className="text-base font-medium text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {lang === 'ar' 
                  ? `${activeRequestResponses.length} صيدليات أجابت` 
                  : `${activeRequestResponses.length} replied`}
              </span>
            </div>

            {/* List of responses */}
            {activeRequestResponses.length === 0 ? (
              <div className="border border-slate-200 rounded-2xl p-6 text-center space-y-3 bg-slate-50/10">
                <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mx-auto animate-spin">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-base font-medium text-slate-500">
                  {lang === 'ar' 
                    ? 'في انتظار الصيدليات للاستعلام عن المخزون... (استخدم محاكي الصيدلية للرد!)' 
                    : 'Awaiting pharmacies to query their stock... (Try responding from the Pharmacy tab!)'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRequestResponses.map((res) => (
                  <div 
                    key={res.id} 
                    className="bg-slate-50 border border-slate-200 hover:border-slate-300 p-4 rounded-2xl space-y-3 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-medium font-bold text-slate-900">
                          {getPharmacyName(res.pharmacyId, lang)}
                        </h4>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          📍 {getPharmacyDistance(res.pharmacyId)} كم • {lang === 'ar' ? 'عنيزة' : 'Unaizah'}
                        </span>
                      </div>

                      {/* Response badge */}
                      <div>
                        {res.status === 'available' && (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/50 rounded-full text-[10px] font-bold">
                            {lang === 'ar' ? 'متوفر' : 'Available'}
                          </span>
                        )}
                        {res.status === 'not_available' && (
                          <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800/50 rounded-full text-[10px] font-bold">
                            {lang === 'ar' ? 'غير متوفر' : 'Out of Stock'}
                          </span>
                        )}
                        {res.status === 'alternative' && (
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-800/50 rounded-full text-[10px] font-bold">
                            {lang === 'ar' ? 'بديل متوفر' : 'Alternative'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price and details display */}
                    {(res.status === 'available' || res.status === 'alternative') && (
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/40 text-base font-medium flex justify-between items-center">
                        <div className="space-y-0.5">
                          {res.status === 'alternative' && (
                            <p className="text-[10px] text-amber-300">
                              {lang === 'ar' ? `البديل: ${res.alternativeName}` : `Alt: ${res.alternativeName}`}
                            </p>
                          )}
                          {res.notes && (
                            <p className="text-[10px] text-slate-500">
                              "{res.notes}"
                            </p>
                          )}
                        </div>
                        <div className="text-right font-mono text-emerald-400 font-semibold">
                          {res.price ? `${res.price} SAR` : (lang === 'ar' ? 'تسعير رسمي' : 'Official Pricing')}
                        </div>
                      </div>
                    )}

                    {/* Book Reservation button */}
                    {res.status !== 'not_available' && (
                      <button
                        onClick={() => handleReserve(res)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-xl text-base font-medium transition duration-150"
                      >
                        {lang === 'ar' ? 'احجز هذا واستلم خلال ٣٠ دقيقة ⏱️' : 'Reserve and Hold for 30 Mins ⏱️'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Radius Expansion Prompt Overlay / Banner */}
          {showRadiusExpansionPrompt && activeRequest.radiusKm < 50 && (
            <div className="p-4 bg-slate-50 border border-amber-500/20 rounded-2xl space-y-2.5 shadow-md">
              <div className="flex gap-2 items-start text-base font-medium text-amber-400">
                <Sliders className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p>
                  {lang === 'ar' 
                    ? 'هل تود توسيع دائرة البحث؟ لم تستجب بعض الصيدليات القريبة، يمكنك الاستعلام من نطاق أوسع.' 
                    : 'Would you like to expand your search? No nearby response yet, let\'s query a wider radius.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleExpandRadius}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1.5 px-3 rounded-lg text-base font-medium transition"
              >
                {lang === 'ar' ? `توسيع النطاق إلى ${radiusKm === 3 ? '٥' : '١٠'} كم` : `Expand to ${radiusKm === 3 ? '5' : '10'} km`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
