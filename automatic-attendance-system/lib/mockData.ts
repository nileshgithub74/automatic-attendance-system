// Mock data for when MongoDB is not available

export const mockStudents = [
  { id: 1, name: 'John Doe', class: 'Class 10A', className: 'Class 10A', attendancePercent: 95 },
  { id: 2, name: 'Jane Smith', class: 'Class 10A', className: 'Class 10A', attendancePercent: 88 },
  { id: 3, name: 'Mike Johnson', class: 'Class 10B', className: 'Class 10B', attendancePercent: 92 },
  { id: 4, name: 'Sarah Williams', class: 'Class 10B', className: 'Class 10B', attendancePercent: 97 },
  { id: 5, name: 'Tom Brown', class: 'Class 9A', className: 'Class 9A', attendancePercent: 85 },
  { id: 6, name: 'Emma Davis', class: 'Class 9A', className: 'Class 9A', attendancePercent: 91 },
  { id: 7, name: 'Oliver Wilson', class: 'Class 9B', className: 'Class 9B', attendancePercent: 89 },
  { id: 8, name: 'Sophia Martinez', class: 'Class 9B', className: 'Class 9B', attendancePercent: 94 },
];

export const mockTeachers = [
  {
    id: 1,
    name: 'Prof. Robert Anderson',
    email: 'robert@school.edu',
    classes: ['Class 10A', 'Class 10B'],
    lastAttendanceMarked: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Dr. Emily Davis',
    email: 'emily@school.edu',
    classes: ['Class 9A', 'Class 9B'],
    lastAttendanceMarked: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Mr. James Wilson',
    email: 'james@school.edu',
    classes: ['Class 8A'],
    lastAttendanceMarked: 'Never',
  },
];

export const mockClasses = [
  {
    id: 1,
    name: 'Class 10A',
    totalStudents: 30,
    presentToday: 28,
    absentToday: 2,
    teacher: 'Prof. Robert Anderson',
  },
  {
    id: 2,
    name: 'Class 10B',
    totalStudents: 32,
    presentToday: 30,
    absentToday: 2,
    teacher: 'Prof. Robert Anderson',
  },
  {
    id: 3,
    name: 'Class 9A',
    totalStudents: 28,
    presentToday: 25,
    absentToday: 3,
    teacher: 'Dr. Emily Davis',
  },
  {
    id: 4,
    name: 'Class 9B',
    totalStudents: 29,
    presentToday: 29,
    absentToday: 0,
    teacher: 'Dr. Emily Davis',
  },
  {
    id: 5,
    name: 'Class 8A',
    totalStudents: 25,
    presentToday: 23,
    absentToday: 2,
    teacher: 'Mr. James Wilson',
  },
];

export const mockNotifications = {
  totalToday: 3,
};
