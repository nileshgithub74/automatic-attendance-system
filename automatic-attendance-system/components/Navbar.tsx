'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const [customUserRole, setCustomUserRole] = useState<string | null>(null);
  const [customUserData, setCustomUserData] = useState<any>(null);

  // Check for custom login (student/teacher/parent)
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const studentData = localStorage.getItem('studentData');
    const teacherData = localStorage.getItem('teacherData');
    
    setCustomUserRole(role);
    if (studentData) {
      setCustomUserData(JSON.parse(studentData));
    } else if (teacherData) {
      setCustomUserData(JSON.parse(teacherData));
    }
  }, [pathname]);

  const role = (user?.publicMetadata?.role as string | undefined) || customUserRole;

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/' || pathname === '';
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  const navLinks = useMemo(() => {
    const normalizedRole = role?.toLowerCase();
    
    // If user is logged in, show role-specific navigation
    if (normalizedRole === 'principal') {
      return [
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/reports', label: 'Reports' },
        { href: '/admin/user-management', label: 'Users' },
      ];
    }

    if (normalizedRole === 'teacher') {
      return [
        { href: '/dashboard/teacher', label: 'Dashboard' },
        { href: '/notifications', label: 'Notifications' },
      ];
    }

    if (normalizedRole === 'student') {
      return [
        { href: '/dashboard/student', label: 'Dashboard' },
        { href: '/student/mark-attendance', label: '📸 Mark Attendance' },
        { href: '/attendance-history', label: 'My Attendance' }
      ];
    }

    if (normalizedRole === 'parent') {
      return [
        { href: '/dashboard/parent', label: 'Dashboard' },
        { href: '/reports', label: 'Child Attendance' }
      ];
    }

    // Not logged in - show only Home
    return [{ href: '/', label: 'Home' }];
  }, [role]);

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="shrink-0 flex items-center">
              <Link
                href={customUserRole?.toLowerCase() === 'student' ? '/dashboard/student' : '/'}
                className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2"
              >
                <svg
                  className="h-6 w-6 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Attendance System</span>
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative inline-flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
                >
                  {link.label}
                  <span
                    className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ${
                      isActive(link.href) ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {customUserData ? (
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600">
                  Hi, {customUserData.name}
                </span>
              </div>
            ) : (
              <>
                <SignedIn>
                  <div className="hidden sm:flex items-center gap-4">
                    {user?.firstName && (
                      <span className="text-sm font-medium text-gray-600">
                        Hi, {user.firstName}
                      </span>
                    )}
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
                <SignedOut>
                  <Link
                    href="/sign-in"
                    className="hidden sm:inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white text-sm font-semibold shadow-md transition-transform duration-300 hover:scale-105"
                  >
                    Sign in
                  </Link>
                </SignedOut>
              </>
            )}

            <div className="flex items-center sm:hidden gap-2">
              {!customUserData && (
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              )}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200"
                aria-expanded={isOpen}
                aria-label="Toggle menu"
              >
                {!isOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white">
          <div className="pt-2 pb-3 space-y-1 px-2">
            {customUserData && (
              <div className="px-4 py-2 border-b border-gray-200 mb-2">
                <p className="text-sm font-medium text-gray-600">Hi, {customUserData.name}</p>
                <p className="text-xs text-gray-500">{customUserData.class} - Roll {customUserData.rollNo}</p>
              </div>
            )}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="group relative block px-4 py-3 text-base font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
              >
                {link.label}
                <span
                  className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ${
                    isActive(link.href) ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </Link>
            ))}

            {!customUserData && (
              <SignedOut>
                <Link
                  href="/sign-in"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full text-center shadow-md"
                >
                  Sign in
                </Link>
              </SignedOut>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

