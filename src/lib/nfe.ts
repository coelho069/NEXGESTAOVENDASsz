import type { NfeItem } from "@/types";

function local(parent: ParentNode, name: string): Element[] {
  const out: Element[] = [];
  const all = (parent as Element).getElementsByTagName
    ? (parent as Element).getElementsByTagName("*")
    : (parent as Document).getElementsByTagName("*");
  for (const n of Array.from(all)) {
    if (n.localName === name) out.push(n);
  }
  return out;
}

function text(el: Element | undefined, child: string): string {
  if (!el) return "";
  const found = local(el, child)[0];
  return (found?.textContent ?? "").trim();
}

function num(v: string): number {
  if (!v) return 0;
  return Number(v.replace(",", ".")) || 0;
}

export function parseNfeXml(xml: string): NfeItem[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error("XML inválido. Envie uma NF-e (.xml) válida.");
  }

  const dets = local(doc, "det");
  if (dets.length === 0) {
    throw new Error("Nenhum item <det> encontrado na NF-e.");
  }

  return dets.map((det) => {
    const prod = local(det, "prod")[0] ?? det;
    const name = text(prod, "xProd") || "Produto sem nome";
    const ncm = text(prod, "NCM") || null;
    const barcode = text(prod, "cEAN") || text(prod, "cEANTrib") || null;
    const quantity = num(text(prod, "qCom"));
    const unit_cost = num(text(prod, "vUnCom"));
    const unitRaw = text(prod, "uCom").toLowerCase();
    const unit =
      unitRaw === "kg" || unitRaw === "lt" || unitRaw === "l" || unitRaw === "m" || unitRaw === "un"
        ? unitRaw === "l"
          ? "lt"
          : unitRaw
        : "un";
    const safeBarcode = barcode && barcode !== "SEM GTIN" ? barcode : null;
    return { name, ncm, barcode: safeBarcode, quantity, unit_cost, unit };
  });
}

export const SAMPLE_NFE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35240812345678000195550010000001231234567890">
      <ide><nNF>123</nNF></ide>
      <emit><xNome>Distribuidora Horizonte Ltda</xNome><CNPJ>12345678000195</CNPJ></emit>
      <det nItem="1">
        <prod>
          <cEAN>7890000000028</cEAN>
          <xProd>Leite Integral UHT 1L</xProd>
          <NCM>04012010</NCM>
          <uCom>UN</uCom>
          <qCom>24.0000</qCom>
          <vUnCom>4.1000</vUnCom>
          <vProd>98.40</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cEAN>7890000000059</cEAN>
          <xProd>Açúcar Refinado 1kg</xProd>
          <NCM>17019900</NCM>
          <uCom>UN</uCom>
          <qCom>20.0000</qCom>
          <vUnCom>3.2000</vUnCom>
          <vProd>64.00</vProd>
        </prod>
      </det>
      <det nItem="3">
        <prod>
          <cEAN>7890000000066</cEAN>
          <xProd>Espaguete Grano Duro 500g</xProd>
          <NCM>19021900</NCM>
          <uCom>UN</uCom>
          <qCom>18.0000</qCom>
          <vUnCom>2.6000</vUnCom>
          <vProd>46.80</vProd>
        </prod>
      </det>
      <det nItem="4">
        <prod>
          <cEAN>7890000000202</cEAN>
          <xProd>Arroz Agulhinha Tipo 1 5kg</xProd>
          <NCM>10063021</NCM>
          <uCom>UN</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>18.4000</vUnCom>
          <vProd>184.00</vProd>
        </prod>
      </det>
      <det nItem="5">
        <prod>
          <cEAN>7898630000999</cEAN>
          <xProd>Farinha de Trigo Especial 1kg</xProd>
          <NCM>11010010</NCM>
          <uCom>KG</uCom>
          <qCom>15.0000</qCom>
          <vUnCom>3.8000</vUnCom>
          <vProd>57.00</vProd>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;
