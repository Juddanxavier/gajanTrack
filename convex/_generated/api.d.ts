/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics_queries from "../analytics/queries.js";
import type * as audit from "../audit.js";
import type * as clerk from "../clerk.js";
import type * as communication from "../communication.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_shipments from "../lib/shipments.js";
import type * as notifications_actions from "../notifications/actions.js";
import type * as notifications_mutations from "../notifications/mutations.js";
import type * as notifications_providers_msg91 from "../notifications/providers/msg91.js";
import type * as notifications_providers_resend from "../notifications/providers/resend.js";
import type * as notifications_providers_twilio from "../notifications/providers/twilio.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as notifications_router from "../notifications/router.js";
import type * as notifications_tests from "../notifications/tests.js";
import type * as notifications_types from "../notifications/types.js";
import type * as organizations_mutations from "../organizations/mutations.js";
import type * as organizations_queries from "../organizations/queries.js";
import type * as quotes_mutations from "../quotes/mutations.js";
import type * as quotes_queries from "../quotes/queries.js";
import type * as rbac from "../rbac.js";
import type * as reports_queries from "../reports/queries.js";
import type * as retention from "../retention.js";
import type * as search from "../search.js";
import type * as sessions from "../sessions.js";
import type * as shipments_actions from "../shipments/actions.js";
import type * as shipments_internal from "../shipments/internal.js";
import type * as shipments_mutations from "../shipments/mutations.js";
import type * as shipments_queries from "../shipments/queries.js";
import type * as tracking_carriers from "../tracking/carriers.js";
import type * as tracking_router from "../tracking/router.js";
import type * as tracking_track123 from "../tracking/track123.js";
import type * as tracking_track17 from "../tracking/track17.js";
import type * as tracking_trackingmore from "../tracking/trackingmore.js";
import type * as tracking_types from "../tracking/types.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as webhook_logs from "../webhook_logs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "analytics/queries": typeof analytics_queries;
  audit: typeof audit;
  clerk: typeof clerk;
  communication: typeof communication;
  crons: typeof crons;
  http: typeof http;
  "lib/shipments": typeof lib_shipments;
  "notifications/actions": typeof notifications_actions;
  "notifications/mutations": typeof notifications_mutations;
  "notifications/providers/msg91": typeof notifications_providers_msg91;
  "notifications/providers/resend": typeof notifications_providers_resend;
  "notifications/providers/twilio": typeof notifications_providers_twilio;
  "notifications/queries": typeof notifications_queries;
  "notifications/router": typeof notifications_router;
  "notifications/tests": typeof notifications_tests;
  "notifications/types": typeof notifications_types;
  "organizations/mutations": typeof organizations_mutations;
  "organizations/queries": typeof organizations_queries;
  "quotes/mutations": typeof quotes_mutations;
  "quotes/queries": typeof quotes_queries;
  rbac: typeof rbac;
  "reports/queries": typeof reports_queries;
  retention: typeof retention;
  search: typeof search;
  sessions: typeof sessions;
  "shipments/actions": typeof shipments_actions;
  "shipments/internal": typeof shipments_internal;
  "shipments/mutations": typeof shipments_mutations;
  "shipments/queries": typeof shipments_queries;
  "tracking/carriers": typeof tracking_carriers;
  "tracking/router": typeof tracking_router;
  "tracking/track123": typeof tracking_track123;
  "tracking/track17": typeof tracking_track17;
  "tracking/trackingmore": typeof tracking_trackingmore;
  "tracking/types": typeof tracking_types;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
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
