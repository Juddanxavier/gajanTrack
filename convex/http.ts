import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { Webhook } from "svix";
import { trackingMore, track123, track17 } from "./tracking/router";
import { TrackingResult } from "./tracking/types";

/**
 * HTTP Router for Webhooks
 */
const http = httpRouter();

/**
 * Helper to process a normalized tracking result from a webhook.
 */
async function handleTrackingWebhook(ctx: any, result: TrackingResult | TrackingResult[], logId?: Id<"webhook_logs">) {
    try {
        const results = Array.isArray(result) ? result : [result];
        
        for (const res of results) {
            await ctx.runAction(api.shipments.actions.refreshShipmentByData, {
                tracking_number: res.tracking_number,
                carrier_code: res.carrier_code,
                status: res.status,
                events: res.events,
                raw_payload: res.raw_payload,
                provider_metadata: res.provider_metadata,
            });
        }

        if (logId) {
            await ctx.runMutation(internal.webhook_logs.updateWebhookStatus, {
                id: logId,
                status: "processed",
            });
        }
    } catch (error: any) {
        console.error(`[handleTrackingWebhook] Error processing results:`, error);
        if (logId) {
            await ctx.runMutation(internal.webhook_logs.updateWebhookStatus, {
                id: logId,
                status: "error",
                error: error.message || String(error),
            });
        }
        throw error;
    }
}

async function logRequest(ctx: any, provider: string, request: Request) {
    const payload = await request.clone().text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
        headers[key] = value;
    });

    return await ctx.runMutation(internal.webhook_logs.logWebhook, {
        provider,
        payload,
        headers,
        status: "received",
    });
}

function verifyWebhookSecret(request: Request) {
    const SECRET = process.env.TRACKING_WEBHOOK_SECRET;
    if (SECRET) {
        const auth = request.headers.get("authorization") || request.headers.get("x-webhook-secret");
        if (auth !== SECRET && auth !== `Bearer ${SECRET}`) {
            throw new Error("Unauthorized: Invalid webhook secret");
        }
    }
}

http.route({
  path: "/hi",
  method: "GET",
  handler: httpAction(async (ctx) => {
    return new Response("Hello from Convex!", { status: 200 });
  }),
});

http.route({
  path: "/webhooks/track17",
  method: "GET",
  handler: httpAction(async (ctx) => {
    return new Response("Track17 Webhook Endpoint Active", { status: 200 });
  }),
});

http.route({
  path: "/auth-debug",
  method: "GET",
  handler: httpAction(async (ctx) => {
    return new Response(JSON.stringify({ 
        msg: "CHECKPOINT: Router Reached!",
        hasClerkSecret: !!process.env.CLERK_SECRET_KEY 
    }), { status: 200 });
  }),
});

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payloadString = await request.text();
    const headerPayload = request.headers;

    const svixId = headerPayload.get("svix-id");
    const svixTimestamp = headerPayload.get("svix-timestamp");
    const svixSignature = headerPayload.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Error occurred -- no svix headers", {
        status: 400,
      });
    }

    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error("Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to Convex environment variables");
    }

    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;

    try {
      evt = wh.verify(payloadString, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response("Error occurred", { status: 400 });
    }

    const { id } = evt.data;
    const eventType = evt.type;

    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const { 
          id, 
          email_addresses, 
          first_name, 
          last_name, 
          image_url,
          public_metadata 
        } = evt.data;
        
        const email = email_addresses[0]?.email_address;
        const name = `${first_name || ""} ${last_name || ""}`.trim();
        
        // Extract custom role, phone, and orgId from Clerk public metadata
        const role = public_metadata?.role as "admin" | "staff" | "customer" | undefined;
        const phone = public_metadata?.phone as string | undefined;
        const orgId = public_metadata?.orgId as string | undefined;

        await ctx.runMutation(api.users.mutations.syncUser, {
          externalId: id,
          email,
          name: name || undefined,
          image: image_url || undefined,
          phone,
          role,
          orgId: orgId as Id<"organizations"> | undefined,
        });
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;
        if (id) {
          await ctx.runMutation(api.users.mutations.deleteUser, {
            externalId: id,
          });
        }
        break;
      }
    }

    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/webhooks/trackingmore",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    verifyWebhookSecret(request);
    const logId = await logRequest(ctx, "trackingmore", request);
    try {
        const payload = await request.json();
        const result = trackingMore.normalizeWebhook(payload);
        await handleTrackingWebhook(ctx, result, logId);
    } catch (e: any) {
        console.error("Failed to parse TrackingMore webhook:", e);
        await ctx.runMutation(internal.webhook_logs.updateWebhookStatus, {
            id: logId,
            status: "error",
            error: e.message || String(e),
        });
    }
    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/webhooks/trackingmore",
  method: "GET",
  handler: httpAction(async (ctx) => {
    return new Response("TrackingMore Webhook Endpoint Active", { status: 200 });
  }),
});

http.route({
  path: "/webhooks/track123",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    verifyWebhookSecret(request);
    const logId = await logRequest(ctx, "track123", request);
    try {
        const payload = await request.json();
        const result = track123.normalizeWebhook(payload);
        await handleTrackingWebhook(ctx, result, logId);
    } catch (e: any) {
        console.error("Failed to parse Track123 webhook:", e);
        await ctx.runMutation(internal.webhook_logs.updateWebhookStatus, {
            id: logId,
            status: "error",
            error: e.message || String(e),
        });
    }
    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/webhooks/track123",
  method: "GET",
  handler: httpAction(async (ctx) => {
    return new Response("Track123 Webhook Endpoint Active", { status: 200 });
  }),
});

http.route({
  path: "/webhooks/track17",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    verifyWebhookSecret(request);
    const logId = await logRequest(ctx, "track17", request);
    try {
        const payload = await request.json();
        const result = track17.normalizeWebhook(payload);
        await handleTrackingWebhook(ctx, result, logId);
    } catch (e: any) {
        console.error("Failed to parse Track17 webhook:", e);
        await ctx.runMutation(internal.webhook_logs.updateWebhookStatus, {
            id: logId,
            status: "error",
            error: e.message || String(e),
        });
    }
    return new Response(null, { status: 200 });
  }),
});

export default http;
