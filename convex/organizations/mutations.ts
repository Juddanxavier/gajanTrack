import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../rbac";

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

    const { id, sessionId, ...patch } = args;

    await ctx.db.patch(args.id, patch);
  },
});

/**
 * Update organization settings (Admin or Staff for their own org).
 */
export const updateOrgSettings = mutation({
  args: {
    sessionId: v.optional(v.string()),
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    currency: v.optional(v.string()),
    country: v.optional(v.string()),
    notificationDefaults: v.optional(
      v.object({
        email: v.boolean(),
        whatsapp: v.boolean(),
      })
    ),
    trackingSettings: v.optional(
      v.object({
        autoArchiveDays: v.number(),
        autoDeleteDays: v.number(),
      })
    ),
    apiKey17Track: v.optional(v.string()),
    publicDomain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User record not found");
    
    // Admins can update any org, Staff can only update their own org
    if (user.role !== "admin") {
      if (user.role !== "staff") {
        throw new Error("Forbidden: You do not have permission to update organization settings");
      }
      
      const userOrgIdStr = user.orgId?.toString();
      const targetOrgIdStr = args.orgId.toString();
      
      if (userOrgIdStr !== targetOrgIdStr) {
        const targetOrg = await ctx.db.get(args.orgId);
        if (!targetOrg || (user.orgId !== targetOrg.slug && user.orgId !== targetOrg.externalId)) {
          throw new Error("Forbidden: You can only update settings for your own organization");
        }
      }
    }
    
    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.slug !== undefined) patch.slug = args.slug;
    if (args.logoUrl !== undefined) patch.logoUrl = args.logoUrl;
    if (args.currency !== undefined) patch.currency = args.currency;
    if (args.country !== undefined) patch.country = args.country;
    if (args.notificationDefaults !== undefined) patch.notificationDefaults = args.notificationDefaults;
    if (args.trackingSettings !== undefined) patch.trackingSettings = args.trackingSettings;
    if (args.apiKey17Track !== undefined) patch.apiKey17Track = args.apiKey17Track;
    if (args.publicDomain !== undefined) patch.publicDomain = args.publicDomain;

    await ctx.db.patch(args.orgId, patch);
  },
});
