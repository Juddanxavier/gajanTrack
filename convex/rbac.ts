/**
 * Role-Based Access Control (RBAC) Utilities
 * 
 * Simplified for Single-Tenancy.
 */
import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type GenericCtx = QueryCtx | MutationCtx;

/**
 * Ensures the user is authenticated and returns their user record.
 * Optionally verifies the session if sessionId is provided.
 */
export async function requireUser(ctx: GenericCtx, sessionId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: User identity not found");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("Unauthenticated: User record not found in database");
  }

  // If sessionId is provided, verify it exists and hasn't expired
  if (sessionId) {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_userId_sessionId", (q) => 
        q.eq("userId", identity.subject).eq("sessionId", sessionId)
      )
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Unauthenticated: Session invalid or expired");
    }
    
    // Return both user and session for context
    return { user, session };
  }

  return { user, session: null };
}

/**
 * Similar to requireUser but for Actions.
 */
export async function requireUserAction(ctx: ActionCtx, sessionId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: User identity not found");
  }

  // Use string lookup to avoid circular dependency with api
  const user = await ctx.runQuery("users:getCurrentUser" as any, { sessionId });
  if (!user) {
    throw new Error("Unauthenticated: User record not found");
  }

  if (sessionId) {
    // Note: session check in actions might need a query
    const sessions = await ctx.runQuery("sessions:listMySessions" as any, {});
    const activeSession = sessions.find((s: any) => s.sessionId === sessionId);
    if (!activeSession) {
       throw new Error("Unauthenticated: Session invalid or expired");
    }
    return { user, session: activeSession };
  }

  return { user, session: null };
}

/**
 * Ensuring the user has the 'admin' role.
 */
export async function requireAdmin(ctx: GenericCtx, sessionId?: string) {
  const { user, session } = await requireUser(ctx, sessionId);
  if (user.role !== "admin") {
    throw new Error("Forbidden: Admin role required");
  }
  return { user, session };
}

/**
 * Ensures the user has 'admin' or 'staff' role for a specific organization.
 */
export async function requireOrgRole(ctx: GenericCtx, orgId: Id<"organizations"> | string, sessionId?: string) {
  const { user, session } = await requireUser(ctx, sessionId);
  
  // Admins can bypass organization checks
  if (user.role === "admin") return { user, session };
  
  // Normalize IDs to strings for robust comparison
  const targetOrgId = String(orgId);
  const userOrgId = user.orgId ? String(user.orgId) : null;
  const sessionOrgId = session?.orgId ? String(session.orgId) : null;

  // Strict Validation: If user has a fixed orgId, they CANNOT switch to another one
  if (userOrgId && targetOrgId !== userOrgId) {
    throw new Error("Forbidden: You do not have access to this organization");
  }

  // If session has a fixed orgId, it MUST match the target orgId
  if (sessionOrgId && sessionOrgId !== targetOrgId) {
    throw new Error("Forbidden: Session organization mismatch");
  }

  if (user.role !== "staff") {
    throw new Error("Forbidden: Staff role required");
  }

  return { user, session };
}

/**
 * Ensures the user belongs to the specified organization.
 */
export async function requireOrgMember(ctx: GenericCtx, orgId: Id<"organizations"> | string, sessionId?: string) {
  const { user, session } = await requireUser(ctx, sessionId);
  
  if (user.role === "admin") return { user, session };
  
  // Normalize IDs to strings for robust comparison
  const targetOrgId = String(orgId);
  const userOrgId = user.orgId ? String(user.orgId) : null;
  const sessionOrgId = session?.orgId ? String(session.orgId) : null;

  // Strict Validation: If user has a fixed orgId, they CANNOT switch to another one
  if (userOrgId && targetOrgId !== userOrgId) {
    throw new Error("Forbidden: Access denied to this organization");
  }

  // If session has a fixed orgId, it MUST match the target orgId
  if (sessionOrgId && sessionOrgId !== targetOrgId) {
    throw new Error("Forbidden: Session organization mismatch");
  }

  return { user, session };
}

/**
 * Similar utilities for Actions.
 */
export async function requireAdminAction(ctx: ActionCtx, sessionId?: string) {
  const { user, session } = await requireUserAction(ctx, sessionId);
  if (user.role !== "admin") {
    throw new Error("Forbidden: Admin role required");
  }
  return { user, session };
}

export async function requireOrgMemberAction(ctx: ActionCtx, orgId: Id<"organizations"> | string, sessionId?: string) {
  const { user, session } = await requireUserAction(ctx, sessionId);
  if (user.role === "admin") return { user, session };
  
  const targetOrgId = String(orgId);
  const effectiveOrgId = session?.orgId ? String(session.orgId) : (user.orgId ? String(user.orgId) : null);

  if (effectiveOrgId !== targetOrgId) {
    throw new Error("Forbidden: Access denied to this organization");
  }
  return { user, session };
}
