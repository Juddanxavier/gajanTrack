import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireOrgMember } from "./rbac";
import { enrichShipmentWithCarrierName } from "./lib/shipments";

/**
 * Unified search query for shipments, users, and quotes.
 */
export const search = query({
  args: {
    query: v.string(),
    orgId: v.id("organizations"),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrgMember(ctx, args.orgId, args.sessionId);
    const searchStr = args.query.toLowerCase().trim();

    if (searchStr.length < 2) {
      return { shipments: [], users: [], quotes: [] };
    }

    // Search Shipments
    const shipments = await ctx.db
      .query("shipments")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();

    const filteredShipmentsRaw = shipments.filter((s) => 
      s.tracking_number.toLowerCase().includes(searchStr) ||
      (s.customer_name?.toLowerCase().includes(searchStr)) ||
      (s.customer_email?.toLowerCase().includes(searchStr)) ||
      (s.customer_phone?.toLowerCase().includes(searchStr))
    ).slice(0, 10);

    const filteredShipments = await Promise.all(
        filteredShipmentsRaw.map(s => enrichShipmentWithCarrierName(ctx, s))
    );

    // Search Users (if admin or staff)
    let filteredUsers: any[] = [];
    if (user.role === "admin" || user.role === "staff") {
      const users = await ctx.db
        .query("users")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect();
      
      filteredUsers = users.filter((u) => 
        u.name?.toLowerCase().includes(searchStr) ||
        u.email?.toLowerCase().includes(searchStr) ||
        u.phone?.toLowerCase().includes(searchStr)
      ).slice(0, 10);
    }

    // Search Quotes
    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();

    const filteredQuotes = quotes.filter((q) => 
      q.parcelDetails.description.toLowerCase().includes(searchStr) ||
      q.origin.city.toLowerCase().includes(searchStr) ||
      q.destination.city.toLowerCase().includes(searchStr)
    ).slice(0, 10);

    return {
      shipments: filteredShipments,
      users: filteredUsers,
      quotes: filteredQuotes,
    };
  },
});
