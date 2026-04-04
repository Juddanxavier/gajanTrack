import { IWhatsAppProvider } from "../types";

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_INTEGRATED_NUMBER = process.env.MSG91_INTEGRATED_NUMBER;
const MSG91_WHATSAPP_NAMESPACE = process.env.MSG91_WHATSAPP_NAMESPACE;

export class Msg91Provider implements IWhatsAppProvider {
  name = "msg91";

  async send(to: string, templateId: string, variables: Record<string, string>): Promise<{ success: boolean; messageId?: string; error?: string }> {
    let recipient = to.replace(/\D/g, ""); // MSG91 usually wants plain numbers with country code
    
    // Auto-prefix 10-digit Indian numbers with 91
    if (recipient.length === 10) {
      recipient = "91" + recipient;
    }

    console.log(`[Msg91Provider] Sending WhatsApp to ${recipient} (Template: ${templateId})`);

    if (!MSG91_AUTH_KEY || !MSG91_INTEGRATED_NUMBER) {
      console.warn(`[Msg91Provider] Credentials missing. Mocking success.`);
      return { success: true };
    }

    try {
      // Build components object dynamically
      const components: any = {};
      
      // Map header_1 / h1
      const headerVal = variables.header_1 || variables.h1 || variables.header;
      if (headerVal) {
        components.header_1 = {
          type: "text",
          value: headerVal
        };
      }

      // Map body_n / bn / numbers
      Object.entries(variables).forEach(([key, value]) => {
        const match = key.match(/^(?:body_)?(\d+)$/) || key.match(/^b(\d+)$/);
        if (match) {
          const index = match[1];
          components[`body_${index}`] = {
            type: "text",
            value: String(value)
          };
        }
      });

      // Mapping standard variables if positional ones aren't provided
      if (!Object.keys(components).some(k => k.startsWith('body_'))) {
        if (variables.trackingNumber) components.body_1 = { type: "text", value: variables.trackingNumber };
        if (variables.status) components.body_2 = { type: "text", value: variables.status };
        if (variables.customerName) components.body_3 = { type: "text", value: variables.customerName };
      }

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
            namespace: MSG91_WHATSAPP_NAMESPACE,
            to_and_components: [
              {
                to: [recipient],
                components
              }
            ]
          }
        }
      };

      console.log(`[Msg91Provider] Payload:`, JSON.stringify(payload));

      const response = await fetch("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authkey": MSG91_AUTH_KEY || "",
          "accept": "application/json"
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error(`[Msg91Provider] API Error:`, result);
        return { success: false, error: result.message || JSON.stringify(result) };
      }

      const requestId = result.request_id || result.status;
      console.log(`[Msg91Provider] WhatsApp sent successfully. Request ID:`, requestId);
      return { success: true, messageId: String(requestId) };
    } catch (error) {
      console.error(`[Msg91Provider] Exception occurred:`, error);
      return { success: false, error: String(error) };
    }
  }
}
