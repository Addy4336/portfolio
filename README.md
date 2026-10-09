# Agent City — Adi's portfolio

A living night-time city run by tiny autonomous agents. Each district is a project, the
transit loop is the voice/agent pipeline, and the city grows every time a project is added.

Next.js 16 (static export) · React 19 · three.js + React Three Fiber · Lenis ·
Tailwind v4 · MDX. Everything is free and open source, and the whole city is generated
in code: no 3D models are downloaded.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in out/
npm run preview    # serve out/ on http://localhost:4173
npm test           # validates every project file
```

Add `?tier=0` … `?tier=3` to any URL to force a device tier (0 = no WebGL).

## Add a project

1. Create `content/projects/<slug>.mdx` (lowercase, dashes: `voice-notes.mdx`).
2. Fill in the frontmatter, then write the case study below it in Markdown:

```mdx
---
title: Voice Notes
tagline: One line for the sign on its building
summary: Two or three sentences for the panel on the home page.
status: live            # live | building | research | idea
progress: 1             # 0–1; low values show the building under scaffolding
category: side          # flagship gets a district, side gets a kiosk
district: auto          # studio | estate | lab | workshop | auto
year: 2026
role: Solo build
stack: [Python, FastAPI]
links:
  live: https://example.com
  github: https://github.com/you/repo
order: 10               # lower comes first
---

## The problem
...
```

3. Optional: put images in `public/projects/<slug>/` and set `cover: /projects/<slug>/cover.webp`.
4. Run `npm test`. A missing or wrong field fails with the file and field name.

That's it: the home page, the city and `/work/<slug>/` pick it up automatically.

## Layout

```
content/projects/   one .mdx per project
src/app/            routes: home, work/[slug]
src/world/          the 3D city (loaded lazily, after first paint)
src/components/     shared UI (smooth scroll, …)
src/lib/            content loader + schema, device tiers, scroll state, motion loader
scripts/            build helpers (benchmark copy, bundle report)
```

## Performance rules

- All text is real HTML; the 3D layer is progressive and never blocks content.
- three.js and friends load only after the page is idle, and only on capable devices.
- Lenis loads just after first paint; every scroll effect reads the native scroll position.
- Phones start the city on the first scroll or touch; weak devices and reduced-motion
  users get a still render of the same city (`public/stills/`).
- Static props are merged per material after boot (`src/world/StaticBatch.tsx`).
- Shaders compile asynchronously before the first frame (`src/world/Precompile.tsx`).
- `node scripts/bundle-report.mjs` after a build prints initial vs lazy JS.
- `bash scripts/lighthouse.sh http://localhost:4173/ label` (with `npm run preview`
  running) prints Lighthouse scores for mobile and desktop.
- `?bench` exposes `window.__cityBench()` in the console: real GPU cost per frame.

## Visual QA

```bash
npm run build && npm run preview   # in one terminal
node scripts/shoot.mjs              # headless-Chrome screenshots into .shots/
SHOTS=hero-desktop,bench-t1 node scripts/shoot.mjs           # some shots, plus a GPU bench
SHOTS=og,still-desktop,still-phone node scripts/shoot.mjs    # re-render share image + stills
```

## Edit your details

Name, headline, story, pipeline stages, toolbox, hobbies, email, links and the deployed
URL all live in `content/site.ts`. Empty fields simply don't render.

## Credits

Third-party assets and their licences are listed in [CREDITS.md](./CREDITS.md).
