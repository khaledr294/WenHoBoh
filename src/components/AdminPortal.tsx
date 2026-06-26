/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Pharmacy, SystemEvent, Language } from '../types';
import { 
  ShieldAlert, 
  Users, 
  Building, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  UserCheck, 
  Calendar,
  Layers,
  Globe,
  Key,
  Cloud
} from 'lucide-react';

interface AdminPortalProps {
  pharmacies: Pharmacy[];
  setPharmacies: React.Dispatch<React.SetStateAction<Pharmacy[]>>;
  events: SystemEvent[];
  lang: Language;
  onLogEvent: (type: any, msgAr: string, msgEn: string) => void;
  onClearDatabase?: () => void;
}

interface PendingPharmacy {
  id: string;
  nameAr: string;
  nameEn: string;
  crNumber: string;
  licenseNumber: string;
  addressAr: string;
  addressEn: string;
}

export default function AdminPortal({
  pharmacies,
  setPharmacies,
  events,
  lang,
  onLogEvent,
  onClearDatabase,
}: AdminPortalProps) {
  // Pending verification list
  const pendingList = pharmacies.filter(p => p.status === 'pending');

  // Handle Approve Licensing
  const handleApprovePharmacy = async (pending: Pharmacy) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await updateDoc(doc(db, 'pharmacies', pending.id), {
        status: 'active',
        isVerified: true
      });
      onLogEvent(
        'verification_approved',
        `وافق المسؤول على ترخيص صيدلية ${pending.nameAr} بعد التحقق من سجل وزارة الصحة`,
        `Admin approved licensing for ${pending.nameEn} after verifying Ministry of Health database`
      );
    } catch (e) {
      alert('Error approving pharmacy');
    }
  };

  // Reject licensing
  const handleRejectPharmacy = async (pending: Pharmacy) => {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await deleteDoc(doc(db, 'pharmacies', pending.id));
      onLogEvent(
        'abuse_warning',
        `تم رفض ترخيص صيدلية ${pending.nameAr} لعدم كفاية الوثائق المقدمة`,
        `Admin rejected licensing for ${pending.nameEn} due to insufficient documentation`
      );
    } catch (e) {
      alert('Error rejecting pharmacy');
    }
  };

  // Stats calculation
  const totalPharmacies = pharmacies.length;
  const verifiedPharmacies = pharmacies.filter(p => p.isVerified).length;
  const activeBroadcasting = events.filter(e => e.type === 'request_created').length;
  const totalBookings = events.filter(e => e.type === 'reservation_created').length;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl font-sans text-slate-900 space-y-6">
      
      {/* Admin Title Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] bg-red-950/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded font-mono font-semibold tracking-wider uppercase">
            {lang === 'ar' ? 'بوابة الرقابة والعمليات' : 'OPERATIONS BACK-OFFICE'}
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            {lang === 'ar' ? 'لوحة تحكم المشرف العام' : 'Platform Administrator Panel'}
          </h2>
        </div>
        
        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          SYS_ONLINE
        </div>
      </div>

      {/* Analytics Executive Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <Building className="w-4 h-4 text-emerald-400 mb-2" />
          <span className="text-[10px] text-slate-600 uppercase tracking-wider block font-semibold font-mono">
            {lang === 'ar' ? 'إجمالي الصيدليات' : 'TOTAL PHARMACIES'}
          </span>
          <span className="text-lg font-bold text-slate-900 font-mono">{totalPharmacies}</span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <UserCheck className="w-4 h-4 text-emerald-400 mb-2" />
          <span className="text-[10px] text-slate-600 uppercase tracking-wider block font-semibold font-mono">
            {lang === 'ar' ? 'المرخصة والمعتمدة' : 'MOH VERIFIED'}
          </span>
          <span className="text-lg font-bold text-emerald-400 font-mono">{verifiedPharmacies}</span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <Activity className="w-4 h-4 text-emerald-400 mb-2" />
          <span className="text-[10px] text-slate-600 uppercase tracking-wider block font-semibold font-mono">
            {lang === 'ar' ? 'بث طلبات المرضى' : 'DEMAND BROADCASTS'}
          </span>
          <span className="text-lg font-bold text-slate-900 font-mono">{activeBroadcasting}</span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-400 mb-2" />
          <span className="text-[10px] text-slate-600 uppercase tracking-wider block font-semibold font-mono">
            {lang === 'ar' ? 'الحجوزات والتعميد' : 'COMPLETED JOBS'}
          </span>
          <span className="text-lg font-bold text-slate-900 font-mono">{totalBookings}</span>
        </div>
      </div>

      {/* Licensing Queue (Supply Side Protection) */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 font-mono flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          {lang === 'ar' ? 'طلبات ترخيص الصيدليات المعلقة' : 'MOH LICENSE VERIFICATION QUEUE'}
        </h3>

        {pendingList.length === 0 ? (
          <div className="p-4 bg-slate-50/40 border border-slate-850 rounded-xl text-center text-xs text-slate-500">
            {lang === 'ar' ? 'كل طلبات الترخيص مكتملة ومعتمدة!' : 'All license review requests successfully resolved!'}
          </div>
        ) : (
          <div className="space-y-3">
            {pendingList.map((pending) => (
              <div 
                key={pending.id}
                className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b border-slate-200/50 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {lang === 'ar' ? pending.nameAr : pending.nameEn}
                    </h4>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      📍 {lang === 'ar' ? pending.addressAr : pending.addressEn}
                    </p>
                  </div>

                  <span className="text-[10px] bg-white px-2.5 py-1 rounded-md border border-slate-200 font-mono text-amber-400">
                    MOH CHECK
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-xs justify-between bg-white p-2.5 rounded-xl border border-slate-200/40">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-mono block">MOH LICENSE</span>
                    <span className="font-mono text-slate-700 font-semibold">{pending.licenseNumber}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprovePharmacy(pending)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-xl text-xs transition"
                  >
                    {lang === 'ar' ? 'اعتماد الترخيص ✓' : 'Approve & Activate ✓'}
                  </button>
                  <button
                    onClick={() => handleRejectPharmacy(pending)}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-red-400 font-semibold py-1.5 px-3 rounded-xl text-xs transition"
                  >
                    {lang === 'ar' ? 'رفض الطلب' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Database Management Card */}
      {onClearDatabase && (
        <div className="bg-slate-50 border border-red-950 rounded-2xl p-4 space-y-3.5">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 font-mono">
              {lang === 'ar' ? 'إدارة قاعدة البيانات والبيانات الحقيقية' : 'DATABASE SLATE MANAGEMENT'}
            </h3>
            <span className="text-[10px] bg-red-950 text-red-400 border border-red-900/40 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
              {lang === 'ar' ? 'خطر' : 'DANGER ZONE'}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {lang === 'ar'
              ? 'يمسح هذا الخيار كافة طلبات المرضى السابقة، الردود، التقييمات، وعمليات الحجز، لإرجاع المنصة نظيفة وبدء العمل ببيانات واقعية في الميدان.'
              : 'Wipe out all temporary clinical demands, response tickets, reservation locks, and event logs. Instantly prepare the system for direct field use.'}
          </p>
          <button
            onClick={() => {
              if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من مسح جميع البيانات لبدء التشغيل الفعلي؟' : 'Are you sure you want to clear all data to start the production pilot?')) {
                onClearDatabase();
              }
            }}
            className="w-full bg-red-950 hover:bg-red-900 text-red-200 hover:text-slate-900 font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 border border-red-800/60"
          >
            {lang === 'ar' ? '🧹 مسح بيانات التجارب والبدء ببيانات واقعية' : '🧹 Clear Experimental Data & Start Fresh Pilot'}
          </button>
        </div>
      )}

      {/* دليل التشغيل والإنتاج والخرائط الفعلي - Production Deployment & Maps Setup Guide */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Globe className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'ar' ? 'دليل التشغيل والإنتاج الفعلي 🚀' : 'Production Deployment & Launch Guide 🚀'}
            </h3>
            <p className="text-[10px] text-slate-600">
              {lang === 'ar' ? 'جاهز للتشغيل الحي والميداني الفوري لخدمة المجتمع' : 'Fully prepared for direct field and community launch'}
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Step 1: Firebase Cloud DB */}
          <div className="bg-white p-3 rounded-xl border border-slate-850 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Cloud className="w-4 h-4" />
              <span>{lang === 'ar' ? '1. قاعدة بيانات سحابية حقيقية ومباشرة' : '1. Real & Live Cloud Database'}</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              {lang === 'ar' 
                ? 'البرنامج تم ربطه وتفعيله بالكامل على قاعدة بيانات سحابية حقيقية (Firebase Firestore) وهي تعمل بكفاءة حية وبدون فترات انقطاع. أي طلب، رد، صيدلية جديدة، أو حجز يتم مزامنته فوراً في نفس اللحظة عبر الويب لجميع الصيدليات والعملاء!' 
                : 'The application is completely integrated with a high-performance live cloud database (Firebase Firestore). All pharmacy updates, customer broadcasts, responses, and booking locks sync instantly in real-time across the entire network.'}
            </p>
          </div>

          {/* Step 2: Google Maps Key */}
          <div className="bg-white p-3 rounded-xl border border-slate-850 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <Key className="w-4 h-4" />
              <span>{lang === 'ar' ? '2. كيفية الحصول على مفتاح خرائط جوجل الحقيقي' : '2. How to Get a Real Google Maps Key'}</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              {lang === 'ar'
                ? 'لتشغيل خرائط جوجل الحقيقية واحتساب المسارات الواقعية بدقة في عنيزة، اتبع الخطوات التالية للحصول على المفتاح:'
                : 'To display official Google Maps & compute precise driving times, follow these steps to secure your API Key:'}
            </p>
            <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1 pl-1">
              <li>
                {lang === 'ar'
                  ? 'اذهب إلى منصة جوجل السحابية: console.cloud.google.com'
                  : 'Go to Google Cloud Console at console.cloud.google.com'}
              </li>
              <li>
                {lang === 'ar'
                  ? 'أنشئ مشروعاً جديداً ثم فعل مكتبة: Maps JavaScript API و Directions API.'
                  : 'Create a new project and enable both the Maps JavaScript API and Directions API.'}
              </li>
              <li>
                {lang === 'ar'
                  ? 'اذهب إلى Credentials ثم أنشئ مفتاح واجهة برمجة تطبيقات (API Key).'
                  : 'Under Credentials, generate a new API Key.'}
              </li>
              <li>
                {lang === 'ar'
                  ? 'قم بتفعيل الفوترة (Billing) على المشروع (تمنحك جوجل رصيداً مجانياً 200$ شهرياً، وهو ما يغطي آلاف الطلبات مجاناً).'
                  : 'Ensure Billing is active (Google awards $200 free credits monthly, fully covering early to mid stages).'}
              </li>
              <li>
                {lang === 'ar'
                  ? 'انسخ المفتاح وضعه في قائمة الإعدادات (⚙️ Settings -> Secrets) باسم GOOGLE_MAPS_PLATFORM_KEY.'
                  : 'Copy your key and place it under ⚙️ Settings -> Secrets as GOOGLE_MAPS_PLATFORM_KEY.'}
              </li>
            </ol>
          </div>

          {/* Step 3: Cloudflare Hosting */}
          <div className="bg-white p-3 rounded-xl border border-slate-850 space-y-1.5">
            <div className="flex items-center gap-2 text-purple-400 font-bold">
              <Globe className="w-4 h-4" />
              <span>{lang === 'ar' ? '3. الاستضافة والرفع المجاني على Cloudflare' : '3. Free Production Hosting on Cloudflare'}</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              {lang === 'ar'
                ? 'لقد قمنا بإعداد وتضمين ملف wrangler.json لتكون المنصة جاهزة تماماً للرفع بضغطة زر واحدة مجاناً ومدى الحياة على شبكة Cloudflare Pages السريعة. للرفع الفعلي:'
                : 'We have compiled and pre-configured wrangler.json, enabling instant lifetime-free deployment directly to Cloudflare Pages high-speed global CDN.'}
            </p>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10.5px] font-mono text-purple-300 select-all">
              npm run build && npx wrangler deploy
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Event Log */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          {lang === 'ar' ? 'سجل العمليات المباشر للنظام' : 'SYS REAL-TIME LEDGER'}
        </h3>

        <div className="bg-white border border-slate-850 rounded-2xl p-4 max-h-[160px] overflow-y-auto space-y-2 font-mono text-[10px] md:text-xs">
          {events.length === 0 ? (
            <p className="text-slate-600 text-center py-4">No events logged yet.</p>
          ) : (
            [...events].reverse().map((event) => {
              let color = 'text-slate-600';
              if (event.type === 'request_created') color = 'text-emerald-400';
              if (event.type === 'response_sent') color = 'text-blue-400';
              if (event.type === 'reservation_created') color = 'text-amber-400';
              if (event.type === 'verification_approved') color = 'text-green-400';
              if (event.type === 'abuse_warning') color = 'text-red-400';

              return (
                <div key={event.id} className="flex gap-2.5 py-1 border-b border-slate-900/50 last:border-0 leading-relaxed">
                  <span className="text-slate-600 flex-shrink-0">[{event.timestamp}]</span>
                  <span className={`${color} font-bold flex-shrink-0`}>[{event.type.toUpperCase()}]</span>
                  <span className="text-slate-700">
                    {lang === 'ar' ? event.messageAr : event.messageEn}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
