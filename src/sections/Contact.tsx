"use client";

import { ArrowUp, Check, CodeXml, Copy, FileText, Link2, Mail, Radio } from "lucide-react";
import { useState } from "react";
import { scrollToTarget } from "@/components/SmoothScroll";
import { sendFlare } from "@/lib/signal";

type Props = {
  name: string;
  availability: string;
  email: string;
  resume: string;
  links: { github?: string; linkedin?: string };
};

/** Contact: the camera pulls back over the whole city; reaching out fires a flare from HQ. */
export function Contact({ name, availability, email, resume, links }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    sendFlare();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  const linkClass =
    "inline-flex items-center gap-2 rounded-full border border-line bg-void/70 px-4 py-2 text-sm text-paper transition-colors hover:border-paper/40";

  return (
    <>
      <section id="contact" data-cam="contact" aria-labelledby="contact-title" className="relative flex min-h-[110svh] items-end px-4 pb-16 pt-24 sm:px-8 md:items-center">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">Radio tower · contact</p>
            <h2 id="contact-title" className="mt-3 font-display text-5xl font-semibold tracking-tight sm:text-7xl">
              Send a signal.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-paper-dim">
              Building something with voice or agents, hiring for it, or curious how something in
              this city works? Say hello.
            </p>
            <p className="mt-4 flex items-center gap-2 font-mono text-xs text-paper-dim">
              <span className="size-1.5 rounded-full bg-signal" aria-hidden />
              {availability}
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {email ? (
                <>
                  <button
                    type="button"
                    onClick={copy}
                    className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-3 font-medium text-void transition-transform hover:-translate-y-0.5"
                  >
                    {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                    {copied ? "Copied. Signal sent" : "Copy email"}
                  </button>
                  <a href={`mailto:${email}`} onClick={sendFlare} className={linkClass}>
                    <Mail size={15} aria-hidden /> {email}
                  </a>
                </>
              ) : (
                <button
                  type="button"
                  onClick={sendFlare}
                  className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-3 font-medium text-void transition-transform hover:-translate-y-0.5"
                >
                  <Radio size={16} aria-hidden /> Send a signal
                </button>
              )}
              {links.github && (
                <a href={links.github} target="_blank" rel="noreferrer" className={linkClass}>
                  <CodeXml size={15} aria-hidden /> GitHub
                </a>
              )}
              {links.linkedin && (
                <a href={links.linkedin} target="_blank" rel="noreferrer" className={linkClass}>
                  <Link2 size={15} aria-hidden /> LinkedIn
                </a>
              )}
              {resume && (
                <a href={resume} target="_blank" rel="noreferrer" className={linkClass}>
                  <FileText size={15} aria-hidden /> Résumé
                </a>
              )}
            </div>
            <p aria-live="polite" className="sr-only">
              {copied ? "Email address copied to the clipboard" : ""}
            </p>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-line bg-void/85 px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm text-paper-dim">
          <p>
            © {new Date().getFullYear()} {name}. The whole city is drawn in code with three.js, React
            Three Fiber and GSAP: not a single 3D model was downloaded.
          </p>
          <button
            type="button"
            onClick={() => scrollToTarget(0)}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-paper hover:text-signal"
          >
            Back to top <ArrowUp size={14} aria-hidden />
          </button>
        </div>
      </footer>
    </>
  );
}
