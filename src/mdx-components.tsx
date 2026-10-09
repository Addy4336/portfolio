import type { MDXComponents } from "mdx/types";

// Required by @next/mdx in the App Router. Styling of case-study prose lives
// in the work page; add custom MDX components (figures, callouts) here.
const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
  return components;
}
