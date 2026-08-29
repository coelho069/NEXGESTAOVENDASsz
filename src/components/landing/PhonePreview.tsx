"use client";

import { motion } from "framer-motion";

const lines = [
  { name: "Café Arábica", qty: 1, price: "28,90" },
  { name: "Pão Francês", qty: 2, price: "3,60" },
  { name: "Água Mineral", qty: 1, price: "3,20" },
];

export function PhonePreview() {
  return (
    <div className="flex h-full flex-col bg-slate-900 p-4 pt-10 text-white">
      <div className="text-[10px] font-medium text-emerald-300">PDV · Mercado Demo</div>
      <div className="mt-1 text-lg font-medium tracking-tight">Nova venda</div>
      <motion.div
        className="mt-4 flex-1 rounded-2xl bg-white p-3 text-slate-900"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {lines.map((l) => (
          <div key={l.name} className="flex justify-between border-b border-slate-100 py-1.5 text-[10px]">
            <span>
              {l.name} ×{l.qty}
            </span>
            <span>R$ {l.price}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between text-xs font-semibold">
          <span>Total</span>
          <span>R$ 35,70</span>
        </div>
        <div className="mt-3 rounded-xl bg-emerald-500 py-2 text-center text-[10px] font-medium text-white">
          Pago no Pix
        </div>
      </motion.div>
      <div className="mt-3 text-center text-[9px] text-slate-400">Funciona offline</div>
    </div>
  );
}
