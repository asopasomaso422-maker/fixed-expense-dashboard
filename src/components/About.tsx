import Image from "next/image";
import FadeIn from "./FadeIn";

export default function About() {
  return (
    <section id="about" className="relative py-32 md:py-48">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <FadeIn>
          <p className="mb-20 text-center text-[11px] uppercase tracking-[0.4em] text-muted md:mb-28">
            — About —
          </p>
        </FadeIn>

        <div className="grid grid-cols-12 items-start gap-y-16 md:gap-x-12">
          <FadeIn className="col-span-12 md:col-span-5 md:col-start-1 md:pt-24">
            <div className="group relative aspect-[3/4] w-full overflow-hidden bg-[#eeeae2]">
              <Image
                src="/自己紹介.jpg"
                alt="Amy Ballet — プロフィール写真"
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              />
            </div>
          </FadeIn>

          <div className="col-span-12 md:col-span-6 md:col-start-7">
            <FadeIn delay={0.1}>
              <h2 className="font-serif text-[clamp(2.5rem,5.5vw,4.5rem)] font-light leading-[1.05]">
                A quiet
                <br />
                <em className="italic">devotion</em>
                <br />
                to movement.
              </h2>
            </FadeIn>

            <FadeIn delay={0.25}>
              <div className="mt-12 max-w-md space-y-6 text-[15px] font-light leading-[1.9] text-foreground/80">
                <p>
                  7歳からクラシックバレエをはじめ、15歳で本場ロシア国立ワガノワバレエアカデミーに入学。
                  その後、ロシア国立バレエ団で10年間プリマバレリーナを務めるが復帰不可能な怪我に遭う。
                  現在は、北陸でバレエオープンクラスを行っています。
                </p>
                <p>
                  映像クリエイターの旦那に出会い、バレエとは違う世界も見てきました。
                  これまでのバレエの指導とは一味違った私にしか伝えられないバレエをお伝えします。
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.35}>
              <div className="mt-12 border-t border-border pt-10">
                <p className="mb-5 text-[11px] uppercase tracking-[0.4em] text-muted">
                  — 経歴 —
                </p>
                <ul className="space-y-2 text-[13px] font-light leading-[1.85] text-foreground/75">
                  <li>こうべ全国洋舞コンクール 第一位</li>
                  <li>バレエコンペティションin奈良 第一位</li>
                  <li>YAGP ユースアメリカグランプリ Top 12</li>
                  <li>エストニア国際バレエコンクール 第二位</li>
                  <li>ワガノワバレエアカデミー 卒業</li>
                  <li>ロシア国立チャイコフスキー記念バレエ団 入団</li>
                </ul>
                <p className="mt-4 text-[13px] font-light leading-[1.85] text-foreground/75">
                  「白鳥の湖」オデット・オディール、「ラ・バヤデール」ニキヤ、「ドン・キホーテ」キトリ、
                  「眠れる森の美女」オーロラ姫、「くるみ割り人形」マーシャ、「ロミオとジュリエット」ジュリエットなど
                  ほぼ全ての作品の主役を踊る。現在は Ballet class with Amy バレエ講師を務める。
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-border pt-10 text-[12px] uppercase tracking-[0.2em]">
                <div>
                  <dt className="text-muted">Based in</dt>
                  <dd className="mt-2 font-serif text-xl tracking-normal normal-case">
                    Kanazawa, JP
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Since</dt>
                  <dd className="mt-2 font-serif text-xl tracking-normal normal-case">
                    2025 / 4
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Discipline</dt>
                  <dd className="mt-2 font-serif text-xl tracking-normal normal-case">
                    Classical Ballet
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Focus</dt>
                  <dd className="mt-2 font-serif text-xl tracking-normal normal-case">
                    Stage × Editorial
                  </dd>
                </div>
              </dl>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
