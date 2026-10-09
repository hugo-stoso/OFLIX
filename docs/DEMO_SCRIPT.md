# Roteiro inicial da demo

1. Na landing, apresentar a OFLIX como “hub territorial de oportunidades”, mostrar a busca conceitual com “eletricista” e percorrer rapidamente os três pilares de “O que você encontra”, “Como funciona” e “Sergipe como ponto de partida”.
2. Entrar na demonstração e escolher **Hugo Silva**, uma pessoa fictícia em Aracaju.
3. Abrir a vaga **Assistente de operações locais** e clicar em **Candidatar-se**.
4. Mostrar o feedback de sucesso. Repetir a ação para evidenciar a prevenção de duplicidade.
5. Voltar e abrir a aba **Serviços autônomos** ou **Voluntariado**, destacando que cada frente tem uma ação própria.
6. Com Hugo Silva, selecionar uma atividade e mostrar o recorte territorial de oportunidades relacionadas; a visão geral não aparece para pessoas.
7. Trocar para **Coletivo Horizonte** e abrir **Publicar demanda de trabalho**. Selecionar **Demanda de serviço autônomo**, marcar mais de uma atividade (por exemplo, Eletricista e Manutenção), preencher título e descrição e publicar.
8. Mostrar que as atividades aparecem em **Minhas oportunidades** e que a publicação fica disponível para destacar interesses compatíveis no mesmo navegador.
9. Trocar para **Observatório Território Aberto (demonstração)** e acessar o **Observatório Territorial OFLIX**. Começar pela visão **Sergipe na OFLIX**, que mostra oportunidades, conexões, municípios com atividade e áreas presentes.
10. No mapa coroplético municipal, alternar **Oportunidades**, **Empregos**, **Serviços**, **Voluntariado** e **Interações**. Selecionar **Lagarto** pelo mapa ou pelo seletor de território e mostrar que ranking, indicadores, frentes, campos de atuação, gráfico CLT/Estágio e detalhes territoriais mudam para o município.
11. Selecionar **Nossa Senhora do Socorro** e depois um município neutro, como **Amparo do São Francisco**, para mostrar “Este município ainda não possui registros na base desta demonstração” e reforçar que isso não significa ausência de oportunidades reais. Voltar para **Sergipe** pelo botão ou seletor.
12. Reforçar que o mapa não exibe nomes de pessoas, endereços ou coordenadas: são dados agregados e fictícios da demonstração. Cursos, concursos, vagas externas e contratações públicas não entram nas métricas operacionais do mapa.
13. Abrir o menu com o nome da persona no canto superior direito e mostrar **Meu perfil**, **Mercado & Conhecimento**, **Configurações** e **Sair**; em Meu perfil, destacar resumo, competências e território demonstrativo.
14. Na descoberta, entrar em **Empregos** ou **Serviços** e alternar entre **Ofertas** para ver pessoas e autônomos apresentando sua força de trabalho e **Demandas** para ver vagas e serviços dos contratantes; explicar que o seletor não aparece em **Todos**, **Concursos**, **Capacitação** ou **Voluntariado**. Com **Amanda Figueiredo**, publicar uma nova oferta e mostrar que ela permanece no primeiro caminho.
15. Com **Hugo Silva**, em **Atividades que você quer acompanhar**, marcar **CLT** e **Voluntariado**, selecionar algumas atividades, informar escolaridade e curso, anexar um currículo livre em PDF ou DOCX de até 5 MB e ativar **Permitir que instituições encontrem meu perfil**. Trocar para **Coletivo Horizonte** e mostrar o perfil em **Talentos**; filtrar escolaridade/tipo de curso, baixar o arquivo original e iniciar uma conversa pelos atalhos de remuneração ou benefícios.
16. Com **Coletivo Horizonte**, clicar em **Chamar autônomo agora**, selecionar uma atividade, informar a janela do dia e descrever o serviço. Trocar para **Amanda Figueiredo**, mostrar o chamado em **Chamados compatíveis hoje** e clicar em **Aceitar primeiro**; explicar que uma segunda aceitação recebe conflito e que o endereço exato é combinado depois.

## Roteiro da fonte externa GO Sergipe

Com `GO_SERGIPE_ENABLED` ativo, escolher **Hugo Silva**, abrir **Buscar**, selecionar **Empregos** e conferir uma vaga com a fonte `GO Sergipe`, município/UF, remuneração, quantidade de vagas, escolaridade/CBO quando informados e o CTA **Ver vaga no GO Sergipe**. O CTA abre a publicação original em nova aba; a OFLIX não candidata a pessoa, não coleta dados do candidato e não trata a vaga externa como publicação OFLIX.

A página pública é uma SPA sem cards no HTML do GET inicial. A OFLIX usa server-side o endpoint JSON público estruturado utilizado pela própria SPA, sem navegador headless em produção, e mantém a fonte original como CTA.

## Roteiro atualizado de arquitetura de informação

1. Com **Hugo Silva**, mostrar que a Home começa por “Descubra oportunidades para trabalhar, aprender e crescer em Aracaju”, pelo campo “O que você está procurando?” e, imediatamente depois, por **Mercado & Conhecimento**. Dizer: “A OFLIX não apenas mostra oportunidades; também ajuda a interpretar o mercado.” Em seguida, mostrar o resumo “Na demonstração em Aracaju”.
2. Enviar “eletricista” na busca da Home e confirmar que o hub abre com `q=eletricista`. Voltar a Início e abrir **Concursos** ou **Capacitação** para demonstrar os atalhos que reutilizam a mesma busca.
3. Abrir **Preferências** e mostrar a visão curta: Trabalho, Desenvolvimento profissional, Áreas e atividades, Voluntariado, território e avisos. Abrir somente um grupo por vez; confirmar que formação e currículo não aparecem na visão inicial.
4. Abrir **Perfil** e demonstrar Formação, Currículo, Banco de talentos e Território como seções progressivas. Anexar um PDF ou DOCX de até 5 MB e confirmar que o nome original permanece visível, sem modelo obrigatório.
5. Com **Coletivo Horizonte**, mostrar uma Home própria com Publicar oportunidade, Talentos, Serviço para hoje e o bloco **Minhas oportunidades** antes do composer. Com **Instituto Ponte Aberta**, mostrar a Home de mobilização, o CTA **Publicar ação voluntária** e **Pessoas** com as abas **Voluntários** e **Talentos**. Com a **Secretaria Demo de Cidadania (fictícia)**, mostrar somente Ações e Voluntários, sem Serviço para hoje ou Talentos.

## Roteiro Mercado & Conhecimento

1. Na Home de pessoa ou organização, apresentar **Mercado & Conhecimento** logo depois da busca ou das ações principais. Confirmar que a camada é complementar, que `Buscar` continua reservado às oportunidades e que os três atalhos levam diretamente às abas correspondentes. A entrada **Mercado & Conhecimento** do menu da persona permanece disponível para retorno.
2. Em **Salários e mercado**, comparar `Remuneração média anunciada` de Aracaju com uma categoria OFLIX. Mostrar que valor exato entra pelo próprio valor, faixa usa ponto médio, publicação sem remuneração é excluída e o card informa o número de observações.
3. Mostrar a caixa separada **Salário médio de admissão**. Nesta versão ela informa a indisponibilidade da integração MTE/PDET, exibe a fonte oficial investigada e não mostra número fictício nem infere CBO.
4. Abrir uma vaga formal com remuneração e mostrar no detalhe **Remuneração anunciada**, a fonte OFLIX e o CTA **Comparar com o mercado**. Abrir uma vaga de estágio e confirmar o termo **Bolsa / remuneração de estágio**.
5. Em **Legislação para trabalho e negócios**, abrir Lei do Estágio, Lei do Voluntariado, Lei de Licitações e Reforma Tributária do Consumo. Confirmar links Planalto, marcos separados e o aviso informativo.
6. Em **Artigos & evidências**, trocar entre Mercado de trabalho, Gestão e Produtividade. Mostrar autor, periódico, ano, citações na base OpenAlex, acesso aberto e **Por que recomendamos**. Em indisponibilidade, o snapshot local de metadata real mantém a lista; nenhum PDF ou artigo fictício aparece.
