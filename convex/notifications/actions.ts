import { v } from "convex/values";
import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { notificationRouter } from "./router";
import { requireOrgMemberAction } from "../rbac";

/**
 * Background worker to dispatch notifications with idempotency and rate limiting.
 */
export const dispatchNotification = internalAction({
  args: {
    shipmentId: v.id("shipments"),
    type: v.union(v.literal("whatsapp"), v.literal("email")),
    recipient: v.string(),
    status: v.string(), // status slug like 'ready_for_pickup'
    variables: v.any(),
  },
  handler: async (ctx, args) => {
    const { shipmentId, type, recipient, status, variables } = args;

    console.log(`[Worker] Dispatching ${type} to ${recipient} (Status: ${status})`);

    // 1. Idempotency Check (Prevent duplicates)
    const alreadySent = await ctx.runQuery(internal.communication.checkAlreadySent, {
      shipmentId,
      type,
      content: `Status: ${status}`, // We use this string for status-based uniqueness
    });

    if (alreadySent) {
      console.warn(`[Worker] Duplicate prevented for ${shipmentId} (${type}/${status})`);
      return;
    }

    // 2. Rate Limiting Check (Prevent spam)
    const isRateLimited = await ctx.runQuery(internal.communication.checkRateLimit, {
      recipient,
      minutes: 5,
      limit: 5, // Allow 5 messages per 5 minutes to the same recipient
    });

    if (isRateLimited) {
      console.error(`[Worker] Rate limit exceeded for ${recipient}. Skipping notification.`);
      return;
    }

    // 3. Dispatch via Router
    // This calls the appropriate provider based on settings and logic
    await notificationRouter.dispatchToProvider(ctx, shipmentId, type, recipient, status, variables);
  },
});

export const sendStatusUpdate = internalAction({
  args: {
    id: v.id("shipments"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const shipment = await ctx.runQuery(internal.shipments.internal.internalGetShipment, { id: args.id });
    if (!shipment) return;

    const prefs = shipment.notification_preferences || { email: true, whatsapp: true };
    const variables = {
      name: shipment.customer_name || "Customer",
      trackingNumber: shipment.tracking_number,
      status: args.status,
    };

    if (prefs.whatsapp && shipment.customer_phone) {
      await ctx.runAction(internal.notifications.actions.dispatchNotification, {
        shipmentId: args.id,
        type: "whatsapp",
        recipient: shipment.customer_phone,
        status: args.status,
        variables,
      });
    }

    if (prefs.email && shipment.customer_email) {
      await ctx.runAction(internal.notifications.actions.dispatchNotification, {
        shipmentId: args.id,
        type: "email",
        recipient: shipment.customer_email,
        status: args.status,
        variables,
      });
    }
  }
});

export const sendManualNotification = action({
  args: {
    id: v.id("shipments"),
    status: v.string(),
    orgId: v.union(v.id("organizations"), v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Enforce RBAC
    await requireOrgMemberAction(ctx, args.orgId, args.sessionId);

    // 2. Fetch Shipment Details
    const shipment = await ctx.runQuery(internal.shipments.internal.internalGetShipment, { id: args.id });
    if (!shipment) throw new Error("Shipment not found");

    if (shipment.orgId !== args.orgId) throw new Error("Forbidden: Shipment belongs to another organization");

    if (!shipment.customer_phone) {
        return { success: false, message: "No phone number available." };
    }

    const variables = {
      name: shipment.customer_name || "Customer",
      trackingNumber: shipment.tracking_number,
      status: args.status,
    };

    try {
        await ctx.runAction(internal.notifications.actions.dispatchNotification, {
            shipmentId: args.id,
            type: "whatsapp",
            recipient: shipment.customer_phone,
            status: args.status,
            variables,
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
  }
});


