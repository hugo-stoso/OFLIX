# Arquitetura real desta execução

## Aplicação

Aplicação única Next.js com App Router, TypeScript e Tailwind CSS. A landing está em `/`; a experiência demo em `/demo`; o perfil detalhado em `/profile`; as preferências da demo em `/settings`; o Observatório Territorial agregado em `/demo/analyst`; o recorte territorial por interesses aparece na própria experiência de pessoas; e os detalhes ficam em `/opportunity/[id]?kind=formal|service|volunteer`.

### Observatório Territorial

`app/demo/analyst/page.tsx` mantém o estado local `selectedMunicipality`, `selectedMetric` e `selectedCategory`. A página carrega `GET /api/territory?profileId=profile-analista` e a malha local `public/geo/sergipe-municipalities-2024.geojson`. `components/TerritoryMap.tsx` transforma os polígonos GeoJSON em caminhos SVG focáveis; `MunicipalityRanking.tsx` e `MunicipalitySummary.tsx` usam o mesmo estado, mantendo mapa, seletor, ranking e painel sincronizados.

O GeoJSON é derivado da Malha Municipal Digital do IBGE, versão 2024, arquivo estadual de Sergipe (`SE_Municipios_2024.zip`). A fonte oficial é [geoftp.ibge.gov.br/.../UFs/SE](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2024/UFs/SE/). O shapefile SIRGAS 2000 foi convertido para GeoJSON geográfico, simplificado com Ramer–Douglas–Peucker em tolerância de `0.001` grau e recortado somente para Sergipe. O script reprodutível é `scripts/prepare-ibge-sergipe-geojson.mjs`; a saída contém 75 municípios, `municipality`, `ibgeCode` e `state`.

O servidor agrega por município com `GROUP BY` nas tabelas reais de oportunidades e interações, sem uma consulta por município. O contrato geral inclui `municipalities[]` com `municipality`, `ibgeCode` quando validado, `opportunities`, `formal`, `clt`, `internship`, `services`, `volunteer`, `interactions` e `categories[]`. A métrica `activeMunicipalities` significa município com pelo menos uma oportunidade operacional ou interação. A base atual ainda não armazena o código IBGE em `locations`; os três nomes presentes no seed têm mapeamento explícito e validado contra a malha. A API territorial de pessoas continua no escopo `interests` e não recebe a visão geral.

O mapa representa somente volumes da base OFLIX DEMO DATA. Empregos são oportunidades formais, serviços são registros de `service_offers`, voluntariado vem de `volunteer_opportunities` e interações são contagens por alvo localizado no município. Sinais externos, cursos, concursos, vagas externas e PNCP continuam fora da projeção operacional do mapa.

A descoberta técnica usa metadata do Next.js, canonical e Open Graph no layout raiz, além de `/robots.txt` e `/sitemap.xml` para orientar rastreadores. `NEXT_PUBLIC_SITE_URL` pode fixar o domínio público; em um deploy Vercel sem essa variável, o app usa os hosts de produção fornecidos pela plataforma e mantém `localhost:3000` apenas como fallback local.

## SEMÂNTICA SEPARADA + DESCOBERTA UNIFICADA

As entidades operacionais permanecem separadas (`formal_opportunities`, `service_offers` e `volunteer_opportunities`). `lib/discovery.ts` fornece uma camada de indexação leve (`DiscoveryItem`) para busca, home, filtros, explicação do matching e proveniência. Ela também normaliza cursos, concursos públicos, processos seletivos, vagas externas e contratações públicas sem transformar esses domínios em uma tabela genérica.

O perfil demo carrega a capacidade `canSupplyPublic`. Organizações fornecedoras e pessoas `PERSON` com atividade autônoma podem ver o recorte de poder público; a pessoa autônoma ainda precisa manter o opt-in local. Organizações sem capacidade fornecedora não recebem o hub público. O analista continua entrando diretamente em `/demo/analyst`.

`/api/public-opportunities` entrega DEMO DATA por padrão. `lib/connectors/pncp.ts` é um provider server-side isolado para a API pública de consulta do PNCP, usando `contratacoes/proposta`, filtro inicial por UF, timeout de 3,5 s, cache em memória de cinco minutos, normalização flexível, deduplicação conservadora e resposta de erro sem derrubar a aplicação. A consulta só é acionada no contexto público e para organização fornecedora ou pessoa autônoma com opt-in explícito; se a fonte falhar, a busca preserva o fallback DEMO DATA e oferece nova tentativa. Não há adapter ComprasNet.SE, scraping ou endpoint privado.

Itens externos carregam `source`, `sourceLabel`, `sourceId`/`sourceJobId`, `sourceUrl`, `applicationUrl`, datas de publicação/verificação, prazo e status quando informados. A UI distingue `DEMO DATA`, `PNCP`, `OFLIX`, `GO Sergipe`, `EmpregAju` e `IEL Sergipe`; o CTA varia por universo (vaga original, candidatura, curso ou edital/portal oficial), e nenhum item externo é contado como contratação ou emprego criado pelo OFLIX.

## GO SERGIPE: PRIMEIRA FONTE PÚBLICA EXTERNA

`GET /api/external-jobs?source=go-sergipe` expõe a fonte externa somente para o fluxo `PERSON` de descoberta. O endpoint chama `lib/connectors/go-sergipe.ts` no servidor, aplica `q` e município sobre o resultado em cache e devolve `source: "GO_SERGIPE"`, `sourceLabel: "GO Sergipe"`, `collectedAt`, `stale`, `partial` e `count`. Organizações, voluntariado, capacitação, concursos e contratação pública não disparam essa coleta.

O HTML observado em 08/10/2026 é um shell de SPA (`#app` e bundle JavaScript), sem cards no GET inicial. A própria aplicação faz `GET https://gosergipe.se.gov.br/api/oportunidades` com os filtros públicos padrão e `code_uf=SE`; a resposta é JSON com `count`, `next`, `previous` e `results`, 12 resultados por página no snapshot validado. O conector usa essa representação estruturada, com User-Agent identificável, timeout de 7 segundos por request, no máximo 25 páginas sequenciais e cache em memória/Next de quatro horas. Só segue `next` quando permanece em HTTPS, no host `gosergipe.se.gov.br` e no path `/api/oportunidades`.

O parser JSON usa allowlist de campos públicos de oportunidade: ID, título, descrição, empresa, município/UF, datas, vagas, salário textual, PcD, escolaridade, tipo de contratação e CBO quando retornados. Ignora `created_by`, contatos, CNPJ, endereço/CEP, aplicações, limites internos e demais campos administrativos. Não acessa detalhes em massa, não executa candidatura, não usa autenticação e não usa navegador headless em produção. `sourceId` vem do ID real; a URL é construída como `/detalheOportunidades/{id}` somente após validação browser da rota pública. O parser HTML anterior permanece como fixture/fallback futuro, mas não é o mecanismo live.

O endpoint não é chamado de API oficial ou documentada: é o endpoint público estruturado utilizado pela aplicação web do GO Sergipe. A checagem de 09/10/2026 obteve 156 anúncios, 13 páginas, 156 IDs únicos e somente UF SE. `GO_SERGIPE_ENABLED` fica habilitado por padrão após a validação anônima e pode ser desligado explicitamente com `false`; o fallback mantém a aplicação operante e registra apenas início/fim da coleta, sem títulos ou dados pessoais nos logs.

## EMPREGAJU E IEL SERGIPE: MULTIFONTES PÚBLICAS

`lib/connectors/external-jobs.ts` orquestra, em paralelo e com falha isolada, o GO Sergipe, o EmpregAju e o IEL Sergipe. `GET /api/external-jobs` sem `source` retorna o agregado; `source=go-sergipe`, `source=empregaju` e `source=iel-sergipe` preservam a execução isolada. Pessoas carregam o agregado em Buscar; organizações não fazem essa requisição e não misturam vagas externas em `Minhas oportunidades`.

O EmpregAju usa somente HTML público de `/cidadao/vagas`, percorre a paginação HTML allowlisted, extrai ID de `verDetalhes`, candidatura pública `/register`, município/UF, badges e data. O IEL usa somente o HTML público de `/SE` e os links individuais `/SE/vaga/...`; a paginação depende de `/api/`, que está desautorizada pelo `robots.txt`, e por isso não é chamada. Ambos têm timeout, tentativa única adicional para HTTP 5xx, cache de quatro horas, fallback stale e allowlist de host/caminho.

O contrato comum acrescenta empresa, candidatura, campos de remuneração, localização, modalidade, contratação, vagas, PcD, ciclo de verificação e status sem inventar valores ausentes. A deduplicação de primeiro nível usa `source + sourceJobId`; entre fontes diferentes somente há deduplicação quando o mesmo identificador pertence à mesma fonte, preservando links e cartões de fontes distintas. `docs/integrations/job-sources.md` registra a auditoria de Vagas Sergipe, Oficial News, BNE e Gupy: nenhuma dessas fontes tem coleta automática ativa.

## MERCADO & CONHECIMENTO

`/market` é uma superfície complementar, fora dos cinco destinos principais. Ela possui três abas: `Salários e mercado`, `Legislação para trabalho e negócios` e `Artigos & evidências`. A Home de pessoa apresenta Mercado & Conhecimento logo após a busca; a Home de organização, logo após suas ações principais. O componente reutilizável oferece três links diretos e copy por persona. Entradas contextuais adicionais aparecem no Observatório, no detalhe de vaga, no detalhe de voluntariado e no menu persistente da persona.

Remuneração de vaga é persistida em colunas numéricas de `formal_opportunities`: mínimo, máximo opcional, moeda, periodicidade e tipo (`SALARY` ou `INTERNSHIP_STIPEND`). A validação aceita apenas BRL mensal, valores positivos e máximo maior ou igual ao mínimo; campos vazios permanecem ausentes. O tipo de estágio é exibido como bolsa/remuneração de estágio, nunca como salário CLT.

`lib/compensation.ts` calcula a referência de valor exato ou ponto médio de faixa. `lib/market.ts` calcula `Remuneração média anunciada`, filtrável por município e categoria OFLIX, excluindo vagas sem valor e sempre informando observações e metodologia. Isso não é `salário médio da profissão`.

O detalhe formal envia `municipality` e `category` para `/market`; `category` é o recorte OFLIX da média anunciada e `profession` fica reservado à futura consulta oficial por ocupação/CBO. Se não houver categoria, a interface declara `Todas as categorias`.

O indicador oficial `Salário médio de admissão` tem contrato próprio em `lib/official-market.ts`, com fonte MTE/PDET, mas permanece `unavailable` nesta execução: a página não exibe número inventado, CBO inferido ou mapa salarial. A investigação confirmou o PDET como origem oficial, mas não um endpoint público documentado seguro para integrar nesta rodada.

A legislação é um catálogo editorial local (`lib/legislation.ts`) com referências curtas e links Planalto. Não são armazenados textos legais integrais nem pareceres. A Reforma Tributária do Consumo é um tópico composto por EC 132/2023, LC 214/2025 e LC 227/2026.

`lib/connectors/openalex.ts` normaliza metadata real do OpenAlex, usa cache de dez minutos e tenta a consulta live. A UI mantém os três macrotemas como atalhos e aceita busca livre por `q`. Em falha, responde com `lib/data/openalex-snapshot.ts`, um snapshot de IDs OpenAlex/DOI, autores, ano, fonte, citações e acesso aberto; uma query explícita sem correspondência razoável retorna lista vazia, não a coleção inteira. O ranking é determinístico por tema, consulta, acesso aberto, atualidade e citações; citações não são tratadas como qualidade. Artigos não são `DiscoveryItem`.

## Persistência

SQLite gerenciado pelo módulo nativo `node:sqlite` do Node.js. O schema SQL separa `profiles`, `locations`, `formal_opportunities`, `service_offers`, `volunteer_opportunities` e `interactions`. Em desenvolvimento, o banco fica em `prisma/dev.db` e é preparado com `npm run db:setup`. No Vercel, a demo usa um arquivo por deployment em `/tmp` e executa o seed DEMO na primeira inicialização da função, porque o filesystem do runtime não permite escrita no diretório do projeto. Essa persistência é efêmera e por instância; não representa uma camada de produção.

`service_offers.required_activities` guarda, como lista delimitada no SQLite, as atividades autônomas relacionadas a uma publicação. A interface permite selecionar várias opções da mesma lista usada nas preferências de trabalhadores; a primeira atividade também preserva a categoria legível da oportunidade para compatibilidade com filtros existentes. `profiles.organization_kind` distingue `COMPANY`, `NONPROFIT` e `PUBLIC_INSTITUTION`, enquanto `operating_area` separa área de operação de sede/recorte local sem geocodificação. As políticas `canPublishFormal`, `canPublishServiceDemand`, `canPublishVolunteer`, `canUseTalentDirectory`, `canUseServiceToday`, `canManageVolunteers` e `canDiscoverPublicProcurement` centralizam autorização de demonstração. Instituições públicas fictícias publicam e gerenciam ações voluntárias, mas não vagas formais, talentos, serviço para hoje ou fornecimento ao PNCP.

O ciclo de voluntariado usa `volunteer_participants`, com uma inscrição por pessoa e ação e os estados `INTERESTED`, `CONFIRMED` e `PARTICIPATED`. A API valida que a pessoa é `PERSON` e que apenas a organização dona da ação, com política de gestão de voluntários, pode avançar o estado. A oportunidade pode registrar requisitos práticos, quantidade desejada e orientação institucional; não há salário ou benefício nesse fluxo.

## API

- `GET /api/profiles`: perfis demo com território.
- `GET /api/opportunities`: oportunidades separadas por frente.
- `GET /api/talents?profileId=...`: interesses registrados por candidatos, relacionados à oportunidade e à organização proprietária; exige `profileId` de uma organização e responde `401/403` para acesso ausente ou não institucional.
- `GET/POST /api/service-calls`: lista chamadas compatíveis com as atividades do autônomo ou as solicitações da conta demandante e abre uma chamada para uma atividade, dia, janela e localização aproximada.
- `POST /api/service-calls/{id}/accept`: aceita uma chamada com update condicional em `status = 'OPEN'`; a primeira aceitação válida vence e as seguintes recebem conflito `409`.
- `POST /api/interactions`: valida com Zod, persiste e trata duplicidade por perfil, tipo e alvo.
- `POST /api/opportunities`: publica formal, demanda de serviço ou ação voluntária apenas quando a política do perfil permite.
- `GET/POST/PATCH /api/volunteer-participation`: registra interesse de pessoa, lista inscrições da pessoa ou da organização dona e confirma/fecha participação com ownership server-side.
- `GET /api/territory?profileId=...`: entrega a visão geral somente quando o perfil demo é `profile-analista`; para outros perfis exige atividades e retorna apenas o recorte de vagas/serviços compatíveis com esses interesses. Sem perfil, responde `401`.
- `GET /api/external-jobs[?source=all|go-sergipe|empregaju|iel-sergipe]`: fontes públicas externas validadas, com `q` e `municipality`, cache/fallback e resumo de estado por fonte; a chamada só é feita no fluxo de descoberta de pessoas.
- `POST /api/opportunities` valida publicação e remuneração; `GET /api/market/announced` calcula a média anunciada por município/categoria; `GET /api/knowledge` consulta OpenAlex com fallback snapshot. Esses endpoints não alteram a descoberta unificada.

## Experiência de perfil

O perfil escolhido é salvo em `localStorage` com a chave `oflix-demo-profile`. O `DemoHeader` carrega a persona selecionada e oferece um menu acessível com Meu perfil, Mercado & Conhecimento, Configurações e Sair. A página `/profile` apresenta resumo profissional e, para `PERSON`, edita progressivamente formação, currículo, banco de talentos e território. Organizações continuam vendo apenas informações pertinentes ao seu papel. `/settings` salva preferências locais de notificações. Isso não representa autenticação, sessão segura ou controle de acesso.

Favoritos, atividades de interesse, alertas de novas demandas autônomas e lembretes voluntários usam chaves separadas no `localStorage` para manter a demonstração navegável sem introduzir uma conta falsa. A conta usa a navegação contextual descrita em [Navegação contextual](#navegação-contextual) para levar a cada objetivo; a seleção de oferta/demanda fica dentro da própria busca. As preferências separam frentes de trabalho, atividades autônomas pesquisáveis e interesses de voluntariado pesquisáveis, todos com seleção múltipla. A descoberta tem dois caminhos: Ofertas de trabalho filtra publicações de pessoas; Demandas de trabalho filtra vagas e serviços publicados por contratantes. A gestão de uma organização mantém candidatos e suas próprias demandas em blocos separados, e não expõe publicações de outras organizações. O link do Google Agenda é um template de evento; não há OAuth nem escrita automática na agenda. A API também impede que o proprietário de uma oportunidade crie uma interação consigo mesmo.

O banco de talentos é opt-in: pessoas escolhem múltiplos tipos de trabalho (CLT, estágio, serviços autônomos e/ou voluntariado), informam escolaridade, tipos de curso, curso, especialização/pós-graduação e o município/Estado onde moram, anexam um currículo original em PDF ou DOCX e ativam `oflix-talent-bank-visible-{profileId}`. O limite é 5 MB, o nome original é preservado e o conteúdo não é analisado nesta demo. O legado `curriculumConfirmed` continua legível, mas não é requisito; dados antigos do `localStorage` não são apagados. Formação, currículo, território e visibilidade são editados em grupos progressivos no Perfil; Preferências mostra apenas resumos e links para esse contexto. O resumo compartilhado fica no diretório local da demo; a base só é exibida para organizações permitidas, com busca por texto e filtros, sem excluir resultados por distância. O município e o Estado são preenchidos manualmente: a demo não pede permissão de localização, usa Google Maps ou coleta coordenadas. A conversa é iniciada pela instituição e oferece próximos passos sem transformar voluntariado em negociação de remuneração. Em uma futura implementação, esse diretório deve migrar para uma tabela compartilhada com consentimento, auditoria, armazenamento de arquivo e autorização real.

Publicações formais feitas pelo `OpportunityComposer` passam pelo `POST /api/opportunities` e persistem no SQLite. A organização escolhe CLT ou Estágio e pode não informar remuneração, divulgar valor exato ou faixa. O detalhe e a busca usam a mesma estrutura numérica; publicações sem valor continuam funcionais e não entram na média.

Chamadas de serviço seguem um fluxo separado do mural de oportunidades: pessoas e organizações podem abrir um pedido para uma atividade e uma janela do dia; autônomos consultam chamadas compatíveis, recebem polling periódico e podem ativar alertas do navegador. A chamada exibe apenas território aproximado; endereço exato e detalhes finais ficam para a conversa após a aceitação. A disputa do primeiro aceite é resolvida no servidor pela atualização condicional do SQLite, ainda com a limitação de persistência efêmera por instância no Vercel.

## UI e responsividade

A interface usa layout editorial, azul-marinho, azul institucional, neutros frios, bordas discretas e raio moderado. A landing apresenta uma busca conceitual transversal — com exemplos de vaga, curso, concurso e serviço — e organiza “O que você encontra” em três pilares editoriais, sem duplicar a grade de universos. Na Home, Mercado & Conhecimento usa uma seção editorial leve com três links reais, ícones discretos, microdescrições e affordance de navegação; no mobile, os links ficam empilhados sem carrossel. Na Home de pessoa, os atalhos de descoberta são compactos e priorizam o nome do destino no mobile. A descoberta usa listas em vez de uma grade de cards. Os testes cobrem viewport desktop de 1440×900 e mobile de 390×844.

## SEO de marca

O layout raiz define título e descrição com a marca OFLIX e a associação a Sergipe, além de canonical, Open Graph, Twitter summary, favicon e dados estruturados `WebSite` em JSON-LD. A landing repete a marca em um título principal semanticamente descritivo para que pessoas e rastreadores entendam que o resultado é a plataforma territorial, não um dos serviços homônimos. A posição para a busca genérica “oflix” depende também de indexação, domínio, menções públicas e concorrência; o código não pode garantir uma colocação específica.

## Navegação contextual

`/demo` funciona como uma experiência orientada a destinos, com `DemoNavigation` compartilhada entre desktop e mobile. A Home de pessoa começa pela saudação contextual, busca principal, Mercado & Conhecimento, resumo territorial calculado dos `DiscoveryItem` visíveis, atalhos para os universos do hub, 3–4 recomendações, teaser de Serviço para hoje com linguagem compatível com o papel e teaser público apenas quando permitido. A Home de organização usa navegação contextual: empresa recebe ações principais, Mercado & Conhecimento, Talentos, Serviço para hoje e buscar; ONG/OSC recebe uma Home de mobilização, ação voluntária, Mercado & Conhecimento, Pessoas e gestão; instituição pública recebe Ações, Mercado & Conhecimento e Voluntários, sem serviço ou talentos. O bloco usa “Minhas oportunidades” para empresa, “Minhas publicações” para ONG/OSC e “Minhas ações” para instituição pública, antes do composer, que só abre sob demanda. Em Pessoas, a ONG separa as abas Voluntários e Talentos; Voluntários da instituição pública abre somente a gestão de participantes. O acesso persistente a Mercado & Conhecimento fica no menu do `DemoHeader`, sem alterar a bottom navigation. No mobile, os destinos permitidos continuam na bottom navigation; no desktop, em uma barra curta. Analistas seguem diretamente para `/demo/analyst` e não recebem a navegação operacional.

A busca mantém ofertas e demandas como alternância semântica somente nos universos operacionais de mercado (`Empregos` e `Serviços`), com rótulos adequados ao contexto. Em `Todos`, `Voluntariado`, `Concursos`, `Capacitação` e demais universos não operacionais, o seletor fica oculto e `publicationMode` não altera os resultados. O hub continua projetando todos os universos permitidos em chips de contexto e deixa filtros secundários recolhidos no mobile. O detalhe da oportunidade preserva a URL local de retorno, mantém a ação contextual persistida e apresenta uma barra de ação fixa no mobile. Essas decisões mudam a apresentação e os caminhos de entrada, sem alterar regras de domínio ou endpoints.

## Responsabilidades por superfície

Landing = comunicação pública do hub. Início = resumo contextual. Buscar = descoberta completa. Preferências = intenção. Perfil = identidade profissional. Formação, currículo, residência e publicação no banco de talentos não devem regressar à visão principal de Preferências.

## Limites reais

Não há autenticação de produção, autorização de papéis real, moderação, persistência compartilhada para publicações e alertas demo, push agendado, OAuth do Google, coordenadas ou geocodificação nesta execução. A restrição territorial desta demo usa o perfil selecionado no navegador: o agregado geral é exclusivo da persona Observatório Território Aberto; pessoas recebem somente o recorte das atividades salvas localmente.
