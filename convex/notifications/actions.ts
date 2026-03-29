import { v } from "convex/values";
import { internalAction, action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { notificationRouter } from "./router";

/**
 * Async action to dispatch notifications for a shipment.
 */
export const sendStatusUpdate = internalAction({
  args: { 
    id: v.id("shipments"), 
    status: v.string() 
  },
  handler: async (ctx, args): Promise<void> => {
    // 1. Fetch shipment data (with internal query to bypass RBAC if needed)
    const shipment = (await ctx.runQuery(internal.shipments.getShipmentInternal, { id: args.id })) as any;
    
    if (!shipment) {
      console.error(`[NotificationAction] Shipment ${args.id} not found`);
      return;
    }

    // 2. Dispatch via router
    try {
        await notificationRouter.notifyStatusUpdate(shipment, args.status);
    } catch (error) {
        console.error(`[NotificationAction] Failed to dispatch notifications:`, error);
    }
  },
});

/**
 * Public debug action to test notifications for a specific shipment.
 * Run via: npx convex run notifications/actions:testNotification '{"id":"YOUR_ID_HERE", "status": "delivered"}'
 */
export const testNotification = action({
    args: {
        id: v.id("shipments"),
        status: v.optional(v.string())
    },
    handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
        const shipment = (await ctx.runQuery(internal.shipments.getShipmentInternal, { id: args.id })) as any;
        if (!shipment) throw new Error("Shipment not found");

        console.log(`[TEST] Manually triggering notification for ${shipment.tracking_number} (Status: ${args.status || 'test_sync'})`);
        
        // Use the router directly for a clean test
        const notifyResults = await notificationRouter.notifyStatusUpdate(shipment, args.status || 'test_sync');
        console.log(`[TEST] Notification results:`, notifyResults);
        
        const response = { 
            success: true, 
            message: `Notification dispatched for ${shipment.tracking_number}`,
            channels: notifyResults.length,
            prefs: shipment.notification_preferences
        };
        console.log(`[TEST] Returning:`, response);
        return response;
    }
});
