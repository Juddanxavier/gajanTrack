import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

export const logCommunication = internalMutation({
  args: {
    shipmentId: v.id("shipments"),
    type: v.union(v.literal("whatsapp"), v.literal("email")),
    recipient: v.string(),
    content: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("communication_logs", {
      ...args,
      sentAt: Date.now(),
    });
  },
});

export const getShipmentLogs = query({
  args: {
    shipmentId: v.id("shipments"),
    orgId: v.string(), // For RBAC
    sessionId: v.optional(v.string()), 
  },
  handler: async (ctx, args) => {
    // Basic RBAC: check if shipment exists and belongs to org
    const shipment = await ctx.db.get(args.shipmentId);
    if (!shipment || shipment.orgId !== args.orgId) {
      return [];
    }

    return await ctx.db
      .query("communication_logs")
      .withIndex("by_shipmentId", (q) => q.eq("shipmentId", args.shipmentId))
      .order("desc")
      .collect();
  },
});

/**
 * Internal mutation to clean up old communication logs.
 * Deletes logs older than 30 days.
 */
export const cleanupCommunicationLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const thirtyDaysAgo = now - THIRTY_DAYS_MS;

    const toDelete = await ctx.db
      .query("communication_logs")
      .withIndex("by_sentAt", (q) => q.lt("sentAt", thirtyDaysAgo))
      .take(100);

    let count = 0;
    for (const log of toDelete) {
      await ctx.db.delete(log._id);
      count++;
    }

    if (count > 0) {
      console.log(`[CLEANUP] Deleted ${count} old communication logs.`);
    }

    return count;
  },
});

/**
 * Checks if a notification with a specific content/status 
 * was already sent for a shipment.
 */
export const checkAlreadySent = internalQuery({
  args: {
    shipmentId: v.id("shipments"),
    type: v.union(v.literal("whatsapp"), v.literal("email")),
    content: v.string(), // status update name
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("communication_logs")
      .withIndex("by_shipmentId", (q) => q.eq("shipmentId", args.shipmentId))
      .filter((q) => 
        q.and(
          q.eq(q.field("type"), args.type),
          q.eq(q.field("content"), args.content),
          q.eq(q.field("status"), "sent")
        )
      )
      .first();

    return !!existing;
  },
});

/**
 * Checks if the number of messages sent to a recipient
 * in the last X minutes exceeds the limit.
 */
export const checkRateLimit = internalQuery({
  args: {
    recipient: v.string(),
    minutes: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const threshold = Date.now() - (args.minutes * 60 * 1000);
    
    const recentMessages = await ctx.db
      .query("communication_logs")
      .withIndex("by_sentAt", (q) => q.gt("sentAt", threshold))
      .filter((q) => q.eq(q.field("recipient"), args.recipient))
      .collect();

    return recentMessages.length >= args.limit;
  },
});
