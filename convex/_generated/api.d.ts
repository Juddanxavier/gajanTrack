/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_notifications from "../admin_notifications.js";
import type * as analytics from "../analytics.js";
import type * as clerk from "../clerk.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as http from "../http.js";
import type * as notifications_actions from "../notifications/actions.js";
import type * as notifications_providers_msg91 from "../notifications/providers/msg91.js";
import type * as notifications_providers_resend from "../notifications/providers/resend.js";
import type * as notifications_providers_twilio from "../notifications/providers/twilio.js";
import type * as notifications_router from "../notifications/router.js";
import type * as notifications_tests from "../notifications/tests.js";
import type * as notifications_types from "../notifications/types.js";
import type * as organizations from "../organizations.js";
import type * as quotes from "../quotes.js";
import type * as rbac from "../rbac.js";
import type * as reports from "../reports.js";
import type * as retention from "../retention.js";
import type * as seedAdmin from "../seedAdmin.js";
import type * as sessions from "../sessions.js";
import type * as settings from "../settings.js";
import type * as shipments from "../shipments.js";
import type * as tracking_carriers from "../tracking/carriers.js";
import type * as tracking_router from "../tracking/router.js";
import type * as tracking_track123 from "../tracking/track123.js";
import type * as tracking_track17 from "../tracking/track17.js";
import type * as tracking_trackingmore from "../tracking/trackingmore.js";
import type * as tracking_types from "../tracking/types.js";
import type * as users from "../users.js";
import type * as webhook_logs from "../webhook_logs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin_notifications: typeof admin_notifications;
  analytics: typeof analytics;
  clerk: typeof clerk;
  crons: typeof crons;
  debug: typeof debug;
  http: typeof http;
  "notifications/actions": typeof notifications_actions;
  "notifications/providers/msg91": typeof notifications_providers_msg91;
  "notifications/providers/resend": typeof notifications_providers_resend;
  "notifications/providers/twilio": typeof notifications_providers_twilio;
  "notifications/router": typeof notifications_router;
  "notifications/tests": typeof notifications_tests;
  "notifications/types": typeof notifications_types;
  organizations: typeof organizations;
  quotes: typeof quotes;
  rbac: typeof rbac;
  reports: typeof reports;
  retention: typeof retention;
  seedAdmin: typeof seedAdmin;
  sessions: typeof sessions;
  settings: typeof settings;
  shipments: typeof shipments;
  "tracking/carriers": typeof tracking_carriers;
  "tracking/router": typeof tracking_router;
  "tracking/track123": typeof tracking_track123;
  "tracking/track17": typeof tracking_track17;
  "tracking/trackingmore": typeof tracking_trackingmore;
  "tracking/types": typeof tracking_types;
  users: typeof users;
  webhook_logs: typeof webhook_logs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
