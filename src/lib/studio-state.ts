/**
 * The Studio's live interview, shared between the set in 3D (Alex's mouth,
 * the level meter, the candidate) and the speech bubble. A plain mutable
 * object: it changes every frame and must never trigger a React render.
 *
 * The prompts are real: questions and follow-ups copied from InterviewIQ's
 * own question bank (apps/voice-server/interview/bank.py), plus the opening
 * from a recorded session.
 */
export type Prompt = { topic: string; question: string; followUp: string };

export const PROMPTS: Prompt[] = [
  {
    topic: "opening",
    question: "Could you introduce yourself, your background and what you've been working on recently?",
    followUp: "Can you tell me a bit more about your recent role and the projects you've been focused on?",
  },
  {
    topic: "web performance",
    question: "Our Largest Contentful Paint is 4.5 seconds on mobile. What is your plan?",
    followUp: "How do you measure it in the field, not just in the lab?",
  },
  {
    topic: "api design",
    question: "How would you design a rate limiter for a public API?",
    followUp: "What if you run ten instances behind a load balancer?",
  },
  {
    topic: "consistency",
    question: "Two users book the last seat at the same moment. Walk me through how your system makes sure only one wins.",
    followUp: "Optimistic or pessimistic locking, and why?",
  },
  {
    topic: "system design",
    question: "Design a URL shortener. Before drawing anything, what questions do you ask me?",
    followUp: "What are the read and write volumes?",
  },
  {
    topic: "incident response",
    question: "It is 2 a.m. and error rates have tripled. Take me through the first fifteen minutes.",
    followUp: "How do you decide whether to roll back?",
  },
  {
    topic: "accessibility",
    question: "How do you make a custom dropdown or modal accessible?",
    followUp: "What does focus management look like?",
  },
  {
    topic: "evaluation",
    question: "When is accuracy a misleading metric, and what do you use instead?",
    followUp: "How would you choose a decision threshold?",
  },
  {
    topic: "failure",
    question: "Describe a project that failed or a mistake that mattered. What did you learn?",
    followUp: "What did you change afterwards?",
  },
  {
    topic: "product metrics",
    question: "Weekly active users are up 15% but revenue is flat. What do you do?",
    followUp: "What hypotheses do you form first?",
  },
  {
    topic: "sales",
    question: "A prospect says, 'Your price is too high.' What do you say?",
    followUp: "What if they say a competitor is cheaper?",
  },
  {
    topic: "motivation",
    question: "Why this role, and why now?",
    followUp: "What would make you leave in a year?",
  },
];

/** The interview moves through these, then on to the next prompt. */
export type StudioPhase = "question" | "answer" | "followup" | "answer2";

export const studio = {
  index: 0,
  phase: "question" as StudioPhase,
  /** Clock seconds at which the current phase began (-1 before the first frame). */
  phaseStart: -1,
  /** How loudly Alex is speaking right now, 0…1 (smoothed). */
  speaking: 0,
  /** How busily the candidate is typing, 0…1 (smoothed). */
  typing: 0,
  /** Bumped whenever the text the bubble should show changes. */
  version: 0,
};

/** Fired on window when a visitor asks Alex for another question. */
export const STUDIO_ASK_EVENT = "studio:ask";

/** Seconds Alex spends speaking a line, and how long the line then stays up to be read. */
export function speechSeconds(text: string) {
  return Math.min(7, 0.7 + text.length * 0.048);
}
export function phaseSeconds(phase: StudioPhase, p: Prompt) {
  switch (phase) {
    case "question":
      return speechSeconds(p.question) + 2.4;
    case "followup":
      return speechSeconds(p.followUp) + 2.2;
    case "answer":
      return 3;
    case "answer2":
      return 2.4;
  }
}
