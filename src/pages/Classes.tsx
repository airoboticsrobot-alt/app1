import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { SchoolClass, Student, Teacher } from '../types';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Users,
  X,
  CheckCircle,
  GraduationCap,
} from 'lucide-react';

export const Classes: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewStudentsOpen, setIsViewStudentsOpen] = useState(false);
  const [activeClass, setActiveClass] = useState<SchoolClass | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gradeInput, setGradeInput] = useState('');
  const [divisionInput, setDivisionInput] = useState('A, B');
  const [assignedTeacherId, setAssignedTeacherId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [classList, studentList, teacherList] = await Promise.all([
        dataService.getClasses(),
        dataService.getStudents(),
        dataService.getTeachers(),
      ]);
      setClasses(classList);
      setStudents(studentList);
      setTeachers(teacherList);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setGradeInput('');
    setDivisionInput('A, B');
    setAssignedTeacherId('');
    setIsAddModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const divs = divisionInput.split(',').map((d) => d.trim().toUpperCase()).filter(Boolean);
    const selectedTch = teachers.find((t) => t.teacherId === assignedTeacherId);

    try {
      await dataService.addClass(
        gradeInput,
        divs.length ? divs : ['A'],
        assignedTeacherId || undefined,
        selectedTch ? selectedTch.teacherName : undefined
      );
      await loadData();
      setIsAddModalOpen(false);
      showToast('Class ' + gradeInput + ' added successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add class.');
    }
  };

  const handleOpenEdit = (cls: SchoolClass) => {
    setActiveClass(cls);
    setGradeInput(cls.grade);
    setDivisionInput(cls.divisions.join(', '));
    setAssignedTeacherId(cls.assignedTeacherId || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;

    const divs = divisionInput.split(',').map((d) => d.trim().toUpperCase()).filter(Boolean);
    const selectedTch = teachers.find((t) => t.teacherId === assignedTeacherId);

    try {
      await dataService.updateClass(activeClass.id, {
        grade: gradeInput,
        divisions: divs.length ? divs : ['A'],
        assignedTeacherId: assignedTeacherId || undefined,
        assignedTeacherName: selectedTch ? selectedTch.teacherName : undefined,
      });
      await loadData();
      setIsEditModalOpen(false);
      showToast('Class ' + gradeInput + ' updated successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update class.');
    }
  };

  const handleDeleteClass = async (cls: SchoolClass) => {
    if (window.confirm('Delete ' + cls.grade + '? Students in this grade will remain in database.')) {
      try {
        await dataService.deleteClass(cls.id);
        await loadData();
        showToast('Class ' + cls.grade + ' deleted.');
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete class.');
      }
    }
  };

  const handleViewStudents = (cls: SchoolClass) => {
    setActiveClass(cls);
    setIsViewStudentsOpen(true);
  };

  const getStudentsInClass = (grade: string) => {
    return students.filter((s) => s.class === grade);
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

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Class Management</h1>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              {classes.length} Classes
            </span>
          </div>
          <p className="text-sm text-slate-500">Add, edit, or configure grade levels, divisions, and faculty coordinators.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Class
        </button>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? <p className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Loading classes...</p> : classes.length === 0 ? <p className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">No classes have been configured yet.</p> : classes.map((cls) => {
          const classStudents = getStudentsInClass(cls.grade);
          return (
            <div
              key={cls.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">{cls.grade}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cls)}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-amber-600 cursor-pointer"
                      title="Edit Class"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      title="Delete Class"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cls.divisions.map((div) => (
                    <span
                      key={div}
                      className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700"
                    >
                      Div {div}
                    </span>
                  ))}
                </div>

                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Assigned Faculty:</span>
                    <span className="font-bold text-slate-800">{cls.assignedTeacherName || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Enrolled Students:</span>
                    <span className="font-bold text-blue-600">{classStudents.length} Students</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleViewStudents(cls)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <Users className="h-3.5 w-3.5" />
                  View Enrolled Students ({classStudents.length})
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD CLASS MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add Class</h2>
                  <p className="text-xs text-slate-500">Define grade level and divisions</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grade / Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 11"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Divisions (comma separated) *</label>
                <input
                  type="text"
                  required
                  placeholder="A, B, C"
                  value={divisionInput}
                  onChange={(e) => setDivisionInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Teacher</label>
                <select
                  value={assignedTeacherId}
                  onChange={(e) => setAssignedTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.teacherId} value={t.teacherId}>
                      {t.teacherName} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLASS MODAL */}
      {isEditModalOpen && activeClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Edit {activeClass.grade}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grade Name</label>
                <input
                  type="text"
                  required
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Divisions</label>
                <input
                  type="text"
                  required
                  value={divisionInput}
                  onChange={(e) => setDivisionInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Teacher</label>
                <select
                  value={assignedTeacherId}
                  onChange={(e) => setAssignedTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.teacherId} value={t.teacherId}>
                      {t.teacherName} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer"
                >
                  Update Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW STUDENTS IN CLASS MODAL */}
      {isViewStudentsOpen && activeClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Students in {activeClass.grade} ({getStudentsInClass(activeClass.grade).length})
                </h2>
              </div>
              <button onClick={() => setIsViewStudentsOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {getStudentsInClass(activeClass.grade).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {s.studentId}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{s.studentName}</span>
                      <span className="ml-2 text-slate-400">Div {s.division}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-slate-600">Parent: {s.parentName}</span>
                    <span className="block text-[11px] text-slate-400">{s.parentPhone}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsViewStudentsOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
