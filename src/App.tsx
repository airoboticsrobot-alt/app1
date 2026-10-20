import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

// Logins
import { Login } from './pages/Login';

// Admin Pages
import { AdminDashboard } from './pages/AdminDashboard';
import { Students } from './pages/Students';
import { Teachers } from './pages/Teachers';
import { Classes } from './pages/Classes';
import { Fees } from './pages/Fees';
import { Attendance } from './pages/Attendance';
import { Marks } from './pages/Marks';
import { TeacherUpdates } from './pages/TeacherUpdates';
import { SettingsPage } from './pages/Settings';

// Teacher Pages
import { TeacherDashboard } from './pages/TeacherDashboard';

// Student Pages
import { StudentDashboard } from './pages/StudentDashboard';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default Redirect to Admin Login */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />

          {/* 1. SEPARATE LOGIN PAGES */}
          <Route
            path="/admin/login"
            element={
              <Login
                role="admin"
                title="Administrator Sign In"
                subtitle="Enter your school administrator credentials"
              />
            }
          />
          <Route
            path="/teacher/login"
            element={
              <Login
                role="teacher"
                title="Faculty Portal Sign In"
                subtitle="Enter your teacher credentials to access your class"
              />
            }
          />
          <Route
            path="/student/login"
            element={
              <Login
                role="student"
                title="Student / Parent Sign In"
                subtitle="View attendance, marks, updates, and fee status"
              />
            }
          />

          {/* 2. ADMIN PORTAL (PROTECTED) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="classes" element={<Classes />} />
            <Route path="fees" element={<Fees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="marks" element={<Marks />} />
            <Route path="updates" element={<TeacherUpdates currentTeacherName="Administrator" />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* 3. TEACHER PORTAL (PROTECTED) */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="marks" element={<Marks />} />
            <Route path="updates" element={<TeacherUpdates currentTeacherName="Sarah Jenkins" />} />
            <Route path="fees" element={<Fees readOnly={true} />} />
          </Route>

          {/* 4. STUDENT / PARENT PORTAL (PROTECTED) */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="attendance" element={<StudentDashboard />} />
            <Route path="marks" element={<StudentDashboard />} />
            <Route path="updates" element={<StudentDashboard />} />
            <Route path="fees" element={<StudentDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
