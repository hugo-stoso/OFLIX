# Instruções do projeto OFLIX

## Produto e objetivo

OFLIX é uma plataforma territorial para Sergipe que aproxima trabalho formal, serviços autônomos e voluntariado. A demo deve provar o ciclo conexão entre oferta e demanda → dados operacionais → inteligência territorial agregada e anonimizada.

## Fontes de verdade

- A proposta e a documentação de produto são a fonte de verdade do problema, dos públicos e do escopo.
- A branch `main` é a fonte de verdade técnica deste repositório.
- Antes de modificar, investigar o estado atual, padrões, dependências, banco, testes e documentação.

## Desenvolvimento

Faça mudanças incrementais, pequenas e justificadas. Não faça grandes refatorações sem causa concreta e não introduza microsserviços, filas, Kubernetes ou abstrações de infraestrutura sem necessidade.

Atualize a documentação quando o estado técnico mudar, principalmente `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/DECISIONS.md` e `docs/ROADMAP.md`.

## Testes

Mudanças de fluxo devem incluir ou atualizar teste. Antes de concluir, execute lint, typecheck, testes, build e smoke test do percurso principal. Valide desktop e mobile, incluindo loading, erro, vazio, sucesso, foco, labels, contraste e ausência de overflow.

## Segurança e dados

- Nunca versionar `.env`, tokens, chaves ou credenciais.
- Não incluir PDF original, CPF, telefone, e-mail pessoal, matrícula ou comprovantes.
- Os registros do seed são DEMO DATA, fictícios e fáceis de substituir.
- A seleção de perfil é explicitamente uma demonstração; não é autenticação real.
- Não usar localização exata ou geocodificação externa nesta fase.
- Nunca fazer force push.

## Status

Use os estados `IMPLEMENTADO`, `VALIDAÇÃO NECESSÁRIA`, `PARCIAL`, `PENDENTE`, `FUTURO` e `DESCARTADO` com precisão. Tipos e seed não significam que uma frente futura esteja completa.
