import React, { useEffect, useEffectEvent, useState } from 'react';
import { dataService } from '../services/dataService';
import { SchoolClass, Student, StudentMark } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  Save,
  CheckCircle,
} from 'lucide-react';

interface MarksProps {
  readOnly?: boolean;
}

export const Marks: React.FC<MarksProps> = ({ readOnly = false }) => {
  const { userProfile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [marksList, setMarksList] = useState<StudentMark[]>([]);
  const [teacherSubject, setTeacherSubject] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [entrySubject, setEntrySubject] = useState('');

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [examName, setExamName] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subjects = [
    'Mathematics',
    'Science',
    'English',
    'Social Science',
    'Computer Science',
    'Malayalam',
    'Hindi',
    'Arabic',
  ];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      let allStudents: Student[];
      let allMarks: StudentMark[];
      let classList: SchoolClass[];
      let assignedSubject: string | null = null;
      if (userProfile?.role === 'teacher') {
        const teacher = await dataService.getTeacherForUser(userProfile.email, userProfile.linkedId);
        const assignment = teacher?.assignedClass.match(/^(.*?)([A-Z])$/);
        if (!assignment || !teacher) throw new Error('No class is assigned to this teacher account. Contact your administrator.');
        assignedSubject = teacher.subject;
        [allStudents, allMarks, classList] = await Promise.all([
          dataService.getStudents(assignment[1].trim(), assignment[2]),
          dataService.getMarks(undefined, assignment[1].trim(), assignment[2], assignedSubject),
          dataService.getClasses(assignment[1].trim()),
        ]);
      } else {
        [allStudents, allMarks, classList] = await Promise.all([
          dataService.getStudents(),
          dataService.getMarks(),
          dataService.getClasses(),
        ]);
      }
      setStudents(allStudents);
      setClasses(classList);
      setMarksList(allMarks);
      setTeacherSubject(assignedSubject);
      if (assignedSubject) {
        setSelectedSubject(assignedSubject);
        setEntrySubject(assignedSubject);
      }
      if (allStudents.length > 0 && !allStudents.some((student) => student.studentId === selectedStudentId)) {
        setSelectedStudentId(allStudents[0].studentId);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load marks data.');
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

  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStudent = students.find((s) => s.studentId === selectedStudentId);
    if (!targetStudent) return;
    if (!entrySubject) {
      setError('Select a subject before saving marks.');
      return;
    }
    if (userProfile?.role === 'teacher' && selectedSubject !== teacherSubject) {
      setError('Teachers can only publish marks for their assigned subject.');
      return;
    }

    try {
      await dataService.addOrUpdateMark({
      studentDocId: targetStudent.id,
      studentId: targetStudent.studentId,
      studentName: targetStudent.studentName,
      class: targetStudent.class,
      division: targetStudent.division,
      subject: entrySubject,
      marks: score,
      totalMarks: maxScore,
      date: new Date().toISOString().split('T')[0],
      examName,
      });

      await loadData();
      showToast('Marks recorded for ' + targetStudent.studentName + ' in ' + entrySubject + '.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save marks.');
    }
  };

  const filteredMarks = marksList.filter((m) => {
    if (selectedClass !== 'All' && m.class !== selectedClass) return false;
    if (selectedSubject !== 'All' && m.subject !== selectedSubject) return false;
    return true;
  });
  const availableSubjects = teacherSubject ? [teacherSubject] : subjects;

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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Marks & Grades</h1>
        <p className="text-sm text-slate-500">
          {readOnly ? 'View graded examination evaluations' : 'Enter and update student term exam scores across curriculum subjects.'}
        </p>
      </div>

      {!readOnly && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" /> Enter or Update Marks
          </h2>
          <form onSubmit={handleSaveMarks} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student</label>
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

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Name</label>
              <input
                type="text"
                required
                maxLength={100}
                value={examName}
                onChange={(event) => setExamName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <select
                value={entrySubject}
                onChange={(e) => setEntrySubject(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none"
              >
                {!teacherSubject && <option value="">Select a subject</option>}
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Score (Marks)</label>
              <input
                type="number"
                required
                min={0}
                max={maxScore}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Marks</label>
              <input
                type="number"
                required
                min={1}
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" /> Save Score
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Classes</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.grade}>{schoolClass.grade}</option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Subjects</option>
            {availableSubjects.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredMarks.length} recorded marks
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Student ID</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Class</th>
                <th className="px-4 py-3.5">Subject</th>
                <th className="px-4 py-3.5">Exam</th>
                <th className="px-4 py-3.5">Marks Scored</th>
                <th className="px-4 py-3.5">Percentage</th>
                <th className="px-4 py-3.5 text-right">Grade Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Loading marks...</td></tr>
              ) : filteredMarks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No marks records found for this filter.
                  </td>
                </tr>
              ) : (
                filteredMarks.map((m) => {
                  const pct = Math.round((m.marks / (m.totalMarks || 100)) * 100);
                  const isPass = pct >= 40;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900">
                        {m.studentId}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        {m.studentName}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700">
                        {m.class} - {m.division}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800 text-xs">
                        {m.subject}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {m.examName || 'Assessment'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 text-xs">
                        {m.marks} / {m.totalMarks}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-800">
                        {pct}%
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className={'inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ' + (
                            isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          )}
                        >
                          {isPass ? 'Pass' : 'Needs Support'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
