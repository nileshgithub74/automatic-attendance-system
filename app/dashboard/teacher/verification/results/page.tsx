'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import toast, { Toaster } from 'react-hot-toast';

interface VerificationResult {
  studentId: string;
  studentName: string;
  detectionCount: number;
  totalImages: number;
  detectionPercentage: number;
  status: 'present' | 'absent' | 'flagged';
  averageSimilarity: number;
  flags: string[];
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [sessionId, setSessionId] = useState('');
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const role = user?.publicMetadata?.role as string;
    if (role !== 'Teacher' && role !== 'teacher') {
      router.push('/unauthorized');
      return;
    }

    const id = searchParams.get('sessionId');
    if (id) {
      setSessionId(id);
      fetchResults(id);
    } else {
      toast.error('No session ID provided');
      setLoading(false);
    }
  }, [isLoaded, user, router, searchParams]);

  const fetchResults = async (id: string) => {
    try {
      // This endpoint needs to be created
      const response = await fetch(`/api/verification/session/results?sessionId=${id}`);
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setSessionInfo(data.session || null);
      } else {
        toast.error('Failed to fetch results');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Error loading verification results');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Results...</p>
        </div>
      </div>
    );
  }

  const presentCount = results.filter(r => r.status === 'present').length;
  const absentCount = results.filter(r => r.status === 'absent').length;
  const flaggedCount = results.filter(r => r.status === 'flagged').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/teacher')}
            className="mb-4 flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">✅ Verification Results</h1>
                <p className="text-purple-100 text-lg">AI-based attendance verification completed</p>
                {sessionInfo && (
                  <p className="text-sm text-purple-200 mt-2">
                    Session ID: {sessionId.slice(0, 20)}... | {new Date(sessionInfo.date).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
                  <p className="text-sm text-purple-100">Verification Rate</p>
                  <p className="text-4xl font-bold">
                    {results.length > 0 ? Math.round((presentCount / results.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-1">Total Students</p>
            <p className="text-4xl font-bold text-blue-600">{results.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 mb-1">Verified Present</p>
            <p className="text-4xl font-bold text-green-600">{presentCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <p className="text-sm text-gray-600 mb-1">Not Detected</p>
            <p className="text-4xl font-bold text-red-600">{absentCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600 mb-1">Flagged</p>
            <p className="text-4xl font-bold text-orange-600">{flaggedCount}</p>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Verification Details</h2>
          
          {results.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xl text-gray-600 font-medium">No verification results yet</p>
              <p className="text-sm text-gray-500 mt-2">Results will appear here after the session completes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Detection Rate
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Images Detected
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Flags
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index} className={`hover:bg-gray-50 ${
                      result.status === 'flagged' ? 'bg-orange-50' : ''
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold">
                              {result.studentName.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{result.studentName}</div>
                            <div className="text-sm text-gray-500">ID: {result.studentId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-gray-900">
                            {result.detectionPercentage}%
                          </span>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className={`h-2 rounded-full ${
                                result.detectionPercentage >= 50 ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${result.detectionPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {result.detectionCount} / {result.totalImages}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-semibold ${
                          result.averageSimilarity >= 0.7 ? 'text-green-600' :
                          result.averageSimilarity >= 0.6 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {(result.averageSimilarity * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          result.status === 'present' ? 'bg-green-100 text-green-800' :
                          result.status === 'absent' ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {result.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {result.flags.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {result.flags.map((flag, i) => (
                              <span key={i} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                {flag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-end">
          <button
            onClick={() => router.push('/dashboard/teacher')}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => router.push('/dashboard/teacher/verification')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
          >
            Start New Session
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerificationResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
