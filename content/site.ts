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
  /**
   * "How I build": the four stages a voice-agent request goes through, shown
   * as stations on the city's transit loop. `log` is the example request's
   * line for that stage.
   */
  pipeline: [
    {
      id: "listen",
      station: "Ear",
      title: "Listen",
      body: "Audio streams in over WebRTC. Speech-to-text runs live, and turn detection decides when you've actually finished, so a thinking pause isn't mistaken for the end.",
      stack: ["Deepgram Flux", "LiveKit", "WebRTC"],
      log: 'heard   "Can you move my mock interview to Friday?"',
    },
    {
      id: "think",
      station: "Brain",
      title: "Think",
      body: "The model is good at conversation and bad at project management, so the plan lives in code. Each turn gets a short directive saying where things stand, and the reply comes back with a control tag.",
      stack: ["Groq · gpt-oss-120b", "Pipecat", "code-side conductor"],
      log: "plan    intent=reschedule · needs: calendar",
    },
    {
      id: "act",
      station: "Hands",
      title: "Act",
      body: "When talking isn't enough, the agent calls tools: reads and writes real data, behind row-level security, with inputs validated and every call rate-limited.",
      stack: ["Tool calls", "Supabase · Postgres + RLS", "REST APIs"],
      log: 'tool    calendar.move(day="Fri") → ok, 10:00',
    },
    {
      id: "speak",
      station: "Voice",
      title: "Speak",
      body: "The answer is spoken back, streamed sentence by sentence so the first words arrive fast, with a local text-to-speech fallback when the free tier runs dry.",
      stack: ["Deepgram Aura-2", "Kokoro (local)", "streaming"],
      log: 'said    "Done. You\'re booked for Friday at ten."',
    },
  ],
  /** The wider toolbox, shown under the pipeline. Only list what you've shipped with. */
  toolbox: [
    "TypeScript",
    "Python",
    "Next.js",
    "React",
    "Tailwind",
    "Supabase",
    "Pipecat",
    "LiveKit",
    "Turborepo",
    "Vitest",
    "pytest",
    "GitHub Actions",
  ],
  /**
   * Off the clock: a few things outside engineering, shown as lit signs on a
   * little island next to the city. Leave the list empty to hide the section.
   * `note` is one short line.
   */
  offClock: [] as { title: string; note: string }[],
  /** Public contact email. Leave empty to hide the email button. */
  email: "",
  /** Path under /public, e.g. "/resume.pdf". Leave empty to hide. */
  resume: "",
  links: {
    github: "https://github.com/Addy4336",
    linkedin: "",
  },
} as const;
