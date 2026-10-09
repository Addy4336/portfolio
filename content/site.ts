/**
 * Everything personal about the site lives here: edit this file to change
 * your name, headline, links or contact details. Projects live in
 * content/projects/*.mdx.
 */
export const site = {
  name: "Adi",
  role: "AI engineer",
  focus: ["Agentic AI", "Voice AI"],
  headline: "I build AI agents that listen, think and act.",
  intro:
    "Real-time voice agents, multi-step tool use, and the unglamorous plumbing that makes them reliable on a free tier.",
  /** Shown in the hero's status panel. */
  availability: "Open to internships and research roles",
  links: {
    github: "https://github.com/Addy4336",
  } as Record<string, string>,
} as const;
