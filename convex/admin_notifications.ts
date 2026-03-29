import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireOrgMember, requireAdmin } from "./rbac";

/**
 * List active notifications for the current user and organization.
 * Filters out archived ones.
 */
export const list = query({
  args: { 
    orgId: v.union(v.id("organizations"), v.string()), 
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrgMember(ctx, args.orgId, args.sessionId);
    
    // Admins see all notifications for the org
    // Staff see notifications directed to them or general org notifications
    const notifications = await ctx.db
      .query("admin_notifications")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("archivedAt"), undefined))
      .order("desc")
      .collect();

    if (user.role === "admin") {
      return notifications;
    }

    // Filter for staff: general (userId matches system/null) OR directed to them
    return notifications.filter(n => !n.userId || n.userId === user.externalId);
  },
});

/**
 * List archived notifications.
 */
export const listArchived = query({
  args: { 
    orgId: v.union(v.id("organizations"), v.string()), 
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    
    return await ctx.db
      .query("admin_notifications")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.neq(q.field("archivedAt"), undefined))
      .order("desc")
      .collect();
  },
});

/**
 * Internal mutation to create a notification.
 * This should be called from other Convex functions (actions/mutations).
 */
export const createInternal = internalMutation({
  args: {
    orgId: v.union(v.id("organizations"), v.string()),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    userId: v.optional(v.string()), // Target specific user
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("admin_notifications", {
      ...args,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Mark a notification as read or unread.
 */
export const markRead = mutation({
  args: { 
    id: v.id("admin_notifications"), 
    isRead: v.boolean(),
    orgId: v.union(v.id("organizations"), v.string()),
    sessionId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    
    await ctx.db.patch(args.id, { isRead: args.isRead });
  },
});

/**
 * Archive a notification.
 */
export const archive = mutation({
  args: { 
    id: v.id("admin_notifications"), 
    orgId: v.union(v.id("organizations"), v.string()),
    sessionId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    
    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});

/**
 * Delete a notification permanently (manual action).
 */
export const deleteNotification = mutation({
  args: { 
    id: v.id("admin_notifications"), 
    orgId: v.union(v.id("organizations"), v.string()),
    sessionId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionId); // Only admins can hard-delete
    await ctx.db.delete(args.id);
  },
});
