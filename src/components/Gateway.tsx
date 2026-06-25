import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Language } from '../types';
import { MapPin, Users, Building2, LayoutGrid, ArrowRightLeft } from 'lucide-react';

export default function Gateway({ lang }: { lang: Language }) {
  const navigate = useNavigate();

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-16 flex flex-col justify-center items-center">
      
      {/* Main Hero Header */}
      <div className="text-center max-w-2xl mb-16 space-y-5">
        <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center font-bold text-white text-4xl shadow-xl shadow-emerald-600/20 mx-auto">
          و
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">
            {lang === 'ar' ? 'بوابة الدخول الموحدة' : 'Unified Entrance Portal'}
          </h1>
          <p className="text-base md:text-lg text-slate-600 font-medium max-w-xl mx-auto leading-relaxed">
            {lang === 'ar' 
              ? 'منصة الربط المباشر لطلب الأدوية واستقبال عروض الأسعار والحجوزات الفورية - محافظة عنيزة' 
              : 'Direct broadcast engine for medication searches, quotes, and instant pickup reservations - Unaizah'}
          </p>
        </div>
        
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-100 px-4 py-2 rounded-full text-sm font-bold tracking-wide shadow-sm">
          <MapPin className="w-4 h-4" />
          {lang === 'ar' ? 'منطقة القصيم - المملكة العربية السعودية' : 'Qassim Region - Kingdom of Saudi Arabia'}
        </div>
      </div>

      {/* Selector Grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
        
        {/* Card 1: Customer Portal */}
        <div 
          onClick={() => navigate('/auth/customer')}
          className="group bg-white hover:bg-emerald-50 border-2 border-emerald-100 hover:border-emerald-500 rounded-[2rem] p-8 md:p-10 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-900/10 text-center sm:text-right"
        >
          <div className="space-y-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition duration-300 mx-auto sm:mx-0 shadow-sm">
              <Users className="w-10 h-10" />
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black text-slate-800 group-hover:text-emerald-700 transition">
                {lang === 'ar' ? 'دخول العملاء' : 'Customers'}
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed font-semibold">
                {lang === 'ar' 
                  ? 'ابحث عن الأدوية، ارفع الوصفة الطبية، واطلب من جميع الصيدليات المحيطة بك لتصلك العروض فوراً بكل سهولة.' 
                  : 'Search for medicines, upload prescriptions, and request from nearby pharmacies easily.'}
              </p>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t-2 border-emerald-100 flex justify-between items-center text-xl font-black text-emerald-600">
            <span>{lang === 'ar' ? 'اضغط هنا للدخول' : 'Click to enter'}</span>
            <span className="text-2xl group-hover:-translate-x-3 transition-transform">←</span>
          </div>
        </div>

        {/* Card 2: Pharmacy Portal */}
        <div 
          onClick={() => navigate('/auth/pharmacy')}
          className="group bg-white hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-500 rounded-[2rem] p-8 md:p-10 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-900/10 text-center sm:text-right opacity-90 hover:opacity-100"
        >
          <div className="space-y-6">
            <div className="w-20 h-20 bg-slate-100 rounded-[1.5rem] flex items-center justify-center text-slate-600 group-hover:bg-blue-500 group-hover:text-white transition duration-300 mx-auto sm:mx-0 shadow-sm">
              <Building2 className="w-10 h-10" />
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black text-slate-800 group-hover:text-blue-700 transition">
                {lang === 'ar' ? 'بوابة الصيدليات' : 'Pharmacy Portal'}
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed font-semibold">
                {lang === 'ar' 
                  ? 'استقبل طلبات الأدوية من العملاء في منطقتك، قدم عروض الأسعار، وأكد توفر الأدوية بشكل مباشر.' 
                  : 'Receive medication requests from patients in your area and submit quotes.'}
              </p>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t-2 border-slate-200 flex justify-between items-center text-xl font-black text-slate-600 group-hover:text-blue-600">
            <span>{lang === 'ar' ? 'دخول الشركاء' : 'Enter Portal'}</span>
            <span className="text-2xl group-hover:-translate-x-3 transition-transform">←</span>
          </div>
        </div>
      </div>
    </div>
  );
}
