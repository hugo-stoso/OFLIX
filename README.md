# OFLIX

OFLIX é uma plataforma territorial em demonstração para Sergipe. A primeira fundação conecta três frentes — trabalho formal, serviços autônomos e voluntariado — em uma experiência única de descoberta, interação e leitura agregada do território.

## O que está nesta fundação

- Landing objetiva e entrada em uma demonstração explícita.
- Seleção persistente de personas fictícias: pessoa, organização e analista institucional.
- Descoberta de vagas, serviços e ações voluntárias a partir de dados persistidos.
- Detalhes com ações semânticas por frente: candidatura, solicitação de contato e interesse em participar.
- Registro de `Interaction` em SQLite, com prevenção de duplicação simples.
- Primeira visão de inteligência territorial calculada sobre as mesmas oportunidades e interações.

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

A aplicação expõe `/robots.txt` e `/sitemap.xml` e mantém a landing, a demonstração e o observatório como páginas rastreáveis. A publicação não garante aparição imediata no Google: depois do primeiro deploy, o proprietário do domínio deve adicionar a URL no Google Search Console e enviar o sitemap.

Comandos de qualidade:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Consulte [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) para um roteiro curto da apresentação.
