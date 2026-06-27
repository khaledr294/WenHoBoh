import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Language } from '../types';
import { Globe, LogOut, Building2, Heart } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Layout({ lang, setLang }: { lang: Language, setLang: (lang: Language) => void }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-100 text-slate-900 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Platform Header — Glassmorphism */}
      <header className="sticky top-0 z-40 px-4 py-3 md:px-6 shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(13,110,110,0.12)'
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Logo & Slogan */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none group"
            onClick={() => navigate('/')}
          >
            {/* Brand mark: circular W with teal gradient */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg group-hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg,#0D6E6E,#14B8B8)' }}
            >
              و
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight group-hover:text-teal-700 transition-colors"
                  style={{ color: '#0A0F1E' }}
                >
                  {lang === 'ar' ? 'وينهوبه' : 'WENHOBOH'}
                </h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider"
                  style={{ background: '#E6F7F7', color: '#0D6E6E', border: '1px solid #A7D9D9' }}
                >
                  {lang === 'ar' ? 'عنيزة' : 'Unaizah'}
                </span>
              </div>
              <span className="text-[11px] block -mt-0.5 font-medium text-slate-500">
                {lang === 'ar' ? 'دواؤك، قريب منك' : 'Your Medicine, Nearby'}
              </span>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="flex items-center gap-2.5">
            {!user && (
              <button
                onClick={() => navigate('/partner-pharmacy-login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                style={{
                  background: '#E6F7F7',
                  border: '2px solid #A7D9D9',
                  color: '#0D6E6E'
                }}
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'دخول الشركاء' : 'Partner Portal'}</span>
              </button>
            )}

            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                style={{
                  background: '#FEF2F2',
                  border: '2px solid #FECACA',
                  color: '#B91C1C'
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>{lang === 'ar' ? 'خروج' : 'Logout'}</span>
              </button>
            )}

            {/* Language switch */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700"
            >
              <Globe className="w-4 h-4" style={{ color: '#0D6E6E' }} />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>

        </div>
      </header>

      <Outlet />

      {/* Footer */}
      <footer className="border-t text-xs text-slate-400 py-6 px-4 text-center mt-12 space-y-2"
        style={{ background: '#0A0F1E', borderColor: '#1E293B' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#0D6E6E,#14B8B8)' }}
            >
              و
            </div>
            <p style={{ color: '#64748B' }}>
              {lang === 'ar'
                ? 'وينهوبه — محافظة عنيزة، منطقة القصيم © ٢٠٢٦'
                : 'WENHOBOH Platform — Unaizah, Qassim, Saudi Arabia © 2026'}
            </p>
          </div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: '#475569' }}>
              <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              {lang === 'ar' ? 'رؤية 2030 للتحول الصحي الرقمي' : 'Vision 2030 Healthcare Digitalization'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
