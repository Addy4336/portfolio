"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Box3, Mesh, MeshBasicMaterial, Raycaster, RingGeometry, Vector2, Vector3 } from "three";
import { scrollToTarget } from "@/components/SmoothScroll";
import { DISTRICT_NAMES, type CityProject, type DistrictId } from "@/lib/districts";
import { hoverState, type CityTarget } from "@/lib/hover-state";
import { isCityTarget, listenToPointer, pointerState } from "@/lib/pointer-state";
import { STUDIO_ASK_EVENT } from "@/lib/studio-state";
import { WAVE_EVENT } from "@/lib/voice-state";
import { site } from "@content/site";
import { ADI_POSITION } from "./city/Character";
import { blockCentre } from "./city/layout";
import { OFFCLOCK_CENTRE } from "./city/OffClock";
import { ALEX_LOCAL, studioToWorld } from "./city/StudioExtras";
import { palette } from "./palette";

/** `small` targets sit inside a bigger one (the portal in the Studio, Adi on the plaza) and win whenever the ray touches them. */
type Target = CityTarget & { box: Box3; half: number; action?: "wave" | "ask"; href?: string; small?: true; ringY?: number };

const box = (cx: number, cy: number, cz: number, hx: number, hy: number, hz: number) =>
  new Box3(new Vector3(cx - hx, cy - hy, cz - hz), new Vector3(cx + hx, cy + hy, cz + hz));

const DISTRICT_HINT: Record<string, string> = {
  live: "Fly in",
  building: "Fly in · under construction",
  research: "Fly in · under construction",
  idea: "Fly in · coming soon",
};

/** Every pickable thing is just a box; the ray is tested against each once per frame. */
function buildTargets(projects: CityProject[], portrait: boolean): Target[] {
  const out: Target[] = [];
  for (const id of ["studio", "estate", "lab", "workshop"] as DistrictId[]) {
    const [x, z] = blockCentre(id);
    const first = projects.find((p) => p.district === id);
    out.push({
      id,
      title: id === "workshop" ? DISTRICT_NAMES.workshop : (first?.title ?? DISTRICT_NAMES[id]),
      hint:
        id === "workshop"
          ? "Side projects · fly in"
          : first
            ? (DISTRICT_HINT[first.status] ?? "Fly in")
            : DISTRICT_NAMES[id],
      scrollTo: `#district-${id}`,
      box: box(x, 1.1, z, 1.6, 1.3, 1.6),
      half: 1.6,
    });
  }
  // the Studio's "try it live" gate (see StudioPortal), turned like its district
  const live = projects.find((p) => p.district === "studio" && p.live);
  if (live?.live) {
    const gate = studioToWorld([portrait ? 1 : -1, 0.26, -1.15]);
    out.push({
      id: "studio-portal",
      title: `Try ${live.title} live`,
      hint: "Opens the real app",
      href: live.live,
      small: true,
      box: box(gate.x, gate.y + 0.1, gate.z, 0.3, 0.5, 0.3),
      half: 0.3,
    });
  }
  // Alex, the interviewer, once the Studio has its interview set
  if (projects.some((p) => p.district === "studio" && p.screen)) {
    const alex = studioToWorld(ALEX_LOCAL);
    out.push({
      id: "studio-alex",
      title: "Alex · AI interviewer",
      hint: "Click for a real question",
      action: "ask",
      small: true,
      ringY: 0.26, // the studio floor, not the street
      box: box(alex.x, alex.y, alex.z, 0.2, 0.2, 0.2),
      half: 0.2,
    });
  }
  out.push({
    id: "hq",
    title: "HQ",
    hint: "About Adi",
    scrollTo: "#about",
    box: box(0, 3, 0, 1.1, 3, 1.1),
    half: 1.1,
  });
  for (const [bx, bz] of [
    [0, -4],
    [4, 0],
    [0, 4],
    [-4, 0],
  ]) {
    out.push({
      id: `station-${bx}-${bz}`,
      title: "Transit station",
      hint: "How I build",
      scrollTo: "#pipeline",
      box: box(bx, 0.8, bz, 1.2, 0.9, 1.2),
      half: 1.2,
    });
  }
  const [ax, , az] = ADI_POSITION;
  out.push({
    id: "adi",
    title: site.name,
    hint: "Say hi",
    action: "wave",
    small: true,
    box: box(ax, 0.3, az, 0.2, 0.32, 0.2),
    half: 0.16,
  });
  if (site.offClock.length) {
    const [ox, , oz] = OFFCLOCK_CENTRE;
    out.push({
      id: "offclock",
      title: "Off the clock",
      hint: "Visit the park",
      scrollTo: "#off-the-clock",
      box: box(ox, 0.8, oz, 1.5, 0.8, 1.5),
      half: 1.5,
    });
  }
  return out;
}

function flyTo(selector: string) {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;
  // a little way into the section, so its own camera shot is the one held
  const top = el.getBoundingClientRect().top + window.scrollY;
  scrollToTarget(Math.round(top + Math.min(el.offsetHeight * 0.08, 160)));
}

/**
 * Hover and click on the city. The canvas sits behind the page, so picking is
 * a ray through the cursor tested against a handful of boxes (one per
 * district, the HQ tower, the stations, Adi). Hovering lights the target's
 * footprint and shows a label; clicking scrolls the page there and the camera
 * follows. Works for taps too, wherever the tap lands on bare background.
 */
export function CityPicker({ projects }: { projects: CityProject[] }) {
  const camera = useThree((s) => s.camera);
  const portrait = useThree((s) => s.size.width / s.size.height < 0.9);
  const targets = useMemo(() => buildTargets(projects, portrait), [projects, portrait]);
  const ray = useMemo(() => new Raycaster(), []);
  const tmp = useMemo(() => ({ ndc: new Vector2(), hit: new Vector3() }), []);
  const ring = useRef<Mesh>(null);
  const label = useRef<HTMLElement | null>(null);
  const glow = useRef({ x: 0, y: 0.06, z: 0, scale: 1, opacity: 0, id: "" });

  const ringGeo = useMemo(() => {
    const g = new RingGeometry(0.92, 1, 4, 1, Math.PI / 4);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: palette.signal,
        toneMapped: false,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  const pick = (ndcX: number, ndcY: number): Target | null => {
    tmp.ndc.set(ndcX, -ndcY);
    ray.setFromCamera(tmp.ndc, camera);
    let best: Target | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      if (!ray.ray.intersectBox(t.box, tmp.hit)) continue;
      const d = tmp.hit.distanceToSquared(ray.ray.origin);
      if (best?.small && !t.small) continue;
      if ((t.small && !best?.small) || d < bestDist) {
        best = t;
        bestDist = d;
      }
    }
    return best;
  };
  // the click listener is attached once, but must always use the latest pick
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });

  useEffect(() => {
    listenToPointer();
    label.current = document.getElementById("city-hover");
    const onClick = (e: MouseEvent) => {
      if (!isCityTarget(e.target)) return;
      const hit = pickRef.current(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1,
      );
      if (!hit) return;
      if (hit.href) window.open(hit.href, "_blank", "noopener");
      else if (hit.action === "ask") window.dispatchEvent(new Event(STUDIO_ASK_EVENT));
      else if (hit.action === "wave") window.dispatchEvent(new Event(WAVE_EVENT));
      else if (hit.scrollTo) flyTo(hit.scrollTo);
    };
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("click", onClick);
      hoverState.target = null;
      delete document.documentElement.dataset.cityHover;
    };
  }, []);

  useFrame((_, delta) => {
    const g = glow.current;
    let hit: Target | null = null;
    if (pointerState.fine && pointerState.active && pointerState.overCity && !document.hidden) {
      hit = pick(pointerState.x, pointerState.y);
      // only offer a fly-to when the page actually has that section
      if (hit?.scrollTo && !document.querySelector(hit.scrollTo)) hit = null;
    }
    if (hit?.id !== hoverState.target?.id) {
      hoverState.target = hit;
      if (hit) document.documentElement.dataset.cityHover = "";
      else delete document.documentElement.dataset.cityHover;
      const el = label.current;
      if (el) {
        if (hit) {
          (el.querySelector("[data-t]") as HTMLElement).textContent = hit.title;
          (el.querySelector("[data-h]") as HTMLElement).textContent = hit.hint;
        }
        el.style.opacity = hit ? "1" : "0";
      }
    }
    if (hit && label.current) {
      const x = Math.min(((pointerState.x + 1) / 2) * window.innerWidth + 18, window.innerWidth - 230);
      const y = Math.min(((pointerState.y + 1) / 2) * window.innerHeight + 20, window.innerHeight - 70);
      label.current.style.transform = `translate(${x}px, ${y}px)`;
    }

    // the footprint ring eases to the hovered target and fades in
    if (hit) {
      const c = hit.box.getCenter(tmp.hit);
      if (g.id !== hit.id) {
        if (g.opacity < 0.05) {
          g.x = c.x;
          g.y = hit.ringY ?? 0.06;
          g.z = c.z;
          g.scale = hit.half;
        }
        g.id = hit.id;
      }
      const k = 1 - Math.exp(-delta * 14);
      g.x += (c.x - g.x) * k;
      g.y += ((hit.ringY ?? 0.06) - g.y) * k;
      g.z += (c.z - g.z) * k;
      g.scale += (hit.half * 1.18 - g.scale) * k;
    }
    g.opacity += ((hit ? 0.9 : 0) - g.opacity) * (1 - Math.exp(-delta * 12));
    const r = ring.current;
    if (r) {
      r.visible = g.opacity > 0.01;
      r.position.set(g.x, g.y, g.z);
      r.scale.setScalar(g.scale * 1.41);
      ringMat.opacity = g.opacity;
    }
  });

  return <mesh ref={ring} geometry={ringGeo} material={ringMat} visible={false} userData={{ dynamic: true }} />;
}
