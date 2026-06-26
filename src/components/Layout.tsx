import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Language } from '../types';
import { Globe, LogOut, Bot, Heart, Building2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Layout({ lang, setLang }: any) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [secretClicks, setSecretClicks] = React.useState(0);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleLogoClick = () => {
    if (secretClicks + 1 >= 5) {
      setSecretClicks(0);
      navigate('/system-admin-portal');
    } else {
      setSecretClicks(prev => prev + 1);
      if (secretClicks === 0) {
        navigate('/');
      }
    }
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Platform Upper Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 md:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={handleLogoClick}>
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-md shadow-emerald-600/20 group-hover:bg-emerald-500 transition-colors">
              و
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800 tracking-tight font-display group-hover:text-emerald-700 transition-colors">
                  {lang === 'ar' ? 'وينهوبه' : 'WENHOBOH'}
                </h1>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">
                  {lang === 'ar' ? 'عنيزة' : 'Unaizah'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block -mt-0.5 font-medium">
                {lang === 'ar' ? 'اكتشاف وتأكيد توفر دواءك في دقائق معدودة' : 'Medication demand-broadcast & reservation engine'}
              </span>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="flex items-center gap-2.5">
            {!user && (
              <button
                onClick={() => navigate('/partner-pharmacy-login')}
                className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-100 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'دخول الشركاء' : 'Partner Portal'}</span>
              </button>
            )}

            {/* Exit/Logout Button */}
            {user && (
              <button
                onClick={handleLogout}
                className="bg-red-50 hover:bg-red-100 border-2 border-red-100 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
              </button>
            )}

            {/* Language switch */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>

        </div>
      </header>

      <Outlet />

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
