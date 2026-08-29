// =====================================================================
// FluxoGestão — Layout: Section wrapper (consistent padding/alignment)
// =====================================================================
import { cn } from "@/lib/utils";

export function Section({
  className,
  id,
  title,
  subtitle,
  children,
}: {
  className?: string;
  id?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:py-24",
        className
      )}
    >
      {(title || subtitle) && (
        <header className="mb-12 sm:mb-16">
          {title && (
            <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">
              {title}
            </h2>
          )}
          {subtitle && <p className="mt-4 max-w-2xl text-slate-600">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
