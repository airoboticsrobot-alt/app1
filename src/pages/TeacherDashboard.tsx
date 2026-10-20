import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { Student, Teacher } from '../types';
import {
  CalendarCheck,
  FileSpreadsheet,
  MessageSquareQuote,
  GraduationCap,
  Users,
  CreditCard,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchTeacherDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const current = userProfile
          ? await dataService.getTeacherForUser(userProfile.email, userProfile.linkedId)
          : null;
        if (!active) return;
        setTeacher(current || null);

        if (current) {
          const assignment = current.assignedClass.match(/^(.*?)([A-Z])$/);
          const myStudents = assignment
            ? await dataService.getStudents(assignment[1].trim(), assignment[2])
            : [];
          if (active) setAssignedStudents(myStudents);
        } else {
          setAssignedStudents([]);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load teacher dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchTeacherDetails();
    return () => {
      active = false;
    };
  }, [userProfile]);

  return (
    <div className="space-y-6">
      {loading && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading your class information...</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!loading && !error && !teacher && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No teacher record is linked to this account. Contact your administrator.</p>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-md">
        <div>
          <span className="rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
            Faculty Portal
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Welcome, {teacher?.teacherName || 'Faculty Member'}
          </h1>
          <p className="text-xs text-blue-100 mt-1">
            Assigned Class: <strong className="text-white font-bold">{teacher?.assignedClass || 'Unassigned'}</strong> • Subject: <strong className="text-white font-bold">{teacher?.subject || 'Unassigned'}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/teacher/attendance"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition-colors"
          >
            <CalendarCheck className="h-4 w-4 text-blue-600" />
            Mark Attendance
          </Link>
          <Link
            to="/teacher/marks"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 border border-white/30 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/30 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Add Marks
          </Link>
          <Link
            to="/teacher/updates"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 border border-white/30 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/30 transition-colors"
          >
            <MessageSquareQuote className="h-4 w-4" />
            Add Note
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">My Class</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {teacher?.assignedClass || 'Unassigned'}
          </div>
          <div className="mt-1 text-xs text-blue-600 font-medium">Homeroom Teacher</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Enrolled Students</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
              {assignedStudents.length} Students
          </div>
          <div className="mt-1 text-xs text-slate-500 font-medium">In assigned division</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Attendance Mode</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700">Active</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">Ready for daily submission</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Fee Clearance</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">Read-Only</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Auditing fee clearance status</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assigned Students Roster</h2>
            <p className="text-xs text-slate-500">Students in your assigned division {teacher?.assignedClass}</p>
          </div>
          <Link
            to="/teacher/attendance"
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Mark Daily Register &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Parent Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Fee Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {assignedStudents.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No students are assigned to this class yet.</td></tr>
              ) : assignedStudents.map((stu) => (
                <tr key={stu.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{stu.studentId}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 text-sm">{stu.studentName}</td>
                  <td className="px-4 py-3 text-slate-600">{stu.parentName}</td>
                  <td className="px-4 py-3 text-slate-500">{stu.parentPhone}</td>
                  <td className="px-4 py-3 font-semibold uppercase text-[11px] text-blue-600">
                    {stu.feeStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
