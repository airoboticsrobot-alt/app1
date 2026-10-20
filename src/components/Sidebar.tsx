import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  CreditCard,
  CalendarCheck,
  FileSpreadsheet,
  MessageSquareQuote,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const role = userProfile?.role || 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/' + role + '/login');
  };

  const adminNav = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Students', path: '/admin/students', icon: GraduationCap },
    { name: 'Teachers', path: '/admin/teachers', icon: Users },
    { name: 'Classes', path: '/admin/classes', icon: Layers },
    { name: 'Fees', path: '/admin/fees', icon: CreditCard },
    { name: 'Attendance', path: '/admin/attendance', icon: CalendarCheck },
    { name: 'Marks', path: '/admin/marks', icon: FileSpreadsheet },
    { name: 'Teacher Updates', path: '/admin/updates', icon: MessageSquareQuote },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const teacherNav = [
    { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { name: 'My Students', path: '/teacher/students', icon: GraduationCap },
    { name: 'Attendance', path: '/teacher/attendance', icon: CalendarCheck },
    { name: 'Marks', path: '/teacher/marks', icon: FileSpreadsheet },
    { name: 'Student Updates', path: '/teacher/updates', icon: MessageSquareQuote },
    { name: 'Fees Status', path: '/teacher/fees', icon: CreditCard },
  ];

  const studentNav = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'My Attendance', path: '/student/attendance', icon: CalendarCheck },
    { name: 'My Marks', path: '/student/marks', icon: FileSpreadsheet },
    { name: 'Teacher Notes', path: '/student/updates', icon: MessageSquareQuote },
    { name: 'Fee Details', path: '/student/fees', icon: CreditCard },
  ];

  const navItems = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={
          'fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ' +
          (isOpen ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2.5 font-bold text-slate-800">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-600"></div>
            <span className="text-sm tracking-wide uppercase text-slate-500 font-semibold">
              {role === 'admin' ? 'Admin Portal' : role === 'teacher' ? 'Faculty Portal' : 'Student Portal'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 md:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
                  (isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
