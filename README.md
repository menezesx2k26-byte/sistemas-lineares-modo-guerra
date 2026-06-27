# Sistemas Lineares | Tutor gamificado

App estatico, mobile-first, para estudar Sistemas Lineares em modo guerra de 2 dias. O projeto usa apenas HTML, CSS e JavaScript, sem backend e sem etapa real de build.

## O que o app treina

- Home, Jornada, Laboratorio, Duelos, Boss Lista 11, Treino infinito e Grimorio.
- Laboratorio com 59 desafios de operacoes de linha.
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
- A Jornada agora usa uma trilha canonica `COURSE_PATH`, com 75 missoes em ordem linear, do fundamento ao boss final.
- O botao "Continuar jornada" sempre procura a proxima missao da campanha ainda nao concluida; se tudo foi concluido, mostra "Campanha concluida".
- "Comecar do zero" reinicia apenas o progresso da campanha linear depois de confirmacao, sem apagar XP, medalhas ou historico dos modos auxiliares.
- Lab, Duelos, Treino Infinito, Grimorio e Boss livre continuam existindo como modos auxiliares, mas nao controlam a ordem da Jornada.
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
