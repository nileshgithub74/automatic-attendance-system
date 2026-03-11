'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import toast, { Toaster } from 'react-hot-toast';

interface LocationLog {
  _id: string;
  userId: string;
  userName: string;
  userRole: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: Date;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
}

interface NetworkLog {
  _id: string;
  userId: string;
  userName: string;
  ipAddress: string;
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  country: string;
  city: string;
  isp: string;
  latency: number;
  jitter: number;
  riskScore: number;
  threatLevel: string;
  timestamp: Date;
}

interface VerificationSession {
  sessionId: string;
  teacherName: string;
  className: string;
  date: Date;
  status: string;
  capturedImages: number;
  totalImages: number;
  studentsMarked: string[];
}

export default function VerificationMonitorPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<'sessions' | 'locations' | 'network'>('sessions');
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [locationLogs, setLocationLogs] = useState<LocationLog[]>([]);
  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const role = user?.publicMetadata?.role as string;
    if (role !== 'Admin' && role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    fetchData();
  }, [isLoaded, user, router, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sessions') {
        await fetchSessions();
      } else if (activeTab === 'locations') {
        await fetchLocationLogs();
      } else if (activeTab === 'network') {
        await fetchNetworkLogs();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    // This endpoint needs to be created
    const response = await fetch('/api/admin/verification/sessions');
    if (response.ok) {
      const data = await response.json();
      setSessions(data.sessions || []);
    }
  };

  const fetchLocationLogs = async () => {
    // This endpoint needs to be created
    const response = await fetch('/api/admin/verification/location-logs');
    if (response.ok) {
      const data = await response.json();
      setLocationLogs(data.logs || []);
    }
  };

  const fetchNetworkLogs = async () => {
    // This endpoint needs to be created
    const response = await fetch('/api/admin/verification/network-logs');
    if (response.ok) {
      const data = await response.json();
      setNetworkLogs(data.logs || []);
    }
  };

  const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    // Haversine formula
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(2)}km`;
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Monitoring Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">🔍 Verification Monitoring Dashboard</h1>
            <p className="text-blue-100 text-lg">Monitor sessions, locations, and network security</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
            <p className="text-3xl font-bold text-blue-600">{sessions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 mb-1">Location Logs</p>
            <p className="text-3xl font-bold text-green-600">{locationLogs.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <p className="text-sm text-gray-600 mb-1">VPN Detected</p>
            <p className="text-3xl font-bold text-red-600">
              {networkLogs.filter(log => log.isVPN).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600 mb-1">High Risk</p>
            <p className="text-3xl font-bold text-orange-600">
              {networkLogs.filter(log => log.riskScore >= 70).length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'sessions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📹 Verification Sessions
              </button>
              <button
                onClick={() => setActiveTab('locations')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'locations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📍 Location Tracking
              </button>
              <button
                onClick={() => setActiveTab('network')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'network'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔒 Network Security
              </button>
            </nav>
          </div>
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Verification Sessions</h2>
            
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-xl text-gray-600">No verification sessions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Session ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Teacher</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr key={session.sessionId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-mono">{session.sessionId.slice(0, 20)}...</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{session.teacherName}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{session.className}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(session.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            session.status === 'active' ? 'bg-green-100 text-green-800' :
                            session.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {session.capturedImages}/{session.totalImages}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Location Tracking Tab */}
        {activeTab === 'locations' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📍 Location Tracking Logs</h2>
            
            {locationLogs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-xl text-gray-600">No location logs yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Coordinates</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Accuracy</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Device</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {locationLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.userName}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            log.userRole === 'teacher' ? 'bg-blue-100 text-blue-800' :
                            log.userRole === 'student' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.userRole}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                          {log.location.latitude.toFixed(6)}, {log.location.longitude.toFixed(6)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          ±{Math.round(log.location.accuracy)}m
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.deviceInfo?.isMobile ? '📱 Mobile' : '💻 Desktop'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Network Security Tab */}
        {activeTab === 'network' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🔒 Network Security Logs</h2>
            
            {networkLogs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-xl text-gray-600">No network logs yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {networkLogs.map((log) => (
                  <div key={log._id} className={`border-2 rounded-lg p-6 ${
                    log.isVPN || log.isProxy || log.isTor ? 'border-red-300 bg-red-50' :
                    log.riskScore >= 40 ? 'border-orange-300 bg-orange-50' :
                    'border-green-300 bg-green-50'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{log.userName}</h3>
                        <p className="text-sm text-gray-600">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-4 py-2 text-sm font-bold rounded-full ${
                          log.threatLevel === 'high' ? 'bg-red-600 text-white' :
                          log.threatLevel === 'medium' ? 'bg-orange-600 text-white' :
                          'bg-green-600 text-white'
                        }`}>
                          {log.threatLevel.toUpperCase()} RISK
                        </span>
                        <span className="text-2xl font-bold text-gray-900">
                          {log.riskScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">IP Address</p>
                        <p className="text-sm font-mono font-semibold text-gray-900">{log.ipAddress}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Location</p>
                        <p className="text-sm font-semibold text-gray-900">{log.city}, {log.country}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">ISP</p>
                        <p className="text-sm font-semibold text-gray-900">{log.isp}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Latency</p>
                        <p className="text-sm font-semibold text-gray-900">{log.latency}ms (±{log.jitter}ms)</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {log.isVPN && (
                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                          🚫 VPN DETECTED
                        </span>
                      )}
                      {log.isProxy && (
                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                          🚫 PROXY DETECTED
                        </span>
                      )}
                      {log.isTor && (
                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                          🚫 TOR DETECTED
                        </span>
                      )}
                      {log.isHosting && (
                        <span className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full">
                          ⚠️ DATACENTER IP
                        </span>
                      )}
                      {!log.isVPN && !log.isProxy && !log.isTor && log.riskScore < 40 && (
                        <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                          ✅ VERIFIED
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
