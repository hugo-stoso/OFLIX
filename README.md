# OFLIX

OFLIX é um hub territorial de oportunidades e desenvolvimento profissional em demonstração para Sergipe. As três frentes originais — trabalho formal, serviços autônomos e voluntariado — continuam existindo e agora convivem com descoberta contextual de capacitação, concursos/processos seletivos públicos, vagas externas autorizadas e oportunidades de fornecimento ao poder público. No Observatório, “Empregos observados” combina vagas formais OFLIX e publicações de vagas `external_job`; serviços, voluntariado e conexões continuam exclusivamente OFLIX.

## O que está nesta fundação

- Landing objetiva e entrada em uma demonstração explícita.
- Seleção persistente de personas fictícias: pessoa, organização e analista institucional.
- Descoberta de vagas, serviços e ações voluntárias a partir de dados persistidos.
- Detalhes com ações semânticas por frente: candidatura, solicitação de contato e interesse em participar.
- Registro de `Interaction` em SQLite, com prevenção de duplicação simples.
- Primeira visão de inteligência territorial calculada sobre as mesmas oportunidades e interações.
- Observatório Territorial com mapa coroplético local dos 75 municípios de Sergipe, seleção municipal, métricas operacionais, ranking sincronizado e leitura agregada sem identificação individual.
- Hub de descoberta unificado em `Buscar`: relaciona trabalho, serviços, voluntariado, capacitação, concursos/processos seletivos, vagas externas e, quando permitido, oportunidades com o poder público, sem apagar a semântica de cada origem.
- Proveniência visível em itens externos; `DEMO DATA` é identificado quando não há fonte legitimamente integrada.
- Adapter server-side do PNCP com timeout, normalização, deduplicação conservadora, cache curto e fallback.
- Primeira integração real de fonte pública externa: o endpoint estruturado usado pela SPA do GO Sergipe é consumido server-side com allowlist, proveniência visível, cache de quatro horas, deduplicação e CTA para a fonte original.
- Superfície complementar `Mercado & Conhecimento` com remuneração anunciada estruturada, biblioteca de legislação oficial e artigos reais via OpenAlex.

## Arquitetura de informação

As superfícies têm responsabilidades diferentes e complementares:

- Landing (`/`): explica o que é a OFLIX como hub territorial.
- Início (`/demo`): resume o que existe para a pessoa ou organização agora, com território, busca e atalhos.
- Buscar: reúne a descoberta completa sem apagar a semântica de cada universo.
- Preferências: guarda apenas o que a pessoa deseja acompanhar; a edição acontece progressivamente.
- Perfil (`/profile`): descreve quem a pessoa é profissionalmente, incluindo formação, currículo, banco de talentos e território.
- Mercado & Conhecimento (`/market`): reúne salários e mercado, legislação para trabalho e negócios e artigos & evidências, sem transformar esses conteúdos em oportunidades do `Buscar`.

Na navegação organizacional, empresas recebem `Talentos`, ONG/OSC recebe `Pessoas` com abas `Voluntários` e `Talentos`, e instituição pública recebe `Voluntários` para gestão de participantes. A Home da ONG/OSC prioriza mobilização e publicação de ações voluntárias, sem retirar CLT, estágio ou serviços profissionais do composer.

`Mercado & Conhecimento` aparece cedo na Home: logo após a busca principal de pessoas e logo após as ações principais de organizações. A seção mantém três atalhos diretos para salários e mercado, legislação e artigos, além de uma entrada persistente no menu da persona, sem criar um sexto destino na navegação principal.

`Remuneração média anunciada` é calculada somente sobre vagas OFLIX com valores estruturados; faixas usam o ponto médio e publicações sem valor ficam fora do denominador. `Salário médio de admissão` é uma métrica distinta do mercado formal MTE/PDET. Nesta execução a fonte oficial foi investigada, mas não há integração segura de dados salariais oficiais: a interface informa a indisponibilidade e não inventa números.

A biblioteca editorial guarda apenas fichas curtas e links oficiais. A área acadêmica usa metadata real do OpenAlex, com consulta live, cache curto e snapshot local determinístico; não armazena PDFs nem resumos gerados.

Formação, currículo, residência e publicação no banco de talentos permanecem nas mesmas chaves de `localStorage`, mas foram retirados da visão inicial de Preferências. Nenhuma migração limpa ou renomeia dados existentes.

## Evolução do hub nesta execução

- `PERSON` descobre trabalho, serviços, voluntariado, cursos, concursos públicos, processos seletivos e vagas externas. As vagas do GO Sergipe são rotuladas `GO Sergipe` e entram a partir da fonte pública estruturada usada pela aplicação web.
- Pessoa com atividade autônoma pode ativar, em Preferências, oportunidades com o poder público; a interface orienta a conferir o edital e não afirma habilitação jurídica.
- Organizações só recebem o hub de fornecimento quando a capacidade `canSupplyPublic` está marcada; organizações sem essa capacidade continuam fora desse recorte.
- Contratações públicas usam “Poder público” e “Forma de contratação”; concurso público e processo seletivo permanecem distintos dos demais itens por badges e detalhes próprios.
- A primeira fonte pública externa real é o GO Sergipe. A página é uma SPA, mas sua listagem usa um endpoint JSON público estruturado em `GET /api/oportunidades`; a OFLIX reproduz essa chamada sem autenticação, sem Cookie/Authorization/CSRF, sem candidatura, sem navegador headless em produção e sem coletar os campos administrativos extras da resposta. Em 09/10/2026 o check obteve 156 publicações de vagas em 13 páginas filtradas por Sergipe, e o deploy público respondeu com vagas e 156 URLs de detalhe válidas. `GO_SERGIPE_ENABLED` fica ligado por padrão e foi configurado como `true` no Production do Vercel; pode ser desligado explicitamente com `false`. ComprasNet.SE, cursos e concursos reais seguem pendentes de canal próprio.

Os dados do seed são DEMO DATA, fictícios e substituíveis. Nenhum dado pessoal da proposta de inscrição deve ser incluído no repositório.

O mapa do Observatório usa a Malha Municipal Digital do IBGE, versão 2024, recortada para Sergipe e simplificada para web. O artefato local mantém nome oficial e código IBGE; ausência de registros observados deixa o município neutro e não significa ausência de atividade econômica real. As métricas do mapa, ranking, resumo e panorama usam o mesmo recorte: empregos observados (OFLIX + `external_job`), prestação de serviços OFLIX, voluntariado OFLIX e interações OFLIX. Cursos, concursos e sinais de contratação pública permanecem separados.

## Stack

Next.js, TypeScript, Tailwind CSS e SQLite nativo do Node (`node:sqlite`). Playwright cobre o smoke test do fluxo principal e uma verificação de overflow na landing mobile. `cheerio` é usado somente no parser server-side do GO Sergipe.

## Rodar localmente

Pré-requisitos: Node.js 22.5+ (recomendado Node.js 24+) e npm.

```bash
copy .env.example .env
npm install
npm run db:setup
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Publicação pública e indexação

O projeto pode ser publicado como uma aplicação pública no Vercel conectada ao repositório GitHub. Cada push na branch `main` gera uma nova implantação. Em produção, defina `NEXT_PUBLIC_SITE_URL` com a URL pública principal para que canonical, Open Graph e sitemap usem o domínio correto; sem essa variável, o app aproveita as variáveis de ambiente fornecidas pelo Vercel.

A implantação pública atual está em [oflix-six.vercel.app](https://oflix-six.vercel.app). O endereço técnico do Vercel é temporário; para facilitar a memorização e diferenciar a marca de outros resultados chamados “Oflix”, a publicação ideal deve usar um domínio próprio que contenha OFLIX e a associação territorial, como `oflixsergipe.com.br`, caso esteja disponível e seja registrado pelo responsável.

A aplicação usa título e descrição com “OFLIX” e “Sergipe”, dados estruturados `WebSite`, favicon próprio, canonical, Open Graph, `/robots.txt` e `/sitemap.xml`. Isso melhora a compreensão e a apresentação do site, mas não garante o primeiro lugar: depois do deploy, o proprietário deve verificar o domínio no Google Search Console, enviar `https://SEU-DOMINIO/sitemap.xml` e solicitar a indexação da página inicial. Também é importante divulgar o domínio em perfis e páginas públicas legítimas, porque links externos ajudam o Google a descobrir e contextualizar a marca.

Comandos de qualidade:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check:go-sergipe
npm run audit:job-details
```

Os detalhes estruturados das vagas externas são extraídos somente de campos públicos confirmados. O GO Sergipe fornece requisitos, benefícios, escolaridade, experiência mínima quando informada, jornada, contrato, salário, quantidade e indicadores PcD; campos ausentes permanecem ausentes e não são inferidos. `npm run audit:job-details` relata cobertura agregada por fonte sem imprimir descrições, URLs, cookies, tokens ou respostas brutas. Gupy permanece sem integração até existir autorização Bearer do tenant para a API estruturada; Sólides permanece em validação adicional porque a listagem pública observada é específica de tenant e o endpoint de detalhe retornou 403. Nenhuma dessas duas fontes é chamada pela aplicação.

Consulte [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) para um roteiro curto da apresentação.

### Área e ocupação específica

Consultas de empregos distinguem área ocupacional ampla de ocupação específica. “Vagas administrativas” usa a família Administração; “assistente administrativo” é resolvido somente contra as ocupações observadas, sem ampliar automaticamente para toda a família. A resolução determinística retorna `resolved`, `ambiguous` ou `not_found`; `occupationQuery` é texto extraído pela DSL e a chave canônica só é escolhida pelo backend.
