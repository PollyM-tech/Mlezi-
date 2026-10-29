/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as adminSecurity from "../adminSecurity.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as emailLimits from "../emailLimits.js";
import type * as files from "../files.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as imageProcessing from "../imageProcessing.js";
import type * as lib_authPolicy from "../lib/authPolicy.js";
import type * as lib_authUsers from "../lib/authUsers.js";
import type * as lib_discoverySearch from "../lib/discoverySearch.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_marketplace from "../lib/marketplace.js";
import type * as lib_mpesa from "../lib/mpesa.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_security from "../lib/security.js";
import type * as marketplace from "../marketplace.js";
import type * as memberships from "../memberships.js";
import type * as migration from "../migration.js";
import type * as moderation from "../moderation.js";
import type * as mpesa from "../mpesa.js";
import type * as passwordRecovery from "../passwordRecovery.js";
import type * as privacy from "../privacy.js";
import type * as retention from "../retention.js";
import type * as security from "../security.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  adminSecurity: typeof adminSecurity;
  auth: typeof auth;
  crons: typeof crons;
  emailLimits: typeof emailLimits;
  files: typeof files;
  health: typeof health;
  http: typeof http;
  imageProcessing: typeof imageProcessing;
  "lib/authPolicy": typeof lib_authPolicy;
  "lib/authUsers": typeof lib_authUsers;
  "lib/discoverySearch": typeof lib_discoverySearch;
  "lib/email": typeof lib_email;
  "lib/marketplace": typeof lib_marketplace;
  "lib/mpesa": typeof lib_mpesa;
  "lib/permissions": typeof lib_permissions;
  "lib/security": typeof lib_security;
  marketplace: typeof marketplace;
  memberships: typeof memberships;
  migration: typeof migration;
  moderation: typeof moderation;
  mpesa: typeof mpesa;
  passwordRecovery: typeof passwordRecovery;
  privacy: typeof privacy;
  retention: typeof retention;
  security: typeof security;
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
