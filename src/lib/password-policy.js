import { LIMITS } from "@/lib/validation";

/** Top common passwords — reject to reduce credential stuffing success. */
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "abc123",
  "111111",
  "000000",
  "iloveyou",
  "admin",
  "admin123",
  "letmein",
  "welcome",
  "welcome1",
  "monkey",
  "dragon",
  "master",
  "login",
  "passw0rd",
  "changeme",
  "football",
  "baseball",
  "shadow",
  "sunshine",
  "princess",
  "trustno1",
  "motors",
  "motor123",
  "iqmotorbase",
]);

/**
 * Validate password strength for new passwords.
 * @param {string} password
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validatePasswordPolicy(password) {
  if (typeof password !== "string") {
    return { ok: false, error: "Password is required." };
  }
  if (password.length < LIMITS.password.min) {
    return {
      ok: false,
      error: `Password must be at least ${LIMITS.password.min} characters.`,
    };
  }
  if (password.length > LIMITS.password.max) {
    return { ok: false, error: "Password is too long." };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { ok: false, error: "Password must include at least one letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: "Password must include at least one number." };
  }
  const normalized = password.trim().toLowerCase();
  if (COMMON_PASSWORDS.has(normalized)) {
    return { ok: false, error: "This password is too common. Choose a stronger password." };
  }
  return { ok: true };
}

/**
 * @param {string} password
 * @returns {string | null} Error message or null if valid.
 */
export function getPasswordPolicyError(password) {
  const result = validatePasswordPolicy(password);
  return result.ok ? null : result.error;
}
