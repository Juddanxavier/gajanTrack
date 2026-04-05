import { v } from "convex/values";
import { internalMutation, internalQuery, internalAction } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { trackingAdapter } from "../tracking/router";

/**
 * Internal query to get a shipment by ID.
 */
export const internalGetShipment = internalQuery({
  args: { id: v.id("shipments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Internal query to list shipments by tracking number.
 */
export const listByTrackingNumberInternal = internalQuery({
  args: { 
      tracking_number: v.string(),
      carrier_code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("shipments")
      .withIndex("by_tracking_number", (q) => q.eq("tracking_number", args.tracking_number));
      
    const results = await q.collect();
    
    if (args.carrier_code) {
        return results.filter(s => s.carrier_code === args.carrier_code);
    }
    
    return results;
  },
});

/**
 * Internal mutation to update shipment status.
 */
export const internalUpdateShipmentStatus = internalMutation({
  args: {
    id: v.id("shipments"),
    status: v.string() as any,
    carrier_code: v.optional(v.string()),
    provider: v.optional(v.union(v.literal("trackingmore"), v.literal("track123"), v.literal("track17"))),
    estimated_delivery: v.optional(v.string()),
    last_synced_at: v.optional(v.number()),
    events_raw: v.optional(v.string()),
    provider_metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const shipment = await ctx.db.get(args.id);
    if (!shipment) throw new Error("Shipment not found");
    const oldStatus = shipment.status;
    const newStatus = args.status;

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      last_synced_at: updates.last_synced_at ?? Date.now(),
      provider_metadata: updates.provider_metadata || undefined
    });

    const milestones = ["info_received", "out_for_delivery", "delivered", "exception", "failed_attempt"];
    if (oldStatus !== newStatus && milestones.includes(newStatus)) {
        await ctx.scheduler.runAfter(0, internal.notifications.actions.sendStatusUpdate, {
            id: id,
            status: newStatus
        });
    }
  },
});

/**
 * Internal mutation to upsert tracking events.
 */
export const internalUpsertTrackingEvent = internalMutation({
  args: {
    shipment_id: v.id("shipments"),
    status: v.string(),
    sub_status: v.optional(v.string()),
    message: v.string(),
    location: v.optional(v.string()),
    occurred_at: v.number(),
    raw_payload: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    if (isNaN(args.occurred_at)) return null;

    const existing = await ctx.db
      .query("tracking_events")
      .withIndex("by_shipment_id", (q) => q.eq("shipment_id", args.shipment_id))
      .filter((q) => q.and(
          q.eq(q.field("occurred_at"), args.occurred_at),
          q.eq(q.field("message"), args.message)
      ))
      .first();

    if (existing) return existing._id;
    return await ctx.db.insert("tracking_events", {
      ...args,
      metadata: args.metadata || undefined
    });
  },
});

/**
 * Internal query to list active shipments for synchronization.
 */
export const internalListActive = internalQuery({
  handler: async (ctx) => {
    const THIRTY_MINS = 30 * 60 * 1000;
    const now = Date.now();
    return await ctx.db
      .query("shipments")
      .filter((q) => q.and(
        q.neq(q.field("status"), "delivered"),
        q.neq(q.field("status"), "expired"),
        q.eq(q.field("archived_at"), undefined),
        q.lt(q.field("last_synced_at"), now - THIRTY_MINS)
      ))
      .take(50);
  },
});

/**
 * Internal action to synchronize all active shipments.
 */
export const syncActiveShipments = internalAction({
  handler: async (ctx) => {
    const active = await ctx.runQuery(internal.shipments.internal.internalListActive);
    if (active.length === 0) return;

    for (const shipment of active) {
      await ctx.scheduler.runAfter(0, internal.shipments.internal.syncSingleShipment, {
        shipment_id: shipment._id,
      });
    }

    if (active.length === 50) { 
        await ctx.scheduler.runAfter(10000, internal.shipments.internal.syncActiveShipments);
    }
  },
});

/**
 * Internal action to synchronize a single shipment.
 */
export const syncSingleShipment = internalAction({
  args: { shipment_id: v.id("shipments") },
  handler: async (ctx, args) => {
    try {
      await ctx.runAction(api.shipments.actions.refreshShipment, {
        shipment_id: args.shipment_id,
        orgId: "internal" as any // Bypass RBAC if internal OR we need a better bypass
      });
    } catch (error) {
      console.error(`[SYNC:SINGLE] Failed to refresh ${args.shipment_id}:`, error);
    }
  },
});

/**
 * Internal query to list shipments scheduled for archiving.
 */
export const internalListShipmentsToArchive = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const fortyFiveDaysAgo = now - (45 * 24 * 60 * 60 * 1000);

    const deliveredToArchive = await ctx.db
      .query("shipments")
      .withIndex("by_status", (q) => q.eq("status", "delivered"))
      .filter((q) => q.and(
          q.eq(q.field("archived_at"), undefined),
          q.lt(q.field("last_synced_at"), thirtyDaysAgo)
      ))
      .collect();

    const exceptionsToArchive = await ctx.db
      .query("shipments")
      .withIndex("by_status", (q) => q.eq("status", "exception"))
      .filter((q) => q.and(
          q.eq(q.field("archived_at"), undefined),
          q.lt(q.field("last_synced_at"), fortyFiveDaysAgo)
      ))
      .collect();

    return [...deliveredToArchive, ...exceptionsToArchive];
  },
});

/**
 * Internal mutation to archive a shipment.
 */
export const internalArchiveShipment = internalMutation({
  args: { id: v.id("shipments") },
  handler: async (ctx, args) => {
    const TWO_YEARS = 2 * 365 * 24 * 60 * 60 * 1000;
    await ctx.db.patch(args.id, {
      archived_at: Date.now(),
      scheduled_for_deletion_at: Date.now() + TWO_YEARS,
    });
  },
});

/**
 * Internal action to process the archiving queue.
 */
export const processShipmentArchiving = internalAction({
  handler: async (ctx) => {
    const toArchive = await ctx.runQuery(internal.shipments.internal.internalListShipmentsToArchive);
    for (const shipment of (toArchive as any)) {
      await ctx.runMutation(internal.shipments.internal.internalArchiveShipment, { id: (shipment as any)._id });
    }
  },
});

/**
 * Internal mutation to clean up archived shipments scheduled for deletion.
 * Includes safety filters to prevent unintended data loss.
 */
export const cleanupArchivedShipments = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const toDelete = await ctx.db
      .query("shipments")
      .withIndex("by_scheduled_for_deletion_at", (q) => q.lt("scheduled_for_deletion_at", now))
      .filter((q) => q.and(
          q.neq(q.field("archived_at"), undefined), // SAFETY: Never delete unarchived
          q.neq(q.field("status"), "pending"),      // SAFETY: Never delete active shipments
          q.neq(q.field("status"), "in_transit"),
          q.neq(q.field("status"), "out_for_delivery")
      ))
      .take(100); // Prevent transaction timeouts

    if (toDelete.length > 0) {
        console.log(`[CLEANUP] Purging ${toDelete.length} archived shipments...`);
    }

    for (const shipment of toDelete) {
        // Cascade: Tracking Events
        const events = await ctx.db
            .query("tracking_events")
            .withIndex("by_shipment_id", (q) => q.eq("shipment_id", shipment._id))
            .collect();
        for (const event of events) await ctx.db.delete(event._id);

        // Cascade: Communication Logs
        const commLogs = await ctx.db
            .query("communication_logs")
            .withIndex("by_shipmentId", (q) => q.eq("shipmentId", shipment._id))
            .collect();
        for (const log of commLogs) await ctx.db.delete(log._id);

        await ctx.db.delete(shipment._id);
    }
    
    return toDelete.length;
  },
});
