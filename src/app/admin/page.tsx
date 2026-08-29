"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCms } from "@/lib/cms/provider";
import type { CmsPlan, CmsTestimonial, SiteContent } from "@/lib/cms/types";
import { DEFAULT_SITE } from "@/lib/cms/defaults";

const tabs = ["Conteúdo", "Planos", "Depoimentos", "Mídia"] as const;

export default function AdminPage() {
  const { content, save, ready } = useCms();
  const [draft, setDraft] = useState<SiteContent>(content);

  useEffect(() => {
    if (ready) setDraft(content);
  }, [ready, content]);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Conteúdo");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const persist = async () => {
    setSaving(true);
    await save(draft);
    setSaving(false);
    setSaved("No ar. Abra a vitrine em outra aba.");
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">Site</h1>
          <p className="text-sm text-slate-500">Textos, preços, fotos. O que o cliente vê na vitrine.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/produtos">Produtos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/" target="_blank">
              Ver site
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => setDraft(DEFAULT_SITE)}>
            Restaurar original
          </Button>
          <Button onClick={() => void persist()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar e publicar"}
          </Button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{saved}</div>
      )}

      <div className="mb-5 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === t ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Conteúdo" && (
        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-2">
          <Field label="Nome da marca" value={draft.brandName} onChange={(v) => set("brandName", v)} />
          <Field label="Selo do hero" value={draft.heroBadge} onChange={(v) => set("heroBadge", v)} />
          <Field label="Título" value={draft.heroHeadline} onChange={(v) => set("heroHeadline", v)} />
          <Field label="Destaque verde" value={draft.heroHighlight} onChange={(v) => set("heroHighlight", v)} />
          <Area label="Texto do hero" value={draft.heroBody} onChange={(v) => set("heroBody", v)} />
          <Field label="Botão principal" value={draft.heroCtaPrimary} onChange={(v) => set("heroCtaPrimary", v)} />
          <Field label="Botão secundário" value={draft.heroCtaSecondary} onChange={(v) => set("heroCtaSecondary", v)} />
          <Field label="Linha do ticker" value={draft.heroTicker} onChange={(v) => set("heroTicker", v)} />
          <Field label="Título: quando cai" value={draft.painTitle} onChange={(v) => set("painTitle", v)} />
          <Field label="Subtítulo: quando cai" value={draft.painSubtitle} onChange={(v) => set("painSubtitle", v)} />
          <Field label="Título recursos" value={draft.featuresTitle} onChange={(v) => set("featuresTitle", v)} />
          <Field label="Subtítulo recursos" value={draft.featuresSubtitle} onChange={(v) => set("featuresSubtitle", v)} />
          <Field label="Título preços" value={draft.pricingTitle} onChange={(v) => set("pricingTitle", v)} />
          <Field label="Subtítulo preços" value={draft.pricingSubtitle} onChange={(v) => set("pricingSubtitle", v)} />
          <Field label="Selo do plano em destaque" value={draft.pricingBadge} onChange={(v) => set("pricingBadge", v)} />
          <Field label="Título depoimentos" value={draft.socialTitle} onChange={(v) => set("socialTitle", v)} />
          <Field label="Kicker do fechamento" value={draft.closerKicker} onChange={(v) => set("closerKicker", v)} />
          <Field label="Título do fechamento" value={draft.closerTitle} onChange={(v) => set("closerTitle", v)} />
          <Area label="Texto do fechamento" value={draft.closerBody} onChange={(v) => set("closerBody", v)} />
          <Field label="CTA final" value={draft.closerCta} onChange={(v) => set("closerCta", v)} />
          <Area label="Texto do rodapé" value={draft.footerBlurb} onChange={(v) => set("footerBlurb", v)} />
        </div>
      )}

      {tab === "Planos" && (
        <div className="grid gap-4 md:grid-cols-3">
          {draft.plans.map((p, i) => (
            <PlanEditor
              key={i}
              plan={p}
              onChange={(next) =>
                setDraft((d) => ({
                  ...d,
                  plans: d.plans.map((x, idx) => (idx === i ? next : x)),
                }))
              }
            />
          ))}
        </div>
      )}

      {tab === "Depoimentos" && (
        <div className="space-y-4">
          <Field
            label="Rótulo do contador"
            value={draft.storesLabel}
            onChange={(v) => set("storesLabel", v)}
          />
          <Field
            label="Lojas ativas (número)"
            value={String(draft.storesCount)}
            onChange={(v) => set("storesCount", Number(v) || 0)}
          />
          <Field label="Logos (separados por vírgula)" value={draft.logos} onChange={(v) => set("logos", v)} />
          <div className="grid gap-4 md:grid-cols-3">
            {draft.testimonials.map((t, i) => (
              <TestimonialEditor
                key={i}
                item={t}
                onChange={(next) =>
                  setDraft((d) => ({
                    ...d,
                    testimonials: d.testimonials.map((x, idx) => (idx === i ? next : x)),
                  }))
                }
              />
            ))}
          </div>
        </div>
      )}

      {tab === "Mídia" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Logo da vitrine. Sem credencial, o arquivo fica neste aparelho.</p>
          {draft.logoUrl && (
            <img src={draft.logoUrl} alt="" className="mt-4 h-16 rounded-xl border object-contain" />
          )}
          <input
            type="file"
            accept="image/*"
            className="mt-4 text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => set("logoUrl", String(reader.result || ""));
              reader.readAsDataURL(f);
            }}
          />
          <Field
            className="mt-4"
            label="Ou cole a URL da logo"
            value={draft.logoUrl.startsWith("data:") ? "" : draft.logoUrl}
            onChange={(v) => set("logoUrl", v)}
          />
        </div>
      )}
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm md:col-span-2">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <textarea
        className="mt-1 min-h-[88px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function PlanEditor({ plan, onChange }: { plan: CmsPlan; onChange: (p: CmsPlan) => void }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <Field label="Nome" value={plan.name} onChange={(v) => onChange({ ...plan, name: v })} />
      <Field label="Subtítulo" value={plan.subtitle} onChange={(v) => onChange({ ...plan, subtitle: v })} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Field label="Preço" value={plan.price} onChange={(v) => onChange({ ...plan, price: v })} />
        <Field label="Unidade" value={plan.unit} onChange={(v) => onChange({ ...plan, unit: v })} />
      </div>
      <Area
        label="Recursos (um por linha)"
        value={plan.features.join("\n")}
        onChange={(v) => onChange({ ...plan, features: v.split("\n").filter(Boolean) })}
      />
      <Field label="Texto do botão" value={plan.cta} onChange={(v) => onChange({ ...plan, cta: v })} />
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={plan.featured}
          onChange={(e) => onChange({ ...plan, featured: e.target.checked })}
        />
        Destacar como escolha inteligente
      </label>
    </div>
  );
}

function TestimonialEditor({
  item,
  onChange,
}: {
  item: CmsTestimonial;
  onChange: (t: CmsTestimonial) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <Field label="Nome" value={item.name} onChange={(v) => onChange({ ...item, name: v })} />
      <Field label="Cargo / loja" value={item.role} onChange={(v) => onChange({ ...item, role: v })} />
      <Area label="Depoimento" value={item.text} onChange={(v) => onChange({ ...item, text: v })} />
      {item.photo && <img src={item.photo} alt="" className="mt-2 h-12 w-12 rounded-full object-cover" />}
      <input
        type="file"
        accept="image/*"
        className="mt-2 text-xs"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => onChange({ ...item, photo: String(reader.result || "") });
          reader.readAsDataURL(f);
        }}
      />
      <Field
        label="URL da foto"
        value={item.photo.startsWith("data:") ? "" : item.photo}
        onChange={(v) => onChange({ ...item, photo: v })}
      />
    </div>
  );
}
