# Lista 11 Desespero | Sistemas Lineares

App estatico, mobile-first, para matar a Lista 11 de Sistemas Lineares em uma trilha unica de emergencia. O projeto usa apenas HTML, CSS e JavaScript, sem backend e sem etapa real de build.

## Modo Desespero

A experiencia principal agora e **Lista 11 Desespero**:

- uma trilha unica, em ordem, focada apenas na Lista 11;
- nada de campo de escrita no caminho principal;
- interacao por cliques A/B/C/D;
- ordem das alternativas embaralhada por tentativa, sem resposta correta fixa na letra A;
- cada clique representa uma decisao de prova, nao uma pergunta decorativa;
- distratores baseados em erros reais e plausiveis: erro de sinal, caso critico invertido, `det=0 -> SPI`, esquecer caso especial, confundir homogeneo com impossivel, resolver valor numerico sem discutir parametro;
- visual novo, mais vivo, com mapa de progresso, botoes grandes e feedback imediato;
- Folha em Branco e Grimorio continuam como modos auxiliares, mas nao baguncam a trilha principal.

Resumo da trilha:

1. Exercicio 1(a): parametro `lambda`, determinante e caso SI.
2. Exercicio 2: parametro `m`, caso `m=-8` e solucao para `m=2`.
3. Exercicio 3: valores criticos `alpha=1` e `alpha=-1`, com SPD/SPI/SI.
4. Exercicio 4: caso `k=-3`, ausencia de SPI e solucao para `k=0`.
5. Exercicio 5: homogeneo, solucao trivial, `alpha=0` e solucao nao trivial.
6. Exercicio 6: homogeneo com `m`, apenas trivial para `m != 0,3`.
7. Boss final: regra mental para nao cair em conclusao precipitada.

## Pesquisa aplicada

A refatoracao usou fontes confiaveis para orientar decisoes, sem copiar texto longo:

- Nielsen Norman Group: progressive disclosure, hierarquia visual, usabilidade mobile e reducao de carga na interface.
- WCAG 2.1: foco visivel, contraste, landmarks e controles operaveis por teclado.
- The Learning Scientists: recuperacao ativa, pratica intercalada e feedback corretivo.
- CAST UDL Guidelines: multiplas formas de orientacao, objetivo explicito e reducao de barreiras.
- OpenStax, LibreTexts, MIT OCW e Khan Academy: rigor de matriz aumentada, eliminacao, determinante, sistemas homogeneos e classificacao por consistencia.

Aplicacao pratica no app:

- trilha unica para reduzir escolha demais;
- alternativas A/B/C/D como decisoes de prova, nao reconhecimento superficial;
- feedback imediato explicando o erro provavel;
- visual mais vivo para reduzir fadiga;
- modos antigos rebaixados a apoio, sem atrapalhar a trilha da Lista 11.

## O que o app treina

- Home com trilha unica Lista 11 Desespero.
- Modo Quadro como experiencia central: enunciado, sistema, matriz aumentada, decisao do aluno, diagnostico do erro e conclusao de prova.
- Folha em Branco - Lista 11: modo de prova sem alternativas, com resposta aberta, ajuda progressiva, ritual de prova, cronometro e avaliacao por eixos.
- Banco com 20 sistemas diferentes: 15 originais/eixos da Lista 11 e 5 derivados no mesmo estilo.
- Metricas separadas: progresso do app, dominio estimado e confianca operacional.
- Diagnostico duro por habilidade, sem porcentagem fake de dominio.
- Laboratorio com 59 desafios de operacoes de linha.
- Chapeu Seletor com 12 questoes que mede conceito de sistema, matriz ampliada, escalonamento, aritmetica, classificacao, homogeneos, determinante, parametros e discussao de sistemas.
- Quadro de Bolso com 3 escalonamentos 3x3 guiados em passos curtos para celular, sem exigir digitar matriz inteira.
- Banco de treino com 20 questoes de equacao linear, 20 de matriz aumentada, 20 de classificacao, 15 de homogeneos, 26 de parametros e 168 questoes no treino infinito.
- Boss Final com sistemas da Lista 11 e derivados: parametro, homogeneo, escalonamento medio, caso SI, caso SPI e conclusao escrita.
- Cada questao gerada tem origem marcada como `Gerada`; questoes das listas aparecem como `Lista 10` ou `Lista 11`.
- Feedback errado explica o motivo do erro e abre uma area "Ver conta inteira".
- Cada card de exercicio tem a opcao "Ver questao cobrada agora", com origem, dados, enunciado, matriz e alternativas relevantes para resolver sem depender da lista original.
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

## Testes estaticos

Este projeto nao tem framework de testes nem dependencias de build. O smoke test em Node puro verifica contratos basicos de acessibilidade, Home, titulos dinamicos e feedback:

```bash
node tests/static-a11y-smoke.js
```

## Producao

- O arquivo principal e `index.html`.
- O CSS esta separado em `style.css`.
- O JavaScript esta separado em `script.js`.
- A stack real e HTML/CSS/JavaScript puro; nao ha Vite, React, Next, Vue, Astro nem etapa de build.
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
- A Home agora evita painel poluido: mostra a proxima acao no Modo Quadro, diagnostico, Boss Final e relatorio.
- O app nao mostra dominio alto so por acerto conceitual: o dominio estimado tem tetos rigidos e so passa de 90% depois do Boss Final sem dica.
- O conteudo longo fica no Grimorio. Jornada, Laboratorio e Boss mostram uma decisao por tela.
- O Laboratorio reforca a automatizacao de operacoes de linha antes de exigir escalonamento completo.
- O Boss da Lista 11 agora usa parametros e homogeneos reais das listas, incluindo determinantes, casos especiais e classificacao.
- O Treino infinito mistura questoes das listas e questoes geradas equivalentes, registra erros frequentes e recomenda revisao por habilidade.
- Botoes grandes, layout de uma coluna no mobile e formulas em caixas com rolagem horizontal continuam como padrao.
- A Home explica objetivo, publico, funcionamento, trilha recomendada e o significado pedagogico de XP, sequencia e medalhas antes dos atalhos de treino.
- A navegacao recebeu rotulos funcionais: Quadro/Seu progresso, Diagnostico/Ponto de partida, Boss/Desafio final e Grimorio/Teoria e exemplos.
- Acessibilidade: skip link, landmarks HTML, foco visivel, `aria-current` na navegacao, `aria-live` nos feedbacks, toggle de tema com `aria-pressed` e titulos dinamicos por modo.

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

- Reducao de repeticao: fundamentos continuam disponiveis, mas a rota principal agora manda o aluno para sistemas reais da Lista 11.
- Recomendacao: `recommendNextMode(...)` considera erros do diagnostico, progresso salvo e habilidades fracas. Erros de sinal/pivo mandam para Modo Quadro; erros de parametro mandam para sistemas com casos; erros de homogeneo mandam para Lista 11 ex. 5/6.
- Home recalibrada: a tela principal mostra uma jornada de prova, nao tres minigames paralelos.
- Modo Quadro: resolve sistemas em decisoes pequenas, como identificar o tipo, montar matriz aumentada, escolher estrategia, testar caso critico, classificar e escrever conclusao.
- No Modo Quadro, casos com parametro fixado sao tratados como sistemas numericos. Exemplo: Lista 11 ex. 3(a), com `\alpha=0`, conduz o aluno para escalonamento e solucao unica, nao para discussao simbolica.
- Escalonamentos completos adicionados: Sistema I da Lista 10 terminando em SI, sistema com pivo 3 sem fracao terminando em SPD, e sistema gerado equivalente terminando em SPI.
- Parametros ficaram acessiveis diretamente pela Home e pela recomendacao do diagnostico.
- Boss Lista 11 pode ser iniciado mesmo antes dos 140 XP; o app ainda avisa que e recomendado treinar antes.

## Lista 11 + Modo Quadro

O banco `LISTA11_SYSTEMS` cadastra 20 sistemas:

- Sistemas 01 a 15: Lista 11, exercicios 1(a), 1(b), 1(c), 1(d), 2(a), 2(b), 3 geral, 3(a), 3(b), 3(c), 4(a), 4(b), 5(a), 5(b)(c) e 6.
- Sistemas 16 a 20: derivados controlados da Lista 11, com os mesmos raciocinios de parametro, SPI, SI e homogeneos.

Cada sistema passa por seis passos no Modo Quadro:

1. Leitura do enunciado.
2. Escolha da estrategia.
3. Determinante ou caso critico.
4. Anti-vacilo da etapa.
5. Classificacao por posto/SPD/SPI/SI.
6. Conclusao escrita no modelo de prova.

O Modo Quadro mostra enunciado, matriz aumentada, operacoes esperadas, decisao do aluno, diagnostico do erro e conclusao. Ele registra erro aritmetico, conceitual, organizacao, conclusao, parametro, homogeneo, SPI cedo demais, contradicao ignorada e variavel livre esquecida.

## Folha em Branco - Lista 11

Este modo simula a prova de verdade: o aluno ve apenas enunciado, matriz/matriz aumentada e um campo aberto para escrever o proximo passo. Nao ha alternativas, nem dica inicial, nem resposta final prematura.

O fluxo de cada questao passa por leitura do pedido, identificacao do tipo de sistema, escolha de estrategia, ponto perigoso, execucao, interpretacao e conclusao. A correcao nao usa XP como indicador principal; ela avalia cinco eixos:

- leitura do enunciado;
- plano;
- execucao;
- interpretacao;
- conclusao.

O botao `Estou travado` libera ajuda em cinco niveis. Ajuda nivel 4 ou 5 permite continuar o treino, mas impede que aquela tentativa conte como dominio real sem dica. O cronometro de prova tambem registra se o aluno estourou o tempo e pergunta onde travou.

Exercicios implementados no modo:

- Lista 11 exercicio 2: parametro `m`, caso `m=-8`, resolucao de `m=2` com solucao `(1,-1,1)`.
- Lista 11 exercicio 3: casos `\alpha=0`, `\alpha=1` e `\alpha=-1`, com SPD, SPI e SI.
- Lista 11 exercicio 4: parametro `k`, caso `k=-3`, ausencia de SPI e solucao para `k=0`.
- Lista 11 exercicio 5: homogeneo, solucao trivial, `\alpha=0`, solucao geral `t(-1,1,1)`.
- Lista 11 exercicio 6: homogeneo com `m`, apenas trivial quando `m\neq0` e `m\neq3`.
- Treino de continuacao: matriz parcialmente escalonada para o aluno decidir como continuar.

Tambem existe o modo opcional `Minha folha ficou confusa`, que organiza a resposta em blocos: dados, matriz aumentada, operacoes, caso geral, caso especial, classificacao, solucao e conclusao.

### QA e refatoracao do exercicio 4

O exercicio 4 da Lista 11 virou a fatia vertical de referencia do modo Folha em Branco. O fluxo principal nao usa alternativa: ele exige escrita curta, justificativa, continuacao da conta e conclusao de prova.

Fluxo atual:

1. ler o pedido: discutir em funcao de `k` e resolver `k=0`;
2. escolher estrategia: determinante/pivo/escalonamento e separacao de caso;
3. achar o valor critico `k=-3`;
4. justificar por que `k=-3` precisa ser separado;
5. concluir o caso geral `k != -3` como SPD;
6. continuar a matriz do caso `k=-3` ate a contradicao;
7. responder por escrito por que nao existe caso SPI;
8. resolver `k=0` com solucao `(0,2,-1)`;
9. escrever a conclusao final completa.

Rubrica do exercicio 4:

- leitura do enunciado;
- escolha de estrategia;
- identificacao do caso especial;
- teste do caso especial;
- classificacao SPD/SPI/SI;
- resolucao de `k=0`;
- conclusao escrita.

O avaliador agora tambem rejeita respostas ambiguas, por exemplo `determinante zero entao SPI`, quando o aluno nao explicou o teste do caso especial.

### Changelog de QA do modo Folha em Branco

#### BUGS ENCONTRADOS

- A etapa final do exercicio 4 ficou com sintaxe quebrada apos remover uma etapa antiga.
- A rubrica podia nao pontuar respostas corretas porque as etapas tinham texto de armadilha (`trap`).
- O botao `Minha folha ficou confusa` apontava para outro exercicio, nao para a fatia de referencia.
- O smoke test ainda exigia armadilhas de multipla escolha, mesmo depois de o fluxo principal virar escrita.

#### DIVIDAS DE UI

- Modos auxiliares antigos ainda possuem telas mais parecidas com cards de quiz.
- As questoes 2, 3, 5 e 6 ainda precisam receber o mesmo polimento profundo do exercicio 4.
- Algumas copias antigas sem acento permanecem para evitar refatoracao ampla fora da fatia validada.

#### DIVIDAS PEDAGOGICAS

- O banco antigo ainda contem perguntas boas para revisao, mas algumas sao rasas para treino de prova.
- A estrutura de Folha em Branco esta pronta, mas a profundidade de professor de lousa foi validada primeiro no exercicio 4.
- Replicar a fatia para os outros exercicios deve ser feito depois de validar este modelo no celular.

#### O QUE FOI REMOVIDO

- Dependencia de alternativa embaralhada no fluxo principal do exercicio 4.
- Painel visual e handler antigos de armadilha objetiva.
- Etapa de correcao ficticia que alongava o exercicio sem melhorar a resolucao.

#### O QUE FOI MANTIDO

- Enunciado cru, matriz, campo aberto, ajuda progressiva, cronometro, ritual de prova e historico.
- Modo `Minha folha ficou confusa`.
- Demais modos do app como treino auxiliar, sem misturar com a fatia de prova.

#### O QUE FOI REFEITO

- Exercicio 4 agora comeca por enunciado/matriz e cobra escrita.
- A rubrica foi alinhada ao que a prova exige.
- O feedback detecta conclusao precipitada por determinante zero.
- O menu prioriza o exercicio 4 como fatia vertical de referencia.

## Modos auxiliares de prova

### Escalonamento Sem Quadro

Treino auxiliar de pivo, escolha de linha, operacao elementar, aritmetica de sinais, lado direito depois da barra, fracao inevitavel, parametro simples e classificacao final.

### Discussao de Sistemas Lineares

Treina SPD/SPI/SI, linha contraditoria, variavel livre, determinante como radar, parametro, caso geral, caso especial, homogeneo e escrita da conclusao. Frase central: determinante diferente de zero resolve: SPD; determinante zero nao resolve tudo, ele manda investigar.

### Lista 11 Total

Simula a lista dificil: primeiro identifica o tipo da questao, depois escolhe o primeiro passo, resolve com ajuda progressiva e fecha com conclusao completa. Mistura parametro, homogeneo, determinante, variavel livre, classificacao e escrita formal.

## Diagnostico sem 97 fake

- `rawPercent` guarda a pontuacao bruta do Chapeu Seletor.
- `percent` guarda o dominio estimado ajustado por requisitos praticos.
- `masteryCapStrict()` impede dominio inflado:
  - so quiz conceitual: dominio maximo 45%;
  - conceitos + exemplos guiados: dominio maximo 60%;
  - sem 2 escalonamentos medios: dominio maximo 75%;
  - sem sistema com parametro: dominio maximo 85%;
  - sem treino amplo da Lista 11 ou Boss Final: dominio maximo 90%;
  - acima de 90% apenas com Boss Final aprovado sem dica direta.
- Usar dica registra sinal de pressa/fragilidade naquela habilidade.
- O perfil salvo e por habilidade, nao por porcentagem geral.
- O relatorio mostra: `Progresso`, `Dominio estimado`, `Confianca operacional`, `Risco principal` e `Proximo treino`.

## Jornada unica adaptativa

- Fluxo principal: `Chapeu Seletor -> sistema recomendado da Lista 11 -> Modo Quadro -> Lista 11 Total -> Boss Final -> relatorio`.
- `buildDiagnosticResult(answers)` calcula pontuacao, habilidades dominadas, habilidades fracas, perfil e fase inicial.
- `boardStartForDiagnostic(result)` escolhe um sistema real dentro de `LISTA11_SYSTEMS`, nao um menu paralelo.
- Se o aluno mostra base suficiente, `markMissionsBeforeOptional(...)` marca as telas anteriores como revisao opcional para evitar pedagio eterno.
- Se o aluno erra repetidamente a mesma familia de habilidade, a Jornada insere uma microcorrecao adaptativa curta antes de continuar.
- A discussao de sistemas virou habilidade central: a Jornada treina identificar questao com parametro, usar determinante como radar, investigar `det(A)=0` e escrever conclusao completa.
- O app registra em `localStorage`: diagnostico, `userProfile`, pontuacoes por habilidade, tipos de erro, historico recente, sistemas concluidos, sistemas feitos sem dica, tentativas do Modo Quadro, Boss Final e progresso.

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
