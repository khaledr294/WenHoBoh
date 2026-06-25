/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Pharmacy, 
  CustomerRequest, 
  PharmacyResponse, 
  Reservation, 
  ResponseStatus,
  Language 
} from '../types';
import { 
  Building2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileImage, 
  BadgeCheck, 
  Eye, 
  Star,
  Bell,
  Volume2
} from 'lucide-react';

interface PharmacyPortalProps {
  pharmacies: Pharmacy[];
  activeRequest: CustomerRequest | null;
  responses: PharmacyResponse[];
  addResponse: (res: PharmacyResponse) => void;
  activeReservation: Reservation | null;
  setActiveReservation: (res: Reservation | null) => void;
  lang: Language;
  onLogEvent: (type: any, msgAr: string, msgEn: string) => void;
}

export default function PharmacyPortal({
  pharmacies,
  activeRequest,
  responses,
  addResponse,
  activeReservation,
  setActiveReservation,
  lang,
  onLogEvent,
}: PharmacyPortalProps) {
  // Currently active selected pharmacy viewpoint
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>(pharmacies[0].id);

  // Response form states
  const [alternativeName, setAlternativeName] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [showAlternativeForm, setShowAlternativeForm] = useState(false);
  const [viewPrescriptionModal, setViewPrescriptionModal] = useState(false);

  const activePharmacy = pharmacies.find(p => p.id === selectedPharmacyId) || pharmacies[0];

  const getPharmacyDistance = (id: string) => {
    const distances: Record<string, number> = {
      'p-sina': 1.2,
      'p-fahd': 2.5,
      'p-nahdi': 3.1,
      'p-kunooz': 4.8,
      'p-care': 6.2
    };
    return distances[id] || 3.5;
  };

  // Play simulated chime when notification arrives
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio Context blocked or unsupported");
    }
  };

  // Submit response handler
  const handleSendResponse = (status: ResponseStatus) => {
    if (!activeRequest) return;

    // Check if already responded
    const alreadyResponded = responses.some(
      r => r.requestId === activeRequest.id && r.pharmacyId === activePharmacy.id
    );
    if (alreadyResponded) return;

    const responsePrice = priceInput ? parseFloat(priceInput) : undefined;

    const newResponse: PharmacyResponse = {
      id: 'resp-' + Math.random().toString(36).substr(2, 5),
      requestId: activeRequest.id,
      pharmacyId: activePharmacy.id,
      status,
      alternativeName: status === 'alternative' ? alternativeName : undefined,
      price: responsePrice,
      notes: notesInput.trim() || undefined,
      respondedAt: new Date().toLocaleTimeString()
    };

    addResponse(newResponse);

    // Reset inputs
    setAlternativeName('');
    setPriceInput('');
    setNotesInput('');
    setShowAlternativeForm(false);

    const statusTextAr = status === 'available' 
      ? 'متوفر' 
      : status === 'not_available' 
        ? 'غير متوفر' 
        : `بديل (${alternativeName})`;
    
    const statusTextEn = status === 'available' 
      ? 'Available' 
      : status === 'not_available' 
        ? 'Out of Stock' 
        : `Alternative (${alternativeName})`;

    onLogEvent(
      'response_sent',
      `أرسلت صيدلية ${activePharmacy.nameAr} رداً بـ: ${statusTextAr}`,
      `Pharmacy ${activePharmacy.nameEn} responded with: ${statusTextEn}`
    );
  };

  // Resolve reservation status
  const handleResolveReservation = (newStatus: 'completed' | 'no_show' | 'cancelled_pharmacy') => {
    if (!activeReservation) return;

    setActiveReservation({
      ...activeReservation,
      status: newStatus
    });

    const statusMapAr = {
      completed: 'مكتمل (تم استلام الدواء)',
      no_show: 'لم يحضر العميل',
      cancelled_pharmacy: 'ألغي من طرف الصيدلية'
    };

    const statusMapEn = {
      completed: 'Completed (Medicine Picked Up)',
      no_show: 'Customer No-Show',
      cancelled_pharmacy: 'Cancelled by Pharmacy'
    };

    onLogEvent(
      'reservation_completed',
      `حدثت صيدلية ${activePharmacy.nameAr} حالة الحجز إلى: ${statusMapAr[newStatus]}`,
      `Pharmacy ${activePharmacy.nameEn} updated reservation status to: ${statusMapEn[newStatus]}`
    );
  };

  // Check if current pharmacy has already responded to the active request
  const hasResponded = activeRequest 
    ? responses.some(r => r.requestId === activeRequest.id && r.pharmacyId === activePharmacy.id)
    : false;

  const currentResponse = activeRequest
    ? responses.find(r => r.requestId === activeRequest.id && r.pharmacyId === activePharmacy.id)
    : null;

  // Filter reservations for current selected pharmacy
  const pharmacyReservation = activeReservation?.pharmacyId === activePharmacy.id ? activeReservation : null;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl font-sans text-slate-900 space-y-6">
      
      {/* Pharmacy Switcher Header */}
      <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 font-mono font-semibold uppercase tracking-wider">
            {lang === 'ar' ? 'منفذ الصيدلي' : 'PHARMACIST TERMINAL'}
          </span>
          <h2 className="text-base font-medium font-bold text-slate-600 mt-1">
            {lang === 'ar' ? 'حدد الصيدلية للمحاكاة' : 'Switch Pharmacy Viewpoint'}
          </h2>
        </div>

        <select
          value={selectedPharmacyId}
          onChange={(e) => setSelectedPharmacyId(e.target.value)}
          className="bg-white border border-slate-200 text-base font-medium text-emerald-400 font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
        >
          {pharmacies.map(p => (
            <option key={p.id} value={p.id}>
              {lang === 'ar' ? p.nameAr : p.nameEn}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Pharmacy Bio & License Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-200/50 p-4 rounded-2xl gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'ar' ? activePharmacy.nameAr : activePharmacy.nameEn}
              </h3>
              {activePharmacy.isVerified && (
                <BadgeCheck className="w-4 h-4 text-emerald-400 fill-emerald-950" />
              )}
            </div>
            <p className="text-base font-medium text-slate-500 mt-0.5">
              {lang === 'ar' ? activePharmacy.addressAr : activePharmacy.addressEn}
            </p>
          </div>
        </div>

        <div className="flex gap-4 text-center sm:text-right text-base font-medium">
          <div>
            <span className="text-[9px] text-slate-500 block font-mono">RATING</span>
            <span className="font-semibold text-amber-400 flex items-center justify-center sm:justify-end gap-0.5 font-mono">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {activePharmacy.rating}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block font-mono">RESP. RATE</span>
            <span className="font-semibold text-emerald-400 font-mono">
              {activePharmacy.responseRate}%
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block font-mono">LICENSE</span>
            <span className={`font-semibold ${activePharmacy.isVerified ? 'text-emerald-400' : 'text-amber-500'}`}>
              {activePharmacy.isVerified ? (lang === 'ar' ? 'معتمد' : 'Verified') : (lang === 'ar' ? 'قيد التدقيق' : 'Pending')}
            </span>
          </div>
        </div>
      </div>

      {/* Reservation Section (If any reservation exists for this pharmacy) */}
      {pharmacyReservation && (
        <div className="bg-blue-950/20 border border-blue-900/40 p-4 rounded-2xl space-y-3.5">
          <div className="flex justify-between items-center border-b border-blue-900/30 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <h4 className="text-base font-medium font-bold text-blue-300">
                {lang === 'ar' ? 'حجز نشط معلق' : 'Active Reservation Request'}
              </h4>
            </div>
            <span className="text-base font-medium font-mono text-slate-500">
              #{pharmacyReservation.id}
            </span>
          </div>

          <div className="text-base font-medium space-y-1.5 text-slate-600">
            <p>
              <strong className="text-slate-500">{lang === 'ar' ? 'المنتج المحجوز: ' : 'Reserved Item: '}</strong>
              <span className="text-slate-900 font-semibold">{activeRequest?.productName}</span>
            </p>
            <p>
              <strong className="text-slate-500">{lang === 'ar' ? 'العميل: ' : 'Customer: '}</strong>
              <span className="font-mono">{pharmacyReservation.customerPhone}</span>
            </p>
            <p>
              <strong className="text-slate-500">{lang === 'ar' ? 'الموقع: ' : 'Distance: '}</strong>
              <span>بعيد بمقدار {getPharmacyDistance(activePharmacy.id)} كم</span>
            </p>
          </div>

          {pharmacyReservation.status === 'active' && (
            <div className="flex gap-2 pt-1.5">
              <button
                onClick={() => handleResolveReservation('completed')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-xl text-base font-medium transition"
              >
                {lang === 'ar' ? 'تسليم الدواء بنجاح (مكتمل)' : 'Confirm Complete Pickup'}
              </button>
              <button
                onClick={() => handleResolveReservation('no_show')}
                className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-850 py-2 px-3 rounded-xl text-base font-medium transition"
              >
                {lang === 'ar' ? 'لم يحضر العميل' : 'Mark No-Show'}
              </button>
            </div>
          )}

          {pharmacyReservation.status !== 'active' && (
            <div className="text-center p-2 bg-slate-50/80 rounded-xl text-base font-medium font-semibold text-slate-500">
              {pharmacyReservation.status === 'completed' && (lang === 'ar' ? '✓ تم تسليم الطلب واكتمل بنجاح!' : '✓ Reservation Completed Successfully!')}
              {pharmacyReservation.status === 'no_show' && (lang === 'ar' ? '✗ تم الإبلاغ عن عدم حضور العميل' : '✗ Marked as No-Show')}
            </div>
          )}
        </div>
      )}

      {/* Broadcast Inbox / Active Alerts */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-medium font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-500" />
            {lang === 'ar' ? 'طلبات المرضى النشطة بالقرب منك' : 'INCOMING DEMAND BROADCASTS'}
          </h3>
          <button 
            onClick={playAlertSound}
            className="p-1 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition"
            title="Test sound alert"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {!activeRequest ? (
          <div className="border border-slate-850 rounded-2xl p-8 text-center space-y-2 bg-slate-50/10">
            <BadgeCheck className="w-10 h-10 text-slate-700 mx-auto mb-1" />
            <p className="text-base font-medium text-slate-500 font-semibold">
              {lang === 'ar' ? 'لا توجد طلبات جارية حالياً' : 'No Active Broadcasts Nearby'}
            </p>
            <p className="text-base font-medium text-slate-500">
              {lang === 'ar' 
                ? 'استخدم بوابة العميل لبث طلب دواء وسترى إشعاراً يرن هنا فوراً!' 
                : 'Broadcast a search from the Customer tab to trigger an active alert here!'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            
            {/* Header of Request */}
            <div className="flex justify-between items-start border-b border-slate-200/60 pb-3">
              <div>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-900/50 rounded-full text-[9px] font-bold tracking-wide uppercase font-mono animate-pulse">
                  {lang === 'ar' ? 'طلب فوري جديد دقيقة واحدة' : 'NEW BROADCAST ALERT'}
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-1.5">
                  {activeRequest.productName}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">
                  📍 العميل يقع على بعد {getPharmacyDistance(activePharmacy.id)} كم من موقعك
                </p>
              </div>

              {/* Category indicator */}
              <span className="text-[11px] font-semibold text-slate-600 font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200">
                {activeRequest.category.toUpperCase()}
              </span>
            </div>

            {/* Notes or prescription attached */}
            {activeRequest.notes && (
              <div className="text-base font-medium text-slate-500 bg-white/40 p-3 rounded-xl border border-slate-200/40">
                <span className="font-semibold block text-[10px] text-slate-500 mb-1">
                  {lang === 'ar' ? 'ملاحظة العميل:' : 'CUSTOMER NOTE:'}
                </span>
                "{activeRequest.notes}"
              </div>
            )}

            {activeRequest.prescriptionImage && (
              <div className="flex items-center justify-between bg-white p-3 border border-slate-200/60 rounded-xl">
                <div className="flex items-center gap-2 text-base font-medium">
                  <FileImage className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'ar' ? 'صورة الوصفة الطبية مرفقة' : 'Prescription Image Attached'}</span>
                </div>
                <button
                  onClick={() => setViewPrescriptionModal(true)}
                  className="bg-slate-50 hover:bg-slate-100 text-base font-medium px-2.5 py-1.5 rounded-lg text-slate-600 flex items-center gap-1 border border-slate-200 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'عرض الوصفة' : 'View Image'}
                </button>
              </div>
            )}

            {/* Verification Warning for Rx category */}
            {activeRequest.category === 'rx' && (
              <div className="p-3 bg-amber-950/20 border border-amber-900/20 rounded-xl text-[11px] text-amber-400 flex gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  {lang === 'ar' 
                    ? 'تنبيه: هذا دواء خاضع للوصفة الطبية. يجب مراجعة الوصفة وإرفاقها قبل تسليم المنتج للعميل.' 
                    : 'Attention: Prescription required for this medication. Review prescription prior to dispensing.'}
                </p>
              </div>
            )}

            {/* Answer Control Pad */}
            <div className="border-t border-slate-200/60 pt-4">
              {hasResponded ? (
                <div className="p-4 bg-white text-center rounded-xl border border-slate-200 text-base font-medium font-semibold text-emerald-400 space-y-1">
                  <p>✓ {lang === 'ar' ? 'تم إرسال رد صيدليتك بنجاح للعميل!' : '✓ Your reply has been broadcasted to the customer!'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Status: {currentResponse?.status.toUpperCase()} 
                    {currentResponse?.price ? ` • Price: ${currentResponse.price} SAR` : ''}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium font-semibold text-slate-600">
                      {lang === 'ar' ? 'حدد توفر المنتج:' : 'Quotation Status:'}
                    </span>
                  </div>

                  {!showAlternativeForm ? (
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          // Quick available reply
                          handleSendResponse('available');
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-base font-medium transition"
                      >
                        {lang === 'ar' ? 'متوفر ✓' : 'Available ✓'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Out of stock
                          handleSendResponse('not_available');
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-base font-medium transition"
                      >
                        {lang === 'ar' ? 'غير متوفر ✗' : 'Out of Stock ✗'}
                      </button>

                      {activeRequest.acceptsAlternative !== false && (
                        <button
                          type="button"
                          onClick={() => setShowAlternativeForm(true)}
                          className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl text-base font-medium transition"
                        >
                          {lang === 'ar' ? 'توفير بديل 🔄' : 'Offer Alt 🔄'}
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Alternative product form */
                    <div className="bg-white p-4 border border-slate-850 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-1">
                        <span className="text-base font-medium font-bold text-amber-400">
                          {lang === 'ar' ? 'اقتراح منتج بديل متوفر' : 'Propose Alternative medicine'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAlternativeForm(false)}
                          className="text-[10px] text-slate-500 hover:text-slate-900"
                        >
                          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            {lang === 'ar' ? 'اسم المنتج البديل' : 'Alternative Product Name'}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={lang === 'ar' ? 'مثال: بنادول أدفانس' : 'e.g., Panadol Advance'}
                            value={alternativeName}
                            onChange={e => setAlternativeName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-base font-medium focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            {lang === 'ar' ? 'السعر الاختياري (SAR)' : 'Price (SAR)'}
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 15"
                            value={priceInput}
                            onChange={e => setPriceInput(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-base font-medium focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          {lang === 'ar' ? 'ملاحظة بديل (مثل: نفس الفعالية وبسعر أقل)' : 'Note for Customer'}
                        </label>
                        <input
                          type="text"
                          placeholder={lang === 'ar' ? 'مثال: علبة ٢٠ حبة، نفس المادة العلمية' : 'e.g. Same active ingredient'}
                          value={notesInput}
                          onChange={e => setNotesInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-base font-medium focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendResponse('alternative')}
                        disabled={!alternativeName}
                        className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-100 text-white font-bold py-2 rounded-xl text-base font-medium transition"
                      >
                        {lang === 'ar' ? 'إرسال عرض البديل للعميل' : 'Send Alternative Offer'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Prescription View Modal */}
      {viewPrescriptionModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-medium font-bold text-slate-900">
                {lang === 'ar' ? 'وصفة طبية معتمدة' : 'Official Physician Prescription'}
              </h3>
              <button
                onClick={() => setViewPrescriptionModal(false)}
                className="text-slate-500 hover:text-slate-900"
              >
                ✕
              </button>
            </div>
            
            <div className="rounded-xl overflow-hidden bg-white border border-slate-200 p-2 text-center relative">
              <img
                src={activeRequest?.prescriptionImage || ''}
                alt="Rx prescription"
                referrerPolicy="no-referrer"
                className="w-full h-64 object-contain"
              />
              <div className="absolute top-2 right-2 bg-white text-[9px] text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                SIMULATED Rx
              </div>
            </div>

            <div className="text-center">
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' 
                  ? 'يرجى مراجعة الاسم العلمي والجرعات المعتمدة وتطابقها مع المستودع.' 
                  : 'Please check scientific ingredient name & dosages to match pharmacy stock.'}
              </p>
            </div>

            <button
              onClick={() => setViewPrescriptionModal(false)}
              className="w-full bg-white hover:bg-slate-850 text-slate-600 border border-slate-200 text-base font-medium py-2 rounded-xl transition font-semibold"
            >
              {lang === 'ar' ? 'تمت المراجعة والتحقق' : 'Close and Verify'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
