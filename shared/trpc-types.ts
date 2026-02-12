/**
 * Type-only exports for tRPC
 * This file should have ZERO runtime imports to avoid pulling server code into the client bundle
 */

export type { AppRouter } from "../server/routers";
