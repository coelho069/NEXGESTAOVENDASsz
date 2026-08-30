import type { Sale, UUID } from "@/types";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** NF-e (55) ou NFC-e (65). Não gerar XML aqui — o provedor externo o produz. */
export type FiscalDocumentModel = "55" | "65";

export type FiscalEnvironment = "homologation" | "production";

/** Contingência só é avaliada localmente neste stub (sem SEFAZ/API). */
export type FiscalContingencyKind = "none" | "offline" | "svc";

export interface FiscalIssuerCredentials {
  environment: FiscalEnvironment;
  uf: string;
  cnpj: string;
  ie: string;
  token: string;
  cscId: string;
  cscToken: string;
}

export interface FiscalEmitInput {
  sale: Sale;
  model: FiscalDocumentModel;
  storeId: UUID;
  contingency: FiscalContingencyKind;
}

export interface FiscalFieldIssue {
  field: string;
  message: string;
}

export interface FiscalFieldValidation {
  ok: boolean;
  issues: FiscalFieldIssue[];
}

export interface FiscalContingencyStubResult {
  ok: boolean;
  kind: FiscalContingencyKind;
  /** Sempre false neste stub: nenhuma chamada de rede. */
  externalCall: false;
  issues: FiscalFieldIssue[];
}

export type FiscalProcessStatus = "validated" | "rejected" | "not_configured";

export interface FiscalProcessResult {
  ok: boolean;
  status: FiscalProcessStatus;
  /** Stub legado nunca autoriza na SEFAZ. */
  authorized: false;
  /** Stub legado nunca chama rede. */
  externalCall: false;
  model: FiscalDocumentModel | null;
  saleId: UUID | null;
  storeId: UUID | null;
  environment: FiscalEnvironment;
  validation: FiscalFieldValidation;
  contingency: FiscalContingencyStubResult;
  issues: FiscalFieldIssue[];
}

export interface FiscalProvider {
  configured(): boolean;
  credentials(): FiscalIssuerCredentials;
  validateRequired(input: FiscalEmitInput): FiscalFieldValidation;
  validateContingency(input: FiscalEmitInput): FiscalContingencyStubResult;
  process(input: FiscalEmitInput): FiscalProcessResult;
}

function environmentFromEnv(): FiscalEnvironment {
  return env("FISCAL_ENVIRONMENT") === "production" ? "production" : "homologation";
}

export function loadFiscalCredentials(): FiscalIssuerCredentials {
  return {
    environment: environmentFromEnv(),
    uf: env("FISCAL_UF"),
    cnpj: env("FISCAL_ISSUER_CNPJ"),
    ie: env("FISCAL_ISSUER_IE"),
    token: env("FISCAL_PROVIDER_TOKEN"),
    cscId: env("FISCAL_CSC_ID"),
    cscToken: env("FISCAL_CSC_TOKEN"),
  };
}

export function fiscalConfigured(creds = loadFiscalCredentials()): boolean {
  if (!creds.cnpj || !creds.token || !creds.uf) return false;
  return true;
}

function issue(field: string, message: string): FiscalFieldIssue {
  return { field, message };
}

export function validateRequiredFields(
  input: FiscalEmitInput,
  creds = loadFiscalCredentials()
): FiscalFieldValidation {
  const issues: FiscalFieldIssue[] = [];
  const { sale, model, storeId } = input;

  if (model !== "55" && model !== "65") {
    issues.push(issue("model", "Modelo deve ser 55 (NF-e) ou 65 (NFC-e)."));
  }
  if (!storeId) issues.push(issue("storeId", "Loja é obrigatória."));
  if (!sale?.id) issues.push(issue("sale.id", "Venda é obrigatória."));
  if (sale && storeId && sale.store_id !== storeId) {
    issues.push(issue("sale.store_id", "A venda não pertence à loja informada."));
  }
  if (!sale?.items?.length) {
    issues.push(issue("sale.items", "A venda precisa de ao menos um item."));
  }
  if (sale && !(sale.total >= 0)) {
    issues.push(issue("sale.total", "Total da venda é obrigatório."));
  }
  if (!sale?.payment_method) {
    issues.push(issue("sale.payment_method", "Forma de pagamento é obrigatória."));
  }

  if (!creds.cnpj) issues.push(issue("FISCAL_ISSUER_CNPJ", "CNPJ do emitente não configurado."));
  if (!creds.uf) issues.push(issue("FISCAL_UF", "UF do emitente não configurada."));
  if (!creds.token) issues.push(issue("FISCAL_PROVIDER_TOKEN", "Token do provedor não configurado."));

  if (model === "65") {
    if (!creds.cscId) issues.push(issue("FISCAL_CSC_ID", "CSC (id) é obrigatório para NFC-e."));
    if (!creds.cscToken) issues.push(issue("FISCAL_CSC_TOKEN", "CSC (token) é obrigatório para NFC-e."));
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Stub de contingência: só valida campos locais.
 * Não consulta SEFAZ, SVRS nem API de terceiro.
 */
export function validateContingencyStub(
  input: FiscalEmitInput,
  creds = loadFiscalCredentials()
): FiscalContingencyStubResult {
  const issues: FiscalFieldIssue[] = [];
  const kind = input.contingency;

  if (kind === "none") {
    return { ok: true, kind, externalCall: false, issues };
  }

  const required = validateRequiredFields(input, creds);
  issues.push(...required.issues);

  if (!input.sale?.id) {
    issues.push(issue("sale.id", "Contingência exige identificador local da venda."));
  }
  if (kind === "offline" && input.model === "55") {
    issues.push(
      issue(
        "contingency",
        "Contingência offline neste stub aplica-se à NFC-e (65); NF-e (55) deve usar SVC ou permanecer em none."
      )
    );
  }
  if (kind === "svc" && input.model === "65") {
    issues.push(issue("contingency", "SVC não se aplica à NFC-e (65) neste stub."));
  }

  return { ok: issues.length === 0, kind, externalCall: false, issues };
}

function mergeIssues(...lists: FiscalFieldIssue[][]): FiscalFieldIssue[] {
  const seen = new Set<string>();
  const out: FiscalFieldIssue[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = `${item.field}\0${item.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/**
 * Processa emissão no provedor legado (stub): valida 55/65 e contingência.
 * Não gera XML e não autoriza documento.
 */
export function processFiscalEmit(
  input: FiscalEmitInput,
  creds = loadFiscalCredentials()
): FiscalProcessResult {
  const validation = validateRequiredFields(input, creds);
  const contingency = validateContingencyStub(input, creds);
  const issues = mergeIssues(validation.issues, contingency.issues);
  const configured = fiscalConfigured(creds);

  let status: FiscalProcessStatus = "rejected";
  if (!configured) status = "not_configured";
  else if (validation.ok && contingency.ok) status = "validated";

  return {
    ok: status === "validated",
    status,
    authorized: false,
    externalCall: false,
    model: input.model === "55" || input.model === "65" ? input.model : null,
    saleId: input.sale?.id ?? null,
    storeId: input.storeId ?? null,
    environment: creds.environment,
    validation,
    contingency,
    issues,
  };
}

export const stubFiscalProvider: FiscalProvider = {
  configured() {
    return fiscalConfigured();
  },
  credentials() {
    return loadFiscalCredentials();
  },
  validateRequired(input) {
    return validateRequiredFields(input);
  },
  validateContingency(input) {
    return validateContingencyStub(input);
  },
  process(input) {
    return processFiscalEmit(input);
  },
};
