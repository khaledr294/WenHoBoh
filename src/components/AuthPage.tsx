import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { updateProfile, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Pharmacy, Language } from '../types';
import { Phone, User, Building2, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { initRecaptcha, sendSmsOtp, verifySmsOtp } from '../lib/authService';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

interface AuthPageProps {
  role: 'customer' | 'pharmacy' | 'admin';
  lang: Language;
}

export default function AuthPage({ role, lang }: AuthPageProps) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    // Initialize recaptcha when component mounts
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = initRecaptcha('recaptcha-container');
    }
    return () => {
      // Cleanup recaptcha if needed
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const formatPhoneNumber = (phoneStr: string) => {
    // Basic formatting to E.164, assuming Saudi Arabia (+966) if no country code provided
    let formatted = phoneStr.trim();
    if (formatted.startsWith('0')) {
      formatted = '+966' + formatted.substring(1);
    } else if (!formatted.startsWith('+')) {
      formatted = '+966' + formatted;
    }
    return formatted;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = initRecaptcha('recaptcha-container');
      }
      
      const result = await sendSmsOtp(formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        if (err.message && err.message.includes('region enabled')) {
          setError(lang === 'ar' 
            ? 'يرجى تفعيل إرسال الرسائل النصية القصيرة (SMS) لمنطقتك من إعدادات Firebase Authentication'
            : 'Please enable SMS for your region in Firebase Authentication settings');
        } else {
          setError(lang === 'ar' 
            ? 'يرجى تفعيل خيار تسجيل الدخول برقم الهاتف من لوحة تحكم Firebase'
            : 'Please enable Phone authentication provider in your Firebase Console');
        }
      } else {
        setError(err.message || 'Failed to send SMS');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    setError('');
    setLoading(true);

    try {
      const user = await verifySmsOtp(confirmationResult, otp);
      
      // If this is a registration, update profile and create initial documents
      if (!isLogin) {
        if (name) {
          await updateProfile(user, { displayName: name });
        }
        
        // Setup initial documents
        if (role === 'pharmacy') {
          const newPharmacy: Pharmacy = {
            id: user.uid,
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
          await setDoc(doc(db, 'pharmacies', user.uid), newPharmacy);
        } else if (role === 'customer') {
          await setDoc(doc(db, 'customers', user.uid), {
            id: user.uid,
            name,
            phone: formatPhoneNumber(phone),
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // Just verify if document exists for login, if not we might need to create a basic one or handle it
        const docRef = doc(db, role === 'pharmacy' ? 'pharmacies' : role === 'admin' ? 'admins' : 'customers', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists() && role === 'customer') {
          // Auto-create customer doc if missing during phone login
          await setDoc(doc(db, 'customers', user.uid), {
            id: user.uid,
            name: user.displayName || 'User',
            phone: user.phoneNumber || formatPhoneNumber(phone),
            createdAt: new Date().toISOString()
          });
        }
      }
      
      navigate(`/${role === 'admin' ? 'system-admin-portal' : role === 'pharmacy' ? 'partner-pharmacy-login' : role}`);
      // Actually navigate to the dashboard root for role:
      if (role === 'admin') navigate('/admin');
      else if (role === 'pharmacy') navigate('/pharmacy');
      else navigate('/customer');

    } catch (err: any) {
      setError(lang === 'ar' ? 'رمز التحقق غير صحيح أو منتهي الصلاحية' : 'Invalid or expired verification code');
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

        <div id="recaptcha-container"></div>

        {!confirmationResult ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
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
                {lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="tel"
                  placeholder="05XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-10 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-left"
                  dir="ltr"
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
                  {lang === 'ar' ? 'إرسال رمز التحقق' : 'Send SMS OTP'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">
                {lang === 'ar' ? 'رمز التحقق (OTP)' : 'Verification Code (OTP)'}
              </label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-10 py-3 text-sm tracking-[0.5em] text-center font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  dir="ltr"
                  maxLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl py-3 mt-6 transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {lang === 'ar' ? 'تأكيد الرمز' : 'Verify Code'}
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmationResult(null);
                setOtp('');
              }}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              {lang === 'ar' ? 'تغيير رقم الهاتف' : 'Change Phone Number'}
            </button>
          </form>
        )}

        {!confirmationResult && (
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
        )}
      </div>
    </div>
  );
}

