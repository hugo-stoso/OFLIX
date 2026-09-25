# Arquitetura real desta execução

## Aplicação

Aplicação única Next.js com App Router, TypeScript e Tailwind CSS. A landing está em `/`; a experiência demo em `/demo`; a visão agregada em `/demo/analyst`; e os detalhes em `/opportunity/[id]?kind=formal|service|volunteer`.

## Persistência

SQLite local gerenciado pelo módulo nativo `node:sqlite` do Node.js. O schema SQL separa `profiles`, `locations`, `formal_opportunities`, `service_offers`, `volunteer_opportunities` e `interactions`. O banco é preparado com `npm run db:setup`. O arquivo local é ignorado pelo Git.

## API

- `GET /api/profiles`: perfis demo com território.
- `GET /api/opportunities`: oportunidades separadas por frente.
- `POST /api/interactions`: valida com Zod, persiste e trata duplicidade por perfil, tipo e alvo.
- `GET /api/territory`: calcula contagens e agrupamentos a partir das oportunidades/interações persistidas.

## Experiência de perfil

O perfil escolhido é salvo em `localStorage` com a chave `oflix-demo-profile`. A interface mostra permanentemente que é um perfil de demonstração. Isso não representa autenticação, sessão segura ou controle de acesso.

## UI e responsividade

A interface usa layout editorial, azul-marinho, azul institucional, neutros frios, bordas discretas e raio moderado. A descoberta usa listas em vez de uma grade de cards. Os testes cobrem viewport desktop de 1440×900 e mobile de 390×844.

## Limites reais

Não há autenticação, autorização, publicação, moderação, busca, integração externa, notificações, coordenadas ou deploy nesta execução.
