# Sistemas Lineares | Tutor gamificado

App estatico, mobile-first, para estudar Sistemas Lineares em modo guerra de 2 dias. O projeto usa apenas HTML, CSS e JavaScript, sem backend e sem etapa real de build.

## O que o app treina

- Home com tres modos principais, sem dashboard poluido:
  - Escalonamento Sem Quadro;
  - Discussao de Sistemas Lineares;
  - Lista 11 Total.
- Diagnostico duro por habilidade, sem porcentagem fake de dominio.
- Laboratorio com 59 desafios de operacoes de linha.
- Chapeu Seletor com 12 questoes que mede conceito de sistema, matriz ampliada, escalonamento, aritmetica, classificacao, homogeneos, determinante, parametros e discussao de sistemas.
- Quadro de Bolso com 3 escalonamentos 3x3 guiados em passos curtos para celular, sem exigir digitar matriz inteira.
- Banco de treino com 20 questoes de equacao linear, 20 de matriz aumentada, 20 de classificacao, 15 de homogeneos, 26 de parametros e 168 questoes no treino infinito.
- Boss final com 50 questoes baseadas na Lista 11 e questoes geradas equivalentes dentro do mesmo escopo.
- Cada questao gerada tem origem marcada como `Gerada`; questoes das listas aparecem como `Lista 10` ou `Lista 11`.
- Feedback errado explica o motivo do erro e abre uma area "Ver conta inteira".
- O Sistema III da Lista 10 fica marcado como `conferir enunciado`, porque a extracao do PDF mostrou possivel erro de OCR na segunda equacao.

## Estrutura

```text
/
|-- index.html
|-- style.css
|-- script.js
|-- README.md
`-- assets/
    `-- study-map-banner.png
```

## Como rodar localmente

Abra `index.html` no navegador, ou sirva a pasta com qualquer servidor estatico simples.

Exemplo:

```bash
python -m http.server
```

Depois abra o endereco mostrado pelo terminal.

## Producao

- O arquivo principal e `index.html`.
- O CSS esta separado em `style.css`.
- O JavaScript esta separado em `script.js`.
- Imagens ficam em `assets/`.
- O progresso do aluno e salvo em `localStorage`.
- O app e totalmente estatico e funciona sem backend.
- As formulas sao renderizadas com MathJax via CDN:
  `https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js`

## Decisoes didaticas e de design

- A casca gamificada foi mantida; a refatoracao aprofundou principalmente `script.js`.
- A Jornada agora usa uma trilha canonica `COURSE_PATH`, com 97 missoes em ordem linear, do fundamento ao boss final.
- A trilha inclui 16 microaulas de formalizacao matematica para nomes como SPD, SPI, SI, matriz aumentada, forma matricial, conjunto solucao, solucao trivial, pivo, variavel livre e parametro.
- O botao "Continuar jornada" sempre procura a proxima missao da campanha ainda nao concluida; se tudo foi concluido, mostra "Campanha concluida".
- "Comecar do zero" reinicia apenas o progresso da campanha linear depois de confirmacao, sem apagar XP, medalhas ou historico dos modos auxiliares.
- Lab, Duelos, Treino Infinito, Grimorio e Boss livre continuam existindo como modos auxiliares, mas nao controlam a ordem da Jornada.
- O HUD tem alternancia de tema claro/escuro salva em `localStorage`, com contraste alto e cores vivas.
- A refatoracao `ux-didactic-refactor` simplifica a Home, transforma a Jornada em superficie de curso limpo e organiza o Laboratorio por habilidade.
- A atualizacao adaptativa troca "fundamento como pedagio" por recomendacao: quem acerta o basico entra automaticamente mais adiante na Jornada.
- O Diagnostico salva um `userProfile` com nivel, habilidades, pontos fracos, fase inicial recomendada e ultima recomendacao.
- A Home agora evita painel poluido: mostra apenas tres cards grandes de treino de prova e uma area pequena de status.
- O app nao mostra dominio alto so por acerto conceitual: a confianca operacional fica limitada a 80% sem escalonamento completo, 85% sem discussao com parametro e 90% sem simulado misto.
- O conteudo longo fica no Grimorio. Jornada, Laboratorio e Boss mostram uma decisao por tela.
- O Laboratorio reforca a automatizacao de operacoes de linha antes de exigir escalonamento completo.
- O Boss da Lista 11 agora usa parametros e homogeneos reais das listas, incluindo determinantes, casos especiais e classificacao.
- O Treino infinito mistura questoes das listas e questoes geradas equivalentes, registra erros frequentes e recomenda revisao por habilidade.
- Botoes grandes, layout de uma coluna no mobile e formulas em caixas com rolagem horizontal continuam como padrao.

## Fontes usadas

- [OpenStax College Algebra 2e, 7.6 Solving Systems with Gaussian Elimination](https://openstax.org/books/college-algebra-2e/pages/7-6-solving-systems-with-gaussian-elimination): usado para conferir a ordem conceitual de matriz aumentada, operacoes de linha, eliminacao gaussiana e forma escalonada.
- [OpenStax College Algebra 2e, Chapter 7 Key Concepts](https://openstax.org/books/college-algebra-2e/pages/7-key-concepts): usado como checklist de conceitos essenciais: matriz aumentada, operacoes de linha e representacao de sistemas.
- [Khan Academy, Solving linear systems with matrices](https://www.khanacademy.org/math/linear-algebra/vectors-and-spaces/matrices-elimination/v/matrices-reduced-row-echelon-form-2): usado como referencia de exemplos resolvidos com matriz aumentada e reducao por linhas.
- [The Learning Scientists, Six Strategies for Effective Learning](https://www.learningscientists.org/blog/2019/11/28-1): influenciou recuperacao ativa, feedback imediato e revisoes curtas.
- [The Learning Scientists, Interleaving](https://www.learningscientists.org/blog/tag/interleaving): influenciou o Treino infinito, que mistura habilidades em vez de treinar sempre o mesmo tipo.
- [Nielsen Norman Group, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/): influenciou a separacao entre microtelas e Grimorio, escondendo detalhes longos em botoes/detalhes expansivos.
- [Nielsen Norman Group, Reduce Cognitive Load in Forms](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/): reforcou a decisao de uma tarefa por tela e feedback visual imediato.

## Deploy no Cloudflare Pages

1. Suba este projeto para GitHub.
2. No Cloudflare Dashboard, acesse **Workers & Pages**.
3. Clique em **Create application**.
4. Escolha **Pages**.
5. Clique em **Connect to Git**.
6. Escolha o repositorio `sistemas-lineares-modo-guerra`.
7. Configure:
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: `exit 0`
   - Build output directory: `.`
   - Root directory: `/`
8. Clique em **Deploy**.
9. Abra o link `.pages.dev` no Chrome do Android para testar.

Referencias oficiais:

- [Cloudflare Pages: Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare Pages: Deploy any static site](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)

## Atualizacao adaptativa

- Reducao de repeticao: fundamentos continuam disponiveis na Jornada, mas o Diagnostico pode marca-los como revisao opcional e recomendar trilhas avancadas.
- Recomendacao: `recommendNextMode(...)` considera erros do diagnostico, progresso salvo e habilidades fracas. Erros de sinal/pivo mandam para treino operacional; erros de parametro mandam para discussao por casos; acerto conceitual alto ainda nao libera dominio sem execucao completa.
- Home recalibrada: a tela principal mostra somente Escalonamento Sem Quadro, Discussao de Sistemas Lineares e Lista 11 Total.
- Quadro de Bolso: resolve escalonamentos 3x3 em decisoes pequenas, como escolher pivo, calcular `3L_2`, conferir termo independente e classificar SPD/SPI/SI.
- Escalonamentos completos adicionados: Sistema I da Lista 10 terminando em SI, sistema com pivo 3 sem fracao terminando em SPD, e sistema gerado equivalente terminando em SPI.
- Parametros ficaram acessiveis diretamente pela Home e pela recomendacao do diagnostico.
- Boss Lista 11 pode ser iniciado mesmo antes dos 140 XP; o app ainda avisa que e recomendado treinar antes.

## Tres modos de prova

### Escalonamento Sem Quadro

Treina pivo, escolha de linha, operacao elementar, aritmetica de sinais, lado direito depois da barra, fracao inevitavel, parametro simples e classificacao final. O celular quebra o escalonamento em decisoes pequenas; nao exige digitar uma matriz inteira.

### Discussao de Sistemas Lineares

Treina SPD/SPI/SI, linha contraditoria, variavel livre, determinante como radar, parametro, caso geral, caso especial, homogeneo e escrita da conclusao. Frase central: determinante diferente de zero resolve: SPD; determinante zero nao resolve tudo, ele manda investigar.

### Lista 11 Total

Simula a lista dificil: primeiro identifica o tipo da questao, depois escolhe o primeiro passo, resolve com ajuda progressiva e fecha com conclusao completa. Mistura parametro, homogeneo, determinante, variavel livre, classificacao e escrita formal.

## Diagnostico sem 97 fake

- `rawPercent` guarda a pontuacao bruta do Chapeu Seletor.
- `percent` guarda a confianca operacional ajustada por requisitos praticos.
- `masteryCap()` impede dominio inflado:
  - maximo de 80% se o aluno ainda nao concluiu escalonamento completo;
  - maximo de 85% se ainda nao discutiu sistema com parametro;
  - maximo de 90% se ainda nao fez simulado misto.
- Usar dica registra sinal de pressa/fragilidade naquela habilidade.
- O perfil salvo e por habilidade, nao por porcentagem geral.

## Jornada unica adaptativa

- Fluxo principal: `Chapeu Seletor -> missao recomendada -> Jornada -> microcorrecao se necessario -> discussao de sistemas -> simulado`.
- `buildDiagnosticResult(answers)` calcula pontuacao, habilidades dominadas, habilidades fracas, perfil e fase inicial.
- `recommendRoute(result)` escolhe uma missao real dentro do `COURSE_PATH`, nao um menu paralelo.
- Se o aluno mostra base suficiente, `markMissionsBeforeOptional(...)` marca as telas anteriores como revisao opcional para evitar pedagio eterno.
- Se o aluno erra repetidamente a mesma familia de habilidade, a Jornada insere uma microcorrecao adaptativa curta antes de continuar.
- A discussao de sistemas virou habilidade central: a Jornada treina identificar questao com parametro, usar determinante como radar, investigar `det(A)=0` e escrever conclusao completa.
- O app registra em `localStorage`: diagnostico, `userProfile`, pontuacoes por habilidade, tipos de erro, historico recente, recomendacao atual e progresso.

Relatorio de auditoria desta atualizacao:

- O que foi reduzido: a Home deixou de ser vitrine de modos; o aluno ve uma acao principal e extras recolhidos.
- Como o diagnostico decide: ele registra respostas por habilidade (`conceitoSistema`, `matrizAmpliada`, `escalonamento`, `aritmetica`, `classificacao`, `homogeneo`, `determinante`, `parametros`, `discussaoSistema`, `escritaConclusao`) e escolhe a missao canonica mais util.
- Teste mobile esperado: botoes grandes, uma decisao por tela, formulas dentro de caixas rolaveis e sem digitacao longa.
- Pendencias conhecidas: os modos auxiliares continuam acessiveis para treino livre, mas nao determinam a ordem da Jornada.

## Pente fino 2x

Auditoria feita em duas passadas depois do aprofundamento matematico.

Passada 1:

- Corrigida renderizacao de formulas em feedbacks e itens do Grimorio que usavam LaTeX dentro de strings comuns.
- Uniformizadas fracoes como `\frac{1}{4}`, `\frac{1}{2}` e `\frac{3}{4}` para evitar renderizacao ambigua.
- Ajustado o Boss final para nao misturar uma questao com origem `Lista 10` dentro do bloco `Lista 11`.
- O botao de avancar agora fica desabilitado ate o aluno responder em Jornada, Diagnostico, Laboratorio, Boss e Treino infinito.
- O botao do boss foi renomeado para `Reiniciar boss` e reinicia a pontuacao, evitando inflar score repetindo a mesma pergunta.
- As questoes de classificacao passaram a preservar a matriz original nos dados internos, permitindo auditoria automatizada.
- O espacamento inferior foi ajustado com `env(safe-area-inset-bottom)` para a barra fixa nao cobrir conteudo no mobile.

Passada 2:

- `node --check script.js` passou.
- Auditoria programatica confirmou contagens, ids, origens, alternativas, feedbacks e ausencia de lacunas no banco de questoes.
- Classificacoes foram recalculadas por pivots, contradicao e variaveis livres.
- Substituicoes da Lista 10 ex. 2 e contas centrais do exemplo guiado foram conferidas.
- Teste mobile no Chrome confirmou botoes grandes, ausencia de overflow horizontal, MathJax renderizando, imagem carregando, localStorage funcional e console sem erros.

## Checklist de auditoria

- Nao ha backend.
- Nao ha caminhos absolutos locais.
- Nao ha dependencia de servidor local em producao.
- Assets usam caminhos relativos.
- Formulas largas ficam em conteineres com rolagem horizontal.
- A navegacao e por botoes grandes e nao depende de hover.
- O layout e de uma coluna no celular.
