import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Search for carriers in the local database.
 * Used to populate carrier selection dropdowns in the UI.
 */
export const search = query({
  args: { 
    query: v.string(), // Name or ISO code
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();
    const limit = args.limit || 20;

    // Direct match by ISO code (exact)
    if (searchTerm.length === 2) {
        const byIso = await ctx.db
            .query("carriers")
            .withIndex("by_country_iso", q => q.eq("country_iso", searchTerm.toUpperCase()))
            .take(limit);
        if (byIso.length > 0) return byIso;
    }

    // Keyword search in name
    // Note: Convex doesn't have a native "contains" index, but for ~3k records, 
    // a small filter is fast enough if we don't do it too often.
    // In a production app with more data, we'd use a search index.
    const all = await ctx.db.query("carriers").collect();
    
    return all
        .filter(c => 
            c.name.toLowerCase().includes(searchTerm) || 
            (c.name_zh && c.name_zh.toLowerCase().includes(searchTerm))
        )
        .slice(0, limit);
  },
});

/**
 * Get a specific carrier by its numeric key.
 */
export const getByKey = query({
  args: { key: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("carriers")
      .withIndex("by_key", q => q.eq("key", args.key))
      .unique();
  },
});
/**
 * Find the best matching carrier numeric key for a given search term.
 * Used for automated mapping in actions.
 */
export const findCarrierId = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const term = args.searchTerm.trim().toLowerCase();
    if (!term) return null;

    // 1. If it's already a number, just return it
    const num = Number(term);
    if (!isNaN(num) && term !== "") return num;

    // 2. Try exact name match
    const carriers = await ctx.db.query("carriers").collect();
    
    // Priority 1: Exact name match
    const exactMatch = carriers.find(c => c.name.toLowerCase() === term);
    if (exactMatch) return exactMatch.key;

    // Priority 2: Fuzzy name match (starting with)
    const startsWithMatch = carriers.find(c => c.name.toLowerCase().startsWith(term));
    if (startsWithMatch) return startsWithMatch.key;

    // Priority 3: Contains match
    const containsMatch = carriers.find(c => c.name.toLowerCase().includes(term));
    if (containsMatch) return containsMatch.key;

    return null;
  },
});
