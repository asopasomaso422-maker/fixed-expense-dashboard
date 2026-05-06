import FadeIn from "./FadeIn";
import TrackedLink from "./TrackedLink";

const MAPS_URL = "https://maps.app.goo.gl/oyMcuKuTciQFRezL9";

export default function Studio() {
  return (
    <section
      id="studio"
      aria-labelledby="studio-heading"
      className="relative border-t border-border py-32 md:py-48"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <FadeIn>
          <p className="mb-6 text-center text-[11px] uppercase tracking-[0.4em] text-muted">
            — Studio —
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2
            id="studio-heading"
            className="mx-auto mb-6 max-w-3xl text-center font-serif text-[clamp(2.25rem,4.5vw,3.75rem)] font-light leading-[1.1]"
          >
            Visit the <em className="italic">Studio</em>
          </h2>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mx-auto mb-16 max-w-md text-center text-sm font-light leading-relaxed text-foreground/70">
            石川県金沢市にてレッスンを開催しています。
          </p>
        </FadeIn>

        <FadeIn delay={0.25}>
          <div className="mb-8 grid grid-cols-2 gap-y-8 border-b border-border pb-8 md:grid-cols-3 md:divide-x md:divide-border">
            <div className="md:pr-8">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-muted">Studio</p>
              <p className="text-xl font-light">アトリエ泉野</p>
            </div>
            <div className="md:px-8">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-muted">Location</p>
              <p className="text-[13px] font-light leading-relaxed text-foreground/80">
                石川県金沢市泉野町3-1-35
              </p>
            </div>
            <div className="col-span-2 flex items-center md:col-span-1 md:justify-end md:pl-8">
              <TrackedLink
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                eventName="map_click"
                eventParams={{ location: "studio_section" }}
                className="text-[11px] uppercase tracking-[0.3em] text-muted transition-colors hover:text-foreground"
              >
                Google マップで開く →
              </TrackedLink>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="overflow-hidden border border-border">
            <iframe
              title="Ballet class with Amy — Studio Location"
              src="https://maps.google.com/maps?q=石川県金沢市泉野町3-1-35&output=embed&hl=ja"
              width="100%"
              height="450"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
