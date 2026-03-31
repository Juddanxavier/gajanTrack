import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireUser } from "../rbac";
import { Id } from "../_generated/dataModel";

/**
 * List all organizations (Admin only, or user's assigned orgs).
 */
export const listOrganizations = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const { user } = await requireUser(ctx, args.sessionId);
      
      if (user.role === "admin") return await ctx.db.query("organizations").collect();

      if (user.orgId) {
        let org;
        if (typeof user.orgId === "string") {
          org = await ctx.db.query("organizations").withIndex("by_externalId", q => q.eq("externalId", user.orgId as string)).unique();
          if (!org) org = await ctx.db.query("organizations").withIndex("by_slug", q => q.eq("slug", user.orgId as string)).unique();
        } else {
          org = await ctx.db.get(user.orgId as Id<"organizations">);
        }
        return org ? [org] : [];
      }
      return [];
    } catch (err) {
      return [];
    }
  },
});

/**
 * Get all settings for the current user and their active organization.
 */
export const getSettings = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;

      const user = await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
        .unique();

      if (!user) return null;
      
      let organization = null;
      if (user.orgId) {
        if (typeof user.orgId === "string") {
          organization = await ctx.db.query("organizations").withIndex("by_externalId", q => q.eq("externalId", user.orgId as string)).unique();
          if (!organization) organization = await ctx.db.query("organizations").withIndex("by_slug", q => q.eq("slug", user.orgId as string)).unique();
        } else {
          organization = await ctx.db.get(user.orgId as Id<"organizations">);
        }
      }

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
          avatarUrl: user.avatarUrl,
          role: user.role,
          preferences: user.preferences ?? { theme: "system", language: "en" },
        },
        organization: organization ? {
          _id: organization._id,
          name: organization.name,
          slug: organization.slug,
          logoUrl: organization.logoUrl,
          currency: organization.currency ?? "INR",
          country: organization.country ?? "India",
          publicDomain: organization.publicDomain,
          notificationDefaults: organization.notificationDefaults ?? { email: true, whatsapp: false },
          trackingSettings: organization.trackingSettings ?? { autoArchiveDays: 30, autoDeleteDays: 90 },
        } : null,
      };
    } catch (err) {
      return null;
    }
  },
});

/**
 * Get a specific organization by ID.
 */
export const getOrganization = query({
  args: { id: v.id("organizations"), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.sessionId);
    return await ctx.db.get(args.id);
  },
});

/**
 * Get organization by slug.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});
