import Image from "next/image";
import FadeIn from "./FadeIn";
import TrackedLink from "./TrackedLink";

const LINE_URL = "https://line.me/R/ti/p/@038wyqas?ts=07251906&oat_content=url";

const classes = [
  {
    id: "open-class",
    label: "Open Class",
    target: "経験者・ステップアップ",
    imageSrc: "/stage-1.JPG",
    description:
      "本場仕込みの正統なメソッドで、あなたの踊りを次のステージへ。基礎をじっくり深めるクラスから、表現力を磨くステップアップクラスまで。ブランクがある方も歓迎。指先一つひとつの「美しさの理由」を丁寧に紐解きます。",
  },
  {
    id: "diet-ballet",
    label: "Diet Ballet",
    target: "初心者・ママ向け",
    imageSrc: "/stage-2.JPG",
    description:
      "「私」を取り戻す、1時間の贅沢。日常を美しく変えるバレエ。難しいことは一切ナシ。美しい音楽に合わせ、しなやかな体と凛とした姿勢を目指します。お子様連れもOK（ご相談ください）家事や育児の合間に、心と体をリフレッシュしませんか？",
  },
  {
    id: "private",
    label: "Private",
    target: "マンツーマンレッスン",
    imageSrc: "/stage-3.JPG",
    description:
      "あなただけのために組み立てる、完全オーダーメイドのレッスン。目標・体力・経験に合わせた個別指導で、最短で成長を実感できます。初心者から上級者まで、自分のペースで丁寧に。",
  },
] as const;

export default function Lessons() {
  return (
    <section
      id="lessons"
      aria-labelledby="lessons-heading"
      className="relative border-t border-border py-32 md:py-48"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <FadeIn>
          <p className="mb-6 text-center text-[11px] uppercase tracking-[0.4em] text-muted">
            — Lessons —
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2
            id="lessons-heading"
            className="mx-auto mb-6 max-w-3xl text-center font-serif text-[clamp(2.25rem,4.5vw,3.75rem)] font-light leading-[1.1]"
          >
            Join the <em className="italic">Studio</em>
          </h2>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mx-auto mb-24 max-w-md text-center text-sm font-light leading-relaxed text-foreground/70 md:mb-32">
            石川県金沢市にてレッスンを開催しています。<br />
            お問い合わせ・ご予約は公式LINEにて承っております。
          </p>
        </FadeIn>

        <ul className="grid gap-6 md:grid-cols-3">
          {classes.map((c, i) => (
            <li key={c.id} className="flex">
              <FadeIn delay={i * 0.1} className="flex w-full flex-col">
                <div className="group flex h-full flex-col border border-border">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#eeeae2]">
                    <Image
                      src={c.imageSrc}
                      alt={c.label}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-8 md:p-10">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.4em] text-muted">
                      {c.label}
                    </p>
                    <p className="mb-6 font-serif text-xl font-light text-foreground/60">
                      {c.target}
                    </p>
                    <p className="flex-1 text-[14px] font-light leading-[1.9] text-foreground/75">
                      {c.description}
                    </p>
                  </div>
                </div>
              </FadeIn>
            </li>
          ))}
        </ul>

        <FadeIn delay={0.4}>
          <div className="mt-16 flex flex-col items-center gap-4">
            <TrackedLink
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              eventName="click_line_add"
              eventParams={{ location: "lessons_main_cta" }}
              className="inline-flex items-center justify-center bg-foreground px-10 py-5 text-[12px] uppercase tracking-[0.35em] text-background transition-opacity hover:opacity-75"
            >
              LINEでレッスンのご相談
            </TrackedLink>
            <TrackedLink
              href="https://mail.google.com/mail/?view=cm&fs=1&to=amyodonoghue1121@gmail.com&su=%E3%83%AC%E3%83%83%E3%82%B9%E3%83%B3%E3%81%AE%E3%81%8A%E5%95%8F%E3%81%84%E5%90%88%E3%82%8F%E3%81%9B"
              target="_blank"
              rel="noopener noreferrer"
              eventName="click_email_contact"
              eventParams={{ location: "lessons_section" }}
              className="text-[11px] uppercase tracking-[0.3em] text-muted transition-colors hover:text-foreground"
            >
              メールでお問い合わせ →
            </TrackedLink>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
