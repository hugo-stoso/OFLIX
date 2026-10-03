# OFLIX

OFLIX é um hub territorial de oportunidades e desenvolvimento profissional em demonstração para Sergipe. As três frentes originais — trabalho formal, serviços autônomos e voluntariado — continuam existindo e agora convivem com descoberta contextual de capacitação, concursos/processos seletivos públicos, vagas externas autorizadas e oportunidades de fornecimento ao poder público.

## O que está nesta fundação

- Landing objetiva e entrada em uma demonstração explícita.
- Seleção persistente de personas fictícias: pessoa, organização e analista institucional.
- Descoberta de vagas, serviços e ações voluntárias a partir de dados persistidos.
- Detalhes com ações semânticas por frente: candidatura, solicitação de contato e interesse em participar.
- Registro de `Interaction` em SQLite, com prevenção de duplicação simples.
- Primeira visão de inteligência territorial calculada sobre as mesmas oportunidades e interações.
- Hub de descoberta que relaciona os universos sem misturá-los: busca de trabalho e serviços, bloco próprio de formação e caminhos públicos e painel específico do poder público.
- Proveniência visível em itens externos; `DEMO DATA` é identificado quando não há fonte legitimamente integrada.
- Adapter server-side do PNCP com timeout, normalização, deduplicação conservadora, cache curto e fallback.

## Evolução do hub nesta execução

- `PERSON` descobre trabalho, serviços, voluntariado, cursos, concursos públicos, processos seletivos e vagas externas DEMO DATA.
- Pessoa com atividade autônoma pode ativar, em Preferências, oportunidades com o poder público; a interface orienta a conferir o edital e não afirma habilitação jurídica.
- Organizações só recebem o hub de fornecimento quando a capacidade `canSupplyPublic` está marcada; organizações sem essa capacidade continuam fora desse recorte.
- Contratações públicas usam “Poder público” e “Forma de contratação”; concurso público permanece separado da modalidade jurídica `Concurso — modalidade de contratação`.
- Nenhum scraping é feito. ComprasNet.SE e vagas/cursos/concursos reais permanecem pendentes de API, feed ou autorização documentada.

Os dados do seed são DEMO DATA, fictícios e substituíveis. Nenhum dado pessoal da proposta de inscrição deve ser incluído no repositório.

## Stack

Next.js, TypeScript, Tailwind CSS e SQLite nativo do Node (`node:sqlite`). Playwright cobre o smoke test do fluxo principal e uma verificação de overflow na landing mobile.

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
```

Consulte [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) para um roteiro curto da apresentação.
