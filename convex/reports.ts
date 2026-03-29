import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireOrgRole } from "./rbac";

export const getReportData = query({
  args: {
    orgId: v.union(v.id("organizations"), v.string()),
    type: v.union(v.literal("shipments"), v.literal("quotes")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(v.string()),
    carrier: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.orgId, args.sessionId);

    if (args.type === "shipments") {
        let q = ctx.db
            .query("shipments")
            .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));
        
        const results = await q.collect();

        const filtered = results.filter(s => {
            if (args.startDate && s.created_at < args.startDate) return false;
            if (args.endDate && s.created_at > args.endDate) return false;
            if (args.status && s.status !== args.status) return false;
            if (args.carrier && s.carrier_code !== args.carrier) return false;
            return true;
        });

        // Enrich with carrier names for the report
        const enriched = await Promise.all(filtered.map(async (s) => {
            let carrier_name = s.carrier_code;
            if (s.provider === "track17" && !isNaN(Number(s.carrier_code))) {
                const carrier = await ctx.db
                    .query("carriers")
                    .withIndex("by_key", (q) => q.eq("key", Number(s.carrier_code)))
                    .unique();
                if (carrier) carrier_name = carrier.name;
            }
            return {
                ...s,
                carrier_name,
                created_at_human: new Date(s.created_at).toLocaleString(),
                last_synced_at_human: new Date(s.last_synced_at).toLocaleString(),
            };
        }));

        return enriched;
    } else {
        let q = ctx.db
            .query("quotes")
            .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));
        
        const results = await q.collect();

        const filtered = results.filter(q => {
            if (args.startDate && q.createdAt < args.startDate) return false;
            if (args.endDate && q.createdAt > args.endDate) return false;
            if (args.status && q.status !== args.status) return false;
            return true;
        });

        return filtered.map(q => ({
            ...q,
            createdAt_human: new Date(q.createdAt).toLocaleString(),
        }));
    }
  },
});
