import { v } from "convex/values";

/**
 * Universal interface for Email delivery.
 */
export interface IEmailProvider {
  name: string;
  send(to: string, subject: string, variables: Record<string, string>): Promise<{ success: boolean; error?: string }>;
}

/**
 * Universal interface for WhatsApp delivery.
 */
export interface IWhatsAppProvider {
  name: string;
  send(to: string, templateId: string, variables: Record<string, string>): Promise<{ success: boolean; error?: string }>;
}

export type NotificationProvider = "resend" | "twilio" | "msg91" | "mock";
