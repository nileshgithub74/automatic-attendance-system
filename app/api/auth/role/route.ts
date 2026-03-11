import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await req.json();

    // Validate role
    const validRoles = ["Principal", "Teacher", "Student", "Parent"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: " + validRoles.join(", ") },
        { status: 400 }
      );
    }

    // Restrict Principal role to specific email
    const PRINCIPAL_EMAIL = process.env.NEXT_PUBLIC_PRINCIPAL_EMAIL || "kumarnilesh843127@gmail.com";
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || userEmail?.split('@')[0] || "User";

    if (role === "Principal" && userEmail !== PRINCIPAL_EMAIL) {
      return NextResponse.json(
        { error: "Principal role is restricted to authorized administrators only." },
        { status: 403 }
      );
    }

    // Update user metadata with the new role in Clerk
    const updatedUser = await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role,
      },
    });

    // Save/Update user in MongoDB
    const db = await getDatabase();
    if (db) {
      const userProfile = {
        clerkId: userId,
        email: userEmail,
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        role: role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Check if user already exists
      const existingUser = await db.collection('users').findOne({ clerkId: userId });

      if (existingUser) {
        // Update existing user
        await db.collection('users').updateOne(
          { clerkId: userId },
          { 
            $set: { 
              role: role,
              updatedAt: new Date(),
            } 
          }
        );
      } else {
        // Insert new user
        await db.collection('users').insertOne(userProfile);
      }

      // Also save to role-specific collection for backward compatibility
      const roleCollection = role.toLowerCase() + 's'; // teachers, students, parents
      if (role !== 'Principal') {
        const roleSpecificData = {
          clerkId: userId,
          email: userEmail,
          name: fullName,
          role: role,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const existingRoleUser = await db.collection(roleCollection).findOne({ clerkId: userId });
        
        if (!existingRoleUser) {
          await db.collection(roleCollection).insertOne(roleSpecificData);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Role updated to ${role}`,
        user: {
          id: updatedUser.id,
          role: updatedUser.publicMetadata?.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          role: user.publicMetadata?.role || "No role assigned",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
