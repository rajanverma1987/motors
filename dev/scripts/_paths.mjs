import { dirname, join } from "path";
import { fileURLToPath } from "url";

/** Absolute path to this scripts/ directory */
export const scriptsDir = dirname(fileURLToPath(import.meta.url));
/** Evaluator / platform tooling app (package.json, src, public) */
export const devRoot = join(scriptsDir, "..");
/** Repo root: apps/, clients/, shop_uploads/, .env */
export const repoRoot = join(devRoot, "..");
