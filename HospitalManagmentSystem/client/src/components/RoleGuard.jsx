import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RoleGuard = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-teal-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium tracking-wide">Authenticating Staff Identity...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to staff member's correct home route based on role
    if (user.role === 'Admin') return <Navigate to="/admin" replace />;
    if (user.role === 'Doctor') return <Navigate to="/doctor" replace />;
    if (user.role === 'Nurse') return <Navigate to="/nurse" replace />;
    if (user.role === 'Pharmacist') return <Navigate to="/pharmacist" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
