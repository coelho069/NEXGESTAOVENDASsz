import type { Sale } from "@/types";

/** NFC-e no PDV. Fora de escopo: NT 2025.002-RTC (IBS/CBS). */
export const POS_FISCAL_MODEL = "65" as const;

export type FiscalReceiptKind =
  | "processing"
  | "offline"
  | "validated"
  | "rejected"
  | "unavailable"
  | "unauthorized"
  | "error";

export interface FiscalReceiptState {
  kind: FiscalReceiptKind;
  message: string;
  /** Stub de emissão nunca autoriza na SEFAZ. */
  authorized: false;
}

export function processingFiscalState(): FiscalReceiptState {
  return {
    kind: "processing",
    message: "NFC-e em processamento…",
    authorized: false,
  };
}

export function offlineFiscalState(): FiscalReceiptState {
  return {
    kind: "offline",
    message: "NFC-e pendente. Emite quando houver conexão.",
    authorized: false,
  };
}

export function mapFiscalHttpToReceipt(httpStatus: number, body: unknown): FiscalReceiptState {
  const rec = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const error = typeof rec.error === "string" ? rec.error : "";
  const authorized = false as const;

  if (httpStatus === 401) {
    return { kind: "unauthorized", message: error || "Faça login para emitir a NFC-e.", authorized };
  }
  if (httpStatus === 503) {
    return { kind: "unavailable", message: error || "Emissão fiscal indisponível no momento.", authorized };
  }
  if (httpStatus === 200 && rec.ok === true) {
    return {
      kind: "validated",
      message: "NFC-e pré-validada. Não autorizada na SEFAZ.",
      authorized,
    };
  }
  if (httpStatus === 400) {
    return { kind: "rejected", message: error || "Validação fiscal recusada.", authorized };
  }
  return { kind: "error", message: error || "Falha ao processar a NFC-e.", authorized };
}

export async function requestFiscalEmit(sale: Sale): Promise<FiscalReceiptState> {
  try {
    const res = await fetch("/api/fiscal/emit", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: POS_FISCAL_MODEL,
        storeId: sale.store_id,
        contingency: "none",
        sale,
      }),
    });
    const json: unknown = await res.json().catch(() => null);
    return mapFiscalHttpToReceipt(res.status, json);
  } catch {
    return {
      kind: "error",
      message: "Não foi possível contatar a emissão fiscal.",
      authorized: false,
    };
  }
}
