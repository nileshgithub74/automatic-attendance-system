import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/mongodb";

export default async function AdminDashboard() {
  // Ensure user is authenticated
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get user details
  const user = await currentUser();
  
  // Check if user has admin role
  const db = await getDatabase();
  let isAdmin = false;
  
  if (db) {
    const userDoc = await db.collection("users").findOne({ 
      $or: [
        { clerkId: userId },
        { email: user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() }
      ]
    });
    
    isAdmin = userDoc?.role === 'admin';
  }

  // Redirect if not admin
  if (!isAdmin) {
    redirect("/unauthorized");
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <p className="text-gray-600 mb-4">Manage system users and permissions</p>
          <a 
            href="/admin/user-management" 
            className="text-blue-600 hover:underline"
          >
            Go to User Management →
          </a>
        </div>

        {/* Reports Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Reports</h2>
          <p className="text-gray-600 mb-4">View and generate system reports</p>
          <a 
            href="/admin/reports" 
            className="text-blue-600 hover:underline"
          >
            View Reports →
          </a>
        </div>

        {/* System Settings Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">System Settings</h2>
          <p className="text-gray-600 mb-4">Configure system preferences</p>
          <a 
            href="/admin/settings" 
            className="text-blue-600 hover:underline"
          >
            Open Settings →
          </a>
        </div>
      </div>
    </div>
  );
}
