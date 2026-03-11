"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [checking, setChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      console.log('❌ Not signed in, redirecting to sign-in');
      router.replace("/sign-in");
      return;
    }

    // Check if user has admin/principal role
    const checkRole = async () => {
      try {
        console.log('🔍 Checking user role...');
        const userRole = user?.publicMetadata?.role as string | undefined;
        const userEmail = user?.emailAddresses?.[0]?.emailAddress;
        
        console.log('👤 User role:', userRole);
        console.log('📧 User email:', userEmail);

        // Check if user is principal by email or has admin/principal role
        // Note: NEXT_PUBLIC_ variables are available in client components
        const principalEmail = 'kumarnilesh843127@gmail.com'; // From NEXT_PUBLIC_PRINCIPAL_EMAIL
        
        if (
          userEmail === principalEmail ||
          userRole?.toLowerCase() === "principal" ||
          userRole?.toLowerCase() === "admin"
        ) {
          console.log('✅ User is authorized as admin');
          setIsAuthorized(true);
        } else {
          console.log('❌ User is not authorized, redirecting to dashboard');
          router.replace("/dashboard");
        }
      } catch (e) {
        console.error("Failed to check role", e);
        router.replace("/dashboard");
      } finally {
        setChecking(false);
      }
    };

    checkRole();
  }, [isLoaded, isSignedIn, user, router]);

  // Show loading state while checking
  if (!isLoaded || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Only render children if authorized
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
