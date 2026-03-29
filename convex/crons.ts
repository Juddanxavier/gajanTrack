import { cronJobs } from "convex/server";
import { internal, api } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "retention-cleanup",
  { hourUTC: 0, minuteUTC: 0 },
  internal.retention.performRetentionCleanup,
);

crons.daily(
  "session-cleanup",
  { hourUTC: 0, minuteUTC: 30 },
  internal.sessions.cleanupSessions,
);

crons.interval(
  "sync-active-shipments",
  { minutes: 30 },
  internal.shipments.syncActiveShipments,
);


crons.daily(
  "shipment-archiving",
  { hourUTC: 1, minuteUTC: 0 },
  internal.shipments.processShipmentArchiving,
);


crons.daily(
  "archived-shipment-cleanup",
  { hourUTC: 2, minuteUTC: 0 },
  internal.shipments.cleanupArchivedShipments,
);

export default crons;
