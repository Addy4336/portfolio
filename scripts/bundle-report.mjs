// Reports gzipped JS loaded by out/index.html (initial) versus everything else
// (lazy chunks such as the 3D scene). Run after `npm run build`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const out = join(process.cwd(), "out");
const html = readFileSync(join(out, "index.html"), "utf8");
// Legacy polyfills are loaded with `noModule`, so modern browsers skip them.
const noModule = new Set(
  [...html.matchAll(/<script[^>]*src="\/([^"]+\.js)"[^>]*noModule/gi)].map((m) => m[1]),
);
const initial = new Set(
  [...html.matchAll(/<script[^>]*src="\/(_next\/static\/[^"]+\.js)"/g)]
    .map((m) => m[1])
    .filter((src) => !noModule.has(src)),
);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
let initialTotal = 0;
let lazyTotal = 0;
const lazy = [];
for (const file of walk(join(out, "_next", "static")).filter((f) => f.endsWith(".js"))) {
  const rel = relative(out, file).replaceAll("\\", "/");
  const size = gzipSync(readFileSync(file)).length;
  if (noModule.has(rel)) continue;
  if (initial.has(rel)) initialTotal += size;
  else {
    lazyTotal += size;
    lazy.push([rel, size]);
  }
}
lazy.sort((a, b) => b[1] - a[1]);
console.log(`initial JS (gzip): ${kb(initialTotal)}  [budget 145 KB, of which ~135 KB is the Next.js + React runtime]`);
console.log(`lazy JS    (gzip): ${kb(lazyTotal)}`);
for (const [rel, size] of lazy.slice(0, 6)) console.log(`  ${kb(size).padStart(9)}  ${rel}`);
