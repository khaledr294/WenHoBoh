import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Pharmacy, Language } from '../types';
import { Lock, Mail, Building2, User, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthPageProps {
  role: 'customer' | 'pharmacy' | 'admin';
  lang: Language;
}

export default function AuthPage({ role, lang }: AuthPageProps) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate(`/${role}`);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        
        // Setup initial documents
        if (role === 'pharmacy') {
          const newPharmacy: Pharmacy = {
            id: userCred.user.uid,
            nameAr: name,
            nameEn: name,
            addressAr: 'عنيزة',
            addressEn: 'Unaizah',
            latitude: 26.085,
            longitude: 43.990,
            isVerified: false,
            licenseNumber: license,
            rating: 5,
            responseRate: 100,
            avgResponseTimeSec: 60,
            status: 'pending'
          };
          await setDoc(doc(db, 'pharmacies', userCred.user.uid), newPharmacy);
        } else if (role === 'customer') {
          await setDoc(doc(db, 'customers', userCred.user.uid), {
            id: userCred.user.uid,
            name,
            phone,
            email,
            createdAt: new Date().toISOString()
          });
        }
        
        navigate(`/${role}`);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    customer: lang === 'ar' ? 'مريض' : 'Patient',
    pharmacy: lang === 'ar' ? 'صيدلي' : 'Pharmacist',
    admin: lang === 'ar' ? 'مسؤول' : 'Admin'
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 p-8 rounded-3xl shadow-2xl animate-fade-in">
        
        <div className="text-center mb-8 space-y-2">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {role === 'customer' && <User className="w-7 h-7 text-white" />}
            {role === 'pharmacy' && <Building2 className="w-7 h-7 text-white" />}
            {role === 'admin' && <ShieldCheck className="w-7 h-7 text-white" />}
          </div>
          <h2 className="text-2xl font-black text-white">
            {isLogin 
              ? (lang === 'ar' ? `تسجيل الدخول كـ ${roleLabels[role]}` : `Login as ${roleLabels[role]}`)
              : (lang === 'ar' ? `إنشاء حساب ${roleLabels[role]}` : `Register as ${roleLabels[role]}`)
            }
          </h2>
          <p className="text-slate-400 text-sm">
            {lang === 'ar' ? 'نظام وينهوبه - عنيزة' : 'Wenhoboh System - Unaizah'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/50 border border-red-900/50 rounded-xl text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!isLogin && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">
                  {lang === 'ar' ? 'الاسم' : 'Name'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-10 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
              
              {role === 'customer' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">
                    {lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              {role === 'pharmacy' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">
                    {lang === 'ar' ? 'رقم الترخيص' : 'License Number'}
                  </label>
                  <input
                    required
                    type="text"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-10 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-10 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl py-3 mt-6 transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {isLogin ? (lang === 'ar' ? 'دخول' : 'Login') : (lang === 'ar' ? 'تسجيل' : 'Register')}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {isLogin 
              ? (lang === 'ar' ? 'ليس لديك حساب؟ قم بالتسجيل' : 'No account? Register instead')
              : (lang === 'ar' ? 'لديك حساب؟ سجل الدخول' : 'Already have an account? Login')
            }
          </button>
        </div>
      </div>
    </div>
  );
}
