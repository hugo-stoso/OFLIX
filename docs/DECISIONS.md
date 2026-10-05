# Decisões desta inicialização

## Stack

Foi escolhida uma aplicação única em Next.js, TypeScript e Tailwind CSS por reduzir a superfície operacional da demo e facilitar a execução local. O módulo nativo `node:sqlite` oferece persistência SQLite real sem exigir binário nativo adicional neste ambiente, mantendo um caminho simples para evolução do modelo.

## Persistência e domínio

As três frentes permanecem como entidades semânticas separadas. `Interaction` compartilha infraestrutura, mas mantém o tipo e o alvo explícitos. A deduplicação inicial usa uma restrição composta por perfil, frente e oportunidade.

## Hub de descoberta e fontes externas

Foi escolhida uma camada `DiscoveryItem` somente para indexação e apresentação. Cursos, concursos/processos seletivos, vagas externas e contratações públicas não são forçados para as tabelas operacionais das três frentes. A proveniência é obrigatória: fonte, rótulo, identificador, URL oficial/canônica e datas são preservados quando disponíveis.

O provider PNCP fica isolado em `lib/connectors/pncp.ts`, no servidor, com timeout, cache curto, normalização e fallback. A experiência usa DEMO DATA por padrão para ser determinística e não representar dados fictícios como oficiais; uma atualização explícita pode consultar a API pública oficial. ComprasNet.SE e outras fontes não foram integradas sem documentação ou autorização pública suficiente.

## SEMÂNTICA SEPARADA + DESCOBERTA UNIFICADA

Cursos, concursos públicos, processos seletivos, vagas externas e contratações públicas permanecem entidades/projeções semanticamente distintas, com badges, filtros e detalhes próprios. A decisão de produto é apresentar esses universos permitidos em um único hub `Buscar`, porque separação de significado não deve virar fragmentação da descoberta. A home fica curta e recomenda um recorte misto; o painel de poder público é um teaser para o filtro `Poder público`.

## Capacidades e oportunidades públicas

O tipo `ORGANIZATION` não é suficiente sozinho para liberar licitações. A menor extensão adotada foi `profiles.can_supply_public`, marcada apenas para a organização fornecedora da demonstração. `PERSON` não ganha um novo tipo de conta: a capacidade autônoma existente mais um opt-in local explícito, desligado por padrão inclusive para perfis antigos, determinam o acesso contextual. A interface sempre usa “pode interessar ao seu perfil” e “verifique os requisitos do edital”, sem inferir elegibilidade jurídica.

## Tipos organizacionais e voluntariado

`ORGANIZATION` permanece o tipo técnico para preservar compatibilidade, mas `organization_kind` define a capacidade operacional: `COMPANY` publica CLT/estágio, demandas de serviço, usa talentos e pode descobrir PNCP quando `can_supply_public`; `NONPROFIT` prioriza ações voluntárias e também pode publicar trabalho/serviço e usar talentos; `PUBLIC_INSTITUTION` publica ações voluntárias e gerencia suas próprias inscrições, sem formal, talentos, serviço para hoje ou fornecimento PNCP. As funções de política ficam em `lib/domain.ts` para impedir autorização espalhada em cópias de `capabilities`.

O voluntariado usa uma tabela de participação própria em vez de tratar interesse como simples evento: `INTERESTED → CONFIRMED → PARTICIPATED`. A pessoa não precisa de currículo para participar; somente a organização dona da ação pode confirmar ou registrar participação. Requisitos práticos e orientação institucional são campos explícitos e a copy não usa salário/benefícios.

## Matching explicável

O primeiro matching é determinístico e legível: busca, tags, atividade/categoria, município e preferência selecionada. A explicação aparece como “Por que apareceu para você?” e não usa porcentagens arbitrárias nem IA generativa. Relações entre profissão e capacitação são relações de categoria/interesse, nunca causalidade.

## Perfil demo

A primeira etapa não implementa autenticação. A seleção de uma persona fictícia é persistida no `localStorage` e identificada visualmente como “Perfil de demonstração”. Isso permite demonstrar perspectivas sem criar uma falsa sensação de segurança.

## Territorialidade

O modelo usa UF, município e bairro/região. Para o banco de talentos, a pessoa informa manualmente o município e o Estado onde mora; não há API de mapas, geocodificação, permissão de localização ou coleta de coordenadas. Isso evita chaves e dependências externas e deixa claro que o dado compartilhado é territorial, não um endereço exato. A estrutura de `Location` permite evolução futura sem reescrever oportunidades.

## Observatório Territorial municipal

O Observatório Territorial utiliza o município como principal unidade de exploração espacial. O mapa coroplético usa limites oficiais da Malha Municipal Digital do IBGE, versão 2024, armazenados localmente em uma versão GeoJSON simplificada para web. Ele é permitido porque responde funcionalmente onde a atividade operacional da OFLIX aparece; não é um mapa de calor econômico, não usa geolocalização, não exibe pessoas ou coordenadas individuais e não entra no fluxo operacional comum de `PERSON`.

Antes, mapas não eram necessários para a descoberta operacional e por isso foram evitados. Agora o perfil institucional possui justificativa funcional para cartografia agregada: Sergipe → município → indicadores → atividades → leitura territorial. A ausência de registros OFLIX representa ausência de registros na demonstração, não ausência de empregos ou oportunidades reais. A identificação usa o nome oficial do município e códigos IBGE somente nos municípios do seed que têm correspondência validada; não houve migração ampla de `locations`.

O mapa operacional não incorpora automaticamente cursos, concursos, vagas externas ou sinais de contratação pública. Uma futura camada de “Sinais de contratação pública” deverá usar linguagem de sinal de contratação ou atividade econômica pública, nunca “empregos gerados”.

## UX

A landing é curta. A descoberta usa listas densas e legíveis. Cada frente usa seu próprio verbo de ação. A visão de analista evita nomes e números inventados; seus agregados vêm do seed e das interações.

## Arquitetura de informação: intenção versus identidade

A complexidade crescente do hub não deve ser transferida para um formulário único. Landing, Início, Buscar, Preferências e Perfil têm responsabilidades explícitas: explicar, resumir, explorar, personalizar e descrever a pessoa. Preferências usa progressive disclosure, com uma visão inicial de resumos e somente um grupo detalhado aberto por vez.

Dados que descrevem quem a pessoa é — formação, currículo, residência e publicação no banco de talentos — pertencem ao Perfil. Preferências guardam apenas aquilo que a pessoa deseja acompanhar ou receber na descoberta. A extração preserva as chaves locais existentes (`oflix-talent-bank-profiles`, `oflix-residence-*`, `oflix-talent-bank-visible-*`, preferências e currículo) e não limpa nem renomeia dados antigos.

A Home de pessoa prioriza busca, território, atalhos e recomendações curtas. A Home de organização não copia a experiência de pessoa e mantém publicação, talentos e Serviço para hoje como ações próprias. Os números territoriais são derivados dos itens visíveis da demonstração e são acompanhados da indicação `Dados da demonstração`; não há KPI hardcoded.

## Descoberta da marca

O domínio técnico `oflix-six.vercel.app` é mantido como implantação atual, mas não é tratado como a identidade final da marca. A landing e os metadados usam “OFLIX” e “Sergipe” de forma explícita, com dados estruturados `WebSite` e favicon próprio. Um domínio próprio com OFLIX deve ser registrado e conectado pelo responsável quando houver disponibilidade; a posição para a busca genérica depende do Google e de sinais externos, então não é prometida pelo produto.

## Navegação por objetivo

Em vez de expor listas completas de todos os módulos na home, a demo usa uma home curta e uma navegação contextual por persona. Pessoas recebem Início, Buscar, Serviço hoje, Preferências e Perfil; organizações recebem Início, Buscar, Serviço hoje, Talentos e Perfil. A navegação é uma barra curta no desktop e uma bottom navigation persistente no mobile. `Buscar` reúne os universos permitidos sem misturar suas entidades; publicação, preferências, chamados e banco de talentos continuam sendo os fluxos existentes, apresentados em destinos focados. O analista permanece separado na inteligência territorial para não misturar leitura institucional com operação.

O seletor de Ofertas e Demandas é contextual: aparece apenas em `Empregos` e `Serviços`, onde existe uma distinção operacional entre quem apresenta trabalho e quem contrata. Em `Todos`, cursos, concursos, voluntariado e oportunidades públicas, a ausência do seletor evita sugerir uma semântica de mercado que não se aplica; o estado interno de publicação não filtra esses universos.

A landing usa uma demonstração conceitual de busca transversal e três pilares editoriais — trabalho e oportunidades, desenvolvimento profissional, negócios e poder público — para explicar a proposta sem repetir os mesmos cinco universos em duas grades.

## Mobile first da busca e do detalhe

O campo de busca permanece visível; categoria, território, modalidade formal e favoritos ficam em um grupo recolhível em telas estreitas, com chips para filtros ativos. A ação da oportunidade também fica disponível em uma barra fixa no mobile, preservando a mesma ação contextual do desktop. A mudança é deliberadamente de apresentação e alcance, não de regra de negócio.

## Demonstração de matching e gestão

CLT e Estágio são atributos explícitos de oportunidades formais. Trabalhadores escolhem múltiplas atividades de interesse e recebem destaque local quando há correspondência; organizações visualizam suas ofertas e os perfis que demonstraram interesse em uma base de talentos. Favoritos, preferências e lembretes são locais à demonstração. O chat é intencionalmente um protótipo do fluxo: a organização inicia a conversa, sem transmissão de dados pessoais.

## Desvios e limites

O fluxo de publicação, a base de talentos e o chat foram adicionados como experiências demonstráveis, mas continuam sem autorização, persistência compartilhada, moderação ou entrega de mensagens. O link do Google Agenda usa um template confirmável pelo usuário, sem OAuth. A UI apresenta organizações na descoberta, mas separa gestão, candidatos e oportunidades ofertadas em blocos próprios; a projeção de `Buscar` continua unificada.

## Limites metodológicos do Observatório

Oferta × demanda, lacunas territoriais e capacitação × demanda não são calculadas nesta versão: o modelo persistido atual não sustenta uma relação institucional confiável sem misturar estado local do navegador ou DEMO DATA externo. Esses itens permanecem `PENDENTE`/`FUTURO`. O Observatório entrega contagens de oportunidades e interações, não empregabilidade, desenvolvimento econômico, PIB, desemprego ou escassez de mão de obra.

## Oferta, demanda e banco de talentos

Oferta de trabalho pertence à pessoa que apresenta sua força de trabalho; demanda pertence à empresa, instituição ou outro contratante. O mural aplica essa distinção por perfil: contratantes nunca recebem as demandas de outras organizações. Pessoas podem compartilhar voluntariamente um perfil de talento para que organizações pesquisem ofertas de trabalho, inclusive CLT, estágio, serviços autônomos e voluntariado.

O currículo é livre em PDF ou DOCX, até 5 MB, preservando o nome original e sem análise de conteúdo nesta demo. O legado `curriculumConfirmed` é apenas compatibilidade de leitura e não bloqueia o opt-in; não há limpeza das chaves antigas do `localStorage`. Produção deve validar tipo/tamanho no servidor e usar armazenamento de arquivos com consentimento e controles de acesso.

## Mercado & Conhecimento

`Buscar` continua reservado à descoberta de oportunidades. Salários, legislação e literatura científica pertencem a uma camada complementar denominada `Mercado & Conhecimento`, acessível por entradas contextuais sem transformar esses conteúdos em oportunidades.

Remuneração média anunciada e salário médio de admissão são indicadores diferentes. A primeira é derivada de publicações OFLIX com remuneração estruturada; a segunda é uma estatística oficial do mercado formal segundo fonte e competência informadas. Nunca são combinadas em uma única média.

A remuneração de vaga usa valores numéricos em BRL mensal, com mínimo, máximo opcional e tipo de remuneração. Faixas usam o ponto médio; ausentes são excluídas, nunca convertidas em zero. CLT é exibida como salário e estágio como bolsa/remuneração de estágio. O composer permite não informar remuneração sem bloquear a publicação.

O MTE/PDET foi investigado como fonte oficial prioritária. A aplicação não presume endpoint privado nem faz scraping; como não foi confirmada uma API pública documentada segura nesta execução, a integração oficial permanece indisponível e a UI informa a limitação. Não há números fictícios com rótulo MTE, mapeamento CBO arbitrário ou mapa salarial sem dado municipal sustentado.

## Legislação e artigos

A legislação é editorial e curta: guarda referência, resumo, temas, públicos, data de verificação e link para Planalto. A OFLIX não copia leis integrais nem oferece parecer jurídico. A Reforma Tributária do Consumo é um tópico composto por EC 132/2023, LC 214/2025 e LC 227/2026.

Artigos acadêmicos usam metadata de fonte legítima, inicialmente OpenAlex. A OFLIX recomenda por critérios determinísticos e transparentes — relevância temática, atualidade, citações e acesso aberto — sem inventar trabalhos, sem copiar conteúdo integral e sem usar número de citações como sinônimo de qualidade. A consulta live tem cache curto e fallback para snapshot real com IDs OpenAlex/DOI.
