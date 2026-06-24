import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Language } from '../types';
import { MapPin, Users, Building2, LayoutGrid, ArrowRightLeft } from 'lucide-react';

export default function Gateway({ lang }: { lang: Language }) {
  const navigate = useNavigate();

  return (
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
          onClick={() => navigate('/auth/customer')}
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
          onClick={() => navigate('/auth/pharmacy')}
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
          onClick={() => navigate('/auth/admin')}
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
    </div>
  );
}
