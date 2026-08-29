"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/provider";
import { currency, cn } from "@/lib/utils";
import { Pencil, Trash2, Plus } from "lucide-react";
import type { Product } from "@/types";
import { uploadProductImage } from "@/lib/cms/upload";

const FALLBACK_CATS = ["Pães", "Doces", "Bebidas", "Mercearia", "Laticínios", "Kits", "Geral"];

type Form = {
  id?: string;
  name: string;
  description: string;
  cost: string;
  price: string;
  stock: string;
  min_stock: string;
  category: string;
  image_url: string;
  catalog_visible: boolean;
};

const empty = (): Form => ({
  name: "",
  description: "",
  cost: "",
  price: "",
  stock: "0",
  min_stock: "5",
  category: "Geral",
  image_url: "",
  catalog_visible: true,
});

function fromProduct(p: Product): Form {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    cost: String(p.cost ?? ""),
    price: String(p.price),
    stock: String(p.stock),
    min_stock: String(p.min_stock ?? 5),
    category: p.category,
    image_url: p.image_url ?? "",
    catalog_visible: p.catalog_visible,
  };
}

export default function AdminProdutosPage() {
  const { state, actions } = useStore();
  const { products } = state;
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todas");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty());
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const categories = useMemo(() => {
    const set = new Set([...FALLBACK_CATS, ...products.map((p) => p.category)]);
    return ["Todas", ...Array.from(set).sort()];
  }, [products]);

  const rows = useMemo(() => {
    return products.filter((p) => {
      const matchQ = !q || p.name.toLowerCase().includes(q.toLowerCase());
      const matchC = cat === "Todas" || p.category === cat;
      return matchQ && matchC;
    });
  }, [products, q, cat]);

  const openNew = () => {
    setForm(empty());
    setErr(null);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setForm(fromProduct(p));
    setErr(null);
    setOpen(true);
  };

  const save = async () => {
    setErr(null);
    if (!form.name.trim()) {
      setErr("Informe o nome do produto.");
      return;
    }
    const price = Number(form.price);
    if (!form.price.trim() || Number.isNaN(price) || price < 0) {
      setErr("Informe o preço de venda.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        cost: Number(form.cost) || 0,
        price,
        stock: Number(form.stock) || 0,
        min_stock: Number(form.min_stock) || 0,
        category: form.category || "Geral",
        image_url: form.image_url || null,
        catalog_visible: form.catalog_visible,
      };
      if (form.id) {
        await actions.updateProduct(form.id, payload);
        toast.push("Produto salvo com sucesso!");
      } else {
        await actions.createProduct(payload);
        toast.push("Produto salvo com sucesso!");
      }
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar produto";
      setErr(msg);
      toast.push(msg, "err");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Excluir “${p.name}”? Some da vitrine e do PDV.`)) return;
    try {
      await actions.deleteProduct(p.id);
      toast.push("Produto excluído.");
    } catch {
      toast.push("Erro ao excluir produto", "err");
    }
  };

  const onImage = async (file: File) => {
    try {
      const url = await uploadProductImage(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch {
      toast.push("Erro no upload da imagem", "err");
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Backoffice</p>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">Produtos</h1>
          <p className="text-sm text-slate-500">Custo, venda, estoque e foto. O que entra aqui vai para o PDV e a vitrine.</p>
        </div>
        {isAdmin && (
          <Button onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Buscar por nome"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="h-10 rounded-xl border border-input bg-white px-3 text-sm"
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Foto</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium text-right">Custo</th>
              <th className="px-4 py-3 font-medium text-right">Venda</th>
              <th className="px-4 py-3 font-medium text-right">Estoque</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-4 py-2">
                  <div className="h-11 w-11 overflow-hidden rounded-lg bg-slate-100">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-2 font-medium text-slate-900">{p.name}</td>
                <td className="px-4 py-2 text-slate-600">{p.category}</td>
                <td className="px-4 py-2 text-right text-slate-500">{currency(p.cost ?? 0)}</td>
                <td className="px-4 py-2 text-right font-medium">{currency(p.price)}</td>
                <td className="px-4 py-2 text-right">
                  <Badge variant={p.stock <= 0 ? "destructive" : p.stock <= (p.min_stock ?? 5) ? "warning" : "success"}>
                    {p.stock}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => openEdit(p)}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => void remove(p)}
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">somente leitura</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Nenhum produto neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen} title={form.id ? "Editar produto" : "Novo produto"}>
        <div className="max-h-[80vh] overflow-y-auto p-1">
          <h2 className="text-lg font-medium text-slate-900">
            {form.id ? "Editar produto" : "Novo produto"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm">
              <span className="text-xs text-slate-500">Nome *</span>
              <Input
                className={cn("mt-1", !form.name.trim() && err ? "ring-2 ring-rose-400" : "")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2 text-sm">
              <span className="text-xs text-slate-500">Descrição</span>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-xl border border-input px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Preço de custo</span>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Preço de venda *</span>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Quantidade</span>
              <Input
                className="mt-1"
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Estoque mínimo</span>
              <Input
                className="mt-1"
                type="number"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">Categoria</span>
              <select
                className="mt-1 h-10 w-full rounded-xl border border-input bg-white px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {FALLBACK_CATS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.catalog_visible}
                onChange={(e) => setForm({ ...form, catalog_visible: e.target.checked })}
              />
              Mostrar na vitrine
            </label>
            <div className="sm:col-span-2">
              <span className="text-xs text-slate-500">Foto</span>
              {form.image_url && (
                <img src={form.image_url} alt="" className="mt-2 h-20 w-20 rounded-xl object-cover" />
              )}
              <input
                type="file"
                accept="image/*"
                className="mt-2 block text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImage(f);
                }}
              />
            </div>
          </div>
          {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </Dialog>
    </AppLayout>
  );
}
