import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function ProtectedRoute({ children, role }: { children: React.ReactNode, role: 'customer' | 'pharmacy' | 'admin' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    if (role === 'admin') return <Navigate to={`/system-admin-portal`} replace />;
    if (role === 'pharmacy') return <Navigate to={`/partner-pharmacy-login`} replace />;
    return <Navigate to={`/auth/${role}`} replace />;
  }

  const adminPhone = (import.meta as any).env.VITE_ADMIN_PHONE;
  if (role === 'admin' && (!adminPhone || user.phoneNumber !== adminPhone)) {
    return <Navigate to={`/system-admin-portal`} replace />;
  }

  return <>{children}</>;
}
