import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireUser } from "../rbac";

/**
 * Get the current user based on the authentication identity.
 */
export const getCurrentUser = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const { user } = await requireUser(ctx, args.sessionId);
      return user;
    } catch (err) {
      return null;
    }
  },
});

/**
 * Find a customer by email or phone.
 */
export const findCustomerByContact = query({
  args: { 
    contact: v.string(), 
    orgId: v.union(v.id("organizations"), v.string()),
    sessionId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const contact = args.contact.trim();
    if (!contact || contact.length < 3) return null;
    
    const userByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", contact))
      .unique();
      
    const userByPhone = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", contact))
      .unique();

    const foundUser = userByEmail || userByPhone;
    
    // Check if the found user belongs to the requested organization
    if (foundUser && foundUser.orgId === args.orgId) {
      return { ...foundUser, isUser: true };
    }

    const recentShipment = await ctx.db
      .query("shipments")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.or(
          q.eq(q.field("customer_email"), contact),
          q.eq(q.field("customer_phone"), contact)
      ))
      .order("desc")
      .first();

    if (recentShipment) {
      return {
        name: recentShipment.customer_name,
        email: recentShipment.customer_email,
        phone: recentShipment.customer_phone,
        isUser: false,
      };
    }

    return null;
  },
});

/**
 * List users (RBAC enforced).
 */
export const listUsers = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.sessionId);
    if (user.role === "admin") return await ctx.db.query("users").collect();
    if (user.role === "staff" && user.orgId) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_orgId", (q) => q.eq("orgId", user.orgId!))
        .collect();
      return users.filter(u => u.role !== "admin");
    }
    throw new Error("Forbidden: Access denied");
  },
});

/**
 * Get user stats.
 */
export const getUserStats = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user: currentUser } = await requireUser(ctx, args.sessionId);
    let users = [];
    if (currentUser.role === "admin") users = await ctx.db.query("users").collect();
    else if (currentUser.role === "staff" && currentUser.orgId) {
       users = await ctx.db.query("users").withIndex("by_orgId", q => q.eq("orgId", currentUser.orgId!)).collect();
    } else throw new Error("Forbidden: Access denied");

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const trendMap: Record<string, { total: number, admin: number, staff: number, customer: number }> = {};
    for (let i = 0; i < 7; i++) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        trendMap[date] = { total: 0, admin: 0, staff: 0, customer: 0 };
    }

    users.forEach(u => {
        if (u.createdAt && u.createdAt >= now - SEVEN_DAYS_MS) {
            const date = new Date(u.createdAt).toISOString().split('T')[0];
            if (trendMap[date]) {
                trendMap[date].total++;
                if (u.role === 'admin') trendMap[date].admin++;
                if (u.role === 'staff') trendMap[date].staff++;
                if (u.role === 'customer') trendMap[date].customer++;
            }
        }
    });

    const sparklines = Object.entries(trendMap)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: users.length,
      admin: users.filter(u => u.role === 'admin').length,
      staff: users.filter(u => u.role === 'staff').length,
      customer: users.filter(u => u.role === 'customer').length,
      sparklines: {
        total: sparklines.map(s => ({ count: s.total })),
        admin: sparklines.map(s => ({ count: s.admin })),
        staff: sparklines.map(s => ({ count: s.staff })),
        customer: sparklines.map(s => ({ count: s.customer })),
      }
    };
  },
});

/**
 * Get a specific user by ID.
 */
export const getUser = query({
  args: { id: v.id("users"), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user: currentUser } = await requireUser(ctx, args.sessionId);
    const user = await ctx.db.get(args.id);
    if (!user) return null;

    // RBAC: Admins can see everyone. Staff can only see users in their org and not other admins.
    if (currentUser.role === "admin") return user;
    if (currentUser.role === "staff") {
      if (user.orgId === currentUser.orgId && user.role !== "admin") return user;
    }
    
    // Users can see themselves
    if (user.externalId === currentUser.externalId) return user;

    throw new Error("Forbidden: Access denied to this user record");
  },
});
