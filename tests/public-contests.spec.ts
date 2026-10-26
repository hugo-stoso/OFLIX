import { expect, test } from "@playwright/test";
import { parseSeadContests } from "../lib/connectors/public-contests";

test("SEAD normaliza concurso e processo seletivo com URL allowlisted", () => {
  const items = parseSeadContests('<h3>CONCURSOS PÚBLICOS</h3><p><a href="https://sead.se.gov.br/concurso-publico-edital-no-07-2025-magisterio-seed/">Concurso Público Edital nº 07/2025 – Professor</a></p><p><a href="https://evil.example/">Concurso falso</a></p>');
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ kind: "public_exam", source: "AUTHORIZED_PARTNER", provider: "SEAD Sergipe", sourceUrl: "https://sead.se.gov.br/concurso-publico-edital-no-07-2025-magisterio-seed/" });
});

test("identidade estável deduplica o mesmo edital e não inventa vagas", () => {
  const items = parseSeadContests('<p><a href="/concurso-edital-01-2025-seasic/">Concurso Público Edital nº 01/2025 – SEASIC</a></p><p><a href="/concurso-edital-01-2025-seasic/">Concurso Público Edital nº 01/2025 – SEASIC</a></p>');
  expect(items).toHaveLength(1);
  expect(items[0].vacancies).toBeUndefined();
  expect(items[0].deadline).toBeUndefined();
});
