import { IWhatsAppProvider } from "../types";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., "whatsapp:+14155238886"

export class TwilioProvider implements IWhatsAppProvider {
  name = "twilio";

  async send(to: string, templateId: string, variables: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    console.log(`[TwilioProvider] Sending WhatsApp to ${to} (Template: ${templateId})`);

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      console.warn(`[TwilioProvider] Credentials missing. Mocking success.`);
      return { success: true };
    }

    try {
      // Twilio WhatsApp API using Basic Auth
      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      
      // Twilio expects form-urlencoded for this endpoint
      const params = new URLSearchParams();
      params.append('To', `whatsapp:${to}`);
      params.append('From', `whatsapp:${TWILIO_WHATSAPP_NUMBER}`);
      params.append('Body', `Your shipment ${variables.trackingNumber} is now ${variables.status}.`);

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        console.error(`[TwilioProvider] Error:`, result);
        return { success: false, error: result.message || JSON.stringify(result) };
      }

      console.log(`[TwilioProvider] WhatsApp sent:`, result.sid);
      return { success: true };
    } catch (error) {
      console.error(`[TwilioProvider] Exception:`, error);
      return { success: false, error: String(error) };
    }
  }
}
