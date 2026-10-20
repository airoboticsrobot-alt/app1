import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
  query,
  where,
  QueryConstraint,
  writeBatch,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signOut,
  User,
} from 'firebase/auth';
import { createStudentProvisioningAuth, auth, db } from './firebase';
import {
  AttendanceRecord,
  FeePayment,
  FeeRecord,
  SchoolClass,
  Student,
  StudentInput,
  StudentMark,
  Teacher,
  TeacherUpdate,
} from '../types';

const readCollection = async <T extends { id: string }>(
  name: string,
  filters: QueryConstraint[] = [],
): Promise<T[]> => {
  const target = collection(db, name);
  const snapshot = await getDocs(filters.length ? query(target, ...filters) : target);
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as T);
};

const makeDocumentId = (...parts: string[]): string =>
  parts.map((part) => encodeURIComponent(part.trim().toLowerCase())).join('-');

const createTemporaryPassword = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (randomValue) => characters[randomValue % characters.length]).join('');
};

const getAccountCreationError = (error: unknown): Error => {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/email-already-in-use') {
      return new Error('A Firebase Authentication account already uses this email. Use password reset for that account or contact your administrator to link its school profile.');
    }
    if (error.code === 'auth/operation-not-allowed') {
      return new Error('Enable Email/Password sign-in in Firebase Authentication to add accounts.');
    }
    if (error.code === 'auth/invalid-email') {
      return new Error('Enter a valid email address.');
    }
    if (error.code === 'auth/unauthorized-continue-uri' || error.code === 'auth/invalid-continue-uri') {
      return new Error('Add this app domain to Firebase Authentication authorized domains before sending password setup emails.');
    }
  }
  return error instanceof Error ? error : new Error('Unable to create the account and send its password setup email.');
};

const provisionTeacherLogin = async (teacher: Teacher): Promise<void> => {
  const email = teacher.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid teacher email address before creating the login.');
  }

  const now = new Date().toISOString();
  let createdAuthUser: User | null = null;
  let provisioning: Awaited<ReturnType<typeof createStudentProvisioningAuth>> | null = null;
  try {
    provisioning = await createStudentProvisioningAuth();
    const credential = await createUserWithEmailAndPassword(
      provisioning.auth,
      email,
      createTemporaryPassword(),
    );
    createdAuthUser = credential.user;

    const profileBatch = writeBatch(db);
    profileBatch.set(doc(db, 'users', createdAuthUser.uid), {
      uid: createdAuthUser.uid,
      email,
      role: 'teacher',
      displayName: teacher.teacherName,
      linkedId: teacher.teacherId,
      teacherDocId: teacher.id,
      createdAt: now,
      updatedAt: now,
    });
    await profileBatch.commit();

    await sendPasswordResetEmail(provisioning.auth, email, {
      url: window.location.origin + '/teacher/login',
    });
  } catch (error) {
    if (createdAuthUser) {
      const rollback = writeBatch(db);
      rollback.delete(doc(db, 'users', createdAuthUser.uid));
      await rollback.commit().catch((rollbackError: unknown) => {
        console.error('Unable to roll back the incomplete teacher profile:', rollbackError);
      });
      await deleteUser(createdAuthUser).catch((rollbackError: unknown) => {
        console.error('Unable to remove the incomplete teacher Auth account:', rollbackError);
      });
    }
    throw getAccountCreationError(error);
  } finally {
    if (provisioning) {
      await signOut(provisioning.auth).catch(() => undefined);
      await provisioning.dispose().catch(() => undefined);
    }
  }
};

const asString = (value: unknown): string => typeof value === 'string' ? value : '';

const normalizeStudent = (data: Record<string, unknown>, id: string): Student => {
  const admissionNumber = asString(data.admissionNumber) || asString(data.studentId);
  const fullName = asString(data.fullName) || asString(data.studentName);
  const dateOfBirth = asString(data.dateOfBirth) || asString(data.dob);
  const className = asString(data.className) || asString(data.class);
  const status: Student['status'] = data.status === 'inactive' || data.active === false ? 'inactive' : 'active';
  const gender = data.gender === 'Male' || data.gender === 'Female' || data.gender === 'Other'
    ? data.gender
    : 'Other';
  const feeStatus = data.feeStatus === 'Paid' || data.feeStatus === 'Partial' || data.feeStatus === 'Pending'
    ? data.feeStatus
    : 'Pending';
  const createdAt = asString(data.createdAt);

  return {
    id,
    admissionNumber,
    fullName,
    dateOfBirth,
    gender,
    className,
    division: asString(data.division),
    parentName: asString(data.parentName),
    parentPhone: asString(data.parentPhone),
    parentEmail: asString(data.parentEmail),
    address: asString(data.address),
    status,
    createdAt,
    updatedAt: asString(data.updatedAt) || createdAt,
    admissionDate: asString(data.admissionDate),
    feeStatus,
    studentId: admissionNumber,
    studentName: fullName,
    dob: dateOfBirth,
    email: asString(data.email) || undefined,
    class: className,
    active: status === 'active',
  };
};

const requireAdmin = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in with an administrator account to manage students.');

  const profile = await getDoc(doc(db, 'users', user.uid));
  if (!profile.exists() || profile.data().role !== 'admin') {
    throw new Error('Only authenticated administrators can manage students.');
  }
};

class DataService {
  public async getStudents(className?: string, division?: string, includeInactive = false): Promise<Student[]> {
    const snapshot = await getDocs(collection(db, 'students'));
    const students = snapshot.docs.map((item) => normalizeStudent(item.data(), item.id));
    return students.filter((student) =>
      (!className || student.className === className) &&
      (!division || student.division === division) &&
      (includeInactive || student.status === 'active'),
    );
  }

  public async getStudentByLinkedId(linkedId?: string): Promise<Student | null> {
    if (!linkedId) return null;
    const studentsCollection = collection(db, 'students');
    const canonicalMatches = await getDocs(query(studentsCollection, where('admissionNumber', '==', linkedId)));
    const matches = canonicalMatches.empty
      ? await getDocs(query(studentsCollection, where('studentId', '==', linkedId)))
      : canonicalMatches;
    return matches.docs
      .map((item) => normalizeStudent(item.data(), item.id))
      .find((student) => student.status === 'active') || null;
  }

  public async ensureStudentUserProfile(uid: string, email: string, admissionNumber: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedAdmissionNumber = admissionNumber.trim();
    if (!uid || !normalizedEmail || !normalizedAdmissionNumber) {
      throw new Error('Enter the account email and student admission number.');
    }

    const student = await this.getStudentByLinkedId(normalizedAdmissionNumber);
    if (!student || student.admissionNumber.trim().toLowerCase() !== normalizedAdmissionNumber.toLowerCase()) {
      throw new Error('No active student record matches that admission number. Check with your school administrator.');
    }
    if (student.parentEmail.trim().toLowerCase() !== normalizedEmail) {
      throw new Error('This account email does not match the parent email on the student record.');
    }

    const userRef = doc(db, 'users', uid);
    const userSnapshot = await getDoc(userRef);
    const existing = userSnapshot.exists() ? userSnapshot.data() : undefined;
    if (existing?.role && existing.role !== 'student') {
      throw new Error('This account is already assigned to a different portal role.');
    }
    if (
      typeof existing?.linkedId === 'string' &&
      existing.linkedId.trim().toLowerCase() !== student.admissionNumber.toLowerCase()
    ) {
      throw new Error('This account is already linked to a different student record. Contact your administrator.');
    }

    const now = new Date().toISOString();
    await setDoc(userRef, {
      uid,
      email: normalizedEmail,
      role: 'student',
      displayName: typeof existing?.displayName === 'string' && existing.displayName.trim()
        ? existing.displayName
        : student.fullName,
      linkedId: student.admissionNumber,
      studentDocId: student.id,
      createdAt: typeof existing?.createdAt === 'string' ? existing.createdAt : now,
      updatedAt: now,
    }, { merge: true });
  }

  public async getTeacherForUser(email: string, linkedId?: string): Promise<Teacher | null> {
    if (linkedId) {
      const byTeacherId = await readCollection<Teacher>('teachers', [where('teacherId', '==', linkedId)]);
      if (byTeacherId.length) return byTeacherId[0].status === 'Active' ? byTeacherId[0] : null;
    }
    const byEmail = await readCollection<Teacher>('teachers', [where('email', '==', email)]);
    return byEmail.find((teacher) => teacher.status === 'Active') || null;
  }

  public async addStudent(newStudent: StudentInput): Promise<Student> {
    await requireAdmin();
    const admissionNumber = newStudent.admissionNumber.trim();
    const fullName = newStudent.fullName.trim();
    const parentName = newStudent.parentName.trim();
    const parentPhone = newStudent.parentPhone.trim();
    const className = newStudent.className.trim();
    const parentEmail = newStudent.parentEmail?.trim().toLowerCase() || '';
    if (!admissionNumber || !fullName || !newStudent.dateOfBirth || !parentName || !parentPhone ||
      !className || !newStudent.division.trim() || !parentEmail) {
      throw new Error('Complete all required student fields.');
    }
    if (!['Male', 'Female', 'Other'].includes(newStudent.gender)) {
      throw new Error('Select a valid gender.');
    }
    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      throw new Error('Enter a valid parent email address.');
    }

    const students = await this.getStudents(undefined, undefined, true);
    if (students.some((student) => student.admissionNumber.trim().toLowerCase() === admissionNumber.toLowerCase())) {
      throw new Error('A student with this admission number already exists.');
    }

    const studentRef = doc(db, 'students', makeDocumentId('student', admissionNumber));
    const now = new Date().toISOString();
    const student: Student = {
      id: studentRef.id,
      admissionNumber,
      fullName,
      dateOfBirth: newStudent.dateOfBirth,
      gender: newStudent.gender,
      className,
      division: newStudent.division.trim(),
      parentName,
      parentPhone,
      parentEmail,
      address: newStudent.address?.trim() || '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      admissionDate: newStudent.admissionDate || now.slice(0, 10),
      feeStatus: 'Pending',
      studentId: admissionNumber,
      studentName: fullName,
      dob: newStudent.dateOfBirth,
      class: className,
      active: true,
    };

    let studentDocumentCreated = false;
    let createdAuthUser: User | null = null;
    let provisioning: Awaited<ReturnType<typeof createStudentProvisioningAuth>> | null = null;
    try {
      await runTransaction(db, async (transaction) => {
        if ((await transaction.get(studentRef)).exists()) {
          throw new Error('A student with this admission number already exists.');
        }
        transaction.set(studentRef, student);
      });
      studentDocumentCreated = true;

      provisioning = await createStudentProvisioningAuth();
      const credential = await createUserWithEmailAndPassword(
        provisioning.auth,
        parentEmail,
        createTemporaryPassword(),
      );
      createdAuthUser = credential.user;

      const linkedUserProfileRef = doc(db, 'users', createdAuthUser.uid);
      const profileBatch = writeBatch(db);
      profileBatch.set(linkedUserProfileRef, {
        uid: createdAuthUser.uid,
        email: parentEmail,
        role: 'student',
        displayName: fullName,
        linkedId: admissionNumber,
        studentDocId: student.id,
        createdAt: now,
        updatedAt: now,
      });
      await profileBatch.commit();

      await sendPasswordResetEmail(provisioning.auth, parentEmail, {
        url: window.location.origin + '/student/login',
      });
      return student;
    } catch (error) {
      const rollback = writeBatch(db);
      if (studentDocumentCreated) rollback.delete(studentRef);
      if (createdAuthUser) rollback.delete(doc(db, 'users', createdAuthUser.uid));
      if (studentDocumentCreated || createdAuthUser) {
        await rollback.commit().catch((rollbackError: unknown) => {
          console.error('Unable to roll back the incomplete student profile:', rollbackError);
        });
      }
      if (createdAuthUser) {
        await deleteUser(createdAuthUser).catch((rollbackError: unknown) => {
          console.error('Unable to remove the incomplete student Auth account:', rollbackError);
        });
      }
      throw getAccountCreationError(error);
    } finally {
      if (provisioning) {
        await signOut(provisioning.auth).catch(() => undefined);
        await provisioning.dispose().catch(() => undefined);
      }
    }
  }

  public async updateStudent(id: string, updated: Partial<StudentInput>): Promise<void> {
    await requireAdmin();
    const studentRef = doc(db, 'students', id);
    const snapshot = await getDoc(studentRef);
    if (!snapshot.exists()) throw new Error('Student record not found.');

    const current = normalizeStudent(snapshot.data(), snapshot.id);
    const next = { ...current, ...updated };
    if (!next.admissionNumber.trim() || !next.fullName.trim() || !next.dateOfBirth ||
      !next.className.trim() || !next.division.trim() || !next.parentName.trim() || !next.parentPhone.trim()) {
      throw new Error('Complete all required student fields.');
    }
    if (next.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.parentEmail.trim())) {
      throw new Error('Enter a valid parent email address.');
    }

    if (updated.admissionNumber) {
      const currentStudents = await this.getStudents(undefined, undefined, true);
      if (currentStudents.some((student) =>
        student.id !== id && student.admissionNumber.trim().toLowerCase() === updated.admissionNumber?.trim().toLowerCase(),
      )) {
        throw new Error('A student with this admission number already exists.');
      }
    }

    const timestamp = new Date().toISOString();
    const patch: Record<string, unknown> = { updatedAt: timestamp };
    if (updated.admissionNumber !== undefined) {
      patch.admissionNumber = updated.admissionNumber.trim();
      patch.studentId = updated.admissionNumber.trim();
    }
    if (updated.fullName !== undefined) {
      patch.fullName = updated.fullName.trim();
      patch.studentName = updated.fullName.trim();
    }
    if (updated.dateOfBirth !== undefined) {
      patch.dateOfBirth = updated.dateOfBirth;
      patch.dob = updated.dateOfBirth;
    }
    if (updated.gender !== undefined) patch.gender = updated.gender;
    if (updated.className !== undefined) {
      patch.className = updated.className.trim();
      patch.class = updated.className.trim();
    }
    if (updated.division !== undefined) patch.division = updated.division.trim();
    if (updated.parentName !== undefined) patch.parentName = updated.parentName.trim();
    if (updated.parentPhone !== undefined) patch.parentPhone = updated.parentPhone.trim();
    if (updated.parentEmail !== undefined) patch.parentEmail = updated.parentEmail.trim();
    if (updated.address !== undefined) patch.address = updated.address.trim();
    if (updated.admissionDate !== undefined) patch.admissionDate = updated.admissionDate;

    const batch = writeBatch(db);
    batch.update(studentRef, patch);

    if (updated.fullName || updated.className || updated.division) {
      const fees = await this.getFees();
      fees
        .filter((fee) => fee.studentDocId === id)
        .forEach((fee) => {
          batch.update(doc(db, 'fees', fee.id), {
            studentName: next.fullName,
            class: next.className + ' ' + next.division,
          });
        });
    }

    await batch.commit();
  }

  public async deleteStudent(id: string): Promise<void> {
    await this.setStudentActive(id, false);
  }

  public async setStudentActive(id: string, active: boolean): Promise<void> {
    await requireAdmin();
    await updateDoc(doc(db, 'students', id), {
      active,
      status: active ? 'active' : 'inactive',
      updatedAt: new Date().toISOString(),
      deactivatedAt: active ? null : new Date().toISOString(),
    });
  }

  public getTeachers(): Promise<Teacher[]> {
    return readCollection<Teacher>('teachers');
  }

  public async addTeacher(newTeacher: Omit<Teacher, 'id'>): Promise<Teacher> {
    await requireAdmin();
    const teacherEmail = newTeacher.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherEmail)) {
      throw new Error('Enter a valid teacher email address.');
    }

    const teachers = await this.getTeachers();
    if (teachers.some((teacher) =>
      teacher.teacherId.toLowerCase() === newTeacher.teacherId.trim().toLowerCase() ||
      teacher.email.toLowerCase() === teacherEmail,
    )) {
      throw new Error('A teacher with this ID or email already exists.');
    }
    const teacherRef = doc(collection(db, 'teachers'));
    const now = new Date().toISOString();
    const teacher: Teacher = {
      ...newTeacher,
      email: teacherEmail,
      id: teacherRef.id,
      createdAt: now,
    };
    await setDoc(teacherRef, teacher);
    try {
      await provisionTeacherLogin(teacher);
    } catch (error) {
      await deleteDoc(teacherRef).catch((rollbackError: unknown) => {
        console.error('Unable to remove the incomplete teacher record:', rollbackError);
      });
      throw error;
    }
    return teacher;
  }

  public async createTeacherLogin(teacherId: string): Promise<void> {
    await requireAdmin();
    const teacherSnapshot = await getDoc(doc(db, 'teachers', teacherId));
    if (!teacherSnapshot.exists()) throw new Error('Teacher record not found.');
    const teacher = { ...teacherSnapshot.data(), id: teacherSnapshot.id } as Teacher;
    await provisionTeacherLogin(teacher);
  }

  public async updateTeacher(id: string, updated: Partial<Teacher>): Promise<void> {
    await updateDoc(doc(db, 'teachers', id), updated);
  }

  public async deleteTeacher(id: string): Promise<void> {
    await deleteDoc(doc(db, 'teachers', id));
  }

  public getClasses(grade?: string): Promise<SchoolClass[]> {
    return readCollection<SchoolClass>('classes', grade ? [where('grade', '==', grade)] : []);
  }

  public async addClass(
    grade: string,
    divisions: string[],
    teacherId?: string,
    teacherName?: string,
  ): Promise<SchoolClass> {
    const classes = await this.getClasses();
    if (classes.some((schoolClass) => schoolClass.grade.toLowerCase() === grade.trim().toLowerCase())) {
      throw new Error('A class with this grade name already exists.');
    }
    const classRef = doc(collection(db, 'classes'));
    const schoolClass: SchoolClass = {
      id: classRef.id,
      grade: grade.trim(),
      divisions,
      assignedTeacherId: teacherId,
      assignedTeacherName: teacherName,
    };
    await setDoc(classRef, schoolClass);
    return schoolClass;
  }

  public async updateClass(id: string, updated: Partial<SchoolClass>): Promise<void> {
    await updateDoc(doc(db, 'classes', id), updated);
  }

  public async deleteClass(id: string): Promise<void> {
    await deleteDoc(doc(db, 'classes', id));
  }

  public getFees(studentId?: string, classLabel?: string): Promise<FeeRecord[]> {
    const filters: QueryConstraint[] = [];
    if (studentId) filters.push(where('studentId', '==', studentId));
    if (classLabel) filters.push(where('class', '==', classLabel));
    return readCollection<FeeRecord>('fees', filters);
  }

  public async addFeeRecord(
    record: Omit<FeeRecord, 'id' | 'pendingAmount' | 'paymentStatus'>,
  ): Promise<FeeRecord> {
    if (
      !Number.isFinite(record.totalFee) ||
      !Number.isFinite(record.paidAmount) ||
      record.totalFee < 0 ||
      record.paidAmount < 0 ||
      record.paidAmount > record.totalFee
    ) {
      throw new Error('Fee amounts must be valid, and paid amount cannot exceed the total.');
    }

    const feeRef = doc(collection(db, 'fees'));
    const feeRecord: FeeRecord = {
      ...record,
      id: feeRef.id,
      pendingAmount: record.totalFee - record.paidAmount,
      paymentStatus: record.paidAmount === 0
        ? 'Pending'
        : record.paidAmount >= record.totalFee
          ? 'Paid'
          : 'Partial',
    };
    await setDoc(feeRef, feeRecord);
    return feeRecord;
  }

  public async recordPayment(
    feeId: string,
    amount: number,
    paymentMethod = 'Cash / Online',
    notes?: string,
  ): Promise<FeeRecord> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const feeRef = doc(db, 'fees', feeId);
    const paymentRef = doc(collection(db, 'fee_payments'));

    return runTransaction(db, async (transaction) => {
      const feeSnapshot = await transaction.get(feeRef);
      if (!feeSnapshot.exists()) throw new Error('Fee record not found.');

      const currentFee = { ...feeSnapshot.data(), id: feeSnapshot.id } as FeeRecord;
      if (amount > currentFee.pendingAmount) {
        throw new Error('Payment cannot exceed the outstanding balance.');
      }

      const paidAmount = currentFee.paidAmount + amount;
      const pendingAmount = currentFee.totalFee - paidAmount;
      const paymentStatus: FeeRecord['paymentStatus'] = pendingAmount === 0
        ? 'Paid'
        : paidAmount > 0
          ? 'Partial'
          : 'Pending';
      const paymentDate = new Date().toISOString().slice(0, 10);
      const updatedFee: FeeRecord = {
        ...currentFee,
        paidAmount,
        pendingAmount,
        paymentStatus,
        paymentDate,
      };
      const payment: FeePayment = {
        id: paymentRef.id,
        feeId,
        studentId: currentFee.studentId,
        studentName: currentFee.studentName,
        amount,
        paymentDate,
        paymentMethod,
        notes,
      };

      transaction.set(feeRef, updatedFee);
      transaction.set(paymentRef, payment);
      if (currentFee.studentDocId) {
        transaction.update(doc(db, 'students', currentFee.studentDocId), { feeStatus: paymentStatus });
      }

      return updatedFee;
    });
  }

  public getPayments(): Promise<FeePayment[]> {
    return readCollection<FeePayment>('fee_payments');
  }

  public async getAttendanceRecords(
    className?: string,
    division?: string,
    date?: string,
  ): Promise<AttendanceRecord[]> {
    const filters: QueryConstraint[] = [];
    if (className) filters.push(where('class', '==', className));
    if (division) filters.push(where('division', '==', division));
    if (date) filters.push(where('date', '==', date));
    const records = await readCollection<AttendanceRecord>('attendance', filters);
    return records.filter((record) =>
      (!className || record.class === className) &&
      (!division || record.division === division) &&
      (!date || record.date === date),
    );
  }

  public async saveAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    const existing = await this.getAttendanceRecords(record.class, record.division, record.date);
    const id = existing[0]?.id || makeDocumentId('attendance', record.date, record.class, record.division);
    const finalRecord: AttendanceRecord = {
      ...record,
      id,
      createdAt: existing[0]?.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'attendance', id), finalRecord);
    return finalRecord;
  }

  public async getMarks(studentId?: string, className?: string, division?: string, subject?: string): Promise<StudentMark[]> {
    const filters: QueryConstraint[] = [];
    if (studentId) filters.push(where('studentId', '==', studentId));
    if (className) filters.push(where('class', '==', className));
    if (division) filters.push(where('division', '==', division));
    if (subject) filters.push(where('subject', '==', subject));
    const marks = await readCollection<StudentMark>('marks', filters);
    return marks.filter((mark) =>
      (!studentId || mark.studentId === studentId) &&
      (!className || mark.class === className) &&
      (!division || mark.division === division) &&
      (!subject || mark.subject === subject),
    );
  }

  public async addOrUpdateMark(mark: Omit<StudentMark, 'id'>): Promise<StudentMark> {
    if (
      !Number.isFinite(mark.marks) ||
      !Number.isFinite(mark.totalMarks) ||
      mark.totalMarks <= 0 ||
      mark.marks < 0 ||
      mark.marks > mark.totalMarks
    ) {
      throw new Error('Marks must be between zero and a positive maximum score.');
    }

    const id = makeDocumentId('mark', mark.studentId, mark.class, mark.division, mark.subject, mark.examName || 'assessment');
    const finalMark: StudentMark = { ...mark, id };
    await setDoc(doc(db, 'marks', id), finalMark);
    return finalMark;
  }

  public async getTeacherUpdates(studentId?: string): Promise<TeacherUpdate[]> {
    return readCollection<TeacherUpdate>(
      'teacher_updates',
      studentId ? [where('studentId', '==', studentId)] : [],
    );
  }

  public async getTeacherUpdatesForStudents(studentIds: string[]): Promise<TeacherUpdate[]> {
    const results = await Promise.all(studentIds.map((studentId) => this.getTeacherUpdates(studentId)));
    return results.flat();
  }

  public async addTeacherUpdate(update: Omit<TeacherUpdate, 'id'>): Promise<TeacherUpdate> {
    const updateRef = doc(collection(db, 'teacher_updates'));
    const finalUpdate: TeacherUpdate = {
      ...update,
      id: updateRef.id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(updateRef, finalUpdate);
    return finalUpdate;
  }

  public async getAdminStats() {
    const [students, teachers, classes, fees] = await Promise.all([
      this.getStudents(),
      this.getTeachers(),
      this.getClasses(),
      this.getFees(),
    ]);

    return fees.reduce(
      (totals, fee) => ({
        ...totals,
        totalFees: totals.totalFees + (fee.totalFee || 0),
        paidFees: totals.paidFees + (fee.paidAmount || 0),
        pendingFees: totals.pendingFees + (fee.pendingAmount || 0),
      }),
      {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: classes.length,
        totalFees: 0,
        paidFees: 0,
        pendingFees: 0,
      },
    );
  }
}

export const dataService = new DataService();