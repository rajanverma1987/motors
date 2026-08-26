#!/usr/bin/env node
/**
 * Generate ADMIN_TOTP_SECRET for admin two-factor authentication.
 * Add to production env, then scan the otpauth URL in Google Authenticator / Authy.
 */
import { generateSecret, generateURI } from "otplib";

const secret = generateSecret();
const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
const otpauth = generateURI({
  issuer: "IQMotorBase Admin",
  label: adminEmail,
  secret,
});

console.log("Add to production environment:\n");
console.log(`ADMIN_TOTP_SECRET=${secret}\n`);
console.log("Scan this URL in your authenticator app (or enter the secret manually):\n");
console.log(otpauth);
console.log("\nSecret (base32):", secret);
