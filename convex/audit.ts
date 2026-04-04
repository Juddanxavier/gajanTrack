import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function logAction(
  ctx: MutationCtx,
  args: {
    userId: string;
    orgId: Id<"organizations"> | string;
    action: string;
    entityId: string;
    entityType: string;
    details?: any;
  }
) {
  await ctx.db.insert("audit_logs", {
    userId: args.userId,
    orgId: String(args.orgId),
    action: args.action,
    entityId: args.entityId,
    entityType: args.entityType,
    details: args.details ?? {},
    timestamp: Date.now(),
  });
}
