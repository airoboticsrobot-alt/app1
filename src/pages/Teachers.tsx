import React, { useCallback, useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { SchoolClass, Teacher } from '../types';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  CheckCircle,
  Users,
  Mail,
} from 'lucide-react';

export const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedClass, setSelectedClass] = useState('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formTeacher, setFormTeacher] = useState({
    teacherId: '',
    teacherName: '',
    email: '',
    phone: '',
    subject: 'Mathematics',
    assignedClass: 'Grade 1A',
    username: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  const subjects = [
    'Malayalam',
    'English',
    'Mathematics',
    'Science',
    'Social Science',
    'Arabic',
    'Computer Science',
    'Islamic Studies',
    'Hindi',
    'Physical Education',
  ];

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [list, classList] = await Promise.all([
        dataService.getTeachers(),
        dataService.getClasses(),
      ]);
      setTeachers(list);
      setClasses(classList);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load teachers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const filteredTeachers = teachers.filter((teacher) => {
    const query = search.trim().toLowerCase();
    return (!query || teacher.teacherName.toLowerCase().includes(query) ||
      teacher.email.toLowerCase().includes(query) || teacher.teacherId.toLowerCase().includes(query)) &&
      (selectedSubject === 'All' || teacher.subject === selectedSubject) &&
      (selectedClass === 'All' || teacher.assignedClass.replace(/[A-Z]+$/, '').trim() === selectedClass);
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    const nextNumber = teachers.reduce((currentMax, teacher) => {
      const numericId = Number(teacher.teacherId.replace(/\D/g, ''));
      return Number.isFinite(numericId) ? Math.max(currentMax, numericId) : currentMax;
    }, 100) + 1;
    const nextId = 'TCH' + nextNumber;
    setFormTeacher({
      teacherId: nextId,
      teacherName: '',
      email: '',
      phone: '+91 ',
      subject: 'Mathematics',
      assignedClass: classes[0] ? classes[0].grade + (classes[0].divisions[0] || '') : '',
      username: 'teacher' + (teachers.length + 1),
      status: 'Active',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeacher.teacherName || !formTeacher.email) return;

    try {
      await dataService.addTeacher({
        teacherId: formTeacher.teacherId,
        teacherName: formTeacher.teacherName,
        email: formTeacher.email,
        phone: formTeacher.phone,
        subject: formTeacher.subject,
        assignedClass: formTeacher.assignedClass,
        username: formTeacher.username || formTeacher.email.split('@')[0],
        status: formTeacher.status,
      });
      await loadData();
      setIsAddModalOpen(false);
      showToast('Teacher account created. Password setup email sent to ' + formTeacher.email.trim() + '.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add teacher.');
    }
  };

  const handleCreateTeacherLogin = async (teacher: Teacher) => {
    setError(null);
    try {
      await dataService.createTeacherLogin(teacher.id);
      showToast('Teacher login created. Password setup email sent to ' + teacher.email + '.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create the teacher login.');
    }
  };

  const handleOpenEdit = (tch: Teacher) => {
    setActiveTeacher(tch);
    setFormTeacher({
      teacherId: tch.teacherId,
      teacherName: tch.teacherName,
      email: tch.email,
      phone: tch.phone,
      subject: tch.subject,
      assignedClass: tch.assignedClass,
      username: tch.username,
      status: tch.status,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher) return;

    try {
      await dataService.updateTeacher(activeTeacher.id, {
        teacherName: formTeacher.teacherName,
        email: formTeacher.email,
        phone: formTeacher.phone,
        subject: formTeacher.subject,
        assignedClass: formTeacher.assignedClass,
        status: formTeacher.status,
      });
      await loadData();
      setIsEditModalOpen(false);
      showToast('Teacher ' + formTeacher.teacherName + ' updated successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update teacher.');
    }
  };

  const handleDeleteTeacher = async (tch: Teacher) => {
    if (window.confirm('Delete faculty member ' + tch.teacherName + '?')) {
      try {
        await dataService.deleteTeacher(tch.id);
        await loadData();
        showToast('Teacher ' + tch.teacherName + ' removed.');
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete teacher.');
      }
    }
  };

  const classAssignments = classes.flatMap((schoolClass) =>
    schoolClass.divisions.map((division) => schoolClass.grade + division),
  );

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teacher Management</h1>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
              {teachers.length} Faculty
            </span>
          </div>
          <p className="text-sm text-slate-500">View, filter, add, edit and assign teaching faculty.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Teacher
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search faculty by name, ID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Grades</option>
            {Array.from({ length: 10 }, (_, i) => 'Grade ' + (i + 1)).map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Teacher List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Teacher Name</th>
                <th className="px-4 py-3.5">Subject</th>
                <th className="px-4 py-3.5">Assigned Class</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading teachers...</td></tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((tch) => (
                  <tr key={tch.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900">
                      {tch.teacherId}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {tch.teacherName}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                        {tch.subject}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800 text-xs">
                      {tch.assignedClass}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <div className="text-slate-900 font-medium">{tch.email}</div>
                      <div className="text-slate-400">{tch.phone}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ' + (
                        tch.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600'
                      )}>
                        {tch.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => void handleCreateTeacherLogin(tch)}
                          title="Create teacher login and send password setup email"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setActiveTeacher(tch); setIsDetailModalOpen(true); }}
                          title="View Profile"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(tch)}
                          title="Edit Teacher"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-purple-600 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(tch)}
                          title="Delete Teacher"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD TEACHER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-purple-100 p-2 text-purple-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add New Teacher</h2>
                  <p className="text-xs text-slate-500">Register faculty profile and class assignment</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teacher ID *</label>
                  <input
                    type="text"
                    required
                    value={formTeacher.teacherId}
                    onChange={(e) => setFormTeacher({ ...formTeacher, teacherId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Pillai"
                    value={formTeacher.teacherName}
                    onChange={(e) => setFormTeacher({ ...formTeacher, teacherName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="teacher@school.com"
                    value={formTeacher.email}
                    onChange={(e) => setFormTeacher({ ...formTeacher, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formTeacher.phone}
                    onChange={(e) => setFormTeacher({ ...formTeacher, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <select
                    value={formTeacher.subject}
                    onChange={(e) => setFormTeacher({ ...formTeacher, subject: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {subjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Class</label>
                  <select
                    value={formTeacher.assignedClass}
                    onChange={(e) => setFormTeacher({ ...formTeacher, assignedClass: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {classAssignments.map((assignment) => <option key={assignment} value={assignment}>{assignment}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={formTeacher.username}
                    onChange={(e) => setFormTeacher({ ...formTeacher, username: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">Firebase sign-in accounts and role profiles must be provisioned securely by an administrator.</p>

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
                  className="rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700 cursor-pointer"
                >
                  Save Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEACHER MODAL */}
      {isEditModalOpen && activeTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Edit Teacher: {activeTeacher.teacherName}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeacher} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formTeacher.teacherName}
                    onChange={(e) => setFormTeacher({ ...formTeacher, teacherName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formTeacher.email}
                    onChange={(e) => setFormTeacher({ ...formTeacher, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <select
                    value={formTeacher.subject}
                    onChange={(e) => setFormTeacher({ ...formTeacher, subject: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {subjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Class</label>
                  <select
                    value={formTeacher.assignedClass}
                    onChange={(e) => setFormTeacher({ ...formTeacher, assignedClass: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {!classAssignments.includes(formTeacher.assignedClass) && formTeacher.assignedClass && (
                      <option value={formTeacher.assignedClass}>{formTeacher.assignedClass} (existing)</option>
                    )}
                    {classAssignments.map((assignment) => <option key={assignment} value={assignment}>{assignment}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formTeacher.status}
                    onChange={(e) => setFormTeacher({ ...formTeacher, status: e.target.value as Teacher['status'] })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
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
                  className="rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700 cursor-pointer"
                >
                  Update Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailModalOpen && activeTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
                  {activeTeacher.teacherName[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{activeTeacher.teacherName}</h3>
                  <span className="font-mono text-xs text-purple-600 font-bold">{activeTeacher.teacherId}</span>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Subject & Class</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{activeTeacher.subject} — {activeTeacher.assignedClass}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Email & Phone</span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">{activeTeacher.email}</p>
                <p className="text-xs text-slate-500">{activeTeacher.phone}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Username</span>
                <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">{activeTeacher.username}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
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
