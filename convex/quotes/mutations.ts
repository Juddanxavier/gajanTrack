import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireOrgMember, requireOrgRole } from "../rbac";

/**
 * Create a new quote request.
 */
export const createQuote = mutation({
  args: {
    orgId: v.union(v.id("organizations"), v.string()),
    customerId: v.string(),
    origin: v.object({
      address: v.string(),
      city: v.string(),
    }),
    destination: v.object({
      address: v.string(),
      city: v.string(),
    }),
    parcelDetails: v.object({
      weightKg: v.number(),
      description: v.string(),
    }),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    const quoteId = await ctx.db.insert("quotes", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });

    // Notify admins/staff about new quote request
    await ctx.db.insert("admin_notifications", {
      orgId: args.orgId,
      type: "quote_created",
      title: "New Quote Request",
      message: `A new quote request has been submitted for ${args.origin.city} to ${args.destination.city}.`,
      link: `/quotes`,
      isRead: false,
      priority: "high",
      createdAt: Date.now(),
    });

    return quoteId;
  },
});

/**
 * Update quote status and details.
 */
export const updateQuoteStatus = mutation({
  args: {
    id: v.id("quotes"),
    orgId: v.union(v.id("organizations"), v.string()),
    status: v.union(
      v.literal("pending"), 
      v.literal("reviewing"), 
      v.literal("approved"), 
      v.literal("rejected")
    ),
    staffNotes: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.orgId, args.sessionId);
    
    const quote = await ctx.db.get(args.id);
    if (!quote || quote.orgId !== args.orgId) {
      throw new Error("Quote not found or access denied");
    }

    const { id, orgId, sessionId, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

/**
 * Archive a quote.
 */
export const archiveQuote = mutation({
  args: { id: v.id("quotes"), orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.orgId, args.sessionId);
    const quote = await ctx.db.get(args.id);
    if (!quote || quote.orgId !== args.orgId) {
      throw new Error("Quote not found or access denied");
    }

    await ctx.db.patch(args.id, {
      archivedTime: Date.now(),
    });
  },
});

/**
 * Soft delete a quote with 30-day retention.
 */
export const softDeleteQuote = mutation({
  args: { id: v.id("quotes"), orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.orgId, args.sessionId);
    const quote = await ctx.db.get(args.id);
    if (!quote || quote.orgId !== args.orgId) {
      throw new Error("Quote not found or access denied");
    }

    await ctx.db.patch(args.id, {
      deletionTime: Date.now() + (30 * 24 * 60 * 60 * 1000),
    });
  },
});

/**
 * Restore a soft-deleted or archived quote.
 */
export const restoreQuote = mutation({
  args: { id: v.id("quotes"), orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.orgId, args.sessionId);
    const quote = await ctx.db.get(args.id);
    if (!quote || quote.orgId !== args.orgId) {
      throw new Error("Quote not found or access denied");
    }

    await ctx.db.patch(args.id, {
      deletionTime: undefined,
      archivedTime: undefined,
    });
  },
});
