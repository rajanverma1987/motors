#!/usr/bin/env node
/**
 * Writes public/{INDEXNOW_KEY}.txt for IndexNow verification (runs before next build).
 * @see https://www.indexnow.org/documentation
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

const key = process.env.INDEXNOW_KEY?.trim();
if (!key) {
  process.exit(0);
}

const publicDir = path.join(root, "public");
fs.mkdirSync(publicDir, { recursive: true });
const keyFilePath = path.join(publicDir, `${key}.txt`);
fs.writeFileSync(keyFilePath, key, "utf8");
console.log(`[indexnow] Verification file ready: public/${key}.txt`);
