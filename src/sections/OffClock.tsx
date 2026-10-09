type Item = { title: string; note: string };

/**
 * Off the clock: the camera visits the little park island west of the city.
 * Renders nothing when content/site.ts lists no items.
 */
export function OffClock({ items }: { items: readonly Item[] }) {
  if (!items.length) return null;
  return (
    <section id="off-the-clock" data-cam="offclock" data-cam-hold="0.7" aria-labelledby="offclock-title" className="relative min-h-[140svh]">
      <div className="sticky top-0 flex min-h-svh items-end px-4 pb-8 pt-24 sm:px-8 md:items-center md:pb-0">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-2xl border border-line bg-void/90 p-5 sm:p-7 md:w-[min(30rem,42vw)]">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet">Off the clock</p>
            <h2 id="offclock-title" className="mt-3 font-display text-3xl font-semibold tracking-tight">
              Outside the city.
            </h2>
            <ul className="mt-5 space-y-3">
              {items.map((item) => (
                <li key={item.title} className="border-l-2 border-violet pl-4">
                  <p className="font-display text-base">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-paper-dim">{item.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
