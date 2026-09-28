# Arquitetura real desta execução

## Aplicação

Aplicação única Next.js com App Router, TypeScript e Tailwind CSS. A landing está em `/`; a experiência demo em `/demo`; o perfil detalhado em `/profile`; as preferências da demo em `/settings`; a visão agregada geral em `/demo/analyst`; o recorte territorial por interesses aparece na própria experiência de pessoas; e os detalhes ficam em `/opportunity/[id]?kind=formal|service|volunteer`.

A descoberta técnica usa metadata do Next.js, canonical e Open Graph no layout raiz, além de `/robots.txt` e `/sitemap.xml` para orientar rastreadores. `NEXT_PUBLIC_SITE_URL` pode fixar o domínio público; em um deploy Vercel sem essa variável, o app usa os hosts de produção fornecidos pela plataforma e mantém `localhost:3000` apenas como fallback local.

## Persistência

SQLite gerenciado pelo módulo nativo `node:sqlite` do Node.js. O schema SQL separa `profiles`, `locations`, `formal_opportunities`, `service_offers`, `volunteer_opportunities` e `interactions`. Em desenvolvimento, o banco fica em `prisma/dev.db` e é preparado com `npm run db:setup`. No Vercel, a demo usa um arquivo por deployment em `/tmp` e executa o seed DEMO na primeira inicialização da função, porque o filesystem do runtime não permite escrita no diretório do projeto. Essa persistência é efêmera e por instância; não representa uma camada de produção.

`service_offers.required_activities` guarda, como lista delimitada no SQLite, as atividades autônomas relacionadas a uma publicação. A interface permite selecionar várias opções da mesma lista usada nas preferências de trabalhadores; a primeira atividade também preserva a categoria legível da oportunidade para compatibilidade com filtros existentes. As oportunidades carregam `ownerType`, derivado do perfil proprietário: pessoas ofertam trabalho e organizações/instituições demandam trabalho. No mural, pessoas veem as demandas dos contratantes; organizações veem suas próprias demandas e as ofertas de pessoas, sem acesso às demandas de outra organização.

## API

- `GET /api/profiles`: perfis demo com território.
- `GET /api/opportunities`: oportunidades separadas por frente.
- `GET /api/talents?profileId=...`: interesses registrados por candidatos, relacionados à oportunidade e à organização proprietária; exige `profileId` de uma organização e responde `401/403` para acesso ausente ou não institucional.
- `GET/POST /api/service-calls`: lista chamadas compatíveis com as atividades do autônomo ou as solicitações da conta demandante e abre uma chamada para uma atividade, dia, janela e localização aproximada.
- `POST /api/service-calls/{id}/accept`: aceita uma chamada com update condicional em `status = 'OPEN'`; a primeira aceitação válida vence e as seguintes recebem conflito `409`.
- `POST /api/interactions`: valida com Zod, persiste e trata duplicidade por perfil, tipo e alvo.
- `GET /api/territory?profileId=...`: entrega a visão geral somente quando o perfil demo é `profile-analista`; para outros perfis exige atividades e retorna apenas o recorte de vagas/serviços compatíveis com esses interesses. Sem perfil, responde `401`.

## Experiência de perfil

O perfil escolhido é salvo em `localStorage` com a chave `oflix-demo-profile`. O `DemoHeader` carrega a persona selecionada e oferece um menu acessível com Meu perfil, Configurações e Sair. A página `/profile` apresenta resumo, tipo de participação, competências e território demonstrativo; `/settings` salva preferências locais de notificações. Isso não representa autenticação, sessão segura ou controle de acesso.

Favoritos, atividades de interesse, alertas de novas demandas autônomas e lembretes voluntários usam chaves separadas no `localStorage` para manter a demonstração navegável sem introduzir uma conta falsa. A conta usa a navegação contextual descrita em [Navegação contextual](#navegação-contextual) para levar a cada objetivo; a seleção de oferta/demanda fica dentro da própria busca. As preferências separam frentes de trabalho, atividades autônomas pesquisáveis e interesses de voluntariado pesquisáveis, todos com seleção múltipla. A descoberta tem dois caminhos: Ofertas de trabalho filtra publicações de pessoas; Demandas de trabalho filtra vagas e serviços publicados por contratantes. A gestão de uma organização mantém candidatos e suas próprias demandas em blocos separados, e não expõe publicações de outras organizações. O link do Google Agenda é um template de evento; não há OAuth nem escrita automática na agenda. A API também impede que o proprietário de uma oportunidade crie uma interação consigo mesmo.

O banco de talentos é opt-in: pessoas escolhem múltiplos tipos de trabalho (CLT, estágio, serviços autônomos e/ou voluntariado), informam escolaridade, tipos de curso, curso, especialização/pós-graduação e o município/Estado onde moram, anexam um currículo `.docx` baseado no modelo público `public/Modelo_Curriculo.docx` e ativam `oflix-talent-bank-visible-{profileId}`. O resumo compartilhado (competências, formação, atividades, preferências, currículo e município/Estado informados) fica no diretório local da demo; a base só é exibida para organizações, com busca por texto, filtros de tipo de trabalho, escolaridade e tipo de curso, sem excluir resultados por distância. O município e o Estado são preenchidos manualmente: a demo não pede permissão de localização, usa Google Maps ou coleta coordenadas. A conversa é iniciada pela instituição e oferece atalhos para negociar remuneração e benefícios. Em uma futura implementação, esse diretório deve migrar para uma tabela compartilhada com consentimento, auditoria, armazenamento de arquivo e autorização real.

Chamadas de serviço seguem um fluxo separado do mural de oportunidades: pessoas e organizações podem abrir um pedido para uma atividade e uma janela do dia; autônomos consultam chamadas compatíveis, recebem polling periódico e podem ativar alertas do navegador. A chamada exibe apenas território aproximado; endereço exato e detalhes finais ficam para a conversa após a aceitação. A disputa do primeiro aceite é resolvida no servidor pela atualização condicional do SQLite, ainda com a limitação de persistência efêmera por instância no Vercel.

## UI e responsividade

A interface usa layout editorial, azul-marinho, azul institucional, neutros frios, bordas discretas e raio moderado. A descoberta usa listas em vez de uma grade de cards. Os testes cobrem viewport desktop de 1440×900 e mobile de 390×844.

## Navegação contextual

`/demo` funciona como uma experiência orientada a destinos, com `DemoNavigation` compartilhada entre desktop e mobile. A home mostra apenas a próxima ação e um recorte curto de oportunidades; os fluxos completos ficam em destinos próprios controlados por estado local: `Início`, `Buscar`, `Serviço hoje` e `Perfil`, com `Preferências` para pessoas ou `Talentos` para organizações. No mobile, os cinco destinos ficam em uma bottom navigation persistente; no desktop, aparecem como uma barra curta no conteúdo. Analistas seguem diretamente para `/demo/analyst` e não recebem a navegação operacional de pessoas e organizações.

A busca mantém ofertas e demandas como alternância semântica, usa listas compactas e deixa filtros secundários recolhidos no mobile. O detalhe da oportunidade mantém a ação contextual persistida e apresenta uma barra de ação fixa no mobile. Essas decisões mudam a apresentação e os caminhos de entrada, sem alterar regras de domínio ou endpoints.

## Limites reais

Não há autenticação de produção, autorização de papéis real, moderação, persistência compartilhada para publicações e alertas demo, push agendado, OAuth do Google, coordenadas ou geocodificação nesta execução. A restrição territorial desta demo usa o perfil selecionado no navegador: o agregado geral é exclusivo da persona Observatório Território Aberto; pessoas recebem somente o recorte das atividades salvas localmente.
