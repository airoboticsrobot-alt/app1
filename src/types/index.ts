export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  linkedId?: string; // teacherId or studentId if applicable
}

export interface Student {
  id: string; // Firestore doc ID
  admissionNumber: string;
  fullName: string;
  dateOfBirth: string;
  className: string;
  parentEmail: string;
  status: 'active' | 'inactive';
  updatedAt: string;
  // Existing application aliases retained for attendance, marks, and fee modules.
  studentId: string; // e.g. STU1001
  studentName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  parentName: string;
  parentPhone: string;
  email?: string;
  class: string; // e.g. 'Grade 1'
  division: string; // e.g. 'A'
  address: string;
  admissionDate: string;
  feeStatus: 'Paid' | 'Partial' | 'Pending';
  active: boolean;
  createdAt: string;
}

export interface StudentInput {
  admissionNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: Student['gender'];
  className: string;
  division: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  address?: string;
  admissionDate?: string;
}

export interface Teacher {
  id: string; // Firestore doc ID
  teacherId: string; // e.g. TCH101
  teacherName: string;
  email: string;
  phone: string;
  subject: string;
  assignedClass: string; // e.g. 'Grade 1A'
  username: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
}

export interface SchoolClass {
  id: string;
  grade: string; // e.g. 'Grade 1'
  divisions: string[]; // e.g. ['A', 'B']
  assignedTeacherId?: string;
  assignedTeacherName?: string;
}

export interface AttendanceRecord {
  id: string;
  class: string;
  division: string;
  date: string; // YYYY-MM-DD
  records: {
    studentId: string; // STU code or doc id
    studentName: string;
    status: 'Present' | 'Absent';
  }[];
  markedBy?: string;
  createdAt?: string;
}

export interface StudentMark {
  id: string;
  studentDocId: string;
  studentId: string;
  studentName: string;
  class: string;
  division: string;
  subject: string;
  marks: number;
  totalMarks: number;
  date: string;
  examName?: string;
}

export interface TeacherUpdate {
  id: string;
  studentDocId: string;
  studentId: string;
  studentName: string;
  date: string;
  teacherName: string;
  updateText: string;
  createdAt?: string;
}

export interface FeeRecord {
  id: string;
  studentDocId: string;
  studentId: string;
  studentName: string;
  class: string;
  feeType: string;
  totalFee: number;
  paidAmount: number;
  pendingAmount: number;
  paymentDate: string;
  paymentStatus: 'Paid' | 'Partial' | 'Pending';
}

export interface FeePayment {
  id: string;
  feeId: string;
  studentId: string;
  studentName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}
