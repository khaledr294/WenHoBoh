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
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);

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
      
      // Admin phone restriction
      if (role === 'admin' && formattedPhone !== '+966501511643') {
        setError(lang === 'ar' ? 'غير مصرح لك بالدخول كمسؤول' : 'Unauthorized to login as admin');
        setLoading(false);
        return;
      }

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
      } else if (err.code === 'auth/invalid-phone-number') {
        setError(lang === 'ar' 
          ? 'رقم الهاتف المدخل غير صحيح'
          : 'The phone number entered is invalid');
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
      
      const docRef = doc(db, role === 'pharmacy' ? 'pharmacies' : role === 'admin' ? 'admins' : 'customers', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists() && role !== 'admin') {
        setRegisteredUser(user);
        setNeedsRegistration(true);
        setLoading(false);
        return;
      }
      
      if (role === 'admin' && !docSnap.exists()) {
        await setDoc(docRef, { id: user.uid, role: 'admin' });
      }
      
      if (role === 'admin') navigate('/admin');
      else if (role === 'pharmacy') navigate('/pharmacy');
      else navigate('/customer');

    } catch (err: any) {
      if (err.code === 'auth/invalid-verification-code') {
        setError(lang === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid verification code');
      } else if (err.code === 'auth/code-expired') {
        setError(lang === 'ar' ? 'رمز التحقق منتهي الصلاحية' : 'Verification code expired');
      } else {
        setError(lang === 'ar' ? `حدث خطأ أثناء التحقق من الرمز: ${err.message}` : `Error verifying code: ${err.message}`);
      }
      setLoading(false);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeredUser) return;
    
    setError('');
    setLoading(true);
    
    try {
      if (name) {
        await updateProfile(registeredUser, { displayName: name });
      }
      
      if (role === 'customer') {
        await setDoc(doc(db, 'customers', registeredUser.uid), {
          id: registeredUser.uid,
          name,
          phone: formatPhoneNumber(phone),
          createdAt: new Date().toISOString()
        });
        navigate('/customer');
      } else if (role === 'pharmacy') {
        const newPharmacy: Pharmacy = {
          id: registeredUser.uid,
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
        await setDoc(doc(db, 'pharmacies', registeredUser.uid), newPharmacy);
        navigate('/pharmacy');
      }
    } catch (err: any) {
      setError(lang === 'ar' ? `حدث خطأ أثناء التسجيل: ${err.message}` : `Error during registration: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    customer: lang === 'ar' ? 'عميل' : 'Customer',
    pharmacy: lang === 'ar' ? 'صيدلية' : 'Pharmacy',
    admin: lang === 'ar' ? 'مسؤول' : 'Admin'
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 md:p-10 rounded-[2rem] shadow-xl animate-fade-in">
        
        <div className="text-center mb-10 space-y-3">
          <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            {role === 'customer' && <User className="w-8 h-8 text-emerald-600" />}
            {role === 'pharmacy' && <Building2 className="w-8 h-8 text-emerald-600" />}
            {role === 'admin' && <ShieldCheck className="w-8 h-8 text-emerald-600" />}
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {lang === 'ar' ? `دخول ${roleLabels[role]}` : `Login as ${roleLabels[role]}`}
          </h2>
          <p className="text-slate-500 text-base font-medium">
            {lang === 'ar' ? 'نظام وينهوبه - عنيزة' : 'Wenhoboh System - Unaizah'}
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-sm font-semibold text-center">
            {error}
          </div>
        )}

        <div id="recaptcha-container"></div>

        {needsRegistration ? (
          <form onSubmit={handleRegistrationSubmit} className="space-y-5">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ms-1">
                  {lang === 'ar' ? 'الاسم بالكامل' : 'Full Name'}
                </label>
                <div className="relative">
                  <User className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-12 py-4 text-base font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                    placeholder={lang === 'ar' ? 'اكتب اسمك هنا...' : 'Enter your name...'}
                  />
                </div>
              </div>

              {role === 'pharmacy' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ms-1">
                    {lang === 'ar' ? 'رقم الترخيص' : 'License Number'}
                  </label>
                  <input
                    required
                    type="text"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl py-4 mt-8 text-lg transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-3 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {lang === 'ar' ? 'إكمال التسجيل' : 'Complete Registration'}
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        ) : !confirmationResult ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ms-1">
                {lang === 'ar' ? 'رقم الجوال' : 'Phone Number'}
              </label>
              <div className="relative">
                <Phone className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  required
                  type="tel"
                  placeholder="05XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-12 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-start placeholder:text-slate-400 placeholder:font-medium"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl py-4 mt-8 text-lg transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-3 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {lang === 'ar' ? 'إرسال الرمز' : 'Send SMS OTP'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ms-1">
                {lang === 'ar' ? 'رمز التحقق (رسالة نصية)' : 'Verification Code (OTP)'}
              </label>
              <div className="relative">
                <CheckCircle2 className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  required
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-12 py-4 text-2xl tracking-[0.5em] text-center font-black text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-300 placeholder:font-medium placeholder:text-base placeholder:tracking-normal"
                  dir="ltr"
                  maxLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl py-4 mt-8 text-lg transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-3 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {lang === 'ar' ? 'تأكيد ودخول' : 'Verify & Enter'}
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmationResult(null);
                setOtp('');
              }}
              className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              {lang === 'ar' ? 'تغيير رقم الجوال؟' : 'Change Phone Number?'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

