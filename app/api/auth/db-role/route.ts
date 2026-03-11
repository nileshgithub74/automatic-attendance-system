import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses?.[0]?.emailAddress ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      null;

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Attempt to find the user in main users collection
    let appUser = null;
    if (userId) {
      appUser = await db.collection("users").findOne({ clerkId: userId });
    }

    if (!appUser && email) {
      appUser = await db
        .collection("users")
        .findOne({ email: email.toLowerCase() });
    }

    if (!appUser) {
      const collections = ["students", "teachers", "parents"];
      for (const col of collections) {
        const byClerk = userId
          ? await db.collection(col).findOne({ clerkId: userId })
          : null;
        const byEmail = email
          ? await db.collection(col).findOne({ email: email.toLowerCase() })
          : null;
        appUser = byClerk || byEmail;
        if (appUser) break;
      }
    }

    if (!appUser) {
      return NextResponse.json({ success: true, role: null });
    }

    const role =
      appUser.role ||
      appUser.userRole ||
      appUser.type ||
      appUser.roleName ||
      null;

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Error fetching DB role:", error);
    return NextResponse.json(
      { error: "Failed to fetch DB role" },
      { status: 500 }
    );
  }
}
