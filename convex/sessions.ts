import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

/**
 * Creates or updates a session for a user.
 */
export const touchSession = mutation({
  args: {
    sessionId: v.string(),
    orgId: v.optional(v.id("organizations")),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;
    const now = Date.now();
    const expiresAt = now + SESSION_TTL;

    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_userId_sessionId", (q) => 
        q.eq("userId", userId).eq("sessionId", args.sessionId)
      )
      .unique();

    // Security Guard: For non-admins, ensure they aren't "touching" an unauthorized orgId
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", userId))
      .unique();
    
    if (user && user.role !== "admin" && args.orgId && user.orgId && args.orgId !== user.orgId) {
      throw new Error("Unauthorized: You cannot set a session to this organization");
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        orgId: args.orgId || existing.orgId,
        lastActiveAt: now,
        expiresAt,
        userAgent: args.userAgent || existing.userAgent,
      });
      return existing._id;
    }

    return await ctx.db.insert("sessions", {
      userId,
      sessionId: args.sessionId,
      orgId: args.orgId,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
      lastActiveAt: now,
      expiresAt,
    });
  },
});

/**
 * Revoke a specific session.
 */
export const revokeSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_userId_sessionId", (q) => 
        q.eq("userId", identity.subject).eq("sessionId", args.sessionId)
      )
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

/**
 * List active sessions for the current user.
 */
export const listMySessions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .collect();
  },
});

/**
 * Internal cleanup of expired sessions.
 */
export const cleanupSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("sessions")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(100);

    for (const session of expired) {
      await ctx.db.delete(session._id);
    }
  },
});

/**
 * Get details for a specific session.
 */
export const getCurrentSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("sessions")
      .withIndex("by_userId_sessionId", (q) => 
        q.eq("userId", identity.subject).eq("sessionId", args.sessionId)
      )
      .unique();
  },
});
