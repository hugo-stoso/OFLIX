# Estado de implementação

## IMPLEMENTADO

- Aplicação Next.js única com TypeScript e Tailwind.
- Persistência local SQLite via `node:sqlite` e seed DEMO DATA.
- Modelo separado de perfis, território, três frentes e interações.
- Landing, seleção de persona, descoberta, detalhe e navegação principal.
- Ações contextuais funcionais com persistência e feedback de sucesso/duplicidade.
- Visão territorial inicial derivada de dados operacionais.
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
- Smoke tests Playwright atualizados para cobrir a navegação principal e executados em desktop 1440×900 e mobile 390×844.
- SEO técnico da aplicação com metadata canonical/Open Graph, `robots.txt` e `sitemap.xml` para a publicação pública.
- SEO de marca reforçado com título e descrição “OFLIX · Sergipe”, dados estruturados `WebSite`, favicon próprio e copy textual explícita na landing.
- Hub de descoberta com `DiscoveryItem`, busca operacional restrita a trabalho/serviços e blocos próprios para formação, caminhos públicos e poder público, com relação determinística por profissão e detalhe DEMO DATA.
- Preferências ampliadas para concursos públicos, processos seletivos e cursos/capacitação, sem formulário separado por módulo.
- Capacidade `canSupplyPublic` no perfil demo, com acesso contextual a oportunidades públicas para organização fornecedora e pessoa autônoma opt-in.
- Proveniência visível, rotas de detalhe para itens DEMO DATA e estados de fonte com fallback.
- Adapter server-side PNCP preparado com consulta pública oficial, timeout, cache curto, normalização e deduplicação conservadora; a UI só atualiza ao vivo por ação explícita.
- Deploy público da demo validado no Vercel em `https://oflix-six.vercel.app`, com atualização automática a partir da branch `main`.

## VALIDAÇÃO NECESSÁRIA

- Avaliação com usuários reais de Sergipe sobre linguagem, categorias e utilidade dos indicadores.
- Revisão de acessibilidade automatizada e manual mais abrangente antes de publicação.
- Definição de governança, consentimento e moderação.

## PARCIAL

- Concursos, processos seletivos, cursos, vagas externas e contratações públicas estão implementados como DEMO DATA para provar a experiência; ainda não há fontes reais legítimas integradas para esses universos.
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
- Inteligência territorial prova o caminho de dados e o gráfico de empregos; a autorização geral e o recorte por interesse estão implementados na demo, mas ainda não há demanda não atendida nem séries históricas.

## PENDENTE

- Observabilidade contínua e persistência compartilhada de produção.
- Fluxos de cadastro, autenticação real, autorização persistente e recuperação de acesso.
- Criação, edição, revisão e encerramento de oportunidades persistentes.
- Notificações server-side e integração OAuth com Google Agenda.
- Canal oficial/autorização para ComprasNet.SE; a ausência é intencional e não há scraping.
- Primeira fonte autorizada de vagas externas, cursos ou concursos reais.

## FUTURO

- Capacidades múltiplas por perfil.
- Coordenadas opcionais e camadas cartográficas responsáveis.
- Busca territorial, matching, notificações e indicadores evolutivos.

## DESCARTADO

- Microsserviços, backend separado, filas, Kubernetes, geocodificação externa e autenticação externa nesta fase.
