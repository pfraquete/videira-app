import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";
import { db } from "../../drizzle";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { User } from "../../drizzle/schema";

// Initialize Supabase client for server-side token verification
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("[SupabaseAuth] WARNING: Supabase credentials not configured");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify Supabase JWT token and return the user
 */
export async function verifySupabaseToken(token: string): Promise<{ userId: string; email: string | null } | null> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.error("[SupabaseAuth] Token verification failed:", error?.message);
      return null;
    }

    return {
      userId: user.id,
      email: user.email || null,
    };
  } catch (error) {
    console.error("[SupabaseAuth] Error verifying token:", error);
    return null;
  }
}

/**
 * Sync user from Supabase to local database
 */
async function syncUserToDatabase(supabaseUser: { userId: string; email: string | null }): Promise<User | null> {
  try {
    // Check if user exists in our database
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.openId, supabaseUser.userId))
      .limit(1);

    if (existingUsers.length > 0) {
      // Update last sign in
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.openId, supabaseUser.userId));

      return existingUsers[0];
    }

    // Create new user
    const newUser = await db
      .insert(users)
      .values({
        openId: supabaseUser.userId,
        email: supabaseUser.email,
        name: supabaseUser.email?.split("@")[0] || null,
        loginMethod: "supabase",
        lastSignedIn: new Date(),
      })
      .$returningId();

    // Fetch the created user
    const createdUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, newUser[0].id))
      .limit(1);

    return createdUsers[0] || null;
  } catch (error) {
    console.error("[SupabaseAuth] Error syncing user to database:", error);
    return null;
  }
}

/**
 * Authenticate a request using Supabase token
 */
export async function authenticateRequest(req: Request): Promise<User | null> {
  const token = extractBearerToken(req);

  if (!token) {
    return null;
  }

  const supabaseUser = await verifySupabaseToken(token);

  if (!supabaseUser) {
    return null;
  }

  return syncUserToDatabase(supabaseUser);
}
