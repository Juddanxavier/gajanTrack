import { IWhatsAppProvider } from "../types";

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_INTEGRATED_NUMBER = process.env.MSG91_INTEGRATED_NUMBER;

export class Msg91Provider implements IWhatsAppProvider {
  name = "msg91";

  async send(to: string, templateId: string, variables: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    const recipient = to.replace(/\D/g, ""); // MSG91 usually wants plain numbers with country code
    console.log(`[Msg91Provider] Sending WhatsApp to ${recipient} (Template: ${templateId})`);

    if (!MSG91_AUTH_KEY || !MSG91_INTEGRATED_NUMBER) {
      console.warn(`[Msg91Provider] Credentials missing. Mocking success.`);
      return { success: true };
    }

    try {
      // MSG91 WhatsApp V5 Bulk/Template structure
      const payload = {
        integrated_number: MSG91_INTEGRATED_NUMBER,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: templateId,
            language: {
              code: "en",
              policy: "deterministic"
            },
            to_and_components: [
              {
                to: [recipient],
                components: {
                  body_1: {
                    type: "text",
                    value: variables.trackingNumber
                  },
                  body_2: {
                    type: "text",
                    value: variables.status
                  }
                }
              }
            ]
          }
        }
      };

      const response = await fetch("https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authkey": MSG91_AUTH_KEY,
          "accept": "application/json"
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error(`[Msg91Provider] Error:`, result);
        return { success: false, error: result.message || JSON.stringify(result) };
      }

      console.log(`[Msg91Provider] WhatsApp sent:`, result.request_id || result.status);
      return { success: true };
    } catch (error) {
      console.error(`[Msg91Provider] Exception:`, error);
      return { success: false, error: String(error) };
    }
  }
}
