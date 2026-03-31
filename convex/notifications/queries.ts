import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireOrgMember } from "../rbac";

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
