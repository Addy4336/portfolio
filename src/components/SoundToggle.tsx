"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { startAmbience, stopAmbience } from "@/lib/ambience";

export function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => () => stopAmbience(), []);

  const toggle = () => {
    if (on) stopAmbience();
    else startAmbience();
    setOn(!on);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn city sound off" : "Turn city sound on"}
      className="grid size-10 place-items-center rounded-full border border-line bg-void/70 text-paper transition-colors hover:border-signal hover:text-signal"
    >
      {on ? <Volume2 size={17} aria-hidden /> : <VolumeX size={17} aria-hidden />}
    </button>
  );
}
