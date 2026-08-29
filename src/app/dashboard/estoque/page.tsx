"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth/provider";
import { currency, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { XML_SAMPLE, type StockStatus } from "@/lib/db";
import { SAMPLE_NFE_XML } from "@/lib/nfe";
import { Skeleton } from "@/components/ui/skeleton";
import type { KitComponent, Product, Unit } from "@/types";

const statusLabel: Record<StockStatus, string> = {
  out: "Zerado",
  critical: "Crítico",
  low: "Baixo",
  ok: "Ok",
};

const statusVariant: Record<StockStatus, "destructive" | "warning" | "success" | "secondary"> = {
  out: "destructive",
  critical: "destructive",
  low: "warning",
  ok: "success",
};

export default function EstoquePage() {
  const { state, actions } = useStore();
  const { isAdmin } = useAuth();
  const { inventory, products, ready } = state;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | StockStatus>("all");
  const [xmlOpen, setXmlOpen] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<string | null>(null);
  const [preview, setPreview] = useState(SAMPLE_NFE_XML);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    return inventory.filter((r) => {
      const matchQ =
        !q ||
        r.product.name.toLowerCase().includes(q.toLowerCase()) ||
        r.product.category.toLowerCase().includes(q.toLowerCase()) ||
        (r.product.barcode ?? "").includes(q) ||
        (r.product.ncm ?? "").includes(q);
      const matchS = status === "all" || r.status === status;
      return matchQ && matchS;
    });
  }, [inventory, q, status]);

  const onFile = async (file: File) => {
    setError(null);
    const text = await file.text();
    setPreview(text);
  };

  const handleXml = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await actions.importXml(preview);
      setImported(
        `${res.units} un. em ${res.products} itens` +
          (res.created ? ` · ${res.created} SKU novos` : "")
      );
      setXmlOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler XML");
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">Inventário</h1>
          <p className="text-sm text-slate-500">NF-e, estoque mínimo, kg/lt/m e kits.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setKitOpen(true)}>
              Novo kit
            </Button>
            <Button onClick={() => setXmlOpen(true)}>Upload XML NF-e</Button>
          </div>
        )}
      </div>

      {imported && (
        <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{imported}</div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Nome, EAN, NCM"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 overflow-x-auto">
          {(["all", "out", "critical", "low", "ok"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1",
                status === s ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200"
              )}
            >
              {s === "all" ? "Todos" : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {!ready ? (
        <Skeleton className="h-80 rounded-3xl" />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="px-5 py-3 font-medium">Un.</th>
                <th className="px-5 py-3 font-medium text-right">Saldo</th>
                <th className="px-5 py-3 font-medium text-right">Mín.</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">NCM</th>
                <th className="px-5 py-3 font-medium text-right">Custo</th>
                <th className="px-5 py-3 font-medium text-right">Venda</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.product.id} className="border-t border-slate-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{r.product.name}</div>
                    <div className="text-xs text-slate-400">
                      {r.product.unit === "kit" ? "KIT" : r.product.barcode}
                    </div>
                  </td>
                  <td className="px-5 py-3 uppercase text-slate-500">{r.product.unit}</td>
                  <td className="px-5 py-3 text-right font-medium">{r.product.stock}</td>
                  <td className="px-5 py-3 text-right">
                    <input
                      type="number"
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-right disabled:opacity-60"
                      defaultValue={r.product.min_stock}
                      disabled={!isAdmin}
                      onBlur={(e) => {
                        if (!isAdmin) return;
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v)) void actions.updateProduct(r.product.id, { min_stock: v });
                      }}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.product.ncm ?? "—"}</td>
                  <td className="px-5 py-3 text-right">{currency(r.product.cost ?? 0)}</td>
                  <td className="px-5 py-3 text-right">{currency(r.product.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={xmlOpen} onOpenChange={setXmlOpen} title="Upload NF-e">
        <div className="p-1">
          <h2 className="text-lg font-medium text-slate-900">Entrada via XML NF-e</h2>
          <p className="mt-1 text-sm text-slate-500">
            Extrai xProd, NCM, qCom e vUnCom. Casa pelo EAN ou cria SKU novo.
          </p>
          <input
            type="file"
            accept=".xml,text/xml"
            className="mt-4 text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <pre className="mt-4 max-h-56 overflow-auto rounded-2xl bg-slate-950 p-4 text-[11px] leading-relaxed text-emerald-300">
            {preview.slice(0, 4000)}
          </pre>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setPreview(XML_SAMPLE);
              }}
            >
              Usar XML de exemplo
            </Button>
            <Button onClick={() => void handleXml()} disabled={importing}>
              {importing ? "Importando…" : "Lançar no estoque"}
            </Button>
          </div>
        </div>
      </Dialog>

      <KitDialog open={kitOpen} onOpenChange={setKitOpen} products={products} onCreate={actions.createProduct} />
    </AppLayout>
  );
}

function KitDialog({
  open,
  onOpenChange,
  products,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: Product[];
  onCreate: (input: Partial<Product> & { name: string; price: number }) => Promise<Product>;
}) {
  const simples = products.filter((p) => p.unit !== "kit");
  const [name, setName] = useState("Kit personalizado");
  const [price, setPrice] = useState("29.90");
  const [components, setComponents] = useState<KitComponent[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (id: string) => {
    setComponents((cs) => {
      const ex = cs.find((c) => c.product_id === id);
      if (ex) return cs.filter((c) => c.product_id !== id);
      return [...cs, { product_id: id, quantity: 1 }];
    });
  };

  const save = async () => {
    setErr(null);
    if (components.length < 2) {
      setErr("Um kit precisa de pelo menos 2 itens.");
      return;
    }
    await onCreate({
      name,
      price: Number(price) || 0,
      cost: components.reduce((a, c) => {
        const p = simples.find((x) => x.id === c.product_id);
        return a + (p?.cost ?? 0) * c.quantity;
      }, 0),
      unit: "kit" as Unit,
      category: "Kits",
      kit_components: components,
      min_stock: 3,
      stock: 0,
      catalog_visible: true,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Novo kit">
      <div className="p-1">
        <h2 className="text-lg font-medium">Combo / Kit</h2>
        <p className="mt-1 text-sm text-slate-500">Na venda, cada componente é baixado do estoque.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do kit" />
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preço de venda" />
        </div>
        <ul className="mt-4 max-h-56 space-y-2 overflow-auto">
          {simples.map((p) => {
            const sel = components.find((c) => c.product_id === p.id);
            return (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!sel} onChange={() => toggle(p.id)} />
                <span className="flex-1 truncate">{p.name}</span>
                {sel && (
                  <input
                    type="number"
                    className="w-16 rounded border px-2 py-1"
                    value={sel.quantity}
                    min={1}
                    onChange={(e) =>
                      setComponents((cs) =>
                        cs.map((c) =>
                          c.product_id === p.id ? { ...c, quantity: Number(e.target.value) || 1 } : c
                        )
                      )
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
        {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
        <Button className="mt-4 w-full" onClick={() => void save()}>
          Criar kit
        </Button>
      </div>
    </Dialog>
  );
}
