import { action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { notificationRouter } from "./router";

/**
 * Full end-to-end automated test for the notification system.
 * 1. Creates a dummy shipment
 * 2. Simulates a status update
 * 3. Dispatches notifications
 * 4. Cleaning up is handled by the user or a separate cleanup job
 */
export const runNotificationTest = action({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const testId = `test_${Date.now()}`;
    console.log(`[TEST:runNotificationTest] Starting with ID: ${testId}`);

    // We can't easily create a real shipment document from an action without mutations
    // So we'll simulate the shipment object that the router expects
    const mockShipment = {
      tracking_number: "TEST12345678",
      white_label_code: "WH-TEST-001",
      customer_name: "Test User",
      customer_email: args.email || "test@example.com",
      customer_phone: args.phone || "+919999999999",
      notification_preferences: {
        email: true,
        whatsapp: true
      }
    };

    console.log(`[TEST] Simulated Shipment:`, mockShipment);

    try {
      // 1. Email
      const emailRes = mockShipment.customer_email ? 
        await notificationRouter.notifyStatusUpdate({ ...mockShipment, customer_phone: null }, "delivered") : [{ success: false, error: "No Email Provided" }];
      
      // 2. WhatsApp
      const waRes = mockShipment.customer_phone ? 
        await notificationRouter.notifyStatusUpdate({ ...mockShipment, customer_email: null }, "delivered") : [{ success: false, error: "No Phone Provided" }];

      return {
        success: true,
        message: "Automated test executed",
        details: {
          email: emailRes[0].success ? "SENT ✅" : `FAILED ❌ (${emailRes[0].error || 'Unknown Error'})`,
          whatsapp: waRes[0].success ? "SENT ✅" : `FAILED ❌ (${waRes[0].error || 'Unknown Error'})`
        },
        target: {
          email: mockShipment.customer_email,
          phone: mockShipment.customer_phone
        }
      };
    } catch (error) {
      console.error(`[TEST] Automated test failed:`, error);
      return {
        success: false,
        error: String(error)
      };
    }
  }
});
