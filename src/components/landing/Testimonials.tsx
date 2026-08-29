"use client";

import { motion } from "framer-motion";
import { stagger, itemUp } from "@/lib/animations";
import { Counter } from "@/components/landing/Counter";
import { useCms } from "@/lib/cms/provider";

export function Testimonials() {
  const { content } = useCms();
  const logos = content.logos.split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <motion.div
      className="flex flex-col items-center gap-12"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      <motion.div variants={itemUp} className="text-center">
        <span className="text-sm font-medium text-slate-500">{content.storesLabel}</span>
        <div className="mt-2 text-5xl font-medium tracking-tight text-slate-900">
          <Counter value={content.storesCount} suffix="+" />
        </div>
      </motion.div>
      <motion.div
        variants={itemUp}
        className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium tracking-wide text-slate-400"
      >
        {logos.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </motion.div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {content.testimonials.map((t) => (
          <motion.figure
            key={t.name}
            variants={itemUp}
            className="flex h-full flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm"
          >
            <blockquote className="flex-1 text-sm leading-relaxed text-slate-700">“{t.text}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              {t.photo ? (
                <img src={t.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="h-10 w-10 rounded-full bg-slate-200" />
              )}
              <div>
                <div className="text-sm font-medium text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-500">{t.role}</div>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </motion.div>
  );
}
