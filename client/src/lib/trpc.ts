import { createTRPCReact } from "@trpc/react-query";

// Inline type declaration to avoid importing server code
type AppRouter = typeof import("../../../server/routers").appRouter;

export const trpc = createTRPCReact<AppRouter>();
