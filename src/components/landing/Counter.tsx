"use client";

import { useEffect, useState } from "react";

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

export function Counter({
  value,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = 0;
    const delta = value - start;
    const duration = 1400;
    let startTime = 0;
    function step(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + delta * ease);
      if (progress < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={className}>
      {prefix}
      {fmt(display)}
      {suffix}
    </span>
  );
}
