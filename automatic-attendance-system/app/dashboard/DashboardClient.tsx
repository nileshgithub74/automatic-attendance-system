"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function DashboardClient() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  // Determine user role and redirect immediately
  useEffect(() => {
    // Check localStorage first (custom login)
    const userRole = localStorage.getItem("userRole");
    const studentData = localStorage.getItem('studentData');
    const teacherData = localStorage.getItem('teacherData');
    const parentData = localStorage.getItem('parentData');

    if (userRole) {
      const role = userRole.toLowerCase();
      console.log('🔄 Custom login detected, role:', role);
      
      if (role === 'student' && studentData) {
        console.log('➡️ Redirecting to /dashboard/student');
        router.replace('/dashboard/student');
        return;
      } else if (role === 'teacher' && teacherData) {
        console.log('➡️ Redirecting to /dashboard/teacher');
        router.replace('/dashboard/teacher');
        return;
      } else if (role === 'parent' && parentData) {
        console.log('➡️ Redirecting to /dashboard/parent');
        router.replace('/dashboard/parent');
        return;
      }
    }

    // Check Clerk authentication
    if (!isLoaded) return;

    if (user?.publicMetadata?.role) {
      const clerkRole = (user.publicMetadata.role as string).toLowerCase();
      console.log('🔄 Clerk user detected, role:', clerkRole);
      
      if (clerkRole === 'student') {
        console.log('➡️ Redirecting to /dashboard/student');
        router.replace('/dashboard/student');
        return;
      } else if (clerkRole === 'teacher') {
        console.log('➡️ Redirecting to /dashboard/teacher');
        router.replace('/dashboard/teacher');
        return;
      } else if (clerkRole === 'parent') {
        console.log('➡️ Redirecting to /dashboard/parent');
        router.replace('/dashboard/parent');
        return;
      } else if (clerkRole === 'principal' || clerkRole === 'admin') {
        console.log('➡️ Redirecting to /admin/dashboard');
        router.replace('/admin/dashboard');
        return;
      }
    } else if (user && isSignedIn) {
      // User is signed in with Clerk but has no role assigned
      console.log('⚠️ User has no role, redirecting to role assignment');
      router.replace('/role-assignment');
      return;
    }
  }, [user, router, isLoaded]);

  // Show loading state while checking authentication
  const hasCustomLogin = typeof window !== 'undefined' && (
    localStorage.getItem('studentData') || 
    localStorage.getItem('teacherData') || 
    localStorage.getItem('parentData')
  );

  if (!isLoaded && !hasCustomLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-700 text-lg">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // If user has custom login data, show loading while redirecting
  if (hasCustomLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-700 text-lg">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // If user is signed in with Clerk, show loading while redirecting
  if (isSignedIn && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-700 text-lg">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // No authentication found - show sign-in prompt
  if (!isSignedIn && !hasCustomLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 px-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome to Attendance System
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access your dashboard.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-md hover:from-blue-700 hover:to-purple-700 transition-transform duration-300 hover:scale-105"
            >
              Go to Login Page
            </Link>
            <Link
              href="/sign-in"
              className="block w-full px-6 py-3 rounded-xl border border-indigo-200 text-indigo-600 font-semibold shadow-sm hover:border-indigo-300 transition-transform duration-300 hover:scale-105"
            >
              Admin Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // This should never be reached due to redirects, but just in case
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-700 text-lg">Redirecting...</p>
      </div>
    </div>
  );
}
