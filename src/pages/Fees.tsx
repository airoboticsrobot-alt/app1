import React, { useCallback, useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { FeeRecord, FeePayment, SchoolClass, Student } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  DollarSign,
  Receipt,
  X,
  CheckCircle,
} from 'lucide-react';

interface FeesProps {
  readOnly?: boolean;
}

export const Fees: React.FC<FeesProps> = ({ readOnly = false }) => {
  const { userProfile } = useAuth();
  const canManageFees = userProfile?.role === 'admin' && !readOnly;
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modals
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [activeFee, setActiveFee] = useState<FeeRecord | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [paymentAmount, setPaymentAmount] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer / UPI');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Add fee state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newFeeType, setNewFeeType] = useState('');
  const [newTotalFee, setNewTotalFee] = useState<number>(0);
  const [newPaidFee, setNewPaidFee] = useState<number>(0);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let feeList: FeeRecord[];
      let studentList: Student[];
      let paymentList: FeePayment[];
      let classList: SchoolClass[];
      if (userProfile?.role === 'teacher') {
        const teacher = await dataService.getTeacherForUser(userProfile.email, userProfile.linkedId);
        const assignment = teacher?.assignedClass.match(/^(.*?)([A-Z])$/);
        if (!assignment) throw new Error('No class is assigned to this teacher account. Contact your administrator.');
        const classLabel = assignment[1].trim() + ' ' + assignment[2];
        feeList = await dataService.getFees(undefined, classLabel);
        classList = await dataService.getClasses(assignment[1].trim());
        studentList = [];
        paymentList = [];
      } else {
        [feeList, studentList, paymentList, classList] = await Promise.all([
          dataService.getFees(),
          dataService.getStudents(),
          dataService.getPayments(),
          dataService.getClasses(),
        ]);
      }
      setFees(feeList);
      setStudents(studentList);
      setPayments(paymentList);
      setClasses(classList);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load fee records.');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const filteredFees = fees.filter((fee) => {
    const query = search.trim().toLowerCase();
    return (!query || fee.studentName.toLowerCase().includes(query) || fee.studentId.toLowerCase().includes(query)) &&
      (selectedClass === 'All' || fee.class === selectedClass || fee.class.startsWith(selectedClass + ' ')) &&
      (selectedStatus === 'All' || fee.paymentStatus === selectedStatus);
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenRecordPayment = (fee: FeeRecord) => {
    setActiveFee(fee);
    setPaymentAmount(fee.pendingAmount > 0 ? fee.pendingAmount : 0);
    setIsRecordPaymentOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFee || paymentAmount <= 0) return;

    try {
      await dataService.recordPayment(activeFee.id, paymentAmount, paymentMethod, paymentNotes);
      await loadData();
      setIsRecordPaymentOpen(false);
      showToast('Payment of ₹' + paymentAmount.toLocaleString('en-IN') + ' recorded for ' + activeFee.studentName + '.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to record payment.');
    }
  };

  const handleSaveNewFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find((s) => s.studentId === selectedStudentId);
    if (!stu) return;

    try {
      await dataService.addFeeRecord({
        studentDocId: stu.id,
        studentId: stu.studentId,
        studentName: stu.studentName,
        class: stu.class + ' ' + stu.division,
        feeType: newFeeType,
        totalFee: newTotalFee,
        paidAmount: newPaidFee,
        paymentDate: newPaidFee > 0 ? new Date().toISOString().split('T')[0] : '-',
      });

      await loadData();
      setIsAddFeeOpen(false);
      showToast('Fee bill generated for ' + stu.studentName + '.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create fee record.');
    }
  };

  const formatCurrency = (val: number) => {
    return '₹' + (val || 0).toLocaleString('en-IN');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Paid') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (status === 'Partial') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Management</h1>
          <p className="text-sm text-slate-500">
            {readOnly ? 'Student fee payment status directory.' : 'Track invoices, dues, and record student tuition collections.'}
          </p>
        </div>
        {canManageFees && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (students.length > 0) setSelectedStudentId(students[0].studentId);
                setIsAddFeeOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Fee Bill
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Student Name or Student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
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

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Fees Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Student ID</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Class</th>
                <th className="px-4 py-3.5">Fee Type</th>
                <th className="px-4 py-3.5">Total Fee</th>
                <th className="px-4 py-3.5">Paid Amount</th>
                <th className="px-4 py-3.5">Pending</th>
                <th className="px-4 py-3.5">Status</th>
                {canManageFees && <th className="px-4 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={canManageFees ? 9 : 8} className="px-4 py-12 text-center text-slate-400">Loading fee records...</td></tr>
              ) : filteredFees.length === 0 ? (
                <tr>
                  <td colSpan={canManageFees ? 9 : 8} className="px-4 py-12 text-center text-slate-400">
                    No fee records found.
                  </td>
                </tr>
              ) : (
                filteredFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900">
                      {fee.studentId}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {fee.studentName}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">
                      {fee.class}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 max-w-[180px] truncate">
                      {fee.feeType}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 text-xs">
                      {formatCurrency(fee.totalFee)}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-emerald-600 text-xs">
                      {formatCurrency(fee.paidAmount)}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-amber-600 text-xs">
                      {formatCurrency(fee.pendingAmount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ' + getStatusBadge(fee.paymentStatus)}>
                        {fee.paymentStatus}
                      </span>
                    </td>
                    {canManageFees && (
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenRecordPayment(fee)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                          title="Record Payment"
                        >
                          <DollarSign className="h-3 w-3" />
                          Record Payment
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManageFees && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Recent Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading payment history...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No payments have been recorded.</td></tr>
                ) : [...payments]
                  .sort((first, second) => second.paymentDate.localeCompare(first.paymentDate))
                  .slice(0, 20)
                  .map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 text-xs">{payment.paymentDate}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{payment.studentName} <span className="font-mono text-xs text-slate-400">{payment.studentId}</span></td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3 text-xs">{payment.paymentMethod}</td>
                      <td className="px-4 py-3 text-xs">{payment.notes || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isRecordPaymentOpen && activeFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Record Payment</h2>
                  <p className="text-xs text-slate-500">{activeFee.studentName} ({activeFee.studentId})</p>
                </div>
              </div>
              <button onClick={() => setIsRecordPaymentOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Total Bill Amount:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(activeFee.totalFee)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Already Paid:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(activeFee.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Current Outstanding Due:</span>
                  <span className="font-bold text-amber-600">{formatCurrency(activeFee.pendingAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer / UPI">Bank Transfer / UPI</option>
                  <option value="Cheque / DD">Cheque / Demand Draft</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Transaction Ref</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. UPI Ref #90348821"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  Confirm & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD FEE BILL MODAL */}
      {isAddFeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Add Fee Invoice</h2>
              <button onClick={() => setIsAddFeeOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewFee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.studentId}>
                      {s.studentName} ({s.studentId} - {s.class})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Type / Description *</label>
                <input
                  type="text"
                  required
                  value={newFeeType}
                  onChange={(e) => setNewFeeType(e.target.value)}
                  placeholder="e.g. Science Lab & Field Trip Fee"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newTotalFee}
                    onChange={(e) => setNewTotalFee(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Paid (₹)</label>
                  <input
                    type="number"
                    value={newPaidFee}
                    onChange={(e) => setNewPaidFee(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFeeOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Create Fee Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
