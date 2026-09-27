# Arquitetura real desta execução

## Aplicação

Aplicação única Next.js com App Router, TypeScript e Tailwind CSS. A landing está em `/`; a experiência demo em `/demo`; a visão agregada em `/demo/analyst`; e os detalhes em `/opportunity/[id]?kind=formal|service|volunteer`.

## Persistência

SQLite gerenciado pelo módulo nativo `node:sqlite` do Node.js. O schema SQL separa `profiles`, `locations`, `formal_opportunities`, `service_offers`, `volunteer_opportunities` e `interactions`. Em desenvolvimento, o banco fica em `prisma/dev.db` e é preparado com `npm run db:setup`. No Vercel, a demo usa um arquivo por deployment em `/tmp` e executa o seed DEMO na primeira inicialização da função, porque o filesystem do runtime não permite escrita no diretório do projeto. Essa persistência é efêmera e por instância; não representa uma camada de produção.

## API

- `GET /api/profiles`: perfis demo com território.
- `GET /api/opportunities`: oportunidades separadas por frente.
- `GET /api/talents`: interesses registrados por candidatos, relacionados à oportunidade e à organização proprietária.
- `POST /api/interactions`: valida com Zod, persiste e trata duplicidade por perfil, tipo e alvo.
- `GET /api/territory`: calcula contagens, agrupamentos territoriais e empregos formais por município/região e tipo de vínculo.

## Experiência de perfil

O perfil escolhido é salvo em `localStorage` com a chave `oflix-demo-profile`. A interface mostra permanentemente que é um perfil de demonstração. Isso não representa autenticação, sessão segura ou controle de acesso.

Favoritos, atividades de interesse e lembretes voluntários usam chaves separadas no `localStorage` para manter a demonstração navegável sem introduzir uma conta falsa. O link do Google Agenda é um template de evento; não há OAuth nem escrita automática na agenda. A API também impede que o proprietário de uma oportunidade crie uma interação consigo mesmo.

## UI e responsividade

A interface usa layout editorial, azul-marinho, azul institucional, neutros frios, bordas discretas e raio moderado. A descoberta usa listas em vez de uma grade de cards. Os testes cobrem viewport desktop de 1440×900 e mobile de 390×844.

## Limites reais

Não há autenticação de produção, autorização de papéis, moderação, persistência compartilhada para publicações demo, push agendado, OAuth do Google, coordenadas ou geocodificação nesta execução.
