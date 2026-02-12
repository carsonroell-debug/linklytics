import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";
import webhookRouter from "../server/webhooks";
import apiRouter from "../server/api";
import redirectRouter from "../server/redirect";

const app = express();

// Stripe webhook needs raw body BEFORE json parser
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Stripe webhooks
app.use(webhookRouter);

// REST API endpoints
app.use(apiRouter);

// OAuth routes
registerOAuthRoutes(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Short link redirect handler
app.use(redirectRouter);

export default app;
