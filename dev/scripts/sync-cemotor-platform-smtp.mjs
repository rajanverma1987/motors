#!/usr/bin/env node
/**
 * Deprecated: cemotor no longer stores PLATFORM_SMTP_*.
 * Password-reset mail is sent by apps/admin via PLATFORM_API_BASE.
 * Use: node scripts/strip-cemotor-platform-smtp.mjs
 */
console.log(
  "Skipped. Cemotor does not use PLATFORM_SMTP_*. Run strip-cemotor-platform-smtp.mjs if needed."
);
process.exit(0);
