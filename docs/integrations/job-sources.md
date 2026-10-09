# Fontes externas de empregos

Última auditoria pública: 09/10/2026. A auditoria foi anônima, sem login, candidatura, CAPTCHA, coleta de dados de candidatos ou uso de endpoint privado.

## Resultado da auditoria

| Fonte | Estado | Evidência pública | Decisão nesta versão |
| --- | --- | --- | --- |
| [GO Sergipe](https://gosergipe.se.gov.br/oportunidades) | `READY` | Endpoint estruturado usado pela SPA, UF SE, IDs e links públicos de detalhe | Integrado e mantido |
| [EmpregAju](https://empregaju.aracaju.se.gov.br/cidadao/vagas) | `READY` | HTML público server-rendered, cards estáveis, ID em `verDetalhes`, paginação HTML, `robots.txt` sem bloqueio | Integrado por HTML público |
| [IEL Sergipe](https://carreiras.iel.org.br/SE) | `PARTIAL` | Listagem HTML pública com links individuais e dados estruturados no card; paginação depende de `/api/`, desautorizado pelo `robots.txt` | Integrado somente na listagem HTML inicial |
| [Vagas Sergipe](https://vagassergipe.com.br/) | `PENDING` | HTML e sitemap públicos, termos/política localizados, mas sem feed estruturado confirmado e com necessidade de revisão de escopo/licença | Não coletar automaticamente |
| [Oficial News](https://www.oficialnews.com/) | `BLOCKED` | Respostas inconsistentes, incluindo 403, sem feed público estruturado confirmado | Não coletar |
| [BNE](https://www.bne.com.br/vagas-de-emprego-em-aracaju-se) | `BLOCKED` | Página pública ampla, mas APIs observadas estão em áreas desautorizadas no `robots.txt` e não há recorte Sergipe controlado para esta integração | Não coletar |
| [Gupy](https://portal.gupy.io/) | `BLOCKED` | Portal nacional sem listagem Sergipe delimitada; tráfego de candidato usa API privada com 401 | Não coletar |

`PENDING` significa que ainda pode haver um caminho de integração, mas não foi confirmado um contrato público seguro. `BLOCKED` significa que a coleta automática não tem um canal permitido e delimitado nesta execução. Nenhuma fonte não integrada é chamada pela aplicação.

## Método implementado

Os conectores ficam em `lib/connectors/` e retornam a mesma camada `DiscoveryItem` usada pela busca:

- `go-sergipe.ts`: conector existente, preservado.
- `empregaju.ts`: GET somente de `https://empregaju.aracaju.se.gov.br/cidadao/vagas` e páginas `?page=N`; no máximo 10 páginas, timeout de 7 s, uma nova tentativa apenas para HTTP 5xx, cache de 4 h e fallback stale.
- `iel-sergipe.ts`: GET somente de `https://carreiras.iel.org.br/SE`; uma tentativa adicional apenas para HTTP 5xx, cache de 4 h e fallback stale. A paginação que depende de `/api/` não é chamada.
- `external-jobs.ts`: orquestra fontes em paralelo, mantém falha isolada por fonte, aplica flags e agrega os resultados.

O endpoint é `GET /api/external-jobs`:

- sem `source` ou com `source=all`: GO Sergipe, EmpregAju e IEL Sergipe;
- `source=go-sergipe`, `source=empregaju` ou `source=iel-sergipe`: execução isolada;
- `q` e `municipality`: filtragem server-side sobre o resultado em cache.

A resposta inclui `items`, `count`, `source`, `provider`, `collectedAt`, `stale`, `partial`, `pages` e `sources[]` com contagem, páginas e falhas por fonte. Uma fonte indisponível não interrompe as demais.

## Modelo normalizado e segurança

Quando a origem fornece o valor, o item preserva `sourceJobId`, `sourceUrl`, `applicationUrl`, título, empresa, descrição pública, município/UF, modalidade, tipo de contratação, vagas, publicação, status e remuneração. Os aliases `city`, `state`, `workMode`, `opportunityType`, `vacanciesCount` e `isPcdEligible` deixam explícito o contrato comum. Campos ausentes permanecem ausentes; não há salário mensal inferido e a marcação `salaryIsEstimated` é preservada para expressões como “A partir de”.

Datas de publicação são datas da fonte (`DD/MM/YYYY`). `collectedAt`, `firstSeenAt`, `lastSeenAt`, `lastVerifiedAt` e `importedAt` são timestamps ISO do coletor; o produto interpreta datas do domínio no fuso `America/Maceio`. O ciclo de vida é mantido em cache de processo: `firstSeenAt` não é uma auditoria persistente porque a aplicação ainda não possui armazenamento externo de sincronização.

O parser usa allowlist de seletores e textos, remove tags executáveis via Cheerio e nunca retorna o rodapé, e-mail, telefone, endereço, token ou dados de candidato. Cada URL de origem/candidatura é validada em HTTPS contra host e caminho permitidos. Links são renderizados com `target="_blank"` e `rel="noreferrer"`.

EmpregAju não expõe uma URL de detalhe no card: o ID público é preservado como `sourceJobId`, a origem é a lista oficial e `applicationUrl` mantém o `/register` público. IEL fornece o link individual público; a OFLIX não automatiza candidatura.

## Flags, atualização e expiração

As fontes integradas ficam habilitadas por padrão porque foram confirmadas como canais públicos no escopo acima, mas cada uma pode ser desligada explicitamente:

```text
GO_SERGIPE_ENABLED=false
EMPREGAJU_ENABLED=false
IEL_SERGIPE_ENABLED=false
```

O valor ausente equivale a habilitado somente para essas três fontes validadas. Fontes `PENDING`/`BLOCKED` não têm coletor ativo nem flag que as habilite. A atualização é request-time com cache de quatro horas; não existe cron, fila ou persistência de histórico nesta versão. Falha de coleta mantém o último resultado válido como `stale`; não encerra vaga por falha. Expiração só é aplicada quando a fonte informa prazo/status, sem inventar prazo para EmpregAju ou IEL.

## Busca e isolamento por perfil

Pessoas carregam fontes externas apenas em `Buscar`, nos filtros `Todos` e `Empregos`. A busca preserva as vagas internas e acrescenta filtros de fonte, município, cargo, contratação, modalidade, salário mínimo, publicação desde e PcD informada. Cada item mostra fonte e última verificação quando disponíveis; o CTA aponta para a página pública original e, quando separado, para a URL pública de candidatura.

Organizações não executam a chamada externa na Home nem em `Minhas oportunidades`; vagas externas não têm proprietário OFLIX e nunca entram no bloco de publicações da organização. O GO Sergipe continua compatível com `source=go-sergipe`.

## Manutenção

1. Revalidar HTML, `robots.txt`, termos e links públicos antes de alterar seletores.
2. Atualizar fixtures pequenas em `tests/fixtures/` sem copiar dumps reais ou rodapés.
3. Executar os testes com mocks; o CI não depende dos sites.
4. Rodar o check live somente como diagnóstico manual, sem armazenar resposta bruta.
5. Se uma fonte mudar para login, CAPTCHA, API privada ou bloqueio, desligar a flag e mudar o estado desta tabela antes de investigar outra estratégia.

Não há alteração de banco de dados. As vagas externas não são publicações OFLIX, não são contabilizadas como contratação interna e não alimentam “Minhas oportunidades”.
