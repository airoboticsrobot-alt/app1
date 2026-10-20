import React, { useState, useEffect, useEffectEvent } from 'react';
import { dataService } from '../services/dataService';
import { Student, AttendanceRecord, SchoolClass } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle,
  XCircle,
  Save,
  Check,
} from 'lucide-react';

interface AttendanceProps {
  initialClass?: string;
}

export const Attendance: React.FC<AttendanceProps> = ({ initialClass = 'Grade 1' }) => {
  const { userProfile } = useAuth();
  const [selectedClass, setSelectedClass] = useState(initialClass);
  const [selectedDivision, setSelectedDivision] = useState('A');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [attendanceState, setAttendanceState] = useState<{ [studentId: string]: 'Present' | 'Absent' }>({});
  const [pastRecords, setPastRecords] = useState<AttendanceRecord[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherAssignment, setTeacherAssignment] = useState<{ grade: string; division: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      let targetClass = selectedClass;
      let targetDivision = selectedDivision;
      let classList: SchoolClass[];
      let classStudents: Student[];
      if (userProfile?.role === 'teacher') {
        const teacher = await dataService.getTeacherForUser(userProfile.email, userProfile.linkedId);
        const assignment = teacher?.assignedClass.match(/^(.*?)([A-Z])$/);
        if (!assignment) throw new Error('No class is assigned to this teacher account. Contact your administrator.');
        targetClass = assignment[1].trim();
        targetDivision = assignment[2];
        [classList, classStudents] = await Promise.all([
          dataService.getClasses(targetClass),
          dataService.getStudents(targetClass, targetDivision),
        ]);
        setTeacherAssignment({ grade: targetClass, division: targetDivision });
        setSelectedClass(targetClass);
        setSelectedDivision(targetDivision);
      } else {
        [classList, classStudents] = await Promise.all([
          dataService.getClasses(),
          dataService.getStudents(),
        ]);
        setTeacherAssignment(null);
        if (!classList.some((schoolClass) => schoolClass.grade === targetClass)) {
          targetClass = classList[0]?.grade || '';
          targetDivision = classList[0]?.divisions[0] || '';
          setSelectedClass(targetClass);
          setSelectedDivision(targetDivision);
          classStudents = targetClass && targetDivision
            ? await dataService.getStudents(targetClass, targetDivision)
            : [];
        }
      }
      setClasses(classList);

      setStudents(classStudents);

      const records = targetClass && targetDivision
        ? await dataService.getAttendanceRecords(targetClass, targetDivision)
        : [];
      setPastRecords(records.sort((first, second) => second.date.localeCompare(first.date)));

      const todayRecord = records.find((record) => record.date === selectedDate);
      const initialMap: { [studentId: string]: 'Present' | 'Absent' } = {};
      if (todayRecord) {
        todayRecord.records.forEach((record) => {
          initialMap[record.studentId] = record.status;
        });
      } else {
        classStudents.forEach((student) => {
          initialMap[student.studentId] = 'Present';
        });
      }
      setAttendanceState(initialMap);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load attendance data.');
      setStudents([]);
      setPastRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDataFromEffect = useEffectEvent(() => {
    void loadData();
  });

  useEffect(() => {
    loadDataFromEffect();
  }, [selectedClass, selectedDivision, selectedDate, userProfile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggle = (studentId: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present',
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: { [studentId: string]: 'Present' | 'Absent' } = {};
    students.forEach((s) => {
      updated[s.studentId] = 'Present';
    });
    setAttendanceState(updated);
    showToast('Marked all students as Present.');
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) {
      setError('There are no students in this class to mark attendance for.');
      return;
    }
    setSaving(true);
    setError(null);
    const records = students.map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      status: attendanceState[s.studentId] || 'Present',
    }));

    try {
      await dataService.saveAttendance({
        class: selectedClass,
        division: selectedDivision,
        date: selectedDate,
        markedBy: userProfile?.displayName || 'School Staff',
        records,
      });
      showToast('Attendance for ' + selectedClass + ' (' + selectedDivision + ') saved successfully.');
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceState).filter((s) => s === 'Present').length;
  const absentCount = students.length - presentCount;

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Register</h1>
          <p className="text-sm text-slate-500">Record daily class presence and track student attendance history.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Check className="h-4 w-4 text-emerald-600" />
            Mark All Present
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving || loading || students.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Filter Selector Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class Grade</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              const nextClass = e.target.value;
              setSelectedClass(nextClass);
              setSelectedDivision(classes.find((item) => item.grade === nextClass)?.divisions[0] || '');
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
          >
            {classes.filter((item) => !teacherAssignment || item.grade === teacherAssignment.grade).map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.grade}>{schoolClass.grade}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Division / Section</label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
          >
            {(classes.find((schoolClass) => schoolClass.grade === selectedClass)?.divisions || []).filter((division) =>
              !teacherAssignment || division === teacherAssignment.division,
            ).map((division) => (
              <option key={division} value={division}>Division {division}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Attendance Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Summary counters */}
      <div className="flex items-center gap-4 text-xs font-semibold">
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700">
          Total Enrolled: {students.length}
        </span>
        <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-emerald-800 flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5" /> Present: {presentCount}
        </span>
        <span className="rounded-lg bg-red-100 px-3 py-1.5 text-red-800 flex items-center gap-1.5">
          <XCircle className="h-3.5 w-3.5" /> Absent: {absentCount}
        </span>
      </div>

      {/* Roster Attendance Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Roll / ID</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Parent Contact</th>
                <th className="px-4 py-3.5 text-center">Attendance Status</th>
                <th className="px-4 py-3.5 text-right">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">Loading attendance roster...</td></tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    No students registered in {selectedClass} ({selectedDivision}).
                  </td>
                </tr>
              ) : (
                students.map((stu) => {
                  const isPresent = (attendanceState[stu.studentId] || 'Present') === 'Present';
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900">
                        {stu.studentId}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        {stu.studentName}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {stu.parentName} ({stu.parentPhone})
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ' + (
                            isPresent
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          )}
                        >
                          {isPresent ? (
                            <>
                              <CheckCircle className="h-3 w-3" /> Present
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Absent
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleToggle(stu.studentId)}
                          className={'rounded-lg px-3 py-1.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer ' + (
                            isPresent
                              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          )}
                        >
                          Mark {isPresent ? 'Absent' : 'Present'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">Attendance History</h2>
        {pastRecords.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No saved attendance records for this class.</p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {pastRecords.map((record) => {
              const present = record.records.filter((entry) => entry.status === 'Present').length;
              const total = record.records.length;
              const percentage = total ? Math.round((present / total) * 100) : 0;
              return (
                <div key={record.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium text-slate-800">{record.date}</span>
                  <span className="text-slate-500">{present} present of {total}</span>
                  <span className="font-semibold text-emerald-700">{percentage}%</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
