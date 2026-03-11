import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Middleware helper to check if user has admin role
 * Use this in API routes that require admin access
 */
export async function requireAdmin() {
  const { userId } = await auth();
  
  if (!userId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      ),
    };
  }

  const user = await currentUser();
  const role = user?.publicMetadata?.role as string;

  if (role !== 'admin' && role !== 'Principal') {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId,
    user,
    role,
  };
}

/**
 * Check if user has specific role
 */
export async function requireRole(requiredRole: string | string[]) {
  const { userId } = await auth();
  
  if (!userId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      ),
    };
  }

  const user = await currentUser();
  const role = user?.publicMetadata?.role as string;

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!allowedRoles.includes(role)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: `Forbidden - Required role: ${allowedRoles.join(' or ')}` },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId,
    user,
    role,
  };
}

/**
 * Get current user role
 */
export async function getCurrentUserRole() {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  return user?.publicMetadata?.role as string || null;
}
