"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { currency } from "@/lib/utils";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: Product }) {
  const { actions } = useStore();
  const low = product.stock > 0 && product.stock <= 3;
  const out = product.stock <= 0;

  return (
    <motion.button
      type="button"
      onClick={() => actions.addToCart(product, 1)}
      disabled={out}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      whileTap={out ? undefined : { scale: 0.98 }}
      whileHover={out ? undefined : { y: -3 }}
    >
      <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">sem foto</div>
        )}
        <span className="absolute right-2 top-2">
          <Badge variant={out ? "destructive" : low ? "warning" : "success"} className="text-[10px]">
            {out ? "Esgotado" : `${product.stock}`}
          </Badge>
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-wide text-slate-400">
        {product.unit === "kit" ? "Kit" : product.category}
        {product.unit !== "un" && product.unit !== "kit" ? ` · ${product.unit}` : ""}
      </span>
      <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-slate-900">
        {product.name}
      </h3>
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-base font-semibold tracking-tight">{currency(product.price)}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100">
          <Plus className="h-4 w-4" />
        </span>
      </div>
    </motion.button>
  );
}
