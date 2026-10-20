import React, { useEffect, useEffectEvent, useState } from 'react';
import { dataService } from '../services/dataService';
import { Student, TeacherUpdate } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquareQuote,
  Save,
  CheckCircle,
} from 'lucide-react';

interface TeacherUpdatesProps {
  currentTeacherName?: string;
  readOnly?: boolean;
}

export const TeacherUpdates: React.FC<TeacherUpdatesProps> = ({
  currentTeacherName = 'Ananya Sharma',
  readOnly = false,
}) => {
  const { userProfile } = useAuth();
  const [updates, setUpdates] = useState<TeacherUpdate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherName, setTeacherName] = useState(currentTeacherName);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      let studentList: Student[];
      let updateList: TeacherUpdate[];
      if (userProfile?.role === 'teacher') {
        const teacher = await dataService.getTeacherForUser(userProfile.email, userProfile.linkedId);
        const assignment = teacher?.assignedClass.match(/^(.*?)([A-Z])$/);
        if (!assignment || !teacher) throw new Error('No class is assigned to this teacher account. Contact your administrator.');
        studentList = await dataService.getStudents(assignment[1].trim(), assignment[2]);
        updateList = await dataService.getTeacherUpdatesForStudents(studentList.map((student) => student.studentId));
        setTeacherName(teacher.teacherName);
      } else {
        [studentList, updateList] = await Promise.all([
          dataService.getStudents(),
          dataService.getTeacherUpdates(),
        ]);
        setTeacherName(currentTeacherName);
      }
      setError(null);
      setUpdates(updateList);
      setStudents(studentList);
      if (studentList.length > 0 && !studentList.some((student) => student.studentId === selectedStudentId)) {
        setSelectedStudentId(studentList[0].studentId);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load student updates.');
    } finally {
      setLoading(false);
    }
  };

  const loadDataFromEffect = useEffectEvent(() => {
    void loadData();
  });

  useEffect(() => {
    loadDataFromEffect();
  }, [userProfile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const stu = students.find((s) => s.studentId === selectedStudentId);
    if (!stu) return;

    try {
      await dataService.addTeacherUpdate({
        studentDocId: stu.id,
        studentId: stu.studentId,
        studentName: stu.studentName,
        date: new Date().toISOString().split('T')[0],
        teacherName,
        updateText: noteText.trim(),
      });
      setNoteText('');
      setLoading(true);
      await loadData();
      showToast('Note for ' + stu.studentName + ' published.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to publish this note.');
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teacher Notes & Student Updates</h1>
        <p className="text-sm text-slate-500">
          Continuous behavioral observations, achievements, and feedback accessible by parents and faculty.
        </p>
      </div>

      {!readOnly && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-blue-600" /> Add Student Note / Progress Update
          </h2>
          <form onSubmit={handleSaveUpdate} className="space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.studentId}>
                      {s.studentName} ({s.studentId} - {s.class})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Posting Teacher</label>
                <input
                  type="text"
                  disabled
                  value={teacherName}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observation / Note</label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Student participated well in today's class discussion."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || students.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" /> Publish Student Note
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent Observations</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? <p className="col-span-full rounded-xl bg-white p-8 text-center text-sm text-slate-400">Loading updates...</p> : updates.length === 0 ? <p className="col-span-full rounded-xl bg-white p-8 text-center text-sm text-slate-400">No updates have been published.</p> : updates.map((upd) => (
            <div
              key={upd.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-200 transition-all"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <span className="font-bold text-slate-900 text-sm">{upd.studentName}</span>
                  <span className="font-mono text-xs font-semibold text-blue-600">{upd.studentId}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  &ldquo;{upd.updateText}&rdquo;
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-medium text-slate-600">By: {upd.teacherName}</span>
                <span>{upd.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
