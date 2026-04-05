import { internalMutation } from "./_generated/server";

export const performRetentionCleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // 1. Cleanup Soft Deleted Quotes (30 days)
    const toDelete = await ctx.db
      .query("quotes")
      .withIndex("by_deletion_time", (q) => q.lt("deletionTime", now))
      .take(100);
    
    for (const quote of toDelete) {
      await ctx.db.delete(quote._id);
    }

    // 2. Cleanup Archived Quotes (24 months)
    const TWENTY_FOUR_MONTHS = 24 * 30 * 24 * 60 * 60 * 1000;
    const archiveCutoff = now - TWENTY_FOUR_MONTHS;
    
    const toPurgeFromArchive = await ctx.db
      .query("quotes")
      .withIndex("by_archived_time", (q) => q.lt("archivedTime", archiveCutoff))
      .take(100);
    
    for (const quote of toPurgeFromArchive) {
      await ctx.db.delete(quote._id);
    }

    // 3. Notification Retention (14 days to Archive, 60 days to Delete)
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
    const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;

    const archiveThreshold = now - FOURTEEN_DAYS;
    const deleteThreshold = now - SIXTY_DAYS;

    // Archive unarchived notifications older than 14 days
    const toArchive = await ctx.db
      .query("admin_notifications")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", archiveThreshold))
      .filter((q) => q.eq(q.field("archivedAt"), undefined))
      .take(100);

    for (const n of toArchive) {
      await ctx.db.patch(n._id, { archivedAt: now });
    }

    // Permanently delete archived notifications older than 60 days
    const toDeleteFinal = await ctx.db
      .query("admin_notifications")
      .withIndex("by_archivedAt", (q) => q.lt("archivedAt", deleteThreshold))
      .take(100);

    for (const n of toDeleteFinal) {
      await ctx.db.delete(n._id);
    }

    if (toDelete.length > 0 || toPurgeFromArchive.length > 0 || toArchive.length > 0 || toDeleteFinal.length > 0) {
        console.log(`[RETENTION] Quotes: Purged ${toDelete.length} deleted, ${toPurgeFromArchive.length} archived.`);
        console.log(`[RETENTION] Notifications: Archived ${toArchive.length}, Deleted ${toDeleteFinal.length}.`);
    }

    // 4. Cleanup Shipments scheduled for deletion
    // SAFETY GUARDS: Only delete shipments that are:
    // - Explicitly archived (archived_at is set)
    // - Not in an active transit status
    // - Have a scheduled_for_deletion_at in the past
    const toDeleteShipments = await ctx.db
      .query("shipments")
      .withIndex("by_scheduled_for_deletion_at", (q) => q.lt("scheduled_for_deletion_at", now))
      .filter((q) => q.and(
          q.neq(q.field("archived_at"), undefined),   // MUST be archived first
          q.neq(q.field("status"), "pending"),         // Never delete active shipments
          q.neq(q.field("status"), "in_transit"),
          q.neq(q.field("status"), "out_for_delivery"),
          q.neq(q.field("status"), "info_received"),
      ))
      .take(100);

    for (const shipment of toDeleteShipments) {
      // Cascading delete: tracking_events
      const trackingEvents = await ctx.db
        .query("tracking_events")
        .withIndex("by_shipment_id", (q) => q.eq("shipment_id", shipment._id))
        .collect();
      for (const event of trackingEvents) {
        await ctx.db.delete(event._id);
      }

      // Cascading delete: communication_logs
      const commLogs = await ctx.db
        .query("communication_logs")
        .withIndex("by_shipmentId", (q) => q.eq("shipmentId", shipment._id))
        .collect();
      for (const log of commLogs) {
        await ctx.db.delete(log._id);
      }

      // Finally, delete the shipment itself
      await ctx.db.delete(shipment._id);
    }

    if (toDeleteShipments.length > 0) {
      console.log(`[RETENTION] Shipments: Purged ${toDeleteShipments.length} scheduled for deletion (with cascading events/logs).`);
    }
  },
});
