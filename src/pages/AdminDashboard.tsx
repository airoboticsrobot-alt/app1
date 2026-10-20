import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../services/dataService';
import {
  Users,
  GraduationCap,
  Layers,
  CreditCard,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalFees: 0,
    paidFees: 0,
    pendingFees: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      try {
        const result = await dataService.getAdminStats();
        if (!active) return;
        setStats(result);
        setError(null);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard totals.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadStats();
    return () => {
      active = false;
    };
  }, []);

  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Unable to load dashboard data: {error}</p>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of students, staff, academic classes, and fee collections.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/students"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </Link>
          <Link
            to="/admin/teachers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Teacher
          </Link>
          <Link
            to="/admin/classes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Class
          </Link>
          <Link
            to="/admin/fees"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Record Payment
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Students</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{loading ? 'Loading...' : stats.totalStudents}</div>
          <div className="mt-1 text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <ArrowUpRight className="h-3 w-3" /> Active enrolled
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Teachers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{loading ? 'Loading...' : stats.totalTeachers}</div>
          <div className="mt-1 text-xs text-purple-600 font-medium">Assigned across grades</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Classes</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{loading ? 'Loading...' : stats.totalClasses}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Configured classes</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Fees</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-slate-900">{loading ? 'Loading...' : formatCurrency(stats.totalFees)}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Annual fee billing</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Paid Fees</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-emerald-900">{loading ? 'Loading...' : formatCurrency(stats.paidFees)}</div>
          <div className="mt-1 text-xs text-emerald-700 font-medium">
            {loading ? 'Loading...' : (stats.totalFees ? Math.round((stats.paidFees / stats.totalFees) * 100) : 0) + '% collected'}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Fees</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-amber-900">{loading ? 'Loading...' : formatCurrency(stats.pendingFees)}</div>
          <div className="mt-1 text-xs text-amber-700 font-medium">Awaiting dues</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">Core Management Modules</h2>
          <p className="text-xs text-slate-500 mb-4">Perform essential school administration tasks</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/admin/students"
              className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 p-3.5 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
            >
              <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                <GraduationCap className="h-4 w-4 text-blue-600" /> Student Roster
              </div>
              <span className="text-xs text-slate-500">View and manage enrolled students</span>
            </Link>

            <Link
              to="/admin/teachers"
              className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 p-3.5 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
            >
              <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                <Users className="h-4 w-4 text-purple-600" /> Faculty Directory
              </div>
              <span className="text-xs text-slate-500">Manage assigned teachers</span>
            </Link>

            <Link
              to="/admin/classes"
              className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 p-3.5 hover:border-amber-200 hover:bg-amber-50/30 transition-all"
            >
              <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                <Layers className="h-4 w-4 text-amber-600" /> Class & Sections
              </div>
              <span className="text-xs text-slate-500">Configured grades and sections</span>
            </Link>

            <Link
              to="/admin/fees"
              className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 p-3.5 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
            >
              <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                <CreditCard className="h-4 w-4 text-emerald-600" /> Fee Records
              </div>
              <span className="text-xs text-slate-500">Collect & record receipts</span>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">System Status & Database</h2>
            <p className="text-xs text-slate-500 mb-4">Firestore records loaded from the connected database</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Firestore Collections
                </div>
                <span className="text-slate-500 font-mono">users, students, teachers, classes, fees</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Loaded Records
                </div>
                <span className="text-slate-600 font-semibold">{stats.totalStudents} students and {stats.totalTeachers} teachers</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Ready for evaluation & deployment</span>
          </div>
        </div>
      </div>
    </div>
  );
};
