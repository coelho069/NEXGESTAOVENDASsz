"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { stagger, itemUp } from "@/lib/animations";
import { ShoppingCart, PackageCheck, BarChart3 } from "lucide-react";

const features = [
  {
    title: "PDV inteligente",
    desc: "Busca no toque, item no clique, PIX em um gesto. Feito para o balcão — não para o mouse.",
    icon: ShoppingCart,
    span: "md:col-span-2 md:row-span-2",
    visual: "pos",
  },
  {
    title: "Estoque via XML",
    desc: "A NF-e entra. O saldo sobe. Validade acende amarelo antes de virar perda.",
    icon: PackageCheck,
    span: "md:col-span-2",
    visual: "xml",
  },
  {
    title: "Financeiro ao vivo",
    desc: "Faturamento e margem crescem no gráfico enquanto o turno acontece.",
    icon: BarChart3,
    span: "md:col-span-2",
    visual: "chart",
  },
];

export function FeaturesGrid() {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 md:grid-cols-4"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {features.map((f) => {
        const Icon = f.icon;
        return (
          <motion.article
            key={f.title}
            variants={itemUp}
            className={cn(
              "group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm",
              f.span
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-emerald-400">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-medium tracking-tight text-slate-900">{f.title}</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">{f.desc}</p>
            <div className="mt-6">
              {f.visual === "pos" && <MiniPos />}
              {f.visual === "xml" && <MiniXml />}
              {f.visual === "chart" && <MiniChart />}
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
}

function MiniPos() {
  const tiles = ["Café", "Pão", "Leite", "Água", "Azeite", "Pix"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((t, i) => (
        <motion.div
          key={t}
          className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4 text-center text-sm text-slate-700"
          whileHover={{ y: -3, backgroundColor: "#ecfdf5" }}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05 }}
        >
          {t}
        </motion.div>
      ))}
    </div>
  );
}

function MiniXml() {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4 font-mono text-[11px] leading-relaxed text-slate-600">
      <div className="text-emerald-700">&lt;det nItem=&quot;1&quot;&gt; Leite UHT × 24</div>
      <div>&lt;det nItem=&quot;2&quot;&gt; Açúcar 1kg × 20</div>
      <div className="mt-2 text-emerald-800">→ 44 unidades no estoque</div>
    </div>
  );
}

function MiniChart() {
  const bars = [42, 55, 48, 70, 63, 88, 96];
  return (
    <div className="flex h-24 items-end gap-2">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-md bg-emerald-400/80"
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.06 }}
        />
      ))}
    </div>
  );
}
