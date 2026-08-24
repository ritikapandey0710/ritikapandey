// Early Sentry instrumentation. This module must be imported FIRST in
// src/index.ts (before any other application module) so @sentry/node is
// initialized before Express, controllers, and services are loaded.
//
// It loads environment variables itself (so a DSN present in .env is visible
// before initialization) and delegates to lib/sentry.ts, which guards
// Sentry.init so exactly ONE init happens per process.
import "dotenv/config";
import { initSentry } from "./lib/sentry";

initSentry();
