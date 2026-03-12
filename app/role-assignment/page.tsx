"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

interface UserInfo {
  id: string;
  email: string;
  role: string;
}

export default function RoleAssignmentPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedRole, setSelectedRole] = useState("Principal");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const PRINCIPAL_EMAIL = process.env.NEXT_PUBLIC_PRINCIPAL_EMAIL || "kumarnilesh843127@gmail.com";
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || "";
  const isPrincipalAllowed = userEmail === PRINCIPAL_EMAIL;
  
  // Only allow principal email to self-assign, others need admin approval
  const roles = isPrincipalAllowed ? ["Principal", "Teacher", "Student", "Parent"] : [];

  useEffect(() => {
    // FIRST: Check if user already logged in through custom login system
    const userRole = localStorage.getItem('userRole');
    const studentData = localStorage.getItem('studentData');
    const teacherData = localStorage.getItem('teacherData');
    const parentData = localStorage.getItem('parentData');

    console.log('Role assignment page - checking localStorage:', { userRole, hasStudentData: !!studentData, hasTeacherData: !!teacherData, hasParentData: !!parentData });

    if (userRole && (studentData || teacherData || parentData)) {
      const role = userRole.toLowerCase();
      console.log('Found custom login data, redirecting to:', role);
      setRedirecting(true);
      
      if (role === 'student' && studentData) {
        router.replace('/dashboard/student');
        return;
      } else if (role === 'teacher' && teacherData) {
        router.replace('/dashboard/teacher');
        return;
      } else if (role === 'parent' && parentData) {
        router.replace('/dashboard/parent');
        return;
      }
    }

    if (!isLoaded) return;

    if (!isSignedIn) {
      // If not signed in through Clerk and no custom login, redirect to custom login
      console.log('❌ Not signed in, redirecting to login');
      setRedirecting(true);
      router.push("/login");
      return;
    }

    // Check if role is passed from sign-in page
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    if (roleParam) {
      const capitalizedRole = roleParam.charAt(0).toUpperCase() + roleParam.slice(1);
      setSelectedRole(capitalizedRole);
    }

    fetchUserInfo();
  }, [isLoaded, isSignedIn, router]);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/role");
      const data = await response.json();

      if (response.ok) {
        setUserInfo(data.user);
        
        // If user already has a role assigned, redirect to appropriate dashboard
        if (data.user.role && data.user.role !== "No role assigned") {
          const role = data.user.role.toLowerCase();
          if (role.includes("principal") || role.includes("admin")) {
            router.push("/admin/dashboard");
            return;
          } else if (role.includes("teacher")) {
            router.push("/dashboard/teacher");
            return;
          } else if (role.includes("student")) {
            router.push("/dashboard/student");
            return;
          } else if (role.includes("parent")) {
            router.push("/dashboard/parent");
            return;
          }
        }
        
        setSelectedRole(
          data.user.role === "No role assigned" ? "Principal" : data.user.role
        );
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to fetch user info",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error fetching user information" });
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    try {
      setAssigning(true);
      setMessage(null);

      const response = await fetch("/api/auth/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `✓ Role successfully updated to "${selectedRole}"! Redirecting...`,
        });

        // Wait a bit, then redirect to dashboard
        setTimeout(() => {
          if (selectedRole === "Principal") {
            router.push("/admin/dashboard");
          } else if (selectedRole === "Teacher") {
            router.push("/dashboard");
          } else {
            router.push("/dashboard");
          }
        }, 2000);
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to update role",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error updating role" });
      console.error("Error:", error);
    } finally {
      setAssigning(false);
    }
  };

  if (redirecting || !isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center text-gray-600">
            {redirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <p className="text-center text-gray-600 mb-4">Please sign in first</p>
          <Link
            href="/sign-in"
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Show access denied for non-principal users
  if (!isPrincipalAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
              <svg className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Account Pending Approval
            </h1>
            <p className="text-gray-600 mb-4">
              Your account has been created but needs to be approved by an administrator.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Your Email:</strong> {userEmail}
              </p>
              <p className="text-sm text-gray-600">
                Please contact your school administrator to assign you the appropriate role (Student, Teacher, or Parent).
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
              <p className="text-sm font-semibold text-yellow-900 mb-2">
                Security Notice
              </p>
              <p className="text-xs text-yellow-800">
                For security reasons, only authorized administrators can assign roles. This prevents unauthorized access to the school system.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-center"
            >
              Go to Homepage
            </Link>
            <button
              onClick={() => router.push('/sign-out')}
              className="block w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Assign Your Role
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Select your role in the system (Principal/Admin Only)
        </p>

        {userInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Email:</span> {userInfo.email}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Current Role:</span>{" "}
              <span className="text-blue-600 font-medium">{userInfo.role}</span>
            </p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {roles.map((role) => {
            const isDisabled = role === "Principal" && !isPrincipalAllowed;
            return (
              <label
                key={role}
                className={`flex items-center p-3 border-2 rounded-lg transition-all ${
                  isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
                style={{
                  borderColor: selectedRole === role ? "#2563eb" : "#e5e7eb",
                  backgroundColor: selectedRole === role ? "#eff6ff" : "#ffffff",
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={selectedRole === role}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={isDisabled}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 font-medium text-gray-900">{role}</span>
                <span className="ml-auto text-xs text-gray-500">
                  {role === "Principal" && (isDisabled ? "Restricted" : "Admin")}
                  {role === "Teacher" && "Mark Attendance"}
                  {role === "Student" && "View Own Attendance"}
                  {role === "Parent" && "View Child Attendance"}
                </span>
              </label>
            );
          })}
        </div>
        
        {!isPrincipalAllowed && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <p className="text-xs text-yellow-800">
              ℹ️ Principal role is restricted to authorized administrators only.
            </p>
          </div>
        )}

        {message && (
          <div
            className={`mb-4 p-4 rounded-lg text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          onClick={handleAssignRole}
          disabled={assigning}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
            assigning
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:scale-95"
          }`}
        >
          {assigning ? "Assigning Role..." : `Set as ${selectedRole}`}
        </button>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
