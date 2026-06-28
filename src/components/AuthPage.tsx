import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { updateProfile, ConfirmationResult, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Pharmacy, Language } from '../types';
import { Mail, Lock, Phone, User, Building2, ShieldCheck, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { initRecaptcha, sendSmsOtp, verifySmsOtp, signInAdmin } from '../lib/authService';

declare global {
  interface Window { recaptchaVerifier: any; }
}

interface AuthPageProps {
  role: 'customer' | 'pharmacy' | 'admin';
  lang: Language;
}

export default function AuthPage({ role, lang }: AuthPageProps) {
  const navigate = useNavigate();

  // Shared
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin Email+Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Customer / Pharmacy OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');
  const [workingHours, setWorkingHours] = useState('24/7');
  const [hasWasfaty, setHasWasfaty] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<FirebaseAuthUser | null>(null);

  useEffect(() => {
    if (role === 'admin') return; // No reCAPTCHA for admin
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = initRecaptcha('recaptcha-container');
    }
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, [role]);

  // ── Admin: Email + Password login ──────────────────────────────────────────
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signInAdmin(email.trim(), password);
      // Verify admin record exists in Firestore
      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        // First-time: seed the admin document
        await setDoc(adminRef, {
          id: user.uid,
          role: 'admin',
          email: user.email,
          createdAt: new Date().toISOString()
        });
      }
      navigate('/admin');
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError(lang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
      } else if (code === 'auth/too-many-requests') {
        setError(lang === 'ar' ? 'محاولات كثيرة — حاول لاحقاً' : 'Too many attempts — try later');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Customer / Pharmacy: OTP flow ──────────────────────────────────────────
  const formatPhone = (p: string) => {
    let f = p.trim();
    if (f.startsWith('0')) f = '+966' + f.substring(1);
    else if (!f.startsWith('+')) f = '+966' + f;
    return f;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = initRecaptcha('recaptcha-container');
      }
      const result = await sendSmsOtp(formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError(lang === 'ar'
          ? 'يرجى تفعيل المصادقة عبر الهاتف في Firebase Console'
          : 'Please enable Phone auth in Firebase Console');
      } else if (err.code === 'auth/invalid-phone-number') {
        setError(lang === 'ar' ? 'رقم الهاتف غير صحيح' : 'Invalid phone number');
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
      const colName = role === 'pharmacy' ? 'pharmacies' : 'customers';
      const docSnap = await getDoc(doc(db, colName, user.uid));
      if (!docSnap.exists()) {
        setRegisteredUser(user);
        setNeedsRegistration(true);
        setLoading(false);
        return;
      }
      navigate(role === 'pharmacy' ? '/pharmacy' : '/customer');
    } catch (err: any) {
      if (err.code === 'auth/invalid-verification-code') {
        setError(lang === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid verification code');
      } else if (err.code === 'auth/code-expired') {
        setError(lang === 'ar' ? 'رمز التحقق منتهي الصلاحية' : 'Verification code expired');
      } else {
        setError(err.message || 'Verification failed');
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
      if (name) await updateProfile(registeredUser, { displayName: name });
      if (role === 'customer') {
        await setDoc(doc(db, 'customers', registeredUser.uid), {
          id: registeredUser.uid, name,
          phone: formatPhone(phone),
          createdAt: new Date().toISOString()
        });
        navigate('/customer');
      } else if (role === 'pharmacy') {
        const newPharmacy: Pharmacy = {
          id: registeredUser.uid,
          nameAr: name, nameEn: name,
          addressAr: 'عنيزة', addressEn: 'Unaizah',
          latitude: 26.085, longitude: 43.990,
          isVerified: false, licenseNumber: license,
          workingHours, hasWasfaty, hasDelivery,
          rating: 5, responseRate: 100,
          avgResponseTimeSec: 60, status: 'pending'
        };
        await setDoc(doc(db, 'pharmacies', registeredUser.uid), newPharmacy);
        navigate('/pharmacy');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared UI helpers ──────────────────────────────────────────────────────
  const tealFocus = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = '#0D6E6E';
      e.target.style.background = '#fff';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = '';
      e.target.style.background = '';
    }
  };

  const inputCls =
    'w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 focus:outline-none transition-all placeholder:text-slate-400';
  const iconInputCls = inputCls + ' ps-12';

  const PrimaryBtn = ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => (
    <button
      type="submit"
      disabled={disabled || loading}
      className="w-full text-white font-bold rounded-2xl py-4 mt-8 text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
      style={{ background: loading ? '#14B8B8' : 'linear-gradient(135deg,#0D6E6E,#14B8B8)', boxShadow: '0 4px 20px rgba(13,110,110,0.25)' }}
    >
      {loading
        ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        : children}
    </button>
  );

  const roleLabel = { customer: lang === 'ar' ? 'عميل' : 'Customer', pharmacy: lang === 'ar' ? 'صيدلية' : 'Pharmacy', admin: lang === 'ar' ? 'مسؤول النظام' : 'System Admin' }[role];
  const RoleIcon = { customer: User, pharmacy: Building2, admin: ShieldCheck }[role];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white">
      <div className="max-w-md w-full bg-white border border-slate-200/80 p-8 md:p-10 rounded-[2rem] shadow-xl animate-fade-in">

        {/* Header */}
        <div className="text-center mb-10 space-y-2">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm" style={{ background: '#E6F7F7' }}>
            <RoleIcon className="w-8 h-8" style={{ color: '#0D6E6E' }} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {lang === 'ar' ? `دخول ${roleLabel}` : `${roleLabel} Login`}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {lang === 'ar' ? 'نظام وينهوبه — عنيزة' : 'Wenhoboh System — Unaizah'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-sm font-semibold text-center">
            {error}
          </div>
        )}

        {/* ── ADMIN: Email + Password ── */}
        {role === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ms-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  required type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className={iconInputCls} dir="ltr"
                  {...tealFocus}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ms-1">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  required type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={iconInputCls + ' pe-12'} dir="ltr"
                  {...tealFocus}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <PrimaryBtn>
              {lang === 'ar' ? 'دخول لوحة الإدارة' : 'Enter Admin Panel'}
              <ShieldCheck className="w-5 h-5" />
            </PrimaryBtn>
          </form>
        )}

        {/* ── CUSTOMER / PHARMACY: OTP ── */}
        {role !== 'admin' && (
          <>
            <div id="recaptcha-container" />

            {needsRegistration ? (
              <form onSubmit={handleRegistrationSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ms-1">
                    {lang === 'ar' ? 'الاسم بالكامل' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      required type="text" value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={lang === 'ar' ? 'اكتب اسمك هنا...' : 'Enter your full name...'}
                      className={iconInputCls} {...tealFocus}
                    />
                  </div>
                </div>

                {role === 'pharmacy' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 ms-1">
                        {lang === 'ar' ? 'رقم الترخيص' : 'License Number'}
                      </label>
                      <input
                        required type="text" value={license}
                        onChange={e => setLicense(e.target.value)}
                        className={inputCls} {...tealFocus}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 ms-1">
                        {lang === 'ar' ? 'مواعيد العمل' : 'Working Hours'}
                      </label>
                      <input
                        required type="text" value={workingHours}
                        onChange={e => setWorkingHours(e.target.value)}
                        placeholder="e.g. 24/7 or 8AM-11PM"
                        className={inputCls} {...tealFocus}
                      />
                    </div>
                    <div className="flex gap-6">
                      {[
                        { state: hasWasfaty, setter: setHasWasfaty, label: lang === 'ar' ? 'وصفتي' : 'Wasfaty' },
                        { state: hasDelivery, setter: setHasDelivery, label: lang === 'ar' ? 'توصيل' : 'Delivery' }
                      ].map(({ state, setter, label }) => (
                        <label key={label} className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox" checked={state}
                            onChange={e => setter(e.target.checked)}
                            className="w-5 h-5 rounded accent-teal-600"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </>
                )}

                <PrimaryBtn>
                  {lang === 'ar' ? 'إكمال التسجيل' : 'Complete Registration'}
                  <CheckCircle2 className="w-5 h-5" />
                </PrimaryBtn>
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
                      required type="tel" value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="05XXXXXXXX"
                      className={iconInputCls} dir="ltr"
                      {...tealFocus}
                    />
                  </div>
                </div>
                <PrimaryBtn>
                  {lang === 'ar' ? 'إرسال رمز التحقق' : 'Send OTP'}
                  <ArrowRight className="w-5 h-5" />
                </PrimaryBtn>
              </form>

            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ms-1">
                    {lang === 'ar' ? 'رمز التحقق' : 'OTP Code'}
                  </label>
                  <div className="relative">
                    <CheckCircle2 className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      required type="text" value={otp}
                      onChange={e => setOtp(e.target.value)}
                      placeholder="123456"
                      className={iconInputCls + ' text-2xl tracking-[0.5em] text-center font-black'}
                      dir="ltr" maxLength={6}
                      {...tealFocus}
                    />
                  </div>
                </div>
                <PrimaryBtn disabled={otp.length < 6}>
                  {lang === 'ar' ? 'تأكيد ودخول' : 'Verify & Enter'}
                  <CheckCircle2 className="w-5 h-5" />
                </PrimaryBtn>
                <button
                  type="button"
                  onClick={() => { setConfirmationResult(null); setOtp(''); }}
                  className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  {lang === 'ar' ? 'تغيير رقم الجوال؟' : 'Change Phone Number?'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
