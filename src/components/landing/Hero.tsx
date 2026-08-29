"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DesktopMockup, PhoneMockup } from "@/components/ui/Mockup";
import { useParallax } from "@/lib/hooks/useParallax";
import { stagger, itemUp, itemFade } from "@/lib/animations";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { PhonePreview } from "@/components/landing/PhonePreview";
import { ChevronRight } from "lucide-react";
import { useCms } from "@/lib/cms/provider";

export function Hero() {
  const { content } = useCms();
  const { rx, ry, onPointerMove, onPointerLeave } = useParallax();
  const [n, setN] = useState(1842);

  useEffect(() => {
    const t = setInterval(() => setN((v) => v + 1), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#0F172A] text-white">
      <div
        className="pointer-events-none absolute -left-24 top-0 h-[36rem] w-[36rem] rounded-full bg-emerald-500/15 blur-[140px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-0 h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-[120px]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-16 px-4 py-20 sm:py-28 lg:flex-row lg:items-center lg:gap-12 lg:py-32">
        <motion.div className="w-full lg:w-[48%]" variants={stagger} initial="hidden" animate="show">
          <motion.div variants={itemUp}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium tracking-wide text-emerald-300 ring-1 ring-white/10">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              {content.heroBadge}
            </span>
          </motion.div>

          <motion.h1
            className="mt-7 text-[2.75rem] leading-[1.04] font-medium tracking-tight sm:text-6xl lg:text-[4.1rem]"
            variants={itemUp}
          >
            {content.heroHeadline}
            <span className="mt-3 block text-emerald-400">{content.heroHighlight}</span>
          </motion.h1>

          <motion.p className="mt-7 max-w-md text-lg leading-relaxed text-slate-300" variants={itemFade}>
            {content.heroBody}
          </motion.p>

          <motion.div className="mt-10 flex flex-wrap items-center gap-3" variants={itemUp}>
            <Button size="lg" className="h-12 px-6 shadow-lg shadow-emerald-500/20" asChild>
              <Link href="/pos">
                {content.heroCtaPrimary} <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-white/15 bg-white/5 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/dashboard">{content.heroCtaSecondary}</Link>
            </Button>
          </motion.div>

          <motion.p className="mt-8 font-mono text-xs tracking-wide text-slate-400" variants={itemFade}>
            <span className="text-emerald-400">{n.toLocaleString("pt-BR")}</span> {content.heroTicker}
          </motion.p>
        </motion.div>

        <motion.div
          className="relative w-full lg:w-[52%]"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          style={{ perspective: 1400 }}
        >
          <div className="relative mx-auto h-[440px] w-full max-w-[680px] sm:h-[520px]">
            <motion.div
              className="absolute left-0 top-6 z-10 hidden sm:block"
              style={{ x: rx, y: ry, rotateY: rx }}
            >
              <DesktopMockup>
                <DashboardPreview />
              </DesktopMockup>
            </motion.div>
            <motion.div
              className="absolute -right-1 bottom-0 z-20 hidden sm:block sm:right-6"
              style={{ x: rx }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <PhoneMockup>
                <PhonePreview />
              </PhoneMockup>
            </motion.div>
            <div className="sm:hidden">
              <PhoneMockup>
                <PhonePreview />
              </PhoneMockup>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
