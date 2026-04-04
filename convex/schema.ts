/** @format */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Clean Root Schema (Better Auth Removed)
 */
export default defineSchema({
  // Users
  users: defineTable({
    externalId: v.string(), // External ID from Auth Provider (Clerk)
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    role: v.optional(
      v.union(v.literal('admin'), v.literal('staff'), v.literal('customer')),
    ),
    orgId: v.optional(v.union(v.id('organizations'), v.string())), // Custom Org/Tenant ID
    preferences: v.optional(
      v.object({
        theme: v.optional(v.union(v.literal('light'), v.literal('dark'), v.literal('system'))),
        language: v.optional(v.string()),
      })
    ),
  })
    .index('by_externalId', ['externalId'])
    .index('by_orgId', ['orgId'])
    .index('by_email', ['email'])
    .index('by_phone', ['phone']),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()), // From existing data
    externalId: v.optional(v.string()), // From existing data
    country: v.optional(v.string()), // From existing data
    currency: v.optional(v.string()), // From existing data
    createdAt: v.optional(v.number()), // Made optional for existing data
    notificationDefaults: v.optional(
      v.object({
        email: v.boolean(),
        whatsapp: v.boolean(),
      })
    ),
    trackingSettings: v.optional(
      v.object({
        autoArchiveDays: v.number(),
        autoDeleteDays: v.number(),
      })
    ),
    apiKey17Track: v.optional(v.string()),
    publicDomain: v.optional(v.string()), // Regional tracking domain (e.g. track.in, track.lk)
  }).index('by_slug', ['slug'])
    .index('by_externalId', ['externalId']),

  // App-specific business tables
  quotes: defineTable({
    customerId: v.string(),
    orgId: v.union(v.id('organizations'), v.string()), // Custom Org/Tenant ID
    status: v.union(
      v.literal('pending'),
      v.literal('reviewing'),
      v.literal('approved'),
      v.literal('rejected'),
    ),
    origin: v.object({
      address: v.string(),
      city: v.string(),
    }),
    destination: v.object({
      address: v.string(),
      city: v.string(),
    }),
    parcelDetails: v.object({
      weightKg: v.number(),
      description: v.string(),
    }),
    estimatedPrice: v.optional(v.number()),
    staffNotes: v.optional(v.string()),
    createdAt: v.number(),
    deletionTime: v.optional(v.number()),
    archivedTime: v.optional(v.number()),
  })
    .index('by_customer_id', ['customerId'])
    .index('by_org_id', ['orgId'])
    .index('by_deletion_time', ['deletionTime'])
    .index('by_archived_time', ['archivedTime']),

  shipments: defineTable({
    userId: v.optional(v.string()),
    orgId: v.union(v.id('organizations'), v.string()), // Custom Org/Tenant ID
    white_label_code: v.optional(v.string()),
    origin_country: v.optional(v.string()),
    tracking_number: v.string(),
    carrier_code: v.string(),
    provider: v.union(v.literal('trackingmore'), v.literal('track123'), v.literal('track17')),
    status: v.union(
      v.literal('pending'),
      v.literal('info_received'),
      v.literal('in_transit'),
      v.literal('out_for_delivery'),
      v.literal('delivered'),
      v.literal('failed_attempt'),
      v.literal('exception'),
      v.literal('expired'),
    ),
    customer_name: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    notification_preferences: v.optional(
      v.object({
        email: v.boolean(),
        whatsapp: v.boolean(),
      }),
    ),
    estimated_delivery: v.optional(v.string()),
    events_raw: v.string(),
    provider_metadata: v.optional(v.any()), // Structured data from provider
    last_synced_at: v.number(),
    archived_at: v.optional(v.number()),
    scheduled_for_deletion_at: v.optional(v.number()),
    created_at: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_org_id', ['orgId'])
    .index('by_tracking_number', ['tracking_number'])
    .index('by_org_id_tracking_number', ['orgId', 'tracking_number'])
    .index('by_white_label_code', ['white_label_code'])
    .index('by_status', ['status'])
    .index('by_archived_at', ['archived_at'])
    .index('by_scheduled_for_deletion_at', ['scheduled_for_deletion_at']),

  webhook_logs: defineTable({
    provider: v.string(),
    payload: v.string(),
    headers: v.any(),
    status: v.union(v.literal("received"), v.literal("processed"), v.literal("error")),
    error: v.optional(v.string()),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  shipment_counters: defineTable({
    prefix: v.string(),
    orgId: v.optional(v.union(v.id("organizations"), v.string())), // From existing data
    count: v.number(),
  }).index('by_prefix', ['prefix']),

  tracking_events: defineTable({
    shipment_id: v.id('shipments'),
    status: v.string(),
    sub_status: v.optional(v.string()),
    message: v.string(),
    location: v.optional(v.string()),
    occurred_at: v.number(),
    raw_payload: v.string(),
    metadata: v.optional(v.any()), // Structured data from provider
  })
    .index('by_shipment_id', ['shipment_id'])
    .index('by_shipment_id_occurred_at', ['shipment_id', 'occurred_at']),

  sessions: defineTable({
    userId: v.string(), // Clerk External ID
    sessionId: v.string(), // Unique Client-side ID
    orgId: v.optional(v.id('organizations')), // Currently selected org in this session
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    lastActiveAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_sessionId', ['sessionId'])
    .index('by_userId_sessionId', ['userId', 'sessionId']),

  carriers: defineTable({
    key: v.number(), // 17track numeric key
    name: v.string(),
    name_zh: v.optional(v.string()),
    country_iso: v.optional(v.string()),
    country_name: v.optional(v.string()),
    url: v.optional(v.string()),
    tel: v.optional(v.string()),
    provider: v.literal('track17'),
  })
    .index('by_key', ['key'])
    .index('by_name', ['name'])
    .index('by_country_iso', ['country_iso']),

  admin_notifications: defineTable({
    userId: v.optional(v.string()), // Target user (Clerk ID) or null for all admins/staff
    orgId: v.union(v.id("organizations"), v.string()), 
    type: v.string(), // 'shipment_created', 'status_exception', 'new_staff'
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()), // e.g., '/dashboard/shipments/[id]'
    isRead: v.boolean(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    createdAt: v.number(),
    archivedAt: v.optional(v.number()), // For "soft-archiving"
  })
    .index("by_orgId", ["orgId"])
    .index("by_userId", ["userId"])
    .index("by_isRead", ["isRead"])
    .index("by_archivedAt", ["archivedAt"])
    .index("by_createdAt", ["createdAt"]),
  
  communication_logs: defineTable({
    shipmentId: v.id('shipments'),
    type: v.union(v.literal('whatsapp'), v.literal('email')),
    recipient: v.string(), // phone or email
    content: v.string(), // Short summary or template name
    status: v.union(v.literal('sent'), v.literal('failed')),
    messageId: v.optional(v.string()), // provider-side ID (request_id)
    error: v.optional(v.string()),
    sentAt: v.number(),
  })
    .index('by_shipmentId', ['shipmentId'])
    .index('by_sentAt', ['sentAt']),

  audit_logs: defineTable({
    userId: v.string(), // Clerk external ID of the user performing the action
    orgId: v.union(v.id("organizations"), v.string()), // Org where the action took place
    action: v.string(), // e.g. "update_shipment", "delete_quote"
    entityId: v.string(), // ID of the shipment, quote, etc.
    entityType: v.string(), // e.g. "shipments", "quotes"
    details: v.any(), // JSON payload of changes
    timestamp: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_userId", ["userId"])
    .index("by_entityId", ["entityId"])
    .index("by_timestamp", ["timestamp"]),

});
