import { mutation, query, internalMutation, action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";

import { Track17Provider } from "./tracking/track17";

export const checkEnv = query({
  handler: async (ctx) => {
    return {
      TRACK17: !!process.env.TRACK17_API_KEY,
      TRACK123: !!process.env.TRACK123_API_KEY,
      TRACKINGMORE: !!process.env.TRACKINGMORE_API_KEY,
      PRIMARY: process.env.PRIMARY_TRACKING_PROVIDER,
      MSG91: !!process.env.MSG91_AUTH_KEY,
    };
  },
});

export const testErrorTrace = action({
  args: { trackingNumber: v.string(), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    try {
        await ctx.runMutation(internal.shipments.internalCreateShipment, {
            orgId: args.orgId,
            tracking_number: args.trackingNumber,
            carrier_code: "dhl",
            provider: "track17",
            status: "pending",
            events_raw: "[]",
        });
        return { success: true };
    } catch (e: any) {
        return { 
            success: false, 
            message: e.message, 
            data: e.data,
            name: e.constructor?.name || typeof e,
            isConvexError: e instanceof ConvexError

        };
    }
  },
});
export const listOrgsDebug = query({
  handler: async (ctx) => {
    return await ctx.db.query("organizations").collect();
  },
});

export const dbCheck = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      return {
        authenticated: false,
        reason: "No Clerk identity found in Convex. This usually means the JWT was rejected or the domain in auth.config.ts is wrong.",
        configDomain: "https://humble-pika-41.clerk.accounts.dev",
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    return {
      authenticated: true,
      clerkId: identity.subject,
      clerkEmail: identity.email,
      hasUserRecord: !!user,
      userRole: user?.role,
      userOrgId: user?.orgId,
      fullIdentity: identity,
    };
  },
});

export const shipmentAudit = query({
  args: {},
  handler: async (ctx) => {
    const allShipments = await ctx.db.query("shipments").collect();
    const now = Date.now();
    
    return allShipments.map(s => ({
      id: s._id,
      tracking: s.tracking_number,
      status: s.status,
      provider: s.provider,
      archived: !!s.archived_at,
      scheduledDeletion: s.scheduled_for_deletion_at,
      isExpired: s.scheduled_for_deletion_at ? s.scheduled_for_deletion_at < now : false,
      lastSynced: s.last_synced_at ? new Date(s.last_synced_at).toISOString() : "NEVER",
    }));
  },
});

export const fixShipmentCounters = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Get all organizations to create a mapping: externalId -> ConvexId
    const orgs = await ctx.db.query("organizations").collect();
    const orgMap = new Map(orgs.map(o => [o.externalId || o.slug, o._id]));

    // 2. Get all shipment counters
    const counters = await ctx.db.query("shipment_counters").collect();
    
    let fixedCount = 0;
    for (const counter of counters) {
      const currentOrgId = (counter as any).orgId;
      
      // If it's a string, we need to fix it
      if (typeof currentOrgId === "string") {
        const convexId = orgMap.get(currentOrgId);
        if (convexId) {
          await ctx.db.patch(counter._id, { orgId: convexId });
          fixedCount++;
        } else {
          console.warn(`[FIX] Could not find organization for Clerk ID: ${currentOrgId}`);
        }
      }
    }

    return { processed: counters.length, fixed: fixedCount };
  },
});

export const internalSeedShipments = internalMutation({
  args: { count: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const orgs = await ctx.db.query("organizations").collect();
    if (orgs.length === 0) throw new Error("No organizations found");

    const count = args.count || 5;
    const now = Date.now();
    let total = 0;

    for (const org of orgs) {
      for (let i = 0; i < count; i++) {
        const tracking = `TEST${Math.floor(100000 + Math.random() * 900000)}`;
        await ctx.db.insert("shipments", {
          orgId: org._id,
          tracking_number: tracking,
          carrier_code: "dhl",
          provider: "track17",
          status: "in_transit",
          customer_name: `Test Customer ${i + 1}`,
          customer_email: `test${i + 1}@example.com`,
          last_synced_at: now,
          created_at: now,
          events_raw: "[]",
        });
        total++;
      }
    }
    return { orgs: orgs.length, totalCreated: total };
  },
});

export const checkShipmentsForDeletion = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const fortyFiveDaysAgo = now - (45 * 24 * 60 * 60 * 1000);
    const MIN_VALID_TIME = new Date("2024-01-01").getTime();

    // 1. Check for shipments that should be archived
    const allShipments = await ctx.db.query("shipments").collect();
    const toArchiveCandidate = allShipments.filter(s => 
        !s.archived_at && 
        ((s.status === "delivered" && s.last_synced_at < thirtyDaysAgo) ||
         (s.status === "exception" && s.last_synced_at < fortyFiveDaysAgo))
    );

    // 2. Check for shipments that would be deleted by cleanup job
    const allArchived = allShipments.filter(s => !!s.archived_at);
    const toDeleteCandidate = allArchived.filter(s => 
        s.scheduled_for_deletion_at !== undefined && 
        s.scheduled_for_deletion_at < now
    );

    const safetyShieldViolations = toDeleteCandidate.filter(s => 
        s.scheduled_for_deletion_at !== undefined && 
        s.scheduled_for_deletion_at < MIN_VALID_TIME
    );

    return {
        currentTime: new Date(now).toISOString(),
        archiveCandidates: toArchiveCandidate.map(s => ({
            id: s._id,
            tracking: s.tracking_number,
            status: s.status,
            lastSynced: new Date(s.last_synced_at).toISOString(),
            reason: "Past archiving threshold"
        })),
        deletionCandidates: toDeleteCandidate.map(s => ({
            id: s._id,
            tracking: s.tracking_number,
            scheduledFor: new Date(s.scheduled_for_deletion_at!).toISOString(),
            isSafetyViolation: s.scheduled_for_deletion_at! < MIN_VALID_TIME,
            action: s.scheduled_for_deletion_at! < MIN_VALID_TIME ? "BLOCKED BY SAFETY SHIELD" : "WOULD BE DELETED"
        })),
        stats: {
            total: allShipments.length,
            archived: allArchived.length,
            active: allShipments.length - allArchived.length,
            violations: safetyShieldViolations.length
        }
    };
  },
});
export const testTrack17Registration = action({
  args: { trackingNumber: v.string(), carrierCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const provider = new Track17Provider();
    console.log(`[DEBUG:testTrack17Registration] Starting test for ${args.trackingNumber}...`);
    try {
        const result = await provider.createTracking(args.trackingNumber, args.carrierCode);
        return { success: true, result };
    } catch (e: any) {
        console.error(`[DEBUG:testTrack17Registration] FAILED:`, e.message);
        return { success: false, error: e.message };
    }
  },
});

export const countCarriers = query({
  args: {},
  handler: async (ctx) => {
    const carriers = await ctx.db.query("carriers").collect();
    return carriers.length;
  },
});

export const testTrack17Hardcoded = action({
  args: {},
  handler: async (ctx) => {
    const provider = new Track17Provider();
    const testNumber = "GT97955920"; 
    console.log(`[DEBUG:testTrack17Hardcoded] Starting hardcoded test for ${testNumber}...`);
    try {
        const result = await provider.createTracking(testNumber);
        return { success: true, result };
    } catch (e: any) {
        console.error(`[DEBUG:testTrack17Hardcoded] FAILED:`, e.message);
        return { success: false, error: e.message };
    }
  },
});

export const internalBatchInsertCarriers = internalMutation({
  args: { 
    carriers: v.array(v.object({
        key: v.number(),
        name: v.string(),
        name_zh: v.optional(v.string()),
        country_iso: v.optional(v.string()),
        url: v.optional(v.string()),
        tel: v.optional(v.string()),
    }))
  },
  handler: async (ctx, args) => {
    for (const c of args.carriers) {
        // Check if exists
        const existing = await ctx.db
            .query("carriers")
            .withIndex("by_key", q => q.eq("key", c.key))
            .unique();
        
        if (existing) {
            await ctx.db.patch(existing._id, {
                name: c.name,
                name_zh: c.name_zh,
                country_iso: c.country_iso,
                url: c.url,
                tel: c.tel,
            });
        } else {
            await ctx.db.insert("carriers", {
                ...c,
                provider: "track17"
            });
        }
    }
  }
});
export const seedCarriers = action({
  args: {},
  handler: async (ctx) => {
    const URL = "https://res.17track.net/asset/carrier/info/apicarrier.all.json";
    const response = await fetch(URL);
    const text = await response.text();
    const data = JSON.parse(text) as any[];
    console.log(`[DEBUG:seedCarriers] Parsed JSON. Found ${data.length} total.`);
    
    // Chunk into 100s for final run
    const chunkSize = 100;
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize).map(c => ({
            key: Number(c.key),
            name: String(c._name || "Unknown"),
            name_zh: c["_name_zh-cn"] ? String(c["_name_zh-cn"]) : undefined,
            country_iso: c._country_iso ? String(c._country_iso) : undefined,
            url: c._url ? String(c._url) : undefined,
            tel: c._tel ? String(c._tel) : undefined
        }));
        
        await ctx.runMutation(internal.debug.internalBatchInsertCarriers, { carriers: chunk });
        console.log(`[DEBUG:seedCarriers] Progress: ${i + chunk.length}/${data.length}`);
    }
    
    return { total: data.length };
  }
});

