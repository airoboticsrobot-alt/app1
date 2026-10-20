import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-600">Authenticating secure session...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    const fallback = allowedRoles.includes('admin')
      ? '/admin/login'
      : allowedRoles.includes('teacher')
      ? '/teacher/login'
      : '/student/login';
    return <Navigate to={fallback} replace />;
  }

  if (!allowedRoles.includes(userProfile.role)) {
    return <Navigate to={'/' + userProfile.role + '/dashboard'} replace />;
  }

  return children;
};
