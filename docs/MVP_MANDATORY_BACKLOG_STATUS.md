# Status do backlog obrigatório do MVP

## Fontes

- GO Sergipe: auditoria pública limitada criada em `scripts/audit-go-sergipe-coverage.mjs`; o coletor paginado existente foi preservado porque a auditoria não provou ganho de cobertura por partições.
- IEL Sergipe: `scripts/audit-iel-sergipe-coverage.mjs`; a navegação pública observada não provou uma partição adicional. O modo continua `PARTIAL`.
- PNCP: conector público existente preservado, com proveniência e URL de consulta; `scripts/audit-public-procurement.mjs` deve ser usado quando disponível em ambiente com acesso ao endpoint.
- SEAD Sergipe: integrado por parser determinístico em `lib/connectors/public-contests.ts` e `/api/public-contests`.
- Prefeitura de Aracaju/Editais e Fundat: `NEEDS_MORE_VALIDATION`; as páginas públicas testadas não expuseram uma listagem estável estruturada, portanto não foram raspadas como cursos/concursos.

## Salários

E1 foi implementado em `/market/salaries` e `/api/market/salaries`. A mediana, mínimo, máximo e cobertura usam apenas valores mensais explicitamente publicados; ausência não é zero. O benchmark oficial MTE/PDET permanece `NEEDS_MORE_VALIDATION`.

## Legislação

EC 141/2026 foi adicionada como promulgada, com fonte Planalto, data de verificação, resumo curto e aviso para consultar o texto oficial. A aplicação jurídica específica não é inferida.

## Conhecimento

O contrato editorial prioriza produtividade, gestão, tecnologia, inovação, empreendedorismo, competências, sustentabilidade, finanças e políticas com aplicação empresarial; cerimônias, visitas e curiosidades genéricas são rebaixadas. Não há LLM pago ou chamada Gemini.
