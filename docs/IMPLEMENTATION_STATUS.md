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

## VALIDAÇÃO NECESSÁRIA

- Avaliação com usuários reais de Sergipe sobre linguagem, categorias e utilidade dos indicadores.
- Revisão de acessibilidade automatizada e manual mais abrangente antes de publicação.
- Definição de governança, consentimento e moderação.

## PARCIAL

- Publicação e “Minhas oportunidades” funcionam como fluxo da demonstração; ainda não há persistência real de autoria, edição, moderação ou autorização.
- Favoritos, atividades e lembretes ficam no `localStorage`; a permissão do navegador é demonstrada, mas não existe push agendado em segundo plano.
- Base de talentos e chat demonstram o próximo passo com dados fictícios, sem currículo completo, autenticação ou canal de mensagens real.
- Inteligência territorial prova o caminho de dados e o gráfico de empregos, mas ainda não modela demanda não atendida nem séries históricas.

## PENDENTE

- Observabilidade contínua e persistência compartilhada de produção.
- Fluxos de cadastro, autenticação e recuperação de acesso.
- Criação, edição, revisão e encerramento de oportunidades persistentes.
- Notificações server-side e integração OAuth com Google Agenda.

## FUTURO

- Capacidades múltiplas por perfil.
- Coordenadas opcionais e camadas cartográficas responsáveis.
- Busca territorial, matching, notificações e indicadores evolutivos.

## DESCARTADO

- Microsserviços, backend separado, filas, Kubernetes, geocodificação externa e autenticação externa nesta fase.
