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
      <div className="w-full max-w-4xl flex justify-center">
        
        {/* Card 1: Patient / Customer Portal */}
        <div 
          onClick={() => navigate('/auth/customer')}
          className="group bg-slate-950 hover:bg-slate-900/80 border border-slate-800 hover:border-emerald-500/60 rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-950/10 text-right mx-auto max-w-sm"
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

      </div>
    </div>
  );
}
