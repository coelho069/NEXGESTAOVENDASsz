"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";
import { useCms } from "@/lib/cms/provider";

export function Pricing() {
  const { content } = useCms();
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:items-stretch">
      {content.plans.map((p, i) => (
        <motion.div
          key={p.name + i}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className={
            p.featured
              ? "relative rounded-3xl bg-slate-900 p-7 text-white shadow-2xl shadow-slate-900/20 md:-translate-y-3"
              : "relative rounded-3xl border border-slate-200 bg-white p-7"
          }
        >
          {p.featured && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white">
              {content.pricingBadge}
            </span>
          )}
          <h3 className="text-xl font-medium">{p.name}</h3>
          <p className={p.featured ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-slate-500"}>
            {p.subtitle}
          </p>
          <div className="mt-6">
            <span className="text-4xl font-medium tracking-tight">R$ {p.price}</span>
            <span className={p.featured ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
              {" "}
              {p.unit}
            </span>
          </div>
          <ul className="mt-6 space-y-2.5">
            {p.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className={p.featured ? "h-4 w-4 text-emerald-400" : "h-4 w-4 text-emerald-600"} />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-8 w-full" variant={p.featured ? "primary" : "secondary"}>
            <Link href="/pos">{p.cta}</Link>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
