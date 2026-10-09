#!/usr/bin/env bash
# Runs Lighthouse (mobile + desktop) against a served static build and prints
# scores and core metrics. Usage: scripts/lighthouse.sh [url] [label]
set -euo pipefail
URL="${1:-http://localhost:4173/}"
LABEL="${2:-home}"
mkdir -p .lighthouse
for MODE in mobile desktop; do
  EXTRA=()
  [ "$MODE" = desktop ] && EXTRA=(--preset=desktop)
  npx --yes lighthouse@12 "$URL" --quiet "${EXTRA[@]}" --chrome-flags="--headless=new" \
    --output=json --output-path=".lighthouse/$LABEL-$MODE.json" \
    --only-categories=performance,accessibility,best-practices,seo >/dev/null 2>&1
  node -e '
    const r = require(process.argv[1]); const a = r.audits;
    const s = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    console.log(process.argv[2].padEnd(8), JSON.stringify(s));
    console.log("         FCP", a["first-contentful-paint"].displayValue, "| LCP", a["largest-contentful-paint"].displayValue,
      "| TBT", a["total-blocking-time"].displayValue, "| CLS", a["cumulative-layout-shift"].displayValue);
  ' "$PWD/.lighthouse/$LABEL-$MODE.json" "$MODE"
done
