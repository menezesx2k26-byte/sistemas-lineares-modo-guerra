const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const STORAGE_KEY = "sl-game-v2";

const medals = {
  bar: "Copiou a barra direito",
  auror: "Auror das Linhas",
  patrono: "Patrono Anti-Vacilo",
  zeroSeven: "Sobreviveu ao 0=7",
  params: "Mestre dos Parâmetros",
  infinite: "Treinou sem decorar",
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
  stats: { mistakes: {}, seen: {} }
};

let state = loadState();
let screen = { mode: "home", index: 0, boss: "mixed", score: 0, errors: [], item: null };

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...defaultState, ...saved, stats: { ...defaultState.stats, ...(saved.stats || {}) } };
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

function miss(skill = "revisão geral") {
  state.streak = 0;
  state.stats.mistakes[skill] = (state.stats.mistakes[skill] || 0) + 1;
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

function enableNextButtons() {
  $$("[data-next]").forEach((btn) => {
    btn.disabled = false;
  });
}

function sourceChip(item) {
  const origin = item.origin || item.origem;
  const skill = item.skill || item.habilidade;
  return `<div class="meta-row">${origin ? `<span class="source-chip">${origin}</span>` : ""}${skill ? `<span class="source-chip soft">${skill}</span>` : ""}${item.difficulty ? `<span class="source-chip soft">nível ${item.difficulty}</span>` : ""}</div>`;
}

function solutionBlock(item, label = "Ver conta inteira") {
  if (!item.solution && !item.resolution) return "";
  return `<details class="solution"><summary>${label}</summary><div>${item.solution || item.resolution}</div></details>`;
}

function topMistakes() {
  return Object.entries(state.stats.mistakes || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function fmt(n) {
  if (typeof n === "string") return n;
  if (Math.abs(n) < 1e-9) return "0";
  if (Number.isInteger(n)) return String(n);
  const sign = n < 0 ? "-" : "";
  const x = Math.abs(n);
  const denominators = [2, 3, 4, 5, 6, 8, 10];
  for (const d of denominators) {
    const num = Math.round(x * d);
    if (Math.abs(x - num / d) < 1e-9) return `${sign}\\frac{${num}}{${d}}`;
  }
  return String(Number(n.toFixed(2)));
}

function rowTex(row) {
  const left = row.slice(0, -1).map(fmt).join(",\\ ");
  return `\\([${left}\\ |\\ ${fmt(row[row.length - 1])}]\\)`;
}

function rowBareTex(row) {
  const left = row.slice(0, -1).map(fmt).join(",\\ ");
  return `[${left}\\ |\\ ${fmt(row[row.length - 1])}]`;
}

function matrixTex(rows) {
  const vars = rows[0].length - 1;
  const spec = "c".repeat(vars) + "|c";
  return String.raw`\[\left[\begin{array}{${spec}}${rows.map((row) => row.map(fmt).join("&")).join("\\\\")}\end{array}\right]\]`;
}

function scaleRow(row, c) {
  return row.map((x) => x * c);
}

function subRows(a, b) {
  return a.map((x, i) => x - b[i]);
}

function addRows(a, b) {
  return a.map((x, i) => x + b[i]);
}

function q({
  id,
  tipo = "conceito",
  origin = "Gerada",
  difficulty = 1,
  prompt,
  choices,
  answer,
  feedbacks,
  correct,
  solution,
  skill,
  review,
  ...rest
}) {
  return {
    ...rest,
    id,
    tipo,
    origin,
    difficulty,
    prompt,
    choices,
    answer,
    feedbacks,
    correct: correct || "Certo. A decisão bate com a conta.",
    solution,
    skill,
    review: review || skill || "Revisar o conceito correspondente."
  };
}

function fullResolution({ objective, operation, reason, account, result, interpretation, trap }) {
  return `
    <p><strong>Objetivo:</strong> ${objective}</p>
    <p><strong>Operação escolhida:</strong> ${operation}</p>
    <p><strong>Motivo:</strong> ${reason}</p>
    <p><strong>Conta:</strong> ${account}</p>
    <p><strong>Resultado:</strong> ${result}</p>
    <p><strong>Interpretação:</strong> ${interpretation}</p>
    ${trap ? `<p><strong>Armadilha:</strong> ${trap}</p>` : ""}
  `;
}

function labItem({ id, title, origin = "Gerada", difficulty = 1, skill, matrix, q: prompt, choices, why, solution }) {
  return { id, title, origin, difficulty, skill, matrix, q: prompt, choices, why, solution };
}

function dividePivotLab(id, line, row, pivotIndex, origin = "Gerada") {
  const pivot = row[pivotIndex];
  const result = row.map((x) => x / pivot);
  return labItem({
    id,
    title: `Dividir ${line} por ${pivot}`,
    origin,
    difficulty: 1,
    skill: "dividir linha",
    matrix: String.raw`\[${rowBareTex(row)}\rightarrow ${rowBareTex(result)}\]`,
    q: `Qual operação deixa o pivô ${pivot} virar 1?`,
    choices: [
      { t: String.raw`\(L_${line}\leftarrow ${pivot}L_${line}\)`, ok: false, f: String.raw`Isso multiplica. O pivô vira \(${pivot}\cdot${pivot}\), não \(1\).` },
      { t: String.raw`\(L_${line}\leftarrow \frac{1}{${pivot}}L_${line}\)`, ok: true, f: String.raw`Certo: multiplicar por \(\frac{1}{${pivot}}\) é dividir a linha inteira por ${pivot}.` },
      { t: String.raw`\(L_${line}\leftarrow 0L_${line}\)`, ok: false, f: "Inválida: multiplicar por zero apaga a equação e destrói informação." }
    ],
    why: String.raw`O número veio do inverso do pivô: para transformar \(${pivot}\) em \(1\), fazemos \(${pivot}\cdot\frac{1}{${pivot}}=1\).`,
    solution: fullResolution({
      objective: `fazer o pivô ${pivot} virar 1`,
      operation: String.raw`\(L_${line}\leftarrow \frac{1}{${pivot}}L_${line}\)`,
      reason: String.raw`dividir por ${pivot} é multiplicar por \(\frac{1}{${pivot}}\)`,
      account: String.raw`\(\frac{1}{${pivot}}${rowBareTex(row)}=${rowBareTex(result)}\)`,
      result: rowTex(result),
      interpretation: "a equação ficou equivalente, só escrita com o pivô normalizado.",
      trap: "a operação vale para a linha inteira, inclusive depois da barra."
    })
  });
}

function multiplyLab(id, line, row, c) {
  const result = scaleRow(row, c);
  return labItem({
    id,
    title: `Multiplicar ${line} por ${c}`,
    difficulty: 1,
    skill: "multiplicar linha",
    matrix: String.raw`\[${c}${rowBareTex(row)}=?\]`,
    q: `Qual é o resultado de ${c} vezes a linha?`,
    choices: [
      { t: rowTex(result), ok: true, f: `Certo: todos os termos foram multiplicados por ${c}.` },
      { t: rowTex([...result.slice(0, -1), row[row.length - 1]]), ok: false, f: "Esse é o erro clássico: esqueceu de multiplicar o lado direito depois da barra." },
      { t: rowTex(row.map((x, i) => i === 0 ? x * c : x)), ok: false, f: "Você mexeu só no primeiro termo. Operação de linha mexe na linha inteira." }
    ],
    why: `O ${c} veio da operação pedida. Ele multiplica cada entrada da linha, não só a primeira.`,
    solution: fullResolution({
      objective: `calcular ${c} vezes a linha inteira`,
      operation: String.raw`\(L_${line}\leftarrow ${c}L_${line}\)`,
      reason: "multiplicação por constante não nula preserva o conjunto de soluções.",
      account: String.raw`\(${c}${rowBareTex(row)}=${rowBareTex(result)}\)`,
      result: rowTex(result),
      interpretation: "a nova linha representa a mesma equação multiplicada por um número não nulo.",
      trap: "não deixe o termo depois da barra parado."
    })
  });
}

function invalidZeroLab(id, line, row) {
  return labItem({
    id,
    title: "Feitiço proibido: zero",
    difficulty: 1,
    skill: "operação inválida",
    matrix: rowTex(row),
    q: "Qual operação é inválida?",
    choices: [
      { t: String.raw`\(L_${line}\leftarrow 0L_${line}\)`, ok: true, f: "Certo: isso transforma a linha em tudo zero e perde a equação original." },
      { t: String.raw`\(L_${line}\leftarrow -2L_${line}\)`, ok: false, f: "Essa é permitida: \(-2\neq0\), então a informação não é apagada." },
      { t: String.raw`\(L_${line}\leftarrow L_${line}+3L_1\)`, ok: false, f: "Essa é permitida: somar múltiplo de outra linha preserva as soluções." }
    ],
    why: "O zero é perigoso porque transforma qualquer equação em 0=0, apagando restrições.",
    solution: fullResolution({
      objective: "identificar uma operação elementar que não é legal",
      operation: String.raw`\(L_${line}\leftarrow 0L_${line}\)`,
      reason: "operações legais precisam ser reversíveis; multiplicar por zero não tem volta.",
      account: String.raw`\(0${rowBareTex(row)}=[0,\ 0,\ \dots\ |\ 0]\)`,
      result: "a equação original desaparece.",
      interpretation: "o sistema mudou; por isso a operação é proibida.",
      trap: "constante pode ser negativa ou fracionária, só não pode ser zero."
    })
  });
}

function zeroBelowLab(id, targetLine, pivotLine, target, pivot, multiplier, origin = "Gerada") {
  const multiple = scaleRow(pivot, multiplier);
  const result = subRows(target, multiple);
  const plusResult = addRows(target, multiple);
  return labItem({
    id,
    title: `Zerar abaixo do pivô`,
    origin,
    difficulty: 2,
    skill: "zerar abaixo do pivô",
    matrix: matrixTex([pivot, target]),
    q: `Qual operação zera o primeiro número da linha ${targetLine}?`,
    choices: [
      { t: String.raw`\(L_${targetLine}\leftarrow L_${targetLine}-${multiplier}L_${pivotLine}\)`, ok: true, f: String.raw`Certo: \(${target[0]}-${multiplier}\cdot${pivot[0]}=0\).` },
      { t: String.raw`\(L_${targetLine}\leftarrow L_${targetLine}+${multiplier}L_${pivotLine}\)`, ok: false, f: String.raw`Sinal errado: isso faz \(${target[0]}+${multiplier}\cdot${pivot[0]}=${plusResult[0]}\), não zero.` },
      { t: String.raw`\(L_${pivotLine}\leftarrow L_${pivotLine}-${multiplier}L_${targetLine}\)`, ok: false, f: `Linha errada: quem tem o número que queremos zerar é a linha ${targetLine}.` }
    ],
    why: String.raw`O multiplicador ${multiplier} veio de \(${target[0]}-${multiplier}\cdot${pivot[0]}=0\).`,
    solution: fullResolution({
      objective: `zerar ${target[0]} abaixo do pivô ${pivot[0]}`,
      operation: String.raw`\(L_${targetLine}\leftarrow L_${targetLine}-${multiplier}L_${pivotLine}\)`,
      reason: String.raw`o primeiro termo vira \(${target[0]}-${multiplier}\cdot${pivot[0]}=0\)`,
      account: String.raw`${rowTex(target)}-${multiplier}${rowTex(pivot)}=${rowTex(target)}-${rowTex(multiple)}=${rowTex(result)}`,
      result: rowTex(result),
      interpretation: "substituímos uma equação por uma combinação equivalente, não por chute.",
      trap: "a subtração passa por todos os termos, inclusive depois da barra."
    })
  });
}

function multipleLab(id, line, row, multiplier) {
  const result = scaleRow(row, multiplier);
  return labItem({
    id,
    title: `Calcular ${multiplier}L_${line}`,
    difficulty: 2,
    skill: "calcular múltiplo",
    matrix: rowTex(row),
    q: String.raw`Quanto é \(${multiplier}L_${line}\)?`,
    choices: [
      { t: rowTex(result), ok: true, f: "Certo: multiplicou a linha inteira." },
      { t: rowTex([...result.slice(0, -1), row[row.length - 1]]), ok: false, f: "Quase: você esqueceu o termo depois da barra." },
      { t: rowTex(row.map((x) => x + multiplier)), ok: false, f: "Isso soma o multiplicador. O pedido era multiplicar cada entrada." }
    ],
    why: `O ${multiplier} aparece porque vamos usar esse múltiplo para zerar algum número em outra linha.`,
    solution: fullResolution({
      objective: `preparar o múltiplo ${multiplier}L_${line}`,
      operation: String.raw`\(${multiplier}L_${line}\)`,
      reason: "para subtrair esse bloco de outra linha e criar zero.",
      account: String.raw`${multiplier}${rowTex(row)}=${rowTex(result)}`,
      result: rowTex(result),
      interpretation: "esse múltiplo ainda não substitui linha nenhuma; ele é a conta auxiliar.",
      trap: "calcule antes de subtrair para evitar erro de sinal."
    })
  });
}

function comboLab(id, targetLine, pivotLine, target, pivot, multiplier, origin = "Gerada") {
  const multiple = scaleRow(pivot, multiplier);
  const result = subRows(target, multiple);
  const badRhs = [...result.slice(0, -1), target[target.length - 1]];
  const signBad = addRows(target, multiple);
  return labItem({
    id,
    title: String.raw`Calcular \(L_${targetLine}-${multiplier}L_${pivotLine}\)`,
    origin,
    difficulty: 2,
    skill: "subtrair linhas",
    matrix: String.raw`\[${rowBareTex(target)}-${multiplier}${rowBareTex(pivot)}\]`,
    q: "Qual é o resultado correto?",
    choices: [
      { t: rowTex(result), ok: true, f: "Certo: a conta foi feita termo a termo, inclusive depois da barra." },
      { t: rowTex(badRhs), ok: false, f: "Erro de barra: o lado direito também muda. Não pode deixar o último número parado." },
      { t: rowTex(signBad), ok: false, f: "Erro de sinal: você somou o múltiplo em vez de subtrair." }
    ],
    why: String.raw`O múltiplo ${multiplier} foi escolhido para fazer \(${target[0]}-${multiplier}\cdot${pivot[0]}=0\).`,
    solution: fullResolution({
      objective: `substituir a linha ${targetLine} por uma linha com zero na primeira coluna`,
      operation: String.raw`\(L_${targetLine}\leftarrow L_${targetLine}-${multiplier}L_${pivotLine}\)`,
      reason: String.raw`o termo inicial some: \(${target[0]}-${multiplier}\cdot${pivot[0]}=0\)`,
      account: String.raw`${rowTex(target)}-${rowTex(multiple)}=${rowTex(result)}`,
      result: rowTex(result),
      interpretation: "a nova linha mantém as mesmas soluções do sistema porque veio de combinação de equações.",
      trap: "sinal negativo com número negativo muda para soma, como em \(-19-(-30)=11\)."
    })
  });
}

const lab = [
  dividePivotLab("lista10-divide-4", 2, [0, 4, 8], 1, "Lista 10 - base técnica"),
  comboLab("lista10-l2-3l1", 2, 1, [3, 7, 2, -19], [1, 2, -1, -10], 3, "Lista 10 sistema I"),
  comboLab("lista10-l3-5l1", 3, 1, [5, 12, 5, -21], [1, 2, -1, -10], 5, "Lista 10 sistema I"),
  comboLab("lista10-l3-2l2", 3, 2, [0, 2, 10, 29], [0, 1, 5, 11], 2, "Lista 10 sistema I"),
  zeroBelowLab("lista10-zero-3", 2, 1, [3, 7, 2, -19], [1, 2, -1, -10], 3, "Lista 10 sistema I"),
  zeroBelowLab("lista10-zero-5", 3, 1, [5, 12, 5, -21], [1, 2, -1, -10], 5, "Lista 10 sistema I"),
  zeroBelowLab("lista10-zero-2", 3, 2, [0, 2, 10, 29], [0, 1, 5, 11], 2, "Lista 10 sistema I"),
  ...[
    [1, [0, 5, 15], 1],
    [2, [0, 6, 18], 1],
    [3, [8, 16, 24], 0],
    [1, [9, -18, 27], 0],
    [2, [0, -3, 12], 1],
    [3, [10, 20, -30], 0],
    [1, [0, 7, 21], 1],
    [2, [4, 8, 12], 0],
    [3, [0, 2, 10, 14], 1],
    [2, [0, -5, 15, -20], 1]
  ].map(([line, row, pivot], i) => dividePivotLab(`divide-${i}`, line, row, pivot)),
  ...[
    [1, [1, 2, -1, -10], 3],
    [1, [1, 2, -1, -10], 5],
    [2, [0, 1, 5, 11], 2],
    [2, [2, -1, 4, 6], -2],
    [3, [0, -2, 1, 3], -3],
    [1, [3, 1, 1, 4], 2],
    [2, [1, -5, 2, -3], 4],
    [3, [-1, 1, 0, 2], -1]
  ].map(([line, row, c], i) => multiplyLab(`multiply-${i}`, line, row, c)),
  ...[
    [1, [1, 2, -1, -10]],
    [2, [3, 7, 2, -19]],
    [3, [5, 12, 5, -21]],
    [1, [0, 4, 8]],
    [2, [0, 1, 5, 11]],
    [3, [2, -3, 4, 20]]
  ].map(([line, row], i) => invalidZeroLab(`invalid-zero-${i}`, line, row)),
  ...[
    [2, 1, [4, 9, 1, 5], [1, 2, 0, 1], 4],
    [3, 1, [6, 5, -2, 8], [1, 1, 1, 2], 6],
    [2, 1, [2, 5, 7, 9], [1, 3, 1, 4], 2],
    [3, 1, [7, 2, 0, -1], [1, -1, 2, 3], 7],
    [2, 1, [5, 0, 3, 10], [1, 4, -1, 2], 5],
    [3, 1, [3, 8, 6, 1], [1, 2, 2, 0], 3],
    [2, 1, [9, 1, -4, 6], [1, 0, -1, 1], 9],
    [3, 2, [0, 4, 8, 20], [0, 1, 2, 5], 4],
    [3, 2, [0, 6, 3, 12], [0, 2, 1, 4], 3],
    [2, 1, [8, -1, 5, 11], [1, 0, 2, 1], 8]
  ].map(([tl, pl, target, pivot, m], i) => zeroBelowLab(`zero-generated-${i}`, tl, pl, target, pivot, m)),
  ...[
    [1, [1, 2, -1, -10], 3],
    [1, [1, 2, -1, -10], 5],
    [2, [0, 1, 5, 11], 2],
    [1, [1, 3, 1, 4], 2],
    [2, [0, -2, 1, 3], 3],
    [1, [2, -1, 0, 5], -2],
    [3, [0, 4, -1, 7], 2],
    [2, [1, -2, 3, -4], -3]
  ].map(([line, row, m], i) => multipleLab(`multiple-${i}`, line, row, m)),
  ...[
    [2, 1, [3, 7, 2, -19], [1, 2, -1, -10], 3],
    [3, 1, [5, 12, 5, -21], [1, 2, -1, -10], 5],
    [3, 2, [0, 2, 10, 29], [0, 1, 5, 11], 2],
    [2, 1, [4, 9, 1, 5], [1, 2, 0, 1], 4],
    [3, 1, [6, 5, -2, 8], [1, 1, 1, 2], 6],
    [2, 1, [2, 5, 7, 9], [1, 3, 1, 4], 2],
    [3, 1, [7, 2, 0, -1], [1, -1, 2, 3], 7],
    [2, 1, [5, 0, 3, 10], [1, 4, -1, 2], 5],
    [3, 1, [3, 8, 6, 1], [1, 2, 2, 0], 3],
    [2, 1, [8, -1, 5, 11], [1, 0, 2, 1], 8]
  ].map(([tl, pl, target, pivot, m], i) => comboLab(`combo-${i}`, tl, pl, target, pivot, m))
];

function linearQuestion(id, origin, equation, isLinear, reason, skill = "equação linear") {
  return q({
    id,
    tipo: "equação linear",
    origin,
    difficulty: 1,
    prompt: String.raw`A equação ${equation} é linear?`,
    choices: ["Sim, é linear", "Não, não é linear", "Só se trocar as variáveis"],
    answer: isLinear ? 0 : 1,
    feedbacks: isLinear
      ? [
        `Correto: ${reason}`,
        `Ela é linear. ${reason}`,
        "Não é questão de trocar variável; é checar grau 1 e ausência de produto/raiz/denominador."
      ]
      : [
        `Não. ${reason}`,
        `Correto: ${reason}`,
        "Trocar nomes não resolve: a forma da variável continua proibida."
      ],
    correct: isLinear ? `Certo. ${reason}` : `Certo. ${reason}`,
    solution: fullResolution({
      objective: "decidir se a equação pertence a um sistema linear",
      operation: "checar as variáveis uma por uma",
      reason: "em equação linear, cada variável aparece com expoente 1, sem produto entre variáveis, raiz de variável ou variável no denominador.",
      account: `Equação analisada: ${equation}. ${reason}`,
      result: isLinear ? "linear" : "não linear",
      interpretation: "só equações lineares entram nas técnicas de matriz aumentada e escalonamento."
    }),
    skill,
    review: "Revisar equação linear: expoente 1, sem produto, sem raiz e sem variável no denominador."
  });
}

const linearQuestions = [
  linearQuestion("l10-1a", "Lista 10 ex. 1(a)", String.raw`\(2x_1-3x_2+4x_3=20\)`, true, "todas as variáveis aparecem em grau 1."),
  linearQuestion("l10-1b", "Lista 10 ex. 1(b)", String.raw`\(x_1+5x_2-3x_3+17x_4-2x_5=-40\)`, true, "há muitas variáveis, mas todas aparecem em grau 1."),
  linearQuestion("l10-1c", "Lista 10 ex. 1(c)", String.raw`\(2x_1-3x_2^2+4x_3=20\)`, false, String.raw`o termo \(x_2^2\) tem expoente 2.`),
  linearQuestion("l10-1d", "Lista 10 ex. 1(d)", String.raw`\(x_1+5x_2=-5\)`, true, "duas variáveis em grau 1 ainda formam equação linear."),
  linearQuestion("l10-1e", "Lista 10 ex. 1(e)", String.raw`\(x_1-x_2+4x_3x_4=20\)`, false, String.raw`há produto entre variáveis: \(x_3x_4\).`),
  linearQuestion("l10-1f", "Lista 10 ex. 1(f)", String.raw`\(-2x_1+3\sqrt{x_2}-3x_3=10\)`, false, String.raw`há raiz de variável: \(\sqrt{x_2}\).`),
  linearQuestion("gen-linear-1", "Gerada", String.raw`\(4x_1-x_2+9=0\)`, true, "o 9 é constante; variáveis continuam em grau 1."),
  linearQuestion("gen-linear-2", "Gerada", String.raw`\(x_1/x_2+3x_3=7\)`, false, String.raw`há variável no denominador em \(x_1/x_2\).`),
  linearQuestion("gen-linear-3", "Gerada", String.raw`\(7x_1-2x_2+x_3=0\)`, true, "coeficientes podem ser negativos ou positivos."),
  linearQuestion("gen-linear-4", "Gerada", String.raw`\(x_1x_2+x_3=5\)`, false, String.raw`há produto entre variáveis \(x_1x_2\).`),
  linearQuestion("gen-linear-5", "Gerada", String.raw`\(x_1+\frac{1}{2}x_2=3\)`, true, "coeficiente fracionário é permitido."),
  linearQuestion("gen-linear-6", "Gerada", String.raw`\(x_1^3+x_2=1\)`, false, String.raw`\(x_1^3\) tem expoente 3.`),
  linearQuestion("gen-linear-7", "Gerada", String.raw`\(-x_1+x_2-x_3=-8\)`, true, "coeficiente implícito \(-1\) é permitido."),
  linearQuestion("gen-linear-8", "Gerada", String.raw`\(2\sqrt{x_1}+x_2=4\)`, false, String.raw`raiz de variável não é linear.`),
  linearQuestion("gen-linear-9", "Gerada", String.raw`\(5x_1+0x_2-3x_3=11\)`, true, "coeficiente zero só significa que aquela variável não participa."),
  linearQuestion("gen-linear-10", "Gerada", String.raw`\(5/(x_1)+x_2=2\)`, false, "variável no denominador quebra linearidade."),
  linearQuestion("gen-linear-11", "Gerada", String.raw`\(x_1-4x_2+6x_3-9x_4=1\)`, true, "quatro variáveis em grau 1 continuam lineares."),
  linearQuestion("gen-linear-12", "Gerada", String.raw`\(x_1+4x_2x_2=0\)`, false, String.raw`\(x_2x_2=x_2^2\), expoente 2.`),
  linearQuestion("gen-linear-13", "Gerada", String.raw`\(\frac{3}{4}x_1-2x_2=9\)`, true, "frações como coeficientes são permitidas."),
  linearQuestion("gen-linear-14", "Gerada", String.raw`\(x_1+\sqrt{5}x_2=0\)`, true, String.raw`\(\sqrt5\) é número, não raiz de variável.`)
];

function matrixQuestion(id, origin, equation, correct, wrong1, wrong2, reason) {
  return q({
    id,
    tipo: "matriz aumentada",
    origin,
    difficulty: 1,
    prompt: String.raw`Qual linha aumentada representa ${equation}?`,
    choices: [correct, wrong1, wrong2],
    answer: 0,
    feedbacks: [
      `Certo: ${reason}`,
      "Não. Você trocou algum coeficiente com o termo depois da barra.",
      "Não. O lado direito não entra antes da barra."
    ],
    correct: `Certo: ${reason}`,
    solution: fullResolution({
      objective: "montar uma linha de matriz aumentada",
      operation: "copiar coeficientes antes da barra e termo independente depois",
      reason: "cada coluna antes da barra representa uma variável; a coluna depois da barra representa o lado direito.",
      account: `${equation} vira ${correct}.`,
      result: correct,
      interpretation: "a linha ainda é a mesma equação, só sem escrever as letras das variáveis.",
      trap: String.raw`coeficiente implícito \(1\) ou \(-1\) precisa aparecer.`
    }),
    skill: "matriz aumentada",
    review: "Revisar montagem de [A|b]."
  });
}

const matrixQuestions = [
  matrixQuestion("m-l10-i-1", "Lista 10 sistema I", String.raw`\(x_1+2x_2-x_3=-10\)`, String.raw`\([1,\ 2,\ -1\ |\ -10]\)`, String.raw`\([1,\ 2,\ -10\ |\ -1]\)`, String.raw`\([-10,\ 1,\ 2\ |\ -1]\)`, String.raw`o coeficiente de \(x_3\) é \(-1\).`),
  matrixQuestion("m-l10-i-2", "Lista 10 sistema I", String.raw`\(3x_1+7x_2+2x_3=-19\)`, String.raw`\([3,\ 7,\ 2\ |\ -19]\)`, String.raw`\([3,\ 7,\ -19\ |\ 2]\)`, String.raw`\([-19,\ 3,\ 7\ |\ 2]\)`, String.raw`o \(-19\) fica depois da barra.`),
  matrixQuestion("m-l10-i-3", "Lista 10 sistema I", String.raw`\(5x_1+12x_2+5x_3=-21\)`, String.raw`\([5,\ 12,\ 5\ |\ -21]\)`, String.raw`\([5,\ 12,\ -21\ |\ 5]\)`, String.raw`\([-21,\ 5,\ 12\ |\ 5]\)`, "todos os coeficientes ficam antes da barra."),
  matrixQuestion("m-l10-ii-1", "Lista 10 sistema II", String.raw`\(3x_1+x_2+x_3=4\)`, String.raw`\([3,\ 1,\ 1\ |\ 4]\)`, String.raw`\([3,\ 1,\ 4\ |\ 1]\)`, String.raw`\([4,\ 3,\ 1\ |\ 1]\)`, String.raw`coeficiente omitido é \(1\).`),
  matrixQuestion("m-l10-ii-2", "Lista 10 sistema II", String.raw`\(2x_1-x_2-x_3=6\)`, String.raw`\([2,\ -1,\ -1\ |\ 6]\)`, String.raw`\([2,\ 1,\ 1\ |\ 6]\)`, String.raw`\([6,\ 2,\ -1\ |\ -1]\)`, "os sinais negativos são coeficientes."),
  matrixQuestion("m-l10-ii-3", "Lista 10 sistema II", String.raw`\(-4x_1+x_2-5x_3=20\)`, String.raw`\([-4,\ 1,\ -5\ |\ 20]\)`, String.raw`\([4,\ 1,\ -5\ |\ 20]\)`, String.raw`\([20,\ -4,\ 1\ |\ -5]\)`, "o coeficiente de \(x_1\) é \(-4\)."),
  matrixQuestion("m-l10-ex2-1", "Lista 10 ex. 2", String.raw`\(x_1-x_2+3x_3=8\)`, String.raw`\([1,\ -1,\ 3\ |\ 8]\)`, String.raw`\([1,\ 1,\ 3\ |\ 8]\)`, String.raw`\([8,\ 1,\ -1\ |\ 3]\)`, String.raw`\(x_2\) tem coeficiente \(-1\).`),
  matrixQuestion("m-l10-ex2-2", "Lista 10 ex. 2", String.raw`\(x_1+x_2+2x_3=-3\)`, String.raw`\([1,\ 1,\ 2\ |\ -3]\)`, String.raw`\([1,\ 1,\ -3\ |\ 2]\)`, String.raw`\([-3,\ 1,\ 1\ |\ 2]\)`, String.raw`o \(-3\) é termo independente.`),
  matrixQuestion("m-gen-1", "Gerada", String.raw`\(-x_1+4x_2=7\)`, String.raw`\([-1,\ 4\ |\ 7]\)`, String.raw`\([1,\ 4\ |\ 7]\)`, String.raw`\([7,\ -1\ |\ 4]\)`, String.raw`coeficiente implícito \(-1\) precisa aparecer.`),
  matrixQuestion("m-gen-2", "Gerada", String.raw`\(4x_1-2x_2+x_3=0\)`, String.raw`\([4,\ -2,\ 1\ |\ 0]\)`, String.raw`\([4,\ 2,\ 1\ |\ 0]\)`, String.raw`\([0,\ 4,\ -2\ |\ 1]\)`, "lado direito zero fica depois da barra."),
  matrixQuestion("m-gen-3", "Gerada", String.raw`\(0x_1+5x_2-x_3=9\)`, String.raw`\([0,\ 5,\ -1\ |\ 9]\)`, String.raw`\([5,\ -1\ |\ 9]\)`, String.raw`\([9,\ 0,\ 5\ |\ -1]\)`, "o zero pode aparecer para manter a coluna de \(x_1\)."),
  matrixQuestion("m-gen-4", "Gerada", String.raw`\(x_1-6x_3=2\)`, String.raw`\([1,\ 0,\ -6\ |\ 2]\)`, String.raw`\([1,\ -6\ |\ 2]\)`, String.raw`\([2,\ 1,\ 0\ |\ -6]\)`, "faltou \(x_2\), então seu coeficiente é zero."),
  matrixQuestion("m-gen-5", "Gerada", String.raw`\(\frac{1}{2}x_1+x_2=3\)`, String.raw`\([\frac{1}{2},\ 1\ |\ 3]\)`, String.raw`\([2,\ 1\ |\ 3]\)`, String.raw`\([3,\ \frac{1}{2}\ |\ 1]\)`, "fração pode ser coeficiente."),
  matrixQuestion("m-gen-6", "Gerada", String.raw`\(7x_2+4x_3=-8\)`, String.raw`\([0,\ 7,\ 4\ |\ -8]\)`, String.raw`\([7,\ 4\ |\ -8]\)`, String.raw`\([-8,\ 0,\ 7\ |\ 4]\)`, "se existe coluna de \(x_1\), ela recebe zero."),
  matrixQuestion("m-gen-7", "Gerada", String.raw`\(2x_1+3x_2-4x_4=5\)`, String.raw`\([2,\ 3,\ 0,\ -4\ |\ 5]\)`, String.raw`\([2,\ 3,\ -4\ |\ 5]\)`, String.raw`\([5,\ 2,\ 3,\ 0\ |\ -4]\)`, "faltou \(x_3\), então entra zero."),
  matrixQuestion("m-gen-8", "Gerada", String.raw`\(-3x_1-2x_2=-1\)`, String.raw`\([-3,\ -2\ |\ -1]\)`, String.raw`\([3,\ 2\ |\ -1]\)`, String.raw`\([-1,\ -3\ |\ -2]\)`, "os sinais negativos fazem parte dos coeficientes."),
  matrixQuestion("m-gen-9", "Gerada", String.raw`\(x_1+x_2+x_3=1\)`, String.raw`\([1,\ 1,\ 1\ |\ 1]\)`, String.raw`\([1,\ 1,\ 1,\ 1]\)`, String.raw`\([1,\ 1\ |\ 1]\)`, "a barra separa coeficientes do termo independente."),
  matrixQuestion("m-gen-10", "Gerada", String.raw`\(5x_1=10\)`, String.raw`\([5\ |\ 10]\)`, String.raw`\([10\ |\ 5]\)`, String.raw`\([5,\ 10]\)`, "uma variável gera uma coluna antes da barra."),
  matrixQuestion("m-gen-11", "Gerada", String.raw`\(x_2=4\)`, String.raw`\([0,\ 1\ |\ 4]\)`, String.raw`\([1\ |\ 4]\)`, String.raw`\([4,\ 0\ |\ 1]\)`, "na ordem \(x_1,x_2\), o coeficiente de \(x_1\) é zero."),
  matrixQuestion("m-gen-12", "Gerada", String.raw`\(-x_1-x_2-x_3=-6\)`, String.raw`\([-1,\ -1,\ -1\ |\ -6]\)`, String.raw`\([1,\ 1,\ 1\ |\ -6]\)`, String.raw`\([-6,\ -1,\ -1\ |\ -1]\)`, "coeficiente implícito negativo é \(-1\).")
];

function verifyQuestion(id, origin, vectorTex, values, expected1, expected2, answer, note) {
  const [x1, x2, x3] = values;
  const e1 = x1 - x2 + 3 * x3;
  const e2 = x1 + x2 + 2 * x3;
  return q({
    id,
    tipo: "verificar solução",
    origin,
    difficulty: 1,
    prompt: String.raw`No sistema da Lista 10 ex. 2, o vetor ${vectorTex} satisfaz as duas equações?`,
    choices: ["Sim, passa nas duas", "Não, falha em pelo menos uma", "Basta passar na primeira"],
    answer,
    feedbacks: [
      answer === 0 ? "Certo: passou nas duas equações." : `Não. As contas dão ${e1} e ${e2}; precisa dar 8 e -3.`,
      answer === 1 ? "Certo: acertar uma equação só não basta." : "Não. Ele passa nas duas; confira os dois lados direitos.",
      "Não. Acertar uma equação só não basta. Precisa passar nas duas."
    ],
    correct: note,
    solution: fullResolution({
      objective: "substituir o vetor nas duas equações",
      operation: String.raw`\(x_1-x_2+3x_3\) e \(x_1+x_2+2x_3\)`,
      reason: "solução de sistema precisa satisfazer tudo simultaneamente.",
      account: String.raw`Primeira: \(${x1}-(${x2})+3(${x3})=${e1}\). Segunda: \(${x1}+(${x2})+2(${x3})=${e2}\).`,
      result: `esperado: ${expected1} e ${expected2}. obtido: ${e1} e ${e2}.`,
      interpretation: answer === 0 ? "o vetor é solução." : "o vetor não é solução.",
      trap: "passar em uma equação só não resolve o sistema."
    }),
    skill: "verificar solução",
    review: "Revisar substituição de vetor em sistema."
  });
}

const solutionQuestions = [
  verifyQuestion("v-l10-a", "Lista 10 ex. 2(a)", String.raw`\((2,-1,5)\)`, [2, -1, 5], 8, -3, 1, "Falha nas duas."),
  verifyQuestion("v-l10-b", "Lista 10 ex. 2(b)", String.raw`\((0,-5,1)\)`, [0, -5, 1], 8, -3, 0, String.raw`Certo: \(0-(-5)+3=8\) e \(0-5+2=-3\).`),
  verifyQuestion("v-l10-c", "Lista 10 ex. 2(c)", String.raw`\((1,2,-3)\)`, [1, 2, -3], 8, -3, 1, "Ele passa na segunda, mas falha na primeira."),
  verifyQuestion("v-l10-d", "Lista 10 ex. 2(d)", String.raw`\((-5,-4,3)\)`, [-5, -4, 3], 8, -3, 0, "Certo: passa nas duas equações."),
  verifyQuestion("v-gen-1", "Gerada equivalente", String.raw`\((1,0,2)\)`, [1, 0, 2], 8, -3, 1, "Falha no segundo lado direito."),
  verifyQuestion("v-gen-2", "Gerada equivalente", String.raw`\((-1,-6,1)\)`, [-1, -6, 1], 8, -3, 1, "Passa na primeira, falha na segunda."),
  verifyQuestion("v-gen-3", "Gerada equivalente", String.raw`\((3,1,2)\)`, [3, 1, 2], 8, -3, 1, "Passa na primeira, falha na segunda."),
  verifyQuestion("v-gen-4", "Gerada equivalente", String.raw`\((4,3,-1)\)`, [4, 3, -1], 8, -3, 1, "Falha nas duas.")
];

function classQ(id, origin, rows, answer, pivots, free, contradiction) {
  const names = ["Solução única", "Nenhuma solução", "Infinitas soluções"];
  const reason = contradiction
    ? `aparece contradição ${contradiction}.`
    : free
      ? `não há contradição e sobra variável livre: ${free}.`
      : `há pivôs em todas as variáveis: ${pivots}.`;
  return q({
    id,
    tipo: "classificação",
    origin,
    difficulty: 2,
    rows,
    prompt: `Classifique a matriz final: ${matrixTex(rows)}`,
    choices: names,
    answer,
    feedbacks: [
      answer === 0 ? `Certo: ${reason}` : `Não é única: ${reason}`,
      answer === 1 ? `Certo: ${reason}` : `Não é caso sem solução: ${reason}`,
      answer === 2 ? `Certo: ${reason}` : `Não são infinitas: ${reason}`
    ],
    correct: `Certo: ${reason}`,
    solution: fullResolution({
      objective: "ler a matriz final",
      operation: "procurar pivôs, contradição e variável livre",
      reason: "a classificação vem da forma final, não de chute.",
      account: `Pivôs: ${pivots}. Contradição: ${contradiction || "não"}. Variável livre: ${free || "não"}.`,
      result: names[answer],
      interpretation: reason,
      trap: String.raw`\([0,0,0|0]\) não é contradição; \([0,0,0|c]\), \(c\neq0\), é.`
    }),
    skill: "classificação",
    review: "Revisar pivô, contradição e variável livre."
  });
}

const classifyQuestions = [
  classQ("c-l10-i", "Lista 10 sistema I", [[1, 2, -1, -10], [0, 1, 5, 11], [0, 0, 0, 7]], 1, "colunas 1 e 2", "", String.raw`\(0=7\)`),
  classQ("c-1", "Gerada", [[1, 0, 2, 5], [0, 1, -1, 3], [0, 0, 1, -2]], 0, "colunas 1, 2 e 3", "", ""),
  classQ("c-2", "Gerada", [[1, 3, 0, 2], [0, 1, 4, -1], [0, 0, 0, 0]], 2, "colunas 1 e 2", String.raw`\(x_3\)`, ""),
  classQ("c-3", "Gerada", [[1, -2, 3, 0], [0, 0, 1, 4], [0, 0, 0, 5]], 1, "colunas 1 e 3", "", String.raw`\(0=5\)`),
  classQ("c-4", "Gerada", [[1, 0, 0, 2], [0, 1, 0, -1], [0, 0, 1, 6]], 0, "colunas 1, 2 e 3", "", ""),
  classQ("c-5", "Gerada", [[1, 2, -1, 3], [0, 0, 1, 5], [0, 0, 0, 0]], 2, "colunas 1 e 3", String.raw`\(x_2\)`, ""),
  classQ("c-6", "Gerada", [[1, 1, 4], [0, 0, 2]], 1, "coluna 1", "", String.raw`\(0=2\)`),
  classQ("c-7", "Gerada", [[1, 5, 9], [0, 1, 2]], 0, "colunas 1 e 2", "", ""),
  classQ("c-8", "Gerada", [[1, 2, 0], [0, 0, 0]], 2, "coluna 1", String.raw`\(x_2\)`, ""),
  classQ("c-9", "Gerada", [[0, 1, 3], [0, 0, 0]], 2, "coluna 2", String.raw`\(x_1\)`, ""),
  classQ("c-10", "Gerada", [[1, 0, 2, 1], [0, 0, 0, -4]], 1, "coluna 1", "", String.raw`\(0=-4\)`),
  classQ("c-11", "Gerada", [[1, 4, 2, 0], [0, 1, -3, 5], [0, 0, 0, 0]], 2, "colunas 1 e 2", String.raw`\(x_3\)`, ""),
  classQ("c-12", "Gerada", [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]], 2, "colunas 1 e 2", String.raw`\(x_3\)`, ""),
  classQ("c-13", "Gerada", [[1, 0, 7], [0, 1, -8]], 0, "colunas 1 e 2", "", ""),
  classQ("c-14", "Gerada", [[1, 2, 3, 4], [0, 0, 1, 2], [0, 0, 0, 0]], 2, "colunas 1 e 3", String.raw`\(x_2\)`, ""),
  classQ("c-15", "Gerada", [[1, 2, 3, 4], [0, 1, 5, 6], [0, 0, 1, 7]], 0, "colunas 1, 2 e 3", "", ""),
  classQ("c-16", "Gerada", [[1, 0, 2], [0, 0, 1]], 1, "coluna 1", "", String.raw`\(0=1\)`),
  classQ("c-17", "Gerada", [[1, 1, 0, 3], [0, 1, 0, -2], [0, 0, 0, 0]], 2, "colunas 1 e 2", String.raw`\(x_3\)`, ""),
  classQ("c-18", "Gerada", [[1, 0, 0, 5], [0, 1, 0, 1], [0, 0, 1, 0], [0, 0, 0, 0]], 0, "colunas 1, 2 e 3", "", ""),
  classQ("c-19", "Gerada", [[1, -1, 4, 2], [0, 0, 0, 0], [0, 0, 0, 0]], 2, "coluna 1", String.raw`\(x_2,x_3\)`, "")
];

function paramQ(id, origin, prompt, choices, answer, feedbacks, correct, solution, difficulty = 2, skill = "parâmetros") {
  return q({ id, tipo: "parâmetros", origin, difficulty, prompt, choices, answer, feedbacks, correct, solution, skill, review: "Revisar parâmetros: separar caso antes de dividir." });
}

function homogQ(id, origin, prompt, choices, answer, feedbacks, correct, solution, difficulty = 2) {
  return q({ id, tipo: "homogêneo", origin, difficulty, prompt, choices, answer, feedbacks, correct, solution, skill: "homogêneos", review: "Revisar homogêneos: trivial, determinante e variável livre." });
}

const homogeneousQuestions = [
  homogQ("h-l11-5-det", "Lista 11 ex. 5", String.raw`Para \(A=\begin{pmatrix}2&1&1\\1&\alpha&1\\1&-1&2\end{pmatrix}\), qual é \(\det(A)\)?`, [String.raw`\(3\alpha\)`, String.raw`\(\alpha-3\)`, String.raw`\(3(\alpha-1)\)`], 0, [String.raw`Certo: \(\det(A)=3\alpha\).`, "Não. Expanda pela primeira linha: o resultado simplifica para \(3\alpha\).", "Esse fator zeraria em 1, mas o valor especial da lista é 0."], String.raw`Certo: \(\det(A)=3\alpha\).`, fullResolution({ objective: "achar quando o homogêneo tem infinitas soluções", operation: "calcular determinante", reason: String.raw`homogêneo quadrado só tem não triviais quando \(\det(A)=0\)`, account: String.raw`\(\det(A)=3\alpha\)`, result: String.raw`\(\alpha=0\)`, interpretation: "esse é o caso especial para escalonar.", trap: "determinante não zero dá só solução trivial." })),
  homogQ("h-l11-5-alpha", "Lista 11 ex. 5", String.raw`Qual valor de \(\alpha\) faz o sistema homogêneo admitir infinitas soluções?`, [String.raw`\(\alpha=0\)`, String.raw`\(\alpha=1\)`, String.raw`\(\alpha=-1\)`], 0, [String.raw`Certo: \(3\alpha=0\Rightarrow\alpha=0\).`, "Não. \(\alpha=1\) deixa o determinante \(3\), não zero.", "Não. \(\alpha=-1\) deixa o determinante \(-3\), não zero."], String.raw`Certo: \(\alpha=0\).`, fullResolution({ objective: "zerar o determinante", operation: String.raw`\(3\alpha=0\)`, reason: "sem determinante zero, homogêneo só tem a trivial.", account: String.raw`\(3\alpha=0\Rightarrow\alpha=0\)`, result: String.raw`\(\alpha=0\)`, interpretation: "agora esse caso deve ser escalonado.", trap: "homogêneo nunca é impossível, mas pode ter só a trivial." })),
  homogQ("h-l11-5-rref", "Lista 11 ex. 5", String.raw`Com \(\alpha=0\), a forma reduzida dá \(x_1+x_3=0\) e \(x_2-x_3=0\). Se \(x_3=t\), qual é a solução geral?`, [String.raw`\((-t,t,t)\)`, String.raw`\((t,t,t)\)`, String.raw`\((t,-t,t)\)`], 0, [String.raw`Certo: \(x_1=-t,\ x_2=t,\ x_3=t\).`, String.raw`Não: \(x_1+x_3=0\) força \(x_1=-t\).`, String.raw`Não: \(x_2-x_3=0\) força \(x_2=t\).`], String.raw`Certo: \((-t,t,t)\).`, fullResolution({ objective: "ler a variável livre", operation: String.raw`\(x_3=t\)`, reason: "a terceira coluna não tem pivô.", account: String.raw`\(x_1=-x_3=-t\), \(x_2=x_3=t\)`, result: String.raw`\((x_1,x_2,x_3)=(-t,t,t)\)`, interpretation: "cada valor de \(t\) gera uma solução.", trap: "não escolha \(t\) para variável com pivô." })),
  homogQ("h-l11-5-particular", "Lista 11 ex. 5", String.raw`Na solução geral \((-t,t,t)\), fazendo a variável livre igual a 1, qual solução particular aparece?`, [String.raw`\((-1,1,1)\)`, String.raw`\((1,1,1)\)`, String.raw`\((0,0,0)\)`], 0, [String.raw`Certo: \(t=1\Rightarrow(-1,1,1)\).`, "Não. O primeiro termo fica negativo.", "A trivial também resolve, mas a pergunta pede variável livre igual a 1."], String.raw`Certo: \((-1,1,1)\).`, fullResolution({ objective: "dar uma solução não trivial", operation: String.raw`\(t=1\)`, reason: "o exercício pede variável livre igual a 1.", account: String.raw`\((-t,t,t)\Rightarrow(-1,1,1)\)`, result: String.raw`\((-1,1,1)\)`, interpretation: "é uma solução homogênea não trivial.", trap: "não confunda solução particular com solução única." })),
  homogQ("h-l11-6-det", "Lista 11 ex. 6", String.raw`No homogêneo do exercício 6, o determinante fatorado é \(3m(m-3)\). Para ter apenas solução trivial, precisamos de:`, [String.raw`\(m\neq0\) e \(m\neq3\)`, String.raw`\(m=0\) ou \(m=3\)`, String.raw`qualquer \(m\)`], 0, [String.raw`Certo: \(\det(A)\neq0\).`, "Não. Esses são os valores que zeram o determinante.", "Não. Em \(m=0\) e \(m=3\), o determinante zera."], String.raw`Certo: \(m\neq0,3\).`, fullResolution({ objective: "achar quando só há a trivial", operation: String.raw`\(3m(m-3)\neq0\)`, reason: "homogêneo quadrado com determinante não zero tem só a trivial.", account: String.raw`\(3m(m-3)\neq0\Rightarrow m\neq0,\ m\neq3\)`, result: String.raw`\(m\in\mathbb{R}\setminus\{0,3\}\)`, interpretation: "esses são os valores pedidos.", trap: "os valores que zeram o determinante são proibidos para 'apenas trivial'." })),
  homogQ("h-gen-1", "Gerada", String.raw`Um sistema homogêneo pode ser impossível?`, ["Não, porque \(\vec{0}\) sempre funciona", "Sim, se aparecer \(0=7\)", "Sim, quando há variável livre"], 0, ["Certo: substituir tudo zero dá lado esquerdo zero.", "Em homogêneo o lado direito é zero; \(0=7\) não aparece se as operações forem corretas.", "Variável livre gera infinitas, não impossibilidade."], "Certo.", fullResolution({ objective: "reconhecer propriedade básica", operation: String.raw`\(A\vec{0}=\vec{0}\)`, reason: "toda combinação linear com variáveis zero dá zero.", account: "lado esquerdo vira zero e lado direito já é zero.", result: "a solução trivial existe.", interpretation: "homogêneo nunca é sem solução." })),
  homogQ("h-gen-2", "Gerada", String.raw`Se \(\det(A)=5\) em um homogêneo \(3\times3\), a classificação é:`, ["só trivial", "nenhuma solução", "infinitas sempre"], 0, ["Certo: determinante não zero dá pivô em todas as variáveis.", "Homogêneo nunca é impossível.", "Infinitas só podem aparecer quando o determinante zera."], "Certo.", fullResolution({ objective: "usar determinante", operation: String.raw`\(\det(A)\neq0\)`, reason: "há pivô em todas as colunas.", account: String.raw`\(\det(A)=5\neq0\)`, result: "só solução trivial", interpretation: String.raw`\(\vec{x}=\vec{0}\)` })),
  homogQ("h-gen-3", "Gerada", String.raw`Se uma forma final homogênea tem \([0,0,0|0]\) e falta pivô em \(x_3\), então:`, ["infinitas soluções", "nenhuma solução", "só trivial"], 0, ["Certo: \(x_3\) fica livre.", "Não há contradição: \(0=0\).", "Falta pivô, então há solução não trivial."], "Certo.", fullResolution({ objective: "ler variável livre", operation: "procurar coluna sem pivô", reason: "sem contradição e com variável livre há parâmetro.", account: String.raw`\(x_3=t\)`, result: "infinitas soluções", interpretation: "inclui a trivial e outras." })),
  homogQ("h-gen-4", "Gerada", String.raw`A solução trivial de um sistema homogêneo em três variáveis é:`, [String.raw`\((0,0,0)\)`, String.raw`\((1,1,1)\)`, "qualquer vetor"], 0, ["Certo.", "Esse pode ou não resolver; trivial é tudo zero.", "Não. Qualquer vetor só em sistema com matriz zero."], "Certo.", fullResolution({ objective: "nomear a trivial", operation: "colocar todas as variáveis como zero", reason: "trivial significa a solução garantida.", account: String.raw`\((x_1,x_2,x_3)=(0,0,0)\)`, result: String.raw`\(\vec{0}\)`, interpretation: "sempre resolve homogêneo." })),
  homogQ("h-gen-5", "Gerada", String.raw`Em homogêneo, \(\det(A)=0\) garante:`, ["pode haver não triviais", "nenhuma solução", "solução única não zero"], 0, ["Certo: abre a porta para variáveis livres.", "Homogêneo nunca é impossível.", "Se há solução única, é a trivial."], "Certo.", fullResolution({ objective: "interpretar determinante zero", operation: "separar caso singular", reason: "determinante zero significa falta de pivô em alguma coluna.", account: "sem pivô, aparece variável livre.", result: "pode haver não triviais", interpretation: "em homogêneo quadrado, isso leva a infinitas soluções." })),
  homogQ("h-gen-6", "Gerada", String.raw`A linha final \([0,0,0|0]\) em homogêneo significa:`, [String.raw`\(0=0\)`, String.raw`\(0=1\)`, "pivô em todas"], 0, ["Certo: é uma identidade.", "Não há 1 depois da barra.", "Linha zero não tem pivô."], "Certo.", fullResolution({ objective: "traduzir a linha", operation: "voltar para equação", reason: "coeficientes zero anulam as variáveis.", account: String.raw`\(0x_1+0x_2+0x_3=0\Rightarrow0=0\)`, result: "não prende variável", interpretation: "pode indicar variável livre se faltar pivô." })),
  homogQ("h-gen-7", "Gerada", String.raw`Para \(A\vec{x}=0\), se aparece \(x_1=-t,\ x_2=2t,\ x_3=t\), com \(t=1\), temos:`, [String.raw`\((-1,2,1)\)`, String.raw`\((1,2,1)\)`, String.raw`\((-1,1,2)\)`], 0, ["Certo.", "O primeiro termo é \(-t\).", "Você trocou \(x_2\) e \(x_3\)."], "Certo.", fullResolution({ objective: "obter solução particular", operation: String.raw`\(t=1\)`, reason: "o parâmetro livre recebe um valor simples.", account: String.raw`\((-t,2t,t)=(-1,2,1)\)`, result: String.raw`\((-1,2,1)\)`, interpretation: "solução não trivial." })),
  homogQ("h-gen-8", "Gerada", String.raw`Se \(m=0\) zera um determinante, antes de concluir só trivial você deve:`, ["separar e analisar o caso", "dividir por \(m\)", "ignorar o zero"], 0, ["Certo: \(m=0\) é o caso especial.", "Não pode dividir por expressão que pode ser zero.", "Ignorar apaga justamente o caso importante."], "Certo.", fullResolution({ objective: "tratar parâmetro no homogêneo", operation: String.raw`\(m=0\) e \(m\neq0\)`, reason: "dividir por zero é proibido.", account: "caso especial precisa ser substituído na matriz.", result: "análise separada", interpretation: "é o mesmo cuidado dos sistemas com parâmetros." })),
  homogQ("h-gen-9", "Gerada", String.raw`Se um homogêneo tem pivôs em \(x_1,x_2\), mas não em \(x_3\), então \(x_3\) é:`, ["variável livre", "contradição", "termo independente"], 0, ["Certo.", "Contradição dependeria de uma linha \(0=c\).", "Termo independente fica depois da barra."], "Certo.", fullResolution({ objective: "identificar variável sem pivô", operation: "olhar colunas", reason: "coluna sem pivô não define a variável.", account: "\(x_3=t\)", result: "variável livre", interpretation: "gera infinitas soluções no homogêneo." })),
  homogQ("h-gen-10", "Gerada", String.raw`No exercício 6 da Lista 11, \(m=3\) é permitido para 'apenas trivial'?`, ["Não", "Sim", "Só se \(m\neq0\)"], 0, ["Certo: \(3m(m-3)=0\) em \(m=3\).", "Não: o determinante zera.", "Também precisa excluir \(m=3\)."], "Certo.", fullResolution({ objective: "usar os valores proibidos", operation: String.raw`\(3m(m-3)\neq0\)`, reason: "apenas trivial exige determinante não zero.", account: String.raw`m=3\Rightarrow3m(m-3)=0`, result: "não permitido", interpretation: "em \(m=3\), podem aparecer não triviais." }))
];

const parameterQuestions = [
  paramQ("p-l11-1a-det", "Lista 11 ex. 1(a)", String.raw`Para \(\lambda x+2y=\lambda-1,\ 2x+4y=3\lambda\), o determinante dos coeficientes é:`, [String.raw`\(4(\lambda-1)\)`, String.raw`\(\lambda-1\)`, String.raw`\(4\lambda+4\)`], 0, [String.raw`Certo: \(\lambda\cdot4-2\cdot2=4\lambda-4\).`, "Faltou o fator 4.", "O sinal está errado: é subtração no determinante."], String.raw`Certo: \(4(\lambda-1)\).`, fullResolution({ objective: "descobrir quando há pivô", operation: "calcular determinante \(2\times2\)", reason: "determinante não zero dá solução única.", account: String.raw`\(\lambda\cdot4-2\cdot2=4\lambda-4=4(\lambda-1)\)`, result: String.raw`\(\lambda\neq1\) para solução única`, interpretation: "o caso \(\lambda=1\) precisa ser separado.", trap: "não divida por \(\lambda-1\) antes de separar." })),
  paramQ("p-l11-1a-case1", "Lista 11 ex. 1(a)", String.raw`No sistema do ex. 1(a), se \(\lambda\neq1\), a classificação é:`, ["solução única", "nenhuma solução", "infinitas soluções"], 0, ["Certo: determinante não zero.", "Não: sem determinante zero não há contradição obrigatória.", "Infinitas só poderiam surgir no caso determinante zero."], "Certo.", fullResolution({ objective: "classificar caso geral", operation: String.raw`\(\lambda\neq1\)`, reason: String.raw`\(4(\lambda-1)\neq0\)`, account: "matriz de coeficientes tem pivôs nas duas variáveis.", result: "solução única", interpretation: "pode resolver normalmente." })),
  paramQ("p-l11-1a-case2", "Lista 11 ex. 1(a)", String.raw`No caso \(\lambda=1\), o sistema vira \(x+2y=0\) e \(2x+4y=3\). O que acontece?`, ["nenhuma solução", "solução única", "infinitas soluções"], 0, ["Certo: a segunda esquerda é o dobro da primeira, mas o lado direito não é.", "Não: as equações são contraditórias.", "Não: para infinitas, o segundo lado direito teria que ser o dobro também."], "Certo.", fullResolution({ objective: "analisar caso especial", operation: String.raw`\(\lambda=1\)`, reason: "o determinante zera, então não podemos usar a regra do caso geral.", account: String.raw`\(2(x+2y)=0\), mas a segunda pede \(2x+4y=3\)`, result: String.raw`\(0=3\) após comparar`, interpretation: "sistema sem solução." })),
  paramQ("p-l11-1a-infinite", "Lista 11 ex. 1(a)", String.raw`Existe valor de \(\lambda\) que dá infinitas soluções no ex. 1(a)?`, ["não", String.raw`sim, \(\lambda=1\)`, String.raw`sim, \(\lambda=0\)`], 0, ["Certo: o único caso dependente é \(\lambda=1\), mas ele é contraditório.", "Não: em \(\lambda=1\) dá nenhuma solução.", "Não: em \(\lambda=0\), o determinante é \(-4\), então única."], "Certo.", fullResolution({ objective: "distinguir nenhuma de infinitas", operation: "testar o caso que zera o determinante", reason: "infinitas exigem equações proporcionais também no lado direito.", account: String.raw`\lambda=1: \(x+2y=0\) e \(2x+4y=3\)`, result: "contradição", interpretation: "não há caso de infinitas." })),
  paramQ("p-l11-2-det", "Lista 11 ex. 2(a)", String.raw`No exercício 2, \(A=\begin{pmatrix}m&1&1\\2&-1&2\\4&-1&1\end{pmatrix}\). O determinante é:`, [String.raw`\(m+8\)`, String.raw`\(m-8\)`, String.raw`\(8m\)`], 0, [String.raw`Certo: \(\det(A)=m+8\).`, "Sinal errado: o valor proibido é \(-8\).", "Não é produto; a expansão simplifica para \(m+8\)."], "Certo.", fullResolution({ objective: "achar quando há solução única", operation: "calcular determinante", reason: "sistema quadrado tem solução única quando \(\det(A)\neq0\).", account: String.raw`\(\det(A)=m+8\)`, result: String.raw`\(m\neq-8\)`, interpretation: "para \(m=-8\), precisa analisar outro caso." })),
  paramQ("p-l11-2-unique", "Lista 11 ex. 2(a)", String.raw`Para quais valores de \(m\) o exercício 2 admite solução única?`, [String.raw`\(m\neq-8\)`, String.raw`\(m=8\)`, String.raw`\(m=-8\)`], 0, [String.raw`Certo: \(m+8\neq0\).`, "Não. \(m=8\) é só um caso permitido, não todos.", "Não. \(m=-8\) zera o determinante."], "Certo.", fullResolution({ objective: "resolver a condição de determinante não zero", operation: String.raw`\(m+8\neq0\)`, reason: "determinante não zero equivale a pivô em todas as colunas.", account: String.raw`\(m+8\neq0\Rightarrow m\neq-8\)`, result: String.raw`\(m\neq-8\)`, interpretation: "essa é a resposta do item (a)." })),
  paramQ("p-l11-2-m2-step", "Lista 11 ex. 2(b)", String.raw`Com \(m=2\), a primeira coluna tem \(2,2,4\). Qual operação zera a linha 2 usando a linha 1?`, [String.raw`\(L_2\leftarrow L_2-L_1\)`, String.raw`\(L_2\leftarrow L_2+L_1\)`, String.raw`\(L_1\leftarrow L_1-L_2\)`], 0, [String.raw`Certo: \(2-1\cdot2=0\).`, "Sinal errado: \(2+2=4\).", "Linha errada: queremos mudar \(L_2\)."], "Certo.", fullResolution({ objective: "zerar o 2 da linha 2", operation: String.raw`\(L_2\leftarrow L_2-L_1\)`, reason: String.raw`\(2-2=0\)`, account: String.raw`\([2,-1,2|5]-[2,1,1|2]=[0,-2,1|3]\)`, result: String.raw`\([0,-2,1|3]\)`, interpretation: "a linha 2 agora começa com zero.", trap: "o lado direito também vira \(5-2=3\)." })),
  paramQ("p-l11-2-m2-solution", "Lista 11 ex. 2(b)", String.raw`Depois do escalonamento para \(m=2\), a solução é:`, [String.raw`\((1,-1,1)\)`, String.raw`\((2,-1,1)\)`, String.raw`\((1,1,-1)\)`], 0, [String.raw`Certo: \(x_1=1,x_2=-1,x_3=1\).`, "Não: substitua na primeira equação \(2x_1+x_2+x_3=2\).", "Sinais trocados: a segunda equação falha."], "Certo.", fullResolution({ objective: "resolver o sistema com \(m=2\)", operation: "escalonar e voltar substituindo", reason: "o determinante \(10\neq0\) garante uma solução.", account: String.raw`\(L_2-L_1=[0,-2,1|3]\), \(L_3-2L_1=[0,-3,-1|2]\), \(2L_3-3L_2=[0,0,-5|-5]\).`, result: String.raw`\(x_3=1,\ x_2=-1,\ x_1=1\)`, interpretation: String.raw`\((1,-1,1)\) é a solução única.` })),
  paramQ("p-l11-3-det", "Lista 11 ex. 3", String.raw`No exercício 3, o determinante é \(9(\alpha^2-1)\). Quais valores zeram o determinante?`, [String.raw`\(\alpha=1\) e \(\alpha=-1\)`, String.raw`\(\alpha=0\)`, String.raw`\(\alpha=9\)`], 0, [String.raw`Certo: \(\alpha^2-1=0\Rightarrow\alpha=\pm1\).`, "Não. \(\alpha=0\) dá determinante \(-9\), então solução única.", "Não. O 9 é fator, não raiz."], "Certo.", fullResolution({ objective: "separar casos do exercício 3", operation: String.raw`\(9(\alpha^2-1)=0\)`, reason: "casos com determinante zero precisam de escalonamento separado.", account: String.raw`\(\alpha^2-1=(\alpha-1)(\alpha+1)\)`, result: String.raw`\(\alpha=1\) ou \(\alpha=-1\)`, interpretation: "esses são os casos especiais." })),
  paramQ("p-l11-3-a0", "Lista 11 ex. 3(a)", String.raw`Para \(\alpha=0\), a classificação indicada pela lista é:`, ["solução única", "infinitas", "nenhuma"], 0, ["Certo: o determinante é \(-9\neq0\).", "Não: infinitas aparecem no caso \(\alpha=1\).", "Não: nenhuma aparece no caso \(\alpha=-1\)."], "Certo.", fullResolution({ objective: "classificar o caso \(\alpha=0\)", operation: "substituir no determinante", reason: "determinante não zero dá pivôs em todas as variáveis.", account: String.raw`\(9(0^2-1)=-9\neq0\)`, result: "solução única", interpretation: "resolvendo, dá \((2,1,2)\)." })),
  paramQ("p-l11-3-a1", "Lista 11 ex. 3(b)", String.raw`Para \(\alpha=1\), a forma reduzida dá \(x_1+x_3=2,\ x_2=1\). O sistema tem:`, ["infinitas soluções", "nenhuma solução", "solução única"], 0, ["Certo: \(x_3\) fica livre.", "Não há contradição.", "Não é única porque falta pivô em \(x_3\)."], "Certo.", fullResolution({ objective: "ler o caso \(\alpha=1\)", operation: String.raw`\(x_3=t\)`, reason: "a terceira coluna não tem pivô.", account: String.raw`\(x_1=2-t,\ x_2=1,\ x_3=t\)`, result: "infinitas soluções", interpretation: "cada \(t\) gera uma solução." })),
  paramQ("p-l11-3-am1", "Lista 11 ex. 3(c)", String.raw`Para \(\alpha=-1\), a forma reduzida contém \([0,0,0|4]\). Isso significa:`, ["nenhuma solução", "infinitas", "solução única"], 0, [String.raw`Certo: \([0,0,0|4]\Rightarrow0=4\).`, "Não: \(0=4\) não é identidade.", "Não: contradição mata a solução."], "Certo.", fullResolution({ objective: "interpretar a linha contraditória", operation: "traduzir a linha final", reason: "todos os coeficientes são zero, mas o lado direito é 4.", account: String.raw`\(0x_1+0x_2+0x_3=4\Rightarrow0=4\)`, result: "nenhuma solução", interpretation: "não existe vetor que satisfaça tudo." })),
  paramQ("p-l11-4-det", "Lista 11 ex. 4", String.raw`No exercício 4, \(\det(A)=-2(k+3)\). Quando há solução única?`, [String.raw`\(k\neq-3\)`, String.raw`\(k=-3\)`, String.raw`\(k=3\)`], 0, [String.raw`Certo: \(-2(k+3)\neq0\).`, "Não: \(k=-3\) zera o determinante.", "Não: \(k=3\) é só um caso permitido."], "Certo.", fullResolution({ objective: "classificar por \(k\)", operation: String.raw`\(-2(k+3)\neq0\)`, reason: "determinante não zero dá solução única.", account: String.raw`\(k+3\neq0\Rightarrow k\neq-3\)`, result: String.raw`\(k\neq-3\)`, interpretation: "todos esses valores têm uma solução." })),
  paramQ("p-l11-4-k-3", "Lista 11 ex. 4", String.raw`Para \(k=-3\), o escalonamento gera uma contradição. A classificação é:`, ["nenhuma solução", "infinitas soluções", "solução única"], 0, ["Certo: é o caso sem solução.", "Não: para infinitas não poderia aparecer contradição.", "Não: o determinante zerou e a linha final contradiz."], "Certo.", fullResolution({ objective: "analisar o valor especial", operation: String.raw`\(k=-3\)`, reason: "é o único valor que zera o determinante.", account: "a forma reduzida contém uma linha equivalente a \(0=-3\).", result: "nenhuma solução", interpretation: "o item de infinitas não ocorre para nenhum \(k\)." })),
  paramQ("p-l11-4-infinite", "Lista 11 ex. 4", String.raw`No exercício 4, para quais valores de \(k\) há infinitas soluções?`, ["nenhum valor", String.raw`\(k=-3\)`, String.raw`\(k\neq-3\)`], 0, ["Certo: o único caso singular é contraditório.", "Não: \(k=-3\) dá nenhuma solução.", "Não: \(k\neq-3\) dá solução única."], "Certo.", fullResolution({ objective: "separar infinitas de nenhuma", operation: "analisar o caso singular", reason: "infinitas exigem falta de pivô sem contradição.", account: String.raw`\(k=-3\Rightarrow0=-3\)`, result: "nenhum valor", interpretation: "não existe caso com variável livre consistente." })),
  paramQ("p-l11-4-k0", "Lista 11 ex. 4(b)", String.raw`Quando \(k=0\), a solução do exercício 4 é:`, [String.raw`\((0,2,-1)\)`, String.raw`\((2,0,-1)\)`, String.raw`\((0,-1,2)\)`], 0, [String.raw`Certo: \(x_1=0,x_2=2,x_3=-1\).`, "Não: substitua na primeira equação.", "Sinais/posições trocados."], "Certo.", fullResolution({ objective: "resolver o caso \(k=0\)", operation: "escalonar o sistema numérico", reason: String.raw`\(\det=-6\neq0\), então há solução única.`, account: String.raw`A forma reduzida é \([1,0,0|0]\), \([0,1,0|2]\), \([0,0,1|-1]\).`, result: String.raw`\((0,2,-1)\)`, interpretation: "confere nas três equações." })),
  ...[
    ["p-gen-k2", String.raw`Se surge pivô \(k-2\), quando ele zera?`, [String.raw`\(k=2\)`, String.raw`\(k=-2\)`, String.raw`\(k\neq2\)`], 0, String.raw`\(k-2=0\Rightarrow k=2\).`],
    ["p-gen-m1", String.raw`Antes de dividir por \(m+1\), quais casos separar?`, [String.raw`\(m=-1\) e \(m\neq-1\)`, String.raw`\(m=1\) e \(m\neq1\)`, "nenhum"], 0, String.raw`\(m+1=0\Rightarrow m=-1\).`],
    ["p-gen-lambda", String.raw`Se o pivô é \(\lambda\), qual caso especial deve ser analisado?`, [String.raw`\(\lambda=0\)`, String.raw`\(\lambda=1\)`, String.raw`\(\lambda\neq0\) apenas`], 0, String.raw`\(\lambda=0\) é o caso em que não pode dividir.`],
    ["p-gen-alpha1", String.raw`Se o pivô é \(\alpha+1\), quando ele zera?`, [String.raw`\(\alpha=-1\)`, String.raw`\(\alpha=1\)`, String.raw`\(\alpha=0\)`], 0, String.raw`\(\alpha+1=0\Rightarrow\alpha=-1\).`],
    ["p-gen-div", String.raw`Por que não dividir direto por \(k-2\)?`, ["porque pode ser zero", "porque fração é proibida", "porque muda a matriz"], 0, String.raw`se \(k=2\), a divisão seria por zero.`],
    ["p-gen-case", String.raw`No caso \(k\neq2\), \(k-2\) é:`, ["não nulo", "zero", "sempre positivo"], 0, "é não nulo por definição do caso."],
    ["p-gen-sub", String.raw`No caso \(k=2\), o próximo passo é:`, ["substituir no sistema", String.raw`dividir por \(k-2\)`, "ignorar"], 0, "caso especial precisa ser analisado com o valor substituído."],
    ["p-gen-zero-row", String.raw`Se após substituir aparece \([0,0|5]\), a classificação é:`, ["nenhuma solução", "infinitas", "única"], 0, String.raw`isso significa \(0=5\).`],
    ["p-gen-free", String.raw`Se após substituir aparece \([0,0|0]\) e sobra variável sem pivô, a classificação é:`, ["infinitas", "nenhuma", "única"], 0, "há variável livre sem contradição."],
    ["p-gen-det", String.raw`Se \(\det(A)=(m-2)(m+1)\), quais valores exigem caso separado?`, [String.raw`\(m=2\) e \(m=-1\)`, String.raw`\(m=-2\) e \(m=1\)`, "nenhum"], 0, "são os zeros dos fatores."]
  ].map(([id, prompt, choices, answer, explanation]) => paramQ(id, "Gerada", prompt, choices, answer, choices.map((_, i) => i === answer ? `Certo: ${explanation}` : `Não. ${explanation}`), `Certo: ${explanation}`, fullResolution({ objective: "treinar separação de casos", operation: "igualar o possível pivô a zero", reason: "não se divide por expressão que pode zerar.", account: explanation, result: "casos separados", interpretation: "só no caso não nulo a divisão é permitida." }), 1))
];

const lista11FinalQuestions = [
  ...parameterQuestions.filter((item) => item.origin.startsWith("Lista 11")),
  ...homogeneousQuestions.filter((item) => item.origin.startsWith("Lista 11")),
  ...parameterQuestions.filter((item) => item.origin === "Gerada").slice(0, 10),
  ...homogeneousQuestions.filter((item) => item.origin === "Gerada").slice(0, 10),
  ...classifyQuestions.slice(1, 9).map((item) => ({ ...item, origin: "Gerada equivalente Lista 11" }))
];

while (lista11FinalQuestions.length < 50) {
  const base = parameterQuestions[lista11FinalQuestions.length % parameterQuestions.length];
  lista11FinalQuestions.push({ ...base, id: `${base.id}-repeat-${lista11FinalQuestions.length}`, origin: base.origin === "Gerada" ? "Gerada equivalente Lista 11" : base.origin });
}

const guided = [
  { id: "g1", title: "Sistema I: montar a aumentada", body: "Antes de escalonar, traduza o sistema para matriz aumentada. Cada linha é uma equação.", math: matrixTex([[1, 2, -1, -10], [3, 7, 2, -19], [5, 12, 5, -21]]), q: "O que fica depois da barra?", c: ["coeficientes", "lado direito", "pivôs"], a: 1, f: "Depois da barra ficam os termos independentes.", origin: "Lista 10 sistema I", skill: "matriz aumentada" },
  { id: "g2", title: "Objetivo antes da operação", body: "Não aplicamos operação por decoração. Primeiro, diga o objetivo local.", math: matrixTex([[1, 2, -1, -10], [3, 7, 2, -19]]), q: "Qual número queremos zerar na linha 2?", c: ["3", "7", "-19"], a: 0, f: "Queremos zerar o 3 abaixo do pivô 1.", origin: "Lista 10 sistema I", skill: "pivô" },
  { id: "g3", title: "Escolher o pivô", body: "O pivô é o número de apoio. Aqui ele é o 1 da primeira linha.", math: String.raw`\[pivô=1,\quad número\ abaixo=3\]`, q: "Por que o multiplicador é 3?", c: [String.raw`\(3-3\cdot1=0\)`, String.raw`\(3+3\cdot1=6\)`, String.raw`\(1-3=-2\)`], a: 0, f: "O 3 foi escolhido para cancelar exatamente o 3 abaixo do pivô.", origin: "Lista 10 sistema I", skill: "zerar abaixo" },
  { id: "g4", title: String.raw`Calcular \(3L_1\)`, body: "Antes de subtrair, monte o bloco que será subtraído.", math: String.raw`\[L_1=[1,\ 2,\ -1\ |\ -10]\]`, q: String.raw`Quanto é \(3L_1\)?`, c: [String.raw`\([3,\ 6,\ -3\ |\ -30]\)`, String.raw`\([3,\ 6,\ -3\ |\ -10]\)`, String.raw`\([3,\ 5,\ 2\ |\ -19]\)`], a: 0, f: "O lado direito também multiplica: \(3\cdot(-10)=-30\).", origin: "Lista 10 sistema I", skill: "calcular múltiplo" },
  { id: "g5", title: String.raw`Calcular \(L_2-3L_1\)`, body: "Agora subtraia posição por posição, sem parar na barra.", math: String.raw`\[[3,\ 7,\ 2\ |\ -19]-[3,\ 6,\ -3\ |\ -30]\]`, q: String.raw`Quanto é \(-19-(-30)\)?`, c: ["11", "-49", "-11"], a: 0, f: "Subtrair número negativo vira soma: \(-19+30=11\).", origin: "Lista 10 sistema I", skill: "sinal e barra" },
  { id: "g6", title: "Resultado da nova linha 2", body: "A nova linha 2 não foi chutada: veio da combinação equivalente.", math: String.raw`\[[3,\ 7,\ 2\ |\ -19]-3[1,\ 2,\ -1\ |\ -10]=[0,\ 1,\ 5\ |\ 11]\]`, q: "Qual é o erro comum aqui?", c: ["esquecer o lado direito", "trocar linhas é proibido", "pivô nunca pode ser 1"], a: 0, f: "A operação mexe na linha inteira, inclusive depois da barra.", origin: "Lista 10 sistema I", skill: "operação de linha" },
  { id: "g7", title: "Agora zerar o 5", body: "Mesmo pivô, outra linha. O objetivo é zerar o primeiro número da linha 3.", math: matrixTex([[1, 2, -1, -10], [5, 12, 5, -21]]), q: "Qual operação faz isso?", c: [String.raw`\(L_3\leftarrow L_3-5L_1\)`, String.raw`\(L_3\leftarrow L_3+5L_1\)`, String.raw`\(L_1\leftarrow L_1-5L_3\)`], a: 0, f: String.raw`Porque \(5-5\cdot1=0\).`, origin: "Lista 10 sistema I", skill: "zerar abaixo" },
  { id: "g8", title: String.raw`Calcular \(5L_1\)`, body: "A conta auxiliar evita erro de sinal no próximo passo.", math: String.raw`\[L_1=[1,\ 2,\ -1\ |\ -10]\]`, q: String.raw`Quanto é \(5L_1\)?`, c: [String.raw`\([5,\ 10,\ -5\ |\ -50]\)`, String.raw`\([5,\ 10,\ -5\ |\ -10]\)`, String.raw`\([5,\ 12,\ 5\ |\ -21]\)`], a: 0, f: "O \(-50\) veio de \(5\cdot(-10)\).", origin: "Lista 10 sistema I", skill: "calcular múltiplo" },
  { id: "g9", title: String.raw`Calcular \(L_3-5L_1\)`, body: "Agora atualize a linha 3 inteira.", math: String.raw`\[[5,\ 12,\ 5\ |\ -21]-[5,\ 10,\ -5\ |\ -50]\]`, q: "Qual é a nova linha 3?", c: [String.raw`\([0,\ 2,\ 10\ |\ 29]\)`, String.raw`\([0,\ 2,\ 10\ |\ -21]\)`, String.raw`\([10,\ 22,\ 0\ |\ -71]\)`], a: 0, f: "O 29 vem de \(-21-(-50)\).", origin: "Lista 10 sistema I", skill: "subtrair linhas" },
  { id: "g10", title: "Segundo pivô", body: "A segunda linha agora tem pivô 1 na coluna 2. A linha 3 tem 2 abaixo dele.", math: matrixTex([[0, 1, 5, 11], [0, 2, 10, 29]]), q: "Qual número queremos zerar agora?", c: ["2", "10", "29"], a: 0, f: "Queremos zerar o 2 abaixo do pivô 1 da coluna 2.", origin: "Lista 10 sistema I", skill: "pivô" },
  { id: "g11", title: String.raw`Operação \(L_3-2L_2\)`, body: "O multiplicador 2 veio de \(2-2\cdot1=0\).", math: String.raw`\[[0,\ 2,\ 10\ |\ 29]-2[0,\ 1,\ 5\ |\ 11]\]`, q: String.raw`Quanto é \(2L_2\)?`, c: [String.raw`\([0,\ 2,\ 10\ |\ 22]\)`, String.raw`\([0,\ 2,\ 10\ |\ 11]\)`, String.raw`\([0,\ 1,\ 5\ |\ 22]\)`], a: 0, f: "De novo: \(2\cdot11=22\).", origin: "Lista 10 sistema I", skill: "calcular múltiplo" },
  { id: "g12", title: "A contradição aparece", body: "A linha final traduz a classificação do sistema.", math: String.raw`\[[0,\ 2,\ 10\ |\ 29]-[0,\ 2,\ 10\ |\ 22]=[0,\ 0,\ 0\ |\ 7]\]`, q: "O que essa linha significa?", c: [String.raw`\(0=7\)`, String.raw`\(7=7\)`, "variável livre"], a: 0, f: "Como \(0=7\) é impossível, o sistema não tem solução.", origin: "Lista 10 sistema I", skill: "contradição" },
  { id: "g13", title: "Sistema II: solução esperada", body: "Agora um sistema com solução única. Vamos conferir por escalonamento e substituição.", math: String.raw`\[\begin{cases}3x_1+x_2+x_3=4\\2x_1-x_2-x_3=6\\-4x_1+x_2-5x_3=20\end{cases}\]`, q: "Qual técnica vamos usar primeiro?", c: ["montar matriz aumentada", "ignorar sinais", "dividir por parâmetro"], a: 0, f: "Sem matriz aumentada, o escalonamento vira bagunça.", origin: "Lista 10 sistema II", skill: "matriz aumentada" },
  { id: "g14", title: "Sistema II: aumentada", body: "Copie sinais e lado direito com cuidado.", math: matrixTex([[3, 1, 1, 4], [2, -1, -1, 6], [-4, 1, -5, 20]]), q: String.raw`Na linha 2, o coeficiente de \(x_3\) é:`, c: ["-1", "1", "6"], a: 0, f: "A equação tem \(-x_3\), então o coeficiente é \(-1\).", origin: "Lista 10 sistema II", skill: "matriz aumentada" },
  { id: "g15", title: "Sistema II: uma forma reduzida", body: "Depois de operações de linha, a forma reduzida fica direta de ler.", math: matrixTex([[1, 0, 0, 2], [0, 1, 0, 3], [0, 0, 1, -5]]), q: "Qual solução essa matriz mostra?", c: [String.raw`\((2,3,-5)\)`, String.raw`\((3,2,-5)\)`, String.raw`\((-5,3,2)\)`], a: 0, f: "Cada linha já isola uma variável.", origin: "Lista 10 sistema II", skill: "ler matriz final" },
  { id: "g16", title: "Sistema II: conferir", body: "A prova gosta de conta; a conferência pega erro de sinal.", math: String.raw`\[3(2)+3+(-5)=4,\quad 2(2)-3-(-5)=6,\quad -4(2)+3-5(-5)=20\]`, q: "A substituição passa nas três?", c: ["sim", "não", "só nas duas primeiras"], a: 0, f: "Sim. Logo \((2,3,-5)\) é solução única.", origin: "Lista 10 sistema II", skill: "verificar solução" }
];

const phases = [
  {
    id: "fund",
    phase: "Fase 0",
    title: "Coeficiente e termo independente",
    explain: "Coeficiente multiplica variável. Termo independente fica do outro lado da igualdade.",
    why: "Sem isso, a matriz aumentada vira cópia aleatória de números.",
    example: String.raw`Em \(3x_1+7x_2+2x_3=-19\), \(3,7,2\) são coeficientes e \(-19\) é termo independente.`,
    question: "Qual é o termo independente?",
    choices: ["7", "-19", "2"],
    answer: 1,
    feedback: "Ele fica depois da igualdade, não junto das variáveis.",
    origin: "Lista 10 sistema I",
    skill: "fundamentos"
  },
  ...linearQuestions.slice(0, 6).map((item) => ({
    id: item.id,
    phase: "Lista 10 ex. 1",
    title: "Equação linear ou armadilha?",
    explain: "Antes de sistemas, filtre as equações. Linear exige variáveis em grau 1, sem produto, raiz ou denominador com variável.",
    why: "Se a equação não é linear, escalonamento de sistema linear não se aplica.",
    example: item.prompt,
    question: "Classifique:",
    choices: item.choices,
    answer: item.answer,
    feedbacks: item.feedbacks,
    feedback: item.correct,
    solution: item.solution,
    origin: item.origin,
    skill: item.skill
  })),
  {
    id: "system",
    phase: "Lista 10 ex. 2",
    title: "Solução de sistema",
    explain: "Um vetor só é solução se passa em todas as equações ao mesmo tempo.",
    why: "Acertar uma equação só não basta. Sistema é pacote fechado.",
    example: String.raw`Teste \((1,2,-3)\): a segunda passa, mas a primeira falha.`,
    question: "Se falha em uma equação, ainda é solução?",
    choices: ["Sim", "Não"],
    answer: 1,
    feedback: "Não. Precisa passar nas duas.",
    origin: "Lista 10 ex. 2",
    skill: "verificar solução"
  },
  ...solutionQuestions.slice(1, 4).map((item) => ({
    id: item.id,
    phase: "Lista 10 ex. 2",
    title: "Substituir vetor",
    explain: "Substitua \(x_1,x_2,x_3\) nas duas equações. Só conclua depois da segunda.",
    why: "A prova cobra simultaneamente, não equação isolada.",
    example: item.prompt,
    question: "Qual é a conclusão?",
    choices: item.choices,
    answer: item.answer,
    feedbacks: item.feedbacks,
    feedback: item.correct,
    solution: item.solution,
    origin: item.origin,
    skill: item.skill
  })),
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
    feedback: "Coeficientes antes da barra, lado direito depois.",
    origin: "Lista 10 sistema I",
    skill: "matriz aumentada"
  },
  {
    id: "spell-scale",
    phase: "Fase 2",
    title: "Feitiços legais de linha",
    explain: String.raw`\(L_i\leftarrow cL_i\) multiplica a linha inteira por \(c\), com \(c\neq0\).`,
    why: "Multiplicar por zero apaga a equação; por isso é proibido.",
    example: String.raw`\(\frac{1}{4}[0,\ 4\ |\ 8]=[0,\ 1\ |\ 2]\).`,
    question: "Qual operação transforma 4 em 1?",
    choices: [String.raw`\(L_2\leftarrow4L_2\)`, String.raw`\(L_2\leftarrow\frac{1}{4}L_2\)`, String.raw`\(L_2\leftarrow0L_2\)`],
    answer: 1,
    feedback: String.raw`Multiplicar por \(\frac{1}{4}\) é dividir tudo por 4, inclusive depois da barra.`,
    origin: "Base para Lista 10",
    skill: "operações de linha"
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
    feedback: "O múltiplo foi escolhido para zerar exatamente o número abaixo do pivô.",
    origin: "Lista 10 sistema I",
    skill: "pivô"
  },
  {
    id: "classify",
    phase: "Fase 5",
    title: "Ler a matriz final",
    explain: String.raw`A linha \([0,\ 0,\ 0\ |\ 7]\) significa \(0=7\). Isso é impossível.`,
    why: "Nenhum valor das variáveis muda o lado esquerdo, porque todos os coeficientes são zero.",
    example: String.raw`No primeiro sistema da Lista 10 aparece \([0,\ 0,\ 0\ |\ 7]\).`,
    question: "Qual é a classificação?",
    choices: ["Solução única", "Nenhuma solução", "Infinitas"],
    answer: 1,
    feedback: "Contradição significa sistema sem solução.",
    origin: "Lista 10 sistema I",
    skill: "classificação"
  },
  {
    id: "homogeneous",
    phase: "Fase 6",
    title: "Homogêneo",
    explain: String.raw`Sistema homogêneo tem lado direito zero: \(A\vec{x}=\vec{0}\).`,
    why: "Tudo zero sempre funciona; por isso homogêneo nunca é impossível.",
    example: String.raw`Na Lista 11 ex. 5, \(\det(A)=3\alpha\). O caso especial é \(\alpha=0\).`,
    question: "Homogêneo pode ser sem solução?",
    choices: ["Sim", "Não"],
    answer: 1,
    feedback: String.raw`Não. \(\vec{x}=\vec{0}\) sempre resolve.`,
    origin: "Lista 11 ex. 5 e 6",
    skill: "homogêneos"
  },
  {
    id: "parameters",
    phase: "Fase 7",
    title: "Câmara dos Parâmetros",
    explain: String.raw`Se aparece pivô \(k-2\), descubra quando ele zera antes de dividir.`,
    why: "Dividir por algo que pode ser zero apaga o caso especial.",
    example: String.raw`\(k-2=0\Rightarrow k=2\). Casos: \(k\neq2\) e \(k=2\).`,
    question: String.raw`Quando \(k-2\) zera?`,
    choices: [String.raw`\(k=2\)`, String.raw`\(k=-2\)`, String.raw`\(k\neq2\)`],
    answer: 0,
    feedback: String.raw`Certo. Só pode dividir por \(k-2\) no caso \(k\neq2\).`,
    origin: "Lista 11",
    skill: "parâmetros"
  },
  {
    id: "system-iii-warning",
    phase: "Lista 10 sistema III",
    title: "Enunciado a conferir",
    explain: "O PDF extraído mostra a segunda equação do Sistema III com possível erro de OCR. Ela fica marcada para conferência.",
    why: "Melhor não treinar em cima de uma equação possivelmente copiada errada.",
    example: String.raw`Texto extraído: \(-2x_1+5x-72x_3=27\).`,
    question: "Devemos inventar a equação faltante?",
    choices: ["Não", "Sim", "Só para treinar"],
    answer: 0,
    feedback: "Certo. O app não usa o Sistema III como resolução até o enunciado ser conferido.",
    origin: "Lista 10 sistema III",
    skill: "auditoria de enunciado"
  }
];

const diagnostic = [
  { target: "fund", q: String.raw`Em \(5x_1+12x_2+5x_3=-21\), o coeficiente de \(x_2\) é:`, c: ["12", "-21", "5"], a: 0 },
  { target: "fund", q: String.raw`O termo independente em \(3x_1+7x_2+2x_3=-19\) é:`, c: ["2", "-19", "7"], a: 1 },
  { target: "linear", q: String.raw`\(x_1+4x_3x_4=20\) é linear?`, c: ["Sim", "Não"], a: 1 },
  { target: "system", q: "Uma solução de sistema precisa satisfazer:", c: ["uma equação", "todas as equações", "só a última"], a: 1 },
  { target: "matrix", q: "Na matriz aumentada, a barra separa:", c: ["coeficientes e lado direito", "linhas e colunas", "pivôs e zeros"], a: 0 },
  { target: "spell-scale", q: String.raw`Transformar \(4y=8\) em \(y=2\) é:`, c: [String.raw`multiplicar por \(\frac{1}{4}\)`, "multiplicar por 4", "multiplicar por 0"], a: 0 },
  { target: "parameters", q: String.raw`Antes de dividir por \(\lambda-1\), precisamos testar:`, c: [String.raw`\(\lambda=1\)`, String.raw`\(\lambda=-1\)`, "nada"], a: 0 },
  { target: "homogeneous", q: "Sistema homogêneo sempre tem:", c: ["a trivial", "contradição", "lado direito 7"], a: 0 }
];

const bossSets = {
  matrix: {
    title: "Boss 1: Matriz aumentada",
    medal: "bar",
    qs: matrixQuestions
  },
  rows: {
    title: "Boss 2: Operações de linha",
    medal: "auror",
    qs: lab.map((item) => q({
      id: `boss-${item.id}`,
      tipo: "operações de linha",
      origin: item.origin,
      difficulty: item.difficulty,
      prompt: `${item.matrix}<br>${item.q}`,
      choices: item.choices.map((choice) => choice.t),
      answer: item.choices.findIndex((choice) => choice.ok),
      feedbacks: item.choices.map((choice) => choice.f),
      correct: item.choices.find((choice) => choice.ok)?.f || "Certo.",
      solution: item.solution,
      skill: item.skill,
      review: `Revisar ${item.skill}.`
    }))
  },
  classify: {
    title: "Boss 3: Classificador",
    medal: "zeroSeven",
    qs: classifyQuestions
  },
  homogeneous: {
    title: "Boss 4: Homogêneos",
    medal: "patrono",
    qs: homogeneousQuestions
  },
  params: {
    title: "Boss 5: Câmara dos Parâmetros",
    medal: "params",
    qs: parameterQuestions
  },
  mixed: {
    title: "Boss final: Lista 11 real",
    medal: "boss",
    qs: lista11FinalQuestions.slice(0, 55)
  }
};

const infinitePool = [
  ...linearQuestions,
  ...solutionQuestions,
  ...matrixQuestions,
  ...bossSets.rows.qs,
  ...classifyQuestions,
  ...homogeneousQuestions,
  ...parameterQuestions
];

function home() {
  screen = { mode: "home", index: 0, boss: "mixed", score: 0, errors: [], item: null };
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
        ${menuButton("Laboratório de operações de linha", `${lab.length} desafios com conta inteira`, "lab")}
        ${menuButton("Exemplo guiado Lista 10", "Sistema I ativo + Sistema II resolvido", "guided")}
        ${menuButton("Duelos rápidos", "Bosses por habilidade", "duels")}
        ${menuButton("Treino infinito", "Questões das listas + geradas no escopo", "infinite")}
        ${menuButton("Câmara dos Parâmetros", "Boss real da Lista 11", "params")}
        ${menuButton("Boss fight Lista 11", locked ? "Bloqueado: ganhe 140 XP ou conclua o exemplo" : `${bossSets.mixed.qs.length} questões reais`, "finalBoss", locked)}
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
      ${sourceChip(data)}
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
        <button class="primary" data-next="${mode}" disabled>${index === total - 1 ? (options.doneLabel || "Concluir") : "Próximo"}</button>
        <button class="secondary" data-repeat="${mode}">${mode === "guided" ? "Refazer passo" : "Refazer tela"}</button>
      </div>
    </section>
  `);
}

function journey(index = 0) {
  screen = { mode: "journey", index, boss: "mixed", score: 0, errors: [], item: null };
  renderMission("journey", phases[index], index, phases.length, { doneLabel: "Voltar ao menu" });
}

function diagnosticMode(index = 0, score = 0, misses = []) {
  screen = { mode: "diagnostic", index, score, errors: misses, item: null };
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
        <button class="primary" data-next="diagnostic" disabled>Próxima</button>
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
  screen = { mode: "lab", index, boss: "mixed", score: 0, errors: [], item: null };
  const item = lab[index];
  setStage(`
    <section class="micro">
      <div class="module-header">
        <span class="pill">Laboratório ${index + 1}/${lab.length}</span>
        <h2>${item.title}</h2>
        <div class="bar"><span style="width:${((index + 1) / lab.length) * 100}%"></span></div>
      </div>
      ${sourceChip(item)}
      <div class="math-box">${item.matrix}</div>
      <details class="hint"><summary>De onde veio esse número?</summary><p>${item.why}</p></details>
      <div class="choices">
        <p><strong>${item.q}</strong></p>
        ${item.choices.map((choice, i) => `<button class="choice" data-lab="${i}">${choice.t}</button>`).join("")}
      </div>
      <div id="feedback" class="feedback"></div>
      <div class="actions">
        <button class="primary" data-next="lab" disabled>${index === lab.length - 1 ? "Concluir lab" : "Próximo treino"}</button>
        <button class="secondary" data-repeat="lab">Refazer desafio</button>
      </div>
    </section>
  `);
}

function guidedMode(index = 0) {
  screen = { mode: "guided", index, boss: "mixed", score: 0, errors: [], item: null };
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
    solution: item.solution,
    origin: item.origin,
    skill: item.skill,
    why: "Objetivo, operação, motivo e conta ficam juntos para a resolução não pular o porquê."
  }, index, guided.length, { kicker: "Lista 10", doneLabel: "Concluir exemplo" });
}

function duels() {
  screen = { mode: "duels", index: 0, boss: "mixed", score: 0, errors: [], item: null };
  setStage(`
    <section class="stack">
      <div class="panel stack">
        <span class="pill">Duelos rápidos</span>
        <h2>Escolha um boss curto</h2>
        <p>Cada boss tem feedback imediato, origem da questão e conta completa após a resposta.</p>
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
  screen = { mode: key === "mixed" ? "finalBoss" : "boss", index, boss: key, score, errors, item: null };
  const item = set.qs[index];
  setStage(`
    <section class="micro">
      <div class="module-header">
        <span class="pill">Pontuação ${score}/${set.qs.length}</span>
        <h2>${set.title}</h2>
        <div class="bar"><span style="width:${((index + 1) / set.qs.length) * 100}%"></span></div>
      </div>
      ${sourceChip(item)}
      <div class="choices">
        <p><strong>${item.prompt}</strong></p>
        ${item.choices.map((choice, i) => `<button class="choice" data-boss-answer="${i}">${choice}</button>`).join("")}
      </div>
      <div id="feedback" class="feedback"></div>
      <div class="actions">
        <button class="primary" data-next="boss" disabled>${index === set.qs.length - 1 ? "Ver desempenho" : "Próxima pergunta"}</button>
        <button class="secondary" data-repeat="boss">Reiniciar boss</button>
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
  const counts = screen.errors.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
  const recs = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  setStage(`
    <section class="panel stack">
      <span class="pill">${screen.score}/${set.qs.length}</span>
      <h2>${passed ? "Boss vencido" : "Ainda dá para fortalecer"}</h2>
      <p>${passed ? "Você justificou bem as decisões." : "Revise os pontos abaixo e tente de novo."}</p>
      ${recs.length ? `<div class="mission-list">${recs.map(([r, n]) => `<div class="mission-card"><strong>${r}</strong><small>${n} erro(s)</small></div>`).join("")}</div>` : ""}
      <div class="actions">
        <button class="primary" data-boss="${screen.boss}">Treinar de novo</button>
        <button class="secondary" data-mode="infinite">Treino infinito</button>
        <button class="secondary" data-mode="home">Menu</button>
      </div>
    </section>
  `);
}

function paramsMode() {
  bossMode("params", 0, 0, []);
}

function pickInfiniteQuestion() {
  const item = infinitePool[Math.floor(Math.random() * infinitePool.length)];
  state.stats.seen[item.id] = (state.stats.seen[item.id] || 0) + 1;
  saveState();
  return item;
}

function infiniteMode(item = pickInfiniteQuestion()) {
  screen = { mode: "infinite", index: 0, boss: "infinite", score: 0, errors: [], item };
  setStage(`
    <section class="micro">
      <div class="module-header">
        <span class="pill">Treino infinito</span>
        <h2>${item.tipo || "Questão"}</h2>
        <div class="bar"><span style="width:${Math.min(100, state.streak * 10)}%"></span></div>
      </div>
      ${sourceChip(item)}
      <div class="choices">
        <p><strong>${item.prompt}</strong></p>
        ${item.choices.map((choice, i) => `<button class="choice" data-infinite-answer="${i}">${choice}</button>`).join("")}
      </div>
      <div id="feedback" class="feedback"></div>
      <div class="actions">
        <button class="primary" data-next="infinite" disabled>Próxima aleatória</button>
        <button class="secondary" data-mode="home">Menu</button>
      </div>
    </section>
  `);
}

function grimoire() {
  screen = { mode: "grimoire", index: 0, boss: "mixed", score: 0, errors: [], item: null };
  const cards = [
    ["Notação", String.raw`<ul><li>\(L_i\): linha \(i\).</li><li>\(L_j\): outra linha usada como apoio.</li><li>\([A|b]\): matriz dos coeficientes com a coluna do lado direito.</li></ul>`],
    ["Tabela de operações", String.raw`<ul><li>\(L_i\leftrightarrow L_j\): troca a ordem das equações.</li><li>\(L_i\leftarrow cL_i\), \(c\neq0\): multiplica a linha inteira.</li><li>\(L_i\leftarrow L_i+cL_j\): soma múltiplo de outra linha.</li><li>\(c=0\) é proibido porque apaga informação.</li></ul>`],
    [String.raw`Exemplo \(L_2-3L_1\)`, String.raw`<p>Objetivo: zerar o 3 abaixo do pivô 1.</p><p>\(3L_1=[3,6,-3|-30]\).</p><p>\([3,7,2|-19]-[3,6,-3|-30]=[0,1,5|11]\).</p><p>A barra participa: \(-19-(-30)=11\).</p>`],
    ["Classificação", String.raw`<ul><li>Pivô em todas as variáveis: solução única.</li><li>\([0,0,0|c]\), \(c\neq0\): nenhuma solução.</li><li>Sem contradição e com variável sem pivô: infinitas soluções.</li><li>\([0,0,0|0]\) sozinho não prova infinitas; precisa faltar pivô.</li></ul>`],
    ["Homogêneos", String.raw`<ul><li>Lado direito zero: \(A\vec{x}=0\).</li><li>Sempre tem a trivial \(\vec{x}=0\).</li><li>\(\det(A)\neq0\): só trivial.</li><li>\(\det(A)=0\): há variáveis livres e soluções não triviais.</li><li>Lista 11 ex. 5: \(\det=3\alpha\), especial \(\alpha=0\), geral \((-t,t,t)\).</li><li>Lista 11 ex. 6: \(\det=3m(m-3)\), só trivial se \(m\neq0,3\).</li></ul>`],
    ["Parâmetros", String.raw`<ul><li>Não divida por \(k-2\), \(m+1\), \(\lambda-1\) ou \(\alpha+1\) sem separar o zero.</li><li>Caso geral: expressão \(\neq0\), pode dividir.</li><li>Caso especial: expressão \(=0\), substitua e classifique.</li><li>Lista 11 ex. 1(a): \(\lambda\neq1\) única; \(\lambda=1\) nenhuma; infinitas nunca.</li><li>Lista 11 ex. 4: \(k\neq-3\) única; \(k=-3\) nenhuma; infinitas nunca.</li></ul>`],
    ["Lista 10 Sistema III", String.raw`<p>Marcado como <strong>conferir enunciado</strong>. A extração do PDF mostrou a segunda equação como \(-2x_1+5x-72x_3=27\), com possível erro de OCR. O app não inventa essa equação.</p>`],
    ["Erros comuns", String.raw`<ul><li>Esquecer o lado direito depois da barra.</li><li>Somar quando precisava subtrair.</li><li>Dividir por parâmetro que pode zerar.</li><li>Chamar \(0=0\) de contradição.</li><li>Achar que passar em uma equação basta.</li></ul>`],
    ["Checklist de prova", "<ul><li>Copiei sinais?</li><li>Montei [A|b] corretamente?</li><li>Escolhi pivô não nulo?</li><li>Mostrei a conta da linha inteira?</li><li>Classifiquei por pivô, contradição e variável livre?</li><li>Separei casos de parâmetro?</li></ul>"]
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
  screen = { mode: "checklist", index: 0, boss: "mixed", score: 0, errors: [], item: null };
  const items = [
    "Li o sistema direito?",
    "Montei a matriz aumentada?",
    "Copiei o lado direito?",
    "Escolhi pivô?",
    "Zerei abaixo do pivô?",
    "Fiz a conta depois da barra?",
    String.raw`Apareceu \(0=c\), com \(c\neq0\)?`,
    String.raw`Apareceu \(0=0\)?`,
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
  const correctAnswer = item.answer ?? item.a;
  const correct = selected === correctAnswer;
  markChoices(selected, correctAnswer);
  const fb = $("#feedback");
  if (screen.mode === "diagnostic") {
    if (correct) screen.score += 1;
    else screen.errors.push(item.target);
    fb.innerHTML = correct ? "Acertou." : "Quase. Vou recomendar revisão, sem bloquear nada.";
  } else {
    const msg = correct
      ? (item.feedback || item.f || "Certo.")
      : (item.feedbacks?.[selected] || item.wrong || item.feedback || item.f || "Revise a conta.");
    fb.innerHTML = `${correct ? addXp(10, "missão") : "Ainda não."} ${msg}${solutionBlock(item)}`;
    correct ? complete(item.id) : miss(item.skill || "jornada");
  }
  fb.className = `feedback show ${correct ? "success" : "danger"}`;
  enableNextButtons();
  typeset();
}

function answerLab(selected) {
  const item = lab[screen.index];
  const choice = item.choices[selected];
  const correctIndex = item.choices.findIndex((c) => c.ok);
  markChoices(selected, correctIndex, "[data-lab]");
  if (choice.ok) {
    state.labCorrect += 1;
    addXp(12, "laboratório");
    complete(`lab-${item.id}`);
  } else {
    miss(item.skill);
  }
  $("#feedback").innerHTML = `${choice.ok ? "" : "Ainda não. "}${choice.f}${solutionBlock(item)}`;
  $("#feedback").className = `feedback show ${choice.ok ? "success" : "danger"}`;
  enableNextButtons();
  typeset();
}

function answerBoss(selected) {
  const set = bossSets[screen.boss];
  const item = set.qs[screen.index];
  const correct = selected === item.answer;
  markChoices(selected, item.answer, "[data-boss-answer]");
  if (correct) screen.score += 1;
  else {
    screen.errors.push(item.review);
    miss(item.skill || item.review);
  }
  const msg = correct ? item.correct : (item.feedbacks?.[selected] || item.review);
  $("#feedback").innerHTML = `${correct ? "Acertou. " : "Ainda não. "}${msg}${solutionBlock(item)}`;
  $("#feedback").className = `feedback show ${correct ? "success" : "danger"}`;
  enableNextButtons();
  typeset();
}

function answerInfinite(selected) {
  const item = screen.item;
  const correct = selected === item.answer;
  markChoices(selected, item.answer, "[data-infinite-answer]");
  if (correct) {
    addXp(8, "treino infinito");
    if (state.streak >= 10) award("infinite");
  } else {
    miss(item.skill || item.review);
  }
  const recs = topMistakes();
  const msg = correct ? item.correct : (item.feedbacks?.[selected] || item.review);
  $("#feedback").innerHTML = `${correct ? "Acertou. " : "Ainda não. "}${msg}${solutionBlock(item)}${recs.length ? `<p class="tiny">Erros frequentes: ${recs.map(([k, v]) => `${k} (${v})`).join(", ")}.</p>` : ""}`;
  $("#feedback").className = `feedback show ${correct ? "success" : "danger"}`;
  enableNextButtons();
  typeset();
}

function markChoices(selected, answer, selector = "[data-answer]") {
  $$(selector).forEach((btn) => {
    btn.disabled = true;
    const value = Number(btn.dataset.answer ?? btn.dataset.lab ?? btn.dataset.bossAnswer ?? btn.dataset.infiniteAnswer);
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
  if (kind === "infinite") return infiniteMode();
}

function repeat(kind) {
  if (kind === "journey") return journey(screen.index);
  if (kind === "lab") return labMode(screen.index);
  if (kind === "guided") return guidedMode(screen.index);
  if (kind === "boss") return bossMode(screen.boss, 0, 0, []);
  if (kind === "infinite") return infiniteMode(screen.item);
}

function route(mode) {
  if (mode === "home") return home();
  if (mode === "continue") {
    const nextItem = nextMission();
    return route(nextItem.mode);
  }
  if (mode === "journey") return journey(0);
  if (mode === "diagnostic") return diagnosticMode(0, 0, []);
  if (mode === "lab") return labMode(0);
  if (mode === "guided") return guidedMode(0);
  if (mode === "duels") return duels();
  if (mode === "params") return paramsMode();
  if (mode === "finalBoss") return bossMode("mixed", 0, 0, []);
  if (mode === "infinite") return infiniteMode();
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

  const infiniteAns = event.target.closest("[data-infinite-answer]");
  if (infiniteAns) return answerInfinite(Number(infiniteAns.dataset.infiniteAnswer));

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
