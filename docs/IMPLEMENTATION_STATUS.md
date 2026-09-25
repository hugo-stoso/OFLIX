# Estado de implementação

## IMPLEMENTADO

- Aplicação Next.js única com TypeScript e Tailwind.
- Persistência local SQLite via `node:sqlite` e seed DEMO DATA.
- Modelo separado de perfis, território, três frentes e interações.
- Landing, seleção de persona, descoberta, detalhe e navegação principal.
- Ações contextuais funcionais com persistência e feedback de sucesso/duplicidade.
- Visão territorial inicial derivada de dados operacionais.
- Documentação permanente e smoke tests do percurso principal.

## VALIDAÇÃO NECESSÁRIA

- Avaliação com usuários reais de Sergipe sobre linguagem, categorias e utilidade dos indicadores.
- Revisão de acessibilidade automatizada e manual mais abrangente antes de publicação.
- Definição de governança, consentimento e moderação.

## PARCIAL

- Organização pode ser selecionada e navega pela descoberta, mas ainda não publica nem administra oportunidades.
- Inteligência territorial prova o caminho de dados, mas ainda não modela demanda não atendida nem oferece filtros.

## PENDENTE

- Deploy e observabilidade.
- Fluxos de cadastro, autenticação e recuperação de acesso.
- Criação, edição, revisão e encerramento de oportunidades.

## FUTURO

- Capacidades múltiplas por perfil.
- Coordenadas opcionais e camadas cartográficas responsáveis.
- Busca territorial, matching, notificações e indicadores evolutivos.

## DESCARTADO

- Microsserviços, backend separado, filas, Kubernetes, geocodificação externa e autenticação externa nesta fase.
