import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import { site } from "@content/site";
import { CityHover } from "@/components/CityHover";
import { Nav } from "@/components/Nav";
import { SmoothScroll } from "@/components/SmoothScroll";
import { assignDistricts } from "@/lib/districts";
import { getProjects } from "@/lib/projects";
import { Stage } from "@/world/Stage";
import "./globals.css";

const display = Unbounded({ variable: "--font-unbounded", subsets: ["latin"] });
const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Only used for small labels, so it stays off the critical path: not
// preloaded, and `optional` means a late arrival never swaps in mid-page
// (that reflowed the labels and caused layout shift). It's still fetched and
// cached, so later page views use it.
const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
  display: "optional",
  // Until it's cached, labels use the system monospace (not a sans fallback).
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

const description = `${site.name} is an ${site.role.toLowerCase()} focused on ${site.focus
  .join(" and ")
  .toLowerCase()}. Explore a living city of agents, one district per project.`;

export const metadata: Metadata = {
  ...(site.url ? { metadataBase: new URL(site.url) } : {}),
  title: {
    default: `${site.name} · ${site.headline.replace(/\.$/, "")}`,
    template: `%s · ${site.name}`,
  },
  description,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} · ${site.role}`,
    description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "A night-time city of tiny agents, one district per project" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
};

export const viewport: Viewport = {
  themeColor: "#07080C",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} antialiased`}
    >
      <body>
        <Stage projects={assignDistricts(getProjects())} />
        <SmoothScroll />
        <div className="relative z-10">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-signal focus:px-4 focus:py-2 focus:text-void"
          >
            Skip to content
          </a>
          <Nav />
          <CityHover />
          <div id="main">{children}</div>
        </div>
      </body>
    </html>
  );
}
