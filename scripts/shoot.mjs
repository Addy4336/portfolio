// Visual QA screenshots without any extra dependencies: launches the
// installed Chrome headless with the DevTools protocol, then for each shot
// sets the viewport, loads the page, scrolls, waits and saves a PNG.
//
//   node scripts/shoot.mjs [baseUrl]
//
// Shots are defined below; output goes to .shots/ (gitignored).
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:4173";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = join(process.cwd(), ".shots");

const desktop = { width: 1440, height: 900, mobile: false, scale: 1 };
const phone = { width: 390, height: 844, mobile: true, scale: 2 };

// scroll: an element id plus a fraction of the viewport height past its top, or a pixel offset.
const shots = (process.env.SHOTS ?? "").split(",").filter(Boolean);
const ALL = [
  { name: "hero-desktop", path: "/?tier=2", device: desktop, scroll: null, wait: 6000 },
  { name: "about-desktop", path: "/?tier=2", device: desktop, scroll: ["about", 0.9], wait: 6000 },
  { name: "about-late-desktop", path: "/?tier=2", device: desktop, scroll: ["about", 1.6], wait: 6000 },
  { name: "hero-phone", path: "/?tier=1", device: phone, scroll: null, wait: 6000 },
  { name: "about-phone", path: "/?tier=1", device: phone, scroll: ["about", 0.9], wait: 6000 },
  { name: "about-late-phone", path: "/?tier=1", device: phone, scroll: ["about", 1.7], wait: 6000 },
  { name: "static-desktop", path: "/?tier=0", device: desktop, scroll: null, wait: 2500 },
];
const list = shots.length ? ALL.filter((s) => shots.includes(s.name)) : ALL;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const profile = mkdtempSync(join(tmpdir(), "shoot-"));
  const chrome = spawn(
    CHROME,
    ["--headless=new", "--remote-debugging-port=9333", `--user-data-dir=${profile}`, "--hide-scrollbars", "--mute-audio", "about:blank"],
    { stdio: "ignore" },
  );
  try {
    let targets;
    for (let i = 0; i < 50 && !targets; i++) {
      await sleep(200);
      targets = await fetch("http://127.0.0.1:9333/json").then((r) => r.json()).catch(() => null);
    }
    const page = targets.find((t) => t.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r, { once: true }));
    let id = 0;
    const pending = new Map();
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    });
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const n = ++id;
        pending.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
        ws.send(JSON.stringify({ id: n, method, params }));
      });

    await send("Page.enable");
    for (const shot of list) {
      const d = shot.device;
      await send("Emulation.setDeviceMetricsOverride", {
        width: d.width,
        height: d.height,
        deviceScaleFactor: d.scale,
        mobile: d.mobile,
      });
      await send("Emulation.setTouchEmulationEnabled", { enabled: d.mobile });
      await send("Page.navigate", { url: BASE + shot.path });
      await sleep(shot.wait);
      if (shot.scroll) {
        const [id, frac] = shot.scroll;
        await send("Runtime.evaluate", {
          expression: `window.scrollTo(0, document.getElementById(${JSON.stringify(id)}).offsetTop + innerHeight * ${frac}); window.dispatchEvent(new Event('scroll'));`,
        });
        await sleep(2500);
      }
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const file = join(OUT, `${shot.name}.png`);
      writeFileSync(file, Buffer.from(data, "base64"));
      console.log(file);
    }
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
