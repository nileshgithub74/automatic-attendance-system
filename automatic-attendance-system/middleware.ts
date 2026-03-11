import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/notify",
  "/api/auth/login",
  "/api/auth/logout",
  "/unauthorized",
  "/debug-student",
  "/test-auth",
  "/fix-role",
]);

// Role-based route protection
function roleBasedProtection(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get user role from cookie
  const userRole = request.cookies.get('userRole')?.value;
  const userId = request.cookies.get('userId')?.value;

  console.log('🔍 Middleware check:', { pathname, userRole, userId: !!userId });

  // Protected routes
  const studentRoutes = ['/dashboard/student', '/student/attendance', '/student/mark-attendance', '/attendance-history'];
  const teacherRoutes = ['/dashboard/teacher'];
  const parentRoutes = ['/dashboard/parent'];

  // Check if accessing protected route
  const isStudentRoute = studentRoutes.some(route => pathname.startsWith(route));
  const isTeacherRoute = teacherRoutes.some(route => pathname.startsWith(route));
  const isParentRoute = parentRoutes.some(route => pathname.startsWith(route));

  // If not logged in and trying to access protected route
  if ((isStudentRoute || isTeacherRoute || isParentRoute) && !userId) {
    console.log('❌ No userId cookie, redirecting to sign-in');
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // Role-based access control
  if (isStudentRoute && userRole !== 'student') {
    console.log('❌ Student route access denied:', { userRole, expected: 'student' });
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  if (isTeacherRoute && userRole !== 'teacher') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  if (isParentRoute && userRole !== 'parent') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return null;
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  
  // Get auth info from Clerk
  const { userId } = await auth();
  
  // Check if this is a student/teacher/parent route
  const isRoleBasedRoute = pathname.startsWith('/dashboard/student') || 
                          pathname.startsWith('/dashboard/teacher') || 
                          pathname.startsWith('/dashboard/parent') ||
                          pathname.startsWith('/student/attendance') ||
                          pathname.startsWith('/student/mark-attendance') ||
                          pathname.startsWith('/attendance-history') ||
                          pathname.startsWith('/api/submissions') ||
                          pathname.startsWith('/api/student/mark-attendance');
  
  // For role-based routes, allow if either:
  // 1. User is authenticated with Clerk (has userId)
  // 2. User has custom login cookies
  if (isRoleBasedRoute) {
    const hasCustomAuth = req.cookies.get('userId')?.value;
    
    // If user is authenticated with Clerk OR has custom auth, allow access
    if (userId || hasCustomAuth) {
      console.log('✅ Middleware: Access granted', { clerkUserId: !!userId, customAuth: !!hasCustomAuth });
      return NextResponse.next();
    }
    
    // No authentication found, redirect to sign-in
    console.log('❌ Middleware: No authentication, redirecting to sign-in');
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // For Clerk-protected routes (admin, etc.)
  if (!isPublicRoute(req)) {
    // If user is signed in with Clerk, allow access
    if (userId) {
      return NextResponse.next();
    }
    // Otherwise, protect the route
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
