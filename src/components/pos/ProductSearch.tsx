"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ProductSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        placeholder="Nome, código de barras ou SKU"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 pl-10 text-base"
        autoFocus
      />
    </div>
  );
}
