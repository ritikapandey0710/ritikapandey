// Early Sentry instrumentation. This module must be imported FIRST in
// src/index.ts (before any other application module) so @sentry/node is
// initialized before Express, controllers, and services are loaded.
// 
// It loads environment variables itself (so a DSN present in .env is visible
// before initialization) and delegates to lib/sentry.ts, which guards
// Sentry.init so exactly ONE init happens per process.

// Only load dotenv/config if we're being run as the main application
// This prevents loading .env during TypeScript compilation
if (typeof require !== 'undefined' && require.main && require.main.filename) {
  const mainFilename = require.main.filename;
  // Load dotenv only when running the main application (index.ts/index.js)
  if (mainFilename.endsWith('index.ts') || mainFilename.endsWith('index.js')) {
    import "dotenv/config";
  }
}
import { initSentry } from "./lib/sentry";

initSentry();
