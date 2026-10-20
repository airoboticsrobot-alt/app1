import React, { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { dataService } from '../services/dataService';
import { SchoolClass, Student } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  CheckCircle,
  GraduationCap,
} from 'lucide-react';

export const Students: React.FC = () => {
  const { userProfile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('Active');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formStudent, setFormStudent] = useState({
    studentId: '',
    studentName: '',
    gender: 'Male' as Student['gender'],
    dob: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    class: '',
    division: 'A',
    address: '',
    admissionDate: '2024-06-01',
  });

  const loadData = useCallback(async (showLoading = true) => {
    if (userProfile?.role !== 'admin') return;
    if (showLoading) setLoading(true);
    try {
      const [list, classRecords] = await Promise.all([
        dataService.getStudents(undefined, undefined, true),
        dataService.getClasses(),
      ]);
      setClasses(classRecords);
      setStudents(list);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load students.');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  const loadDataFromEffect = useEffectEvent(() => {
    void loadData(false);
  });

  useEffect(() => {
    loadDataFromEffect();
  }, [userProfile]);

  const filteredStudents = students.filter((student) => {
    const query = search.trim().toLowerCase();
    return (!query ||
      student.studentName.toLowerCase().includes(query) ||
      student.studentId.toLowerCase().includes(query) ||
      student.parentName.toLowerCase().includes(query)) &&
      (selectedClass === 'All' || student.class === selectedClass) &&
      (selectedDivision === 'All' || student.division === selectedDivision) &&
      (userProfile?.role !== 'admin' || selectedStatus === 'All' ||
        (selectedStatus === 'Active' ? student.active !== false : student.active === false));
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    const nextNumber = students.reduce((currentMax, student) => {
      const numericId = Number(student.studentId.replace(/\D/g, ''));
      return Number.isFinite(numericId) ? Math.max(currentMax, numericId) : currentMax;
    }, 1000) + 1;
    const nextId = 'STU' + nextNumber;
    setFormStudent({
      studentId: nextId,
      studentName: '',
      gender: 'Male',
      dob: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      class: classes[0]?.grade || '',
      division: classes[0]?.divisions[0] || '',
      address: '',
      admissionDate: new Date().toISOString().split('T')[0],
    });
    setError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await dataService.addStudent({
        admissionNumber: formStudent.studentId,
        fullName: formStudent.studentName,
        gender: formStudent.gender,
        dateOfBirth: formStudent.dob,
        parentName: formStudent.parentName,
        parentPhone: formStudent.parentPhone,
        parentEmail: formStudent.parentEmail,
        className: formStudent.class,
        division: formStudent.division,
        address: formStudent.address,
        admissionDate: formStudent.admissionDate,
      });

      await loadData();
      setIsAddModalOpen(false);
      showToast('Student added. Password setup email sent to ' + formStudent.parentEmail + '.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add student.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (stu: Student) => {
    setActiveStudent(stu);
    setFormStudent({
      studentId: stu.admissionNumber,
      studentName: stu.studentName,
      gender: stu.gender,
      dob: stu.dateOfBirth,
      parentName: stu.parentName,
      parentPhone: stu.parentPhone,
      parentEmail: stu.parentEmail,
      class: stu.className,
      division: stu.division,
      address: stu.address,
      admissionDate: stu.admissionDate,
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    setSaving(true);
    setError(null);
    try {
      await dataService.updateStudent(activeStudent.id, {
        fullName: formStudent.studentName.trim(),
        gender: formStudent.gender,
        dateOfBirth: formStudent.dob,
        parentName: formStudent.parentName.trim(),
        parentPhone: formStudent.parentPhone.trim(),
        className: formStudent.class,
        division: formStudent.division,
        address: formStudent.address,
        admissionDate: formStudent.admissionDate,
      });

      await loadData();
      setIsEditModalOpen(false);
      showToast('Student ' + formStudent.studentName + ' updated successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update student.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStudentActive = async (stu: Student) => {
    const nextActive = stu.active === false;
    const action = nextActive ? 'activate' : 'deactivate';
    if (!window.confirm('Are you sure you want to ' + action + ' ' + stu.studentName + ' (' + stu.studentId + ')?')) return;

    setUpdatingStudentId(stu.id);
    setError(null);
    try {
      await dataService.setStudentActive(stu.id, nextActive);
      await loadData();
      showToast('Student ' + stu.studentName + (nextActive ? ' activated.' : ' deactivated.'));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update student status.');
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const handleViewDetails = (stu: Student) => {
    setActiveStudent(stu);
    setIsDetailModalOpen(true);
  };

  const getFeeBadge = (status: string) => {
    if (status === 'Paid') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (status === 'Partial') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  if (userProfile?.role !== 'admin') {
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Student management is only available to administrators.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Header & Main Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Management</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              {students.filter((student) => student.active !== false).length} Active Students
            </span>
          </div>
          <p className="text-sm text-slate-500">View, filter, add, edit, or update enrollment status.</p>
        </div>
        {userProfile?.role === 'admin' && <button
          onClick={handleOpenAdd}
          disabled={classes.length === 0}
          title={classes.length === 0 ? 'Configure at least one class first' : undefined}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </button>}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Student Name, ID, or Parent Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="All">All Classes</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.grade}>{schoolClass.grade}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Divisions</option>
            {[...new Set(classes.flatMap((schoolClass) => schoolClass.divisions))].map((division) => (
              <option key={division} value={division}>Div {division}</option>
            ))}
          </select>
          {userProfile?.role === 'admin' && <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by enrollment status"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="All">All statuses</option>
          </select>}
        </div>
      </div>

      {/* Student Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Student ID</th>
                <th className="px-4 py-3.5">Name</th>
                <th className="px-4 py-3.5">Class & Div</th>
                <th className="px-4 py-3.5">Gender</th>
                <th className="px-4 py-3.5">Parent Contact</th>
                <th className="px-4 py-3.5">Fee Status</th>
                <th className="px-4 py-3.5">Enrollment</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Loading students...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No students match your query.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900">
                      {stu.studentId}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {stu.studentName}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {stu.class} - {stu.division}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {stu.gender}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <div className="font-medium text-slate-800">{stu.parentName}</div>
                      <div className="text-slate-400">{stu.parentPhone}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ' + getFeeBadge(stu.feeStatus)}>
                        {stu.feeStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ' +
                        (stu.active === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800')}>
                        {stu.active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetails(stu)}
                          title="View Student Details"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {userProfile?.role === 'admin' && <>
                          <button
                            onClick={() => handleOpenEdit(stu)}
                            title="Edit Student"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStudentActive(stu)}
                            title={stu.active === false ? 'Activate Student' : 'Deactivate Student'}
                            disabled={updatingStudentId === stu.id}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {stu.active === false
                              ? <CheckCircle className="h-4 w-4 text-emerald-600" />
                              : <Trash2 className="h-4 w-4" />}
                          </button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
          <span>Showing {filteredStudents.length} of {students.length} students</span>
        </div>
      </div>

      {/* ADD STUDENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add New Student</h2>
                  <p className="text-xs text-slate-500">Enter student and parent demographic details</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewStudent} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={formStudent.studentId}
                    onChange={(e) => setFormStudent({ ...formStudent, studentId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Rahul Nair"
                    value={formStudent.studentName}
                    onChange={(e) => setFormStudent({ ...formStudent, studentName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formStudent.gender}
                    required
                    onChange={(e) => setFormStudent({ ...formStudent, gender: e.target.value as Student['gender'] })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formStudent.dob}
                    onChange={(e) => setFormStudent({ ...formStudent, dob: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                  <select
                    value={formStudent.class}
                    required
                    onChange={(e) => {
                      const nextClass = classes.find((schoolClass) => schoolClass.grade === e.target.value);
                      setFormStudent({ ...formStudent, class: e.target.value, division: nextClass?.divisions[0] || '' });
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {classes.map((schoolClass) => (
                      <option key={schoolClass.id} value={schoolClass.grade}>{schoolClass.grade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Division</label>
                  <select
                    value={formStudent.division}
                    required
                    onChange={(e) => setFormStudent({ ...formStudent, division: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {(classes.find((schoolClass) => schoolClass.grade === formStudent.class)?.divisions || []).map((division) => (
                      <option key={division} value={division}>{division}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Suresh Nair"
                    value={formStudent.parentName}
                    onChange={(e) => setFormStudent({ ...formStudent, parentName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Phone *</label>
                  <input
                    type="tel"
                    required
                    maxLength={30}
                    placeholder="+91 98451 12345"
                    value={formStudent.parentPhone}
                    onChange={(e) => setFormStudent({ ...formStudent, parentPhone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Email *</label>
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={formStudent.parentEmail}
                    onChange={(e) => setFormStudent({ ...formStudent, parentEmail: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Date *</label>
                  <input
                    type="date"
                    required
                    value={formStudent.admissionDate}
                    onChange={(e) => setFormStudent({ ...formStudent, admissionDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={formStudent.address}
                  onChange={(e) => setFormStudent({ ...formStudent, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {isEditModalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Student: {activeStudent.studentName}</h2>
                <p className="text-xs text-slate-500">ID: {activeStudent.studentId}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formStudent.studentName}
                    onChange={(e) => setFormStudent({ ...formStudent, studentName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formStudent.gender}
                    required
                    onChange={(e) => setFormStudent({ ...formStudent, gender: e.target.value as Student['gender'] })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formStudent.dob}
                    onChange={(e) => setFormStudent({ ...formStudent, dob: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                  <select
                    value={formStudent.class}
                    required
                    onChange={(e) => {
                      const nextClass = classes.find((schoolClass) => schoolClass.grade === e.target.value);
                      setFormStudent({ ...formStudent, class: e.target.value, division: nextClass?.divisions[0] || '' });
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {classes.map((schoolClass) => (
                      <option key={schoolClass.id} value={schoolClass.grade}>{schoolClass.grade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Division</label>
                  <select
                    value={formStudent.division}
                    required
                    onChange={(e) => setFormStudent({ ...formStudent, division: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {(classes.find((schoolClass) => schoolClass.grade === formStudent.class)?.divisions || []).map((division) => (
                      <option key={division} value={division}>{division}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Name</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formStudent.parentName}
                    onChange={(e) => setFormStudent({ ...formStudent, parentName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Phone</label>
                  <input
                    type="tel"
                    required
                    maxLength={30}
                    value={formStudent.parentPhone}
                    onChange={(e) => setFormStudent({ ...formStudent, parentPhone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Email</label>
                    <input
                      type="email"
                      readOnly
                      maxLength={254}
                      value={formStudent.parentEmail}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Date *</label>
                    <input
                      type="date"
                      required
                      value={formStudent.admissionDate}
                      onChange={(e) => setFormStudent({ ...formStudent, admissionDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formStudent.address}
                  onChange={(e) => setFormStudent({ ...formStudent, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Update Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isDetailModalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {activeStudent.studentName[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{activeStudent.studentName}</h3>
                  <span className="font-mono text-xs text-blue-600 font-bold">{activeStudent.studentId}</span>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs py-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Class & Division</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{activeStudent.class} - {activeStudent.division}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Gender</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{activeStudent.gender}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Date of Birth</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{activeStudent.dob}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Admission Date</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{activeStudent.admissionDate}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Fee Status</span>
                <p className="mt-0.5 font-bold uppercase text-blue-600">{activeStudent.feeStatus}</p>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Parent Email</span>
                <p className="text-sm text-slate-900 mt-0.5">{activeStudent.parentEmail || 'Not provided'}</p>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Parent Details</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{activeStudent.parentName} ({activeStudent.parentPhone})</p>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                <span className="text-slate-400 uppercase font-semibold">Residential Address</span>
                <p className="text-xs text-slate-800 mt-0.5">{activeStudent.address}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
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
