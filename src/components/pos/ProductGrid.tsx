"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { stagger, itemUp } from "@/lib/animations";
import { ProductCard } from "@/components/pos/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

export function ProductGrid({ query, category = "Todos" }: { query: string; category?: string }) {
  const { state } = useStore();
  const { products, ready } = state;

  const visible = products.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchCat = category === "Todos" || p.category === category;
    if (!matchCat) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode ?? "").includes(q) ||
      (p.sku ?? "").toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  if (!ready) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">Nada encontrado para “{query || category}”.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      variants={stagger}
      initial="hidden"
      animate="show"
      key={`${query}-${category}`}
    >
      {visible.map((p) => (
        <motion.div key={p.id} variants={itemUp}>
          <ProductCard product={p} />
        </motion.div>
      ))}
    </motion.div>
  );
}
