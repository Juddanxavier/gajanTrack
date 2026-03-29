import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const logWebhook = internalMutation({
  args: {
    provider: v.string(),
    payload: v.string(),
    headers: v.any(),
    status: v.union(v.literal("received"), v.literal("processed"), v.literal("error")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhook_logs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateWebhookStatus = internalMutation({
  args: {
    id: v.id("webhook_logs"),
    status: v.union(v.literal("processed"), v.literal("error")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      processedAt: Date.now(),
    });
  },
});
