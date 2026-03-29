import { v, ConvexError } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery, internalAction, ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { trackingAdapter } from "./tracking/router";
import { requireUser, requireAdmin, requireUserAction, requireOrgMember, requireOrgRole, requireOrgMemberAction } from "./rbac";
import { getTracking } from "ts-tracking-number";


/**
 * Securing Shipments Backend (Multi-Tenancy)
 */

export async function getNextWhiteLabelCode(ctx: any, country: string) {
  const prefix = country.toLowerCase() === "india" ? "GT" : "LM";
  let isUnique = false;
  let code = "";
  
  while (!isUnique) {
    // Generate a random 8-digit number for uniqueness and professional look
    const randomPart = Math.floor(10000000 + Math.random() * 90000000).toString();
    code = `${prefix}${randomPart}`;
    
    const existing = await ctx.db
      .query("shipments")
      .withIndex("by_white_label_code", (q: any) => q.eq("white_label_code", code))
      .unique();
      
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
}

export const getShipmentInternal = internalQuery({
  args: { id: v.id("shipments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Helper to enrich a shipment with its human-readable carrier name.
 */
async function enrichShipmentWithCarrierName(ctx: any, shipment: any) {
    if (!shipment) return null;
    let carrier_name = shipment.carrier_code;
    
    // For 17track, the carrier_code is usually a numeric ID
    if (shipment.provider === "track17" && !isNaN(Number(shipment.carrier_code))) {
        const carrier = await ctx.db
            .query("carriers")
            .withIndex("by_key", (q: any) => q.eq("key", Number(shipment.carrier_code)))
            .unique();
        if (carrier) carrier_name = carrier.name;
    }
    
    return { ...shipment, carrier_name };
}


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
        // Filter by archive status
        if (!includeArchived && s.archived_at !== undefined) return false;
        if (includeArchived && s.archived_at === undefined) return false;
 
        // Filter by other criteria
        if (args.status && s.status !== args.status) return false;
        if (args.search && !s.tracking_number.toLowerCase().includes(args.search.toLowerCase())) return false;
        return true;
      });

      return await Promise.all(filtered.map(s => enrichShipmentWithCarrierName(ctx, s)));
    } catch (error: any) {
      console.error("Error in listShipments:", error);
      throw new Error(`Failed to list shipments: ${error.message}`);
    }
  },
});

export const getShipment = query({
  args: { id: v.id("shipments"), orgId: v.optional(v.union(v.id("organizations"), v.string())), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // 1. Authenticate user/session
    const { user } = await requireUser(ctx, args.sessionId);
    
    // 2. Fetch shipment
    const shipment = await ctx.db.get(args.id);
    
    if (!shipment) {
      return null;
    }

    // 3. Verify access: Admin or Org Match
    const isAdmin = user.role === "admin";
    const isOwnerOrg = shipment.orgId === args.orgId; // If provided via URL
    const isUserInOrg = user.role === "staff" && user.orgId === shipment.orgId;
    
    const isAllowed = isAdmin || isUserInOrg || (user.role !== "staff" && isOwnerOrg);

    if (!isAllowed) {
      return null;
    }

    // 4. Fetch events
    const events = await ctx.db
      .query("tracking_events")
      .withIndex("by_shipment_id_occurred_at", (q) => q.eq("shipment_id", args.id))
      .order("desc")
      .collect();

    const enriched = await enrichShipmentWithCarrierName(ctx, shipment);
    return { ...enriched, events };
  },
});

export const internalGetShipment = internalQuery({
  args: { id: v.id("shipments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByTrackingNumberInternal = internalQuery({
  args: { tracking_number: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shipments")
      .withIndex("by_tracking_number", (q) => q.eq("tracking_number", args.tracking_number))
      .collect();
  },
});

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

export const checkTrackingExists = query({
  args: { 
    tracking_number: v.string(), 
    orgId: v.union(v.id("organizations"), v.string()), 
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("shipments")
      .withIndex("by_org_id_tracking_number", (q: any) => 
        q.eq("orgId", args.orgId).eq("tracking_number", args.tracking_number.trim())
      )
      .unique();
    return !!existing;
  },
});



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
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    return await createShipmentInternal(ctx, args);
  },
});

export const internalCreateShipment = internalMutation({
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
  },
  handler: async (ctx, args) => {
    return await createShipmentInternal(ctx, args);
  },
});

/**
 * Internal helper for creating a shipment.
 */
async function createShipmentInternal(ctx: any, args: any) {
    const existing = await ctx.db
      .query("shipments")
      .withIndex("by_org_id_tracking_number", (q: any) => 
        q.eq("orgId", args.orgId).eq("tracking_number", args.tracking_number)
      )
      .unique();
    
    if (existing) {
        throw new ConvexError(`Shipment with tracking number "${args.tracking_number}" is already active in your organization.`);
    }
    
    // Auto-link to user if not provided but contact matches
    let finalUserId = args.userId;
    if (!finalUserId && (args.customer_email || args.customer_phone)) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_orgId", (q: any) => q.eq("orgId", args.orgId))
        .collect();

      const matchedUser = users.find((u: any) => 
        (args.customer_email && u.email?.toLowerCase() === args.customer_email.toLowerCase()) || 
        (args.customer_phone && u.phone === args.customer_phone)
      );

      if (matchedUser) {
        console.log(`[AUTO-LINK] Linked shipment ${args.tracking_number} to user ${matchedUser.name} (${matchedUser.externalId})`);
        finalUserId = matchedUser.externalId;
      }
    }

    let white_label_code = undefined;
    if (args.origin_country) {
      white_label_code = await getNextWhiteLabelCode(ctx, args.origin_country);
    }

    const shipment_id = await ctx.db.insert("shipments", {
      ...shipmentData,
      userId: finalUserId,
      last_synced_at: Date.now(),
      created_at: Date.now(),
      white_label_code,
    });

    // Milestone Trigger (Initial Creation)
    const milestones = ["info_received", "out_for_delivery", "delivered", "exception", "failed_attempt"];
    const initialStatus = args.status;
    const hasContact = args.customer_email || args.customer_phone;
    const wantsAlerts = args.notification_preferences?.email || args.notification_preferences?.whatsapp || !args.notification_preferences;

    if (initialStatus && milestones.includes(initialStatus) && hasContact && wantsAlerts) {
        console.log(`[TRIGGER:INIT] Milestone detected for new shipment ${shipment_id}: ${initialStatus}. Scheduling notification...`);
        await ctx.scheduler.runAfter(0, internal.notifications.actions.sendStatusUpdate, {
            id: shipment_id,
            status: initialStatus
        });
    }

    return shipment_id;
}

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
      .filter((q) => q.eq(q.field("occurred_at"), args.occurred_at))
      .filter((q) => q.eq(q.field("message"), args.message))
      .unique();

    if (existing) return existing._id;
    return await ctx.db.insert("tracking_events", args);
  },
});

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
    if (isNaN(args.occurred_at)) {
        console.warn(`[internalUpsertTrackingEvent] Skipping event with NaN occurred_at for ${args.shipment_id}: ${args.message}`);
        return null;
    }

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

export const updateShipmentStatus = mutation({
  args: {
    id: v.id("shipments"),
    orgId: v.union(v.id("organizations"), v.string()),
    status: v.string() as any,
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
      ...(updates as any),
      last_synced_at: updates.last_synced_at ?? Date.now(),
      provider_metadata: updates.provider_metadata || undefined
    });

    // Milestone Trigger: Notify on significant status changes
    const milestones = ["info_received", "out_for_delivery", "delivered", "exception", "failed_attempt"];
    const wantsAlerts = shipment.notification_preferences?.email || shipment.notification_preferences?.whatsapp || !shipment.notification_preferences;
    
    if (oldStatus !== newStatus && milestones.includes(newStatus) && wantsAlerts) {
        console.log(`[TRIGGER:UPDATE] Milestone detected for ${id}: ${oldStatus} -> ${newStatus}. Scheduling...`);
        await ctx.scheduler.runAfter(0, internal.notifications.actions.sendStatusUpdate, {
            id: id,
            status: newStatus
        });

        // Admin Notification for critical milestones
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

export const internalUpdateShipmentStatus = internalMutation({
  args: {
    id: v.id("shipments"),
    status: v.string() as any,
    carrier_code: v.optional(v.string()),
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
      ...(updates as any),
      last_synced_at: updates.last_synced_at ?? Date.now(),
      provider_metadata: updates.provider_metadata || undefined
    });

    // Milestone Trigger (Internal)
    const milestones = ["info_received", "out_for_delivery", "delivered", "exception", "failed_attempt"];
    const wantsAlerts = shipment.notification_preferences?.email || shipment.notification_preferences?.whatsapp || !shipment.notification_preferences;
    
    if (oldStatus !== newStatus && milestones.includes(newStatus) && wantsAlerts) {
        console.log(`[TRIGGER:SYNC] Milestone detected for ${id}: ${oldStatus} -> ${newStatus}. Scheduling...`);
        await ctx.scheduler.runAfter(0, internal.notifications.actions.sendStatusUpdate, {
            id: id,
            status: newStatus
        });
    }
  },
});

export const addAndTrackShipment = action({
  args: {
    orgId: v.union(v.id("organizations"), v.string()),
    tracking_number: v.string(),
    carrier_code: v.optional(v.string()),
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
    origin_country: v.string(),
    provider: v.optional(v.union(v.literal("trackingmore"), v.literal("track123"), v.literal("track17"))),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      await requireUserAction(ctx, args.sessionId);

      let trackingResult: any = null;
      let providerName: "trackingmore" | "track123" | "track17" | "none" = "none";

      // Attempt to track if at least one API key exists
      const hasTrack17 = !!process.env.TRACK17_API_KEY;
      const hasTrack123 = !!process.env.TRACK123_API_KEY;
      const hasTrackingMore = !!process.env.TRACKINGMORE_API_KEY;

      console.log(`[DEBUG:addAndTrackShipment] Keys check - Track17: ${hasTrack17}, Track123: ${hasTrack123}, TrackingMore: ${hasTrackingMore}`);

      if (hasTrack17 || hasTrack123 || hasTrackingMore) {
        try {
          // If carrier_code is a string name (like "dhl"), resolve it to a 17track ID if possible
          let resolvedCarrierCode = args.carrier_code;
          if (resolvedCarrierCode && isNaN(Number(resolvedCarrierCode))) {
            console.log(`[ACTION:addAndTrackShipment] Resolving carrier name "${resolvedCarrierCode}" to ID...`);
            const carrierId = await ctx.runQuery(api.tracking.carriers.findCarrierId, { searchTerm: resolvedCarrierCode });
            if (carrierId) {
                console.log(`[ACTION:addAndTrackShipment] Resolved "${resolvedCarrierCode}" -> ${carrierId}`);
                resolvedCarrierCode = String(carrierId);
            }
          }

          console.log(`[ACTION:addAndTrackShipment] Using trackingAdapter.addTracking with preferredProvider: ${args.provider || 'auto'}...`);
          const result = await trackingAdapter.addTracking(
            args.tracking_number, 
            resolvedCarrierCode, 
            args.provider as any,
            { origin_country: args.origin_country }
          );
          trackingResult = result;
          providerName = result.provider as any;
          console.log(`[ACTION:addAndTrackShipment] Tracking lookup succeeded via ${providerName}`);
        } catch (error) {
          console.warn(`[ACTION:addAndTrackShipment] Tracking registration failed, attempting fetch directly...`);
          try {
              // If it might already be registered, just try to get it
              const maybeResult = await trackingAdapter.refreshTracking(
                args.tracking_number, 
                args.carrier_code || "auto", 
                (args.provider as any) || "track17"
              );
              trackingResult = maybeResult;
              providerName = (args.provider as any) || "track17";
              console.log(`[ACTION:addAndTrackShipment] Data found for existing registration via ${providerName}`);
          } catch (innerError) {
              console.warn(`[ACTION:addAndTrackShipment] Direct fetch also failed, falling back to local creation:`, innerError);
          }
        }
      } else {
        console.warn(`[ACTION:addAndTrackShipment] No tracking API keys configured (TRACK17_API_KEY/TRACK123_API_KEY/TRACKINGMORE_API_KEY).`);
      }

      // Always create the database record, even if live tracking failed
      const shipment_id: any = await ctx.runMutation(api.shipments.createShipment, {
        orgId: args.orgId,
        tracking_number: trackingResult?.tracking_number || args.tracking_number,
        carrier_code: trackingResult?.carrier_code || args.carrier_code || "unknown",
        provider: (providerName === "none" ? (process.env.PRIMARY_TRACKING_PROVIDER || "track17") : providerName) as any, 
        status: (trackingResult?.status as any) || "pending",
        customer_name: args.customer_name,
        customer_email: args.customer_email,
        customer_phone: args.customer_phone,
        notification_preferences: args.notification_preferences,
        userId: args.userId,
        estimated_delivery: trackingResult?.estimated_delivery,
        events_raw: trackingResult?.raw_payload || "[]",
        provider_metadata: trackingResult?.provider_metadata,
        origin_country: args.origin_country,
        sessionId: args.sessionId,
      });

      console.log(`[ACTION:addAndTrackShipment] Shipment created in DB: ${shipment_id}`);

      // Upsert events if we have them
      if (trackingResult?.events && trackingResult.events.length > 0) {
        console.log(`[ACTION:addAndTrackShipment] Found ${trackingResult.events.length} initial events to store for ${shipment_id}`);
        for (const event of trackingResult.events) {
          try {
            const occurred_at = (typeof (event as any).occurred_at === 'number' && !isNaN((event as any).occurred_at))
                ? (event as any).occurred_at 
                : ((event as any).Date ? new Date((event as any).Date).getTime() : Date.now());

            if (isNaN(occurred_at)) {
                console.warn(`[ACTION:addAndTrackShipment] Skipping event with invalid timestamp for ${shipment_id}: ${String((event as any).message || "")}`);
                continue;
            }
            const eventId = await ctx.runMutation(internal.shipments.internalUpsertTrackingEvent, {
              shipment_id,
              status: String((event as any).status || (event as any).checkpoint_status || "update"),
              message: String((event as any).message || (event as any).StatusDescription || "Status update"),
              location: String((event as any).location || (event as any).Details || ""),
              occurred_at,
              raw_payload: typeof (event as any).raw_payload === 'string' ? (event as any).raw_payload : JSON.stringify(event),
              metadata: (event as any).metadata,
            });
            if (!eventId) console.warn(`[ACTION:addAndTrackShipment] Mutation returned null (duplicate?) for event: ${String((event as any).message || "")}`);
          } catch (eventError) {
            console.error(`[ACTION:addAndTrackShipment] Failed to upsert event for ${shipment_id}:`, eventError);
          }
        }
      } else {
        console.log(`[ACTION:addAndTrackShipment] No events found in trackingResult for ${shipment_id}`);
      }

      return shipment_id;
    } catch (criticalError: any) {
        console.error(`[ACTION:addAndTrackShipment] CRITICAL FAILURE:`, criticalError);
        // If it was a ConvexError from the mutation, re-wrap it to ensure the client sees .data
        if (criticalError.data) {
            throw new ConvexError(criticalError.data);
        }
        throw criticalError;
    }
  },
});

/**
 * Internal logic for refreshing a shipment's tracking data.
 */
async function performRefresh(ctx: ActionCtx, args: { shipment_id: Id<"shipments">, orgId?: Id<"organizations"> | string }) {
  const shipment = args.orgId 
    ? await ctx.runQuery(api.shipments.getShipment, { id: args.shipment_id, orgId: args.orgId })
    : await ctx.runQuery(internal.shipments.internalGetShipment, { id: args.shipment_id });
  
  if (!shipment) throw new Error("Shipment not found");

  const result = await trackingAdapter.refreshTracking(
      (shipment as any).tracking_number, 
      (shipment as any).carrier_code, 
      (shipment as any).provider as any
  );

  await ctx.runMutation(internal.shipments.internalUpdateShipmentStatus, {
    id: args.shipment_id,
    status: result.status as any,
    estimated_delivery: result.estimated_delivery,
    events_raw: result.raw_payload,
    provider_metadata: result.provider_metadata,
  });

  for (const event of result.events) {
    const occurred_at = (typeof (event as any).occurred_at === 'number' && !isNaN((event as any).occurred_at))
        ? (event as any).occurred_at 
        : ((event as any).Date ? new Date((event as any).Date).getTime() : Date.now());

    if (isNaN(occurred_at)) {
        console.warn(`[performRefresh] Skipping event with invalid timestamp for ${args.shipment_id}`);
        continue;
    }
    await ctx.runMutation(internal.shipments.internalUpsertTrackingEvent, {
      shipment_id: args.shipment_id,
      status: String((event as any).status || (event as any).checkpoint_status || "update"),
      message: String((event as any).message || (event as any).StatusDescription || "Status update"),
      location: String((event as any).location || (event as any).Details || ""),
      occurred_at,
      raw_payload: typeof (event as any).raw_payload === 'string' ? (event as any).raw_payload : JSON.stringify(event),
      metadata: (event as any).metadata,
    });
  }

  return result;
}

/**
 * Manual shipment creation (bypasses live tracking lookup).
 * Use this for testing or when tracking IDs aren't ready.
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

export const internalRefreshShipment = internalAction({
  args: { shipment_id: v.id("shipments") },
  handler: performRefresh,
});

export const refreshShipment = action({
  args: { shipment_id: v.id("shipments"), orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgMemberAction(ctx, args.orgId, args.sessionId);
    return await performRefresh(ctx, args);
  },
});

export const refreshShipmentByData = action({
  args: {
    tracking_number: v.string(),
    carrier_code: v.string(),
    status: v.string(),
    events: v.array(v.any()),
    raw_payload: v.string(),
    provider_metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const shipments = await ctx.runQuery(internal.shipments.listByTrackingNumberInternal, { 
      tracking_number: args.tracking_number 
    });
    
    if (shipments.length === 0) return;

    if (!args.events || args.events.length === 0) {
        console.log(`[refreshShipmentByData] No events in payload for tracking number ${args.tracking_number}`);
    } else {
        console.log(`[refreshShipmentByData] Received ${args.events.length} events for tracking number ${args.tracking_number} (Matched ${shipments.length} DB records)`);
    }

    for (const shipment of shipments) {
        await ctx.runMutation(internal.shipments.internalUpdateShipmentStatus, {
          id: shipment._id,
          status: String(args.status) as any,
          events_raw: String(args.raw_payload),
          provider_metadata: args.provider_metadata,
        });

        if (args.events) {
            for (const event of args.events) {
              const occurred_at = (typeof (event as any).occurred_at === 'number' && !isNaN((event as any).occurred_at))
                ? (event as any).occurred_at 
                : ((event as any).Date ? new Date((event as any).Date).getTime() : Date.now());
              
              if (isNaN(occurred_at)) {
                console.warn(`[refreshShipmentByData] Skipping event with invalid timestamp for ${args.tracking_number}: ${String((event as any).message || "")}`);
                continue;
              }

              const eventId = await ctx.runMutation(internal.shipments.internalUpsertTrackingEvent, {
                shipment_id: shipment._id,
                status: String((event as any).status || (event as any).checkpoint_status || "update"),
                message: String((event as any).message || (event as any).StatusDescription || "Status update"),
                location: String((event as any).location || (event as any).Details || ""),
                occurred_at,
                raw_payload: typeof (event as any).raw_payload === 'string' ? (event as any).raw_payload : JSON.stringify(event),
                metadata: (event as any).metadata,
              });
              if (!eventId) console.log(`[refreshShipmentByData] Event skipped/deduplicated for ${shipment._id}: ${String((event as any).message || "")}`);
            }
        }
    }
  },
});

export const retrackShipment = action({
  args: { 
    shipment_id: v.id("shipments"), 
    orgId: v.union(v.id("organizations"), v.string()), 
    carrier_code: v.optional(v.string()), 
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    await requireOrgMemberAction(ctx, args.orgId, args.sessionId);
    
    const shipment = await ctx.runQuery(api.shipments.getShipment, { id: args.shipment_id, orgId: args.orgId });
    if (!shipment) throw new Error("Shipment not found");
 
    let finalCarrierCode = args.carrier_code || (shipment as any).carrier_code;
    if (shipment.provider === "track17" && isNaN(Number(finalCarrierCode))) {
        console.log(`[ACTION:retrackShipment] Resolving carrier name "${finalCarrierCode}" for 17track...`);
        const resolved = await ctx.runQuery(api.tracking.carriers.findCarrierId, { searchTerm: finalCarrierCode });
        if (resolved) {
            console.log(`[ACTION:retrackShipment] Resolved "${finalCarrierCode}" -> ${resolved}`);
            finalCarrierCode = String(resolved);
        }
    }

    console.log(`[ACTION:retrackShipment] Changing carrier for ${shipment.tracking_number} to ${finalCarrierCode}...`);

    const success = await trackingAdapter.retrack(
        shipment.tracking_number,
        finalCarrierCode,
        shipment.provider as any
    );

    if (!success) {
        throw new Error(`Failed to change carrier for ${shipment.tracking_number} on ${shipment.provider}`);
    }

    // Immediately refresh to get data from the new carrier
    const result = await trackingAdapter.refreshTracking(
        shipment.tracking_number,
        finalCarrierCode,
        shipment.provider as any
    );

    await ctx.runMutation(internal.shipments.internalUpdateShipmentStatus, {
        id: args.shipment_id,
        status: result.status as any,
        carrier_code: result.carrier_code,
        estimated_delivery: result.estimated_delivery,
        events_raw: result.raw_payload,
        provider_metadata: result.provider_metadata,
    });

    if (result.events) {
        for (const event of result.events) {
            const occurred_at = (typeof (event as any).occurred_at === 'number' && !isNaN((event as any).occurred_at))
                ? (event as any).occurred_at 
                : ((event as any).Date ? new Date((event as any).Date).getTime() : Date.now());

            if (isNaN(occurred_at)) {
                console.warn(`[retrackShipment] Skipping event with invalid timestamp for ${args.shipment_id}`);
                continue;
            }

            await ctx.runMutation(internal.shipments.internalUpsertTrackingEvent, {
                shipment_id: args.shipment_id,
                status: String((event as any).status || (event as any).checkpoint_status || "update"),
                message: String((event as any).message || (event as any).StatusDescription || "Status update"),
                location: String((event as any).location || (event as any).Details || ""),
                occurred_at,
                raw_payload: typeof (event as any).raw_payload === 'string' ? (event as any).raw_payload : JSON.stringify(event),
                metadata: (event as any).metadata,
            });
        }
    }

    return result;
  }
});

export const detectCarrierAction = action({
  args: { tracking_number: v.string() },
  handler: async (ctx: ActionCtx, args: { tracking_number: string }): Promise<{ carrierCode: string; carrierName?: string; provider: "trackingmore" | "track123" | "track17" } | null> => {
    // 1. Try API-based detection (TrackingMore, Track123)
    const result = await trackingAdapter.detectCarrier(args.tracking_number);
    if (result) return result;

    // 2. Fallback: Local detection for 17track using ts-tracking-number
    console.log(`[ACTION:detectCarrierAction] Fallback detection for ${args.tracking_number}...`);
    try {
      const tracking = getTracking(args.tracking_number);
      if (tracking && tracking.courier && tracking.courier.name) {
        const courierName = tracking.courier.name;
        console.log(`[ACTION:detectCarrierAction] ts-tracking-number identified: ${courierName}`);
        
        // Find matching 17track numeric ID in the database
        const carrierId = await ctx.runQuery(api.tracking.carriers.findCarrierId, { searchTerm: courierName });
        if (carrierId) {
          console.log(`[ACTION:detectCarrierAction] Resolved ${courierName} -> 17track ID: ${carrierId}`);
          return {
            carrierCode: String(carrierId),
            carrierName: courierName,
            provider: "track17" as const
          };
        }
      }
    } catch (e) {
        console.warn("[ACTION:detectCarrierAction] Local detection fallback failed:", e);
    }

    return null;
  },
});




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

export const listAllActiveForSync = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("shipments")
      .filter((q) => q.and(
        q.neq(q.field("status"), "delivered"),
        q.neq(q.field("status"), "expired"),
        q.eq(q.field("archived_at"), undefined)
      ))
      .collect();
  },
});

export const syncActiveShipments = internalAction({
  handler: async (ctx) => {
    // 1. Fetch a batch of stale shipments
    const active = await ctx.runQuery(internal.shipments.internalListActive);
    
    if (active.length === 0) {
      console.log("[SYNC] No stale shipments found.");
      return;
    }

    console.log(`[SYNC] Dispatching batch of ${active.length} shipments...`);

    // 2. Process each in its own sub-action to avoid single transaction timeout
    for (const shipment of active) {
      try {
        await ctx.scheduler.runAfter(0, internal.shipments.syncSingleShipment, {
          shipment_id: shipment._id,
        });
      } catch (error) {
        console.error(`[SYNC] Failed to schedule sync for ${shipment._id}:`, error);
      }
    }

    // 3. Reschedule the main sync to continue if we potentially have more work
    // (If we found a full batch of 50, there are likely more)
    if (active.length === 50) { 
        console.log("[SYNC] Batch full, rescheduling next segment in 10 seconds...");
        await ctx.scheduler.runAfter(10000, internal.shipments.syncActiveShipments);
    }
  },
});

export const syncSingleShipment = internalAction({
  args: { shipment_id: v.id("shipments") },
  handler: async (ctx, args) => {
    try {
      await performRefresh(ctx, {
        shipment_id: args.shipment_id,
      });
    } catch (error) {
      console.error(`[SYNC:SINGLE] Failed to refresh ${args.shipment_id}:`, error);
    }
  },
});

export const internalListShipmentsToArchive = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const fortyFiveDaysAgo = now - (45 * 24 * 60 * 60 * 1000);

    console.log(`[ARCHIVE-CHECK] Running at ${new Date(now).toISOString()}`);
    console.log(`[ARCHIVE-CHECK] 30 Days Ago: ${new Date(thirtyDaysAgo).toISOString()} (${thirtyDaysAgo})`);
    console.log(`[ARCHIVE-CHECK] 45 Days Ago: ${new Date(fortyFiveDaysAgo).toISOString()} (${fortyFiveDaysAgo})`);

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

    const results = [...deliveredToArchive, ...exceptionsToArchive];
    console.log(`[ARCHIVE-CHECK] Found ${results.length} total shipments to archive (${deliveredToArchive.length} delivered, ${exceptionsToArchive.length} exceptions)`);
    
    if (results.length > 0) {
        results.forEach(s => {
            console.log(`[ARCHIVE-CHECK] Targeting Shipment ${s.tracking_number} (ID: ${s._id}) - Status: ${s.status}, LastSynced: ${new Date(s.last_synced_at).toISOString()}`);
        });
    }

    return results;
  },
});

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

export const deleteShipment = mutation({
  args: { id: v.id("shipments"), orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.orgId, args.sessionId);
    const shipment = await ctx.db.get(args.id);
    if (!shipment || shipment.orgId !== args.orgId) {
      throw new Error("Shipment not found or access denied");
    }

    const events = await ctx.db
        .query("tracking_events")
        .withIndex("by_shipment_id", (q) => q.eq("shipment_id", args.id))
        .collect();
    for (const event of events) {
        await ctx.db.delete(event._id);
    }
    
    await ctx.db.delete(args.id);
  },
});

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

export const processShipmentArchiving = internalAction({
  handler: async (ctx) => {
    const now = Date.now();
    console.log(`[ARCHIVE-ACTION] Starting archiving process at ${new Date(now).toISOString()}...`);
    const toArchive = await ctx.runQuery(internal.shipments.internalListShipmentsToArchive);
    
    if ((toArchive as any).length === 0) {
      console.log(`[ARCHIVE-ACTION] No shipments found to archive.`);
      return;
    }

    console.log(`[ARCHIVE-ACTION] Found ${(toArchive as any).length} shipments to archive.`);
    for (const shipment of (toArchive as any)) {
      console.log(`[ARCHIVE-ACTION] Archiving Shipment: ${shipment.tracking_number} (Status: ${shipment.status}, LastSynced: ${new Date(shipment.last_synced_at).toISOString()})`);
      await ctx.runMutation(internal.shipments.internalArchiveShipment, { id: (shipment as any)._id });
    }
    console.log(`[ARCHIVE-ACTION] Finished archiving process.`);
  },
});

export const internalListPendingDeletion = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("shipments")
      .withIndex("by_scheduled_for_deletion_at", (q) => q.lt("scheduled_for_deletion_at", now))
      .collect();
  },
});

export const cleanupArchivedShipments = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const MIN_VALID_TIME = new Date("2024-01-01").getTime();
    console.log(`[CLEANUP-ACTION] Starting at ${new Date(now).toISOString()} (${now})`);
    
    // Safety check: Only target shipments with a valid deletion time
    const toDelete = await ctx.db
      .query("shipments")
      .withIndex("by_scheduled_for_deletion_at", (q) => 
        q.gt("scheduled_for_deletion_at", MIN_VALID_TIME).lt("scheduled_for_deletion_at", now)
      )
      .collect();

    if (toDelete.length === 0) {
      console.log(`[CLEANUP-ACTION] No shipments found scheduled for deletion.`);
      return;
    }

    console.log(`[CLEANUP-ACTION] Found ${toDelete.length} shipments scheduled for deletion.`);

    for (const shipment of toDelete) {
        const scheduledTime = shipment.scheduled_for_deletion_at;
        console.log(`[CLEANUP-ACTION] !!! PURGING Shipment ${shipment.tracking_number} (ID: ${shipment._id}) !!!`);
        console.log(`[CLEANUP-ACTION] Detail: LastSynced: ${new Date(shipment.last_synced_at).toISOString()}, ScheduledDeletion: ${new Date(scheduledTime!).toISOString()} (${scheduledTime})`);
        
        const events = await ctx.db
            .query("tracking_events")
            .withIndex("by_shipment_id", (q) => q.eq("shipment_id", shipment._id))
            .collect();
        
        console.log(`[CLEANUP-ACTION] Deleting ${events.length} tracking events for ${shipment.tracking_number}`);
        for (const event of events) {
            await ctx.db.delete(event._id);
        }
        await ctx.db.delete(shipment._id);
    }
    console.log(`[CLEANUP-ACTION] Finished purging ${toDelete.length} shipments.`);
  },
});

export const getShipmentStats = query({
  args: { orgId: v.union(v.id("organizations"), v.string()), userId: v.optional(v.string()), sessionId: v.optional(v.string()) },
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

    // Calculate Trend Data (Last 7 Days)
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

export const getDetailedAnalytics = query({
  args: { orgId: v.union(v.id("organizations"), v.string()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId, args.sessionId);
    
    const shipments = await ctx.db
      .query("shipments")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();

    const now = Date.now();
    const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000);
    
    // 1. Status Distribution
    const statusCounts: Record<string, number> = {};
    // 2. Carrier Breakdown
    const carrierCounts: Record<string, number> = {};
    // 3. Country Performance
    const countryCounts: Record<string, number> = {};
    // 4. Monthly Trend (Last 6 Months)
    const monthlyTrend: Record<string, number> = {};

    shipments.forEach(s => {
      // Status
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      
      // Carrier
      const carrier = s.carrier_code || "unknown";
      carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
      
      // Country
      const country = s.origin_country || "Unknown";
      countryCounts[country] = (countryCounts[country] || 0) + 1;
      
      // Trend
      if (s.created_at > sixMonthsAgo) {
        const date = new Date(s.created_at);
        const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyTrend[monthYear] = (monthlyTrend[monthYear] || 0) + 1;
      }
    });

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    const carrierData = Object.entries(carrierCounts).map(([name, value]) => ({ name, value }));
    const countryData = Object.entries(countryCounts).map(([name, value]) => ({ name, value }));
    
    // Sort monthly trend chromologically
    const trendData = Object.entries(monthlyTrend)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
          const [aM, aY] = a.name.split(' ');
          const [bM, bY] = b.name.split(' ');
          const aDate = new Date(`${aM} 01, 20${aY}`);
          const bDate = new Date(`${bM} 01, 20${bY}`);
          return aDate.getTime() - bDate.getTime();
      });

    return {
      statusData,
      carrierData,
      countryData,
      trendData,
      totalCount: shipments.length,
    };
  },
});

export const get17TrackQuota = action({
  args: { sessionId: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    await requireUserAction(ctx, args.sessionId as any);
    
    // Only show 17track quota if it's the primary provider
    const primaryProvider = process.env.PRIMARY_TRACKING_PROVIDER || "track17";
    if (primaryProvider !== "track17") {
      return { error: "DISABLED" };
    }

    if (!process.env.TRACK17_API_KEY) {
      return { error: "MISSING_KEY" };
    }
    const quota = await trackingAdapter.getQuota("track17");
    console.log("[ACTION:get17TrackQuota] Quota result:", quota);
    return quota;
  },
});

export const seedAllOrganizations = mutation({
  args: { count: v.optional(v.number()), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // 1. Verify user is admin
    await requireAdmin(ctx, args.sessionId);
    
    // 2. Fetch all organizations
    const targetOrgs = await ctx.db.query("organizations").collect();
    
    if (targetOrgs.length === 0) {
        throw new Error("No organizations found to seed. Please create an organization first.");
    }

    const countPerOrg = args.count || 10;
    const now = Date.now();
    let totalCreated = 0;
    
    for (const org of targetOrgs) {
        console.log(`[SEED] Seeding organization: ${org.name} (${org._id})`);
        for (let i = 0; i < countPerOrg; i++) {
            const trackingNum = `SEED${Math.floor(100000 + Math.random() * 900000)}`;
            const country = org.name.toLowerCase().includes("sri lanka") ? "Sri Lanka" : "India";
            const whiteLabel = await getNextWhiteLabelCode(ctx, country);
            
            await ctx.db.insert("shipments", {
                orgId: org._id,
                tracking_number: trackingNum,
                carrier_code: "dhl",
                provider: "track17",
                status: "in_transit",
                customer_name: `Sample ${org.name} Customer ${i + 1}`,
                customer_email: `sample${i + 1}@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
                last_synced_at: now,
                created_at: now,
                white_label_code: whiteLabel,
                events_raw: "[]",
            });
            totalCreated++;
        }
    }
    
    return { success: true, orgsSeeded: targetOrgs.length, totalCreated };
  },
});

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

