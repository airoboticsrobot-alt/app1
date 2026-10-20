import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { Student, StudentMark, TeacherUpdate, FeeRecord, AttendanceRecord } from '../types';
import {
  FileSpreadsheet,
  MessageSquareQuote,
  CreditCard,
  CalendarCheck,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [feeRecord, setFeeRecord] = useState<FeeRecord | null>(null);
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [updates, setUpdates] = useState<TeacherUpdate[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadStudentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const current = await dataService.getStudentByLinkedId(userProfile?.linkedId);
        if (!active) return;
        setStudent(current || null);

        if (current) {
          const [fees, studentMarks, studentUpdates, studentAttendance] = await Promise.all([
            dataService.getFees(current.studentId),
            dataService.getMarks(current.studentId),
            dataService.getTeacherUpdates(current.studentId),
            dataService.getAttendanceRecords(current.class, current.division),
          ]);
          if (!active) return;
          setFeeRecord(fees[0] || null);
          setMarks(studentMarks);
          setUpdates(studentUpdates);
          setAttendance(studentAttendance);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load student information.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadStudentData();
    return () => {
      active = false;
    };
  }, [userProfile]);

  const formatCurrency = (val: number) => {
    return '₹' + (val || 0).toLocaleString('en-IN');
  };

  const attendanceStatuses = attendance.flatMap((record) => {
    const ownRecord = record.records.find((entry) => entry.studentId === student?.studentId);
    return ownRecord ? [ownRecord.status] : [];
  });
  const presentDays = attendanceStatuses.filter((status) => status === 'Present').length;
  const attendancePercentage = attendanceStatuses.length
    ? Math.round((presentDays / attendanceStatuses.length) * 100)
    : null;

  return (
    <div className="space-y-6">
      {loading && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading your student information...</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!loading && !error && !student && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No student record is linked to this account. Contact your school administrator.</p>}
      {/* Student Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white font-bold text-2xl backdrop-blur-xs">
            {student?.studentName?.[0] || 'S'}
          </div>
          <div>
            <span className="rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
              Student & Parent Portal
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {student?.studentName || 'Student profile unavailable'}
            </h1>
            <p className="text-xs text-emerald-100 mt-0.5 font-medium">
              Student ID: <span className="font-mono font-bold text-white">{student?.studentId}</span> • Class: <span className="text-white font-bold">{student?.class} (Div {student?.division})</span>
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-white/10 p-3 text-xs border border-white/20">
          <div className="text-emerald-100 font-medium">Parent Contact</div>
          <div className="text-sm font-bold text-white">{student?.parentName}</div>
          <div className="text-emerald-200">{student?.parentPhone}</div>
        </div>
      </div>

      {/* 11. FEE SECTION REQUIRED */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Fee Summary & Billing Status</h2>
            <p className="text-xs text-slate-500">Your saved fee ledger</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fee</span>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {feeRecord ? formatCurrency(feeRecord.totalFee) : 'No fee record'}
            </div>
            <span className="text-[11px] text-slate-400">Annual structure</span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Paid Amount</span>
            <div className="mt-1 text-xl font-bold text-emerald-800">
              {feeRecord ? formatCurrency(feeRecord.paidAmount) : 'No fee record'}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">Recorded receipts</span>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Amount</span>
            <div className="mt-1 text-xl font-bold text-amber-800">
              {feeRecord ? formatCurrency(feeRecord.pendingAmount) : 'No fee record'}
            </div>
            <span className="text-[11px] text-amber-600 font-medium">Remaining balance</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Status</span>
            <div className="mt-1">
              <span
                className={'inline-block rounded-md border px-3 py-1 text-xs font-bold uppercase ' + (
                  feeRecord?.paymentStatus === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : feeRecord?.paymentStatus === 'Partial'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                )}
              >
                {feeRecord?.paymentStatus || 'No record'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1">
              Last updated: {feeRecord?.paymentDate || 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Marks & Teacher Updates */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Academic Marks */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Academic Marks Report</h2>
              <p className="text-xs text-slate-500">Latest exam scores and evaluations</p>
            </div>
          </div>

          {marks.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No examination marks published yet for this student.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {marks.map((m) => {
                const pct = Math.round((m.marks / (m.totalMarks || 100)) * 100);
                return (
                  <div key={m.id} className="flex items-center justify-between py-3">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{m.subject}</span>
                      <span className="text-slate-400">{m.examName || 'Assessment'} • {m.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 text-sm">{m.marks} / {m.totalMarks}</span>
                      <span className="block text-[11px] font-semibold text-emerald-600">{pct}% Marks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Teacher Notes & Updates */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <MessageSquareQuote className="h-5 w-5 text-purple-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Teacher Notes & Feedback</h2>
              <p className="text-xs text-slate-500">Classroom remarks from teachers</p>
            </div>
          </div>

          {updates.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No teacher updates published yet.
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
                  <p className="italic text-slate-800 leading-relaxed">&ldquo;{u.updateText}&rdquo;</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/50">
                    <span className="font-semibold text-slate-700">Teacher: {u.teacherName}</span>
                    <span>{u.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attendance History */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <CalendarCheck className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Daily Attendance History</h2>
            <p className="text-xs text-slate-500">
              {attendancePercentage === null
                ? 'No attendance records have been saved.'
                : `${attendancePercentage}% attendance across ${attendanceStatuses.length} saved days`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {attendance.map((att) => {
            const myStatus = att.records.find((r) => r.studentId === student?.studentId)?.status || 'Not recorded';
            const isPresent = myStatus === 'Present';
            return (
              <div
                key={att.id}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-800 block">{att.date}</span>
                  <span className="text-[11px] text-slate-400">Daily Roll</span>
                </div>
                <span
                  className={'rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ' + (
                    isPresent ? 'bg-emerald-100 text-emerald-800' : myStatus === 'Absent' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {myStatus}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
