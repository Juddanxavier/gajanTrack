import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireOrgMember, requireUser } from "../rbac";
import { enrichShipmentWithCarrierName } from "../lib/shipments";

/**
 * List all shipments for an organization.
 */
export const listShipments = query({
  args: { 
    orgId: v.id("organizations"),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
    userId: v.optional(v.string()), 
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    try {
      let q = ctx.db
        .query("shipments")
        .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));

      if (args.userId) {
        q = ctx.db
            .query("shipments")
            .withIndex("by_user_id", (q) => q.eq("userId", args.userId!));
      }

      const shipments = await q.order("desc").collect();
      const includeArchived = args.includeArchived ?? false;

      const filtered = shipments.filter(s => {
        if (!includeArchived && s.archived_at !== undefined) return false;
        if (includeArchived && s.archived_at === undefined) return false;
        if (args.status && s.status !== args.status) return false;
        if (args.search && !s.tracking_number.toLowerCase().includes(args.search.toLowerCase())) return false;
        return true;
      });

      return await Promise.all(filtered.map(s => enrichShipmentWithCarrierName(ctx, s)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error in listShipments:", error);
      throw new Error(`Failed to list shipments: ${message}`);
    }
  },
});

/**
 * Get a single shipment by ID (RBAC enforced).
 */
export const getShipment = query({
  args: { 
    id: v.id("shipments"), 
    orgId: v.optional(v.union(v.id("organizations"), v.string())), 
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    let user: any = null;
    if (args.orgId !== "internal") {
        const result = await requireUser(ctx, args.sessionId);
        user = result.user;
    }
    const shipment = await ctx.db.get(args.id);
    if (!shipment) return null;

    if (args.orgId === "internal") return { ...shipment, events: await ctx.db.query("tracking_events").withIndex("by_shipment_id_occurred_at", q => q.eq("shipment_id", args.id)).order("desc").collect() };

    const isAdmin = user?.role === "admin";
    const isOwnerOrg = shipment.orgId === args.orgId;
    const isUserInOrg = user?.role === "staff" && user.orgId === shipment.orgId;
    
    if (!(isAdmin || isUserInOrg || (user?.role !== "staff" && isOwnerOrg))) return null;

    const events = await ctx.db
      .query("tracking_events")
      .withIndex("by_shipment_id_occurred_at", (q) => q.eq("shipment_id", args.id))
      .order("desc")
      .collect();

    const enriched = await enrichShipmentWithCarrierName(ctx, shipment);
    return { ...enriched, events };
  },
});

/**
 * Get a shipment by its tracking number.
 */
export const getShipmentByTrackingNumber = query({
  args: { tracking_number: v.string() },
  handler: async (ctx, args) => {
    const shipment = await ctx.db
      .query("shipments")
      .withIndex("by_tracking_number", (q) => q.eq("tracking_number", args.tracking_number))
      .unique();

    if (!shipment) return null;

    const events = await ctx.db
      .query("tracking_events")
      .withIndex("by_shipment_id_occurred_at", (q) => q.eq("shipment_id", shipment._id))
      .order("desc")
      .collect();

    const enriched = await enrichShipmentWithCarrierName(ctx, shipment);
    return { ...enriched, events };
  },
});

/**
 * Check if a tracking number exists in an organization.
 */
export const checkTrackingExists = query({
  args: { 
    tracking_number: v.string(), 
    orgId: v.union(v.id("organizations"), v.string()), 
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("shipments")
      .withIndex("by_org_id_tracking_number", (q) => 
        q.eq("orgId", args.orgId as any).eq("tracking_number", args.tracking_number.trim())
      )
      .unique();
    return !!existing;
  },
});

/**
 * Get a shipment by its white label code.
 */
export const getShipmentByWhiteLabelCode = query({
  args: { white_label_code: v.string() },
  handler: async (ctx, args) => {
    const shipment = await ctx.db
      .query("shipments")
      .withIndex("by_white_label_code", (q) => q.eq("white_label_code", args.white_label_code))
      .unique();

    if (!shipment) return null;

    const events = await ctx.db
      .query("tracking_events")
      .withIndex("by_shipment_id_occurred_at", (q) => q.eq("shipment_id", shipment._id))
      .order("desc")
      .collect();

    return { ...shipment, events };
  },
});

/**
 * Get shipment statistics for an organization.
 */
export const getShipmentStats = query({
  args: { 
    orgId: v.union(v.id("organizations"), v.string()), 
    userId: v.optional(v.string()), 
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    let q = ctx.db
      .query('shipments')
      .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId));
    
    if (args.userId) {
      q = q.filter((q) => q.eq(q.field('userId'), args.userId));
    }

    const shipments = await q.collect();
    const activeShipments = shipments.filter(s => !s.archived_at);

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const trendStart = now - SEVEN_DAYS_MS;
    
    const trendMap: Record<string, { total: number, in_transit: number, out_for_delivery: number, delivered: number }> = {};
    for (let i = 0; i < 7; i++) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        trendMap[date] = { total: 0, in_transit: 0, out_for_delivery: 0, delivered: 0 };
    }

    shipments.forEach(s => {
        if (s.created_at >= trendStart) {
            const date = new Date(s.created_at).toISOString().split('T')[0];
            if (trendMap[date]) {
                trendMap[date].total++;
                if (s.status === 'in_transit') trendMap[date].in_transit++;
                if (s.status === 'out_for_delivery') trendMap[date].out_for_delivery++;
                if (s.status === 'delivered') trendMap[date].delivered++;
            }
        }
    });

    const sparklines = Object.entries(trendMap)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: activeShipments.length,
      in_transit: activeShipments.filter(s => s.status === 'in_transit').length,
      out_for_delivery: activeShipments.filter(s => s.status === 'out_for_delivery').length,
      delivered: activeShipments.filter(s => s.status === 'delivered').length,
      sparklines: {
        total: sparklines.map(s => ({ count: s.total })),
        in_transit: sparklines.map(s => ({ count: s.in_transit })),
        out_for_delivery: sparklines.map(s => ({ count: s.out_for_delivery })),
        delivered: sparklines.map(s => ({ count: s.delivered })),
      }
    };
  },
});

/**
 * Get detailed analytics for shipments.
 */
export const getDetailedAnalytics = query({
  args: { 
    orgId: v.union(v.id("organizations"), v.string()), 
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    
    const shipments = await ctx.db
      .query("shipments")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();

    const now = Date.now();
    const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000);
    
    const statusCounts: Record<string, number> = {};
    const carrierCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const monthlyTrend: Record<string, number> = {};

    shipments.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      const carrier = s.carrier_code || "unknown";
      carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
      const country = s.origin_country || "Unknown";
      countryCounts[country] = (countryCounts[country] || 0) + 1;
      
      if (s.created_at > sixMonthsAgo) {
        const date = new Date(s.created_at);
        const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyTrend[monthYear] = (monthlyTrend[monthYear] || 0) + 1;
      }
    });

    return {
      statusData: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      carrierData: Object.entries(carrierCounts).map(([name, value]) => ({ name, value })),
      countryData: Object.entries(countryCounts).map(([name, value]) => ({ name, value })),
      trendData: Object.entries(monthlyTrend)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
            const [aM, aY] = a.name.split(' ');
            const [bM, bY] = b.name.split(' ');
            return new Date(`${aM} 01, 20${aY}`).getTime() - new Date(`${bM} 01, 20${bY}`).getTime();
        }),
      totalCount: shipments.length,
    };
  },
});
