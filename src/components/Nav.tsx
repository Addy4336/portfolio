import Link from "next/link";
import { site } from "@content/site";
import { SoundToggle } from "./SoundToggle";

const links = [
  { href: "/#about", label: "About" },
  { href: "/#pipeline", label: "How I build" },
  { href: "/#work", label: "Work" },
  { href: "/#contact", label: "Contact" },
];

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-linear-to-b from-void/90 via-void/50 to-transparent">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8"
      >
        <Link href="/" className="group flex items-center gap-2.5" aria-label={`${site.name}, home`}>
          <span className="relative grid size-2.5 place-items-center">
            <span className="absolute size-2.5 animate-ping rounded-full bg-signal/60" />
            <span className="size-2 rounded-full bg-signal" />
          </span>
          <span className="font-display text-lg font-semibold lowercase tracking-tight">
            {site.name}
          </span>
        </Link>

        <ul className="hidden items-center gap-1 rounded-full border border-line bg-void/70 p-1 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-full px-4 py-1.5 text-sm text-paper-dim transition-colors hover:bg-paper/10 hover:text-paper"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <SoundToggle />
          <Link
            href="/#contact"
            className="rounded-full bg-signal px-4 py-2 text-sm font-medium text-void transition-transform hover:-translate-y-0.5"
          >
            Get in touch
          </Link>
        </div>
      </nav>
    </header>
  );
}
