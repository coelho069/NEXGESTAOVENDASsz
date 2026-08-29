"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function DesktopMockup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div className={cn("pointer-events-none relative", className)}>
      <div className="relative w-[min(520px,78vw)] rounded-[26px] border border-slate-200 bg-slate-50 p-1.5 shadow-2xl shadow-black/15">
        <div className="flex h-6 items-end gap-2 rounded-t-[22px] bg-slate-100 px-3">
          <div className="mb-2 flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-300" />
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
          </div>
        </div>
        <div className="h-[300px] overflow-hidden rounded-b-[22px] bg-white sm:h-[340px]">{children}</div>
      </div>
    </motion.div>
  );
}

export function PhoneMockup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div className={cn("pointer-events-none relative", className)}>
      <div className="relative h-[380px] w-[190px] rounded-[32px] border border-slate-200 bg-slate-100 p-1.5 shadow-2xl shadow-black/25 sm:h-[420px] sm:w-[210px]">
        <div className="absolute left-1/2 top-3 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-900/80" />
        <div className="h-full w-full overflow-hidden rounded-[26px] bg-white">{children}</div>
      </div>
    </motion.div>
  );
}
