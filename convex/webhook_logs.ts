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

/**
 * Internal mutation to cleanup webhook logs.
 * Deletes logs older than 30 days.
 */
export const cleanupWebhookLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cutoff = now - THIRTY_DAYS_MS;

    const toDelete = await ctx.db
      .query("webhook_logs")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(100);

    if (toDelete.length > 0) {
        console.log(`[CLEANUP] Purged ${toDelete.length} old webhook logs.`);
    }

    for (const log of toDelete) {
      await ctx.db.delete(log._id);
    }

    return toDelete.length;
  },
});
