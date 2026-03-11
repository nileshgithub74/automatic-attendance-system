'use client';
// attendenc card


import { useState } from 'react';

interface Student {
  id: number;
  name: string;
  parentNumber: string;
}

interface AttendanceCardProps {
  student: Student;
  onMarkPresent: (studentId: number, studentName: string, parentNumber: string) => void;
}

export default function AttendanceCard({ student, onMarkPresent }: AttendanceCardProps) {
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkPresent = async () => {
    setIsMarking(true);
    try {
      await onMarkPresent(student.id, student.name, student.parentNumber);
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">{student.name}</h3>
          <p className="text-sm text-gray-500">Parent: {student.parentNumber}</p>
        </div>
        <button
          onClick={handleMarkPresent}
          disabled={isMarking}
          className="ml-4 px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium text-sm"
        >
          {isMarking ? 'Marking...' : 'Mark Present'}
        </button>
      </div>
    </div>
  );
}

