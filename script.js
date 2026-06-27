const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const STORAGE_KEY = "sl-game-v2";

const medals = {
  bar: "Copiou a barra direito",
  auror: "Auror das Linhas",
  patrono: "Patrono Anti-Vacilo",
  zeroSeven: "Sobreviveu ao 0=7",
  params: "Mestre dos Parâmetros",
  boss: "Venceu a Lista 11"
};

const defaultState = {
  xp: 0,
  streak: 0,
  bestStreak: 0,
  medals: [],
  completed: [],
  labCorrect: 0,
  checklistDone: false,
  lastMode: "home",
  diagnostic: null,
  bossUnlocked: false,
  stats: {}
};

let state = loadState();
let screen = { mode: "home", index: 0, boss: "mixed", score: 0, errors: [] };

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderHud();
}

function typeset() {
  if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
}

function addXp(amount, reason) {
  state.xp += amount;
  state.streak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  if (state.labCorrect >= 5) award("auror");
  if (state.xp >= 140 || state.completed.includes("guided")) state.bossUnlocked = true;
  saveState();
  return `+${amount} XP${reason ? ` · ${reason}` : ""}`;
}

function miss() {
  state.streak = 0;
  saveState();
}

function award(key) {
  if (!state.medals.includes(key)) {
    state.medals.push(key);
    saveState();
    return medals[key];
  }
  return null;
}

function complete(id) {
  if (!state.completed.includes(id)) state.completed.push(id);
  if (id === "matrix") award("bar");
  if (id === "checklist") award("patrono");
  if (id === "contradiction") award("zeroSeven");
  if (id === "parameters") award("params");
  saveState();
}

function renderHud() {
  $("#xpStat").textContent = `${state.xp} XP`;
  $("#streakStat").textContent = `${state.streak} sequência`;
  $("#medalStat").textContent = `${state.medals.length} medalhas`;
  $$(".bottom-nav button").forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === screen.mode));
}

function setStage(html) {
  $("#appStage").innerHTML = html;
  renderHud();
  typeset();
}

const phases = [
  {
    id: "fund",
    phase: "Fase 0",
    title: "Coeficiente e termo independente",
    explain: "Coeficiente é o número que multiplica a variável. Termo independente é o número do lado direito da igualdade.",
    why: "Você precisa separar esses papéis antes de montar a matriz aumentada.",
    example: String.raw`Em \(3x_1+7x_2+2x_3=-19\), \(3,7,2\) são coeficientes e \(-19\) é termo independente.`,
    question: String.raw`Qual é o termo independente?`,
    choices: ["7", "-19", "2"],
    answer: 1,
    feedback: "Ele fica depois da igualdade, não junto das variáveis."
  },
  {
    id: "linear",
    phase: "Fase 0",
    title: "Equação linear",
    explain: "Equação linear usa variáveis em grau 1, sem raiz, produto entre variáveis ou variável no denominador.",
    why: "Sistemas lineares só permitem esse tipo de equação.",
    example: String.raw`\(2x_1-3x_2+4x_3=20\) é linear. \(x_1+4x_3x_4=20\) não é.`,
    question: String.raw`\(x_1+5x_2=-5\) é linear?`,
    choices: ["Sim", "Não"],
    answer: 0,
    feedback: "Sim. As variáveis aparecem em grau 1."
  },
  {
    id: "system",
    phase: "Fase 0",
    title: "Solução de sistema",
    explain: "Uma solução precisa satisfazer todas as equações do sistema ao mesmo tempo.",
    why: "Acertar uma linha só não resolve o sistema.",
    example: String.raw`O vetor \((0,-5,1)\) funciona se passar nas duas equações da Lista 10, exercício 2.`,
    question: "Se falha em uma equação, ainda é solução?",
    choices: ["Sim", "Não"],
    answer: 1,
    feedback: "Não. Sistema é tudo junto."
  },
  {
    id: "matrix",
    phase: "Fase 1",
    title: "Matriz aumentada",
    explain: "Matriz aumentada é a matriz dos coeficientes com o lado direito depois da barra.",
    why: "A barra lembra que o lado direito também muda nas operações de linha.",
    example: String.raw`\([5,\ 12,\ 5\ |\ -21]\) representa \(5x_1+12x_2+5x_3=-21\).`,
    question: String.raw`A linha de \(3x_1+7x_2+2x_3=-19\) é:`,
    choices: [String.raw`\([3,\ 7,\ 2\ |\ -19]\)`, String.raw`\([3,\ 7,\ -19\ |\ 2]\)`, String.raw`\([-19,\ 3,\ 7\ |\ 2]\)`],
    answer: 0,
    feedback: "Coeficientes antes da barra, lado direito depois."
  },
  {
    id: "spell-scale",
    phase: "Fase 2",
    title: "Multiplicar linha",
    explain: String.raw`\(L_i\leftarrow cL_i\) multiplica a linha inteira por \(c\), com \(c\neq0\).`,
    why: "Multiplicar por zero apaga a equação; por isso é proibido.",
    example: String.raw`\(\frac14[0,\ 4\ |\ 8]=[0,\ 1\ |\ 2]\).`,
    question: "Qual operação transforma 4 em 1?",
    choices: [String.raw`\(L_2\leftarrow4L_2\)`, String.raw`\(L_2\leftarrow\frac14L_2\)`, String.raw`\(L_2\leftarrow0L_2\)`],
    answer: 1,
    feedback: String.raw`Multiplicar por \(\frac14\) é dividir tudo por 4, inclusive depois da barra.`
  },
  {
    id: "pivot",
    phase: "Fase 3",
    title: "Pivô e escada",
    explain: "Pivô é o número de apoio. Escalonar é criar zeros abaixo dele, formando uma escada.",
    why: "Zeros abaixo do pivô deixam cada linha mais fácil de ler.",
    example: String.raw`Para zerar \(3\) abaixo do pivô \(1\), usamos \(L_2\leftarrow L_2-3L_1\).`,
    question: String.raw`Por que isso zera o \(3\)?`,
    choices: [String.raw`\(3-3\cdot1=0\)`, String.raw`\(3+3\cdot1=6\)`, String.raw`\(1-3=-2\)`],
    answer: 0,
    feedback: "O múltiplo foi escolhido para zerar exatamente o número abaixo do pivô."
  },
  {
    id: "classify",
    phase: "Fase 5",
    title: "Contradição",
    explain: String.raw`A linha \([0,\ 0,\ 0\ |\ 7]\) significa \(0=7\). Isso é impossível.`,
    why: "Nenhum valor das variáveis muda o lado esquerdo, porque todos os coeficientes são zero.",
    example: String.raw`No primeiro sistema da Lista 10 aparece \([0,\ 0,\ 0\ |\ 7]\).`,
    question: "Qual é a classificação?",
    choices: ["Solução única", "Nenhuma solução", "Infinitas"],
    answer: 1,
    feedback: "Contradição significa sistema sem solução."
  },
  {
    id: "free",
    phase: "Fase 5",
    title: "Variável livre",
    explain: "Variável livre é uma variável sem pivô. Sem contradição, ela pode receber um parâmetro.",
    why: "Cada valor do parâmetro gera uma solução diferente.",
    example: String.raw`\([0,\ 0,\ 0\ |\ 0]\) não prende variável. Ela só diz \(0=0\).`,
    question: String.raw`\([0,\ 0,\ 0\ |\ 0]\) sozinho prova infinitas?`,
    choices: ["Sim", "Não"],
    answer: 1,
    feedback: "Não sozinho. Precisa sobrar variável sem pivô."
  },
  {
    id: "homogeneous",
    phase: "Fase 6",
    title: "Homogêneo",
    explain: String.raw`Sistema homogêneo tem lado direito zero: \(A\vec{x}=\vec{0}\).`,
    why: "Tudo zero sempre funciona; por isso homogêneo nunca é impossível.",
    example: String.raw`Se \(\det(A)\neq0\), só existe a solução trivial.`,
    question: "Homogêneo pode ser sem solução?",
    choices: ["Sim", "Não"],
    answer: 1,
    feedback: String.raw`Não. \(\vec{x}=\vec{0}\) sempre resolve.`
  },
  {
    id: "parameters",
    phase: "Fase 7",
    title: "Parâmetros",
    explain: String.raw`Se aparece pivô \(k-2\), descubra quando ele zera antes de dividir.`,
    why: "Dividir por algo que pode ser zero apaga o caso especial.",
    example: String.raw`\(k-2=0\Rightarrow k=2\). Casos: \(k\neq2\) e \(k=2\).`,
    question: String.raw`Quando \(k-2\) zera?`,
    choices: [String.raw`\(k=2\)`, String.raw`\(k=-2\)`, String.raw`\(k\neq2\)`],
    answer: 0,
    feedback: String.raw`Certo. Só pode dividir por \(k-2\) no caso \(k\neq2\).`
  }
];

const diagnostic = [
  { target: "fund", q: String.raw`Em \(5x_1+12x_2+5x_3=-21\), o coeficiente de \(x_2\) é:`, c: ["12", "-21", "5"], a: 0 },
  { target: "fund", q: String.raw`O termo independente em \(3x_1+7x_2+2x_3=-19\) é:`, c: ["2", "-19", "7"], a: 1 },
  { target: "linear", q: String.raw`\(x_1+4x_3x_4=20\) é linear?`, c: ["Sim", "Não"], a: 1 },
  { target: "system", q: "Uma solução de sistema precisa satisfazer:", c: ["uma equação", "todas as equações", "só a última"], a: 1 },
  { target: "matrix", q: "Na matriz aumentada, a barra separa:", c: ["coeficientes e lado direito", "linhas e colunas", "pivôs e zeros"], a: 0 },
  { target: "spell-scale", q: String.raw`Transformar \(4y=8\) em \(y=2\) é:`, c: [String.raw`multiplicar por \(\frac14\)`, "multiplicar por 4", "multiplicar por 0"], a: 0 }
];

const lab = [
  {
    id: "scale",
    title: "Dividir por 4",
    matrix: String.raw`\[[0,\ 4\ |\ 8]\]`,
    q: "Qual operação transforma o 4 em 1?",
    choices: [
      { t: String.raw`\(L_2 \leftarrow 4L_2\)`, ok: false, f: String.raw`Falha: vira \([0,\ 16\ |\ 32]\). O 4 não vira 1.` },
      { t: String.raw`\(L_2 \leftarrow \frac{1}{4}L_2\)`, ok: true, f: String.raw`Certo: multiplicar por \(\frac14\) é dividir tudo por 4.` },
      { t: String.raw`\(L_2 \leftarrow 0L_2\)`, ok: false, f: "Falha: apaga a equação e destrói informação." }
    ]
  },
  {
    id: "swap",
    title: "Trocar linhas",
    matrix: String.raw`\[\left[\begin{array}{cc|c}0&2&8\\1&3&7\end{array}\right]\]`,
    q: "Como colocar pivô não nulo na primeira linha?",
    choices: [
      { t: String.raw`\(L_1\leftrightarrow L_2\)`, ok: true, f: "Certo: trocar a ordem das equações não muda as soluções." },
      { t: String.raw`\(L_1\leftarrow0L_1\)`, ok: false, f: "Falha: multiplicar por zero apaga a linha." },
      { t: String.raw`\(L_2\leftarrow L_2+L_1\)`, ok: false, f: "Falha: isso mistura linhas, mas não coloca o pivô no topo." }
    ]
  },
  {
    id: "zero3",
    title: "Zerar o 3",
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&2&-1&-10\\3&7&2&-19\end{array}\right]\]`,
    q: "Como zerar o 3 abaixo do pivô 1?",
    choices: [
      { t: String.raw`\(L_2\leftarrow L_2-3L_1\)`, ok: true, f: String.raw`Certo: \(3-3\cdot1=0\).` },
      { t: String.raw`\(L_2\leftarrow L_2+3L_1\)`, ok: false, f: String.raw`Falha: \(3+3\cdot1=6\), não zero.` },
      { t: String.raw`\(L_1\leftarrow L_1-3L_2\)`, ok: false, f: String.raw`Falha: quem tem o 3 é \(L_2\), então \(L_2\) deve mudar.` }
    ]
  }
];

const guided = [
  { id: "g1", title: "Montar matriz aumentada", body: String.raw`Sistema da Lista 10: coeficientes antes da barra, lado direito depois.`, math: String.raw`\[\left[\begin{array}{ccc|c}1&2&-1&-10\\3&7&2&-19\\5&12&5&-21\end{array}\right]\]`, q: "O que fica depois da barra?", c: ["coeficientes", "lado direito", "pivôs"], a: 1, f: "Depois da barra ficam os termos independentes." },
  { id: "g2", title: "Escolher pivô", body: "O primeiro pivô é o 1 no canto superior esquerdo. Ele zera 3 e 5 abaixo.", math: String.raw`\[1,\quad 3,\quad 5\]`, q: "Para zerar o 3, queremos:", c: [String.raw`\(3-3\cdot1=0\)`, String.raw`\(3+3\cdot1=6\)`, String.raw`\(1-3=-2\)`], a: 0, f: String.raw`Por isso usamos \(L_2\leftarrow L_2-3L_1\).` },
  { id: "g3", title: String.raw`Calcular \(3L_1\)`, body: "Multiplicamos a linha do pivô por 3 para poder subtrair da linha 2.", math: String.raw`\[3[1,\ 2,\ -1\ |\ -10]=[3,\ 6,\ -3\ |\ -30]\]`, q: "De onde veio -30?", c: [String.raw`\(3\cdot(-10)\)`, String.raw`\(3-10\)`, String.raw`\(-19-11\)`], a: 0, f: "O lado direito também é multiplicado." },
  { id: "g4", title: String.raw`Calcular \(L_2-3L_1\)`, body: "Subtraia posição por posição, inclusive depois da barra.", math: String.raw`\[[3,\ 7,\ 2\ |\ -19]-[3,\ 6,\ -3\ |\ -30]=[0,\ 1,\ 5\ |\ 11]\]`, q: "De onde veio 11?", c: [String.raw`\(-19-(-30)\)`, String.raw`\(-19-30\)`, String.raw`\(7-6\)`], a: 0, f: "A barra não impede a operação." },
  { id: "g5", title: "Zerar o 5", body: "Agora zeramos o 5 abaixo do mesmo pivô.", math: String.raw`\[L_3\leftarrow L_3-5L_1\]`, q: "Por que usar 5?", c: [String.raw`\(5-5\cdot1=0\)`, String.raw`\(5+5=10\)`, "porque é a linha 5"], a: 0, f: "O número abaixo do pivô decide o múltiplo." },
  { id: "g6", title: String.raw`Calcular \(L_3-5L_1\)`, body: "Conta completa na linha inteira.", math: String.raw`\[[5,\ 12,\ 5\ |\ -21]-[5,\ 10,\ -5\ |\ -50]=[0,\ 2,\ 10\ |\ 29]\]`, q: "Por que o lado direito é 29?", c: [String.raw`\(-21-(-50)\)`, String.raw`\(-21-50\)`, String.raw`\(12-10\)`], a: 0, f: "De novo: lado direito participa." },
  { id: "g7", title: "Segundo pivô", body: "O pivô da segunda coluna é 1. O 2 abaixo dele precisa virar zero.", math: String.raw`\[L_3\leftarrow L_3-2L_2\]`, q: "Qual linha muda?", c: [String.raw`\(L_2\)`, String.raw`\(L_3\)`, "as duas"], a: 1, f: "A linha antes da seta é substituída." },
  { id: "g8", title: "A linha final", body: "A conta final revela uma contradição.", math: String.raw`\[[0,\ 2,\ 10\ |\ 29]-2[0,\ 1,\ 5\ |\ 11]=[0,\ 0,\ 0\ |\ 7]\]`, q: "Isso significa:", c: [String.raw`\(0=7\)`, String.raw`\(7=7\)`, "variável livre"], a: 0, f: "Como 0 não é 7, o sistema é impossível." }
];

const bossSets = {
  matrix: {
    title: "Boss 1: Matriz aumentada",
    medal: "bar",
    qs: [
      q(String.raw`Linha de \(x_1+2x_2-x_3=-10\):`, [String.raw`\([1,\ 2,\ -1\ |\ -10]\)`, String.raw`\([1,\ 2,\ -10\ |\ -1]\)`, String.raw`\([-10,\ 1,\ 2\ |\ -1]\)`], 0, "Revise matriz aumentada."),
      q(String.raw`O número depois da barra é:`, ["coeficiente", "termo independente", "pivô"], 1, "Revise lado direito."),
      q(String.raw`Linha de \(5x_1+12x_2+5x_3=-21\):`, [String.raw`\([5,\ 12,\ 5\ |\ -21]\)`, String.raw`\([5,\ 12,\ -21\ |\ 5]\)`, String.raw`\([-21,\ 5,\ 12\ |\ 5]\)`], 0, "Revise coeficientes."),
      q("A matriz dos coeficientes inclui o lado direito?", ["sim", "não"], 1, "Revise diferença entre \(A\) e \([A|b]\)."),
      q(String.raw`Na linha \([0,\ 4\ |\ 8]\), o 8 é:`, ["coeficiente", "termo independente", "pivô"], 1, "Revise a barra.")
    ]
  },
  rows: {
    title: "Boss 2: Operações de linha",
    medal: "auror",
    qs: [
      q("Qual operação divide uma linha por 4?", [String.raw`\(L_i\leftarrow4L_i\)`, String.raw`\(L_i\leftarrow\frac14L_i\)`, String.raw`\(L_i\leftarrow0L_i\)`], 1, "Revise multiplicação por constante."),
      q(String.raw`Por que \(L_2-3L_1\) zera 3?`, [String.raw`\(3-3\cdot1=0\)`, String.raw`\(3+3=6\)`, "porque troca linhas"], 0, "Revise pivô."),
      q("Multiplicar por zero é:", ["permitido", "proibido", "obrigatório"], 1, "Revise operações legais."),
      q(String.raw`Em \(L_3\leftarrow L_3-2L_2\), qual linha muda?`, [String.raw`\(L_2\)`, String.raw`\(L_3\)`, "as duas"], 1, "Revise a seta."),
      q("A operação passa pelo lado direito?", ["sim", "não"], 0, "Revise linha inteira.")
    ]
  },
  classify: {
    title: "Boss 3: Classificador",
    medal: "zeroSeven",
    qs: [
      q(String.raw`\([0,0,0|7]\) indica:`, ["única", "nenhuma", "infinitas"], 1, "Revise contradição."),
      q("Sem contradição e com variável sem pivô:", ["única", "nenhuma", "infinitas"], 2, "Revise variável livre."),
      q("Pivô em todas as variáveis:", ["única", "nenhuma", "infinitas"], 0, "Revise pivôs."),
      q(String.raw`\([0,0,0|0]\) é contradição?`, ["sim", "não"], 1, "Revise \(0=0\)."),
      q("Variável livre aparece quando falta:", ["pivô", "barra", "termo independente"], 0, "Revise pivô.")
    ]
  },
  homogeneous: {
    title: "Boss 4: Homogêneos",
    medal: "patrono",
    qs: [
      q("Homogêneo tem lado direito:", ["zero", "um", "qualquer"], 0, "Revise homogêneos."),
      q("Homogêneo pode ser impossível?", ["sim", "não"], 1, "Revise solução trivial."),
      q(String.raw`Se \(\det(A)\neq0\):`, ["só trivial", "nenhuma", "sempre infinitas"], 0, "Revise determinante."),
      q("A solução trivial é:", [String.raw`\(\vec{x}=\vec{0}\)`, String.raw`\(\vec{x}=\vec{1}\)`, "sem solução"], 0, "Revise trivial."),
      q(String.raw`Se \(\det(A)=0\) em homogêneo quadrado, pode haver:`, ["não triviais", "contradição obrigatória", "lado direito 7"], 0, "Revise determinante zero.")
    ]
  },
  params: {
    title: "Boss 5: Parâmetros",
    medal: "params",
    qs: [
      q(String.raw`Quando \(k-2\) zera?`, [String.raw`\(k=2\)`, String.raw`\(k=-2\)`, String.raw`\(k\neq2\)`], 0, "Revise casos."),
      q(String.raw`Antes de dividir por \(m+1\), separe:`, [String.raw`\(m=-1\) e \(m\neq-1\)`, String.raw`\(m=1\) e \(m\neq1\)`, "não precisa"], 0, "Revise parâmetro."),
      q("Dividir direto por parâmetro pode:", ["apagar caso especial", "garantir solução", "criar pivô"], 0, "Revise divisão por zero."),
      q(String.raw`No caso \(k\neq2\), \(k-2\) é:`, ["não nulo", "zero", "sempre negativo"], 0, "Revise caso não nulo."),
      q(String.raw`No caso \(k=2\), você deve:`, ["substituir e analisar", "dividir por zero", "ignorar"], 0, "Revise caso especial.")
    ]
  },
  mixed: {
    title: "Boss fight Lista 11",
    medal: "boss",
    qs: []
  }
};
bossSets.mixed.qs = [
  ...bossSets.matrix.qs.slice(0, 2),
  ...bossSets.rows.qs.slice(0, 2),
  ...bossSets.classify.qs.slice(0, 2),
  ...bossSets.homogeneous.qs.slice(0, 2),
  ...bossSets.params.qs.slice(0, 2)
];

function q(prompt, choices, answer, review) {
  return { prompt, choices, answer, review };
}

function home() {
  screen = { mode: "home", index: 0, boss: "mixed", score: 0, errors: [] };
  const next = nextMission();
  const locked = !state.bossUnlocked;
  setStage(`
    <section class="stack">
      <div class="hero">
        <img src="assets/study-map-banner.png" alt="">
        <div class="hero-content">
          <p class="eyebrow">Tutor gamificado</p>
          <h1>Sistemas Lineares</h1>
        </div>
      </div>
      <div class="menu-grid">
        ${menuButton("Continuar jornada", next.label, "continue")}
        ${menuButton("Começar do zero", "Fase 0: fundamentos mínimos", "journey")}
        ${menuButton("Laboratório de operações de linha", "Treino de feitiços legais", "lab")}
        ${menuButton("Exemplo guiado Lista 10", "Sistema impossível passo a passo", "guided")}
        ${menuButton("Duelos rápidos", "Bosses curtos por assunto", "duels")}
        ${menuButton("Câmara dos Parâmetros", "Separar casos sem pânico", "params")}
        ${menuButton("Boss fight Lista 11", locked ? "Bloqueado: ganhe 140 XP ou conclua o exemplo" : "Mistão final liberado", "finalBoss", locked)}
        ${menuButton("Grimório / consulta rápida", "Notações, regras e checklist", "grimoire")}
      </div>
      <button class="secondary" data-mode="diagnostic">Chapéu Seletor opcional</button>
      <div class="medal-list">${Object.entries(medals).map(([key, label]) => `<div class="medal ${state.medals.includes(key) ? "earned" : ""}">${label}</div>`).join("")}</div>
    </section>
  `);
}

function menuButton(title, sub, mode, locked = false) {
  return `<button class="game-button ${locked ? "locked" : ""}" data-mode="${mode}" ${locked ? "data-locked='boss'" : ""}><strong>${title}</strong><small>${sub}</small></button>`;
}

function nextMission() {
  const item = phases.find((phase) => !state.completed.includes(phase.id));
  if (item) return { label: `${item.phase}: ${item.title}`, mode: "journey" };
  if (!state.completed.includes("guided")) return { label: "Exemplo guiado Lista 10", mode: "guided" };
  if (!state.bossUnlocked) return { label: "Ganhe XP no laboratório", mode: "lab" };
  return { label: "Boss fight Lista 11", mode: "finalBoss" };
}

function renderMission(mode, data, index, total, options = {}) {
  const progress = Math.round(((index + 1) / total) * 100);
  const whyId = `why-${data.id || index}`;
  setStage(`
    <section class="micro">
      <div class="module-header">
        <span class="pill">${options.kicker || data.phase || "Missão"}</span>
        <h2>${data.title}</h2>
        <div class="bar"><span style="width:${progress}%"></span></div>
      </div>
      <p>${data.explain || data.body}</p>
      ${data.example || data.math ? `<div class="math-box">${data.example || data.math}</div>` : ""}
      <div class="choices">
        <p><strong>${data.question || data.q}</strong></p>
        ${(data.choices || data.c).map((choice, i) => `<button class="choice" data-answer="${i}">${choice}</button>`).join("")}
      </div>
      <button class="secondary" data-why="${whyId}">Por quê?</button>
      <div id="${whyId}" class="feedback">${data.why || "A técnica só entra depois de traduzir o objetivo em português simples."}</div>
      <div id="feedback" class="feedback"></div>
      <div class="actions">
        <button class="primary" data-next="${mode}">${index === total - 1 ? (options.doneLabel || "Concluir") : "Próximo"}</button>
        <button class="secondary" data-repeat="${mode}">Treinar de novo</button>
      </div>
    </section>
  `);
}

function journey(index = 0) {
  screen = { mode: "journey", index, boss: "mixed", score: 0, errors: [] };
  renderMission("journey", phases[index], index, phases.length, { doneLabel: "Voltar ao menu" });
}

function diagnosticMode(index = 0, score = 0, misses = []) {
  screen = { mode: "diagnostic", index, score, errors: misses };
  const item = diagnostic[index];
  setStage(`
    <section class="micro">
      <div class="module-header">
        <span class="pill">Chapéu Seletor</span>
        <h2>Diagnóstico opcional</h2>
        <div class="bar"><span style="width:${((index + 1) / diagnostic.length) * 100}%"></span></div>
      </div>
      <p>Responda para calibrar a rota. Isso não bloqueia nenhum módulo.</p>
      <div class="choices">
        <p><strong>${item.q}</strong></p>
        ${item.c.map((choice, i) => `<button class="choice" data-answer="${i}">${choice}</button>`).join("")}
      </div>
      <div id="feedback" class="feedback"></div>
      <div class="actions">
        <button class="primary" data-next="diagnostic">Próxima</button>
        <button class="secondary" data-mode="home">Sair</button>
      </div>
    </section>
  `);
}

function diagnosticResult(score, misses) {
  const perfect = score === diagnostic.length;
  if (perfect) state.bossUnlocked = true;
  state.diagnostic = { score, misses, date: new Date().toISOString() };
  saveState();
  const recommendations = misses.length
    ? [...new Set(misses)].map((id) => phases.find((p) => p.id === id)).filter(Boolean)
    : [];
  setStage(`
    <section class="panel stack">
      <span class="pill">${score}/${diagnostic.length}</span>
      <h2>${perfect ? "Você não precisa do tutorial básico." : "Rota calibrada"}</h2>
      <p>${perfect ? "Atalhos avançados liberados. Revise fundamentos só se quiser." : "Sugestões de microaula, sem bloquear o resto do app."}</p>
      <div class="actions">
        <button class="primary" data-mode="${perfect ? "lab" : "journey"}">${perfect ? "Pular para Laboratório" : "Revisar sugeridos"}</button>
        <button class="secondary" data-mode="finalBoss">Ir ao Boss</button>
        <button class="secondary" data-mode="home">Menu</button>
      </div>
      ${recommendations.length ? `<div class="mission-list">${recommendations.map((r) => `<button class="game-button" data-jump="${r.id}"><strong>${r.title}</strong><small>${r.phase}</small></button>`).join("")}</div>` : ""}
    </section>
  `);
}

function labMode(index = 0) {
  screen = { mode: "lab", index, boss: "mixed", score: 0, errors: [] };
  const item = lab[index];
  setStage(`
    <section class="micro">
      <div class="module-header">
        <span class="pill">Laboratório</span>
        <h2>${item.title}</h2>
        <div class="bar"><span style="width:${((index + 1) / lab.length) * 100}%"></span></div>
      </div>
      <div class="math-box">${item.matrix}</div>
      <div class="choices">
        <p><strong>${item.q}</strong></p>
        ${item.choices.map((choice, i) => `<button class="choice" data-lab="${i}">${choice.t}</button>`).join("")}
      </div>
      <div id="feedback" class="feedback"></div>
      <div class="actions">
        <button class="primary" data-next="lab">${index === lab.length - 1 ? "Concluir lab" : "Próximo treino"}</button>
        <button class="secondary" data-repeat="lab">Treinar de novo</button>
      </div>
    </section>
  `);
}

function guidedMode(index = 0) {
  screen = { mode: "guided", index, boss: "mixed", score: 0, errors: [] };
  const item = guided[index];
  renderMission("guided", {
    id: item.id,
    title: item.title,
    explain: item.body,
    example: item.math,
    question: item.q,
    choices: item.c,
    answer: item.a,
    feedback: item.f,
    why: "Objetivo, operação, motivo e conta ficam juntos para a resolução não pular o porquê."
  }, index, guided.length, { kicker: "Lista 10", doneLabel: "Concluir exemplo" });
}

function duels() {
  screen = { mode: "duels", index: 0, boss: "mixed", score: 0, errors: [] };
  setStage(`
    <section class="stack">
      <div class="panel stack">
        <span class="pill">Duelos rápidos</span>
        <h2>Escolha um boss curto</h2>
        <p>Cada boss tem feedback imediato e recomenda revisão pelo tipo de erro.</p>
      </div>
      <div class="boss-grid">
        ${Object.entries(bossSets).filter(([key]) => key !== "mixed").map(([key, boss]) => `<button class="game-button" data-boss="${key}"><strong>${boss.title}</strong><small>${boss.qs.length} perguntas</small></button>`).join("")}
      </div>
    </section>
  `);
}

function bossMode(key = "mixed", index = 0, score = 0, errors = []) {
  if (key === "mixed" && !state.bossUnlocked) {
    setStage(`
      <section class="panel stack">
        <span class="pill">Boss bloqueado</span>
        <h2>Treine um pouco antes.</h2>
        <p>Ganhe 140 XP ou conclua o exemplo guiado da Lista 10 para liberar o boss final.</p>
        <button class="primary" data-mode="lab">Ir ao laboratório</button>
      </section>
    `);
    return;
  }
  const set = bossSets[key];
  screen = { mode: key === "mixed" ? "finalBoss" : "boss", index, boss: key, score, errors };
  const item = set.qs[index];
  setStage(`
    <section class="micro">
      <div class="module-header">
        <span class="pill">Pontuação ${score}/${set.qs.length}</span>
        <h2>${set.title}</h2>
        <div class="bar"><span style="width:${((index + 1) / set.qs.length) * 100}%"></span></div>
      </div>
      <div class="choices">
        <p><strong>${item.prompt}</strong></p>
        ${item.choices.map((choice, i) => `<button class="choice" data-boss-answer="${i}">${choice}</button>`).join("")}
      </div>
      <div id="feedback" class="feedback"></div>
      <div class="actions">
        <button class="primary" data-next="boss">${index === set.qs.length - 1 ? "Ver desempenho" : "Próxima pergunta"}</button>
        <button class="secondary" data-repeat="boss">Treinar de novo</button>
      </div>
    </section>
  `);
}

function bossResult() {
  const set = bossSets[screen.boss];
  const passed = screen.score >= Math.ceil(set.qs.length * 0.75);
  if (passed) award(set.medal);
  if (screen.boss === "mixed" && passed) award("boss");
  addXp(passed ? 40 : 15, passed ? "boss vencido" : "treino registrado");
  const recs = [...new Set(screen.errors)];
  setStage(`
    <section class="panel stack">
      <span class="pill">${screen.score}/${set.qs.length}</span>
      <h2>${passed ? "Boss vencido" : "Ainda dá para fortalecer"}</h2>
      <p>${passed ? "Você justificou bem as decisões." : "Revise os pontos abaixo e tente de novo."}</p>
      ${recs.length ? `<div class="mission-list">${recs.map((r) => `<div class="mission-card"><strong>${r}</strong></div>`).join("")}</div>` : ""}
      <div class="actions">
        <button class="primary" data-boss="${screen.boss}">Treinar de novo</button>
        <button class="secondary" data-mode="home">Menu</button>
      </div>
    </section>
  `);
}

function paramsMode() {
  const index = phases.findIndex((p) => p.id === "parameters");
  journey(index);
}

function grimoire() {
  screen = { mode: "grimoire", index: 0, boss: "mixed", score: 0, errors: [] };
  const cards = [
    ["Notação", String.raw`<ul><li>\(L_i\): linha \(i\).</li><li>\([A|b]\): coeficientes com lado direito.</li></ul>`],
    ["Operações elementares", String.raw`<ul><li>\(L_i\leftrightarrow L_j\): troca linhas.</li><li>\(L_i\leftarrow cL_i\), \(c\neq0\): multiplica linha.</li><li>\(L_i\leftarrow L_i+cL_j\): soma múltiplo.</li></ul>`],
    ["Pivô", "<ul><li>Número de apoio.</li><li>Serve para zerar abaixo dele.</li><li>Escalonar cria uma escada.</li></ul>"],
    ["Matriz aumentada", "<ul><li>Coeficientes antes da barra.</li><li>Lado direito depois da barra.</li><li>A operação atravessa a linha inteira.</li></ul>"],
    ["Classificação", String.raw`<ul><li>Pivô em todas: única.</li><li>\([0,0,0|c]\), \(c\neq0\): nenhuma.</li><li>Sem contradição e variável livre: infinitas.</li></ul>`],
    ["Homogêneos", String.raw`<ul><li>Lado direito zero.</li><li>Sempre tem solução trivial.</li><li>\(\det(A)\neq0\): só trivial.</li></ul>`],
    ["Parâmetros", String.raw`<ul><li>Antes de dividir por \(k-2\), separe \(k=2\) e \(k\neq2\).</li><li>Nunca divida por algo que pode ser zero.</li></ul>`],
    ["Checklist", "<ul><li>Copiei o lado direito?</li><li>Mexi depois da barra?</li><li>Há contradição?</li><li>Há variável livre?</li></ul>"]
  ];
  setStage(`
    <section class="stack">
      <div class="panel stack"><span class="pill">Consulta</span><h2>Grimório</h2><p>Texto longo fica aqui, fora da jornada principal.</p></div>
      <div class="grimoire-grid">${cards.map(([title, body]) => `<article class="grimoire-card"><h3>${title}</h3>${body}</article>`).join("")}</div>
      <button class="primary" data-mode="checklist">Checklist anti-vacilo</button>
    </section>
  `);
}

function checklist() {
  screen = { mode: "checklist", index: 0, boss: "mixed", score: 0, errors: [] };
  const items = [
    "Li o sistema direito?",
    "Montei a matriz aumentada?",
    "Copiei o lado direito?",
    "Escolhi pivô?",
    "Zerei abaixo do pivô?",
    "Fiz a conta depois da barra?",
    String.raw`Apareceu \(0=7\)?`,
    "Sobrou variável sem pivô?",
    "É homogêneo?",
    "Tem parâmetro?",
    "Dividi por algo que pode ser zero?"
  ];
  setStage(`
    <section class="panel stack">
      <span class="pill">Patrono anti-vacilo</span>
      <h2>Checklist final</h2>
      <div class="bar"><span id="checkBar"></span></div>
      <div class="checklist">${items.map((item) => `<label><input type="checkbox"> ${item}</label>`).join("")}</div>
      <button class="primary" data-complete-check>Registrar checklist</button>
    </section>
  `);
}

function answer(selected) {
  const item = screen.mode === "journey" ? phases[screen.index]
    : screen.mode === "guided" ? guided[screen.index]
      : screen.mode === "diagnostic" ? diagnostic[screen.index]
        : null;
  if (!item) return;
  const correct = selected === (item.answer ?? item.a);
  markChoices(selected, item.answer ?? item.a);
  const fb = $("#feedback");
  if (screen.mode === "diagnostic") {
    if (correct) screen.score += 1;
    else screen.errors.push(item.target);
    fb.innerHTML = correct ? "Acertou." : "Quase. Vou recomendar revisão, sem bloquear nada.";
  } else {
    fb.innerHTML = `${correct ? addXp(10, "missão") : "Ainda não."} ${correct ? (item.feedback || item.f) : (item.feedback || item.f)}`;
    correct ? complete(item.id) : miss();
  }
  fb.className = `feedback show ${correct ? "success" : "danger"}`;
  typeset();
}

function answerLab(selected) {
  const item = lab[screen.index];
  const choice = item.choices[selected];
  markChoices(selected, item.choices.findIndex((c) => c.ok), "[data-lab]");
  if (choice.ok) {
    state.labCorrect += 1;
    addXp(12, "laboratório");
    complete(`lab-${item.id}`);
  } else {
    miss();
  }
  $("#feedback").innerHTML = choice.f;
  $("#feedback").className = `feedback show ${choice.ok ? "success" : "danger"}`;
  typeset();
}

function answerBoss(selected) {
  const set = bossSets[screen.boss];
  const item = set.qs[screen.index];
  const correct = selected === item.answer;
  markChoices(selected, item.answer, "[data-boss-answer]");
  if (correct) screen.score += 1;
  else screen.errors.push(item.review);
  $("#feedback").innerHTML = correct ? "Acertou. Boa decisão." : `Ainda não. ${item.review}`;
  $("#feedback").className = `feedback show ${correct ? "success" : "danger"}`;
  typeset();
}

function markChoices(selected, answer, selector = "[data-answer]") {
  $$(selector).forEach((btn) => {
    btn.disabled = true;
    const value = Number(btn.dataset.answer ?? btn.dataset.lab ?? btn.dataset.bossAnswer);
    if (value === answer) btn.classList.add("correct");
    if (value === selected && value !== answer) btn.classList.add("wrong");
  });
}

function next(kind) {
  if (kind === "journey") {
    if (screen.index >= phases.length - 1) return home();
    return journey(screen.index + 1);
  }
  if (kind === "diagnostic") {
    if (screen.index >= diagnostic.length - 1) return diagnosticResult(screen.score, screen.errors);
    return diagnosticMode(screen.index + 1, screen.score, screen.errors);
  }
  if (kind === "lab") {
    if (screen.index >= lab.length - 1) return home();
    return labMode(screen.index + 1);
  }
  if (kind === "guided") {
    if (screen.index >= guided.length - 1) {
      complete("guided");
      state.bossUnlocked = true;
      saveState();
      return home();
    }
    return guidedMode(screen.index + 1);
  }
  if (kind === "boss") {
    const total = bossSets[screen.boss].qs.length;
    if (screen.index >= total - 1) return bossResult();
    return bossMode(screen.boss, screen.index + 1, screen.score, screen.errors);
  }
}

function repeat(kind) {
  if (kind === "journey") return journey(screen.index);
  if (kind === "lab") return labMode(screen.index);
  if (kind === "guided") return guidedMode(screen.index);
  if (kind === "boss") return bossMode(screen.boss, screen.index, screen.score, screen.errors);
}

function route(mode) {
  if (mode === "home") return home();
  if (mode === "continue") {
    const next = nextMission();
    return route(next.mode);
  }
  if (mode === "journey") return journey(0);
  if (mode === "diagnostic") return diagnosticMode(0, 0, []);
  if (mode === "lab") return labMode(0);
  if (mode === "guided") return guidedMode(0);
  if (mode === "duels") return duels();
  if (mode === "params") return paramsMode();
  if (mode === "finalBoss") return bossMode("mixed", 0, 0, []);
  if (mode === "grimoire") return grimoire();
  if (mode === "checklist") return checklist();
}

document.addEventListener("click", (event) => {
  const locked = event.target.closest("[data-locked]");
  if (locked) {
    setStage(`<section class="panel stack"><span class="pill">Bloqueado</span><h2>Ganhe alguns treinos primeiro.</h2><p>Libere o boss com 140 XP ou concluindo o exemplo guiado da Lista 10.</p><button class="primary" data-mode="lab">Ir ao laboratório</button></section>`);
    return;
  }

  const mode = event.target.closest("[data-mode]");
  if (mode) return route(mode.dataset.mode);

  const action = event.target.closest("[data-action]");
  if (action?.dataset.action === "home") return home();

  const ans = event.target.closest("[data-answer]");
  if (ans) return answer(Number(ans.dataset.answer));

  const labAns = event.target.closest("[data-lab]");
  if (labAns) return answerLab(Number(labAns.dataset.lab));

  const bossAns = event.target.closest("[data-boss-answer]");
  if (bossAns) return answerBoss(Number(bossAns.dataset.bossAnswer));

  const nextBtn = event.target.closest("[data-next]");
  if (nextBtn) return next(nextBtn.dataset.next);

  const repeatBtn = event.target.closest("[data-repeat]");
  if (repeatBtn) return repeat(repeatBtn.dataset.repeat);

  const why = event.target.closest("[data-why]");
  if (why) {
    const panel = document.getElementById(why.dataset.why);
    panel.classList.toggle("show");
    return;
  }

  const boss = event.target.closest("[data-boss]");
  if (boss) return bossMode(boss.dataset.boss, 0, 0, []);

  const jump = event.target.closest("[data-jump]");
  if (jump) {
    const index = phases.findIndex((phase) => phase.id === jump.dataset.jump);
    return journey(Math.max(index, 0));
  }

  if (event.target.closest("[data-complete-check]")) {
    state.checklistDone = true;
    complete("checklist");
    addXp(20, "checklist");
    $("#feedback")?.remove();
    setStage(`<section class="panel stack"><span class="pill">Medalha</span><h2>Patrono Anti-Vacilo registrado.</h2><p>Checklist feito. Agora volte ao exercício com menos chance de erro bobo.</p><button class="primary" data-mode="home">Menu</button></section>`);
  }
});

document.addEventListener("change", (event) => {
  if (!event.target.matches(".checklist input")) return;
  const boxes = $$(".checklist input");
  const done = boxes.filter((box) => box.checked).length;
  $("#checkBar").style.width = `${(done / boxes.length) * 100}%`;
});

home();
renderHud();
