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
  /**
   * The About story, one string per paragraph. It "types itself" like a live
   * transcript as visitors scroll, so keep it spoken and short.
   */
  story: [
    "I'm Adi, an AI engineer and a student. I build agents you can actually talk to: systems that listen, work out what to do next, and then do it.",
    "The problems I like live where language models meet the real world. Turn-taking in a live conversation. A plan the model can't wander away from. A pipeline that answers before the silence gets awkward.",
    "I build on free tiers on purpose. When every token and every second of compute is rationed, you stop prompting and start engineering.",
    "Right now I'm taking a real estate platform to production and starting a research project. Everything I make ends up here, in the city.",
  ],
  links: {
    github: "https://github.com/Addy4336",
  } as Record<string, string>,
} as const;
