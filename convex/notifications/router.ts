import { IEmailProvider, IWhatsAppProvider } from "./types";
import { ResendProvider } from "./providers/resend";
import { TwilioProvider } from "./providers/twilio";
import { Msg91Provider } from "./providers/msg91";
import { internal } from "../_generated/api";

const NOTIFICATION_PROVIDER = process.env.NOTIFICATION_PROVIDER || "msg91";

function formatStatus(status: string) {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * The NotificationRouter centralizes the choice of providers
 * and the logic for dispatching multi-channel alerts.
 */
export class NotificationRouter {
  private emailProvider: IEmailProvider;
  private whatsappProvider: IWhatsAppProvider;
  private msg91Provider: IWhatsAppProvider;

  constructor() {
    // Default fallback providers
    this.emailProvider = new ResendProvider();
    this.whatsappProvider = new TwilioProvider();
    this.msg91Provider = new Msg91Provider();
  }

  /**
   * Schedules a notification for background dispatch.
   */
  async notifyStatusUpdate(ctx: any, shipment: any, status: string) {
    const { 
        _id: shipmentId,
        customer_email, 
        customer_phone, 
        notification_preferences,
        customer_name,
        tracking_number,
        white_label_code
    } = shipment;

    const emailEnabled = notification_preferences?.email ?? true;
    const whatsappEnabled = notification_preferences?.whatsapp ?? true;

    console.log(`[NotificationRouter] Scheduling updates for ${tracking_number} (Status: ${status})`);

    // 1. Queue Email if enabled
    if (customer_email && emailEnabled) {
      await ctx.scheduler.runAfter(0, internal.notifications.actions.dispatchNotification, {
        shipmentId,
        type: "email",
        recipient: customer_email,
        status,
        variables: {
          customerName: customer_name,
          trackingNumber: tracking_number,
          status: status,
          whiteLabelCode: white_label_code
        }
      });
    }

    // 2. Queue WhatsApp if enabled
    if (customer_phone && whatsappEnabled) {
      await ctx.scheduler.runAfter(0, internal.notifications.actions.dispatchNotification, {
        shipmentId,
        type: "whatsapp",
        recipient: customer_phone,
        status,
        variables: {
          customer_name,
          status,
          white_label_code,
          tracking_number
        }
      });
    }
  }

  /**
   * Internal worker method to handle the actual provider call.
   * Called by the background action.
   */
  async dispatchToProvider(ctx: any, shipmentId: any, type: string, recipient: string, status: string, variables: any) {
     if (type === "email") {
        console.log(`[NotificationRouter] Dispatching Email to ${recipient} via ${NOTIFICATION_PROVIDER}`);
        const provider = this.emailProvider; // Resend is default for now
        
        const emailResult = await provider.send(recipient, `Shipment Update: ${status.toUpperCase()}`, {
          customerName: variables.customerName,
          trackingNumber: variables.trackingNumber,
          status: variables.status,
          whiteLabelCode: variables.whiteLabelCode
        });

        // Log to DB
        await ctx.runMutation(internal.communication.logCommunication, {
          shipmentId,
          type: "email",
          recipient,
          content: `Status: ${status}`,
          status: emailResult.success ? "sent" : "failed",
          messageId: emailResult.messageId,
          error: emailResult.error
        });
     } else if (type === "whatsapp") {
        console.log(`[NotificationRouter] Dispatching WhatsApp to ${recipient} via ${NOTIFICATION_PROVIDER}`);
        
        let provider: IWhatsAppProvider;
        
        // Strategy: If NOTIFICATION_PROVIDER is msg91 and it's an Indian number, use MSG91.
        // Otherwise, use Twilio (default).
        const hasMsg91Key = !!process.env.MSG91_AUTH_KEY;
        const isIndianNumber = recipient.startsWith("+91") || recipient.startsWith("91") || recipient.length === 10;
        
        provider = (NOTIFICATION_PROVIDER === "msg91" && hasMsg91Key && isIndianNumber) 
          ? this.msg91Provider 
          : this.whatsappProvider;

        console.log(`[NotificationRouter] Selected provider: ${provider.name}`);

        const whatsappResult = await provider.send(recipient, "shipment_status_update", {
          body_1: variables.customer_name || "Customer",
          body_2: formatStatus(variables.status),
          body_3: variables.white_label_code || variables.tracking_number
        });

        // Log to DB
        await ctx.runMutation(internal.communication.logCommunication, {
          shipmentId,
          type: "whatsapp",
          recipient,
          content: `Status Update: ${formatStatus(variables.status)}`,
          status: whatsappResult.success ? "sent" : "failed",
          messageId: whatsappResult.messageId,
          error: whatsappResult.error
        });
     }
  }
}

// Singleton for easy use in actions
export const notificationRouter = new NotificationRouter();
