// =====================================================================
// FluxoGestão — Hook: subtle 3D parallax for mouse-driven depth
// =====================================================================
"use client";
import { useMotionValue, useSpring } from "framer-motion";

export function useParallax() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = { type: "spring", stiffness: 300, damping: 20 } as const;
  const rx = useSpring(x, spring);
  const ry = useSpring(y, spring);

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * 20);
    y.set(((e.clientY - r.top) / r.height - 0.5) * -20);
  };
  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };
  return { rx, ry, onPointerMove, onPointerLeave };
}
