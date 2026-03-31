import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireOrgRole } from "../rbac";

export const getAnalytics = query({
  args: { 
    orgId: v.union(v.id("organizations"), v.string()), 
    sessionId: v.optional(v.string()),
    timeRange: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"), v.literal("all")))
  },
  handler: async (ctx, args) => {
    try {
      await requireOrgRole(ctx, args.orgId, args.sessionId);

      const timeRange = args.timeRange || "30d";
      const now = Date.now();
      
      let currentPeriodStart = 0;
      let previousPeriodStart = 0;
      let days = 30;

      if (timeRange === "7d") {
        days = 7;
        currentPeriodStart = now - 7 * 24 * 60 * 60 * 1000;
        previousPeriodStart = now - 14 * 24 * 60 * 60 * 1000;
      } else if (timeRange === "30d") {
        days = 30;
        currentPeriodStart = now - 30 * 24 * 60 * 60 * 1000;
        previousPeriodStart = now - 60 * 24 * 60 * 60 * 1000;
      } else if (timeRange === "90d") {
        days = 90;
        currentPeriodStart = now - 90 * 24 * 60 * 60 * 1000;
        previousPeriodStart = now - 180 * 24 * 60 * 60 * 1000;
      } else {
        days = 30;
        currentPeriodStart = 0;
        previousPeriodStart = -1;
      }

      let org: any;
      if (typeof args.orgId === "string") {
        org = await ctx.db.query("organizations").withIndex("by_slug", q => q.eq("slug", args.orgId as string)).unique();
        if (!org) org = await ctx.db.query("organizations").withIndex("by_externalId", q => q.eq("externalId", args.orgId as string)).unique();
      } else {
        org = await ctx.db.get(args.orgId as any);
      }
      const currency = org?.currency || "INR";

      const allShipments = await ctx.db
        .query("shipments")
        .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
        .collect();

      const allQuotes = await ctx.db
        .query("quotes")
        .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.eq(q.field("status"), "approved"))
        .collect();

      const currentShipments = timeRange === "all" ? allShipments : allShipments.filter(s => s.created_at >= currentPeriodStart);
      const previousShipments = previousPeriodStart > 0 ? allShipments.filter(s => s.created_at >= previousPeriodStart && s.created_at < currentPeriodStart) : [];

      const currentQuotes = timeRange === "all" ? allQuotes : allQuotes.filter(q => q.createdAt >= currentPeriodStart);
      const previousQuotes = previousPeriodStart > 0 ? allQuotes.filter(q => q.createdAt >= previousPeriodStart && q.createdAt < currentPeriodStart) : [];

      const calculateMetrics = (shipments: any[], quotes: any[]) => {
        const total = shipments.length;
        const delivered = shipments.filter(s => s.status === "delivered").length;
        const inTransit = shipments.filter(s => s.status === "in_transit" || s.status === "out_for_delivery").length;
        const exceptions = shipments.filter(s => s.status === "exception" || s.status === "failed_attempt").length;
        const revenue = quotes.reduce((sum, q) => sum + (q.estimatedPrice || 0), 0);
        
        const deliveredItems = shipments.filter(s => s.status === "delivered");
        const totalDeliveryTime = deliveredItems.reduce((sum, s) => sum + (s.last_synced_at - s.created_at), 0);
        const avgDeliveryTimeDays = deliveredItems.length > 0 ? (totalDeliveryTime / deliveredItems.length) / (24 * 60 * 60 * 1000) : 0;

        return { total, delivered, inTransit, exceptions, revenue, avgDeliveryTimeDays };
      };

      const currentMetrics = calculateMetrics(currentShipments, currentQuotes);
      const previousMetrics = calculateMetrics(previousShipments, previousQuotes);

      const calcChange = (current: number, previous: number) => {
        if (previous === 0 || previousPeriodStart === -1) return 0;
        return ((current - previous) / previous) * 100;
      };

      const shipmentTrends = Object.entries(
        allShipments.reduce((acc: any, s) => {
          if (s.created_at >= (timeRange === "all" ? now - 30 * 24 * 60 * 60 * 1000 : currentPeriodStart)) {
            const date = new Date(s.created_at).toISOString().split('T')[0];
            if (!acc[date]) acc[date] = { total: 0, delivered: 0, revenue: 0 };
            acc[date].total++;
            if (s.status === "delivered") acc[date].delivered++;
            
            // Link revenue from quotes if possible, though here we just track volume
          }
          return acc;
        }, {})
      ).map(([date, data]: [string, any]) => ({ 
        date, 
        count: data.total, 
        delivered: data.delivered, 
        revenue: data.revenue 
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Helper to map carrier codes to names
      const allCarriers = await ctx.db.query("carriers").collect();
      const carrierMap = new Map();
      allCarriers.forEach(c => {
        carrierMap.set(c.key.toString(), c.name);
        carrierMap.set(c.name.toLowerCase(), c.name);
      });

      const getCarrierName = (code: string) => {
        if (!code) return "Unknown";
        return carrierMap.get(code) || carrierMap.get(code.toLowerCase()) || code;
      };

      // Carrier Usage (Top 5)
      const carrierUsageMap = currentShipments.reduce((acc: any, s) => {
        const carrier = getCarrierName(s.carrier_code);
        acc[carrier] = (acc[carrier] || 0) + 1;
        return acc;
      }, {});
      const carrierUsage = Object.entries(carrierUsageMap)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Origin Distribution (Top 5 Countries)
      const originDistributionMap = currentShipments.reduce((acc: any, s) => {
        const country = s.origin_country || "Unknown";
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});
      const originDistribution = Object.entries(originDistributionMap)
        .map(([country, count]) => ({ country, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        metrics: {
          totalShipments: currentMetrics.total,
          deliveredCount: currentMetrics.delivered,
          inTransitCount: currentMetrics.inTransit,
          exceptionCount: currentMetrics.exceptions,
          totalRevenue: currentMetrics.revenue,
          avgDeliveryTimeDays: currentMetrics.avgDeliveryTimeDays,
          currency,
        },
        changes: {
          total: calcChange(currentMetrics.total, previousMetrics.total),
          delivered: calcChange(currentMetrics.delivered, previousMetrics.delivered),
          revenue: calcChange(currentMetrics.revenue, previousMetrics.revenue),
          exceptions: calcChange(currentMetrics.exceptions, previousMetrics.exceptions),
        },
        sparklines: {
          total: shipmentTrends.slice(-7).map(d => ({ count: d.count })),
          delivered: shipmentTrends.slice(-7).map(d => ({ count: d.delivered })),
          revenue: shipmentTrends.slice(-7).map(d => ({ count: d.revenue })),
        },
        statusDistribution: [
          { status: "Delivered", count: currentMetrics.delivered, fill: "var(--color-delivered)" },
          { status: "In Transit", count: currentMetrics.inTransit, fill: "var(--color-inTransit)" },
          { status: "Pending", count: currentShipments.filter(s => s.status === "pending" || s.status === "info_received").length, fill: "var(--color-pending)" },
          { status: "Exception", count: currentMetrics.exceptions, fill: "var(--color-exception)" },
        ],
        shipmentTrends,
        carrierUsage,
        originDistribution,
        success: true
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});
