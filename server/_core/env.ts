function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const ENV = {
  get appId() { return required("VITE_APP_ID"); },
  get cookieSecret() { return required("JWT_SECRET"); },
  get databaseUrl() { return required("DATABASE_URL"); },
  get oAuthServerUrl() { return required("OAUTH_SERVER_URL"); },
  ownerOpenId: optional("OWNER_OPEN_ID"),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: optional("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: optional("BUILT_IN_FORGE_API_KEY"),
};
