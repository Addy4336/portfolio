import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Stage } from "@/world/Stage";
import "./globals.css";

const display = Unbounded({ variable: "--font-unbounded", subsets: ["latin"] });
const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Only used for small labels, so it stays off the critical path: not
// preloaded, and it swaps in when ready.
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: {
    default: "Adi · AI engineer building agents that listen and act",
    template: "%s · Adi",
  },
  description:
    "Adi is an AI engineer focused on agentic AI and voice AI. Explore a living city of agents, one district per project.",
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
        <Stage />
        <SmoothScroll />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
