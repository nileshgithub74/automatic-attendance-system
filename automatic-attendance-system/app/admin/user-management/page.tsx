'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

interface UserDetails {
  id: string | number;
  name: string;
  email: string;
  role: string;
  source: string;
  clerkId?: string;
  class?: string;
  rollNo?: string;
  classes?: string[];
  phoneNumber?: string;
  childrenIds?: number[];
}

interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  source: string;
}

export default function UserManagementPage() {
  const [currentUser, setCurrentUser] = useState<UserDetails | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');
  const [updating, setUpdating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteAttendance, setDeleteAttendance] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchAllUsers();
  }, []);

  /**
   * Fetch current logged-in user details
   */
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/details');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch all users from the system
   */
  const fetchAllUsers = async () => {
    try {
      // Fetch from all sources
      const [clerkUsersRes, studentsRes, teachersRes] = await Promise.all([
        fetch('/api/admin/users'), // Fetch all Clerk users
        fetch('/api/admin/students'),
        fetch('/api/admin/teachers'),
      ]);

      const clerkUsers = clerkUsersRes.ok ? await clerkUsersRes.json() : [];
      const students = studentsRes.ok ? await studentsRes.json() : [];
      const teachers = teachersRes.ok ? await teachersRes.json() : [];

      // Create a map to track unique users by email
      const userMap = new Map<string, User>();

      // Add Clerk users first (primary source)
      clerkUsers.forEach((user: any) => {
        if (user.email) {
          userMap.set(user.email.toLowerCase(), {
            id: user.id,
            name: user.fullName || user.email.split('@')[0],
            email: user.email,
            role: user.role || 'No role',
            source: 'clerk',
          });
        }
      });

      // Add MongoDB students (if not already in Clerk)
      students.forEach((s: any) => {
        const email = (s.email || '').toLowerCase();
        if (email && !userMap.has(email)) {
          userMap.set(email, {
            id: s.id,
            name: s.name,
            email: s.email || 'N/A',
            role: 'student',
            source: 'mongodb',
          });
        }
      });

      // Add MongoDB teachers (if not already in Clerk)
      teachers.forEach((t: any) => {
        const email = (t.email || '').toLowerCase();
        if (email && !userMap.has(email)) {
          userMap.set(email, {
            id: t.id,
            name: t.name,
            email: t.email,
            role: 'teacher',
            source: 'mongodb',
          });
        }
      });

      // Convert map to array
      const allUsersList: User[] = Array.from(userMap.values());

      setAllUsers(allUsersList);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  /**
   * Delete user and optionally their attendance records
   */
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIdToDelete: userToDelete.id,
          source: userToDelete.source,
          deleteAttendance,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'User deleted successfully!');
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        setDeleteAttendance(false);
        // Refresh the user list
        fetchAllUsers();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Handle role change submission
   */
  const handleRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !newRole) {
      toast.error('Please select a user and role');
      return;
    }

    setUpdating(true);

    try {
      const response = await fetch('/api/user/update-role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          newRole: newRole,
          userSource: selectedUser.source,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Role updated successfully! ${selectedUser.name} is now ${newRole}`,
          { duration: 4000 }
        );
        setSelectedUser(null);
        setNewRole('');
        fetchAllUsers();
        
        // If user changed their own role, refresh
        if (currentUser && selectedUser.id === currentUser.id) {
          fetchCurrentUser();
        }
      } else {
        toast.error(`Failed to update role: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Network error: Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage user roles and view active session details</p>
        </div>

        {/* Current User Session Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Session Details</h2>
          {currentUser ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="text-lg font-semibold text-gray-900">{currentUser.id}</p>
                </div>
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-lg font-semibold text-gray-900">{currentUser.name}</p>
                </div>
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg font-semibold text-gray-900">{currentUser.email}</p>
                </div>
              </div>
              <div>
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-500">Current Role</label>
                  <p className="text-lg">
                    <span className={`px-4 py-2 rounded-full font-semibold ${
                      currentUser.role === 'Principal' || currentUser.role === 'Admin'
                        ? 'bg-purple-100 text-purple-800'
                        : currentUser.role === 'teacher' || currentUser.role === 'Teacher'
                        ? 'bg-green-100 text-green-800'
                        : currentUser.role === 'student' || currentUser.role === 'Student'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {currentUser.role}
                    </span>
                  </p>
                </div>
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-500">Authentication Source</label>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{currentUser.source}</p>
                </div>
                {currentUser.class && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-500">Class</label>
                    <p className="text-lg font-semibold text-gray-900">{currentUser.class}</p>
                  </div>
                )}
                {currentUser.classes && currentUser.classes.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-500">Classes Teaching</label>
                    <p className="text-lg font-semibold text-gray-900">{currentUser.classes.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No active session found</p>
          )}
        </div>

        {/* Role Change Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Change User Role</h2>
          <p className="text-sm text-gray-600 mb-6">
            Select a user and assign a new role. Only administrators can perform this action.
          </p>

          <form onSubmit={handleRoleChange} className="space-y-6">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User *
              </label>
              <select
                value={selectedUser ? `${selectedUser.id}-${selectedUser.source}` : ''}
                onChange={(e) => {
                  const [id, source] = e.target.value.split('-');
                  const user = allUsers.find(u => u.id.toString() === id && u.source === source);
                  setSelectedUser(user || null);
                  setNewRole('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                required
              >
                <option value="">-- Select a user --</option>
                {allUsers.map((user) => (
                  <option key={`${user.id}-${user.source}`} value={`${user.id}-${user.source}`}>
                    {user.name} ({user.email}) - Current Role: {user.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Selection */}
            {selectedUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  required
                >
                  <option value="">-- Select new role --</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                  {selectedUser.source === 'clerk' && (
                    <option value="Principal">Principal</option>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Current role: <span className="font-semibold">{selectedUser.role}</span>
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={updating || !selectedUser || !newRole}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Update Role'}
              </button>
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setNewRole('');
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* All Users List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">All Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allUsers.map((user) => (
                  <tr key={`${user.id}-${user.source}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'Principal' || user.role === 'Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : user.role === 'teacher' || user.role === 'Teacher'
                          ? 'bg-green-100 text-green-800'
                          : user.role === 'student' || user.role === 'Student'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {user.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole('');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete User</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>{userToDelete.name}</strong> ({userToDelete.email})?
              </p>
              <p className="text-sm text-red-600 font-semibold">
                This action cannot be undone!
              </p>
            </div>

            {/* Delete Attendance Option */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAttendance}
                  onChange={(e) => setDeleteAttendance(e.target.checked)}
                  className="mt-1 mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Also delete all attendance records
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    This will permanently remove all attendance records associated with this user
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete User'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                  setDeleteAttendance(false);
                }}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
