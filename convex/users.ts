import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAdmin, requireUser } from "./rbac";

/**
 * Sync user from Clerk webhook to Convex database.
 */
export const syncUser = mutation({
  args: {
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    role: v.optional(v.union(v.literal("admin"), v.literal("staff"), v.literal("customer"))),
    orgId: v.optional(v.union(v.id("organizations"), v.string())),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    const role = args.role || (existingUser?.role ?? "customer");
    const orgId = args.orgId || existingUser?.orgId;

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        image: args.image,
        phone: args.phone,
        avatarUrl: args.avatarUrl,
        role,
        orgId,
      });
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      externalId: args.externalId,
      email: args.email,
      name: args.name,
      image: args.image,
      phone: args.phone,
      avatarUrl: args.avatarUrl,
      createdAt: args.createdAt || Date.now(),
      role,
      orgId,
    });

    // Notify admins about new user registration
    if (orgId) {
      await ctx.db.insert("admin_notifications", {
        orgId: orgId,
        type: "user_signup",
        title: "New User Registered",
        message: `${args.name || args.email || "A new user"} has joined the organization as a ${role}.`,
        link: `/dashboard/users`,
        isRead: false,
        priority: role === "customer" ? "low" : "medium",
        createdAt: Date.now(),
      });
    }

    return userId;
  },
});

/**
 * Delete a user from Convex when deleted in Clerk.
 */
export const deleteUser = mutation({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});


/**
 * Just-In-Time (JIT) sync to create user record if missing but Clerk is authenticated.
 */
export const jitSync = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated: No Clerk identity found");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (existingUser) return existingUser._id;

    // Bootstrap Logic: If no admins exist yet, make this user an admin
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .collect();
    const noAdminsExist = admins.length === 0;

    // Ensure at least one organization exists
    const orgs = await ctx.db.query("organizations").collect();
    let defaultOrgId: Id<"organizations">;
    if (orgs.length === 0) {
      defaultOrgId = await ctx.db.insert("organizations", {
        name: "Main Branch",
        slug: "main-branch",
        currency: "INR",
        createdAt: Date.now(),
      });
    } else {
      defaultOrgId = orgs[0]._id;
    }

    const userId = await ctx.db.insert("users", {
      externalId: identity.subject,
      email: identity.email,
      name: identity.name,
      image: identity.pictureUrl,
      role: noAdminsExist ? "admin" : "customer",
      orgId: defaultOrgId,
      createdAt: Date.now(),
    });

    // Notify about JIT signup
    await ctx.db.insert("admin_notifications", {
      orgId: defaultOrgId,
      type: "user_signup",
      title: "New User (JIT Sync)",
      message: `${identity.name || identity.email} signed in and was automatically registered.`,
      link: `/dashboard/users`,
      isRead: false,
      priority: "low",
      createdAt: Date.now(),
    });

    return userId;
  },
});

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
      // Return null instead of throwing to prevent frontend crashes during init
      return null;
    }
  },
});

/**
 * Find a customer by email or phone (Org-scoped).
 * Used for auto-filling the "Add Shipment" form and assigning shipments.
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
    
    // 1. Try to find a User record with this email (Global search, but scoped to org in logic)
    const userByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", contact))
      .unique();
      
    const userByPhone = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", contact))
      .unique();

    const foundUser = userByEmail || userByPhone;
    
    if (foundUser) {
      return {
        _id: foundUser._id,
        externalId: foundUser.externalId,
        name: foundUser.name,
        email: foundUser.email,
        phone: foundUser.phone,
        isUser: true,
      };
    }

    // 2. Fallback: Search the most recent SHIPMENT with this contact info
    const recentByEmail = await ctx.db
      .query("shipments")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("customer_email"), contact))
      .order("desc")
      .first();

    const recentByPhone = await ctx.db
      .query("shipments")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("customer_phone"), contact))
      .order("desc")
      .first();

    const matchedShipment = recentByEmail || recentByPhone;
    if (matchedShipment) {
      return {
        name: matchedShipment.customer_name,
        email: matchedShipment.customer_email,
        phone: matchedShipment.customer_phone,
        isUser: false,
      };
    }

    return null;
  },
});

/**
 * Update a user's role (Admin only).
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("staff"), v.literal("customer")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      role: args.role,
    });

    // Notify about role change
    if (user.orgId) {
      await ctx.db.insert("admin_notifications", {
        orgId: user.orgId,
        type: "role_updated",
        title: "Security Alert: Role Changed",
        message: `User ${user.name || user.email} role has been updated to ${args.role}.`,
        link: `/dashboard/users`,
        isRead: false,
        priority: "high",
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Ensures the current admin has a default organization selected.
 * Creates one if none exist.
 */
export const ensureDefaultOrganization = mutation({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.sessionId);
    
    // 1. Check if user already has an orgId
    if (user.orgId) {
      let existingOrg;
      if (typeof user.orgId === "string") {
        existingOrg = await ctx.db.query("organizations").withIndex("by_externalId", q => q.eq("externalId", user.orgId as string)).unique();
        if (!existingOrg) existingOrg = await ctx.db.query("organizations").withIndex("by_slug", q => q.eq("slug", user.orgId as string)).unique();
      } else {
        existingOrg = await ctx.db.get(user.orgId as Id<"organizations">);
      }
      if (existingOrg) return { orgId: existingOrg._id, name: existingOrg.name };
    }

    // 2. Look for ANY organization
    const orgs = await ctx.db.query("organizations").collect();
    let targetOrgId: Id<"organizations">;
    let targetOrgName: string;

    if (orgs.length === 0) {
      // 3. Create a default one if none exist
      targetOrgId = await ctx.db.insert("organizations", {
        name: "Main Branch",
        slug: "main-branch",
        currency: "INR",
        createdAt: Date.now(),
      });
      targetOrgName = "Main Branch";
    } else {
      targetOrgId = orgs[0]._id;
      targetOrgName = orgs[0].name;
    }

    // 4. Update the user's default orgId
    await ctx.db.patch(user._id, {
      orgId: targetOrgId,
    });

    return { orgId: targetOrgId, name: targetOrgName };
  },
});

export const internalFixUserRole = internalMutation({
  args: { userId: v.id("users"), role: v.union(v.literal("admin"), v.literal("staff"), v.literal("customer")) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

/**
 * Migration to ensure all users have a role.
 */
export const migrateUserRoles = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const users = await ctx.db.query("users").collect();
    let count = 0;
    
    for (const user of users) {
      if (!user.role) {
        await ctx.db.patch(user._id, {
          role: "customer"
        });
        count++;
      }
    }
    return { updated: count, total: users.length };
  },
});

export const listAllUsersInternal = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const listAllUsersDebug = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

/**
 * List users with RBAC enforcement.
 */
export const listUsers = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.sessionId);

    if (user.role === "admin") {
      // Admins see everyone
      return await ctx.db.query("users").collect();
    }

    if (user.role === "staff") {
      // Staff see others in their org except admins
      if (!user.orgId) return [];
      
      const users = await ctx.db
        .query("users")
        .withIndex("by_orgId", (q) => q.eq("orgId", user.orgId))
        .collect();
        
      return users.filter(u => u.role !== "admin");
    }

    throw new Error("Forbidden: Access denied");
  },
});

/**
 * Get a specific user by ID (RBAC enforced).
 */
export const getUserById = query({
  args: { userId: v.id("users"), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user: currentUser } = await requireUser(ctx, args.sessionId);
    const targetUser = await ctx.db.get(args.userId);
    
    if (!targetUser) return null;

    if (currentUser.role === "admin") return targetUser;
    
    if (currentUser.role === "staff") {
      if (targetUser.orgId === currentUser.orgId && targetUser.role !== "admin") {
        return targetUser;
      }
    }

    throw new Error("Forbidden: Access denied");
  },
});
/**
 * Get user statistics including role counts and 7-day registration trends.
 */
export const getUserStats = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user: currentUser } = await requireUser(ctx, args.sessionId);
    
    let users: Doc<"users">[] = [];
    if (currentUser.role === "admin") {
      users = await ctx.db.query("users").collect();
    } else if (currentUser.role === "staff" && currentUser.orgId) {
      users = await ctx.db
        .query("users")
        .withIndex("by_orgId", (q) => q.eq("orgId", currentUser.orgId))
        .collect();
    } else {
      throw new Error("Forbidden: Access denied");
    }

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const trendStart = now - SEVEN_DAYS_MS;
    
    const trendMap: Record<string, { total: number, admin: number, staff: number, customer: number }> = {};
    for (let i = 0; i < 7; i++) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        trendMap[date] = { total: 0, admin: 0, staff: 0, customer: 0 };
    }

    users.forEach(u => {
        if (u.createdAt && u.createdAt >= trendStart) {
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
