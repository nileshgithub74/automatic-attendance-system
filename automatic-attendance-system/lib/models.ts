import { ObjectId } from 'mongodb';

export interface Student {
  _id?: ObjectId;
  id: number;
  name: string;
  rollNo?: string;
  parentNumber: string;
  class: string;
  email?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AttendanceRecord {
  _id?: ObjectId;
  id: number;
  studentId: number;
  name: string;
  date: string;
  time: string;
  status: 'Present' | 'Absent';
  createdAt?: Date;
}

export interface Teacher {
  _id?: ObjectId;
  id: number;
  name: string;
  email: string;
  classes: string[];
  lastAttendanceMarked?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Class {
  _id?: ObjectId;
  id: number;
  name: string;
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  teacher: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfile {
  _id?: ObjectId;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'Principal' | 'Teacher' | 'Student' | 'Parent';
  phoneNumber?: string;
  parentNumber?: string;
  class?: string;
  subjects?: string[];
  childName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
