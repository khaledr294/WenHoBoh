import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Language } from '../types';
import { Globe, LogOut, Bot, Heart } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Platform Upper Top Bar */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-4 py-3 md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleLogoClick}>
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
            {/* Exit/Logout Button */}
            {user && (
              <button
                onClick={handleLogout}
                className="bg-red-950/70 hover:bg-red-900 border border-red-800/60 px-3 py-1.5 rounded-xl text-xs font-bold text-red-200 transition duration-150 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
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
