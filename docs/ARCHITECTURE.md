# Arquitetura real desta execução

## Aplicação

Aplicação única Next.js com App Router, TypeScript e Tailwind CSS. A landing está em `/`; a experiência demo em `/demo`; o perfil detalhado em `/profile`; as preferências da demo em `/settings`; a visão agregada geral em `/demo/analyst`; o recorte territorial por interesses aparece na própria experiência de pessoas; e os detalhes ficam em `/opportunity/[id]?kind=formal|service|volunteer`.

## Persistência

SQLite gerenciado pelo módulo nativo `node:sqlite` do Node.js. O schema SQL separa `profiles`, `locations`, `formal_opportunities`, `service_offers`, `volunteer_opportunities` e `interactions`. Em desenvolvimento, o banco fica em `prisma/dev.db` e é preparado com `npm run db:setup`. No Vercel, a demo usa um arquivo por deployment em `/tmp` e executa o seed DEMO na primeira inicialização da função, porque o filesystem do runtime não permite escrita no diretório do projeto. Essa persistência é efêmera e por instância; não representa uma camada de produção.

`service_offers.required_activities` guarda, como lista delimitada no SQLite, as atividades autônomas que uma organização demanda. A interface permite selecionar várias opções da mesma lista usada nas preferências de trabalhadores; a primeira atividade também preserva a categoria legível da oportunidade para compatibilidade com filtros existentes.

## API

- `GET /api/profiles`: perfis demo com território.
- `GET /api/opportunities`: oportunidades separadas por frente.
- `GET /api/talents`: interesses registrados por candidatos, relacionados à oportunidade e à organização proprietária.
- `POST /api/interactions`: valida com Zod, persiste e trata duplicidade por perfil, tipo e alvo.
- `GET /api/territory?profileId=...`: entrega a visão geral somente quando o perfil demo é `profile-analista`; para outros perfis exige atividades e retorna apenas o recorte de vagas/serviços compatíveis com esses interesses. Sem perfil, responde `401`.

## Experiência de perfil

O perfil escolhido é salvo em `localStorage` com a chave `oflix-demo-profile`. O `DemoHeader` carrega a persona selecionada e oferece um menu acessível com Meu perfil, Configurações e Sair. A página `/profile` apresenta resumo, tipo de participação, competências e território demonstrativo; `/settings` salva preferências locais de notificações. Isso não representa autenticação, sessão segura ou controle de acesso.

Favoritos, atividades de interesse, alertas de novas demandas autônomas e lembretes voluntários usam chaves separadas no `localStorage` para manter a demonstração navegável sem introduzir uma conta falsa. Ao publicar uma demanda autônoma na demo, a organização registra localmente as atividades selecionadas; ao trocar para uma persona de trabalhador no mesmo navegador, os interesses compatíveis são destacados. O link do Google Agenda é um template de evento; não há OAuth nem escrita automática na agenda. A API também impede que o proprietário de uma oportunidade crie uma interação consigo mesmo.

## UI e responsividade

A interface usa layout editorial, azul-marinho, azul institucional, neutros frios, bordas discretas e raio moderado. A descoberta usa listas em vez de uma grade de cards. Os testes cobrem viewport desktop de 1440×900 e mobile de 390×844.

## Limites reais

Não há autenticação de produção, autorização de papéis real, moderação, persistência compartilhada para publicações e alertas demo, push agendado, OAuth do Google, coordenadas ou geocodificação nesta execução. A restrição territorial desta demo usa o perfil selecionado no navegador: o agregado geral é exclusivo da persona Observatório Território Aberto; pessoas recebem somente o recorte das atividades salvas localmente.
