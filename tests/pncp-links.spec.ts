import { expect, test } from "@playwright/test";
import { normalizePncpRecord } from "../lib/discovery";

test.describe("links oficiais de contratações PNCP", () => {
  test("usa CNPJ do órgão, ano e sequencial para a página específica", () => {
    const item = normalizePncpRecord({
      objetoCompra: "Pregão eletrônico para manutenção predial",
      numeroControlePNCP: "00394544000185-1-002147/2026",
      anoCompra: 2026,
      sequencialCompra: 2147,
      processo: "25021.000335/2026-58",
      niFornecedor: "99999999000199",
      orgaoEntidade: { cnpj: "00394544000185", razaoSocial: "MINISTERIO DA SAUDE" },
      unidadeOrgao: { ufSigla: "SE", municipioNome: "Aracaju" },
      modalidadeNome: "Pregão - Eletrônico",
      dataEncerramentoProposta: "2026-10-16T08:00:00",
      linkSistemaOrigem: "https://origem.exemplo.gov.br/compra/2147",
      linkProcessoEletronico: "https://sei.exemplo.gov.br/processos/61514173",
    });

    expect(item).toMatchObject({
      sourceUrl: "https://pncp.gov.br/app/editais/00394544000185/2026/2147",
      publicBodyCnpj: "00394544000185",
      procurementYear: 2026,
      procurementSequence: 2147,
      processNumber: "25021.000335/2026-58",
      deadline: "2026-10-16T08:00:00",
      procurementLinks: {
        procurement: "https://pncp.gov.br/app/editais/00394544000185/2026/2147",
        sourceSystem: "https://origem.exemplo.gov.br/compra/2147",
        electronicProcess: "https://sei.exemplo.gov.br/processos/61514173",
      },
    });
  });

  test("não fabrica URL genérica quando a identidade oficial está incompleta", () => {
    const item = normalizePncpRecord({
      objetoCompra: "Contratação sem identificação completa",
      niFornecedor: "00394544000185",
      anoCompra: 2026,
      sequencialCompra: 2147,
      orgaoEntidade: { razaoSocial: "Órgão sem CNPJ" },
      unidadeOrgao: { ufSigla: "SE", municipioNome: "Aracaju" },
    });

    expect(item?.sourceUrl).toBeUndefined();
    expect(item?.procurementLinks).toBeUndefined();
  });
});
