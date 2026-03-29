import { mutation } from "./_generated/server";

/**
 * Quick fix for killerbean122@gmail.com
 * Run with: npx convex run seedAdmin:promoteMe
 */
export const promoteMe = mutation({
  args: {},
  handler: async (ctx) => {
    // We saw two IDs for the same email, let's promote both just in case
    const ids = [
      "user_3BM1L5udnnQtxipJJLbgoThmrGl",
      "user_3B90ybSFfEN9ITsQerYAjEhQpgB"
    ];

    for (const externalId of ids) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
        .unique();

      if (user) {
        await ctx.db.patch(user._id, { role: "admin" });
        console.log(`User ${externalId} promoted to admin.`);
      }
    }
    
    return { success: true, message: "Promotion attempts completed for all matching IDs." };
  },
});
