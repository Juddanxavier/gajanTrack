import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAdmin, requireUser } from "./rbac";

/**
 * List all organizations (Admin only).
 */
export const listOrganizations = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const { user } = await requireUser(ctx, args.sessionId);
      
      // Admins see everything
      if (user.role === "admin") {
        return await ctx.db.query("organizations").collect();
      }

      // Staff/Customers only see their assigned organization
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

/**
 * Create a new organization (Admin only).
 */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    currency: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    publicDomain: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionId);

    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error("Organization with this slug already exists");
    }

    return await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      currency: args.currency || "INR",
      logoUrl: args.logoUrl,
      publicDomain: args.publicDomain,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update organization details (Admin only).
 */
export const updateOrganization = mutation({
  args: {
    id: v.id("organizations"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    currency: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    publicDomain: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionId);

    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.slug !== undefined) patch.slug = args.slug;
    if (args.currency !== undefined) patch.currency = args.currency;
    if (args.logoUrl !== undefined) patch.logoUrl = args.logoUrl;
    if (args.publicDomain !== undefined) patch.publicDomain = args.publicDomain;

    await ctx.db.patch(args.id, patch);
  },
});
