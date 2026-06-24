import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function ProtectedRoute({ children, role }: { children: React.ReactNode, role: 'customer' | 'pharmacy' | 'admin' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to={`/auth/${role}`} replace />;
  }

  return <>{children}</>;
}
