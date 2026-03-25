import * as Sentry from "@sentry/node";
export function initSentry(): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 1.0,
  });
  console.log("Sentry initialized");
}
export { Sentry };