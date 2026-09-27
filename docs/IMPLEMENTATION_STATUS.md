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
- Chamadas de serviço para o dia, abertas por pessoas ou instituições com atividade, janela e território aproximado; autônomos compatíveis recebem a chamada por polling/alerta do navegador e o primeiro aceite é protegido por atualização condicional no servidor.

## VALIDAÇÃO NECESSÁRIA

- Avaliação com usuários reais de Sergipe sobre linguagem, categorias e utilidade dos indicadores.
- Revisão de acessibilidade automatizada e manual mais abrangente antes de publicação.
- Definição de governança, consentimento e moderação.

## PARCIAL

- Publicação e “Minhas oportunidades” funcionam como fluxo da demonstração; ainda não há persistência real de autoria, edição, moderação ou autorização.
- A seleção de atividades demandadas e o aviso de compatibilidade também são locais da demonstração; ainda não enviam notificações server-side para trabalhadores fora do navegador.
- Perfil, configurações e saída ainda são experiências locais da demonstração; não há sessão, credenciais, persistência de conta ou autorização real.
- Favoritos, atividades e lembretes ficam no `localStorage`; a permissão do navegador é demonstrada, mas não existe push agendado em segundo plano.
- Base de talentos e chat demonstram o próximo passo com dados fictícios, currículo armazenado apenas no `localStorage` da demo, sem autenticação ou canal de mensagens real.
- O diretório opt-in do banco de talentos e as preferências de tipos de trabalho são locais ao navegador da demonstração; a API de interesses já limita o acesso a organizações, mas a publicação do perfil ainda não tem persistência compartilhada nem autorização de produção.
- Chamados de serviço estão persistidos no SQLite da demo e têm disputa de primeiro aceite no endpoint, mas ainda não há push real, contato seguro, endereço exato pós-aceite, expiração automática, pagamento ou operação multi-região de produção.
- Inteligência territorial prova o caminho de dados e o gráfico de empregos; a autorização geral e o recorte por interesse estão implementados na demo, mas ainda não há demanda não atendida nem séries históricas.

## PENDENTE

- Observabilidade contínua e persistência compartilhada de produção.
- Fluxos de cadastro, autenticação real, autorização persistente e recuperação de acesso.
- Criação, edição, revisão e encerramento de oportunidades persistentes.
- Notificações server-side e integração OAuth com Google Agenda.

## FUTURO

- Capacidades múltiplas por perfil.
- Coordenadas opcionais e camadas cartográficas responsáveis.
- Busca territorial, matching, notificações e indicadores evolutivos.

## DESCARTADO

- Microsserviços, backend separado, filas, Kubernetes, geocodificação externa e autenticação externa nesta fase.
