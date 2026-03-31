import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { requireAdmin } from "../rbac";

/**
 * Sync user from Clerk webhook to Convex database.
 */
export const syncUser = mutation({
  args: {
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    role: v.optional(v.union(v.literal("admin"), v.literal("staff"), v.literal("customer"))),
    orgId: v.optional(v.union(v.id("organizations"), v.string())),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    const role = args.role || (existingUser?.role ?? "customer");
    const orgId = args.orgId || existingUser?.orgId;

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        image: args.image,
        phone: args.phone,
        avatarUrl: args.avatarUrl,
        role,
        orgId,
      });
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      ...args,
      createdAt: args.createdAt || Date.now(),
      role,
      orgId,
    });

    if (orgId) {
      await ctx.db.insert("admin_notifications", {
        orgId: orgId as any,
        type: "user_signup",
        title: "New User Registered",
        message: `${args.name || args.email || "A new user"} has joined the organization as a ${role}.`,
        link: `/dashboard/users`,
        isRead: false,
        priority: role === "customer" ? "low" : "medium",
        createdAt: Date.now(),
      });
    }

    return userId;
  },
});

/**
 * Delete a user from Convex when deleted in Clerk.
 */
export const deleteUser = mutation({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (user) await ctx.db.delete(user._id);
  },
});

/**
 * Update a user's role (Admin only).
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("staff"), v.literal("customer")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, { role: args.role });

    if (user.orgId) {
      await ctx.db.insert("admin_notifications", {
        orgId: user.orgId as any,
        type: "role_updated",
        title: "Security Alert: Role Changed",
        message: `User ${user.name || user.email} role has been updated to ${args.role}.`,
        link: `/dashboard/users`,
        isRead: false,
        priority: "high",
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Ensured the current admin has a default organization selected.
 */
export const ensureDefaultOrganization = mutation({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.sessionId);
    if (user.orgId) return { orgId: user.orgId, name: "Existing Organization" };

    const orgs = await ctx.db.query("organizations").collect();
    let targetOrgId;
    if (orgs.length === 0) {
      targetOrgId = await ctx.db.insert("organizations", {
        name: "Main Branch",
        slug: "main-branch",
        currency: "INR",
        createdAt: Date.now(),
      });
    } else {
      targetOrgId = orgs[0]._id;
    }

    await ctx.db.patch(user._id, { orgId: targetOrgId });
    return { orgId: targetOrgId, name: "Main Branch" };
  },
});

/**
 * Internal mutation to fix a user's role.
 */
export const internalFixUserRole = internalMutation({
  args: { userId: v.id("users"), role: v.union(v.literal("admin"), v.literal("staff"), v.literal("customer")) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

/**
 * Update current user's profile and preferences.
 */
export const updateUserSettings = mutation({
  args: {
    sessionId: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
        language: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User record not found");

    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.avatarUrl !== undefined) patch.avatarUrl = args.avatarUrl;
    
    if (args.preferences) {
      patch.preferences = {
        ...(user.preferences ?? {}),
        ...args.preferences,
      };
    }

    await ctx.db.patch(user._id, patch);
    return user._id;
  },
});
