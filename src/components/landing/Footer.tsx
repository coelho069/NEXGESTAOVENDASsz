"use client";

import { Logo } from "@/components/brand/Logo";
import { useCms } from "@/lib/cms/provider";

export function Footer() {
  const { content } = useCms();
  return (
    <footer className="border-t border-slate-200/60 bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:justify-between">
        <div className="max-w-xs">
          <Logo className="text-sm" />
          <p className="mt-3 text-sm text-slate-600">{content.footerBlurb}</p>
          <p className="mt-4 text-xs text-slate-500">
            © {new Date().getFullYear()} {content.brandName}. Demo comercial.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
              Produto
            </span>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>
                <a href="#recursos" className="hover:text-slate-900">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#precos" className="hover:text-slate-900">
                  Preços
                </a>
              </li>
              <li>
                <a href="/pos" className="hover:text-slate-900">
                  PDV
                </a>
              </li>
            </ul>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
              Loja
            </span>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>
                <a href="/dashboard" className="hover:text-slate-900">
                  Gestão
                </a>
              </li>
              <li>
                <a href="/loja" className="hover:text-slate-900">
                  Catálogo
                </a>
              </li>
            </ul>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
              Legal
            </span>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>
                <a href="#depoimentos" className="hover:text-slate-900">
                  Quem usa
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
