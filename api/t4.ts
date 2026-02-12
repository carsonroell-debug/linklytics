// Test: express app with all middleware
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import webhookRouter from "../server/webhooks";
import apiRouter from "../server/api";
import redirectRouter from "../server/redirect";

const app = express();
app.use(express.json());
app.use(webhookRouter);
app.use(apiRouter);
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
app.use(redirectRouter);

export default function handler(req: any, res: any) {
  return app(req, res);
}
