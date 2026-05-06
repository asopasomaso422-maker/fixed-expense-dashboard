import FadeIn from "./FadeIn";
import TrackedLink from "./TrackedLink";

export default function Activities() {
  return (
    <section
      id="activities"
      aria-labelledby="activities-heading"
      className="relative border-t border-border py-32 md:py-48"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <FadeIn>
          <p className="mb-6 text-center text-[11px] uppercase tracking-[0.4em] text-muted">
            — Podcast —
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2
            id="activities-heading"
            className="mx-auto mb-24 max-w-3xl text-center font-serif text-[clamp(2.25rem,4.5vw,3.75rem)] font-light leading-[1.1] md:mb-32"
          >
            Listen on<br />
            <em className="italic">Spotify</em>
          </h2>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mb-12 flex items-end justify-between border-b border-border pb-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted" aria-hidden="true">
                Podcast
              </span>
              <h3 className="font-serif text-2xl font-light">On Spotify</h3>
            </div>
            <TrackedLink
              href="https://open.spotify.com/show/3IqD4NhHb5y2fpZwTLkDKP"
              target="_blank"
              rel="noopener noreferrer"
              eventName="social_click"
              eventParams={{ platform: "Spotify" }}
              className="text-[11px] uppercase tracking-[0.3em] text-muted transition-colors hover:text-foreground"
            >
              Listen →
            </TrackedLink>
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <div className="overflow-hidden border border-border bg-white">
            <iframe
              title="Ballet class with Amy Podcast on Spotify"
              src="https://open.spotify.com/embed/show/3IqD4NhHb5y2fpZwTLkDKP?utm_source=generator&theme=0"
              width="100%"
              height="232"
              style={{ border: 0 }}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
