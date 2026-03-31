import { v } from "convex/values";
import { query } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { requireOrgMember, requireOrgRole } from "../rbac";

/**
 * List all quotes for an organization.
 */
export const listQuotes = query({
  args: { orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);

    return await ctx.db
      .query("quotes")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletionTime"), undefined))
      .filter((q) => q.eq(q.field("archivedTime"), undefined))
      .order("desc")
      .collect();
  },
});

/**
 * Get recent quotes for the dashboard.
 */
export const getRecentQuotes = query({
  args: { orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    return await ctx.db
      .query("quotes")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletionTime"), undefined))
      .filter((q) => q.eq(q.field("archivedTime"), undefined))
      .order("desc")
      .take(5);
  },
});

/**
 * Get a single quote by ID.
 */
export const getQuote = query({
  args: { id: v.id("quotes"), orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    const quote = await ctx.db.get(args.id);
    if (!quote || quote.orgId !== args.orgId) {
      throw new Error("Quote not found or access denied");
    }
    return quote;
  },
});

/**
 * Get administrative statistics for quotes.
 */
export const getAdminStats = query({
  args: { orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      await requireOrgRole(ctx, args.orgId, args.sessionId);
      
      let org: Doc<"organizations"> | null;
      if (typeof args.orgId === "string") {
        org = await ctx.db.query("organizations").withIndex("by_slug", q => q.eq("slug", args.orgId as string)).unique();
        if (!org) org = await ctx.db.query("organizations").withIndex("by_externalId", q => q.eq("externalId", args.orgId as string)).unique();
      } else {
        org = await ctx.db.get(args.orgId as Id<"organizations">);
      }
      
      const currency = org?.currency || "INR";
      
      const quotes = await ctx.db
        .query("quotes")
        .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.eq(q.field("deletionTime"), undefined))
        .filter((q) => q.eq(q.field("archivedTime"), undefined))
        .collect();
      
      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const trendStart = now - SEVEN_DAYS_MS;
      
      const trendMap: Record<string, { total: number, pending: number, approved: number, rejected: number, revenue: number }> = {};
      for (let i = 0; i < 7; i++) {
          const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          trendMap[date] = { total: 0, pending: 0, approved: 0, rejected: 0, revenue: 0 };
      }

      quotes.forEach(q => {
          if (q.createdAt >= trendStart) {
              const date = new Date(q.createdAt).toISOString().split('T')[0];
              if (trendMap[date]) {
                  trendMap[date].total++;
                  if (q.status === 'pending') trendMap[date].pending++;
                  if (q.status === 'approved') {
                    trendMap[date].approved++;
                    trendMap[date].revenue += (q.estimatedPrice || 0);
                  }
                  if (q.status === 'rejected') trendMap[date].rejected++;
              }
          }
      });

      const sparklines = Object.entries(trendMap)
          .map(([date, counts]) => ({ date, ...counts }))
          .sort((a, b) => a.date.localeCompare(b.date));
      
      return {
        totalQuotes: quotes.length,
        pendingQuotes: quotes.filter(q => q.status === "pending").length,
        reviewingQuotes: quotes.filter(q => q.status === "reviewing").length,
        approvedQuotes: quotes.filter(q => q.status === "approved").length,
        rejectedQuotes: quotes.filter(q => q.status === "rejected").length,
        revenue: (quotes as any[])
          .filter(q => q.status === "approved")
          .reduce((sum, q) => sum + (q.estimatedPrice || 0), 0),
        currency,
        sparklines: {
          total: sparklines.map(s => ({ count: s.total })),
          pending: sparklines.map(s => ({ count: s.pending })),
          approved: sparklines.map(s => ({ count: s.approved })),
          rejected: sparklines.map(s => ({ count: s.rejected })),
          revenue: sparklines.map(s => ({ count: s.revenue })),
        },
        success: true
      };
    } catch (err: any) {
      console.error("getAdminStats Error:", err.message || err);
      return {
        totalQuotes: 0,
        pendingQuotes: 0,
        reviewingQuotes: 0,
        approvedQuotes: 0,
        rejectedQuotes: 0,
        revenue: 0,
        currency: "INR",
        error: err.message || "Internal Server Error",
        success: false
      };
    }
  },
});
