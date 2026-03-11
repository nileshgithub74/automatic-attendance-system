'use client';

import { useEffect, useState } from 'react';

interface Notification {
  id: number;
  studentName: string;
  parentNumber: string;
  date: string;
  time: string;
  status: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/attendance');
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      // Ensure data is an array
      const records = Array.isArray(data) ? data : [];
      // Filter only Present status for notifications
      const presentRecords = records.filter((record: any) => 
        record.status === 'Present' || record.status === 'present'
      );
      setNotifications(presentRecords);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Parent Notifications</h1>
          <p className="mt-2 text-gray-600">View all attendance notifications sent to parents</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.21 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
              <p className="mt-1 text-sm text-gray-500">Notifications will appear here when attendance is marked.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 shadow-md animate-fade-in"
              >
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-green-600 mr-3 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-green-800 font-medium">
                      ✅ Notification sent to parent of <span className="font-bold">{notification.studentName}</span> confirming attendance.
                    </p>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Parent: {notification.parentNumber || 'N/A'}</p>
                      <p>Date: {new Date(notification.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p>Time: {notification.time || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

