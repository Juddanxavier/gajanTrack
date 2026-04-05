import { v, ConvexError } from "convex/values";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireOrgMember, requireOrgRole } from "../rbac";
import { getNextWhiteLabelCode } from "../lib/shipments";

/**
 * Mutation to create a shipment.
 */
/**
 * Internal helper to create a shipment.
 */
async function createShipmentInternal(ctx: any, args: any) {
  await requireOrgMember(ctx, args.orgId, args.sessionId);
  
  const existing = await ctx.db
    .query("shipments")
    .withIndex("by_org_id_tracking_number", (q: any) => 
      q.eq("orgId", args.orgId).eq("tracking_number", args.tracking_number)
    )
    .unique();
  
  if (existing) {
      throw new ConvexError(`Shipment with tracking number "${args.tracking_number}" is already active in your organization.`);
  }

  let white_label_code = undefined;
  if (args.origin_country) {
    white_label_code = await getNextWhiteLabelCode(ctx, args.origin_country);
  }

  const { sessionId, ...shipmentData } = args;
  const shipment_id = await ctx.db.insert("shipments", {
    ...shipmentData,
    last_synced_at: Date.now(),
    created_at: Date.now(),
    white_label_code,
  });

  // Milestone Trigger
  const milestones = ["info_received", "out_for_delivery", "delivered", "exception", "failed_attempt"];
  if (args.status && milestones.includes(args.status)) {
      await ctx.scheduler.runAfter(0, internal.notifications.actions.sendStatusUpdate, {
          id: shipment_id,
          status: args.status
      });
  }

  return shipment_id;
}

export const createShipment = mutation({
  args: {
    orgId: v.union(v.id("organizations"), v.string()),
    tracking_number: v.string(),
    carrier_code: v.string(),
    provider: v.union(v.literal("trackingmore"), v.literal("track123"), v.literal("track17")),
    status: v.union(
      v.literal("pending"),
      v.literal("info_received"),
      v.literal("in_transit"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("failed_attempt"),
      v.literal("exception"),
      v.literal("expired")
    ),
    customer_name: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    notification_preferences: v.optional(
      v.object({
        email: v.boolean(),
        whatsapp: v.boolean(),
      })
    ),
    userId: v.optional(v.string()),
    estimated_delivery: v.optional(v.string()),
    events_raw: v.string(),
    origin_country: v.optional(v.string()),
    provider_metadata: v.optional(v.any()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await createShipmentInternal(ctx, args);
  },
});

/**
 * mutation to update shipment status and metadata.
 */
export const updateShipmentStatus = mutation({
  args: {
    id: v.id("shipments"),
    orgId: v.union(v.id("organizations"), v.string()),
    status: v.string() as any, // v.string() is safer than literals for complex updates, but still typed
    carrier_code: v.optional(v.string()),
    estimated_delivery: v.optional(v.string()),
    last_synced_at: v.optional(v.number()),
    events_raw: v.optional(v.string()),
    provider_metadata: v.optional(v.any()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.orgId, args.sessionId);
    const shipment = await ctx.db.get(args.id);
    if (!shipment) throw new Error("Shipment not found");
    
    const oldStatus = shipment.status;
    const newStatus = args.status;

    const { id, orgId, sessionId, ...updates } = args;
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

        if (["exception", "failed_attempt"].includes(newStatus)) {
            await ctx.db.insert("admin_notifications", {
                orgId: args.orgId,
                type: "status_critical",
                title: `Critical Alert: ${newStatus.toUpperCase()}`,
                message: `Shipment ${shipment.tracking_number} encountered a: ${newStatus}`,
                link: `/dashboard/shipments`,
                isRead: false,
                priority: "high",
                createdAt: Date.now(),
            });
        }
    }
  },
});

/**
 * Mutation for administrative shipment updates.
 */
export const updateShipment = mutation({
  args: {
    id: v.id("shipments"),
    orgId: v.union(v.id("organizations"), v.string()),
    customer_name: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    notification_preferences: v.optional(
      v.object({
        email: v.boolean(),
        whatsapp: v.boolean(),
      })
    ),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.orgId, args.sessionId);
    const { id, orgId, sessionId, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

/**
 * Upsert a tracking event.
 */
export const upsertTrackingEvent = mutation({
  args: {
    shipment_id: v.id("shipments"),
    status: v.string(),
    sub_status: v.optional(v.string()),
    message: v.string(),
    location: v.optional(v.string()),
    occurred_at: v.number(),
    raw_payload: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tracking_events")
      .withIndex("by_shipment_id", (q) => q.eq("shipment_id", args.shipment_id))
      .filter((q) => q.and(
          q.eq(q.field("occurred_at"), args.occurred_at),
          q.eq(q.field("message"), args.message)
      ))
      .first();

    if (existing) return existing._id;
    return await ctx.db.insert("tracking_events", args);
  },
});

/**
 * Archive a shipment.
 */
export const archiveShipment = mutation({
  args: { id: v.id("shipments"), orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.orgId, args.sessionId);
    const shipment = await ctx.db.get(args.id);
    if (!shipment || shipment.orgId !== args.orgId) {
      throw new Error("Shipment not found or access denied");
    }

    const TWO_YEARS = 2 * 365 * 24 * 60 * 60 * 1000;
    await ctx.db.patch(args.id, {
      archived_at: Date.now(),
      scheduled_for_deletion_at: Date.now() + TWO_YEARS,
    });
  },
});

/**
 * Unarchive a shipment.
 */
export const unarchiveShipment = mutation({
  args: { id: v.id("shipments"), orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.orgId, args.sessionId);
    const shipment = await ctx.db.get(args.id);
    if (!shipment || shipment.orgId !== args.orgId) {
      throw new Error("Shipment not found or access denied");
    }

    await ctx.db.patch(args.id, {
      archived_at: undefined,
      scheduled_for_deletion_at: undefined,
    });
  },
});

/**
 * Delete a shipment and its events.
 */
export const deleteShipment = mutation({
  args: { id: v.id("shipments"), orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireOrgRole(ctx, args.orgId, args.sessionId);
    const shipment = await ctx.db.get(args.id);
    if (!shipment || shipment.orgId !== args.orgId) {
      throw new Error("Shipment not found or access denied");
    }

    // 1. Cascade: Tracking Events
    const events = await ctx.db
        .query("tracking_events")
        .withIndex("by_shipment_id", (q) => q.eq("shipment_id", args.id))
        .collect();
    for (const event of events) {
        await ctx.db.delete(event._id);
    }
    
    // 2. Cascade: Communication Logs
    const commLogs = await ctx.db
        .query("communication_logs")
        .withIndex("by_shipmentId", (q) => q.eq("shipmentId", args.id))
        .collect();
    for (const log of commLogs) {
        await ctx.db.delete(log._id);
    }

    // 3. Write Audit Log before wiping
    await ctx.db.insert("audit_logs", {
        userId: user.externalId,
        orgId: args.orgId,
        action: "hard_delete_shipment",
        entityId: args.id,
        entityType: "shipments",
        details: { 
            tracking_number: shipment.tracking_number, 
            carrier_code: shipment.carrier_code 
        },
        timestamp: Date.now()
    });

    // 4. Finally, wipe shipment
    await ctx.db.delete(args.id);
  },
});

/**
 * Create a manual shipment record.
 */
export const createShipmentManual = mutation({
  args: {
    orgId: v.union(v.id("organizations"), v.string()),
    tracking_number: v.string(),
    carrier_code: v.string(),
    provider: v.union(v.literal("trackingmore"), v.literal("track123"), v.literal("track17")),
    customer_name: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    notification_preferences: v.optional(
      v.object({
        email: v.boolean(),
        whatsapp: v.boolean(),
      })
    ),
    userId: v.optional(v.string()),
    origin_country: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await createShipmentInternal(ctx, {
        ...args,
        status: "pending",
        events_raw: "[]",
    });
  },
});
