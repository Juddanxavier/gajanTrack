import { IEmailProvider } from "../types";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export class ResendProvider implements IEmailProvider {
  name = "resend";

  async send(to: string, subject: string, variables: Record<string, string>): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[ResendProvider] Sending Email to ${to}: ${subject}`);

    if (!RESEND_API_KEY) {
      console.warn(`[ResendProvider] API Key missing. Mocking success.`);
      return { success: true };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Kajen Tracking <tracking@kajen.io>",
          to: [to],
          subject: subject,
          html: `<strong>Hello ${variables.customerName || 'Customer'}</strong>,<br/><br/>Your shipment ${variables.trackingNumber} is now <strong>${variables.status}</strong>.<br/><br/>Link: ${variables.whiteLabelCode || variables.trackingNumber}`,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error(`[ResendProvider] Error:`, result);
        return { success: false, error: result.message || JSON.stringify(result) };
      }

      console.log(`[ResendProvider] Email sent:`, result.id);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error(`[ResendProvider] Exception:`, error);
      return { success: false, error: String(error) };
    }
  }
}
