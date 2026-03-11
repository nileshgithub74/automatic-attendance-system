"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

interface Student {
  id: number;
  name: string;
  email?: string;
  class: string;
  attendancePercent: number;
  faceRegistered?: boolean;
}

interface Teacher {
  id: number;
  name: string;
  email: string;
  classes: string[];
  lastAttendanceMarked: string;
}

interface Class {
  id: number;
  name: string;
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  teacher: string;
}

interface NotificationSummary {
  totalToday: number;
}

interface User {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;
  createdAt: number;
  lastSignInAt: number | null;
}

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [notifications, setNotifications] = useState<NotificationSummary>({
    totalToday: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [faceAttendanceRecords, setFaceAttendanceRecords] = useState<any[]>([]);
  const [faceAttendanceStats, setFaceAttendanceStats] = useState<any>({
    totalToday: 0,
    faceRecognitionToday: 0,
    teacherMarkedToday: 0,
    totalRecords: 0
  });
  const [faceRegistrations, setFaceRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "students" | "teachers" | "classes" | "reports" | "faceAttendance" | "users" | "pendingApprovals"
  >("pendingApprovals");
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [errorPopup, setErrorPopup] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: "" });
  const [successPopup, setSuccessPopup] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: "" });
  const [currentDate, setCurrentDate] = useState(new Date().toDateString());
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    userRole: "Teacher",
    phoneNumber: "",
    parentNumber: "",
    className: "",
    rollNo: "",
    subjects: "",
    childName: "",
  });
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const tabsRef = useRef<HTMLDivElement>(null);

  // Auto-refresh when day changes
  useEffect(() => {
    const checkDayChange = setInterval(() => {
      const newDate = new Date().toDateString();
      if (newDate !== currentDate) {
        console.log('📅 Day changed! Refreshing admin dashboard...');
        setCurrentDate(newDate);
        if (user) {
          fetchAllData();
          if (activeTab === "faceAttendance") {
            fetchFaceAttendance();
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkDayChange);
  }, [currentDate, user, activeTab]);

  useEffect(() => {
    console.log('🚀 Admin Dashboard mounted');
    console.log('👤 Clerk user loaded:', isLoaded);
    console.log('👤 Clerk user:', user?.id);
    
    if (!isLoaded) {
      // Still loading Clerk
      return;
    }
    
    if (user) {
      console.log('✅ User authenticated, fetching data...');
      fetchAllData();
      const interval = setInterval(() => {
        fetchAllData();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    } else {
      console.log('❌ No user found, setting loading to false');
      setLoading(false);
    }
  }, [isLoaded, user]);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "faceAttendance") {
      fetchFaceAttendance();
    } else if (activeTab === "pendingApprovals") {
      fetchPendingUsers();
    }
  }, [activeTab]);

  const fetchAllData = async () => {
    console.log('🔄 Fetching admin dashboard data...');
    try {
      const [studentsRes, teachersRes, classesRes, notificationsRes, pendingUsersRes] =
        await Promise.all([
          fetch("/api/admin/students"),
          fetch("/api/admin/teachers"),
          fetch("/api/admin/classes"),
          fetch("/api/admin/notifications"),
          fetch("/api/admin/pending-users"),
        ]);

      console.log('📊 API Response Status:', {
        students: studentsRes.status,
        teachers: teachersRes.status,
        classes: classesRes.status,
        notifications: notificationsRes.status,
        pendingUsers: pendingUsersRes.status
      });

      // Check if user is authorized
      if (studentsRes.status === 401 || studentsRes.status === 403) {
        console.log('❌ Unauthorized - redirecting to unauthorized page');
        router.push("/unauthorized");
        return;
      }

      const [studentsData, teachersData, classesData, notificationsData, pendingUsersData] =
        await Promise.all([
          studentsRes.json(),
          teachersRes.json(),
          classesRes.json(),
          notificationsRes.json(),
          pendingUsersRes.json(),
        ]);

      console.log('✅ Data fetched successfully:', {
        students: studentsData?.length || 0,
        teachers: teachersData?.length || 0,
        classes: classesData?.length || 0,
        notifications: notificationsData?.totalToday || 0,
        pendingUsers: pendingUsersData?.pendingUsers?.length || 0
      });

      // Ensure data is always an array
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
      setNotifications(
        notificationsData?.totalToday !== undefined
          ? notificationsData
          : { totalToday: 0 }
      );
      setPendingUsers(Array.isArray(pendingUsersData?.pendingUsers) ? pendingUsersData.pendingUsers : []);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      // Set empty arrays on error
      setStudents([]);
      setTeachers([]);
      setClasses([]);
      setNotifications({ totalToday: 0 });
      setPendingUsers([]);
    } finally {
      console.log('✅ Setting loading to false');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  const fetchFaceAttendance = async () => {
    try {
      const response = await fetch("/api/admin/attendance");
      if (response.ok) {
        const data = await response.json();
        setFaceAttendanceRecords(data.records || []);
        setFaceAttendanceStats(data.statistics || {
          totalToday: 0,
          faceRecognitionToday: 0,
          teacherMarkedToday: 0,
          totalRecords: 0
        });
      }
    } catch (error) {
      console.error("Error fetching face attendance:", error);
      setFaceAttendanceRecords([]);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch("/api/admin/pending-users");
      if (response.ok) {
        const data = await response.json();
        setPendingUsers(Array.isArray(data.pendingUsers) ? data.pendingUsers : []);
      }
    } catch (error) {
      console.error("Error fetching pending users:", error);
      setPendingUsers([]);
    }
  };

  const handleApproveUser = async (userId: string, role: string) => {
    try {
      const response = await fetch("/api/admin/pending-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (response.ok) {
        setSuccessPopup({
          show: true,
          message: "User approved successfully!",
        });
        fetchPendingUsers();
        setTimeout(() => setSuccessPopup({ show: false, message: "" }), 3000);
      } else {
        const data = await response.json();
        setErrorPopup({
          show: true,
          message: data.error || "Failed to approve user",
        });
      }
    } catch (error) {
      console.error("Error approving user:", error);
      setErrorPopup({
        show: true,
        message: "Network error. Please try again.",
      });
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm("Are you sure you want to reject this user?")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/pending-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setSuccessPopup({
          show: true,
          message: "User rejected successfully!",
        });
        fetchPendingUsers();
        setTimeout(() => setSuccessPopup({ show: false, message: "" }), 3000);
      } else {
        const data = await response.json();
        setErrorPopup({
          show: true,
          message: data.error || "Failed to reject user",
        });
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
      setErrorPopup({
        show: true,
        message: "Network error. Please try again.",
      });
    }
  };

  const scrollToTabs = (tabId: string) => {
    setActiveTab(tabId as any);
    setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);

    try {
      // Determine which API endpoint to use based on role
      let apiEndpoint = "/api/admin/users";
      let requestBody: any = { ...newUser };

      if (newUser.userRole === "Student") {
        apiEndpoint = "/api/admin/create-student";
        requestBody = {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          className: newUser.className,
          rollNo: newUser.rollNo,
          parentNumber: newUser.parentNumber,
        };
      } else if (newUser.userRole === "Teacher") {
        apiEndpoint = "/api/admin/create-teacher";
        requestBody = {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phoneNumber: newUser.phoneNumber,
          subjects: newUser.subjects
            ? newUser.subjects.split(",").map((s) => s.trim())
            : [],
        };
      } else if (newUser.userRole === "Parent") {
        // Parent uses the general users endpoint
        requestBody = {
          ...newUser,
          subjects: undefined,
        };
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessPopup({
          show: true,
          message: `${newUser.userRole} created successfully! Email: ${newUser.email}, Name: ${newUser.firstName} ${newUser.lastName}`,
        });
        setShowCreateUserForm(false);
        setNewUser({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          userRole: "Teacher",
          phoneNumber: "",
          parentNumber: "",
          className: "",
          rollNo: "",
          subjects: "",
          childName: "",
        });
        fetchAllData(); // Refresh all data
        fetchUsers();
        setTimeout(() => setSuccessPopup({ show: false, message: "" }), 5000);
      } else {
        // Show detailed error message
        const errorMsg = data.error || "Unknown error occurred";
        let displayMessage = errorMsg;

        // Check if it's a duplicate email error
        if (
          response.status === 409 ||
          errorMsg.toLowerCase().includes("already exists")
        ) {
          displayMessage = `This email (${newUser.email}) is already registered in the system. Please use a different email address.`;
        } else if (
          response.status === 422 &&
          errorMsg.toLowerCase().includes("email")
        ) {
          displayMessage = `This email (${newUser.email}) is already in use. Please use a different email address.`;
        }

        setErrorPopup({
          show: true,
          message: displayMessage,
        });
        console.error("API Error:", data);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      setErrorPopup({
        show: true,
        message:
          "Network error: Failed to connect to server. Please check your connection and try again.",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    if (
      !confirm(
        `Are you sure you want to change this user's role to ${newRole}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, newRole }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("User role updated successfully!");
        fetchUsers();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role");
    }
  };

  const handleMyRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole || !user?.id) {
      return;
    }

    setUpdatingRole(true);

    try {
      const response = await fetch("/api/users/update-role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          newRole: selectedRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessPopup({
          show: true,
          message: `Role updated successfully to "${selectedRole}"! Page will refresh...`,
        });
        setShowRoleModal(false);
        setSelectedRole("");

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setErrorPopup({
          show: true,
          message: data.error || "Failed to update role",
        });
      }
    } catch (error) {
      console.error("Error updating role:", error);
      setErrorPopup({
        show: true,
        message: "Network error. Please try again.",
      });
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        alert("User deleted successfully!");
        fetchUsers();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toString().includes(searchTerm);
    const matchesClass = !classFilter || student.class === classFilter;
    return matchesSearch && matchesClass;
  });

  const handleExportCSV = () => {
    // CSV export logic
    const csvContent = [
      ["Student ID", "Name", "Class", "Attendance %"].join(","),
      ...filteredStudents.map((s) =>
        [s.id, s.name, s.class, s.attendancePercent].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
  };

  const uniqueClasses = [...new Set(students.map((s) => s.class))];

  // Show loading state while Clerk is loading or data is being fetched
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Admin Dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">
            {!isLoaded ? 'Authenticating...' : 'Fetching data from server'}
          </p>
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the admin dashboard.</p>
          <a href="/sign-in" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Welcome, Admin! 👨‍💼
                </h1>
                <p className="text-indigo-100 text-lg">Manage your school's attendance system</p>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-xs text-indigo-100">Total Users</p>
                  <p className="text-2xl font-bold">{students.length + teachers.length}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-xs text-indigo-100">Active Today</p>
                  <p className="text-2xl font-bold">{notifications.totalToday}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-6 gap-4">
          <button
            onClick={() => scrollToTabs("pendingApprovals")}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-xl transition-all transform hover:scale-105 border-l-4 border-yellow-500 text-left relative"
          >
            <div className="flex items-center">
              <div className="bg-yellow-100 rounded-lg p-3 mr-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Pending</p>
                <p className="text-xs text-gray-500">Approvals</p>
              </div>
            </div>
            {pendingUsers.length > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <Link
            href="/admin/user-management"
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-xl transition-all transform hover:scale-105 border-l-4 border-blue-500"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3 mr-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Users</p>
                <p className="text-xs text-gray-500">Manage</p>
              </div>
            </div>
          </Link>

          <button
            onClick={() => scrollToTabs("reports")}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-xl transition-all transform hover:scale-105 border-l-4 border-purple-500 text-left"
          >
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-3 mr-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Reports</p>
                <p className="text-xs text-gray-500">View</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => scrollToTabs("faceAttendance")}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-xl transition-all transform hover:scale-105 border-l-4 border-green-500 text-left"
          >
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3 mr-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Face AI</p>
                <p className="text-xs text-gray-500">Attendance</p>
              </div>
            </div>
          </button>

          <Link
            href="/admin/face-status"
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-xl transition-all transform hover:scale-105 border-l-4 border-indigo-500 text-left"
          >
            <div className="flex items-center">
              <div className="bg-indigo-100 rounded-lg p-3 mr-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Face Status</p>
                <p className="text-xs text-gray-500">View All</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/assign-class"
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-xl transition-all transform hover:scale-105 border-l-4 border-teal-500 text-left"
          >
            <div className="flex items-center">
              <div className="bg-teal-100 rounded-lg p-3 mr-3">
                <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Assign Class</p>
                <p className="text-xs text-gray-500">Clerk Students</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/verification-monitor"
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-xl transition-all transform hover:scale-105 border-l-4 border-pink-500 text-left"
          >
            <div className="flex items-center">
              <div className="bg-pink-100 rounded-lg p-3 mr-3">
                <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">🔍 AI Monitor</p>
                <p className="text-xs text-gray-500">Location & VPN</p>
              </div>
            </div>
          </Link>
          <button
            onClick={() => setShowCreateUserForm(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-md p-4 hover:shadow-xl transition-all transform hover:scale-105 text-white"
          >
            <div className="flex items-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mr-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Add User</p>
                <p className="text-xs text-indigo-100">Create new</p>
              </div>
            </div>
          </button>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105 border-l-4 border-blue-500"
            onClick={() => scrollToTabs("students")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 shadow-lg">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Students</p>
              <p className="text-4xl font-bold text-gray-900 mb-3">
                {students.length}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateUserForm(true);
                  setNewUser({ ...newUser, userRole: "Student" });
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add New Student
              </button>
            </div>
          </div>

          <div
            className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105 border-l-4 border-purple-500"
            onClick={() => scrollToTabs("teachers")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 shadow-lg">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Teachers</p>
              <p className="text-4xl font-bold text-gray-900 mb-3">
                {teachers.length}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateUserForm(true);
                  setNewUser({ ...newUser, userRole: "Teacher" });
                }}
                className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add New Teacher
              </button>
            </div>
          </div>

          <div 
            className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105 border-l-4 border-pink-500"
            onClick={() => scrollToTabs("classes")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-4 shadow-lg">
                <svg
                  className="h-6 w-6 text-pink-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Notifications Today</p>
                <p className="text-3xl font-bold text-gray-900">
                  {notifications.totalToday}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.21 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105 border-l-4 border-orange-500"
            onClick={() => router.push('/admin/register-face')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 shadow-lg">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Face Registration</p>
              <p className="text-4xl font-bold text-gray-900 mb-3">
                {students.filter(s => s.faceRegistered).length}/{students.length}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/admin/register-face');
                }}
                className="text-xs text-orange-600 hover:text-orange-800 font-semibold flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                </svg>
                Register Student Faces
              </button>
            </div>
          </div>
        </div>

        {/* Error Popup */}
        {errorPopup.show && (
          <div className="fixed top-4 right-4 z-[60] animate-slide-in">
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow-lg p-4 max-w-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Email Already Registered
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    {errorPopup.message}
                  </p>
                </div>
                <button
                  onClick={() => setErrorPopup({ show: false, message: "" })}
                  className="ml-3 flex-shrink-0 text-red-500 hover:text-red-700"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Popup */}
        {successPopup.show && (
          <div className="fixed top-4 right-4 z-[60] animate-slide-in">
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow-lg p-4 max-w-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-500"
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
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-green-800">
                    Success!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    {successPopup.message}
                  </p>
                </div>
                <button
                  onClick={() => setSuccessPopup({ show: false, message: "" })}
                  className="ml-3 flex-shrink-0 text-green-500 hover:text-green-700"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateUserForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Add New {newUser.userRole}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateUserForm(false);
                      setNewUser({
                        email: "",
                        password: "",
                        firstName: "",
                        lastName: "",
                        userRole: "Teacher",
                        phoneNumber: "",
                        parentNumber: "",
                        className: "",
                        rollNo: "",
                        subjects: "",
                        childName: "",
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      value={newUser.userRole}
                      onChange={(e) =>
                        setNewUser({ ...newUser, userRole: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
                      required
                    >
                      <option value="Student">Student</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Parent">Parent</option>
                    </select>
                  </div>

                  {/* Common Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newUser.firstName}
                        onChange={(e) =>
                          setNewUser({ ...newUser, firstName: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={newUser.lastName}
                        onChange={(e) =>
                          setNewUser({ ...newUser, lastName: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Password field - only for Parent */}
                  {newUser.userRole === "Parent" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser({ ...newUser, password: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        minLength={8}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum 8 characters
                      </p>
                    </div>
                  )}

                  {/* Student-specific fields */}
                  {newUser.userRole === "Student" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Class *
                          </label>
                          <input
                            type="text"
                            value={newUser.className}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                className: e.target.value,
                              })
                            }
                            placeholder="e.g., Class 5"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Roll No *
                          </label>
                          <input
                            type="text"
                            value={newUser.rollNo}
                            onChange={(e) =>
                              setNewUser({ ...newUser, rollNo: e.target.value })
                            }
                            placeholder="e.g., 101"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Parent Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={newUser.parentNumber}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              parentNumber: e.target.value,
                            })
                          }
                          placeholder="+91XXXXXXXXXX"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Teacher-specific fields */}
                  {newUser.userRole === "Teacher" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={newUser.phoneNumber}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              phoneNumber: e.target.value,
                            })
                          }
                          placeholder="+91XXXXXXXXXX"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subjects/Classes
                        </label>
                        <input
                          type="text"
                          value={newUser.subjects}
                          onChange={(e) =>
                            setNewUser({ ...newUser, subjects: e.target.value })
                          }
                          placeholder="e.g., Class 5, Class 6"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Comma-separated list
                        </p>
                      </div>
                    </>
                  )}

                  {/* Parent-specific fields */}
                  {newUser.userRole === "Parent" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={newUser.phoneNumber}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              phoneNumber: e.target.value,
                            })
                          }
                          placeholder="+91XXXXXXXXXX"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Child Name
                        </label>
                        <input
                          type="text"
                          value={newUser.childName}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              childName: e.target.value,
                            })
                          }
                          placeholder="Student's name"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingUser
                        ? "Creating..."
                        : `Create ${newUser.userRole}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateUserForm(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div ref={tabsRef} className="bg-white rounded-xl shadow-md mb-6 scroll-mt-4">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {[
                { id: "pendingApprovals", label: "Pending Approvals" },
                { id: "students", label: "Students" },
                { id: "teachers", label: "Teachers" },
                { id: "classes", label: "Classes" },
                { id: "faceAttendance", label: "Face Attendance" },
                { id: "reports", label: "Reports" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "students" && (
              <div>
                {/* Search and Filter */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                  />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                  >
                    <option value="">All Classes</option>
                    {uniqueClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleExportCSV}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md transition-all duration-300 transform hover:scale-105 font-medium"
                  >
                    Export CSV
                  </button>
                </div>

                {/* Students Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attendance %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          className={
                            student.attendancePercent < 75 ? "bg-red-50" : ""
                          }
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.email || 'No email'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.class}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                student.attendancePercent >= 75
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {student.attendancePercent}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "teachers" && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Classes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Attendance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {teacher.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher.classes.join(", ")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher.lastAttendanceMarked}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "classes" && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Present Today
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Absent Today
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Teacher
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classes.map((cls) => (
                      <tr key={cls.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {cls.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cls.totalStudents}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {cls.presentToday}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            {cls.absentToday}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cls.teacher}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "faceAttendance" && (
              <div>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Face Recognition Attendance
                    </h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => fetchFaceAttendance()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to reset today\'s attendance? This will delete all attendance records for today.')) {
                            return;
                          }
                          try {
                            const response = await fetch('/api/admin/attendance/reset-today', {
                              method: 'DELETE',
                            });
                            if (response.ok) {
                              setSuccessPopup({
                                show: true,
                                message: 'Today\'s attendance has been reset successfully!',
                              });
                              fetchFaceAttendance();
                              setTimeout(() => setSuccessPopup({ show: false, message: '' }), 3000);
                            } else {
                              const data = await response.json();
                              setErrorPopup({
                                show: true,
                                message: data.error || 'Failed to reset attendance',
                              });
                            }
                          } catch (error) {
                            console.error('Error resetting attendance:', error);
                            setErrorPopup({
                              show: true,
                              message: 'Network error. Please try again.',
                            });
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Reset Today's Attendance
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600 font-medium">Total Today</p>
                      <p className="text-2xl font-bold text-blue-900">{faceAttendanceStats.totalToday}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium">Face Recognition</p>
                      <p className="text-2xl font-bold text-green-900">{faceAttendanceStats.faceRecognitionToday}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600 font-medium">Teacher Marked</p>
                      <p className="text-2xl font-bold text-purple-900">{faceAttendanceStats.teacherMarkedToday}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 font-medium">Total Records</p>
                      <p className="text-2xl font-bold text-gray-900">{faceAttendanceStats.totalRecords}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roll No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marked By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {faceAttendanceRecords.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                            No attendance records found
                          </td>
                        </tr>
                      ) : (
                        faceAttendanceRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {record.studentName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.class}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.rollNo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                record.status === 'present'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {record.status === 'present' ? '✓ Present' : '✗ Absent'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                record.method === 'face_recognition'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {record.method === 'face_recognition' ? '📸 Face' : '👨‍🏫 Teacher'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.markedBy}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(record.markedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    const newStatus = record.status === 'present' ? 'absent' : 'present';
                                    try {
                                      const response = await fetch('/api/admin/attendance/update', {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          recordId: record.id,
                                          status: newStatus,
                                        }),
                                      });
                                      if (response.ok) {
                                        setSuccessPopup({
                                          show: true,
                                          message: `Attendance updated to ${newStatus}!`,
                                        });
                                        fetchFaceAttendance();
                                        setTimeout(() => setSuccessPopup({ show: false, message: '' }), 2000);
                                      } else {
                                        const data = await response.json();
                                        setErrorPopup({
                                          show: true,
                                          message: data.error || 'Failed to update attendance',
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error updating attendance:', error);
                                      setErrorPopup({
                                        show: true,
                                        message: 'Network error. Please try again.',
                                      });
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    record.status === 'present'
                                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                                  }`}
                                >
                                  {record.status === 'present' ? 'Mark Absent' : 'Mark Present'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "pendingApprovals" && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Pending User Approvals
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Review and approve new user registrations
                  </p>
                  {pendingUsers.length === 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                      <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-lg font-semibold text-green-800 mb-2">All caught up!</p>
                      <p className="text-green-600">No pending user approvals at the moment.</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-yellow-800 font-medium">
                          {pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} waiting for approval
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requested Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.name || user.fullName || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              {user.role || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleApproveUser(user.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                className="px-3 py-1 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                              >
                                <option value="">Approve as...</option>
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="parent">Parent</option>
                              </select>
                              <button
                                onClick={() => handleRejectUser(user.id)}
                                className="px-3 py-1 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "reports" && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Attendance Reports
                  </h3>
                  <p className="text-gray-600 mb-4">
                    View and download comprehensive attendance reports
                  </p>
                  <button
                    onClick={handleExportCSV}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md transition-all duration-300 transform hover:scale-105 font-medium"
                  >
                    Download Full Report (CSV)
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-600">
                    Report generation and filtering options will be available
                    here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
