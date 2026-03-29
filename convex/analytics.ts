import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireOrgRole } from "./rbac";

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
        // "all" - we'll still use 30d for trends but lifetime for metrics
        days = 30;
        currentPeriodStart = 0;
        previousPeriodStart = -1; // Flag for no comparison
      }

      // 1. Fetch all relevant data for the organization
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

      // 2. Filter by Current and Previous Periods
      const currentShipments = timeRange === "all" ? allShipments : allShipments.filter(s => s.created_at >= currentPeriodStart);
      const previousShipments = previousPeriodStart > 0 ? allShipments.filter(s => s.created_at >= previousPeriodStart && s.created_at < currentPeriodStart) : [];

      const currentQuotes = timeRange === "all" ? allQuotes : allQuotes.filter(q => q.createdAt >= currentPeriodStart);
      const previousQuotes = previousPeriodStart > 0 ? allQuotes.filter(q => q.createdAt >= previousPeriodStart && q.createdAt < currentPeriodStart) : [];

      // 3. Aggregate Metrics
      const calculateMetrics = (shipments: any[], quotes: any[]) => {
        const total = shipments.length;
        const delivered = shipments.filter(s => s.status === "delivered").length;
        const inTransit = shipments.filter(s => s.status === "in_transit" || s.status === "out_for_delivery").length;
        const exceptions = shipments.filter(s => s.status === "exception" || s.status === "failed_attempt").length;
        const revenue = quotes.reduce((sum, q) => sum + (q.estimatedPrice || 0), 0);
        
        // Average Delivery Time (rough estimate using last_synced_at for delivered items)
        const deliveredItems = shipments.filter(s => s.status === "delivered");
        const totalDeliveryTime = deliveredItems.reduce((sum, s) => sum + (s.last_synced_at - s.created_at), 0);
        const avgDeliveryTimeDays = deliveredItems.length > 0 ? (totalDeliveryTime / deliveredItems.length) / (24 * 60 * 60 * 1000) : 0;

        return { total, delivered, inTransit, exceptions, revenue, avgDeliveryTimeDays };
      };

      const currentMetrics = calculateMetrics(currentShipments, currentQuotes);
      const previousMetrics = calculateMetrics(previousShipments, previousQuotes);

      // 4. Calculate Percentage Changes
      const calcChange = (current: number, previous: number) => {
        if (previous === 0 || previousPeriodStart === -1) return 0;
        return ((current - previous) / previous) * 100;
      };

      const changes = {
        total: calcChange(currentMetrics.total, previousMetrics.total),
        delivered: calcChange(currentMetrics.delivered, previousMetrics.delivered),
        revenue: calcChange(currentMetrics.revenue, previousMetrics.revenue),
        exceptions: calcChange(currentMetrics.exceptions, previousMetrics.exceptions),
      };

      // 5. Status Distribution (Always based on current selection or all)
      const statusDistribution = [
        { status: "Delivered", count: currentMetrics.delivered, fill: "var(--color-delivered)" },
        { status: "In Transit", count: currentMetrics.inTransit, fill: "var(--color-inTransit)" },
        { status: "Pending", count: currentShipments.filter(s => s.status === "pending" || s.status === "info_received").length, fill: "var(--color-pending)" },
        { status: "Exception", count: currentMetrics.exceptions, fill: "var(--color-exception)" },
      ];

      // 6. Trends (Daily breakdown for the selected period)
      // If "all", we show last 30 days
      const trendDays = timeRange === "all" ? 30 : days;
      const trendStart = timeRange === "all" ? now - 30 * 24 * 60 * 60 * 1000 : currentPeriodStart;
      
      const trends: Record<string, { total: number, delivered: number, revenue: number }> = {};
      for (let i = 0; i < trendDays; i++) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        trends[date] = { total: 0, delivered: 0, revenue: 0 };
      }

      allShipments.forEach(s => {
        if (s.created_at >= trendStart) {
          const date = new Date(s.created_at).toISOString().split('T')[0];
          if (trends[date] !== undefined) {
            trends[date].total++;
            if (s.status === "delivered") trends[date].delivered++;
          }
        }
      });

      allQuotes.forEach(q => {
        if (q.createdAt >= trendStart) {
          const date = new Date(q.createdAt).toISOString().split('T')[0];
          if (trends[date] !== undefined) {
            trends[date].revenue += (q.estimatedPrice || 0);
          }
        }
      });

      const shipmentTrends = Object.entries(trends)
        .map(([date, data]) => ({ date, count: data.total, delivered: data.delivered, revenue: data.revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 7. Sparkline Data (Last 7 points of the trend)
      const last7Points = shipmentTrends.slice(-7);
      const sparklines = {
        total: last7Points.map(d => ({ count: d.count })),
        delivered: last7Points.map(d => ({ count: d.delivered })),
        revenue: last7Points.map(d => ({ count: d.revenue })),
      };

      // 8. Carrier and Origin Usage (Top 5)
      const getTop = (data: any[], key: string, limit = 5) => {
        const counts: Record<string, number> = {};
        data.forEach(item => {
          const val = item[key] || "Unknown";
          counts[val] = (counts[val] || 0) + 1;
        });
        return Object.entries(counts)
          .map(([name, count]) => ({ [key === 'carrier_code' ? 'name' : 'country']: name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      };

      const carrierUsageRaw = getTop(currentShipments, 'carrier_code');
      const carrierUsage = await Promise.all(carrierUsageRaw.map(async (item) => {
        // Try to find the carrier name from our lookup table
        const carrierKey = parseInt(String(item.name));
        if (!isNaN(carrierKey)) {
          const carrier = await ctx.db
            .query("carriers")
            .withIndex("by_key", (q) => q.eq("key", carrierKey))
            .unique();
          if (carrier) {
            return { name: carrier.name, count: item.count };
          }
        }
        return { name: item.name, count: item.count };
      }));

      const originDistribution = getTop(currentShipments, 'origin_country');

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
        changes,
        sparklines,
        statusDistribution,
        shipmentTrends,
        carrierUsage,
        originDistribution,
        success: true
      };
    } catch (error: any) {
      console.error("Analytics Error:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch analytics"
      };
    }
  },
});
