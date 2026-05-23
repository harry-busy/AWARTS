/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as analytics from "../analytics.js";
import type * as analyticsCursor from "../analyticsCursor.js";
import type * as apiKeys from "../apiKeys.js";
import type * as badges from "../badges.js";
import type * as cliAuth from "../cliAuth.js";
import type * as crons from "../crons.js";
import type * as digest from "../digest.js";
import type * as export_ from "../export.js";
import type * as feed from "../feed.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as lib_apiAuth from "../lib/apiAuth.js";
import type * as lib_providers from "../lib/providers.js";
import type * as mcpUsage from "../mcpUsage.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as openStats from "../openStats.js";
import type * as posts from "../posts.js";
import type * as prompts from "../prompts.js";
import type * as publicApi from "../publicApi.js";
import type * as rateLimit from "../rateLimit.js";
import type * as reactions from "../reactions.js";
import type * as reports from "../reports.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as social from "../social.js";
import type * as tokenRich from "../tokenRich.js";
import type * as upload from "../upload.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  analytics: typeof analytics;
  analyticsCursor: typeof analyticsCursor;
  apiKeys: typeof apiKeys;
  badges: typeof badges;
  cliAuth: typeof cliAuth;
  crons: typeof crons;
  digest: typeof digest;
  export: typeof export_;
  feed: typeof feed;
  http: typeof http;
  leaderboard: typeof leaderboard;
  "lib/apiAuth": typeof lib_apiAuth;
  "lib/providers": typeof lib_providers;
  mcpUsage: typeof mcpUsage;
  messages: typeof messages;
  migrations: typeof migrations;
  openStats: typeof openStats;
  posts: typeof posts;
  prompts: typeof prompts;
  publicApi: typeof publicApi;
  rateLimit: typeof rateLimit;
  reactions: typeof reactions;
  reports: typeof reports;
  search: typeof search;
  seed: typeof seed;
  social: typeof social;
  tokenRich: typeof tokenRich;
  upload: typeof upload;
  usage: typeof usage;
  users: typeof users;
  webhooks: typeof webhooks;
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
