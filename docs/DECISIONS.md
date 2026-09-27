# Decisões desta inicialização

## Stack

Foi escolhida uma aplicação única em Next.js, TypeScript e Tailwind CSS por reduzir a superfície operacional da demo e facilitar a execução local. O módulo nativo `node:sqlite` oferece persistência SQLite real sem exigir binário nativo adicional neste ambiente, mantendo um caminho simples para evolução do modelo.

## Persistência e domínio

As três frentes permanecem como entidades semânticas separadas. `Interaction` compartilha infraestrutura, mas mantém o tipo e o alvo explícitos. A deduplicação inicial usa uma restrição composta por perfil, frente e oportunidade.

## Perfil demo

A primeira etapa não implementa autenticação. A seleção de uma persona fictícia é persistida no `localStorage` e identificada visualmente como “Perfil de demonstração”. Isso permite demonstrar perspectivas sem criar uma falsa sensação de segurança.

## Territorialidade

O modelo usa UF, município e bairro/região. Não há API de mapas, geocodificação ou localização exata, evitando chaves e dependências externas. A estrutura de `Location` permite evolução futura sem reescrever oportunidades.

## UX

A landing é curta. A descoberta usa listas densas e legíveis. Cada frente usa seu próprio verbo de ação. A visão de analista evita nomes e números inventados; seus agregados vêm do seed e das interações.

## Demonstração de matching e gestão

CLT e Estágio são atributos explícitos de oportunidades formais. Trabalhadores escolhem múltiplas atividades de interesse e recebem destaque local quando há correspondência; organizações visualizam suas ofertas e os perfis que demonstraram interesse em uma base de talentos. Favoritos, preferências e lembretes são locais à demonstração. O chat é intencionalmente um protótipo do fluxo: a organização inicia a conversa, sem transmissão de dados pessoais.

## Desvios e limites

O fluxo de publicação, a base de talentos e o chat foram adicionados como experiências demonstráveis, mas continuam sem autorização, persistência compartilhada, moderação ou entrega de mensagens. O link do Google Agenda usa um template confirmável pelo usuário, sem OAuth. A UI apresenta organizações na descoberta, mas separa gestão, candidatos e oportunidades ofertadas em blocos próprios.

## Oferta, demanda e banco de talentos

Oferta de trabalho pertence à pessoa que apresenta sua força de trabalho; demanda pertence à empresa, instituição ou outro contratante. O mural aplica essa distinção por perfil: contratantes nunca recebem as demandas de outras organizações. Pessoas podem compartilhar voluntariamente um perfil de talento para que organizações pesquisem ofertas de trabalho, inclusive CLT, estágio, serviços autônomos e voluntariado.

O currículo segue o modelo fornecido pelo produto e fica obrigatório antes do opt-in do banco de talentos. Na demo, o arquivo `.docx` é lido e guardado como dado local do navegador para permitir o download pela organização no mesmo percurso. Isso é uma simulação de armazenamento: produção deve validar o template no servidor e usar armazenamento de arquivos com consentimento e controles de acesso.
