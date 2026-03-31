import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { requireUserAction } from "./rbac";

/**
 * Professional User Provisioning via Clerk.
 * Only Admin can create Staff/Customers.
 * Staff can only create Customers for their own Organization.
 */
export const createUser = action({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("staff"), v.literal("customer")),
    orgId: v.string(), // The target organization ID
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. RBAC Enforcement
    const { user: currentUser } = await requireUserAction(ctx, args.sessionId);
    
    // 2. Pre-flight check: Does user already exist in Convex?
    const existingUser = await ctx.runQuery(api.users.queries.findCustomerByContact, {
      contact: args.email,
      orgId: args.orgId,
      sessionId: args.sessionId
    });

    if (existingUser && existingUser.isUser) {
      throw new Error(`Conflict: A user with the email ${args.email} already exists in this organization.`);
    }

    if (currentUser.role === 'staff') {
      // Staff can ONLY create customers in their own org
      if (args.role !== "customer") {
        throw new Error("Forbidden: Staff can only provision customer accounts");
      }
      if (currentUser.orgId !== args.orgId) {
        throw new Error("Forbidden: You cannot provision users for other organizations");
      }
    } else if (currentUser.role !== "admin") {
      throw new Error("Forbidden: Unauthorized to provision users");
    }

    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
    if (!CLERK_SECRET_KEY) {
      throw new Error("Configuration Error: CLERK_SECRET_KEY is missing");
    }

    // 2. Provision User via Clerk
    // We use Invitations for a professional "Industrial Grade" flow.
    // This allows the user to set their own password and join safely.
    const invitationResponse = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: args.email.trim().toLowerCase(),
        public_metadata: {
          role: args.role,
          orgId: args.orgId,
          phone: args.phone,
          name: args.name, // Will be used during user.created webhook processing
        },
        // Optional: notify: true is default for Clerk Invitations if configured
      }),
    });

    if (!invitationResponse.ok) {
      const errorData = await invitationResponse.json();
      console.error("Clerk API Error:", errorData);
      const message = errorData.errors?.[0]?.message || "Failed to create invitation in Clerk";
      throw new Error(message);
    }

    // 3. For immediate UI feedback, we can also create a placeholder in Convex
    // but usually the webhook will handle it once they sign up.
    // However, to show "Pending" users, we might want a 'pending_users' table.
    // For now, we'll rely on the clerk invitation flow.

    return { success: true };
  },
});
