"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { trackEvent } from "@/lib/analytics";

const LINE_URL = "https://line.me/R/ti/p/@038wyqas?ts=07251906&oat_content=url";

export default function Hero() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  return (
    <section
      ref={ref}
      id="hero"
      className="relative h-[100svh] w-full overflow-hidden bg-[#111]"
    >
      <motion.div
        style={{ scale }}
        className="absolute inset-0 h-full w-full"
      >
        <Image
          src="/stage-7.jpeg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-80"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/50" />

      <motion.div
        style={{ opacity, y }}
        className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 text-[11px] uppercase tracking-[0.4em] text-white/70"
        >
          — AMY KANO —
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.6,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="font-serif text-[clamp(3rem,10vw,9rem)] font-light leading-[0.95] text-white"
        >
          Ballet class<br className="hidden md:block" /> with <em className="italic font-light">Amy</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 max-w-md text-sm font-light leading-relaxed text-white/80 md:text-base"
        >
          伝統のワガノワ・メソッドで紡ぐ<br />
          美しくしなやかな表現の世界
        </motion.p>

        <motion.a
          href={LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("contact_click", { method: "LINE", location: "hero" })}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 inline-flex border border-white/40 px-8 py-4 text-[11px] uppercase tracking-[0.35em] text-white/70 transition-all duration-500 hover:border-white hover:text-white"
        >
          レッスンのお問い合わせ
        </motion.a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1.2 }}
        style={{ opacity }}
        className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-white/60">
          <span>Scroll</span>
          <div className="h-10 w-px bg-white/40" />
        </div>
      </motion.div>
    </section>
  );
}
