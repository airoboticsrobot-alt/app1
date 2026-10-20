import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { ShieldCheck, GraduationCap, BookOpen, AlertCircle } from 'lucide-react';

interface LoginProps {
  role: UserRole;
  title: string;
  subtitle: string;
}

export const Login: React.FC<LoginProps> = ({
  role,
  title,
  subtitle,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, profileError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    setSubmitting(true);

    try {
      await login(email, password, role, role === 'student' ? admissionNumber.trim() : undefined);
      navigate('/' + role + '/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(getLoginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Enter your email address first, then request a password setup link.');
      return;
    }

    setError(null);
    setResetMessage(null);
    setResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail, {
        url: window.location.origin + '/' + role + '/login',
      });
      setResetMessage('If an account exists for this email, a password setup link has been sent. Check your inbox and spam folder.');
    } catch (resetError: unknown) {
      console.error('Password setup email error:', resetError);
      setError(getLoginErrorMessage(resetError));
    } finally {
      setResettingPassword(false);
    }
  };

  const getLoginErrorMessage = (error: unknown): string => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          return 'The email or password is incorrect.';
        case 'auth/invalid-email':
          return 'Enter a valid email address.';
        case 'auth/user-disabled':
          return 'This account has been disabled. Contact your school administrator.';
        case 'auth/too-many-requests':
          return 'Too many sign-in attempts. Wait a few minutes and try again.';
        case 'auth/network-request-failed':
          return 'Unable to reach Firebase. Check your internet connection and try again.';
        case 'auth/operation-not-allowed':
          return 'Email and password sign-in is not enabled for this Firebase project.';
        case 'permission-denied':
          return 'Unable to read your school role profile. Check Firebase access rules or contact your administrator.';
      }
    }
    return error instanceof Error ? error.message : 'Unable to sign in. Try again or contact your administrator.';
  };

  const getTheme = () => {
    switch (role) {
      case 'admin':
        return {
          icon: ShieldCheck,
          accent: 'bg-purple-600 hover:bg-purple-700 text-white',
          border: 'border-purple-200',
          badge: 'bg-purple-100 text-purple-700',
        };
      case 'teacher':
        return {
          icon: BookOpen,
          accent: 'bg-blue-600 hover:bg-blue-700 text-white',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-700',
        };
      case 'student':
        return {
          icon: GraduationCap,
          accent: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          border: 'border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-700',
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Navigation switcher between portals */}
        <div className="mb-6 flex rounded-xl bg-white p-1.5 shadow-sm border border-slate-200 text-xs font-semibold">
          <Link
            to="/admin/login"
            className={
              'flex-1 rounded-lg py-2 text-center transition-all ' +
              (role === 'admin'
                ? 'bg-purple-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50')
            }
          >
            Admin
          </Link>
          <Link
            to="/teacher/login"
            className={
              'flex-1 rounded-lg py-2 text-center transition-all ' +
              (role === 'teacher'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50')
            }
          >
            Teacher
          </Link>
          <Link
            to="/student/login"
            className={
              'flex-1 rounded-lg py-2 text-center transition-all ' +
              (role === 'student'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50')
            }
          >
            Student/Parent
          </Link>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className={'flex h-12 w-12 items-center justify-center rounded-xl ' + theme.badge + ' border ' + theme.border}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
                <p className="text-xs text-slate-500">{subtitle}</p>
              </div>
            </div>

            {(error || profileError) && (
              <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Authentication Failed: </span>
                  {error || profileError}
                </div>
              </div>
            )}
            {resetMessage && (
              <div role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {role === 'student' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Student Admission Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="e.g. STU1001"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username or Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.com"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => void handlePasswordReset()}
                  disabled={resettingPassword}
                  className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50"
                >
                  {resettingPassword ? 'Sending password setup link...' : 'Forgot or need to set your password?'}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={'w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer ' + theme.accent}
              >
                {submitting ? 'Authenticating...' : 'Sign In to Portal'}
              </button>
            </form>

          </div>
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-xs text-slate-500">
            Secure Role-Based School Information Management
          </div>
        </div>
      </div>
    </div>
  );
};
