# Estado de implementação

## IMPLEMENTADO

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
- Banco de talentos com compartilhamento opcional, escolaridade, tipo de curso, especialização/pós-graduação, download do modelo de currículo e anexo `.docx` disponível para contratantes.
- Banco de talentos opt-in para pessoas interessadas em CLT, estágio, serviços autônomos e/ou voluntariado; organizações podem pesquisar perfis compartilhados sem restringir pela distância e iniciar conversa sobre remuneração, benefícios e próximos passos.
- Banco de talentos permite informar manualmente município e Estado de moradia, deixa esse dado explícito para contratantes e não solicita acesso à localização, ao Google Maps ou a coordenadas.
- Chamadas de serviço para o dia, abertas por pessoas ou instituições com atividade, janela e território aproximado; autônomos compatíveis recebem a chamada por polling/alerta do navegador e o primeiro aceite é protegido por atualização condicional no servidor.
- Navegação da conta reorganizada por objetivos, com Início, Buscar, Serviço para hoje, Preferências ou Talentos e Perfil; no mobile os destinos ficam em bottom navigation e no desktop em uma barra curta.
- Preferências de trabalho agora separam frentes (CLT, estágio, serviços autônomos e voluntariado), atividades autônomas com pesquisa e seleção múltipla e interesses de voluntariado com pesquisa e seleção múltipla.
- Home demo contextual por persona, com ação principal, localização, oportunidades em destaque e acesso curto aos fluxos existentes.
- Navegação principal responsiva com cinco destinos: pessoa (Início, Buscar, Serviço hoje, Preferências, Perfil) e organização (Início, Buscar, Serviço hoje, Talentos, Perfil); analista permanece em sua visão territorial dedicada.
- Busca reorganizada com campo dominante, alternância simples entre ofertas e demandas, filtros ativos visíveis e filtros secundários recolhidos no mobile.
- Detalhe da oportunidade com ação contextual persistente em barra fixa no mobile; landing sem overflow horizontal em 390 px.
- Smoke tests Playwright atualizados para cobrir a navegação principal e executados em desktop 1440×900 e mobile 390×844; a última validação no build de produção passou 48/48 cenários.
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
- Home de pessoa recebeu busca principal, resumo territorial derivado dos `DiscoveryItem` visíveis, atalhos para Trabalho/Serviços/Concursos/Capacitação/Voluntariado, recomendações limitadas e teaser de Serviço para hoje; Home de organização ficou separada e publica sob demanda.
- Landing pública ampliada com “O que você encontra”, “Para quem”, “Como funciona”, inteligência territorial, Sergipe e CTA final, sem números inventados ou associação oficial.
- Refinamento cirúrgico de UX implementado: hero público com busca transversal conceitual, três pilares sem repetição, copy de públicos revisada, atalhos compactos no mobile, contagem territorial com pluralização correta, estados de Serviço para hoje por papel e bloco “Minhas oportunidades” visível antes do composer da organização.
- Oferta/Demanda agora é contextual aos universos de mercado (`Empregos` e `Serviços`); fica oculto em `Todos`, `Voluntariado`, `Concursos`, `Capacitação` e demais universos sem semântica operacional de mercado.
- Ranking de descoberta passou a dar pesos determinísticos para preferências de cursos, concursos, CLT, estágio, serviços autônomos e voluntariado.
- Smoke tests Playwright ampliados para landing, busca da Home, contagem territorial derivada, atalhos do hub, Preferências progressivas e preservação do Banco de talentos.
- Publicação pública em `https://oflix-six.vercel.app`: IMPLEMENTADO e validado após esta evolução; o build publicado exibe o hero transversal, os três pilares editoriais e a copy revisada da landing.

## VALIDAÇÃO NECESSÁRIA

- Avaliação com usuários reais de Sergipe sobre linguagem, categorias e utilidade dos indicadores.
- Revisão de acessibilidade automatizada e manual mais abrangente antes de publicação.
- Definição de governança, consentimento e moderação.

## PARCIAL

- Concursos, processos seletivos, cursos, vagas externas e contratações públicas estão implementados como DEMO DATA para provar a experiência; ainda não há fontes reais legítimas integradas para esses universos. A frente permanece PARCIAL/VALIDAÇÃO NECESSÁRIA.
- O adapter PNCP está implementado e isolado, mas a disponibilidade e o comportamento da API em cada ambiente de deploy ainda precisam de validação operacional contínua; o fallback DEMO DATA é o estado determinístico padrão.
- A deduplicação existe na normalização em memória por fonte/identificador e sinais conservadores; ainda não há agrupamento persistido nem histórico de decisões.
- Favoritos e alertas continuam focados nas entidades operacionais locais; a extensão para todos os `DiscoveryItem` é uma pendência de baixo risco.

- Publicação e “Minhas oportunidades” funcionam como fluxo da demonstração; ainda não há persistência real de autoria, edição, moderação ou autorização.
- A seleção de atividades demandadas e o aviso de compatibilidade também são locais da demonstração; ainda não enviam notificações server-side para trabalhadores fora do navegador.
- As categorias de atividades autônomas e interesses voluntários são listas controladas da demo; ainda não há taxonomia administrável nem matching server-side entre preferências e novas publicações.
- Perfil, configurações e saída ainda são experiências locais da demonstração; não há sessão, credenciais, persistência de conta ou autorização real.
- Favoritos, atividades e lembretes ficam no `localStorage`; a permissão do navegador é demonstrada, mas não existe push agendado em segundo plano.
- Base de talentos e chat demonstram o próximo passo com dados fictícios, currículo armazenado apenas no `localStorage` da demo, sem autenticação ou canal de mensagens real.
- O diretório opt-in do banco de talentos e as preferências de tipos de trabalho são locais ao navegador da demonstração; a API de interesses já limita o acesso a organizações, mas a publicação do perfil ainda não tem persistência compartilhada nem autorização de produção.
- Município e Estado informados no perfil são dados locais da demonstração; ainda não há validação cadastral, persistência compartilhada ou autorização de produção para esse dado.
- Chamados de serviço estão persistidos no SQLite da demo e têm disputa de primeiro aceite no endpoint, mas ainda não há push real, contato seguro, endereço exato pós-aceite, expiração automática, pagamento ou operação multi-região de produção.
- Inteligência territorial municipal prova o caminho de dados, o mapa e o gráfico de empregos; a autorização geral e o recorte por interesse estão implementados na demo, mas ainda não há demanda não atendida nem séries históricas.

## PENDENTE

- Observabilidade contínua e persistência compartilhada de produção.
- Fluxos de cadastro, autenticação real, autorização persistente e recuperação de acesso.
- Criação, edição, revisão e encerramento de oportunidades persistentes.
- Notificações server-side e integração OAuth com Google Agenda.
- Canal oficial/autorização para ComprasNet.SE; a ausência é intencional e não há scraping.
- Primeira fonte autorizada de vagas externas, cursos ou concursos reais.
- Oferta × demanda, lacunas territoriais e capacitação × demanda: o modelo atual não sustenta conclusões institucionais sem inventar método ou misturar dados locais; permanecem pendentes.

## FUTURO

- Capacidades múltiplas por perfil.
- Coordenadas opcionais e camadas cartográficas responsáveis.
- Busca territorial, matching, notificações e indicadores evolutivos.
- Sinais externos autorizados no mapa, separados das métricas operacionais OFLIX.

## DESCARTADO

- Microsserviços, backend separado, filas, Kubernetes, geocodificação externa e autenticação externa nesta fase.
