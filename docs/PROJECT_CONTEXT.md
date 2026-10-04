# Contexto de produto

## Visão

OFLIX é um hub territorial de oportunidades e desenvolvimento profissional para Sergipe. Integra as três frentes originais — trabalho formal, serviços autônomos e ações voluntárias — e organiza, sem misturar seus modelos semânticos, capacitação, concursos/processos seletivos públicos, vagas externas autorizadas e oportunidades econômicas com o poder público.

## Problema e proposta de valor

As três frentes de trabalho normalmente ficam dispersas. O OFLIX propõe um ponto de encontro territorial para descoberta e conexão, com potencial de gerar uma leitura agregada e anonimizada da oferta, das interações e das demandas não atendidas.

## Públicos e perfis

- `PERSON`: pessoa que pode futuramente atuar como candidata formal, profissional autônoma ou voluntária.
- `ORGANIZATION`: empresa, instituição pública ou organização sem fins lucrativos, conforme suas capacidades.
- `INSTITUTIONAL_ANALYST`: uso orientado a inteligência territorial por gestão pública, ensino ou pesquisa.
- Organizações podem ou não ter a capacidade demonstrativa `canSupplyPublic`; somente fornecedoras acessam oportunidades de contratação pública.
- Pessoas continuam sendo `PERSON`; a atuação autônoma é uma capacidade/interesse, não uma nova conta. O acesso a oportunidades públicas para pessoa autônoma é opt-in local na demonstração.

## Jornadas identificadas

1. Uma pessoa entra, escolhe seu perfil demo, descobre uma vaga/serviço/ação e registra uma interação.
2. Uma organização apresenta oportunidades e observa a possibilidade de conexão local.
3. Um analista visualiza somente agregados territoriais derivados da operação.

## Arquitetura de informação

As superfícies da demo respondem a perguntas diferentes: a landing explica o hub; Início resume o que existe para o perfil agora; Buscar revela a descoberta completa; Preferências registra a intenção de acompanhamento; Perfil concentra a identidade profissional. A organização também mantém uma experiência própria de publicação, talentos e serviço para hoje, sem receber os formulários de pessoa.

Dados que descrevem quem a pessoa é — formação, currículo, residência e publicação no banco de talentos — pertencem ao Perfil. Preferências guardam apenas aquilo que a pessoa deseja acompanhar ou receber na descoberta.

## Territorialidade

A localização suporta UF, município e bairro/região. O Observatório institucional agora usa cartografia agregada por município, sem coordenada exata, geocodificação, localização do usuário ou APIs de mapas. A malha local vem da Malha Municipal Digital do IBGE, versão 2024, somente para Sergipe.

## Inteligência territorial

O ciclo demonstrado é: atividade na plataforma → conexão entre oferta e demanda → geração de dados → inteligência territorial. O Observatório começa em Sergipe, permite selecionar um município e responde com indicadores, atividades e detalhes agregados daquele recorte. Os indicadores não expõem nomes ou dados pessoais; município sem registro permanece neutro e não deve ser lido como ausência de atividade econômica real.

## Escopo da demo

Landing, perfis fictícios persistidos durante a navegação, hub de descoberta unificado em `Buscar`, detalhe contextual, `Interaction` funcional, preferências ampliadas e Observatório Territorial municipal. A projeção de descoberta reúne os universos permitidos para cada perfil; as entidades e regras semânticas continuam separadas na origem. O hub público usa DEMO DATA por padrão e disponibiliza um adapter server-side contextual para consulta pública do PNCP. O mapa principal não mistura sinais externos, cursos, concursos ou vagas externas nas métricas operacionais.

## Fontes e proveniência

Itens originados na OFLIX continuam separados de sinais externos. Cada item externo expõe fonte, identificador quando disponível, URL canônica, datas e status. A demo não trata dados fictícios como publicação real: cursos, concursos, processos seletivos, vagas externas e contratações de exemplo são rotulados `DEMO DATA`. O PNCP é o único provider externo com adapter preparado nesta execução; ComprasNet.SE, vagas, cursos e concursos reais aguardam canal autorizado.

## Escopo futuro

Autenticação real, publicação e gestão de oportunidades, ingestão real de fontes autorizadas, busca avançada, deduplicação persistida, matching explicável server-side, demandas não atendidas, evolução para coordenadas e análises territoriais mais completas.

## Não objetivos desta fase

Não são objetivos: autenticação de produção, pagamentos, ingestão de fontes externas não autorizadas, geocodificação, backend separado, microsserviços, dados reais de pessoas, GIS complexo ou uma série histórica definitiva. O mapa é permitido apenas no Observatório institucional e não representa localização individual.

## Questões abertas

- Quais regras de moderação e verificação serão necessárias?
- Como consentimento, governança e anonimização serão formalizados?
- Quais recortes territoriais e indicadores são mais úteis para cada instituição?
- Como o fluxo de publicação será revisado antes de entrar em produção?
