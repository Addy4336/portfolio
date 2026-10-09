// Copies detect-gpu's benchmark data into public/ so GPU tiering never
// depends on a third-party CDN. Runs before `dev` and `build`.
import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@pmndrs", "detect-gpu", "dist", "benchmarks");
const dest = join(root, "public", "benchmarks");

if (!existsSync(src)) {
  console.error(`detect-gpu benchmarks not found at ${src}. Run npm install.`);
  process.exit(1);
}
cpSync(src, dest, { recursive: true });
