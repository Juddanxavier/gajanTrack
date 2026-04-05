import { v, ConvexError } from "convex/values";
import { action, ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { requireUserAction, requireOrgMemberAction } from "../rbac";
import { trackingAdapter } from "../tracking/router";
import { getTracking } from "ts-tracking-number";

/**
 * Add a shipment and start tracking it immediately.
 */
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

      const hasTrack17 = !!process.env.TRACK17_API_KEY;
      const hasTrack123 = !!process.env.TRACK123_API_KEY;
      const hasTrackingMore = !!process.env.TRACKINGMORE_API_KEY;

      if (hasTrack17 || hasTrack123 || hasTrackingMore) {
        try {
          let resolvedCarrierCode = args.carrier_code;
          if (resolvedCarrierCode && isNaN(Number(resolvedCarrierCode))) {
            const carrierId = await ctx.runQuery(api.tracking.carriers.findCarrierId, { searchTerm: resolvedCarrierCode });
            if (carrierId) resolvedCarrierCode = String(carrierId);
          }

          const result = await trackingAdapter.addTracking(
            args.tracking_number, 
            resolvedCarrierCode, 
            args.provider as any,
            { origin_country: args.origin_country }
          );
          trackingResult = result;
          providerName = result.provider as any;
        } catch (error) {
          try {
              const maybeResult = await trackingAdapter.refreshTracking(
                args.tracking_number, 
                args.carrier_code || "auto", 
                (args.provider as any) || "track17"
              );
              trackingResult = maybeResult;
              providerName = (args.provider as any) || "track17";
          } catch (innerError) {
              console.warn(`[ACTION:addAndTrackShipment] Direct fetch also failed`, innerError);
          }
        }
      }

      const shipment_id: any = await ctx.runMutation(api.shipments.mutations.createShipment, {
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

      if (trackingResult?.events && trackingResult.events.length > 0) {
        for (const event of trackingResult.events) {
          try {
            const occurred_at = (typeof (event as any).occurred_at === 'number' && !isNaN((event as any).occurred_at))
                ? (event as any).occurred_at 
                : ((event as any).Date ? new Date((event as any).Date).getTime() : Date.now());

            if (isNaN(occurred_at)) continue;
            
            await ctx.runMutation(internal.shipments.internal.internalUpsertTrackingEvent, {
              shipment_id,
              status: String((event as any).status || (event as any).checkpoint_status || "update"),
              message: String((event as any).message || (event as any).StatusDescription || "Status update"),
              location: String((event as any).location || (event as any).Details || ""),
              occurred_at,
              raw_payload: typeof (event as any).raw_payload === 'string' ? (event as any).raw_payload : JSON.stringify(event),
              metadata: (event as any).metadata,
            });
          } catch (eventError) {
            console.error(`[ACTION:addAndTrackShipment] Failed to upsert event for ${shipment_id}:`, eventError);
          }
        }
      }

      return shipment_id;
    } catch (criticalError: any) {
        // Ensure all errors are passed as ConvexError data so they aren't masked as "Server Error"
        const message = criticalError.data || criticalError.message || String(criticalError);
        throw new ConvexError(message);
    }
  },
});

/**
 * Manually refresh tracking data.
 */
export const refreshShipment = action({
  args: { 
    shipment_id: v.id("shipments"), 
    orgId: v.union(v.id("organizations"), v.string()), 
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    if (args.orgId !== "internal") {
        await requireOrgMemberAction(ctx, args.orgId, args.sessionId);
    }
    
    // Internal helper for refreshing
    const shipment = await ctx.runQuery(api.shipments.queries.getShipment, { id: args.shipment_id, orgId: args.orgId });
    if (!shipment) throw new Error("Shipment not found");

    const result = await trackingAdapter.refreshTracking(
        (shipment as any).tracking_number, 
        (shipment as any).carrier_code, 
        (shipment as any).provider as any
    );

    await ctx.runMutation(internal.shipments.internal.internalUpdateShipmentStatus, {
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

      if (isNaN(occurred_at)) continue;
      
      await ctx.runMutation(internal.shipments.internal.internalUpsertTrackingEvent, {
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
  },
});

/**
 * Detect carrier based on tracking number.
 */
export const detectCarrierAction = action({
  args: { tracking_number: v.string() },
  handler: async (ctx, args): Promise<any> => {
    const result = await trackingAdapter.detectCarrier(args.tracking_number);
    if (result) return result;

    try {
      const tracking = getTracking(args.tracking_number);
      if (tracking && tracking.courier && tracking.courier.name) {
        const courierName = tracking.courier.name;
        const carrierId = await ctx.runQuery(api.tracking.carriers.findCarrierId, { searchTerm: courierName });
        if (carrierId) {
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

/**
 * Get tracking API quota.
 */
export const get17TrackQuota = action({
  args: { sessionId: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    await requireUserAction(ctx, args.sessionId as any);
    const primaryProvider = process.env.PRIMARY_TRACKING_PROVIDER || "track17";
    if (primaryProvider !== "track17") return { error: "DISABLED" };
    if (!process.env.TRACK17_API_KEY) return { error: "MISSING_KEY" };
    return await trackingAdapter.getQuota("track17");
  },
});

/**
 * Update a shipment with new data (usually from a webhook).
 */
export const refreshShipmentByData = action({
  args: {
    tracking_number: v.string(),
    carrier_code: v.optional(v.string()),
    status: v.string() as any,
    events: v.array(v.any()),
    raw_payload: v.string(),
    provider_metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // 1. Find the shipment(s) with this tracking number AND carrier code to prevent multi-tenant data bleed
    const shipments = await ctx.runQuery(internal.shipments.internal.listByTrackingNumberInternal, {
        tracking_number: args.tracking_number,
        carrier_code: args.carrier_code
    });

    if (shipments.length === 0) {
        console.warn(`[ACTION:refreshShipmentByData] No shipment found for ${args.tracking_number}`);
        return { success: false, reason: "NOT_FOUND" };
    }

    // 2. Update each instance (in case of multiple orgs, though rare)
    for (const shipment of shipments) {
        await ctx.runMutation(internal.shipments.internal.internalUpdateShipmentStatus, {
            id: shipment._id,
            status: args.status,
            carrier_code: args.carrier_code || shipment.carrier_code,
            events_raw: args.raw_payload,
            provider_metadata: args.provider_metadata,
        });

        for (const event of args.events) {
            try {
                const occurred_at = (typeof (event as any).occurred_at === 'number' && !isNaN((event as any).occurred_at))
                    ? (event as any).occurred_at 
                    : ((event as any).Date ? new Date((event as any).Date).getTime() : Date.now());

                if (isNaN(occurred_at)) continue;
                
                await ctx.runMutation(internal.shipments.internal.internalUpsertTrackingEvent, {
                    shipment_id: shipment._id,
                    status: String((event as any).status || (event as any).checkpoint_status || "update"),
                    message: String((event as any).message || (event as any).StatusDescription || "Webhook Update"),
                    location: String((event as any).location || (event as any).Details || ""),
                    occurred_at,
                    raw_payload: typeof (event as any).raw_payload === 'string' ? (event as any).raw_payload : JSON.stringify(event),
                    metadata: (event as any).metadata,
                });
            } catch (eventError) {
                console.error(`[ACTION:refreshShipmentByData] Failed to upsert event for ${shipment._id}:`, eventError);
            }
        }
    }

    return { success: true };
  },
});

/**
 * Re-track a shipment with a different carrier.
 */
export const retrackShipment = action({
  args: {
    id: v.id("shipments"),
    orgId: v.union(v.id("organizations"), v.string()),
    tracking_number: v.string(),
    carrier_code: v.string(),
    provider: v.union(v.literal("trackingmore"), v.literal("track123"), v.literal("track17")),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgMemberAction(ctx, args.orgId, args.sessionId);

    // 1. Add tracking to the new provider
    const result = await trackingAdapter.addTracking(
      args.tracking_number,
      args.carrier_code,
      args.provider,
      {}
    );

    // 2. Update the shipment document
    await ctx.runMutation(internal.shipments.internal.internalUpdateShipmentStatus, {
      id: args.id,
      status: result.status as any,
      estimated_delivery: result.estimated_delivery,
      events_raw: result.raw_payload,
      provider_metadata: result.provider_metadata,
      // Also update carrier and provider
      ...({
        carrier_code: args.carrier_code,
        provider: args.provider,
      } as any)
    });

    // 3. Purge old events and sync new ones
    // (In a real scenario, you might want to keep history, but here we sync fresh for the new carrier)
    for (const event of result.events) {
      const occurred_at = (typeof (event as any).occurred_at === 'number' && !isNaN((event as any).occurred_at))
          ? (event as any).occurred_at 
          : ((event as any).Date ? new Date((event as any).Date).getTime() : Date.now());

      if (isNaN(occurred_at)) continue;
      
      await ctx.runMutation(internal.shipments.internal.internalUpsertTrackingEvent, {
        shipment_id: args.id,
        status: String((event as any).status || (event as any).checkpoint_status || "update"),
        message: String((event as any).message || (event as any).StatusDescription || "Carrier Sync"),
        location: String((event as any).location || (event as any).Details || ""),
        occurred_at,
        raw_payload: typeof (event as any).raw_payload === 'string' ? (event as any).raw_payload : JSON.stringify(event),
        metadata: (event as any).metadata,
      });
    }

    return result;
  },
});
