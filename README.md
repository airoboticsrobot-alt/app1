# School Management Web App

A clean, modern, responsive School Management Web Application designed for school administrators, teaching faculty, and students/parents.

Built with **React**, **TypeScript**, **Tailwind CSS**, **Firebase Authentication**, and **Cloud Firestore**. School records are read from and written to Firestore; the app does not seed demo data.

---

## 1. Project Overview

This application delivers a unified school portal partitioned by role:
- **School Administrators**: Full administrative oversight of students, teachers, classes, fee ledger, and academic reporting.
- **Teaching Faculty**: Assigned-class student view, attendance marking, assessment publishing, student updates, and read-only fee auditing.
- **Students & Parents**: Personalized dashboard showing their specific fee balance/payments, subject marks, teacher notes, and attendance records.

---

## 2. Key Features

- **3 Dedicated Role-Based Logins**:
  - `/admin/login`
  - `/teacher/login`
  - `/student/login`
- **Admin Dashboard**:
  - Total Students Count (automatically synced on add/delete)
  - Total Teachers Count (automatically synced on add/delete)
  - Total Classes Count
  - Total Fees, Paid Fees, Pending Fees calculation
- **Student Management**:
  - Firestore-backed student records with class and division assignment.
  - Search by Name, Student ID, or Parent Name.
  - Filter by Class (Grade 1-10) and Division (A, B, C).
  - **+ Add Student** with automatic fee ledger creation and instant count update.
  - **Edit Student**, **Deactivate Student**, and **View Profile modal**. Deactivation preserves historical records.
- **Teacher Management**:
  - Firestore-backed teacher profiles with subject and class assignments.
  - Search and filter by Subject and Class.
  - **+ Add Teacher** with instant total teacher counter update.
  - **Edit Teacher**, **Delete Teacher**, and **View Teacher Profile**.
- **Class Management**:
  - Grade 1 to Grade 10 with Divisions A & B.
  - Add Class, Edit Class, Delete Class, and Assign Teacher.
  - View Enrolled Students list for each class.
- **Attendance System**:
  - Teacher/Admin can select Class, Division, and Date.
  - Quick **Mark All Present** and individual toggle.
  - Save and retrieve attendance records directly in Firestore.
- **Academic Marks Management**:
  - Select Student, Subject, and Exam.
  - Input marks scored against maximum marks.
  - Automatic calculation of percentage and pass status.
- **Teacher Updates & Notes**:
  - Faculty post student observations (e.g., *"Student participated well in today's class."*).
  - Visible on Student/Parent portal.
- **Fee Management System**:
  - View Total Fee, Paid Amount, and Pending Amount.
  - Automatic calculation: `Pending Amount = Total Fee - Paid Amount`.
  - Automatic status assignment: `Paid` (Paid >= Total), `Partial` (Paid > 0 and < Total), `Pending` (Paid == 0).
  - **Record Payment** modal with payment methods (Cash, UPI/Bank Transfer, Cheque, Card).
  - **Add Fee Bill** invoice option.
  - Portal controls: Teachers have read-only fee audit; students are queried for their linked fee statement. These client controls require matching Firestore rules for security.

---

## 3. Authentication & Roles

Login uses Firebase Authentication. Each account must have a Firestore document at `users/{firebaseUid}` with `role` set to `admin`, `teacher`, or `student`; `displayName` is optional and `linkedId` connects a teacher or student account to its school record. Roles are never inferred from email addresses.

Create sign-in accounts through Firebase Authentication and provision matching user documents using a trusted administrative process. Adding a teacher in this app creates only the Firestore teacher profile, not an Auth account. Never store passwords in Firestore or expose Firebase Admin credentials to the browser.

---

## 4. Technology Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Backend & Auth**: Firebase Authentication & Firebase Cloud Firestore
- **Build Tool**: Vite 8

---

## 5. Firebase Setup & Configuration

The local `.env` file supplies the Firebase web configuration. Keep it out of version control and use the existing Firebase project's values:

```env
VITE_FIREBASE_API_KEY=<existing project web API key>
VITE_FIREBASE_AUTH_DOMAIN=<existing project auth domain>
VITE_FIREBASE_PROJECT_ID=<existing project ID>
VITE_FIREBASE_STORAGE_BUCKET=<existing project storage bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<existing project sender ID>
VITE_FIREBASE_APP_ID=<existing project app ID>
VITE_FIREBASE_MEASUREMENT_ID=<optional measurement ID>
```

### Firestore Collections

1. `users` – User display names, roles (`admin`, `teacher`, `student`), and linked school-record IDs. Passwords are managed only by Firebase Authentication.
2. `students` – Student records (demographics, parent info, assigned class/division, fee status).
3. `teachers` – Faculty records (teacher ID, subject, assigned class, email, status).
4. `classes` – Class grade allocations and division arrays with assigned teachers.
5. `attendance` – Daily session logs with student presence statuses.
6. `marks` – Subject evaluation marks and examination results.
7. `teacher_updates` – Teacher observations and notes.
8. `fees` – Student tuition billing records, paid amount, pending amount, and payment status.
9. `fee_payments` – Transaction receipt history and payment methods.

No Firestore rules file is present in this repository. Client-side route guards do not secure database access. Configure and test restrictive Firestore rules in the Firebase project before using real student records; do not use permissive rules.

---

## 6. Installation & Running Locally

1. From the project root, install dependencies (if not already installed):
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`. You will be directed to the administrator sign-in page.

4. To create an optimized production build:
   ```bash
   npm run build
   ```
---

## 8. Deployment

To deploy the application to Firebase Hosting:

1. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Build the production app:
   ```bash
   npm run build
   ```
3. Initialize and deploy:
   ```bash
   firebase login
   firebase init hosting
   firebase deploy --only hosting
   ```
