"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { useCms } from "@/lib/cms/provider";

const links = [
  { href: "#recursos", label: "Recursos" },
  { href: "#precos", label: "Preços" },
  { href: "#depoimentos", label: "Quem usa" },
];

export function LandingNav() {
  const { content } = useCms();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0F172A]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" aria-label={content.brandName}>
          {content.logoUrl ? (
            <img src={content.logoUrl} alt={content.brandName} className="h-8 w-auto" />
          ) : (
            <Logo invert />
          )}
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="hidden text-slate-300 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <Link href="/login">Entrar</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="hidden text-slate-300 hover:bg-white/10 hover:text-white md:inline-flex"
          >
            <Link href="/admin">Site</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/pos">{content.heroCtaPrimary}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
