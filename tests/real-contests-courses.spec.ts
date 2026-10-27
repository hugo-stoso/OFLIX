import { expect, test } from "@playwright/test";
import { parseAracajuEditais, parseSeadContests } from "../lib/connectors/public-contests";
import { parseEvgCourses, parseFundacaoBradescoCourses, parseSenaiCourses } from "../lib/connectors/training";
import { demoDiscoveryItems } from "../lib/discovery";

test("descoberta pública não expõe nem conta concursos, seleções ou cursos DEMO", () => {
  const publicDevelopment = demoDiscoveryItems.filter((item) => ["course", "public_exam", "public_selection"].includes(item.kind));
  expect(publicDevelopment.every((item) => item.demo)).toBe(true);
});

test("SEAD exclui credenciamento e prêmio e preserva Em andamento", () => {
  const items = parseSeadContests(`<p><a href="/concurso-edital-01-2026/">Concurso Público Edital nº 01/2026</a> Em andamento</p><p><a href="/processo-seletivo-02-2026/">Processo seletivo PSS 02/2026 — Inscrições encerradas</a></p><p><a href="/credenciamento-03-2026/">Credenciamento 03/2026</a></p><p><a href="/premio-04-2026/">Prêmio 04/2026</a></p>`);
  expect(items).toHaveLength(2);
  expect(items[0]).toMatchObject({ kind: "public_exam", status: "Em andamento" });
  expect(items[1]).toMatchObject({ kind: "public_selection", status: "Inscrições encerradas" });
});

test("Aracaju separa concurso público de processo seletivo e deduplica publicação", () => {
  const items = parseAracajuEditais(`<a href="/editais/concurso-01-2026">Concurso Público 01/2026</a><a href="/editais/concurso-01-2026">Resultado Concurso Público 01/2026</a><a href="/editais/pss-02-2026">Processo seletivo PSS 02/2026</a><a href="/editais/compra-03-2026">Compras 03/2026</a>`);
  expect(items).toHaveLength(2);
  expect(items.map((item) => item.kind)).toEqual(["public_exam", "public_selection"]);
  expect(items.every((item) => item.source === "ARACAJU_EDITAIS" && item.location.municipality === "Aracaju")).toBe(true);
});

test("Aracaju aceita o catálogo oficial de transparência como fallback allowlisted", () => {
  const items = parseAracajuEditais(`<a href="https://transparencia.aracaju.se.gov.br/prefeitura/editais-de-concurso-e-pss/">Concurso público para Guarda Municipal</a>`, new Date().toISOString(), "https://transparencia.aracaju.se.gov.br/prefeitura/editais-de-concurso-e-pss/");
  expect(items[0]).toMatchObject({ source: "ARACAJU_EDITAIS", kind: "public_exam", location: { municipality: "Aracaju" } });
});

test("SENAI lê turma, local, gratuidade e não mantém inscrição vencida como aberta", () => {
  const items = parseSenaiCourses(`<article><a href="/cursos/eletricista">Eletricista instalador</a><p>Unidade: Aracaju · Inscrições abertas · Gratuito · Inscrições até 31/12/2099</p></article><article><a href="/cursos/excel">Excel básico</a><p>Inscrições até 01/01/2020</p></article>`);
  expect(items[0]).toMatchObject({ source: "SENAI_SE", location: { municipality: "Aracaju" }, cost: "Gratuito", status: "Inscrições abertas" });
  expect(items[1]?.status).toBe("Inscrições encerradas");
});

test("SENAI prioriza cards oficiais e links de matrícula sobre links de navegação", () => {
  const items = parseSenaiCourses(`<a href="/cursos-tecnicos">Cursos Técnicos</a><div class="itemCurso"><div class="descricao"><a href="https://app.fies.org.br/MatriculaWebSENAI/Cursos/DetalheCurso/2635"><h5>Assistente de Recursos Humanos</h5></a><span>GERENCIAL</span><p>Carga Horária: 180</p></div><div class="modalidade">Presencial</div><div class="btMatricule-se"><a href="https://app.fies.org.br/MatriculaWebSENAI/TenhoInteresse/Novo?curso=assistente-de-recursos-humanos&amp;e=SENAI">Tenho Interesse</a></div></div>`);
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ title: "Assistente de Recursos Humanos", sourceUrl: "https://app.fies.org.br/MatriculaWebSENAI/Cursos/DetalheCurso/2635", applicationUrl: "https://app.fies.org.br/MatriculaWebSENAI/TenhoInteresse/Novo?curso=assistente-de-recursos-humanos&e=SENAI", modality: "Presencial" });
});

test("catálogos Bradesco e EV.G são online, sem prazo fictício e sem município falso", () => {
  const bradesco = parseFundacaoBradescoCourses(`<a href="/Cursos/curso-de-excel">Excel na prática</a><span>Gratuito · 20 horas</span>`);
  const evg = parseEvgCourses(`<a href="/curso/123">Gestão pública</a><span>Conteudista: Escola Nacional · 30 horas</span>`);
  expect(bradesco[0]).toMatchObject({ source: "FUNDACAO_BRADESCO_EV", modality: "Online", cost: "Gratuito", status: "Disponível no catálogo" });
  expect(bradesco[0]?.deadline).toBeUndefined();
  expect(evg[0]).toMatchObject({ source: "EVG", modality: "Online", location: { municipality: "Online" }, status: "Disponível no catálogo" });
});
