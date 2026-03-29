import { IEmailProvider, IWhatsAppProvider } from "./types";
import { ResendProvider } from "./providers/resend";
import { TwilioProvider } from "./providers/twilio";
import { Msg91Provider } from "./providers/msg91";

/**
 * The NotificationRouter centralizes the choice of providers
 * and the logic for dispatching multi-channel alerts.
 */
export class NotificationRouter {
  private emailProvider: IEmailProvider;
  private whatsappProvider: IWhatsAppProvider;
  private msg91Provider: IWhatsAppProvider;

  constructor() {
    this.emailProvider = new ResendProvider();
    this.whatsappProvider = new TwilioProvider();
    this.msg91Provider = new Msg91Provider();
  }

  /**
   * Dispatches a notification based on a shipment status change.
   */
  async notifyStatusUpdate(shipment: any, status: string) {
    const { 
        customer_email, 
        customer_phone, 
        notification_preferences,
        tracking_number,
        white_label_code,
        customer_name
    } = shipment;

    // Default to true if preferences are missing (retro-compatibility)
    const emailEnabled = notification_preferences?.email ?? true;
    const whatsappEnabled = notification_preferences?.whatsapp ?? true;

    console.log(`[NotificationRouter] Notifying ${status} for ${tracking_number} (Email: ${emailEnabled}, WhatsApp: ${whatsappEnabled})`);

    const results = [];

    // 1. Email Channel
    if (customer_email && emailEnabled) {
      console.log(`[NotificationRouter] Dispatching Email to ${customer_email}`);
      results.push(this.emailProvider.send(customer_email, `Shipment Update: ${status.toUpperCase()}`, {
        customerName: customer_name,
        trackingNumber: tracking_number,
        status: status,
        whiteLabelCode: white_label_code
      }));
    }

    // 2. WhatsApp Channel
    if (customer_phone && whatsappEnabled) {
      console.log(`[NotificationRouter] Dispatching WhatsApp to ${customer_phone}`);
      
      // Use MSG91 for Indian numbers (+91), Twilio for others (as a slick heuristic)
      if (customer_phone.startsWith("+91") || customer_phone.startsWith("91")) {
        results.push(this.msg91Provider.send(customer_phone, "tracking_update", {
          trackingNumber: white_label_code || tracking_number,
          status: status
        }));
      } else {
        results.push(this.whatsappProvider.send(customer_phone, "tracking_update", {
          trackingNumber: white_label_code || tracking_number,
          status: status
        }));
      }
    }

    return Promise.all(results);
  }
}

// Singleton for easy use in actions
export const notificationRouter = new NotificationRouter();
