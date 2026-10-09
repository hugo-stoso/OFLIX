# Estado de implementação

## IMPLEMENTADO

- Fase A: perfis de empresa, ONG/OSC e instituição pública fictícia, com políticas centrais de publicação, talentos, Serviço para hoje, voluntariado e descoberta de PNCP.
- Fase A: ações voluntárias com requisitos práticos, quantidade desejada, orientação institucional e ciclo persistido `INTERESTED → CONFIRMED → PARTICIPATED`; confirmação e participação exigem propriedade da organização.
- Fase A: currículo livre em PDF/DOCX de até 5 MB, nome original preservado, sem modelo OFLIX obrigatório; `curriculumConfirmed` legado é ignorado para autorização.

- Aplicação Next.js única com TypeScript e Tailwind.
- Persistência local SQLite via `node:sqlite` e seed DEMO DATA.
- Modelo separado de perfis, território, três frentes e interações.
- Landing, seleção de persona, descoberta, detalhe e navegação principal.
- Ações contextuais funcionais com persistência e feedback de sucesso/duplicidade.
- Observatório Territorial municipal com mapa coroplético SVG dos 75 municípios de Sergipe, derivado da Malha Municipal Digital do IBGE 2024, seleção municipal, métricas operacionais, ranking sincronizado, legenda e painel acessível.
- Documentação permanente e smoke tests do percurso principal.
- Deploy de produção da demo no Vercel com seed DEMO em armazenamento efêmero do runtime.
- Landing revisada com a mensagem de posicionamento do produto.
- Seed ampliado com 14 oportunidades, separação entre CLT e Estágio e descrições mais completas.
- Descoberta com busca, filtros por categoria/município, filtro CLT/Estágio e favoritos locais.
- Preferências de atividades para trabalhadores, com seleção múltipla, pesquisa e ativação de notificações do navegador.
- Área demo de “Enviar oportunidade”, “Minhas oportunidades” e base de talentos com início de conversa pelo demandante.
- Lembretes de voluntariado, link de criação de evento no Google Agenda e gráfico de empregos por região.
- Bloqueio de auto candidatura aplicado na interface e na API.
- Visão territorial geral restrita ao Observatório Território Aberto (demonstração), com recorte territorial de vagas/serviços por atividades de interesse para pessoas.
- Organizações podem publicar, na demonstração, demandas de serviços autônomos com múltiplas atividades selecionadas; essas atividades aparecem na oportunidade e alimentam o destaque de alertas compatíveis para trabalhadores no mesmo navegador.
- Menu de conta funcional no cabeçalho, com Meu perfil, Configurações e Sair; perfil detalhado com resumo, tipo, competências e território demonstrativo.
- Descoberta separada entre Ofertas de trabalho publicadas por pessoas e Demandas de trabalho publicadas por contratantes; organizações veem apenas suas próprias demandas, além das ofertas de pessoas.
- Banco de talentos com compartilhamento opcional, escolaridade, tipo de curso, especialização/pós-graduação e download do currículo original em PDF/DOCX disponível para contratantes.
- Banco de talentos opt-in para pessoas interessadas em CLT, estágio, serviços autônomos e/ou voluntariado; organizações permitidas podem pesquisar perfis compartilhados sem restringir pela distância e iniciar conversa sobre próximos passos.
- Banco de talentos permite informar manualmente município e Estado de moradia, deixa esse dado explícito para contratantes e não solicita acesso à localização, ao Google Maps ou a coordenadas.
- Chamadas de serviço para o dia, abertas por pessoas ou instituições com atividade, janela e território aproximado; autônomos compatíveis recebem a chamada por polling/alerta do navegador e o primeiro aceite é protegido por atualização condicional no servidor.
- Navegação da conta reorganizada por objetivos: pessoa usa Início, Buscar, Serviço para hoje, Preferências e Perfil; empresa usa Talentos; ONG/OSC usa Pessoas; instituição pública usa Voluntários; no mobile os destinos ficam em bottom navigation e no desktop em uma barra curta.
- Preferências de trabalho agora separam frentes (CLT, estágio, serviços autônomos e voluntariado), atividades autônomas com pesquisa e seleção múltipla e interesses de voluntariado com pesquisa e seleção múltipla.
- Home demo contextual por persona, com ação principal, localização, oportunidades em destaque e acesso curto aos fluxos existentes.
- Navegação principal responsiva com cinco destinos contextuais: pessoa (Início, Buscar, Serviço hoje, Preferências, Perfil), empresa (Início, Buscar, Serviço hoje, Talentos, Perfil), ONG/OSC (Início, Buscar, Serviço hoje, Pessoas, Perfil) e instituição pública (Início, Ações, Voluntários, Perfil); analista permanece em sua visão territorial dedicada.
- Busca reorganizada com campo dominante, alternância simples entre ofertas e demandas, filtros ativos visíveis e filtros secundários recolhidos no mobile.
- Detalhe da oportunidade com ação contextual persistente em barra fixa no mobile; landing sem overflow horizontal em 390 px.
- Smoke tests Playwright cobrem a navegação principal e são executados em desktop 1440×900 e mobile 390×844; a validação desta rodada registra o resultado no relatório final.
- SEO técnico da aplicação com metadata canonical/Open Graph, `robots.txt` e `sitemap.xml` para a publicação pública.
- SEO de marca reforçado com título e descrição “OFLIX · Sergipe”, dados estruturados `WebSite`, favicon próprio e copy textual explícita na landing.
- Hub de descoberta unificado com `DiscoveryItem`, chips para trabalho, serviços, voluntariado, concursos, capacitação e poder público quando permitido, com relação determinística por profissão e detalhe DEMO DATA; a semântica das origens permanece separada.
- Preferências ampliadas para concursos públicos, processos seletivos e cursos/capacitação, sem formulário separado por módulo.
- Capacidade `canSupplyPublic` no perfil demo, com acesso contextual a oportunidades públicas para organização fornecedora e pessoa autônoma opt-in.
- Proveniência visível, rotas de detalhe para itens DEMO DATA e estados de fonte com fallback.
- Adapter server-side PNCP preparado com consulta pública oficial, timeout, cache curto, normalização e deduplicação conservadora; a UI só consulta no contexto público elegível e oferece nova tentativa sem expor detalhes técnicos do conector.
- Revisão de arquitetura de informação implementada: landing explica o hub; Home resume o recorte contextual; Buscar permanece a descoberta completa; Preferências guarda intenção; Perfil concentra identidade profissional.
- Preferências refatoradas para progressive disclosure com resumo de Trabalho, Desenvolvimento profissional, Áreas e atividades, Voluntariado, Poder público quando elegível, território e avisos; formação, currículo e banco de talentos não aparecem na visão inicial.
- Formação, currículo, visibilidade do banco de talentos e residência movidos para grupos progressivos em Perfil, usando os helpers compartilhados de `lib/profile-storage.ts` e preservando as chaves locais existentes.
- Home de pessoa recebeu busca principal, Mercado & Conhecimento logo após a busca, resumo territorial derivado dos `DiscoveryItem` visíveis, atalhos para Trabalho/Serviços/Concursos/Capacitação/Voluntariado, recomendações limitadas e teaser de Serviço para hoje; Home de organização ficou separada, publica sob demanda e apresenta Mercado & Conhecimento logo após as ações principais.
- Landing pública ampliada com “O que você encontra”, “Para quem”, “Como funciona”, inteligência territorial, Sergipe e CTA final, sem números inventados ou associação oficial.
- Refinamento cirúrgico de UX implementado: hero público com busca transversal conceitual, três pilares sem repetição, copy de públicos revisada, atalhos compactos no mobile, contagem territorial com pluralização correta, estados de Serviço para hoje por papel e bloco “Minhas oportunidades” visível antes do composer da organização.
- Oferta/Demanda agora é contextual aos universos de mercado (`Empregos` e `Serviços`); fica oculto em `Todos`, `Voluntariado`, `Concursos`, `Capacitação` e demais universos sem semântica operacional de mercado.
- Ranking de descoberta passou a dar pesos determinísticos para preferências de cursos, concursos, CLT, estágio, serviços autônomos e voluntariado.
- Smoke tests Playwright ampliados para landing, busca da Home, contagem territorial derivada, atalhos do hub, Preferências progressivas e preservação do Banco de talentos.
- Publicação pública em `https://oflix-six.vercel.app`: IMPLEMENTADO e validado após esta evolução; o build publicado exibe o hero transversal, os três pilares editoriais e a copy revisada da landing.
- Superfície `Mercado & Conhecimento` em `/market`, acessível cedo na Home por três links diretos de salários, legislação e artigos, no menu persistente da persona, no Observatório, no detalhe de vaga e no detalhe de voluntariado, sem sexto destino na navegação principal; copy de entrada diferencia pessoa, empresa, ONG/OSC e instituição pública.
- Remuneração estruturada de vagas formais com mínimo, máximo opcional, BRL, mensalidade e tipo `SALARY`/`INTERNSHIP_STIPEND`; seed DEMO com valor exato, faixa, vaga sem remuneração e bolsas.
- Composer de organização com CLT/Estágio, não informar, valor exato ou faixa; validação positiva e persistência no SQLite via `POST /api/opportunities`.
- Busca e detalhe exibem remuneração anunciada de forma discreta, distinguem salário de bolsa e oferecem comparação contextual com o mercado.
- Média anunciada calculada por domínio usando ponto médio de faixas, exclusão de ausentes, município/categoria OFLIX, observações e metodologia explícita.
- Biblioteca editorial de legislação com fichas curtas, links Planalto verificados em 05/10/2026, Reforma Tributária do Consumo composta por EC 132/2023, LC 214/2025 e LC 227/2026 e disclaimer informativo.
- Adapter OpenAlex com normalização de ID, título, autores, ano, fonte, DOI, citações, acesso aberto, cache curto, ranking determinístico, busca livre por `q` e snapshot local de metadata real; nenhum artigo fictício ou PDF é armazenado.
- Refinamento cirúrgico: instituição pública abre uma gestão própria de voluntários; ONG/OSC reúne Voluntários e Talentos em Pessoas, com Voluntários como aba inicial; empresa permanece focada em Talentos. A Home da ONG/OSC prioriza mobilização e ação voluntária.
- Refinamento cirúrgico: comparação de mercado preserva município + categoria OFLIX; `profession` continua reservado à futura consulta oficial por ocupação/CBO; estágio e contratação pública têm links contextuais para legislação.
- Domínio de descoberta ampliado com `GO_SERGIPE`, disponibilidade PcD explícita, ocupação somente quando fornecida pela fonte e campos de remuneração/vagas preservados sem inferência.
- Parser server-side do endpoint público estruturado usado pela SPA do GO Sergipe, contrato `GET /api/external-jobs`, allowlist, cache/fallback/stale, filtros locais, proveniência `GO Sergipe`, CTA externo, fixtures JSON/HTML e testes de parser/paginação/deduplicação/erro implementados.
- GO Sergipe: `IMPLEMENTADO` no deploy público `https://oflix-six.vercel.app`, com `GO_SERGIPE_ENABLED=true` em Production, HTTP 200 em `/api/external-jobs?source=go-sergipe`, 156 itens, 13 páginas, 156 URLs de detalhe válidas e QA publicado desktop/mobile; organizações não requisitam nem exibem essa fonte em “Minhas oportunidades”.

## VALIDAÇÃO NECESSÁRIA

- Avaliação com usuários reais de Sergipe sobre linguagem, categorias e utilidade dos indicadores.
- Revisão de acessibilidade automatizada e manual mais abrangente antes de publicação.
- Definição de governança, consentimento e moderação.
- GO Sergipe: observabilidade contínua e eventual mudança do contrato da fonte; o check live e o deploy publicado validaram 156 anúncios, 13 páginas e 156 IDs únicos em 09/10/2026. `GO_SERGIPE_ENABLED=false` continua disponível como desligamento explícito.

## PARCIAL

- Concursos, processos seletivos, cursos e contratações públicas continuam DEMO DATA.
- O adapter PNCP está implementado e isolado, mas a disponibilidade e o comportamento da API em cada ambiente de deploy ainda precisam de validação operacional contínua; o fallback DEMO DATA é o estado determinístico padrão.
- A deduplicação existe na normalização em memória por fonte/identificador e sinais conservadores; ainda não há agrupamento persistido nem histórico de decisões.
- `Salário médio de admissão` MTE/PDET: PARCIAL. A fonte oficial foi investigada e a arquitetura/proveniência/estado indisponível estão implementados, mas nenhum valor oficial real foi integrado nesta execução por falta de canal público documentado confirmado.
- Mapa salarial municipal do Observatório: PENDENTE. Não há dados oficiais municipais/ocupacionais integrados suficientes; o mapa operacional continua somente OFLIX.
- Favoritos e alertas continuam focados nas entidades operacionais locais; a extensão para todos os `DiscoveryItem` é uma pendência de baixo risco.

- Publicação e “Minhas oportunidades” funcionam como fluxo da demonstração; ainda não há persistência real de autoria, edição, moderação ou autorização.
- A seleção de atividades demandadas e o aviso de compatibilidade também são locais da demonstração; ainda não enviam notificações server-side para trabalhadores fora do navegador.
- As categorias de atividades autônomas e interesses voluntários são listas controladas da demo; ainda não há taxonomia administrável nem matching server-side entre preferências e novas publicações.
- Perfil, configurações e saída ainda são experiências locais da demonstração; não há sessão, credenciais, persistência de conta ou autorização real.
- Favoritos, atividades e lembretes ficam no `localStorage`; a permissão do navegador é demonstrada, mas não existe push agendado em segundo plano.
- Base de talentos e chat demonstram o próximo passo com dados fictícios, currículo armazenado apenas no `localStorage` da demo, sem autenticação ou canal de mensagens real.
- O diretório opt-in do banco de talentos e as preferências de tipos de trabalho são locais ao navegador da demonstração; a API de interesses já limita o acesso a organizações, mas a publicação do perfil ainda não tem persistência compartilhada nem autorização de produção. Na ONG/OSC, a aba Talentos continua representando contratação profissional; a aba Voluntários usa a gestão de participantes.
- Município e Estado informados no perfil são dados locais da demonstração; ainda não há validação cadastral, persistência compartilhada ou autorização de produção para esse dado.
- Chamados de serviço estão persistidos no SQLite da demo e têm disputa de primeiro aceite no endpoint, mas ainda não há push real, contato seguro, endereço exato pós-aceite, expiração automática, pagamento ou operação multi-região de produção.
- Inteligência territorial municipal prova o caminho de dados, o mapa e o gráfico de empregos; a autorização geral e o recorte por interesse estão implementados na demo, mas ainda não há demanda não atendida nem séries históricas.

## PENDENTE

- Observabilidade contínua e persistência compartilhada de produção.
- Fluxos de cadastro, autenticação real, autorização persistente e recuperação de acesso.
- Criação, edição, revisão e encerramento de oportunidades persistentes.
- Notificações server-side e integração OAuth com Google Agenda.
- Canal oficial/autorização para ComprasNet.SE; a ausência é intencional e não há scraping.
- Cursos e concursos reais ainda precisam de suas próprias fontes.
- Oferta × demanda, lacunas territoriais e capacitação × demanda: o modelo atual não sustenta conclusões institucionais sem inventar método ou misturar dados locais; permanecem pendentes.

## FUTURO

- Capacidades múltiplas por perfil.
- Coordenadas opcionais e camadas cartográficas responsáveis.
- Busca territorial, matching, notificações e indicadores evolutivos.
- Sinais externos autorizados no mapa, separados das métricas operacionais OFLIX.

## DESCARTADO

- Microsserviços, backend separado, filas, Kubernetes, geocodificação externa e autenticação externa nesta fase.
