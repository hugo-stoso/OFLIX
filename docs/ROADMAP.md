# Roadmap

## Demo

- [x] Landing e entrada na demonstração.
- [x] Personas fictícias persistentes durante a navegação.
- [x] Descoberta de trabalho formal, serviços e voluntariado.
- [x] Detalhes e interações persistidas.
- [x] Agregados territoriais iniciais.
- [x] Separação de CLT e Estágio, filtros e favoritos locais.
- [x] Preferências de atividades e lembretes de voluntariado com template do Google Agenda.
- [x] Área demo de publicação, minhas oportunidades, base de talentos e conversa iniciada pelo demandante.
- [x] Gráfico de empregos formais por região.
- [x] Separação semântica entre oferta de pessoas e demanda de contratantes, com isolamento das demandas entre organizações.
- [x] Filtros de banco de talentos por escolaridade e tipo de curso, além de currículo livre em PDF/DOCX.
- [x] Navegação horizontal por tarefa e preferências ampliadas para atividades autônomas e interesses de voluntariado.
- [x] Reforço de SEO de marca com metadata, dados estruturados, favicon e mensagem explícita de OFLIX em Sergipe.
- [x] Camada de descoberta unificada sem apagar a semântica das três frentes originais.
- [x] Hub `Buscar` com filtros contextuais, recomendações mistas na home e retorno preservado ao detalhe.
- [x] Preferências demonstrativas para concursos, processos seletivos e cursos/capacitação.
- [x] Proveniência explícita e DEMO DATA para fontes ainda não autorizadas.
- [x] Capacidades demonstrativas para separar organização fornecedora, organização não fornecedora e pessoa autônoma opt-in.
- [x] Landing pública reposicionada como hub territorial, com seções de descoberta, públicos, funcionamento, inteligência e Sergipe.
- [x] Home de pessoa com busca principal, resumo territorial derivado, atalhos para universos, recomendações curtas e teasers contextuais.
- [x] Home de organização separada da Home de pessoa, com publicação sob demanda, talentos e Serviço para hoje.
- [x] Refinamento de UX da descoberta: hero transversal, pilares editoriais, atalhos mobile compactos, estados por papel e seletor de Oferta/Demanda contextual ao mercado.
- [x] Preferências reorganizadas por progressive disclosure; formação, currículo, banco de talentos e território movidos para o Perfil sem limpar `localStorage`.
- [x] Perfil de pessoa organizado em resumo profissional, formação, currículo, banco de talentos e território.
- [x] Observatório Territorial municipal com malha oficial IBGE 2024 de Sergipe, GeoJSON local simplificado, mapa SVG acessível, métricas operacionais, seleção municipal, ranking sincronizado, legenda e painel de município sem registros.
- [x] Camada `Mercado & Conhecimento` com remuneração anunciada estruturada, legislação editorial oficial e artigos reais via OpenAlex com fallback metadata.
- [x] Composer de vagas formais com CLT/Estágio, salário/bolsa, valor exato/faixa/não informar, validação e persistência demo.
- [x] Agregação SQL municipal com oportunidades, CLT, estágio, serviços, voluntariado, interações e categorias; API geral permanece restrita ao perfil analista.
- [x] Tipos de organização (`COMPANY`, `NONPROFIT`, `PUBLIC_INSTITUTION`) com políticas centrais e persona de instituição pública fictícia.
- [x] Ações voluntárias para ONG/OSC e instituição pública, com requisitos, orientação, inscrições persistidas e ciclo `INTERESTED → CONFIRMED → PARTICIPATED` com ownership.
- [x] Currículo livre em PDF/DOCX até 5 MB, preservando nome original e sem modelo obrigatório.
- [x] Navegação organizacional contextual: empresa em Talentos, ONG/OSC em Pessoas com Voluntários + Talentos e instituição pública em Voluntários para gestão de participantes.
- [x] Mercado & Conhecimento com comparação por município + categoria OFLIX, legislação contextual e busca livre de artigos por macrotema + `q`.
- [x] Mercado & Conhecimento reposicionado cedo nas Homes, com copy por persona, três atalhos diretos e acesso persistente no menu sem sexto destino principal.
- [x] Primeira integração real de fonte pública externa do GO Sergipe: endpoint estruturado usado pela SPA, parser server-side com allowlist, proveniência, CTA, cache/fallback, filtro municipal, deduplicação e testes.
- [x] Integração multifontes pública de empregos: EmpregAju por HTML paginado e IEL Sergipe pela listagem HTML pública, contrato normalizado, flags independentes, cache/fallback, deduplicação, filtros independentes de origem/fonte com contagens e URL compartilhável, filtros combináveis de contratação/salário/data/PcD e isolamento de organizações.

## MVP

- [ ] Autenticação e autorização reais.
- [ ] Capacidades configuráveis por perfil.
- [ ] Publicação, edição, moderação e encerramento de oportunidades persistentes.
- [ ] Busca, filtros e estados de demanda com autorização real.
- [ ] Governança de dados, consentimento e políticas de retenção.
- [ ] Armazenamento seguro e compartilhado de currículos, com validação server-side de PDF/DOCX e download autorizado.
- [ ] Validar operação do provider PNCP em produção, observar limites e persistir cache/última atualização conforme a infraestrutura existente permitir.
- [x] Validar o deploy público do GO Sergipe: `/api/external-jobs` com vagas, CTA de detalhe correto e QA visual desktop/mobile após o push em 09/10/2026.
- [ ] Integrar cursos e concursos somente após confirmar API, feed, licença ou autorização oficial.
- [ ] Revalidar periodicamente o HTML do EmpregAju e do IEL; ampliar a paginação do IEL somente quando existir canal público permitido.
- [ ] Integrar Vagas Sergipe, Oficial News, BNE ou Gupy apenas após confirmar canal público estruturado, escopo Sergipe e permissão compatível.
- [ ] Integrar dados oficiais MTE/PDET com canal público documentado, competência, CBO, município e metodologia; sem inventar dados enquanto a fonte não estiver disponível.

## Pós-MVP

- [ ] Registrar e conectar domínio próprio da marca, caso esteja disponível, e acompanhar indexação no Google Search Console.
- [ ] Matching e notificações responsáveis com entrega server-side.
- [ ] OAuth e criação confirmada de eventos no Google Agenda.
- [ ] Coordenadas opcionais e recortes territoriais configuráveis, somente após governança; o mapa municipal agregado do Observatório já está implementado sem coordenadas.
- [ ] Indicadores de demanda não atendida e séries históricas.
- [ ] Integração com instituições parceiras após validação de governança.
- [ ] Sinais externos autorizados no Observatório, separados da operação OFLIX e com linguagem de sinal de contratação pública.
- [ ] Oferta × demanda, lacunas territoriais e capacitação × demanda após modelo de dados institucional e metodologia revisada.
- [ ] Habilitar mapa salarial do Observatório apenas quando houver dados oficiais municipais por ocupação e uma seleção de CBO determinística.
- [ ] Ampliar a curadoria acadêmica e revisar periodicamente o snapshot OpenAlex sem persistir textos integrais.
