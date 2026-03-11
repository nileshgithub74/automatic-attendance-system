"use client";

import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const role = (user?.publicMetadata?.role as string | undefined) || null;

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <SignedOut>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              Please sign in to view settings
            </p>
            <Link
              href="/sign-in"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                Settings & Profile
              </h1>

              <div className="flex items-center mb-8">
                <div className="mr-6">
                  <UserButton afterSignOutUrl="/" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Signed in as</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>

              {/* Role Information */}
              <div className="border-t pt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Your Role
                </h2>

                {role ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-1">Current Role:</p>
                    <p className="text-2xl font-bold text-blue-600">{role}</p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-yellow-800 font-medium">
                      ⚠️ No role assigned yet
                    </p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Visit the role assignment page to get started
                    </p>
                  </div>
                )}

                <Link
                  href="/role-assignment"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {role ? "Change Role" : "Assign Role"}
                </Link>
              </div>

              {/* Quick Links */}
              <div className="border-t mt-6 pt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Quick Links
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link
                    href="/"
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    <p className="font-semibold text-gray-900">🏠 Home</p>
                    <p className="text-sm text-gray-600">Go back to homepage</p>
                  </Link>

                  {role === "Principal" && (
                    <Link
                      href="/admin/dashboard"
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      <p className="font-semibold text-gray-900">
                        👨‍💼 Admin Dashboard
                      </p>
                      <p className="text-sm text-gray-600">Manage system</p>
                    </Link>
                  )}

                  {role === "Teacher" || role === "Principal" ? (
                    <Link
                      href="/dashboard"
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      <p className="font-semibold text-gray-900">
                        📋 Mark Attendance
                      </p>
                      <p className="text-sm text-gray-600">
                        Mark student attendance
                      </p>
                    </Link>
                  ) : null}

                  <Link
                    href="/reports"
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    <p className="font-semibold text-gray-900">📊 Reports</p>
                    <p className="text-sm text-gray-600">
                      View attendance reports
                    </p>
                  </Link>

                  <Link
                    href="/role-assignment"
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    <p className="font-semibold text-gray-900">
                      👤 Role Assignment
                    </p>
                    <p className="text-sm text-gray-600">Manage your role</p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
