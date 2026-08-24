import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoleGuard } from './components/RoleGuard';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { NurseDashboard } from './pages/nurse/NurseDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';

const MainLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
    <Header />
    <div className="flex-1 flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Doctor Security Boundary */}
        <Route element={<RoleGuard allowedRoles={['Doctor', 'Admin']} />}>
          <Route path="/doctor/*" element={<MainLayout><DoctorDashboard /></MainLayout>} />
        </Route>

        {/* Nurse Security Boundary */}
        <Route element={<RoleGuard allowedRoles={['Nurse', 'Admin']} />}>
          <Route path="/nurse/*" element={<MainLayout><NurseDashboard /></MainLayout>} />
        </Route>

        {/* Admin Security Boundary */}
        <Route element={<RoleGuard allowedRoles={['Admin']} />}>
          <Route path="/admin/*" element={<MainLayout><AdminDashboard /></MainLayout>} />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
