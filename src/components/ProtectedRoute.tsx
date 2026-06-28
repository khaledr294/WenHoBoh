import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  role: 'customer' | 'pharmacy' | 'admin';
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user, loading } = useAuth();
  const [adminVerified, setAdminVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (role !== 'admin' || !user) {
      setAdminVerified(null);
      return;
    }
    // For admin: verify the user has a record in the admins collection
    getDoc(doc(db, 'admins', user.uid)).then((snap) => {
      setAdminVerified(snap.exists());
    }).catch(() => setAdminVerified(false));
  }, [user, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F1F5F9' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          <span className="text-slate-500 font-medium text-sm">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    if (role === 'admin') return <Navigate to="/system-admin-portal" replace />;
    if (role === 'pharmacy') return <Navigate to="/partner-pharmacy-login" replace />;
    return <Navigate to="/auth/customer" replace />;
  }

  // Admin role: wait for Firestore check, then redirect if not verified
  if (role === 'admin') {
    if (adminVerified === null) {
      // Still checking
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#F1F5F9' }}>
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      );
    }
    if (!adminVerified) {
      return <Navigate to="/system-admin-portal" replace />;
    }
  }

  return <>{children}</>;
}
