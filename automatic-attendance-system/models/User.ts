// User Model for Automatic Attendance System
// This can be adapted for MongoDB/Mongoose later

export interface User {
  id: string;
  email: string;
  password: string; // Should be hashed in production
  name: string;
  role: 'Teacher' | 'Student' | 'Principal';
  classId?: string; // For students and teachers
  createdAt: Date;
  updatedAt: Date;
}

// Mock users data (replace with MongoDB in production)
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'principal@school.com',
    password: 'admin123', // In production, this should be hashed
    name: 'Principal Admin',
    role: 'Principal',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    email: 'teacher@school.com',
    password: 'teacher123',
    name: 'John Teacher',
    role: 'Teacher',
    classId: 'class1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    email: 'student@school.com',
    password: 'student123',
    name: 'Student User',
    role: 'Student',
    classId: 'class1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// User validation
export function validateUserRole(role: string): role is User['role'] {
  return ['Teacher', 'Student', 'Principal'].includes(role);
}

