import type { SessionUser } from "@/lib/auth/types";
import type { PaymentMethod, Sale, SaleItem, SaleStatus, UUID } from "@/types";
import type {
  FiscalContingencyKind,
  FiscalDocumentModel,
  FiscalEmitInput,
  FiscalFieldIssue,
  FiscalProcessResult,
  FiscalProvider,
} from "@/lib/fiscal/provider";

/**
 * Identificador da loja demo em `src/lib/db.ts` (`STORE_ID`).
 * Não importar `db.ts` aqui: IndexedDB não existe no runtime da rota.
 */
export const FISCAL_HTTP_DEFAULT_STORE_ID: UUID = "store-1";

export interface FiscalEmitHttpSuccess extends FiscalProcessResult {
  ok: true;
  status: "validated";
}

export interface FiscalEmitHttpError {
  ok: false;
  error: string;
  issues?: FiscalFieldIssue[];
  status?: FiscalProcessResult["status"];
  authorized?: false;
  externalCall?: false;
  validation?: FiscalProcessResult["validation"];
  contingency?: FiscalProcessResult["contingency"];
}

export type FiscalEmitHttpResponse =
  | FiscalEmitHttpSuccess
  | FiscalEmitHttpError
  | { error: string };

export interface FiscalEmitHttpResult {
  status: number;
  body: FiscalEmitHttpResponse;
}

function issue(field: string, message: string): FiscalFieldIssue {
  return { field, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "cash" || value === "card" || value === "pix" || value === "credit";
}

function isSaleStatus(value: unknown): value is SaleStatus {
  return (
    value === "completed" ||
    value === "pending_sync" ||
    value === "synced" ||
    value === "draft"
  );
}

function parseSaleItem(value: unknown, index: number): SaleItem | FiscalFieldIssue {
  if (!isRecord(value)) {
    return issue(`sale.items[${index}]`, "Item da venda inválido.");
  }
  const quantity = Number(value.quantity);
  const unit_price = Number(value.unit_price);
  const unit_cost = Number(value.unit_cost ?? 0);
  const total_price = Number(value.total_price ?? quantity * unit_price);
  const line_profit = Number(value.line_profit ?? total_price - unit_cost * quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return issue(`sale.items[${index}].quantity`, "Quantidade do item é obrigatória.");
  }
  if (!Number.isFinite(unit_price)) {
    return issue(`sale.items[${index}].unit_price`, "Preço unitário do item é obrigatório.");
  }
  return {
    id: typeof value.id === "string" ? value.id : `item-${index}`,
    sale_id: typeof value.sale_id === "string" ? value.sale_id : "",
    product_id: typeof value.product_id === "string" ? value.product_id : "",
    product_name: typeof value.product_name === "string" ? value.product_name : "",
    quantity,
    unit_price,
    unit_cost: Number.isFinite(unit_cost) ? unit_cost : 0,
    total_price: Number.isFinite(total_price) ? total_price : 0,
    line_profit: Number.isFinite(line_profit) ? line_profit : 0,
  };
}

function parseSale(value: unknown): { sale: Sale; issues: FiscalFieldIssue[] } | { sale: null; issues: FiscalFieldIssue[] } {
  if (!isRecord(value)) {
    return {
      sale: null,
      issues: [
        issue(
          "sale",
          "Objeto da venda é obrigatório. O IndexedDB (src/lib/db.ts) não está disponível no servidor."
        ),
      ],
    };
  }

  const issues: FiscalFieldIssue[] = [];
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items: SaleItem[] = [];
  for (const [index, raw] of rawItems.entries()) {
    const parsed = parseSaleItem(raw, index);
    if ("field" in parsed) issues.push(parsed);
    else items.push(parsed);
  }

  const total = Number(value.total);
  const cost_total = Number(value.cost_total ?? 0);
  const profit = Number(value.profit ?? total - cost_total);
  const id = typeof value.id === "string" ? value.id : "";
  const store_id = typeof value.store_id === "string" ? value.store_id : "";

  const sale: Sale = {
    id,
    store_id,
    shift_id: typeof value.shift_id === "string" ? value.shift_id : null,
    customer_id: typeof value.customer_id === "string" ? value.customer_id : null,
    customer_name: typeof value.customer_name === "string" ? value.customer_name : null,
    total: Number.isFinite(total) ? total : Number.NaN,
    cost_total: Number.isFinite(cost_total) ? cost_total : 0,
    profit: Number.isFinite(profit) ? profit : 0,
    discount: typeof value.discount === "number" ? value.discount : 0,
    payment_method: isPaymentMethod(value.payment_method) ? value.payment_method : ("" as PaymentMethod),
    status: isSaleStatus(value.status) ? value.status : "pending_sync",
    sync_pending: Boolean(value.sync_pending),
    items,
    created_at: typeof value.created_at === "string" ? value.created_at : "",
    updated_at: typeof value.updated_at === "string" ? value.updated_at : "",
  };

  for (const item of items) {
    if (!item.sale_id) item.sale_id = id;
  }

  return { sale, issues };
}

export function parseFiscalEmitRequest(
  body: unknown
): { ok: true; input: FiscalEmitInput } | { ok: false; issues: FiscalFieldIssue[] } {
  if (!isRecord(body)) {
    return { ok: false, issues: [issue("body", "JSON do corpo é obrigatório.")] };
  }
  if (Object.hasOwn(body, "__proto__") || Object.hasOwn(body, "$gt") || Object.hasOwn(body, "$where")) {
    return { ok: false, issues: [issue("body", "Requisição inválida.")] };
  }

  const issues: FiscalFieldIssue[] = [];
  const model = body.model;
  if (model !== "55" && model !== "65") {
    issues.push(issue("model", "Modelo deve ser 55 (NF-e) ou 65 (NFC-e)."));
  }

  const storeId =
    typeof body.storeId === "string" && body.storeId.trim()
      ? body.storeId.trim()
      : FISCAL_HTTP_DEFAULT_STORE_ID;

  let contingency: FiscalContingencyKind = "none";
  if (body.contingency != null) {
    if (body.contingency !== "none" && body.contingency !== "offline" && body.contingency !== "svc") {
      issues.push(issue("contingency", "Contingência deve ser none, offline ou svc."));
    } else {
      contingency = body.contingency;
    }
  }

  const parsedSale = parseSale(body.sale);
  issues.push(...parsedSale.issues);

  if (issues.length || !parsedSale.sale || (model !== "55" && model !== "65")) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    input: {
      sale: parsedSale.sale,
      model: model as FiscalDocumentModel,
      storeId,
      contingency,
    },
  };
}

export function executeFiscalEmit(
  user: SessionUser | null,
  body: unknown,
  provider: FiscalProvider
): FiscalEmitHttpResult {
  if (!user) {
    return { status: 401, body: { error: "Não autorizado." } };
  }

  const parsed = parseFiscalEmitRequest(body);
  if (!parsed.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        error: parsed.issues[0]?.message ?? "Requisição inválida.",
        issues: parsed.issues,
      },
    };
  }

  if (!provider.configured()) {
    const processed = provider.process(parsed.input);
    return {
      status: 503,
      body: {
        ok: false,
        error: "Emissão fiscal indisponível no momento.",
        status: "not_configured",
        authorized: false,
        externalCall: false,
        issues: processed.issues.filter((item) => item.field.startsWith("FISCAL_")),
        validation: processed.validation,
        contingency: processed.contingency,
      },
    };
  }

  const processed = provider.process(parsed.input);
  if (!processed.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        error: processed.issues[0]?.message ?? "Validação fiscal recusada.",
        status: processed.status,
        authorized: false,
        externalCall: false,
        issues: processed.issues,
        validation: processed.validation,
        contingency: processed.contingency,
      },
    };
  }

  return { status: 200, body: { ...processed, ok: true, status: "validated" } };
}
