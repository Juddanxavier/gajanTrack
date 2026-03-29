import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin, requireUser } from "./rbac";

/**
 * Get all settings for the current user and their active organization.
 */
export const getSettings = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.sessionId);
    
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
        apiKey17Track: organization.apiKey17Track, // Should ideally be redacted or only for admins
      } : null,
    };
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
    const { user } = await requireUser(ctx, args.sessionId);

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

/**
 * Update organization settings (Admin only).
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
    const { user } = await requireUser(ctx, args.sessionId);
    console.log(`[updateOrgSettings] User: ${user.name}, Role: ${user.role}, OrgId: ${user.orgId}`);
    
    // Admins can update any org, Staff can only update their own org
    if (user.role !== "admin") {
      if (user.role !== "staff") {
        console.error(`[updateOrgSettings] Forbidden: User ${user.name} is not admin or staff`);
        throw new Error("Forbidden: You do not have permission to update organization settings");
      }
      
      // Staff validation: Check if this is their org
      // We compare IDs as strings for robustness
      const userOrgIdStr = user.orgId?.toString();
      const targetOrgIdStr = args.orgId.toString();
      
      console.log(`[updateOrgSettings] Comparing UserOrgId: ${userOrgIdStr} with TargetOrgId: ${targetOrgIdStr}`);
      
      if (userOrgIdStr !== targetOrgIdStr) {
        // Fallback for slugs/externalIds stored in user.orgId
        const targetOrg = await ctx.db.get(args.orgId);
        if (!targetOrg || (user.orgId !== targetOrg.slug && user.orgId !== targetOrg.externalId)) {
          console.error(`[updateOrgSettings] Forbidden: User ${user.name} trying to update another org`);
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
