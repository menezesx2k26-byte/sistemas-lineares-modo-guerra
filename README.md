# Sistemas Lineares | Tutor gamificado

App estatico, mobile-first, para estudar Sistemas Lineares em modo guerra de 2 dias. O projeto usa apenas HTML, CSS e JavaScript, sem backend e sem etapa real de build.

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

## Checklist de auditoria

- Nao ha backend.
- Nao ha caminhos absolutos locais.
- Nao ha dependencia de servidor local em producao.
- Assets usam caminhos relativos.
- Formulas largas ficam em conteineres com rolagem horizontal.
- A navegacao e por botoes grandes e nao depende de hover.
- O layout e de uma coluna no celular.
