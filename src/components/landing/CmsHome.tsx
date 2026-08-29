"use client";

import Link from "next/link";
import { LandingNav } from "@/components/layout/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { DorVsSolucao } from "@/components/landing/DorVsSolucao";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { Footer } from "@/components/landing/Footer";
import { Section } from "@/components/layout/Section";
import { useCms } from "@/lib/cms/provider";

export function CmsHome() {
  const { content } = useCms();
  return (
    <main className="relative isolate overflow-x-hidden">
      <LandingNav />
      <Hero />
      <div className="bg-white">
        <Section id="recursos-dor" title={content.painTitle} subtitle={content.painSubtitle}>
          <DorVsSolucao />
        </Section>
        <Section id="recursos" title={content.featuresTitle} subtitle={content.featuresSubtitle}>
          <FeaturesGrid />
        </Section>
        <Section id="precos" title={content.pricingTitle} subtitle={content.pricingSubtitle}>
          <Pricing />
        </Section>
        <Section id="depoimentos" title={content.socialTitle} subtitle={content.socialSubtitle}>
          <Testimonials />
        </Section>
        <section className="border-t border-slate-200 bg-[#0F172A] py-24 text-white">
          <div className="mx-auto flex max-w-2xl flex-col items-center px-4 text-center">
            <p className="text-[11px] font-medium tracking-[0.2em] text-emerald-400 uppercase">
              {content.closerKicker}
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight sm:text-5xl">{content.closerTitle}</h2>
            <p className="mt-4 text-slate-300">{content.closerBody}</p>
            <Link
              href="/pos"
              className="mt-10 inline-flex items-center rounded-xl bg-emerald px-6 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-dark"
            >
              {content.closerCta}
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    </main>
  );
}
