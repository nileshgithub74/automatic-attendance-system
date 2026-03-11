'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';

interface Submission {
  id: number;
  title: string;
  description: string;
  submittedAt: string;
  status: string;
}

export default function ParentDashboard() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [userData, setUserData] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check authentication
    const role = localStorage.getItem('userRole');
    const user = localStorage.getItem('userData');

    if (role !== 'parent' || !user) {
      router.push('/auth/login');
      return;
    }

    setUserData(JSON.parse(user));
    fetchSubmissions();
  }, [router]);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/submissions/parent');
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/submissions/parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (response.ok) {
        alert('Submission created successfully!');
        setTitle('');
        setDescription('');
        setShowForm(false);
        fetchSubmissions();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating submission:', error);
      alert('Failed to create submission');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear custom login data
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('userData');
      localStorage.removeItem('userRole');
      localStorage.removeItem('studentData');
      localStorage.removeItem('teacherData');
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Sign out from Clerk
      await signOut();
      
      // Redirect to homepage
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to redirect
      router.push('/');
    }
  };

  if (!userData) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {userData.name}!</p>
              <p className="text-sm text-gray-500">
                Children IDs: {userData.childrenIds?.join(', ') || 'N/A'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm text-gray-600 mb-2">Total Submissions</h3>
            <p className="text-3xl font-bold text-purple-600">{submissions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm text-gray-600 mb-2">Pending</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {submissions.filter(s => s.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm text-gray-600 mb-2">Approved</h3>
            <p className="text-3xl font-bold text-green-600">
              {submissions.filter(s => s.status === 'approved').length}
            </p>
          </div>
        </div>

        {/* Create Submission Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
          >
            {showForm ? 'Cancel' : 'Create New Submission'}
          </button>
        </div>

        {/* Submission Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">New Submission</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </div>
        )}

        {/* Submissions List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No submissions yet</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{submission.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {submission.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{submission.description}</p>
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
