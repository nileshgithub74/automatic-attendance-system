'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function Home() {
  const { user, isLoaded } = useUser();
  const [customUserData, setCustomUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for custom login (student/teacher/parent)
    const role = localStorage.getItem('userRole');
    const studentData = localStorage.getItem('studentData');
    const teacherData = localStorage.getItem('teacherData');
    
    setUserRole(role);
    if (studentData) {
      setCustomUserData(JSON.parse(studentData));
    } else if (teacherData) {
      setCustomUserData(JSON.parse(teacherData));
    }
  }, []);

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // If user is logged in (either Clerk or custom), show enhanced logged-in view
  if (user || customUserData) {
    const currentRole = userRole?.toLowerCase() || (user?.publicMetadata?.role as string)?.toLowerCase();
    
    return (
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Welcome back,
                <span className="block text-blue-600">
                  {customUserData?.name || user?.firstName || 'User'}!
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                {currentRole === 'student' && 'Track your attendance and academic progress with ease'}
                {currentRole === 'teacher' && 'Manage your classes and mark attendance efficiently'}
                {currentRole === 'principal' && 'Oversee your school\'s attendance system'}
                {!currentRole && 'Access your personalized dashboard'}
              </p>

              {/* Quick Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">Fast</p>
                  <p className="text-sm text-gray-600">Quick Access</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">Easy</p>
                  <p className="text-sm text-gray-600">Simple to Use</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">Secure</p>
                  <p className="text-sm text-gray-600">Protected Data</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Cards Section */}
        <div className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Your Dashboard</h2>
              <p className="text-xl text-gray-600">Quick access to all your tools</p>
            </div>

            {/* Role-specific Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Student Dashboard Cards */}
              {currentRole === 'student' && (
                <>
                  <Link
                    href="/dashboard/student"
                    className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="bg-blue-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">My Dashboard</h3>
                    <p className="text-gray-600">View attendance stats and records</p>
                  </Link>

                  <Link
                    href="/student/mark-attendance"
                    className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-green-500 hover:shadow-md transition-all"
                  >
                    <div className="bg-green-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Mark Attendance</h3>
                    <p className="text-gray-600">Use face recognition technology</p>
                  </Link>

                  <Link
                    href="/attendance-history"
                    className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all"
                  >
                    <div className="bg-indigo-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Attendance History</h3>
                    <p className="text-gray-600">View complete attendance records</p>
                  </Link>
                </>
              )}

              {/* Teacher Dashboard Cards */}
              {currentRole === 'teacher' && (
                <>
                  <Link
                    href="/dashboard/teacher"
                    className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all"
                  >
                    <div className="bg-indigo-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Teacher Dashboard</h3>
                    <p className="text-gray-600">Mark attendance for your classes</p>
                  </Link>

                  <Link
                    href="/dashboard/teacher?tab=reports"
                    className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="bg-blue-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">View Reports</h3>
                    <p className="text-gray-600">Class attendance analytics</p>
                  </Link>

                  <Link
                    href="/notifications"
                    className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-green-500 hover:shadow-md transition-all"
                  >
                    <div className="bg-green-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.21 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Notifications</h3>
                    <p className="text-gray-600">Parent notifications</p>
                  </Link>
                </>
              )}

              {/* Admin Dashboard Cards - Only for Principal/Admin */}
              {(currentRole === 'principal' || currentRole === 'admin') && (
                <>
                  <Link
                    href="/admin/dashboard"
                    className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all"
                  >
                    <div className="bg-purple-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Admin Dashboard</h3>
                    <p className="text-gray-600">Manage your school system</p>
                  </Link>

                  <Link
                    href="/admin/user-management"
                    className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="bg-blue-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">User Management</h3>
                    <p className="text-gray-600">Manage all users</p>
                  </Link>

                  <Link
                    href="/admin/reports"
                    className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all"
                  >
                    <div className="bg-indigo-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Reports & Analytics</h3>
                    <p className="text-gray-600">System-wide insights</p>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-bold mb-4">Attendance System</h3>
                <p className="text-gray-400 text-sm">AI-powered smart attendance for modern schools.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">License</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
              <p>© {new Date().getFullYear()} Automatic Attendance System. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Not logged in - show enhanced landing page
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Smart Attendance
                <span className="block text-blue-600">
                  Made Simple
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Revolutionary face recognition technology for effortless attendance tracking in schools. Fast, accurate, and secure.
              </p>

              <div className="flex justify-center lg:justify-start gap-4">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-gray-900">99%</p>
                  <p className="text-sm text-gray-600">Accuracy</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-gray-900">2s</p>
                  <p className="text-sm text-gray-600">Fast Check-in</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-gray-900">24/7</p>
                  <p className="text-sm text-gray-600">Available</p>
                </div>
              </div>
            </div>

            {/* Right Content - Animated Illustration */}
            <div className="relative">
              <div className="relative z-10">
                {/* Main Card */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-blue-600 rounded-lg p-3">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-bold text-gray-900">Face Recognition</h3>
                      <p className="text-sm text-gray-500">Instant verification</p>
                    </div>
                  </div>
                  
                  {/* Simulated Face Scan */}
                  <div className="bg-gray-50 rounded-lg p-6 mb-4">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative">
                        <div className="w-32 h-32 bg-blue-100 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full animate-ping"></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">Scanning...</p>
                      <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-full animate-pulse" style={{width: '75%'}}></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-semibold flex items-center">
                      <span className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></span>
                      Active
                    </span>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 bg-green-600 rounded-lg p-3 shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-blue-600 rounded-lg p-3 shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Us?</h2>
            <p className="text-xl text-gray-600">Powerful features for modern schools</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all">
              <div className="bg-blue-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Lightning Fast</h3>
              <p className="text-gray-600">Mark attendance in seconds with our AI-powered face recognition technology.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-green-500 hover:shadow-md transition-all">
              <div className="bg-green-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Private</h3>
              <p className="text-gray-600">Your data is encrypted and protected with enterprise-grade security.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all">
              <div className="bg-indigo-600 rounded-lg p-4 w-14 h-14 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-time Reports</h3>
              <p className="text-gray-600">Get instant insights and analytics on attendance patterns and trends.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Attendance System</h3>
              <p className="text-gray-400 text-sm">AI-powered smart attendance for modern schools.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">License</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} Automatic Attendance System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
