let app: any;
let initError: Error | null = null;
let initDone = false;

async function init() {
  if (initDone) return;
  try {
    await import("dotenv/config");
    const expressMod = await import("express");
    const express = expressMod.default;
    const { createExpressMiddleware } = await import("@trpc/server/adapters/express");
    const { appRouter } = await import("../server/routers");
    const { createContext } = await import("../server/_core/context");
    const { registerOAuthRoutes } = await import("../server/_core/oauth");
    const webhookRouter = await import("../server/webhooks");
    const apiRouter = await import("../server/api");
    const redirectRouter = await import("../server/redirect");

    app = express();

    // Stripe webhook needs raw body BEFORE json parser
    app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

    // Body parsers
    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));

    // Stripe webhooks
    app.use(webhookRouter.default);

    // REST API endpoints
    app.use(apiRouter.default);

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
    app.use(redirectRouter.default);
  } catch (err: any) {
    initError = err;
    console.error("FUNCTION INIT ERROR:", err?.message, err?.stack);
  }
  initDone = true;
}

const initPromise = init();

export default async function handler(req: any, res: any) {
  await initPromise;
  if (initError) {
    return res.status(500).json({
      error: "Function initialization failed",
      message: initError.message,
      stack: process.env.NODE_ENV !== "production" ? initError.stack : undefined,
    });
  }
  return app(req, res);
}
