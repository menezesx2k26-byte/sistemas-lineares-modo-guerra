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
  userProfile: null,
  skillScores: {},
  errorTypes: {},
  hintsUsed: 0,
  lastRecommendation: null,
  adaptiveQueue: [],
  history: [],
  modeProgress: {
    escalonamentoSemQuadro: 0,
    discussaoSistemas: 0,
    lista11Total: 0
  },
  progressPercent: 0,
  estimatedMastery: 0,
  operationalConfidence: "instavel",
  currentSystemId: null,
  currentPhase: "diagnostico",
  boardProgress: { systemIndex: 0, stepIndex: 0 },
  completedSystems: [],
  completedBoardModeSystems: [],
  completedWithoutHints: [],
  solvedOriginalList11: 0,
  solvedDerivedSystems: 0,
  bossFinalPassed: false,
  boardAttempts: [],
  blankSheetAttempts: [],
  bossFinalAttempts: [],
  proofSkills: {
    matrixSetup: 0,
    pivotChoice: 0,
    rowOperations: 0,
    arithmeticControl: 0,
    parameterCaseSplit: 0,
    determinantUse: 0,
    rankDiscussion: 0,
    homogeneousSystems: 0,
    writtenConclusion: 0
  },
  errorProfile: {
    conceptual: 0,
    arithmetic: 0,
    organization: 0,
    conclusion: 0,
    parameterDivision: 0,
    homogeneousConfusion: 0,
    prematureSPI: 0,
    ignoredContradiction: 0,
    missingFreeVariable: 0,
    determinantMisuse: 0,
    missingCaseSplit: 0
  },
  lista11TotalAttempts: [],
  bossUnlocked: false,
  theme: "light",
  optionalReview: { foundations: false },
  stats: { mistakes: {}, seen: {} }
};

let state = loadState();
let screen = { mode: "home", index: 0, boss: "mixed", score: 0, errors: [], item: null };
let blankTimerHandle = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...defaultState,
      ...saved,
      optionalReview: { ...defaultState.optionalReview, ...(saved.optionalReview || {}) },
      stats: { ...defaultState.stats, ...(saved.stats || {}) },
      skillScores: { ...defaultState.skillScores, ...(saved.skillScores || {}) },
      errorTypes: { ...defaultState.errorTypes, ...(saved.errorTypes || {}) },
      modeProgress: { ...defaultState.modeProgress, ...(saved.modeProgress || {}) },
      boardProgress: { ...defaultState.boardProgress, ...(saved.boardProgress || {}) },
      completedSystems: Array.isArray(saved.completedSystems) ? saved.completedSystems : [],
      completedBoardModeSystems: Array.isArray(saved.completedBoardModeSystems) ? saved.completedBoardModeSystems : [],
      completedWithoutHints: Array.isArray(saved.completedWithoutHints) ? saved.completedWithoutHints : [],
      boardAttempts: Array.isArray(saved.boardAttempts) ? saved.boardAttempts : [],
      blankSheetAttempts: Array.isArray(saved.blankSheetAttempts) ? saved.blankSheetAttempts : [],
      bossFinalAttempts: Array.isArray(saved.bossFinalAttempts) ? saved.bossFinalAttempts : [],
      proofSkills: { ...defaultState.proofSkills, ...(saved.proofSkills || {}) },
      errorProfile: { ...defaultState.errorProfile, ...(saved.errorProfile || {}) },
      lista11TotalAttempts: Array.isArray(saved.lista11TotalAttempts) ? saved.lista11TotalAttempts : [],
      adaptiveQueue: Array.isArray(saved.adaptiveQueue) ? saved.adaptiveQueue : [],
      history: Array.isArray(saved.history) ? saved.history : []
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  updateComputedMetrics();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderHud();
}

function typeset() {
  if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
}

const PAGE_TITLES = {
  home: "Sistemas Lineares | Modo Guerra",
  board: "Quadro de Sistemas Lineares | Modo Guerra",
  diagnostic: "Diagnostico de Sistemas Lineares | Modo Guerra",
  bossFinalBoard: "Boss Final de Sistemas Lineares | Modo Guerra",
  blankSheet: "Folha em Branco - Lista 11 | Modo Guerra",
  blankSheetCase: "Folha em Branco - Lista 11 | Modo Guerra",
  blankSheetMessy: "Minha folha ficou confusa | Modo Guerra",
  blankSheetResult: "Resultado da Folha em Branco | Modo Guerra",
  grimoire: "Grimorio de Sistemas Lineares | Modo Guerra",
  journey: "Trilha de Estudo de Sistemas Lineares | Modo Guerra",
  journeyMap: "Trilha de Estudo | Modo Guerra",
  readinessReport: "Relatorio de Prontidao | Modo Guerra",
  lab: "Laboratorio de Sistemas Lineares | Modo Guerra",
  infinite: "Treino Infinito | Modo Guerra"
};

function pageTitleFor(mode = screen.mode) {
  if (typeof PROOF_MODES !== "undefined" && PROOF_MODES?.[mode]) return `${PROOF_MODES[mode].title} | Modo Guerra`;
  if (PAGE_TITLES[mode]) return PAGE_TITLES[mode];
  if (mode?.endsWith?.("Result")) return "Resultado do treino | Modo Guerra";
  return "Sistemas Lineares | Modo Guerra";
}

function ensureSingleH1(html) {
  if (/<h1[\s>]/i.test(html)) return html;
  return html.replace("<h2", "<h1").replace("</h2>", "</h1>");
}

function updatePageMeta() {
  document.title = pageTitleFor();
  document.body.dataset.focusMode = String(screen.mode || "").startsWith("blankSheet") ? "blank" : "";
  const main = $("#appStage");
  if (main) main.focus({ preventScroll: true });
}

function learningStepper(current = "diagnostic") {
  const order = [
    ["diagnostic", "Diagnostico", "Descubra seu ponto de partida"],
    ["study", "Estudo", "Aprenda a tecnica antes de usar"],
    ["practice", "Pratica", "Escalone e classifique"],
    ["challenge", "Desafio", "Boss sem dica direta"],
    ["review", "Revisao", "Grimorio e anti-vacilo"]
  ];
  const currentIndex = Math.max(0, order.findIndex(([key]) => key === current));
  return `
    <nav class="stepper" aria-label="Trilha recomendada">
      ${order.map(([key, title, subtitle], index) => `
        <div class="stepper-step ${index < currentIndex ? "done" : index === currentIndex ? "current" : ""}" aria-current="${index === currentIndex ? "step" : "false"}">
          <strong>${index + 1}. ${title}</strong>
          <small>${subtitle}</small>
        </div>
      `).join("")}
    </nav>
  `;
}

function reviewLinkBlock(item = {}) {
  const label = item.skill ? humanSkillLabel(item.skill) : "teoria relacionada";
  return `<div class="inline-actions"><button class="secondary" type="button" data-mode="grimoire">Revisar no Grimorio: ${label}</button></div>`;
}

function errorSummaryBlock(items = [], title = "Resumo de revisao") {
  if (!items.length) return "";
  return `
    <section class="error-summary" role="status" aria-live="polite" aria-label="${title}">
      <strong>${title}</strong>
      <ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>
  `;
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
  recordPerformance({ skill, correct: false, errorType: inferErrorType(skill), source: screen.mode || "app" });
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
  if (id === "matrix" || id === "course-c3-22-system-i-full") award("bar");
  if (id === "checklist") award("patrono");
  if (id === "contradiction" || id === "course-c5-38-g12" || id === "course-c6-46-lista10-i") award("zeroSeven");
  if (id === "parameters" || id.startsWith("course-c8-")) award("params");
  if (id === "course-c10-75-campaign-complete") award("boss");
  saveState();
}

function renderHud() {
  applyTheme();
  $("#xpStat").textContent = `${state.xp} XP`;
  $("#streakStat").textContent = `${state.streak} sequência`;
  $("#medalStat").textContent = `${state.medals.length} medalhas`;
  const themeButton = $("[data-theme-toggle]");
  if (themeButton) {
    const isDark = state.theme === "dark";
    themeButton.textContent = `Tema: ${isDark ? "escuro" : "claro"}`;
    themeButton.setAttribute("aria-pressed", String(isDark));
    themeButton.setAttribute("aria-label", `Alternar para tema ${isDark ? "claro" : "escuro"}`);
  }
  const activeMode = {
    journeyMap: "journey",
    campaignComplete: "journey",
    guided: "journey",
    finalBoss: "infinite",
    boss: "infinite",
    params: "infinite",
    escalation: "lab",
    pocketHome: "lab",
    pocket: "lab",
    classificationTrack: "infinite",
    homogeneousTrack: "infinite",
    parametersTrack: "infinite",
    lista11Boss: "infinite",
    escalonamentoSemQuadro: "escalonamentoSemQuadro",
    escalonamentoSemQuadroResult: "escalonamentoSemQuadro",
    discussaoSistemas: "discussaoSistemas",
    discussaoSistemasResult: "discussaoSistemas",
    lista11Total: "lista11Total",
    lista11TotalResult: "lista11Total",
    board: "board",
    blankSheet: "board",
    blankSheetCase: "board",
    blankSheetMessy: "board",
    blankSheetResult: "board",
    bossFinalBoard: "bossFinalBoard",
    readinessReport: "home",
    checklist: "grimoire"
  }[screen.mode] || screen.mode;
  $$(".bottom-nav button").forEach((btn) => {
    const active = btn.dataset.mode === activeMode;
    btn.classList.toggle("active", active);
    if (active) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
}

function applyTheme() {
  const theme = state.theme === "dark" ? "dark" : "light";
  if (!document.documentElement) return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveState();
}

function setStage(html) {
  $("#appStage").innerHTML = ensureSingleH1(html);
  renderHud();
  updatePageMeta();
  typeset();
}

function enableNextButtons() {
  $$("[data-next]").forEach((btn) => {
    btn.disabled = false;
  });
}

function sourceChip(item) {
  const origin = item.origin || item.origem;
  const skill = humanSkillLabel(item.skill || item.habilidade);
  return `<div class="meta-row">${origin ? `<span class="source-chip">${origin}</span>` : ""}${skill ? `<span class="source-chip soft">${skill}</span>` : ""}${item.difficulty ? `<span class="source-chip soft">nível ${item.difficulty}</span>` : ""}</div>`;
}

function humanSkillLabel(skill = "") {
  const labels = {
    matrixSetup: "Matriz aumentada",
    pivotChoice: "Escolha de pivo",
    rowOperations: "Operacoes de linha",
    rows: "Operacoes com linhas",
    arithmeticControl: "Controle aritmetico",
    parameterCaseSplit: "Separacao de casos",
    determinantUse: "Determinante",
    rankDiscussion: "Discussao por posto",
    homogeneousSystems: "Sistemas homogeneos",
    writtenConclusion: "Conclusao de prova",
    level1: "Nivel 1 - Sobrevivencia",
    level2: "Nivel 2 - Escalonamento basico",
    level3: "Nivel 3 - Discussao de sistemas",
    missionType: "Tipo de missao",
    "interpretacao de enunciado": "Interpretacao do enunciado"
  };
  return labels[skill] || (typeof DIAGNOSTIC_SKILL_LABELS !== "undefined" ? DIAGNOSTIC_SKILL_LABELS[skill] : null) || skill;
}

function solutionBlock(item, label = "Ver conta inteira") {
  if (!item.solution && !item.resolution && !item.fullSolution) return "";
  return `<details class="solution"><summary>${label}</summary><div>${item.solution || item.resolution || item.fullSolution}</div></details>`;
}

function contextBlock(item) {
  const data = item.context || item.data || item.dados;
  if (!data) return "";
  return `<div class="exercise-data"><span class="source-chip soft">Dados</span><div class="math-box">${data}</div></div>`;
}

function questionSnapshotBlock(item, label = "Ver questao cobrada agora") {
  const question = item.question || item.q || item.prompt || "";
  const choices = item.choices || item.c || [];
  const statement = item.statement || item.enunciado || "";
  const matrix = item.matrix || "";
  const data = item.context || item.data || item.dados || "";
  const mission = item.mission || item.strategy || item.typeLabel || item.type || "";
  if (!question && !statement && !matrix && !data && !mission) return "";
  const dataParts = [
    statement ? `<div><span class="step-label">Enunciado</span><div class="math-box compact">${statement}</div></div>` : "",
    matrix ? `<div><span class="step-label">Matriz</span><div class="math-box compact">${matrix}</div></div>` : "",
    data && data !== statement && data !== matrix ? `<div><span class="step-label">Dados</span><div class="math-box compact">${data}</div></div>` : ""
  ].join("");
  return `
    <details class="question-review">
      <summary>${label}</summary>
      <div class="question-review-body">
        ${sourceChip(item)}
        ${mission ? `<p><strong>Missao real:</strong> ${mission}</p>` : ""}
        ${dataParts}
        ${question ? `<p><strong>Pergunta:</strong> ${question}</p>` : ""}
        ${choices.length ? `<ol class="question-options">${choices.map((choice) => `<li>${choice}</li>`).join("")}</ol>` : ""}
      </div>
    </details>
  `;
}

function chapterNumber(chapter = "") {
  const match = String(chapter).match(/Cap[íi]tulo\s+(\d+)/i);
  return match ? Number(match[1]) : COURSE_CHAPTERS.findIndex((item) => item === chapter);
}

function courseHeader({ mode, data, index, total, progress, kicker }) {
  const isJourney = mode === "journey";
  const chapter = data.chapter || kicker || "Treino";
  const chapterIndex = chapterNumber(chapter);
  const chapterLabel = chapterIndex >= 0 ? `Capítulo ${chapterIndex} de ${COURSE_CHAPTERS.length - 1}` : chapter;
  const missionLabel = isJourney ? `Missão ${index + 1} de ${total}` : (kicker || data.phase || "Treino focado");
  return `
    <header class="course-header">
      <div>
        <span class="eyebrow">${chapterLabel}</span>
        <h2>${data.title}</h2>
        <p class="mission-position">${missionLabel}${isJourney ? ` · ${data.chapter}` : ""}</p>
      </div>
      <div class="progress-block" aria-label="Progresso">
        <span>${progress}%</span>
        <div class="bar"><span style="width:${progress}%"></span></div>
      </div>
    </header>
  `;
}

function commonErrorFor(item) {
  const text = `${item.skill || ""} ${item.type || ""} ${item.title || ""}`.toLowerCase();
  if (text.includes("par")) return "dividir por uma expressão antes de testar quando ela pode zerar.";
  if (text.includes("barra") || text.includes("matriz")) return "fazer a conta nos coeficientes e esquecer o lado direito depois da barra.";
  if (/class|spd|spi|sistema impossível|contradi/.test(text)) return "chamar \\([0,0,0|0]\\) de contradição ou tratar \\([0,0,0|7]\\) como resposta.";
  if (text.includes("piv") || text.includes("linha")) return "olhar só o primeiro número e esquecer que a operação muda a linha inteira.";
  return "pular a intuição e tentar responder pela aparência da fórmula.";
}

function conceptCard(item) {
  const intuition = item.explain || item.body || "Leia os dados primeiro e traduza o objetivo em português simples.";
  const formal = item.formalName || item.type || humanSkillLabel(item.skill) || "conceito";
  const notation = item.example || item.math || "";
  return `
    <article class="concept-card">
      <div>
        <span class="step-label">Intuição</span>
        <p>${intuition}</p>
      </div>
      <div>
        <span class="step-label">Nome formal</span>
        <p>${formal}</p>
      </div>
      ${notation ? `<div><span class="step-label">Notação ou exemplo</span><div class="math-box compact">${notation}</div></div>` : ""}
      <div class="common-error"><strong>Erro comum:</strong> ${commonErrorFor(item)}</div>
    </article>
  `;
}

function exerciseCard(item, attr = "data-answer") {
  const choices = item.choices || item.c || [];
  const question = item.question || item.q || item.prompt;
  return `
    <article class="exercise-card">
      <span class="step-label">Pergunta rápida</span>
      ${questionSnapshotBlock(item)}
      <p><strong>${question}</strong></p>
      <div class="choices">
        ${choices.map((choice, i) => `<button class="choice" type="button" ${attr}="${i}">${choice}</button>`).join("")}
      </div>
    </article>
  `;
}

function feedbackCard(mode, data, index, total, options = {}) {
  const whyId = `why-${data.id || index}`;
  const nextText = index === total - 1 ? (options.doneLabel || "Concluir") : "Próximo passo";
  return `
    <section class="feedback-zone">
      <button class="secondary quiet" data-why="${whyId}">Ver dica didática</button>
      <div id="${whyId}" class="feedback">${data.why || "A técnica entra depois de entender o objetivo da pergunta."}</div>
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
      <div class="actions">
        <button class="primary" data-next="${mode}" disabled>${nextText}</button>
        <button class="secondary" data-repeat="${mode}">${mode === "guided" ? "Refazer passo" : "Refazer tela"}</button>
      </div>
    </section>
  `;
}

function miniGrimoireLink() {
  return `<button class="mini-grimoire" data-mode="grimoire">Quer a teoria completa? Abrir Grimório.</button>`;
}

function topMistakes() {
  return Object.entries(state.stats.mistakes || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function diagnosticMisses(result = state.diagnostic) {
  return new Set(result?.misses || []);
}

function diagnosticBasicsMastered(result = state.diagnostic) {
  if (!result) return false;
  const misses = diagnosticMisses(result);
  return !["fundamentals", "linear", "matrix"].some((key) => misses.has(key));
}

function markFoundationsOptional() {
  const foundationChapters = new Set([COURSE_CHAPTERS[0], COURSE_CHAPTERS[1], COURSE_CHAPTERS[2]]);
  COURSE_PATH
    .filter((mission) => foundationChapters.has(mission.chapter))
    .forEach((mission) => {
      if (!state.completed.includes(mission.id)) state.completed.push(mission.id);
    });
  state.optionalReview.foundations = true;
  saveState();
}

function recommendationLabel(mode) {
  return {
    diagnostic: "Fazer diagnÃ³stico rÃ¡pido",
    journey: "Revisar fundamentos essenciais",
    escalation: "Pular para Escalonamento Completo",
    pocketHome: "Treinar deitado: Quadro de Bolso",
    classificationTrack: "Treinar ClassificaÃ§Ã£o SPD/SPI/SI",
    homogeneousTrack: "Treinar HomogÃªneos da Lista 11",
    params: "Ir direto para ParÃ¢metros",
    lista11Boss: "Encarar Boss Lista 11"
  }[mode] || "Continuar Jornada";
}

function recommendationLabel(mode) {
  return {
    diagnostic: "Fazer diagnostico rapido",
    journey: "Revisar fundamentos essenciais",
    escalation: "Pular para Escalonamento Completo",
    pocketHome: "Treinar deitado: Quadro de Bolso",
    classificationTrack: "Treinar Classificacao SPD/SPI/SI",
    homogeneousTrack: "Treinar Homogeneos da Lista 11",
    params: "Ir direto para Parametros",
    lista11Boss: "Encarar Boss Lista 11"
  }[mode] || "Continuar Jornada";
}

function legacyRecommendNextModeMojibake(diagnosticResult = state.diagnostic, currentState = state) {
  const completed = new Set(currentState.completed || []);
  if (!diagnosticResult) {
    return {
      mode: "diagnostic",
      title: "Fazer diagnÃ³stico rÃ¡pido",
      reason: "Em 10 perguntas eu descubro se vocÃª deve revisar base ou ir direto para as picas."
    };
  }

  const misses = diagnosticMisses(diagnosticResult);
  const score = diagnosticResult.score ?? 0;
  const total = diagnosticResult.total ?? diagnostic.length;

  if (score >= total - 1 && !completed.has("pocket-lista10-si-finish")) {
    return {
      mode: "pocketHome",
      title: "VocÃª domina fundamentos. Pular para Escalonamento Completo.",
      reason: "Fundamento Ã© base, nÃ£o pedÃ¡gio eterno. Agora o alvo Ã© pivÃ´, sinais e matriz final."
    };
  }
  if (misses.has("parameters")) {
    return {
      mode: "params",
      title: "VocÃª estÃ¡ pronto para ParÃ¢metros, mas com cuidado no zero.",
      reason: "Apareceu risco em expressÃ£o como \(\lambda-1\). Vamos treinar separaÃ§Ã£o de casos."
    };
  }
  if (misses.has("pivot") || misses.has("rows") || misses.has("signs")) {
    return {
      mode: "pocketHome",
      title: "Anti-vacilo de Escalonamento.",
      reason: "Seu gargalo Ã© escolher operaÃ§Ã£o ou fazer sinal. O Quadro de Bolso quebra isso em uma conta por tela."
    };
  }
  if (misses.has("classify") || misses.has("free")) {
    return {
      mode: "classificationTrack",
      title: "Treinar leitura da matriz final.",
      reason: "Vamos separar SPD, SPI e SI com pivÃ´, contradiÃ§Ã£o e variÃ¡vel livre."
    };
  }
  if (misses.has("homogeneous")) {
    return {
      mode: "homogeneousTrack",
      title: "Revisar homogÃªneos da Lista 11.",
      reason: "A frase-chave Ã©: homogÃªneo sempre tem a trivial; determinante decide se sÃ³ ela aparece."
    };
  }
  if (misses.has("fundamentals") || misses.has("linear") || misses.has("matrix")) {
    return {
      mode: "journey",
      title: "Revisar base sem ficar preso nela.",
      reason: "Tem algum fundamento balançando. A Jornada te leva por microtelas curtas."
    };
  }
  return {
    mode: "params",
    title: "Ir para ParÃ¢metros.",
    reason: "VocÃª jÃ¡ mostrou base suficiente. Bora treinar \(\lambda\), \(m\), \(\alpha\) e \(k\)."
  };
}

function recommendNextMode(diagnosticResult = state.diagnostic, currentState = state) {
  const completed = new Set(currentState.completed || []);
  if (!diagnosticResult) {
    return {
      mode: "diagnostic",
      title: "Fazer diagnostico rapido",
      reason: "Em 10 perguntas eu descubro se voce deve revisar base ou ir direto para as partes que derrubam na prova."
    };
  }

  const misses = diagnosticMisses(diagnosticResult);
  const score = diagnosticResult.score ?? 0;
  const total = diagnosticResult.total ?? diagnostic.length;

  if (score >= total - 1 && !completed.has("pocket-lista10-si-finish")) {
    return {
      mode: "pocketHome",
      title: "Voce domina fundamentos. Pular para Escalonamento Completo.",
      reason: "Fundamento e base, nao pedagio eterno. Agora o alvo e pivo, sinais e matriz final."
    };
  }
  if (misses.has("parameters")) {
    return {
      mode: "params",
      title: "Voce esta pronto para Parametros, mas com cuidado no zero.",
      reason: String.raw`Apareceu risco em expressao como \(\lambda-1\). Vamos treinar separacao de casos.`
    };
  }
  if (misses.has("pivot") || misses.has("rows") || misses.has("signs")) {
    return {
      mode: "pocketHome",
      title: "Anti-vacilo de Escalonamento.",
      reason: "Seu gargalo e escolher operacao ou fazer sinal. O Quadro de Bolso quebra isso em uma conta por tela."
    };
  }
  if (misses.has("classify") || misses.has("free")) {
    return {
      mode: "classificationTrack",
      title: "Treinar leitura da matriz final.",
      reason: "Vamos separar SPD, SPI e SI com pivo, contradicao e variavel livre."
    };
  }
  if (misses.has("homogeneous")) {
    return {
      mode: "homogeneousTrack",
      title: "Revisar homogeneos da Lista 11.",
      reason: "A frase-chave e: homogeneo sempre tem a trivial; determinante decide se so ela aparece."
    };
  }
  if (misses.has("fundamentals") || misses.has("linear") || misses.has("matrix")) {
    return {
      mode: "journey",
      title: "Revisar base sem ficar preso nela.",
      reason: "Tem algum fundamento balancando. A Jornada te leva por microtelas curtas."
    };
  }
  return {
    mode: "params",
    title: "Ir para Parametros.",
    reason: String.raw`Voce ja mostrou base suficiente. Bora treinar \(\lambda\), \(m\), \(\alpha\) e \(k\).`
  };
}

const DIAGNOSTIC_SKILL_LABELS = {
  conceitoSistema: "conceito de sistema",
  matrizAmpliada: "matriz ampliada",
  escalonamento: "escalonamento",
  aritmetica: "aritmetica de sinais",
  classificacao: "classificacao SPD/SPI/SI",
  homogeneo: "sistema homogeneo",
  determinante: "determinante como radar",
  parametros: "parametros",
  discussaoSistema: "discussao de sistemas",
  escritaConclusao: "escrita da conclusao"
};

const DIAGNOSTIC_ROUTE_MISSIONS = {
  fundamentos: "course-c0-01-system-linear",
  matriz: "course-c3-17-line-row",
  escalonamento: "course-c5-30-pivot",
  classificacao: "course-c6-39-unique",
  livre: "course-c6-44-free-variable",
  homogeneos: "course-c7-48-homogeneous",
  determinante: "course-c7-51-determinant",
  discussao: "course-discussion-01-type",
  parametros: "course-c8-55-parameter",
  simulado: "course-c10-72-boss-lista10"
};

const ERROR_TYPE_LABELS = {
  conceitual: "erro conceitual",
  aritmetico: "erro aritmetico",
  interpretacao: "erro de interpretacao",
  organizacao: "erro de organizacao",
  pressa: "erro de pressa",
  conclusao: "erro de escrita da conclusao"
};

function hasCompletedFullEscalation(currentState = state) {
  const boardEscalations = completedSystemObjects(currentState)
    .filter((system) => system.tags?.includes("escalonamento") && system.difficulty >= 2).length;
  return (currentState.completed || []).some((id) =>
    id === "pocket-lista10-si-finish"
    || id === "pocket-pivot3-spd-finish"
    || id === "pocket-generated-spi-finish"
    || id.startsWith("mode-escalonamento-sem-quadro-finish")
  ) || boardEscalations >= 2;
}

function hasCompletedParameterDiscussion(currentState = state) {
  return (currentState.completed || []).some((id) =>
    id.startsWith("course-discussion-")
    || id.startsWith("mode-discussao-sistemas-finish")
    || id === "course-c8-65-lista11-4"
  ) || hasCompletedSystemWithTag("parametro", currentState);
}

function hasCompletedMixedSimulado(currentState = state) {
  return (currentState.completed || []).some((id) =>
    id.startsWith("mode-lista11-total-finish")
    || id === "course-c10-74-boss-mixed"
    || id === "course-c10-75-campaign-complete"
  ) || hasCompletedSystemWithTag("lista11-total", currentState) || !!currentState.bossFinalPassed;
}

function masteryCap(currentState = state) {
  return masteryCapStrict(currentState);
}

function adjustedConfidence(rawPercent, currentState = state) {
  return Math.min(rawPercent, masteryCapStrict(currentState));
}

function currentFocusText(currentState = state) {
  const mistakes = currentState.stats?.mistakes || {};
  const ordered = Object.entries(mistakes).sort((a, b) => b[1] - a[1]).map(([skill]) => correctionKeyFor(skill));
  const focus = [...new Set(ordered)].filter(Boolean);
  if (focus.length) return focus.slice(0, 2).join(" e ");
  if (!hasCompletedFullEscalation(currentState)) return "escalonamento e aritmetica de linhas";
  if (!hasCompletedParameterDiscussion(currentState)) return "discussao com parametro";
  if (!hasCompletedMixedSimulado(currentState)) return "Lista 11 Total";
  return "manter velocidade e revisar erros";
}

function uniqueCount(list = []) {
  return new Set(list).size;
}

function systemById(id) {
  return (typeof LISTA11_SYSTEMS === "undefined" ? [] : LISTA11_SYSTEMS).find((system) => system.id === id);
}

function completedSystemObjects(currentState = state) {
  return (currentState.completedBoardModeSystems || []).map(systemById).filter(Boolean);
}

function completedSystemsByKind(kind, currentState = state) {
  return completedSystemObjects(currentState).filter((system) => system.kind === kind || system.tags?.includes(kind));
}

function hasCompletedSystemWithTag(tag, currentState = state) {
  return completedSystemObjects(currentState).some((system) => system.tags?.includes(tag) || system.kind === tag);
}

function countCompletedOriginalList11(currentState = state) {
  return completedSystemObjects(currentState).filter((system) => system.originType === "Lista 11").length;
}

function countCompletedDerived(currentState = state) {
  return completedSystemObjects(currentState).filter((system) => system.originType === "Derivado").length;
}

function proofSkillAverage(currentState = state) {
  const values = Object.values(currentState.proofSkills || {});
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function fullMasteryRequirements(currentState = state) {
  const boardSystems = completedSystemObjects(currentState);
  return {
    concepts: !!currentState.diagnostic,
    twoMediumEscalations: boardSystems.filter((system) => system.tags?.includes("escalonamento") && system.difficulty >= 2).length >= 2,
    parameterSystem: hasCompletedSystemWithTag("parametro", currentState),
    classification: hasCompletedSystemWithTag("classificacao", currentState),
    homogeneous: hasCompletedSystemWithTag("homogeneo", currentState),
    writtenConclusion: (currentState.proofSkills?.writtenConclusion || 0) >= 60 || hasCompletedSystemWithTag("conclusao", currentState),
    bossFinal: !!currentState.bossFinalPassed && (currentState.bossFinalAttempts || []).some((attempt) => attempt.passed && !attempt.usedHint)
  };
}

function masteryCapStrict(currentState = state) {
  const requirements = fullMasteryRequirements(currentState);
  const boardCount = uniqueCount(currentState.completedBoardModeSystems || []);
  if (Object.values(requirements).every(Boolean)) return 100;
  if (boardCount === 0) return 45;
  if (boardCount < 2) return 60;
  if (!requirements.twoMediumEscalations) return 75;
  if (!requirements.parameterSystem) return 85;
  if (boardCount < 10) return 90;
  if (!requirements.bossFinal) return 90;
  return 95;
}

function dominantRisk(currentState = state) {
  const profile = currentState.errorProfile || {};
  const mapped = [
    ["arithmetic", "aritmetica e controle de sinais"],
    ["organization", "organizacao auditavel no escalonamento"],
    ["conclusion", "conclusao escrita incompleta"],
    ["parameterDivision", "dividir por parametro sem separar casos"],
    ["homogeneousConfusion", "confundir sistema homogeneo"],
    ["prematureSPI", "concluir SPI cedo demais"],
    ["ignoredContradiction", "ignorar linha contraditoria"],
    ["missingFreeVariable", "nao reconhecer variavel livre"],
    ["determinantMisuse", "usar determinante como resposta final"],
    ["missingCaseSplit", "nao separar caso critico"]
  ].sort((a, b) => (profile[b[0]] || 0) - (profile[a[0]] || 0));
  if ((profile[mapped[0]?.[0]] || 0) > 0) return mapped[0][1];
  if (!hasCompletedFullEscalation(currentState)) return "escalonamento medio sem dica";
  if (!hasCompletedParameterDiscussion(currentState)) return "parametros e discussao por casos";
  if (!hasCompletedSystemWithTag("homogeneo", currentState)) return "homogeneos e solucao trivial";
  if (!currentState.bossFinalPassed) return "Boss Final sem dica direta";
  return "manutencao: revisar erros finos da Lista 11";
}

function nextTrainingText(currentState = state) {
  if (!currentState.diagnostic && uniqueCount(currentState.completedBoardModeSystems || []) === 0) return "Diagnostico Lista 11";
  if (!hasCompletedFullEscalation(currentState)) return "Sistema 06 no Modo Quadro guiado";
  if (!hasCompletedParameterDiscussion(currentState)) return "Sistema 01 ou 02: parametros";
  if (!hasCompletedSystemWithTag("homogeneo", currentState)) return "Sistema 13 ou 14: homogeneo";
  if (!hasCompletedSystemWithTag("lista11-total", currentState)) return "Lista 11 Total";
  if (!currentState.bossFinalPassed) return "Boss Final";
  return "Refazer derivados 19 e 20 sem dica";
}

function progressMetrics(currentState = state) {
  const systems = typeof LISTA11_SYSTEMS === "undefined" ? [] : LISTA11_SYSTEMS;
  const totalSystems = systems.length || 20;
  const boardCount = uniqueCount(currentState.completedBoardModeSystems || []);
  const proofAvg = proofSkillAverage(currentState);
  const errorCount = Object.values(currentState.errorProfile || {}).reduce((sum, value) => sum + value, 0);
  const progress = Math.min(100, Math.round((boardCount / totalSystems) * 100));
  const practicalScore = Math.min(100, Math.round(20 + boardCount * 4 + proofAvg * 0.35 - Math.min(errorCount * 1.6, 28)));
  const cap = masteryCapStrict(currentState);
  const estimatedMastery = Math.max(0, Math.min(cap, practicalScore));
  const requirements = fullMasteryRequirements(currentState);
  let confidence = "instavel";
  if (currentState.bossFinalPassed && estimatedMastery > 90) confidence = "forte";
  else if (boardCount >= 6 && requirements.parameterSystem && requirements.homogeneous) confidence = "forte, mas ainda nao validada no Boss Final";
  else if (boardCount >= 2 && errorCount <= boardCount + 4) confidence = "razoavel";
  return {
    progressPercent: progress,
    estimatedMastery,
    masteryCap: cap,
    operationalConfidence: confidence,
    risk: dominantRisk(currentState),
    nextTraining: nextTrainingText(currentState),
    requirements,
    completedBoardSystems: boardCount,
    solvedOriginalList11: countCompletedOriginalList11(currentState),
    solvedDerivedSystems: countCompletedDerived(currentState)
  };
}

function updateComputedMetrics() {
  const metrics = progressMetrics(state);
  state.progressPercent = metrics.progressPercent;
  state.estimatedMastery = metrics.estimatedMastery;
  state.operationalConfidence = metrics.operationalConfidence;
  state.solvedOriginalList11 = metrics.solvedOriginalList11;
  state.solvedDerivedSystems = metrics.solvedDerivedSystems;
}

function diagnosticMisses(result = state.diagnostic) {
  return new Set(result?.misses || result?.weakTargets || []);
}

function diagnosticBasicsMastered(result = state.diagnostic) {
  if (!result) return false;
  const misses = diagnosticMisses(result);
  const weak = new Set(result.weakPoints || result.weaknesses || []);
  return !["fundamentals", "linear", "matrix"].some((key) => misses.has(key))
    && !["conceitoSistema", "matrizAmpliada"].some((key) => weak.has(key));
}

function markMissionsBeforeOptional(missionId) {
  const targetIndex = COURSE_PATH.findIndex((mission) => mission.id === missionId);
  if (targetIndex <= 0) return;
  COURSE_PATH.slice(0, targetIndex).forEach((mission) => {
    if (!state.completed.includes(mission.id)) state.completed.push(mission.id);
  });
  state.optionalReview.foundations = true;
  state.optionalReview.skippedTo = missionId;
}

function recommendationLabel(mode) {
  return {
    diagnostic: "Fazer diagnostico rapido",
    recommendedJourney: "Continuar missao recomendada",
    journey: "Continuar Jornada",
    board: "Ir para Modo Quadro",
    escalation: "Escalonamento completo",
    pocketHome: "Quadro de Bolso",
    classificationTrack: "Classificacao SPD/SPI/SI",
    homogeneousTrack: "Homogeneos",
    params: "Parametros",
    lista11Boss: "Boss Lista 11"
  }[mode] || "Continuar Jornada";
}

function skillLabel(skill) {
  return DIAGNOSTIC_SKILL_LABELS[skill] || skill || "revisao geral";
}

function inferErrorType(skill = "") {
  const text = String(skill).toLowerCase();
  if (/sinal|arit|conta|linha|opera/.test(text)) return "aritmetico";
  if (/piv|escal|matriz|barra/.test(text)) return "organizacao";
  if (/class|spd|spi|si|contradi|livre|homog|det|param/.test(text)) return "interpretacao";
  if (/conclus/.test(text)) return "conclusao";
  return "conceitual";
}

function recordPerformance({ skill = "revisao geral", correct = false, errorType = "conceitual", source = "app" } = {}) {
  if (!skill) return;
  const current = state.skillScores[skill] || { correct: 0, wrong: 0, streak: 0 };
  if (correct) {
    current.correct += 1;
    current.streak += 1;
  } else {
    current.wrong += 1;
    current.streak = 0;
    state.errorTypes[errorType] = (state.errorTypes[errorType] || 0) + 1;
    maybeQueueCorrection(skill, errorType);
  }
  state.skillScores[skill] = current;
  state.history = [
    ...(state.history || []),
    { date: new Date().toISOString(), skill, correct, errorType, source }
  ].slice(-80);
}

function correctionKeyFor(skill = "", errorType = "") {
  const text = `${skill} ${errorType}`.toLowerCase();
  if (/param|lambda|alpha|k|m|discuss/.test(text)) return "parametros";
  if (/sinal|arit|conta|linha|opera|piv|escal/.test(text)) return "escalonamento";
  if (/class|spd|spi|si|contradi|livre/.test(text)) return "classificacao";
  if (/homog|det/.test(text)) return "homogeneos";
  return "fundamentos";
}

function maybeQueueCorrection(skill, errorType) {
  const key = correctionKeyFor(skill, errorType);
  const queueId = `adaptive-${key}`;
  const count = Object.entries(state.stats.mistakes || {})
    .filter(([name]) => correctionKeyFor(name) === key)
    .reduce((sum, [, value]) => sum + value, 0);
  if (count < 2) return;
  if (state.completed.includes(queueId)) return;
  if (state.adaptiveQueue.includes(key)) return;
  state.adaptiveQueue.push(key);
}

function buildDiagnosticResult(answers = []) {
  const total = diagnostic.length;
  const score = answers.filter((answer) => answer.correct).length;
  const bySkill = {};
  answers.forEach((answer) => {
    const skill = answer.skill || "conceitoSistema";
    bySkill[skill] ||= { correct: 0, wrong: 0, total: 0 };
    bySkill[skill].total += 1;
    if (answer.correct) bySkill[skill].correct += 1;
    else bySkill[skill].wrong += 1;
  });
  Object.keys(DIAGNOSTIC_SKILL_LABELS).forEach((skill) => {
    bySkill[skill] ||= { correct: 0, wrong: 0, total: 0 };
  });
  const strengths = Object.entries(bySkill)
    .filter(([, value]) => value.total > 0 && value.wrong === 0)
    .map(([skill]) => skill);
  const weakPoints = Object.entries(bySkill)
    .filter(([, value]) => value.wrong > 0)
    .map(([skill]) => skill);
  const weakTargets = answers.filter((answer) => !answer.correct).map((answer) => answer.target);
  const rawPercent = total ? Math.round((score / total) * 100) : 0;
  const percent = adjustedConfidence(rawPercent);
  const route = recommendRoute({ score, total, percent, rawPercent, weakPoints, weakTargets, bySkill });
  const result = {
    date: new Date().toISOString(),
    score,
    total,
    rawPercent,
    percent,
    cap: masteryCap(),
    strengths,
    weaknesses: weakPoints,
    weakPoints,
    weakTargets,
    misses: weakTargets,
    bySkill,
    ...route
  };
  result.userProfile = {
    level: route.level,
    label: route.levelLabel,
    skills: Object.fromEntries(Object.entries(bySkill).map(([skill, value]) => {
      const skillScore = value.total ? Math.round((value.correct / value.total) * 100) : 50;
      return [skill, skillScore];
    })),
    recommendedStartPhase: route.recommendedStartPhase,
    weakPoints
  };
  return result;
}

function recommendRoute(result) {
  const weak = new Set(result.weakPoints || []);
  const percent = result.percent ?? 0;
  const rawPercent = result.rawPercent ?? percent;
  const route = (missionKey, label, message, level, phase) => ({
    recommendedMode: "recommendedJourney",
    recommendedMissionId: DIAGNOSTIC_ROUTE_MISSIONS[missionKey],
    recommendedRoute: label,
    message,
    level,
    levelLabel: {
      nivel0: "Nivel 1 - Sobrevivencia",
      nivel1: "Nivel 2 - Escalonamento basico",
      nivel2: "Nivel 3 - Discussao SPD/SPI/SI",
      nivel3: "Nivel 4 - Parametros e homogeneos",
      nivel4: "Nivel 5 - Lista 11 Real"
    }[level],
    recommendedStartPhase: phase
  });

  if (weak.has("conceitoSistema")) {
    return route("fundamentos", "Sobrevivencia: sistema linear", "Tem base conceitual balancando. A jornada comeca no minimo necessario, sem castigo teorico.", "nivel0", 1);
  }
  if (weak.has("matrizAmpliada")) {
    return route("matriz", "Matriz ampliada e leitura do campo", "Voce entende a ideia, mas precisa firmar barra, coeficientes e lado direito antes do escalonamento.", "nivel1", 2);
  }
  if (weak.has("aritmetica") || weak.has("escalonamento")) {
    return route("escalonamento", "Escalonamento sem se perder", "Seu gargalo parece operacional: pivo, sinais e organizacao. Vamos uma decisao por tela.", "nivel2", 3);
  }
  if (weak.has("classificacao")) {
    return route("classificacao", "SPD, SPI e SI", "Voce precisa transformar matriz final em conclusao formal: pivos, contradicao e variavel livre.", "nivel2", 4);
  }
  if (weak.has("homogeneo")) {
    return route("homogeneos", "Homogeneos e solucao trivial", "A frase-chave e: homogeneo sempre tem a trivial; determinante decide se ela e unica.", "nivel3", 6);
  }
  if (weak.has("determinante")) {
    return route("determinante", "Determinante como radar", "det(A) diferente de zero mata a duvida: SPD. det(A)=0 manda investigar.", "nivel3", 7);
  }
  if (weak.has("parametros") || weak.has("discussaoSistema") || weak.has("escritaConclusao")) {
    return route("discussao", "Discussao de sistemas por casos", "Voce ja pode ir para a parte que derruba em prova: valor critico, caso geral, caso especial e conclusao completa.", "nivel3", 8);
  }
  if (rawPercent >= 90 && !hasCompletedFullEscalation()) {
    return route("escalonamento", "Escalonamento Sem Quadro", "Voce entende varias ideias, mas ainda nao provou execucao completa. Conceito bom; treino operacional agora.", "nivel2", 3);
  }
  if (rawPercent >= 90 && !hasCompletedParameterDiscussion()) {
    return route("discussao", "Discussao de sistemas por casos", "Voce nao esta zerado, mas tambem nao esta 97%. Falta discutir casos com parametro e conclusao escrita.", "nivel3", 8);
  }
  if (rawPercent >= 90 && !hasCompletedMixedSimulado()) {
    return route("simulado", "Lista 11 Total", "Agora falta provar sob pressao: identificar, comecar, resolver e concluir questoes misturadas.", "nivel4", 9);
  }
  if (percent >= 90) {
    return route("simulado", "Simulado modo prova", "Voce demonstrou execucao, discussao e simulado. Agora e revisao de erro fino.", "nivel4", 9);
  }
  return route("escalonamento", "Escalonamento sem se perder", "Diagnostico misto: vamos fortalecer a execucao antes de discutir parametro pesado.", percent <= 65 ? "nivel1" : "nivel2", percent <= 65 ? 2 : 3);
}

function applyDiagnosticResult(result) {
  state.diagnostic = result;
  state.userProfile = result.userProfile;
  const boardIndex = boardStartForDiagnostic(result);
  const boardSystem = LISTA11_SYSTEMS[boardIndex] || LISTA11_SYSTEMS[0];
  state.boardProgress = { systemIndex: boardIndex, stepIndex: 0 };
  state.currentSystemId = boardSystem.id;
  state.lastRecommendation = {
    mode: "board",
    missionId: result.recommendedMissionId,
    route: `Sistema ${String(boardSystem.number).padStart(2, "0")} - ${boardSystem.title}`,
    message: `Proxima missao no Modo Quadro: ${boardSystem.origin}.`,
    date: result.date
  };
  if (diagnosticBasicsMastered(result) && result.recommendedMissionId) markMissionsBeforeOptional(result.recommendedMissionId);
  if (result.score >= result.total - 1) state.bossUnlocked = true;
  saveState();
}

function boardStartForDiagnostic(result = state.diagnostic) {
  const weak = new Set(result?.weakPoints || result?.weaknesses || []);
  if (weak.has("aritmetica") || weak.has("escalonamento") || weak.has("matrizAmpliada")) return 5;
  if (weak.has("classificacao") || weak.has("escritaConclusao")) return 8;
  if (weak.has("homogeneo")) return 12;
  if (weak.has("parametros") || weak.has("determinante") || weak.has("discussaoSistema")) return 0;
  if ((result?.rawPercent || result?.percent || 0) >= 85) return 6;
  return 0;
}

function recommendNextMode(diagnosticResult = state.diagnostic) {
  if (!diagnosticResult?.recommendedMode) {
    return {
      mode: "diagnostic",
      title: "Fazer diagnostico rapido",
      reason: "O Chapeu Seletor decide o ponto de entrada da Jornada. Sem menu poluido: voce responde e eu te coloco na proxima missao certa."
    };
  }
  const boardIndex = boardStartForDiagnostic(diagnosticResult);
  const system = LISTA11_SYSTEMS[boardIndex] || LISTA11_SYSTEMS[0];
  return {
    mode: "board",
    missionId: system.id,
    title: `Recomendacao atual: Sistema ${String(system.number).padStart(2, "0")}`,
    reason: diagnosticResult.message || "Continuar no Modo Quadro.",
    missionTitle: `${system.title} (${system.origin})`
  };
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
      interpretation: "só equações lineares entram nas técnicas dos próximos capítulos."
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

const lista10Ex2System = String.raw`
  <p><strong>Sistema:</strong></p>
  \[\begin{cases}
  x_1-x_2+3x_3=8\\
  x_1+x_2+2x_3=-3
  \end{cases}\]
`;

const lista11Ex1aSystem = String.raw`
  <p><strong>Sistema:</strong></p>
  \[\begin{cases}
  \lambda x+2y=\lambda-1\\
  2x+4y=3\lambda
  \end{cases}\]
`;

const lista11Ex2System = String.raw`
  <p><strong>Sistema:</strong></p>
  \[
  \begin{pmatrix}
  m&1&1\\
  2&-1&2\\
  4&-1&1
  \end{pmatrix}
  \vec{x}=
  \begin{pmatrix}2\\5\\6\end{pmatrix}
  \]
`;

const lista11Ex3System = String.raw`
  <p><strong>Sistema:</strong></p>
  \[\begin{cases}
  x_1+4x_2+\alpha x_3=6\\
  2x_1-x_2+2\alpha x_3=3\\
  \alpha x_1+3x_2+x_3=5
  \end{cases}\]
`;

const lista11Ex4System = String.raw`
  <p><strong>Sistema:</strong></p>
  \[\begin{cases}
  x_1+3x_2+x_3=5\\
  2x_1+4x_2+3x_3=5\\
  -x_1+x_2+kx_3=2
  \end{cases}\]
`;

const lista11Ex5Homogeneous = String.raw`
  <p><strong>Homogêneo:</strong></p>
  \[
  \begin{pmatrix}
  2&1&1\\
  1&\alpha&1\\
  1&-1&2
  \end{pmatrix}\vec{x}=\vec{0}
  \]
`;

const lista11Ex6Homogeneous = String.raw`
  <p><strong>Homogêneo:</strong></p>
  \[
  \begin{pmatrix}
  1&2&2\\
  m-1&1&m-2\\
  m+1&m-1&2
  \end{pmatrix}\vec{x}=\vec{0}
  \]
`;

matrixQuestions.forEach((item) => {
  if (item.origin === "Lista 10 ex. 2") item.context = lista10Ex2System;
});

function verifyQuestion(id, origin, vectorTex, values, expected1, expected2, answer, note) {
  const [x1, x2, x3] = values;
  const e1 = x1 - x2 + 3 * x3;
  const e2 = x1 + x2 + 2 * x3;
  const assignmentText = String.raw`\(x_1=${x1},\quad x_2=${x2},\quad x_3=${x3}\)`;
  const context = String.raw`
    ${lista10Ex2System}
    <p><strong>Vetor:</strong> ${vectorTex}, isto é, ${assignmentText}.</p>
  `;
  const substitution = String.raw`Primeira: \(${x1}-(${x2})+3\cdot${x3}=${e1}\). Segunda: \(${x1}+(${x2})+2\cdot${x3}=${e2}\).`;
  const passes = e1 === expected1 && e2 === expected2;
  return q({
    id,
    tipo: "verificar solução",
    origin,
    difficulty: 1,
    context,
    vectorTex,
    assignmentText,
    prompt: String.raw`Esse vetor satisfaz as duas equações?`,
    choices: ["Sim, passa nas duas", "Não, falha em pelo menos uma", "Basta passar na primeira"],
    answer,
    feedbacks: [
      passes ? String.raw`Certo. ${substitution} Os resultados batem com \(8\) e \(-3\).` : String.raw`Não. ${substitution} Para ser solução, teria que dar \(8\) e \(-3\).`,
      passes ? String.raw`Não. ${substitution} Ele passa nas duas equações.` : String.raw`Certo. ${substitution} Falhou em pelo menos uma equação.`,
      "Não. Acertar uma equação só não basta. Precisa passar nas duas."
    ],
    correct: note,
    solution: fullResolution({
      objective: "substituir o vetor nas duas equações",
      operation: String.raw`\(x_1-x_2+3x_3\) e \(x_1+x_2+2x_3\)`,
      reason: "solução de sistema precisa satisfazer tudo simultaneamente.",
      account: substitution,
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
    context: matrixTex(rows),
    prompt: "Classifique a matriz final.",
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

homogeneousQuestions.forEach((item) => {
  if (item.id.startsWith("h-l11-5")) item.context = lista11Ex5Homogeneous;
  if (item.id.startsWith("h-l11-6") || item.id === "h-gen-10") item.context = lista11Ex6Homogeneous;
});

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

const generatedParameterContexts = {
  "p-gen-k2": String.raw`<p><strong>Pivô possível:</strong> \(k-2\). Pergunta: quando esse número vira zero?</p>`,
  "p-gen-m1": String.raw`<p><strong>Pivô possível:</strong> \(m+1\). Antes de dividir, separe o caso em que ele zera.</p>`,
  "p-gen-lambda": String.raw`<p><strong>Pivô possível:</strong> \(\lambda\). Dividir por \(\lambda\) só é permitido quando \(\lambda\neq0\).</p>`,
  "p-gen-alpha1": String.raw`<p><strong>Pivô possível:</strong> \(\alpha+1\). Pergunta: quando \(\alpha+1=0\)?</p>`,
  "p-gen-div": String.raw`<p><strong>Pivô possível:</strong> \(k-2\). O perigo é tentar dividir sem testar \(k=2\).</p>`,
  "p-gen-case": String.raw`<p><strong>Casos:</strong> \(k-2=0\Rightarrow k=2\) e \(k-2\neq0\Rightarrow k\neq2\).</p>`,
  "p-gen-sub": String.raw`<p><strong>Caso especial:</strong> \(k=2\), então \(k-2=0\). Não divida; substitua no sistema ou na matriz.</p>`,
  "p-gen-zero-row": String.raw`<p><strong>Linha final:</strong> \([0,0|5]\). Tradução: \(0=5\).</p>`,
  "p-gen-free": String.raw`<p><strong>Linha final:</strong> \([0,0|0]\), sem contradição, e existe variável sem pivô.</p>`,
  "p-gen-det": String.raw`<p><strong>Determinante:</strong> \(\det(A)=(m-2)(m+1)\). Casos especiais vêm dos zeros dos fatores.</p>`
};

parameterQuestions.forEach((item) => {
  if (item.id.startsWith("p-l11-1a")) item.context = lista11Ex1aSystem;
  if (item.id.startsWith("p-l11-2")) item.context = lista11Ex2System;
  if (item.id.startsWith("p-l11-3")) item.context = lista11Ex3System;
  if (item.id.startsWith("p-l11-4")) item.context = lista11Ex4System;
  if (generatedParameterContexts[item.id]) item.context = generatedParameterContexts[item.id];
});

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
  { id: "g1", title: "Sistema I: montar a aumentada", body: "Antes de organizar as contas, traduza o sistema para matriz aumentada. Cada linha é uma equação.", math: matrixTex([[1, 2, -1, -10], [3, 7, 2, -19], [5, 12, 5, -21]]), q: "O que fica depois da barra?", c: ["coeficientes", "lado direito", "nomes das linhas"], a: 1, f: "Depois da barra ficam os termos independentes.", origin: "Lista 10 sistema I", skill: "matriz aumentada" },
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
    example: String.raw`Em \(3x_1+7x_2+2x_3=-19\), os coeficientes são \(3,7,2\). O \(-19\) não é coeficiente: é o termo independente, porque fica do lado direito da igualdade.`,
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
    context: lista10Ex2System,
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
    explain: String.raw`Substitua os valores do vetor nas duas equações: ${item.assignmentText}. Só conclua depois de testar as duas.`,
    why: "A prova cobra simultaneamente, não equação isolada.",
    context: item.context,
    question: item.prompt,
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
    context: lista11Ex5Homogeneous,
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

const COURSE_CHAPTERS = [
  "Capítulo 0 — Orientação",
  "Capítulo 1 — Equações lineares",
  "Capítulo 2 — Solução de sistema",
  "Capítulo 3 — Matriz aumentada",
  "Capítulo 4 — Operações elementares",
  "Capítulo 5 — Escalonamento guiado",
  "Capítulo 6 — Classificação",
  "Capítulo 7 — Homogêneos",
  "Capítulo 8 — Parâmetros",
  "Capítulo 9 — Revisão integradora",
  "Capítulo 10 — Boss final"
];

const lista10SystemI = String.raw`
  <p><strong>Lista 10 — Sistema I:</strong></p>
  \[\begin{cases}
  x_1+2x_2-x_3=-10\\
  3x_1+7x_2+2x_3=-19\\
  5x_1+12x_2+5x_3=-21
  \end{cases}\]
`;

const lista10SystemII = String.raw`
  <p><strong>Lista 10 — Sistema II:</strong></p>
  \[\begin{cases}
  3x_1+x_2+x_3=4\\
  2x_1-x_2-x_3=6\\
  -4x_1+x_2-5x_3=20
  \end{cases}\]
`;

function courseMission({
  id,
  chapter,
  title,
  origin = "Fundamento",
  skill = "jornada",
  difficulty = 1,
  type = "conceito",
  data = "",
  explain = "",
  example = "",
  question,
  choices,
  answer,
  feedback,
  feedbacks,
  fullSolution,
  solutionLabel,
  why
}) {
  return {
    id,
    chapter,
    phase: chapter,
    title,
    origin,
    skill,
    difficulty,
    type,
    data,
    explain,
    example,
    question,
    choices,
    answer,
    feedback,
    feedbacks,
    fullSolution,
    solution: fullSolution,
    solutionLabel,
    why
  };
}

function courseFromQuestion(courseId, chapter, title, item, overrides = {}) {
  return courseMission({
    id: courseId,
    chapter,
    title,
    origin: item.origin,
    skill: item.skill,
    difficulty: item.difficulty,
    type: item.tipo,
    data: item.context || "",
    explain: item.review || "Resolva usando apenas os dados mostrados nesta tela.",
    question: item.prompt,
    choices: item.choices,
    answer: item.answer,
    feedback: item.correct,
    feedbacks: item.feedbacks,
    fullSolution: item.solution,
    why: item.review || "A pergunta treina uma habilidade que aparece nas Listas 10 e 11.",
    ...overrides
  });
}

function courseFromGuided(courseId, chapter, item, overrides = {}) {
  return courseMission({
    id: courseId,
    chapter,
    title: item.title,
    origin: item.origin,
    skill: item.skill,
    difficulty: 2,
    type: "exemplo guiado",
    data: item.math,
    explain: item.body,
    question: item.q,
    choices: item.c,
    answer: item.a,
    feedback: item.f,
    fullSolution: item.solution || `<p>${item.f}</p>`,
    why: "O exemplo guiado separa objetivo, operação, conta e interpretação para a técnica não virar decoreba.",
    ...overrides
  });
}

function courseFromLab(courseId, chapter, item, overrides = {}) {
  return courseMission({
    id: courseId,
    chapter,
    title: item.title,
    origin: item.origin,
    skill: item.skill,
    difficulty: item.difficulty,
    type: "operação de linha",
    data: item.matrix,
    explain: item.why,
    question: item.q,
    choices: item.choices.map((choice) => choice.t),
    answer: item.choices.findIndex((choice) => choice.ok),
    feedbacks: item.choices.map((choice) => choice.f),
    feedback: item.choices.find((choice) => choice.ok)?.f || "Certo.",
    fullSolution: item.solution,
    why: item.why,
    ...overrides
  });
}

const COURSE_PATH_BASE = [
  courseMission({
    id: "course-c0-01-system-linear",
    chapter: COURSE_CHAPTERS[0],
    title: "O que é um sistema linear",
    origin: "Fundamento",
    skill: "sistema linear",
    data: String.raw`\[\begin{cases}x_1+x_2=3\\2x_1-x_2=0\end{cases}\]`,
    explain: "Um sistema é um conjunto de equações que precisam ser verdadeiras ao mesmo tempo.",
    question: "Para resolver um sistema, precisamos satisfazer:",
    choices: ["todas as equações", "só a primeira", "só a equação mais curta"],
    answer: 0,
    feedback: "Sistema é pacote fechado: a solução precisa passar em todas.",
    fullSolution: "<p>Leia cada linha como uma equação. Resolver o sistema é achar valores que deixam todas as linhas verdadeiras ao mesmo tempo.</p>",
    why: "Sem essa ideia, o aluno acha que acertar uma linha já basta."
  }),
  courseMission({
    id: "course-c0-02-unknown",
    chapter: COURSE_CHAPTERS[0],
    title: "O que é incógnita",
    origin: "Fundamento",
    skill: "incógnita",
    data: String.raw`\[3x_1+7x_2+2x_3=-19\]`,
    explain: "Incógnitas são os valores que ainda não sabemos. Aqui elas são \(x_1\), \(x_2\) e \(x_3\).",
    question: "Qual item é uma incógnita nessa equação?",
    choices: [String.raw`\(x_2\)`, "-19", "7"],
    answer: 0,
    feedback: String.raw`\(x_2\) é uma variável. O 7 multiplica a variável e o -19 é o lado direito.`,
    fullSolution: String.raw`<p>As letras com índice, como \(x_1,x_2,x_3\), são as incógnitas. Os números que multiplicam essas letras são coeficientes.</p>`,
    why: "A tabela com números do sistema só faz sentido quando sabemos o que vira coluna."
  }),
  courseMission({
    id: "course-c0-03-coefficient",
    chapter: COURSE_CHAPTERS[0],
    title: "Coeficiente",
    origin: "Lista 10 sistema I",
    skill: "coeficiente",
    data: String.raw`\[3x_1+7x_2+2x_3=-19\]`,
    explain: "Coeficiente é o número que multiplica uma incógnita.",
    question: String.raw`Qual é o coeficiente de \(x_2\)?`,
    choices: ["7", "-19", "2"],
    answer: 0,
    feedback: String.raw`O 7 multiplica \(x_2\). O -19 não multiplica variável: é termo independente.`,
    fullSolution: String.raw`<p>Na equação \(3x_1+7x_2+2x_3=-19\), os coeficientes são \(3,7,2\), na ordem das variáveis.</p>`,
    why: "Essa tela evita o erro grave de chamar o lado direito de coeficiente."
  }),
  courseMission({
    id: "course-c0-04-independent-term",
    chapter: COURSE_CHAPTERS[0],
    title: "Termo independente",
    origin: "Lista 10 sistema I",
    skill: "termo independente",
    data: String.raw`\[3x_1+7x_2+2x_3=-19\]`,
    explain: "Termo independente é o número que fica do outro lado da igualdade.",
    question: "Qual é o termo independente?",
    choices: ["7", "-19", "2"],
    answer: 1,
    feedback: "O -19 fica depois da igualdade. Mais tarde, ele vira o lado direito depois da barra.",
    fullSolution: String.raw`<p>Os coeficientes são \(3,7,2\), e o termo independente é \(-19\). Quando criarmos a tabela com barra, esse \(-19\) ficará depois dela.</p>`,
    why: "Esse é o ponto que precisa estar explícito antes de transformar o sistema em tabela."
  }),
  courseMission({
    id: "course-c0-05-solve-meaning",
    chapter: COURSE_CHAPTERS[0],
    title: "O que significa resolver",
    origin: "Fundamento",
    skill: "solução",
    data: String.raw`\[(x_1,x_2,x_3)=(2,3,-5)\]`,
    explain: "Resolver é encontrar os valores das incógnitas que tornam o sistema verdadeiro.",
    question: "Uma resposta como \((2,3,-5)\) significa:",
    choices: ["valores para as variáveis", "coeficientes da matriz", "operações de linha"],
    answer: 0,
    feedback: String.raw`Ela diz \(x_1=2,\ x_2=3,\ x_3=-5\).`,
    fullSolution: String.raw`<p>Quando uma solução é escrita como \((2,3,-5)\), a ordem segue \((x_1,x_2,x_3)\).</p>`,
    why: "Antes de verificar uma solução, o aluno precisa saber ler o vetor."
  }),

  ...linearQuestions.slice(0, 6).map((item, i) => courseFromQuestion(
    `course-c1-${String(i + 6).padStart(2, "0")}-${item.id}`,
    COURSE_CHAPTERS[1],
    [
      "Identificar equação linear",
      "Expoente diferente de 1",
      "Produto entre variáveis",
      "Raiz de variável",
      "Variável no denominador",
      "Lista 10 exercício 1"
    ][i] || "Equação linear",
    item,
    {
      explain: "Equação linear tem variáveis em grau 1, sem produto entre variáveis, sem raiz de variável e sem variável no denominador.",
      why: "Só sistemas lineares entram nas técnicas dos próximos capítulos."
    }
  )),

  courseMission({
    id: "course-c2-12-vector-solution",
    chapter: COURSE_CHAPTERS[2],
    title: "Vetor como candidato a solução",
    origin: "Lista 10 ex. 2",
    skill: "verificar solução",
    data: `${lista10Ex2System}<p><strong>Vetor candidato:</strong> \\((0,-5,1)\\), isto é, \\(x_1=0,\\ x_2=-5,\\ x_3=1\\).</p>`,
    explain: "Um vetor é uma tentativa de valores para as incógnitas.",
    question: "Antes de concluir, precisamos testar:",
    choices: ["as duas equações", "só a primeira", "só o sinal do vetor"],
    answer: 0,
    feedback: "Precisa passar nas duas equações do sistema.",
    fullSolution: String.raw`<p>Substitua \(x_1=0\), \(x_2=-5\), \(x_3=1\) em cada equação. Só depois conclua.</p>`,
    why: "Este capítulo corrige a ideia de testar uma equação isolada."
  }),
  ...solutionQuestions.slice(0, 4).map((item, i) => courseFromQuestion(
    `course-c2-${String(i + 13).padStart(2, "0")}-${item.id}`,
    COURSE_CHAPTERS[2],
    [
      "Substituir vetor na primeira equação",
      "Substituir vetor nas duas equações",
      "Passar em uma só não basta",
      "Resolver os vetores da Lista 10"
    ][i],
    item,
    {
      explain: `Substitua os valores do vetor nas duas equações. ${item.assignmentText || ""}`,
      why: "Acertar uma equação só não basta; a solução precisa ser simultânea."
    }
  )),

  courseFromQuestion("course-c3-17-line-row", COURSE_CHAPTERS[3], "Transformar equação em linha", matrixQuestions[0], {
    data: lista10SystemI,
    explain: "Uma linha aumentada copia coeficientes antes da barra e lado direito depois da barra."
  }),
  courseFromQuestion("course-c3-18-coefficients-right", COURSE_CHAPTERS[3], "Separar coeficientes e lado direito", matrixQuestions[1], {
    data: lista10SystemI,
    explain: "Os coeficientes acompanham variáveis. O lado direito fica depois da barra."
  }),
  courseFromGuided("course-c3-19-augmented-matrix", COURSE_CHAPTERS[3], guided[0], {
    title: "Montar a matriz aumentada do Sistema I",
    data: lista10SystemI + guided[0].math,
    explain: "Antes das contas de linha, traduza o sistema para matriz aumentada. Cada linha é uma equação.",
    choices: ["coeficientes", "lado direito", "nomes das linhas"]
  }),
  courseMission({
    id: "course-c3-20-bar-meaning",
    chapter: COURSE_CHAPTERS[3],
    title: "O que a barra significa",
    origin: "Fundamento",
    skill: "matriz aumentada",
    data: matrixTex([[3, 7, 2, -19]]),
    explain: "A barra separa o lado esquerdo da equação do lado direito.",
    question: "O número depois da barra é:",
    choices: ["termo independente", "coeficiente de \(x_3\)", "número de apoio"],
    answer: 0,
    feedback: "Depois da barra fica o lado direito da equação.",
    fullSolution: String.raw`<p>\([3,7,2|-19]\) traduz \(3x_1+7x_2+2x_3=-19\).</p>`,
    why: "A barra impede misturar coeficientes com termos independentes."
  }),
  courseFromQuestion("course-c3-21-signs", COURSE_CHAPTERS[3], "Corrigir sinais", matrixQuestions[4], {
    data: lista10SystemII,
    explain: "Sinal negativo também é parte do coeficiente."
  }),
  courseMission({
    id: "course-c3-22-system-i-full",
    chapter: COURSE_CHAPTERS[3],
    title: "Matriz aumentada do Sistema I",
    origin: "Lista 10 sistema I",
    skill: "matriz aumentada",
    data: lista10SystemI,
    explain: "Agora copie o sistema inteiro para uma matriz aumentada.",
    question: "Qual é a matriz aumentada correta?",
    choices: [
      matrixTex([[1, 2, -1, -10], [3, 7, 2, -19], [5, 12, 5, -21]]),
      matrixTex([[-10, 1, 2, -1], [-19, 3, 7, 2], [-21, 5, 12, 5]]),
      matrixTex([[1, 2, -10, -1], [3, 7, -19, 2], [5, 12, -21, 5]])
    ],
    answer: 0,
    feedback: "Coeficientes nas três primeiras colunas; termos independentes depois da barra.",
    fullSolution: String.raw`<p>Cada linha da matriz é uma equação do sistema na mesma ordem em que foi escrita.</p>`,
    why: "Esse é o ponto de entrada para as operações de linha."
  }),

  courseMission({
    id: "course-c4-23-swap-rows",
    chapter: COURSE_CHAPTERS[4],
    title: "Trocar linhas",
    origin: "Fundamento",
    skill: "operações de linha",
    data: String.raw`\[L_1\leftrightarrow L_2\]`,
    explain: "Trocar linhas só muda a ordem das equações. O conjunto de soluções continua o mesmo.",
    question: "Trocar duas linhas muda as soluções?",
    choices: ["Não", "Sim", "Só se tiver fração"],
    answer: 0,
    feedback: "Não muda. É como trocar a ordem dos itens de uma lista.",
    fullSolution: "<p>O sistema continua contendo as mesmas equações, apenas em outra ordem.</p>",
    why: "É a primeira operação elementar permitida."
  }),
  courseFromLab("course-c4-24-scale-nonzero", COURSE_CHAPTERS[4], lab[0], {
    title: "Multiplicar linha por constante não nula"
  }),
  courseFromLab("course-c4-25-zero-invalid", COURSE_CHAPTERS[4], lab.find((item) => item.id === "invalid-zero-0") || lab[25], {
    title: "Por que zero é proibido"
  }),
  courseFromLab("course-c4-26-add-multiple", COURSE_CHAPTERS[4], lab.find((item) => item.id === "combo-0") || lab[49], {
    title: "Somar múltiplo de outra linha"
  }),
  courseFromLab("course-c4-27-whole-row", COURSE_CHAPTERS[4], lab.find((item) => item.id === "multiple-0") || lab[41], {
    title: "A operação mexe na linha inteira"
  }),
  courseFromLab("course-c4-28-right-side", COURSE_CHAPTERS[4], lab.find((item) => item.id === "lista10-l2-3l1") || lab[1], {
    title: "O lado direito também muda"
  }),
  courseFromLab("course-c4-29-short-row-training", COURSE_CHAPTERS[4], lab.find((item) => item.id === "lista10-zero-3") || lab[4], {
    title: "Treino curto de operação de linha"
  }),

  courseMission({
    id: "course-c5-30-pivot",
    chapter: COURSE_CHAPTERS[5],
    title: "O que é pivô",
    origin: "Lista 10 sistema I",
    skill: "pivô",
    data: matrixTex([[1, 2, -1, -10], [3, 7, 2, -19], [5, 12, 5, -21]]),
    explain: "Pivô é o número de apoio usado para limpar a coluna abaixo dele.",
    question: "Na primeira coluna, o primeiro pivô natural é:",
    choices: ["1", "3", "-10"],
    answer: 0,
    feedback: "Usamos o 1 da primeira linha como apoio.",
    fullSolution: String.raw`<p>Com pivô \(1\), fica fácil zerar \(3\) e \(5\) abaixo dele.</p>`,
    why: "Sem pivô, a operação de linha fica sem objetivo."
  }),
  courseMission({
    id: "course-c5-31-zero-below",
    chapter: COURSE_CHAPTERS[5],
    title: "Zerar abaixo do pivô",
    origin: "Lista 10 sistema I",
    skill: "zerar abaixo",
    data: matrixTex([[1, 2, -1, -10], [3, 7, 2, -19]]),
    explain: "Zerar abaixo do pivô cria a escada. O objetivo local é transformar o 3 em 0.",
    question: "Qual conta queremos no primeiro termo da linha 2?",
    choices: [String.raw`\(3-3\cdot1=0\)`, String.raw`\(3+3\cdot1=6\)`, String.raw`\(1-3=-2\)`],
    answer: 0,
    feedback: "O multiplicador 3 vem do número que queremos zerar.",
    fullSolution: String.raw`<p>Como o pivô é \(1\), subtrair \(3L_1\) faz \(3-3\cdot1=0\).</p>`,
    why: "A escolha da operação nasce do objetivo, não de chute."
  }),
  courseMission({
    id: "course-c5-31b-pivot-not-one",
    chapter: COURSE_CHAPTERS[5],
    title: "Pivô diferente de 1: sem pânico",
    origin: "Lista 10 sistema II",
    skill: "pivô diferente de 1",
    type: "operação de linha",
    data: String.raw`\[\left[
\begin{array}{ccc|c}
3&1&-1&-10\\
2&-1&-1&6\\
-4&2&-5&20
\end{array}
\right]\]`,
    explain: "Quando o pivô é 3 e o alvo é 2, você pode usar fração ou multiplicar a linha alvo para evitar fração. O objetivo continua sendo zerar o 2.",
    example: String.raw`<p><strong>Com fração:</strong> \(L_{\text{alvo}}\leftarrow L_{\text{alvo}}-\frac{a}{p}L_{\text{pivô}}\).</p>
<p><strong>Sem fração:</strong> \(L_{\text{alvo}}\leftarrow pL_{\text{alvo}}-aL_{\text{pivô}}\).</p>
<p>Aqui: pivô \(p=3\), alvo \(a=2\), então \(L_2\leftarrow3L_2-2L_1\).</p>`,
    question: String.raw`Para zerar o 2 usando o pivô 3 sem fração, qual operação é correta?`,
    choices: [
      String.raw`\(L_2\leftarrow3L_2-2L_1\)`,
      String.raw`\(L_2\leftarrow2L_2-3L_1\)`,
      String.raw`\(L_1\leftarrow3L_2-2L_1\)`
    ],
    answer: 0,
    feedback: String.raw`Certo. \(3\cdot2-2\cdot3=0\), então o primeiro termo da nova \(L_2\) zera.`,
    fullSolution: String.raw`<p><strong>Pivô:</strong> \(3\), na \(L_1\). <strong>Alvo:</strong> \(2\), na \(L_2\).</p>
<p>\(3L_2=[6,-3,-3|18]\).</p>
<p>\(2L_1=[6,2,-2|-20]\).</p>
<p>\(3L_2-2L_1=[0,-5,-1|38]\).</p>
<p><strong>Conferência do termo independente:</strong> \(18-(-20)=38\).</p>
<p><strong>Erro comum:</strong> fazer \(18-20=-2\) e perder o sinal do \(-20\).</p>`,
    why: "A estratégia sem fração troca uma divisão por uma combinação inteira. Mais limpo para sinais, desde que a linha inteira participe."
  }),
  ...[guided[2], guided[3], guided[4], guided[5], guided[8], guided[10], guided[11]].map((item, i) => courseFromGuided(
    `course-c5-${String(i + 32).padStart(2, "0")}-${item.id}`,
    COURSE_CHAPTERS[5],
    item
  )),

  courseFromQuestion("course-c6-39-unique", COURSE_CHAPTERS[6], "Sistema possível determinado", classifyQuestions[1]),
  courseFromQuestion("course-c6-40-impossible", COURSE_CHAPTERS[6], "Sistema impossível", classifyQuestions[0]),
  courseFromQuestion("course-c6-41-infinite", COURSE_CHAPTERS[6], "Sistema possível indeterminado", classifyQuestions[2]),
  courseFromQuestion("course-c6-42-pivots", COURSE_CHAPTERS[6], "Pivôs", classifyQuestions[14]),
  courseFromQuestion("course-c6-43-contradiction", COURSE_CHAPTERS[6], "Contradição", classifyQuestions[9]),
  courseFromQuestion("course-c6-44-free-variable", COURSE_CHAPTERS[6], "Variável livre", classifyQuestions[4]),
  courseFromQuestion("course-c6-45-final-matrices", COURSE_CHAPTERS[6], "Classificar matrizes finais", classifyQuestions[10]),
  courseFromQuestion("course-c6-46-lista10-i", COURSE_CHAPTERS[6], "Resolver e classificar o Sistema I", classifyQuestions[0], {
    data: lista10SystemI + matrixTex([[1, 2, -1, -10], [0, 1, 5, 11], [0, 0, 0, 7]])
  }),
  courseFromGuided("course-c6-47-lista10-ii", COURSE_CHAPTERS[6], guided[15], {
    title: "Resolver e classificar o Sistema II",
    data: lista10SystemII + guided[15].math
  }),

  courseFromQuestion("course-c7-48-homogeneous", COURSE_CHAPTERS[7], "O que é sistema homogêneo", homogeneousQuestions.find((item) => item.id === "h-gen-1"), {
    data: String.raw`\[A\vec{x}=\vec{0}\]`
  }),
  courseFromQuestion("course-c7-49-trivial", COURSE_CHAPTERS[7], "Solução trivial", homogeneousQuestions.find((item) => item.id === "h-gen-4"), {
    data: String.raw`\[A\vec{x}=\vec{0},\quad \vec{x}=(0,0,0)\]`
  }),
  courseMission({
    id: "course-c7-50-always-has-solution",
    chapter: COURSE_CHAPTERS[7],
    title: "Por que homogêneo sempre tem solução",
    origin: "Fundamento",
    skill: "homogêneos",
    data: String.raw`\[A\vec{x}=\vec{0}\]`,
    explain: "Se todas as incógnitas são zero, o lado esquerdo vira zero. O lado direito já é zero.",
    question: "A solução garantida é:",
    choices: [String.raw`\(\vec{x}=\vec{0}\)`, String.raw`\(\vec{x}=(1,1,1)\)`, "nenhuma"],
    answer: 0,
    feedback: "Tudo zero sempre funciona em sistema homogêneo.",
    fullSolution: String.raw`<p>\(A\vec{0}=\vec{0}\), então homogêneo nunca é impossível.</p>`,
    why: "Esta é a frase-chave: homogêneo nunca é sem solução."
  }),
  courseFromQuestion("course-c7-51-determinant", COURSE_CHAPTERS[7], "Relação com determinante", homogeneousQuestions.find((item) => item.id === "h-gen-2")),
  courseFromQuestion("course-c7-52-only-trivial", COURSE_CHAPTERS[7], "Quando só existe a trivial", homogeneousQuestions.find((item) => item.id === "h-l11-6-det")),
  courseFromQuestion("course-c7-53-nontrivial", COURSE_CHAPTERS[7], "Quando existem soluções não triviais", homogeneousQuestions.find((item) => item.id === "h-l11-5-alpha")),
  courseFromQuestion("course-c7-54-lista11-homogeneous", COURSE_CHAPTERS[7], "Resolver homogêneo da Lista 11", homogeneousQuestions.find((item) => item.id === "h-l11-5-rref")),

  courseFromQuestion("course-c8-55-parameter", COURSE_CHAPTERS[8], "O que é parâmetro", parameterQuestions.find((item) => item.id === "p-gen-k2")),
  courseFromQuestion("course-c8-56-no-divide-zero", COURSE_CHAPTERS[8], "Não dividir por algo que pode zerar", parameterQuestions.find((item) => item.id === "p-gen-div")),
  courseFromQuestion("course-c8-57-cases", COURSE_CHAPTERS[8], "Separar casos", parameterQuestions.find((item) => item.id === "p-gen-case")),
  courseFromQuestion("course-c8-58-param-det", COURSE_CHAPTERS[8], "Determinante com parâmetro", parameterQuestions.find((item) => item.id === "p-l11-1a-det")),
  courseFromQuestion("course-c8-59-general-case", COURSE_CHAPTERS[8], "Caso geral", parameterQuestions.find((item) => item.id === "p-l11-1a-case1")),
  courseFromQuestion("course-c8-60-special-case", COURSE_CHAPTERS[8], "Caso especial", parameterQuestions.find((item) => item.id === "p-l11-1a-case2")),
  courseFromQuestion("course-c8-61-classify-values", COURSE_CHAPTERS[8], "Classificação por valores", parameterQuestions.find((item) => item.id === "p-l11-4-det")),
  courseFromQuestion("course-c8-62-lista11-1a", COURSE_CHAPTERS[8], "Resolver Lista 11 ex. 1(a)", parameterQuestions.find((item) => item.id === "p-l11-1a-infinite")),
  courseFromQuestion("course-c8-63-lista11-2", COURSE_CHAPTERS[8], "Resolver Lista 11 ex. 2", parameterQuestions.find((item) => item.id === "p-l11-2-m2-solution")),
  courseFromQuestion("course-c8-64-lista11-3", COURSE_CHAPTERS[8], "Resolver Lista 11 ex. 3", parameterQuestions.find((item) => item.id === "p-l11-3-a1")),
  courseFromQuestion("course-c8-65-lista11-4", COURSE_CHAPTERS[8], "Resolver Lista 11 ex. 4", parameterQuestions.find((item) => item.id === "p-l11-4-k0")),

  courseMission({
    id: "course-discussion-01-type",
    chapter: COURSE_CHAPTERS[8],
    title: "Discutir sistema: identificar o tipo",
    origin: "Lista 11",
    skill: "discussao de sistemas",
    difficulty: 3,
    data: String.raw`<p><strong>Enunciado:</strong> discuta o sistema em funcao de \(\alpha\).</p>
<p>\[\begin{cases}
x_1+4x_2+\alpha x_3=6\\
2x_1-x_2+2\alpha x_3=3\\
\alpha x_1+3x_2+x_3=5
\end{cases}\]</p>`,
    explain: "Discutir nao e so resolver. E dizer para quais valores o sistema e SPD, SPI ou SI.",
    question: "Antes da conta, que tipo de questao e essa?",
    choices: ["discussao com parametro", "sistema homogeneo", "apenas reconhecer coeficiente"],
    answer: 0,
    feedback: "Certo. Tem parametro e pede discussao: o jogo agora e separar casos.",
    fullSolution: "<p>Primeiro identifique o bicho: ha parametro, ha sistema quadrado e a pergunta pede discutir. Caminho provavel: determinante, valores criticos e investigacao dos casos especiais.</p>",
    why: "O anti-travamento comeca antes da conta: descobrir o tipo da questao reduz o panico."
  }),
  courseMission({
    id: "course-discussion-02-det-radar",
    chapter: COURSE_CHAPTERS[8],
    title: "Determinante como radar",
    origin: "Gerada no escopo Lista 11",
    skill: "determinante",
    difficulty: 3,
    data: String.raw`<p>Em uma discussao, apareceu:</p>\[\det(A)=a-2\]`,
    explain: "Quando o determinante e diferente de zero, acabou a duvida: o sistema quadrado e SPD.",
    question: String.raw`Para qual caso ja podemos concluir SPD?`,
    choices: [String.raw`\(a\neq2\)`, String.raw`\(a=2\)`, "nenhum caso"],
    answer: 0,
    feedback: String.raw`Certo. Se \(a\neq2\), entao \(\det(A)\neq0\), logo SPD.`,
    fullSolution: String.raw`<p>\(a-2=0\Rightarrow a=2\). Portanto, para \(a\neq2\), o determinante nao zera e o sistema e possivel determinado.</p>`,
    why: "Valor critico separa caso geral e caso especial."
  }),
  courseMission({
    id: "course-discussion-03-zero-det",
    chapter: COURSE_CHAPTERS[8],
    title: "Determinante zero nao fecha a historia",
    origin: "Gerada no escopo Lista 11",
    skill: "discussao de sistemas",
    difficulty: 3,
    data: String.raw`<p>Depois de \(\det(A)=a-2\), olhamos o caso especial:</p>\[a=2\]`,
    explain: "Quando o determinante zera, voce perde a garantia de solucao unica. Ainda precisa investigar a matriz ampliada.",
    question: String.raw`No caso \(a=2\), o que vem depois?`,
    choices: ["substituir e escalonar", "concluir SPI direto", "concluir SI direto"],
    answer: 0,
    feedback: "Certo. det(A)=0 pode virar SPI ou SI; so a matriz ampliada decide.",
    fullSolution: "<p>Frase de prova: quando det(A)=0, a treta comeca. Substitua o valor critico e procure contradicao ou variavel livre.</p>",
    why: "Esse e um erro campeao: achar que determinante zero significa infinitas solucoes automaticamente."
  }),
  courseMission({
    id: "course-discussion-04-param-row",
    chapter: COURSE_CHAPTERS[8],
    title: "Parametro depois do escalonamento",
    origin: "Gerada no escopo Lista 11",
    skill: "parametros",
    difficulty: 3,
    data: String.raw`<p>No fim do escalonamento apareceu a linha:</p>\[[0,\ 0,\ 0\ |\ a-3]\]`,
    explain: "A linha diz \(0=a-3\). Se o lado direito nao for zero, ha contradicao.",
    question: String.raw`Para qual caso essa linha vira contradicao?`,
    choices: [String.raw`\(a\neq3\)`, String.raw`\(a=3\)`, "sempre SPI"],
    answer: 0,
    feedback: String.raw`Certo. Se \(a\neq3\), entao \(a-3\neq0\), logo \(0=a-3\) e impossivel.`,
    fullSolution: String.raw`<p>Se \(a=3\), a linha vira \(0=0\). Ai nao ha contradicao; resta ver se sobrou variavel livre.</p>`,
    why: "Linha com parametro exige dois casos, exatamente como um pivo com parametro."
  }),
  courseMission({
    id: "course-discussion-05-write-conclusion",
    chapter: COURSE_CHAPTERS[8],
    title: "Escrever a conclusao completa",
    origin: "Gerada no escopo Lista 11",
    skill: "escrita da conclusao",
    difficulty: 3,
    data: String.raw`<p>Dado: \(\det(A)=3a-6\).</p>
<p>Valor critico: \(a=2\).</p>`,
    explain: "Achar o valor critico nao e a resposta final. A resposta final diz o destino do sistema em cada caso.",
    question: "Qual conclusao esta completa?",
    choices: [
      "a = 2",
      "Se a diferente de 2, SPD. Se a = 2, substituir e escalonar para decidir entre SPI e SI.",
      "det(A)=0, logo SPI"
    ],
    answer: 1,
    feedback: "Certo. Discussao completa tem caso geral e caso especial.",
    fullSolution: String.raw`<p>Modelo: se \(a\neq2\), entao \(\det(A)\neq0\), logo SPD. Se \(a=2\), entao \(\det(A)=0\), logo precisamos substituir no sistema e investigar por escalonamento.</p>`,
    why: "Professor exigente nao aceita so o valor critico. Precisa classificar os casos."
  }),

  courseFromQuestion("course-c9-66-mix-linear", COURSE_CHAPTERS[9], "Misturar identificação linear", linearQuestions[6]),
  courseFromQuestion("course-c9-67-mix-matrix", COURSE_CHAPTERS[9], "Misturar matriz aumentada", matrixQuestions[8]),
  courseFromLab("course-c9-68-mix-row-operation", COURSE_CHAPTERS[9], lab.find((item) => item.id === "combo-3") || lab[52]),
  courseFromQuestion("course-c9-69-mix-classification", COURSE_CHAPTERS[9], "Misturar classificação", classifyQuestions[12]),
  courseFromQuestion("course-c9-70-mix-homogeneous", COURSE_CHAPTERS[9], "Misturar homogêneos", homogeneousQuestions.find((item) => item.id === "h-gen-9")),
  courseFromQuestion("course-c9-71-mix-parameters", COURSE_CHAPTERS[9], "Misturar parâmetros", parameterQuestions.find((item) => item.id === "p-gen-det")),

  courseFromQuestion("course-c10-72-boss-lista10", COURSE_CHAPTERS[10], "Boss final da Lista 10", classifyQuestions[0], {
    data: lista10SystemI + matrixTex([[1, 2, -1, -10], [0, 1, 5, 11], [0, 0, 0, 7]]),
    explain: "Leia a matriz final do Sistema I e classifique sem abrir a lista."
  }),
  courseFromQuestion("course-c10-73-boss-lista11", COURSE_CHAPTERS[10], "Boss final da Lista 11", parameterQuestions.find((item) => item.id === "p-l11-3-am1")),
  courseFromQuestion("course-c10-74-boss-mixed", COURSE_CHAPTERS[10], "Boss final misto", parameterQuestions.find((item) => item.id === "p-l11-4-infinite")),
  courseMission({
    id: "course-c10-75-campaign-complete",
    chapter: COURSE_CHAPTERS[10],
    title: "Tela de conclusão da campanha",
    origin: "Campanha",
    skill: "síntese",
    difficulty: 3,
    data: String.raw`<p><strong>Você atravessou a trilha:</strong> fundamentos, Lista 10, Lista 11, homogêneos e parâmetros.</p>`,
    explain: "Esta é a missão de fechamento. Depois dela, a Jornada mostra o relatório final em vez de voltar para a Fase 0.",
    question: "Qual é o próximo passo natural após concluir a campanha?",
    choices: ["Ver conclusão", "Voltar para Fase 0 automaticamente", "Apagar todo XP"],
    answer: 0,
    feedback: "Isso fecha a campanha linear e abre o relatório final.",
    fullSolution: "<p>A campanha principal termina aqui. Lab, Duelos e Treino Infinito continuam como academia de revisão.</p>",
    why: "A Jornada precisa terminar em conclusão, não reiniciar sozinha."
  })
];

function formalMission({
  id,
  chapter,
  title,
  skill,
  data,
  explain,
  question,
  choices,
  answer,
  feedback,
  fullSolution,
  why
}) {
  return courseMission({
    id,
    chapter,
    title,
    origin: "Nome oficial desbloqueado",
    skill,
    difficulty: 1,
    type: "formalização",
    data,
    explain,
    question,
    choices,
    answer,
    feedback,
    fullSolution,
    solutionLabel: "Abrir verbete do Grimório",
    why
  });
}

const FORMAL_BEFORE = {
  "course-c1-06-l10-1a": [
    formalMission({
      id: "course-formal-01-equation-linear",
      chapter: COURSE_CHAPTERS[1],
      title: "Nome oficial: equação linear",
      skill: "equação linear formal",
      data: String.raw`\[a_1x_1+a_2x_2+\cdots+a_nx_n=b\]`,
      explain: String.raw`Tradução humana: é uma equação em que cada incógnita aparece só no grau 1. O nome oficial é equação linear.`,
      question: String.raw`Na forma geral, quem são os coeficientes?`,
      choices: [String.raw`\(a_1,a_2,\ldots,a_n\)`, String.raw`\(x_1,x_2,\ldots,x_n\)`, String.raw`\(b\)`],
      answer: 0,
      feedback: String.raw`Isso: os \(a_i\) multiplicam as incógnitas. O \(b\) é o termo independente.`,
      fullSolution: String.raw`<p><strong>Incógnitas:</strong> \(x_1,x_2,\ldots,x_n\).</p><p><strong>Coeficientes:</strong> \(a_1,a_2,\ldots,a_n\).</p><p><strong>Termo independente:</strong> \(b\).</p><p><strong>Erro comum:</strong> chamar o lado direito de coeficiente. Ele não multiplica variável.</p>`,
      why: "Nome oficial desbloqueado: agora a intuição tem crachá de professora exigente."
    })
  ],
  "course-c2-12-vector-solution": [
    formalMission({
      id: "course-formal-02-system-linear",
      chapter: COURSE_CHAPTERS[2],
      title: "Nome oficial: sistema linear",
      skill: "sistema linear formal",
      data: String.raw`\[\begin{cases}
a_{11}x_1+a_{12}x_2+\cdots+a_{1n}x_n=b_1\\
a_{21}x_1+a_{22}x_2+\cdots+a_{2n}x_n=b_2\\
\vdots\\
a_{m1}x_1+a_{m2}x_2+\cdots+a_{mn}x_n=b_m
\end{cases}\]`,
      explain: String.raw`Tradução humana: são várias equações lineares jogando juntas. Aqui \(m\) é o número de equações e \(n\) é o número de incógnitas.`,
      question: String.raw`Na notação formal, \(m\) indica:`,
      choices: ["número de equações", "número de incógnitas", "termo independente"],
      answer: 0,
      feedback: String.raw`Certo. \(m\) conta as linhas/equações; \(n\) conta as incógnitas.`,
      fullSolution: String.raw`<p>Uma solução precisa satisfazer as \(m\) equações simultaneamente. Acertar uma linha só ainda não resolve o sistema.</p><p><strong>Erro comum:</strong> testar apenas a primeira equação e concluir cedo demais.</p>`,
      why: "A regra da campanha: uma solução só vence se passar por todas as portas."
    }),
    formalMission({
      id: "course-formal-03-solution-set",
      chapter: COURSE_CHAPTERS[2],
      title: "Nome oficial: solução e conjunto solução",
      skill: "conjunto solução",
      data: String.raw`\[(x_1,x_2,\ldots,x_n)\quad\text{ou}\quad
\vec{x}=\begin{pmatrix}x_1\\x_2\\\vdots\\x_n\end{pmatrix}\]
\[S=\{(x_1,x_2,\ldots,x_n)\in\mathbb{R}^n:\text{ satisfaz o sistema}\}\]`,
      explain: "Tradução humana: a solução é um vetor de valores. O conjunto solução é a caixa com todos os vetores que funcionam.",
      question: "Um vetor solução precisa:",
      choices: ["satisfazer todas as equações", "ter só números positivos", "ser igual aos coeficientes"],
      answer: 0,
      feedback: "Exato. Se falhar em uma equação, não pertence ao conjunto solução.",
      fullSolution: String.raw`<p>Se há uma resposta só, \(S\) tem um único elemento. Se há parâmetro livre, \(S\) tem infinitos elementos. O caso de conjunto vazio será nomeado no capítulo de classificação.</p><p><strong>Erro comum:</strong> confundir o vetor solução com a matriz dos coeficientes.</p>`,
      why: "Esse é o jeito formal de dizer: quais respostas realmente passam no sistema?"
    })
  ],
  "course-c3-17-line-row": [
    formalMission({
      id: "course-formal-04-coefficient-matrix",
      chapter: COURSE_CHAPTERS[3],
      title: "Nome oficial: matriz dos coeficientes",
      skill: "matriz dos coeficientes",
      data: String.raw`\[A=\begin{pmatrix}
a_{11}&a_{12}&\cdots&a_{1n}\\
a_{21}&a_{22}&\cdots&a_{2n}\\
\vdots&\vdots&\ddots&\vdots\\
a_{m1}&a_{m2}&\cdots&a_{mn}
\end{pmatrix}\]`,
      explain: "Tradução humana: \(A\) guarda só os números que multiplicam as incógnitas.",
      question: "A matriz \(A\) guarda:",
      choices: ["coeficientes", "termos independentes", "operações de linha"],
      answer: 0,
      feedback: "Isso. O lado direito ainda não entrou em \(A\).",
      fullSolution: String.raw`<p>Na equação \(3x_1+7x_2+2x_3=-19\), a parte de coeficientes é \([3,7,2]\). O \(-19\) fica fora de \(A\).</p><p><strong>Erro comum:</strong> colocar o lado direito dentro da matriz dos coeficientes.</p>`,
      why: "Separar \(A\) de \(\vec{b}\) evita misturar papel de cada número."
    }),
    formalMission({
      id: "course-formal-05-independent-vector",
      chapter: COURSE_CHAPTERS[3],
      title: "Nome oficial: vetor dos termos independentes",
      skill: "vetor dos termos independentes",
      data: String.raw`\[\vec{b}=\begin{pmatrix}b_1\\b_2\\\vdots\\b_m\end{pmatrix}\]`,
      explain: String.raw`Tradução humana: \(\vec{b}\) guarda os lados direitos das equações, na mesma ordem das linhas.`,
      question: String.raw`Se a segunda equação termina em \(=-19\), esse \(-19\) vai em:`,
      choices: [String.raw`\(\vec{b}\)`, String.raw`\(A\)`, "uma coluna de incógnitas"],
      answer: 0,
      feedback: String.raw`Certo. Termo independente mora em \(\vec{b}\), não em \(A\).`,
      fullSolution: String.raw`<p>Se há \(m\) equações, o vetor \(\vec{b}\) tem \(m\) entradas. Cada entrada corresponde ao lado direito de uma linha.</p><p><strong>Erro comum:</strong> copiar o sinal errado depois da igualdade.</p>`,
      why: "A barra que vem daqui a pouco começa a fazer sentido quando \(A\) e \(\vec{b}\) já estão separados."
    }),
    formalMission({
      id: "course-formal-06-matrix-form",
      chapter: COURSE_CHAPTERS[3],
      title: "Nome oficial: forma matricial",
      skill: "forma matricial",
      data: String.raw`\[A\vec{x}=\vec{b}\]`,
      explain: String.raw`Tradução humana: \(A\) guarda coeficientes, \(\vec{x}\) guarda incógnitas e \(\vec{b}\) guarda os termos independentes.`,
      question: String.raw`Na forma \(A\vec{x}=\vec{b}\), o vetor \(\vec{x}\) guarda:`,
      choices: ["incógnitas", "termos independentes", "nomes das linhas"],
      answer: 0,
      feedback: String.raw`Isso. \(\vec{x}\) é a coluna das incógnitas.`,
      fullSolution: String.raw`<p>A forma matricial é só uma embalagem compacta do sistema. Ela não muda o problema; apenas organiza os papéis.</p><p><strong>Erro comum:</strong> achar que \(A\vec{x}=\vec{b}\) é outro método. É a mesma informação escrita curto.</p>`,
      why: "Essa notação aparece muito em prova; aqui ela vira tradução, não susto."
    }),
    formalMission({
      id: "course-formal-07-augmented-matrix",
      chapter: COURSE_CHAPTERS[3],
      title: "Nome oficial: matriz aumentada",
      skill: "matriz aumentada",
      data: String.raw`\[[A|\vec{b}]\]
\[\left[\begin{array}{ccc|c}
a_{11}&a_{12}&a_{13}&b_1\\
a_{21}&a_{22}&a_{23}&b_2
\end{array}\right]\]`,
      explain: "Tradução humana: antes da barra ficam os coeficientes; depois da barra fica o lado direito.",
      question: "Depois da barra ficam:",
      choices: ["termos independentes", "coeficientes das variáveis", "nomes das linhas"],
      answer: 0,
      feedback: "Certo. A barra não é enfeite: o lado direito vai para a guerra junto.",
      fullSolution: String.raw`<p>Operações de linha mexem na linha inteira, inclusive depois da barra. Se você muda os coeficientes e esquece o lado direito, a equação deixa de ser equivalente.</p><p><strong>Erro comum:</strong> fazer a conta só antes da barra.</p>`,
      why: "Esse é o portal entre equações e escalonamento."
    })
  ],
  "course-c4-23-swap-rows": [
    formalMission({
      id: "course-formal-08-row-operations",
      chapter: COURSE_CHAPTERS[4],
      title: "Feitiços legais: operações elementares",
      skill: "operações elementares",
      data: String.raw`\[L_i\leftrightarrow L_j\]
\[L_i\leftarrow cL_i,\quad c\neq0\]
\[L_i\leftarrow L_i+cL_j\]`,
      explain: String.raw`Nome oficial: operações elementares de linha. Tradução humana: formas permitidas de trocar uma equação por outra equivalente.`,
      question: String.raw`Por que em \(L_i\leftarrow cL_i\) precisa \(c\neq0\)?`,
      choices: ["para não apagar a informação", "para deixar mais bonito", "porque zero sempre ajuda"],
      answer: 0,
      feedback: "Certo. Multiplicar por zero destrói a equação.",
      fullSolution: String.raw`<p>\(L_i\leftrightarrow L_j\): troca duas linhas.</p><p>\(L_i\leftarrow cL_i,\ c\neq0\): multiplica a linha inteira por constante não nula.</p><p>\(L_i\leftarrow L_i+cL_j\): soma múltiplo de outra linha.</p><p><strong>Erro comum:</strong> usar \(c=0\) e perder informação.</p>`,
      why: "Essas são as únicas magias permitidas no duelo de linhas."
    }),
    formalMission({
      id: "course-formal-08b-pivot-basic",
      chapter: COURSE_CHAPTERS[4],
      title: "Nome oficial: pivô",
      skill: "pivô",
      data: String.raw`\[[0,\ 4\ |\ 8]\]`,
      explain: "Tradução humana: pivô é o número de apoio de uma linha ou coluna. Quando ele vale 4, podemos transformar em 1 dividindo a linha por 4.",
      question: String.raw`Na linha \([0,4|8]\), o número de apoio é:`,
      choices: ["4", "8", "0"],
      answer: 0,
      feedback: "Certo. O 4 é o pivô dessa linha; ele multiplica \(y\) na equação \(4y=8\).",
      fullSolution: String.raw`<p><strong>Nome oficial:</strong> pivô.</p><p><strong>Tradução:</strong> número de apoio usado para organizar a linha.</p><p><strong>Exemplo:</strong> \([0,4|8]\) representa \(4y=8\). Multiplicar por \(\frac14\) deixa o pivô igual a 1.</p><p><strong>Erro comum:</strong> achar que o termo depois da barra é pivô. O 8 é lado direito.</p>`,
      why: "Agora, quando o app disser pivô, ele não está invocando uma palavra misteriosa."
    }),
    formalMission({
      id: "course-formal-09-arrow-meaning",
      chapter: COURSE_CHAPTERS[4],
      title: "A seta diz quem é substituído",
      skill: "notação de linha",
      data: String.raw`\[L_i\leftarrow L_i+cL_j\]`,
      explain: String.raw`Tradução humana: a linha antes da seta é substituída. A linha usada como referência não muda, salvo se também aparecer antes da seta.`,
      question: String.raw`Em \(L_2\leftarrow L_2-3L_1\), qual linha muda?`,
      choices: [String.raw`\(L_2\)`, String.raw`\(L_1\)`, "as duas sempre"],
      answer: 0,
      feedback: String.raw`Isso. \(L_1\) serve de apoio; \(L_2\) recebe a nova linha.`,
      fullSolution: String.raw`<p>Leia assim: “a nova \(L_2\) será a antiga \(L_2\) menos \(3\) vezes \(L_1\)”.</p><p><strong>Erro comum:</strong> alterar a linha de apoio sem motivo.</p>`,
      why: "Seta de operação de linha é endereço de entrega: mostra quem recebe a nova linha."
    })
  ],
  "course-c5-30-pivot": [
    formalMission({
      id: "course-formal-10-echelon-terms",
      chapter: COURSE_CHAPTERS[5],
      title: "Vocabulário da escada",
      skill: "escalonamento formal",
      data: String.raw`\[\left[\begin{array}{ccc|c}
1&2&-1&-10\\
0&1&5&11\\
0&0&0&7
\end{array}\right]\]`,
      explain: "Nome oficial: forma escalonada. Tradução humana: uma escada de pivôs, com zeros abaixo deles.",
      question: "Zerar abaixo do pivô significa:",
      choices: ["fazer os números abaixo virarem 0", "apagar a linha inteira", "trocar o lado direito por 0"],
      answer: 0,
      feedback: "Certo. O pivô é o número de apoio; abaixo dele queremos zeros.",
      fullSolution: String.raw`<p><strong>Pivô:</strong> primeiro número útil de uma linha.</p><p><strong>Linha nula:</strong> linha só com zeros.</p><p><strong>Variável com pivô:</strong> coluna que tem pivô.</p><p><strong>Variável livre:</strong> coluna sem pivô, quando não há contradição.</p><p><strong>Erro comum:</strong> achar que linha nula sempre é problema. \([0,0,0|0]\) não é contradição.</p>`,
      why: "Antes de subir a escada, vale nomear os degraus."
    })
  ],
  "course-c6-39-unique": [
    formalMission({
      id: "course-formal-11-spd",
      chapter: COURSE_CHAPTERS[6],
      title: "Classificação formal: SPD",
      skill: "SPD",
      data: String.raw`\[\left[\begin{array}{ccc|c}
1&0&0&2\\
0&1&0&3\\
0&0&1&-5
\end{array}\right]\]
\[S=\{(2,3,-5)\}\]`,
      explain: "Quando cada variável fica presa a um valor, o nome oficial é Sistema Possível Determinado, ou SPD.",
      question: "SPD significa:",
      choices: ["Sistema Possível Determinado", "Sistema Parcialmente Dividido", "Sistema Possível Indeterminado"],
      answer: 0,
      feedback: "Certo. Em português bruto: tem exatamente uma solução.",
      fullSolution: String.raw`<p><strong>Tradução humana:</strong> uma resposta só.</p><p><strong>Sinal típico:</strong> pivô para cada variável.</p><p><strong>Notação:</strong> \(S=\{(2,3,-5)\}\).</p><p><strong>Erro comum:</strong> dizer apenas “tem resposta” sem afirmar que é única.</p>`,
      why: "Determinado = destino fechado. Cada variável recebeu seu valor."
    }),
    formalMission({
      id: "course-formal-12-spi",
      chapter: COURSE_CHAPTERS[6],
      title: "Classificação formal: SPI",
      skill: "SPI",
      data: String.raw`\[\left[\begin{array}{ccc|c}
1&0&2&4\\
0&1&-1&3\\
0&0&0&0
\end{array}\right]\]`,
      explain: "Se não há contradição e sobra variável sem pivô, o nome oficial é Sistema Possível Indeterminado, ou SPI.",
      question: String.raw`A linha \([0,0,0|0]\), sem contradição e com variável livre, indica:`,
      choices: ["SPI", "SI", "SPD"],
      answer: 0,
      feedback: "Certo. Indeterminado não é impossível: é livre demais.",
      fullSolution: String.raw`<p><strong>Tradução humana:</strong> infinitas soluções.</p><p><strong>Motivo:</strong> uma variável fica livre e vira parâmetro.</p><p><strong>Notação possível:</strong> \(S=\{(x,y,z)\in\mathbb{R}^3:\text{ depende de parâmetro}\}\).</p><p><strong>Erro comum:</strong> tratar \(0=0\) como problema. Ele só não prende variável.</p>`,
      why: "Variável livre não é bagunça: é liberdade com crachá."
    }),
    formalMission({
      id: "course-formal-13-si",
      chapter: COURSE_CHAPTERS[6],
      title: "Classificação formal: SI",
      skill: "SI",
      data: String.raw`\[\left[\begin{array}{ccc|c}
1&2&-1&-10\\
0&1&5&11\\
0&0&0&7
\end{array}\right]\]
\[0=7,\qquad S=\varnothing\]`,
      explain: "Se aparece uma linha impossível, o nome oficial é Sistema Impossível, ou SI.",
      question: String.raw`A linha \([0,0,0|7]\) indica:`,
      choices: ["SI", "SPI", "SPD"],
      answer: 0,
      feedback: String.raw`Certo. Ela significa \(0=7\), então \(S=\varnothing\).`,
      fullSolution: String.raw`<p><strong>Tradução humana:</strong> as equações se contradizem.</p><p><strong>Notação:</strong> \(S=\varnothing\), conjunto solução vazio.</p><p><strong>Erro comum:</strong> achar que o 7 é resposta ou variável livre. Não é: ele está depois da barra numa linha sem variáveis.</p>`,
      why: "Essa linha é o alarme de incêndio do sistema."
    })
  ],
  "course-c7-48-homogeneous": [
    formalMission({
      id: "course-formal-14-homogeneous",
      chapter: COURSE_CHAPTERS[7],
      title: "Nome oficial: sistema homogêneo",
      skill: "homogêneos formais",
      data: String.raw`\[A\vec{x}=\vec{0}\]
\[\vec{x}=\vec{0}\]`,
      explain: "Tradução humana: todos os termos independentes são zero. Por isso, colocar todas as incógnitas iguais a zero sempre funciona.",
      question: "A solução trivial é:",
      choices: [String.raw`\(\vec{x}=\vec{0}\)`, String.raw`\(\vec{x}=\vec{b}\)`, "qualquer vetor"],
      answer: 0,
      feedback: String.raw`Certo. A trivial é o vetor zero.`,
      fullSolution: String.raw`<p>Se \(\det(A)\neq0\), só existe a solução trivial. Se \(\det(A)=0\), podem existir soluções não triviais.</p><p><strong>Erro comum:</strong> dizer que homogêneo pode ser impossível. Ele sempre tem pelo menos \(\vec{x}=\vec{0}\).</p>`,
      why: "Homogêneo nunca entra em pânico: o vetor zero já segura a porta."
    })
  ],
  "course-c8-55-parameter": [
    formalMission({
      id: "course-formal-15-parameters",
      chapter: COURSE_CHAPTERS[8],
      title: "Nome oficial: parâmetro",
      skill: "parâmetros formais",
      data: String.raw`\[k-2=0\Rightarrow k=2\]
\[\text{Caso 1: }k\neq2\qquad \text{Caso 2: }k=2\]`,
      explain: String.raw`Parâmetro é uma letra cujo valor precisa ser discutido, como \(k\), \(m\), \(\lambda\) ou \(\alpha\).`,
      question: String.raw`Antes de dividir por \(k-2\), você deve:`,
      choices: ["separar os casos", "dividir direto", "trocar \(k\) por 0 sempre"],
      answer: 0,
      feedback: String.raw`Certo. Primeiro veja quando \(k-2\) zera.`,
      fullSolution: String.raw`<p><strong>Caso geral:</strong> \(k-2\neq0\Rightarrow k\neq2\), pode dividir.</p><p><strong>Caso especial:</strong> \(k-2=0\Rightarrow k=2\), precisa substituir e analisar separadamente.</p><p><strong>Erro comum:</strong> dividir por expressão que pode ser zero e apagar justamente o caso importante.</p>`,
      why: "Parâmetro é chefe secreto: antes de dividir, pergunta quando ele zera."
    })
  ]
};

const COURSE_PATH = COURSE_PATH_BASE.flatMap((mission) => [
  ...(FORMAL_BEFORE[mission.id] || []),
  mission
]);

const CORRECTIVE_MISSIONS = {
  fundamentos: courseMission({
    id: "adaptive-fundamentos",
    chapter: "Microcorrecao adaptativa",
    title: "Microcorrecao: ler o sistema antes da conta",
    origin: "Adaptativo",
    skill: "conceito de sistema",
    data: String.raw`\[\begin{cases}x_1-x_2=3\\2x_1+x_2=6\end{cases}\]`,
    explain: "Voce nao precisa resolver tudo de uma vez. Primeiro leia: cada linha e uma equacao e a solucao precisa satisfazer todas.",
    question: "Uma solucao de sistema precisa satisfazer:",
    choices: ["todas as equacoes", "so a primeira", "a equacao com mais numeros"],
    answer: 0,
    feedback: "Certo. Sistema e pacote fechado.",
    fullSolution: "<p>Se um vetor falha em uma linha, ele nao e solucao do sistema.</p>",
    why: "Esta microaula aparece porque houve repeticao de erro de leitura/conceito."
  }),
  escalonamento: courseMission({
    id: "adaptive-escalonamento",
    chapter: "Microcorrecao adaptativa",
    title: "Microcorrecao: operacao de linha sem bagunca",
    origin: "Adaptativo",
    skill: "escalonamento",
    data: String.raw`<p>\(L_1=[1,2,-1|-10]\)</p><p>\(L_2=[3,7,2|-19]\)</p>`,
    explain: "Objetivo primeiro, operacao depois. Para zerar o 3 abaixo do pivo 1, use o multiplicador 3.",
    question: String.raw`Qual conta zera o primeiro termo da nova \(L_2\)?`,
    choices: [String.raw`\(3-3\cdot1=0\)`, String.raw`\(3+3\cdot1=6\)`, String.raw`\(3-1=2\)`],
    answer: 0,
    feedback: String.raw`Certo. Por isso \(L_2\leftarrow L_2-3L_1\).`,
    fullSolution: String.raw`<p>\(3L_1=[3,6,-3|-30]\). Entao \(L_2-3L_1=[0,1,5|11]\). O lado direito tambem entra: \(-19-(-30)=11\).</p>`,
    why: "Sua ideia pode estar certa; o vacilo costuma ser sinal, ordem ou esquecer a barra."
  }),
  classificacao: courseMission({
    id: "adaptive-classificacao",
    chapter: "Microcorrecao adaptativa",
    title: "Microcorrecao: matriz final fala SPD/SPI/SI",
    origin: "Adaptativo",
    skill: "classificacao",
    data: matrixTex([[1, 2, -1, 3], [0, 1, 4, 2], [0, 0, 0, 5]]),
    explain: "Antes de falar em variavel livre, procure contradicao. Linha [0,0,0|5] diz 0=5.",
    question: "Essa matriz final indica:",
    choices: ["SI", "SPI", "SPD"],
    answer: 0,
    feedback: "Certo. Contradicao mata o sistema: conjunto solucao vazio.",
    fullSolution: String.raw`<p>A ultima linha e \(0=5\). Logo o sistema e impossivel, \(S=\varnothing\).</p>`,
    why: "A linha impossivel vem antes de qualquer discussao sobre variavel livre."
  }),
  homogeneos: courseMission({
    id: "adaptive-homogeneos",
    chapter: "Microcorrecao adaptativa",
    title: "Microcorrecao: homogeneo nunca comeca impossivel",
    origin: "Adaptativo",
    skill: "homogeneos",
    data: String.raw`\[A\vec{x}=\vec{0}\]`,
    explain: "Se \(\vec{x}=\vec{0}\), o lado esquerdo vira zero. O lado direito ja e zero.",
    question: "Qual solucao sempre existe em sistema homogeneo?",
    choices: [String.raw`\(\vec{x}=\vec{0}\)`, "nenhuma", String.raw`\(\vec{x}=(1,1,1)\)`],
    answer: 0,
    feedback: "Certo. Essa e a solucao trivial.",
    fullSolution: String.raw`<p>Se \(\det(A)\neq0\), so ha a trivial. Se \(\det(A)=0\), podem existir solucoes nao triviais.</p>`,
    why: "O erro comum e tratar homogeneo como se pudesse ser SI de cara."
  }),
  parametros: courseMission({
    id: "adaptive-parametros",
    chapter: "Microcorrecao adaptativa",
    title: "Microcorrecao: parametro e chefe secreto",
    origin: "Adaptativo",
    skill: "parametros",
    data: String.raw`<p>Apareceu o pivo \(k-2\).</p>`,
    explain: "Antes de dividir por uma expressao com parametro, pergunte quando ela zera.",
    question: String.raw`Quando \(k-2\) zera?`,
    choices: [String.raw`\(k=2\)`, String.raw`\(k=-2\)`, "nunca"],
    answer: 0,
    feedback: String.raw`Certo. Separe \(k\neq2\) e \(k=2\).`,
    fullSolution: String.raw`<p>No caso \(k\neq2\), pode dividir. No caso \(k=2\), substitua no sistema e investigue SPD, SPI ou SI.</p>`,
    why: "Dividir por algo que pode ser zero destrói a discussao."
  })
};

const DIAGNOSTIC_TARGETS = {
  fundamentals: "course-c0-03-coefficient",
  linear: "course-c1-06-l10-1a",
  matrix: "course-c3-17-line-row",
  rows: "course-c4-28-right-side",
  signs: "course-c5-33-g3",
  pivot: "course-c5-31b-pivot-not-one",
  classify: "course-c6-40-impossible",
  free: "course-c6-44-free-variable",
  homogeneous: "course-c7-48-homogeneous",
  parameters: "course-c8-55-parameter"
};

const legacyDiagnostic = [
  { target: "fund", q: String.raw`Em \(5x_1+12x_2+5x_3=-21\), o coeficiente de \(x_2\) é:`, c: ["12", "-21", "5"], a: 0 },
  { target: "fund", q: String.raw`O termo independente em \(3x_1+7x_2+2x_3=-19\) é:`, c: ["2", "-19", "7"], a: 1 },
  { target: "linear", q: String.raw`\(x_1+4x_3x_4=20\) é linear?`, c: ["Sim", "Não"], a: 1 },
  { target: "system", q: "Uma solução de sistema precisa satisfazer:", c: ["uma equação", "todas as equações", "só a última"], a: 1 },
  { target: "matrix", q: "Na matriz aumentada abaixo, a barra separa:", context: matrixTex([[1, -2, 8], [0, 3, -3]]), c: ["coeficientes e lado direito", "linhas e colunas", "zeros e sinais"], a: 0 },
  { target: "spell-scale", q: String.raw`Transformar \(4y=8\) em \(y=2\) é:`, c: [String.raw`multiplicar por \(\frac{1}{4}\)`, "multiplicar por 4", "multiplicar por 0"], a: 0 },
  { target: "parameters", q: String.raw`Antes de dividir por \(\lambda-1\), precisamos testar:`, c: [String.raw`\(\lambda=1\)`, String.raw`\(\lambda=-1\)`, "nada"], a: 0 },
  { target: "homogeneous", q: "Sistema homogêneo sempre tem:", c: ["a trivial", "contradição", "lado direito 7"], a: 0 }
];

const diagnosticMojibake = [
  {
    target: "fundamentals",
    q: String.raw`Em \(3x_1+7x_2+2x_3=-19\), qual Ã© o termo independente?`,
    c: ["7", "-19", "2"],
    a: 1,
    feedbacks: ["7 Ã© coeficiente de \(x_2\).", "Certo: termo independente fica depois da igualdade.", "2 Ã© coeficiente de \(x_3\)."]
  },
  {
    target: "linear",
    q: String.raw`\(x_1+4x_3x_4=20\) Ã© linear?`,
    c: ["Sim", "NÃ£o, tem produto entre variÃ¡veis", "SÃ³ se \(x_4=1\)"],
    a: 1,
    feedbacks: ["NÃ£o: \(x_3x_4\) Ã© produto entre variÃ¡veis.", "Certo: produto entre variÃ¡veis quebra linearidade.", "NÃ£o vale escolher valor para salvar a forma."]
  },
  {
    target: "matrix",
    q: String.raw`A linha correta para \(x_1-x_2+3x_3=8\) Ã©:`,
    context: lista10Ex2System,
    c: [String.raw`\([1,-1,3|8]\)`, String.raw`\([1,1,3|8]\)`, String.raw`\([8,1,-1|3]\)`],
    a: 0,
    feedbacks: ["Certo: coeficientes antes da barra, lado direito depois.", "O sinal de \(x_2\) Ã© negativo.", "O 8 Ã© termo independente; fica depois da barra."]
  },
  {
    target: "rows",
    q: String.raw`Para zerar o 3 abaixo do pivÃ´ 1 em \(L_2=[3,7,2|-19]\), use:`,
    context: String.raw`\[L_1=[1,2,-1|-10]\]`,
    c: [String.raw`\(L_2\leftarrow L_2-3L_1\)`, String.raw`\(L_2\leftarrow L_2+3L_1\)`, String.raw`\(L_1\leftarrow L_1-3L_2\)`],
    a: 0,
    feedbacks: [String.raw`Certo: \(3-3\cdot1=0\).`, String.raw`Sinal errado: \(3+3\cdot1=6\).`, "Linha errada: quem recebe a nova linha Ã© \(L_2\)."]
  },
  {
    target: "signs",
    q: String.raw`Na conta \(-19-(-30)\), o resultado Ã©:`,
    c: ["11", "-49", "-11"],
    a: 0,
    feedbacks: ["Certo: subtrair negativo vira somar.", "Isso seria \(-19-30\), mas aqui Ã© \(-19-(-30)\).", "Faltou cuidar do segundo sinal de menos."]
  },
  {
    target: "pivot",
    q: String.raw`Com pivÃ´ \(3\) e alvo \(2\), qual operaÃ§Ã£o zera sem fraÃ§Ã£o?`,
    context: matrixTex([[3, 1, -1, -10], [2, -1, -1, 6]]),
    c: [String.raw`\(L_2\leftarrow3L_2-2L_1\)`, String.raw`\(L_2\leftarrow2L_2-3L_1\)`, String.raw`\(L_2\leftarrow L_2-3L_1\)`],
    a: 0,
    feedbacks: [String.raw`Certo: \(3\cdot2-2\cdot3=0\).`, String.raw`DÃ¡ \(2\cdot2-3\cdot3=-5\), nÃ£o zero.`, String.raw`DÃ¡ \(2-3\cdot3=-7\), nÃ£o zero.`]
  },
  {
    target: "classify",
    q: String.raw`A linha \([0,0,0|7]\) significa:`,
    c: [String.raw`SI, pois \(0=7\)`, "SPI, pois sobrou variÃ¡vel livre", "SPD, pois tem uma resposta"],
    a: 0,
    feedbacks: [String.raw`Certo: \(0=7\) Ã© contradiÃ§Ã£o.`, "NÃ£o: variÃ¡vel livre exige linha zero consistente, nÃ£o \(0=7\).", "NÃ£o: contradiÃ§Ã£o elimina todas as soluÃ§Ãµes."]
  },
  {
    target: "free",
    q: String.raw`Se nÃ£o hÃ¡ contradiÃ§Ã£o e \(x_3\) nÃ£o tem pivÃ´, entÃ£o:`,
    c: [String.raw`\(x_3\) Ã© variÃ¡vel livre`, String.raw`\(x_3=0\) obrigatoriamente`, "o sistema Ã© impossÃ­vel"],
    a: 0,
    feedbacks: ["Certo: variÃ¡vel sem pivÃ´ vira parÃ¢metro.", "NÃ£o. Livre nÃ£o quer dizer automaticamente zero.", "NÃ£o hÃ¡ contradiÃ§Ã£o."]
  },
  {
    target: "homogeneous",
    q: String.raw`Sistema homogÃªneo \(A\vec{x}=\vec{0}\) sempre tem:`,
    c: ["a soluÃ§Ã£o trivial", "contradiÃ§Ã£o", "lado direito 7"],
    a: 0,
    feedbacks: ["Certo: \(\vec{x}=\vec{0}\) sempre funciona.", "HomogÃªneo nunca Ã© impossÃ­vel de cara.", "O lado direito Ã© zero."]
  },
  {
    target: "parameters",
    q: String.raw`Antes de dividir por \(\lambda-1\), precisamos testar:`,
    c: [String.raw`\(\lambda=1\)`, String.raw`\(\lambda=-1\)`, "nada"],
    a: 0,
    feedbacks: [String.raw`Certo: \(\lambda-1=0\Rightarrow\lambda=1\).`, "Esse valor zera \(\lambda+1\), nÃ£o \(\lambda-1\).", "Perigoso: pode dividir por zero sem perceber."]
  }
];

const diagnostic = [
  {
    target: "fundamentals",
    q: String.raw`Em \(3x_1+7x_2+2x_3=-19\), qual e o termo independente?`,
    c: ["7", "-19", "2"],
    a: 1,
    feedbacks: ["7 e coeficiente de x2.", "Certo: termo independente fica depois da igualdade.", "2 e coeficiente de x3."]
  },
  {
    target: "linear",
    q: String.raw`\(x_1+4x_3x_4=20\) e linear?`,
    c: ["Sim", "Nao, tem produto entre variaveis", String.raw`So se \(x_4=1\)`],
    a: 1,
    feedbacks: [String.raw`Nao: \(x_3x_4\) e produto entre variaveis.`, "Certo: produto entre variaveis quebra linearidade.", "Nao vale escolher valor para salvar a forma."]
  },
  {
    target: "matrix",
    q: String.raw`A linha correta para \(x_1-x_2+3x_3=8\) e:`,
    context: lista10Ex2System,
    c: [String.raw`\([1,-1,3|8]\)`, String.raw`\([1,1,3|8]\)`, String.raw`\([8,1,-1|3]\)`],
    a: 0,
    feedbacks: ["Certo: coeficientes antes da barra, lado direito depois.", String.raw`O sinal de \(x_2\) e negativo.`, "O 8 e termo independente; fica depois da barra."]
  },
  {
    target: "rows",
    q: String.raw`Para zerar o 3 abaixo do pivo 1 em \(L_2=[3,7,2|-19]\), use:`,
    context: String.raw`\[L_1=[1,2,-1|-10]\]`,
    c: [String.raw`\(L_2\leftarrow L_2-3L_1\)`, String.raw`\(L_2\leftarrow L_2+3L_1\)`, String.raw`\(L_1\leftarrow L_1-3L_2\)`],
    a: 0,
    feedbacks: [String.raw`Certo: \(3-3\cdot1=0\).`, String.raw`Sinal errado: \(3+3\cdot1=6\).`, String.raw`Linha errada: quem recebe a nova linha e \(L_2\).`]
  },
  {
    target: "signs",
    q: String.raw`Na conta \(-19-(-30)\), o resultado e:`,
    c: ["11", "-49", "-11"],
    a: 0,
    feedbacks: ["Certo: subtrair negativo vira somar.", String.raw`Isso seria \(-19-30\), mas aqui e \(-19-(-30)\).`, "Faltou cuidar do segundo sinal de menos."]
  },
  {
    target: "pivot",
    q: String.raw`Com pivo \(3\) e alvo \(2\), qual operacao zera sem fracao?`,
    context: matrixTex([[3, 1, -1, -10], [2, -1, -1, 6]]),
    c: [String.raw`\(L_2\leftarrow3L_2-2L_1\)`, String.raw`\(L_2\leftarrow2L_2-3L_1\)`, String.raw`\(L_2\leftarrow L_2-3L_1\)`],
    a: 0,
    feedbacks: [String.raw`Certo: \(3\cdot2-2\cdot3=0\).`, String.raw`Da \(2\cdot2-3\cdot3=-5\), nao zero.`, String.raw`Da \(2-3\cdot3=-7\), nao zero.`]
  },
  {
    target: "classify",
    q: String.raw`A linha \([0,0,0|7]\) significa:`,
    c: [String.raw`SI, pois \(0=7\)`, "SPI, pois sobrou variavel livre", "SPD, pois tem uma resposta"],
    a: 0,
    feedbacks: [String.raw`Certo: \(0=7\) e contradicao.`, String.raw`Nao: variavel livre exige linha zero consistente, nao \(0=7\).`, "Nao: contradicao elimina todas as solucoes."]
  },
  {
    target: "free",
    q: String.raw`Se nao ha contradicao e \(x_3\) nao tem pivo, entao:`,
    c: [String.raw`\(x_3\) e variavel livre`, String.raw`\(x_3=0\) obrigatoriamente`, "o sistema e impossivel"],
    a: 0,
    feedbacks: ["Certo: variavel sem pivo vira parametro.", "Nao. Livre nao quer dizer automaticamente zero.", "Nao ha contradicao."]
  },
  {
    target: "homogeneous",
    q: String.raw`Sistema homogeneo \(A\vec{x}=\vec{0}\) sempre tem:`,
    c: ["a solucao trivial", "contradicao", "lado direito 7"],
    a: 0,
    feedbacks: [String.raw`Certo: \(\vec{x}=\vec{0}\) sempre funciona.`, "Homogeneo nunca e impossivel de cara.", "O lado direito e zero."]
  },
  {
    target: "parameters",
    q: String.raw`Antes de dividir por \(\lambda-1\), precisamos testar:`,
    c: [String.raw`\(\lambda=1\)`, String.raw`\(\lambda=-1\)`, "nada"],
    a: 0,
    feedbacks: [String.raw`Certo: \(\lambda-1=0\Rightarrow\lambda=1\).`, String.raw`Esse valor zera \(\lambda+1\), nao \(\lambda-1\).`, "Perigoso: pode dividir por zero sem perceber."]
  }
];

diagnostic.splice(9, 0,
  {
    target: "determinant",
    skill: "determinante",
    errorType: "interpretacao",
    q: String.raw`Em um sistema quadrado, se \(\det(A)\neq0\), a classificacao e:`,
    c: ["SPD", "SPI automaticamente", "SI automaticamente"],
    a: 0,
    feedbacks: [
      "Certo: determinante diferente de zero garante solucao unica, isto e, SPD.",
      "Nao. SPI pode acontecer quando a garantia de solucao unica cai, mas nao quando det(A) e diferente de zero.",
      "Nao. SI exige contradicao; det(A) diferente de zero garante SPD."
    ]
  },
  {
    target: "discussion",
    skill: "discussaoSistema",
    errorType: "conclusao",
    q: String.raw`Se \(\det(A)=0\) em um sistema com parametro, o proximo passo correto e:`,
    c: ["substituir o valor critico e investigar", "concluir SPI automaticamente", "parar no valor critico"],
    a: 0,
    feedbacks: [
      "Certo. det(A)=0 nao decide tudo: substitua o valor critico e escalone a matriz ampliada.",
      "Cuidado: det(A)=0 nao significa SPI automaticamente. Pode ser SPI ou SI.",
      "Valor critico nao e resposta final. Falta discutir o destino do sistema."
    ]
  }
);

const DIAGNOSTIC_SKILL_BY_TARGET = {
  fundamentals: "conceitoSistema",
  linear: "conceitoSistema",
  matrix: "matrizAmpliada",
  rows: "escalonamento",
  signs: "aritmetica",
  pivot: "escalonamento",
  classify: "classificacao",
  free: "classificacao",
  homogeneous: "homogeneo",
  determinant: "determinante",
  discussion: "discussaoSistema",
  parameters: "parametros"
};

diagnostic.forEach((item, index) => {
  item.id ||= `diagnostic-${String(index + 1).padStart(2, "0")}-${item.target}`;
  item.skill ||= DIAGNOSTIC_SKILL_BY_TARGET[item.target] || "conceitoSistema";
  item.errorType ||= inferErrorType(item.skill);
});

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

function lista11System({
  id,
  number,
  origin,
  originType = "Lista 11",
  title,
  statement,
  matrix = "",
  typeLabel,
  strategy,
  determinant = "",
  critical = "",
  care,
  conclusion,
  proofConclusion,
  commonError,
  deepExplanation = "",
  fullBoardSolution = "",
  whyLayers = "",
  miniTest = "",
  parameterStatus = "none",
  parameterName = "",
  parameterValue = "",
  mission = "",
  firstOperation = "",
  firstOperationWrongChoices = [],
  firstOperationFeedbacks = [],
  difficulty = 2,
  tags = [],
  boardMode = "guiado"
}) {
  return {
    id,
    number,
    origin,
    originType,
    title,
    statement,
    matrix,
    typeLabel,
    strategy,
    determinant,
    critical,
    care,
    conclusion,
    proofConclusion,
    commonError,
    deepExplanation,
    fullBoardSolution,
    whyLayers,
    miniTest,
    parameterStatus,
    parameterName,
    parameterValue,
    mission,
    firstOperation,
    firstOperationWrongChoices,
    firstOperationFeedbacks,
    difficulty,
    tags,
    kind: tags[0] || "lista11",
    boardMode
  };
}

const LISTA11_SYSTEMS = [
  lista11System({
    id: "s01-l11-1a-lambda",
    number: 1,
    origin: "Lista 11 - exercicio 1(a)",
    title: "Discussao 2x2 com lambda",
    statement: String.raw`\[\begin{cases}\lambda x+2y=\lambda-1\\2x+4y=3\lambda\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{cc|c}\lambda&2&\lambda-1\\2&4&3\lambda\end{array}\right]\]`,
    typeLabel: "Sistema 2x2 nao homogeneo com parametro lambda.",
    strategy: "Calcular det(A), separar lambda diferente de 1 e lambda igual a 1, e testar a matriz aumentada no caso critico.",
    determinant: String.raw`\(\det(A)=4\lambda-4=4(\lambda-1)\).`,
    critical: String.raw`Valor critico: \(\lambda=1\). Se \(\lambda\neq1\), SPD. Se \(\lambda=1\), SI.`,
    care: "Nao pare em lambda=1. Esse valor so manda substituir e verificar consistencia.",
    conclusion: String.raw`Para \(\lambda\neq1\), SPD. Para \(\lambda=1\), SI. Nao ha caso SPI.`,
    proofConclusion: String.raw`Como \(\det(A)=4(\lambda-1)\), para \(\lambda\neq1\) o sistema e SPD. Para \(\lambda=1\), a matriz ampliada fica inconsistente; logo o sistema e SI.`,
    commonError: "Achar que det(A)=0 implica SPI automaticamente.",
    tags: ["parametro", "classificacao", "determinante", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s02-l11-1b-lambda-mu",
    number: 2,
    origin: "Lista 11 - exercicio 1(b)",
    title: "Discussao 3x3 com lambda e mu",
    statement: String.raw`\[\begin{cases}x+y+\lambda z=1\\2x-2y+z=-1\\3x-y+3z=\mu\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&1&\lambda&1\\2&-2&1&-1\\3&-1&3&\mu\end{array}\right]\]`,
    typeLabel: "Sistema 3x3 nao homogeneo com dois parametros.",
    strategy: "Usar determinante para o caso geral e investigar lambda=2 com o parametro mu.",
    determinant: String.raw`\(\det(A)=4(\lambda-2)\).`,
    critical: String.raw`Se \(\lambda\neq2\), SPD para qualquer \(\mu\). Se \(\lambda=2\), o resultado depende de \(\mu\).`,
    care: "O caso critico tem dois parametros: lambda fixa o det zero; mu decide consistencia.",
    conclusion: String.raw`Se \(\lambda\neq2\), SPD. Se \(\lambda=2\) e \(\mu=0\), SPI. Se \(\lambda=2\) e \(\mu\neq0\), SI.`,
    proofConclusion: String.raw`Para \(\lambda\neq2\), \(\det(A)\neq0\), logo SPD. Para \(\lambda=2\), ao escalonar a ampliada: \(\mu=0\) gera SPI e \(\mu\neq0\) gera SI.`,
    commonError: "Dizer apenas lambda=2 e esquecer de discutir mu.",
    difficulty: 3,
    tags: ["parametro", "classificacao", "determinante", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s03-l11-1c-m-overdetermined",
    number: 3,
    origin: "Lista 11 - exercicio 1(c)",
    title: "Tres equacoes, duas incognitas",
    statement: String.raw`\[\begin{cases}mx+y=1\\x+y=2\\x-y=m\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{cc|c}m&1&1\\1&1&2\\1&-1&m\end{array}\right]\]`,
    typeLabel: "Sistema nao quadrado com parametro m.",
    strategy: "Nao usar determinante 3x3. Resolver as duas ultimas equacoes e substituir na primeira.",
    determinant: "Nao e o caminho principal: ha 3 equacoes e 2 incognitas.",
    critical: String.raw`Da substituicao vem \(m(m+1)=0\).`,
    care: "Sistema com mais equacoes que incognitas ainda pode ter solucao unica se for consistente.",
    conclusion: String.raw`Para \(m=0\) ou \(m=-1\), ha solucao unica. Para outros valores, SI.`,
    proofConclusion: String.raw`Das duas ultimas equacoes, \(x=(m+2)/2\) e \(y=(2-m)/2\). Substituindo na primeira: \(m(m+1)=0\). Logo \(m=0\) ou \(m=-1\) dao solucao unica; caso contrario, SI.`,
    commonError: "Tentar aplicar det(A) como se a matriz fosse quadrada.",
    difficulty: 3,
    tags: ["parametro", "classificacao", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s04-l11-1d-hom-lambda",
    number: 4,
    origin: "Lista 11 - exercicio 1(d)",
    title: "Homogeneo 3x3 com lambda",
    statement: String.raw`\[\begin{cases}x+y-2z=0\\2x-y+3z=0\\3x-2y+\lambda z=0\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&1&-2&0\\2&-1&3&0\\3&-2&\lambda&0\end{array}\right]\]`,
    typeLabel: "Sistema homogeneo 3x3 com parametro lambda.",
    strategy: "Usar determinante para separar apenas trivial de solucoes nao triviais.",
    determinant: String.raw`\(\det(A)=17-3\lambda\).`,
    critical: String.raw`Valor critico: \(\lambda=17/3\).`,
    care: "Homogeneo nunca e SI: a solucao trivial sempre existe.",
    conclusion: String.raw`Se \(\lambda\neq17/3\), apenas trivial. Se \(\lambda=17/3\), infinitas solucoes, \(t(-1,7,3)\).`,
    proofConclusion: String.raw`Como o sistema e homogeneo, \(\vec{x}=\vec{0}\) sempre resolve. Se \(\det(A)\neq0\), so a trivial. Se \(\lambda=17/3\), ha variavel livre e solucoes nao triviais.`,
    commonError: "Chamar o caso det zero de SI em sistema homogeneo.",
    difficulty: 3,
    tags: ["homogeneo", "parametro", "determinante", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s05-l11-2a-m-unique",
    number: 5,
    origin: "Lista 11 - exercicio 2(a)",
    title: "Valor de m para solucao unica",
    statement: String.raw`\[\begin{pmatrix}m&1&1\\2&-1&2\\4&-1&1\end{pmatrix}\begin{pmatrix}x_1\\x_2\\x_3\end{pmatrix}=\begin{pmatrix}2\\5\\6\end{pmatrix}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}m&1&1&2\\2&-1&2&5\\4&-1&1&6\end{array}\right]\]`,
    typeLabel: "Sistema 3x3 com parametro m pedindo solucao unica.",
    strategy: "Calcular det(A) e exigir det(A) diferente de zero.",
    determinant: String.raw`\(\det(A)=m+8\).`,
    critical: String.raw`Solucao unica quando \(m\neq-8\).`,
    care: "O enunciado pede solucao unica, entao o caso det diferente de zero ja resolve.",
    conclusion: String.raw`O sistema admite solucao unica para \(m\neq-8\).`,
    proofConclusion: String.raw`Como \(\det(A)=m+8\), a matriz dos coeficientes e inversivel quando \(m\neq-8\). Logo ha solucao unica exatamente para \(m\neq-8\).`,
    commonError: "Responder m=-8, que e justamente o valor que derruba a unicidade.",
    tags: ["parametro", "determinante", "classificacao", "lista11-total"]
  }),
  lista11System({
    id: "s06-l11-2b-m2",
    number: 6,
    origin: "Lista 11 - exercicio 2(b)",
    title: "Resolver o sistema com m=2",
    statement: String.raw`\[\begin{cases}2x_1+x_2+x_3=2\\2x_1-x_2+2x_3=5\\4x_1-x_2+x_3=6\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}2&1&1&2\\2&-1&2&5\\4&-1&1&6\end{array}\right]\]`,
    typeLabel: "Sistema numerico 3x3 para escalonamento.",
    strategy: "Montar a matriz aumentada, escolher pivo e escalonar ate isolar as variaveis.",
    determinant: String.raw`Como \(m=2\), \(\det(A)=10\neq0\). Deve haver SPD.`,
    critical: "Nao ha caso de parametro aqui: m ja foi fixado em 2.",
    care: "A dificuldade e execucao: sinais, barra e organizacao.",
    conclusion: String.raw`SPD, com \((x_1,x_2,x_3)=(1,-1,1)\).`,
    proofConclusion: String.raw`Escalonando a matriz aumentada, obtemos \(x_1=1\), \(x_2=-1\), \(x_3=1\). Como ha pivo para cada variavel, o sistema e SPD.`,
    commonError: "Errar a conta na linha inteira e esquecer o termo depois da barra.",
    difficulty: 2,
    tags: ["escalonamento", "classificacao", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s07-l11-3-alpha-geral",
    number: 7,
    origin: "Lista 11 - exercicio 3 geral",
    title: String.raw`Discussao geral com \(\alpha\)`,
    statement: String.raw`\[\begin{cases}x_1+4x_2+\alpha x_3=6\\2x_1-x_2+2\alpha x_3=3\\\alpha x_1+3x_2+x_3=5\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&4&\alpha&6\\2&-1&2\alpha&3\\\alpha&3&1&5\end{array}\right]\]`,
    typeLabel: String.raw`Sistema 3x3 nao homogeneo com parametro \(\alpha\).`,
    strategy: String.raw`Calcular determinante e discutir os casos \(\alpha=1\) e \(\alpha=-1\).`,
    determinant: String.raw`\(\det(A)=9(\alpha-1)(\alpha+1)\).`,
    critical: String.raw`Valores criticos: \(\alpha=1\) e \(\alpha=-1\).`,
    care: "Os valores criticos saem de det(A)=0. Fora deles ha SPD; dentro deles voce precisa escalonar para decidir SPI ou SI.",
    conclusion: String.raw`Se \(\alpha\neq1,-1\), SPD. Se \(\alpha=1\), SPI. Se \(\alpha=-1\), SI.`,
    proofConclusion: String.raw`Para \(\alpha\neq1,-1\), \(\det(A)\neq0\), logo SPD. Substituindo os valores criticos: \(\alpha=1\) gera SPI e \(\alpha=-1\) gera SI.`,
    commonError: "Testar apenas um dos valores criticos.",
    deepExplanation: String.raw`
      <p>A matriz dos coeficientes e \(A=\begin{pmatrix}1&4&\alpha\\2&-1&2\alpha\\\alpha&3&1\end{pmatrix}\).</p>
      <p>O determinante e \(\det(A)=9(\alpha-1)(\alpha+1)\).</p>
      <p>Logo \(\det(A)=0\) quando \(\alpha=1\) ou \(\alpha=-1\). Esses sao os valores criticos.</p>
      <p>Se \(\alpha\neq1\) e \(\alpha\neq-1\), entao \(\det(A)\neq0\). Ha pivo para todas as variaveis, portanto o sistema e SPD.</p>
      <p>Se \(\alpha=1\) ou \(\alpha=-1\), o determinante zera. Isso nao decide SPI automaticamente: precisa testar cada caso por escalonamento.</p>
    `,
    fullBoardSolution: String.raw`
      <div class="deep-solution">
        <h4>1. Matriz dos coeficientes</h4>
        \[
        A=\begin{pmatrix}
        1&4&\alpha\\
        2&-1&2\alpha\\
        \alpha&3&1
        \end{pmatrix}
        \]
        <h4>2. Determinante e valores criticos</h4>
        \[
        \det(A)=9(\alpha-1)(\alpha+1)
        \]
        <p>Portanto \(\det(A)=0\) para \(\alpha=1\) ou \(\alpha=-1\).</p>

        <h4>3. Caso \(\alpha\neq1\) e \(\alpha\neq-1\)</h4>
        <p>Nesse caso \(\det(A)\neq0\). A matriz dos coeficientes e invertivel, ha pivo para cada variavel e o sistema tem solucao unica.</p>
        <p><strong>Conclusao:</strong> SPD.</p>

        <h4>4. Caso \(\alpha=1\)</h4>
        \[
        \left[\begin{array}{ccc|c}
        1&4&1&6\\
        2&-1&2&3\\
        1&3&1&5
        \end{array}\right]
        \]
        <p>\(L_2\leftarrow L_2-2L_1\):</p>
        \[
        [2,-1,2|3]-2[1,4,1|6]=[0,-9,0|-9]
        \]
        <p>\(L_3\leftarrow L_3-L_1\):</p>
        \[
        [1,3,1|5]-[1,4,1|6]=[0,-1,0|-1]
        \]
        <p>As duas linhas dizem a mesma coisa: \(x_2=1\). Nao ha contradicao, mas falta pivo para \(x_3\). Entao \(x_3=t\), \(x_2=1\), \(x_1=2-t\).</p>
        \[
        (x_1,x_2,x_3)=(2-t,1,t)
        \]
        <p><strong>Conclusao:</strong> SPI.</p>

        <h4>5. Caso \(\alpha=-1\)</h4>
        \[
        \left[\begin{array}{ccc|c}
        1&4&-1&6\\
        2&-1&-2&3\\
        -1&3&1&5
        \end{array}\right]
        \]
        <p>\(L_2\leftarrow L_2-2L_1\):</p>
        \[
        [2,-1,-2|3]-2[1,4,-1|6]=[0,-9,0|-9]
        \]
        <p>\(L_3\leftarrow L_3+L_1\):</p>
        \[
        [-1,3,1|5]+[1,4,-1|6]=[0,7,0|11]
        \]
        <p>A primeira linha implica \(x_2=1\). A segunda implica \(x_2=11/7\). A mesma variavel teria que ter dois valores diferentes. Isso e contradicao.</p>
        <p>Continuando o escalonamento, aparece uma linha do tipo \([0,0,0|c]\), com \(c\neq0\).</p>
        <p><strong>Conclusao:</strong> SI.</p>

        <h4>6. Conclusao final de prova</h4>
        <p>Para \(\alpha\neq1\) e \(\alpha\neq-1\), o sistema e SPD. Para \(\alpha=1\), o sistema e SPI. Para \(\alpha=-1\), o sistema e SI.</p>
      </div>
    `,
    whyLayers: String.raw`
      <div class="why-layers">
        <h4>Camada 1 — Traducao humana</h4>
        <p>Voce nao esta procurando decorar \(\alpha=1\) e \(\alpha=-1\). Voce esta procurando quando o sistema perde pivo.</p>
        <h4>Camada 2 — Conta no quadro</h4>
        <p>O determinante e \(\det(A)=9(\alpha-1)(\alpha+1)\). Ele zera em \(\alpha=1\) e \(\alpha=-1\).</p>
        <h4>Camada 3 — Relacao com SPD/SPI/SI</h4>
        <p>Se \(\det(A)\neq0\), ha pivo em todas as variaveis: SPD. Se \(\det(A)=0\), precisa escalonar o caso para decidir entre SPI e SI.</p>
        <h4>Camada 4 — Erro comum</h4>
        <p>O erro e concluir SPI automaticamente so porque \(\det(A)=0\). No caso \(\alpha=-1\), isso da SI.</p>
        <h4>Camada 5 — Mini-teste</h4>
        <p>Por que \(\alpha=-1\) nao e SPI?</p>
        <p><strong>Resposta:</strong> porque aparece contradicao no escalonamento.</p>
      </div>
    `,
    miniTest: String.raw`
      <div class="mini-test">
        <h4>Mini-teste</h4>
        <p><strong>Por que \(\alpha=-1\) nao e SPI?</strong></p>
        <p>A) Porque \(\det(A)\neq0\). B) Porque aparece contradicao no escalonamento. C) Porque todo sistema com parametro e SI.</p>
        <p><strong>Resposta:</strong> B. \(\det(A)=0\) apenas avisa que precisamos investigar; quem decide entre SPI e SI e o escalonamento/posto.</p>
      </div>
    `,
    difficulty: 3,
    tags: ["parametro", "determinante", "classificacao", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s08-l11-3a-alpha0",
    number: 8,
    origin: "Lista 11 - exercicio 3(a)",
    title: String.raw`Resolver \(\alpha=0\)`,
    statement: String.raw`\[\begin{cases}x_1+4x_2=6\\2x_1-x_2=3\\3x_2+x_3=5\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&4&0&6\\2&-1&0&3\\0&3&1&5\end{array}\right]\]`,
    typeLabel: "Sistema numerico 3x3 com solucao unica.",
    strategy: String.raw`Neste item, estamos no caso \(\alpha=0\). O parametro ja foi substituido; agora a missao e resolver por escalonamento.`,
    determinant: String.raw`Com \(\alpha=0\), \(\det(A)=-9\neq0\).`,
    critical: String.raw`Nao ha valor critico para discutir nesta tela: \(\alpha\) ja foi fixado em \(0\).`,
    care: "A partir daqui nao discuta parametro. Escolha pivo, opere a linha inteira e resolva o sistema numerico.",
    conclusion: String.raw`SPD, com \((x_1,x_2,x_3)=(2,1,2)\).`,
    proofConclusion: String.raw`Para \(\alpha=0\), o escalonamento fornece \((x_1,x_2,x_3)=(2,1,2)\). Como ha pivo para cada variavel, o sistema possui solucao unica; logo, e SPD.`,
    commonError: String.raw`Falar de parametro livre. Neste item, \(\alpha=0\) ja foi substituido; a tarefa agora e escalonar.`,
    parameterStatus: "fixed",
    parameterName: String.raw`\(\alpha\)`,
    parameterValue: "0",
    mission: String.raw`Resolver o caso \(\alpha=0\) por escalonamento e concluir SPD.`,
    firstOperation: String.raw`\(L_2\leftarrow L_2-2L_1\)`,
    firstOperationWrongChoices: [
      String.raw`\(L_2\leftarrow L_2+2L_1\)`,
      String.raw`\(L_3\leftarrow L_3-\alpha L_1\)`,
      "Nao preciso mexer no lado direito da barra."
    ],
    firstOperationFeedbacks: [
      String.raw`Correto. O pivo da primeira coluna e \(1\) na linha 1, e queremos zerar o \(2\) da linha 2: \(2-2\cdot1=0\).`,
      String.raw`Sinal errado. \(L_2+2L_1\) faria \(2+2\cdot1=4\), entao nao zera a primeira entrada da linha 2.`,
      String.raw`Erro de leitura. Neste item \(\alpha=0\), entao nao usamos \(\alpha L_1\) como se ainda fosse discussao simbolica.`,
      "Erro de organizacao. Em matriz aumentada, a operacao vale para a linha inteira, inclusive depois da barra."
    ],
    fullBoardSolution: String.raw`
      <div class="deep-solution">
        <h4>1. Caso cobrado</h4>
        <p>Estamos no caso \(\alpha=0\). O sistema geral ja virou sistema numerico.</p>
        \[
        \begin{cases}
        x_1+4x_2=6\\
        2x_1-x_2=3\\
        3x_2+x_3=5
        \end{cases}
        \]
        <h4>2. Matriz aumentada</h4>
        \[
        \left[\begin{array}{ccc|c}
        1&4&0&6\\
        2&-1&0&3\\
        0&3&1&5
        \end{array}\right]
        \]
        <h4>3. Primeira operacao</h4>
        <p>Objetivo: zerar o \(2\) abaixo do pivo \(1\).</p>
        \[
        L_2\leftarrow L_2-2L_1
        \]
        \[
        [2,-1,0|3]-2[1,4,0|6]=[2,-1,0|3]-[2,8,0|12]=[0,-9,0|-9]
        \]
        \[
        \left[\begin{array}{ccc|c}
        1&4&0&6\\
        0&-9&0&-9\\
        0&3&1&5
        \end{array}\right]
        \]
        <h4>4. Leitura das linhas</h4>
        <p>Da segunda linha: \(-9x_2=-9\), entao \(x_2=1\).</p>
        <p>Da terceira linha: \(3x_2+x_3=5\). Como \(x_2=1\), temos \(3(1)+x_3=5\), entao \(x_3=2\).</p>
        <p>Da primeira linha: \(x_1+4x_2=6\). Como \(x_2=1\), \(x_1+4=6\), entao \(x_1=2\).</p>
        <h4>5. Conclusao de prova</h4>
        <p>Para \(\alpha=0\), obtemos \((x_1,x_2,x_3)=(2,1,2)\). Ha pivo para cada variavel, portanto o sistema possui solucao unica. Logo, e SPD.</p>
      </div>
    `,
    whyLayers: String.raw`
      <div class="why-layers">
        <h4>Camada 1 - Traducao humana</h4>
        <p>Nesta tela nao estamos mais discutindo \(\alpha\). O item ja mandou testar \(\alpha=0\), entao virou conta de escalonamento.</p>
        <h4>Camada 2 - Conta no quadro</h4>
        <p>A primeira operacao natural e \(L_2\leftarrow L_2-2L_1\), porque \(2-2\cdot1=0\).</p>
        <h4>Camada 3 - Relacao com SPD</h4>
        <p>A conta termina com uma solucao unica \((2,1,2)\). Uma solucao unica recebe o nome formal SPD.</p>
        <h4>Camada 4 - Erro comum</h4>
        <p>Tratar este item como discussao simbolica. O parametro ja foi fixado.</p>
        <h4>Camada 5 - Mini-teste</h4>
        <p>Depois de fixar \(\alpha=0\), voce procura valores criticos ou escalona?</p>
        <p><strong>Resposta:</strong> escalona, porque o sistema ja e numerico.</p>
      </div>
    `,
    difficulty: 2,
    tags: ["escalonamento", "classificacao", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s09-l11-3b-alpha1",
    number: 9,
    origin: "Lista 11 - exercicio 3(b)",
    title: String.raw`Caso \(\alpha=1\): SPI`,
    statement: String.raw`\[\begin{cases}x_1+4x_2+x_3=6\\2x_1-x_2+2x_3=3\\x_1+3x_2+x_3=5\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&4&1&6\\2&-1&2&3\\1&3&1&5\end{array}\right]\]`,
    typeLabel: "Sistema numerico singular com infinitas solucoes.",
    strategy: "Escalonar, verificar que nao ha contradicao e identificar variavel livre.",
    determinant: String.raw`Como \(\alpha=1\), \(\det(A)=0\).`,
    critical: String.raw`O caso especial \(\alpha=1\) deve ser investigado na matriz aumentada.`,
    care: "Linha 0=0 sozinha nao prova SPI; precisa faltar pivo e nao ter contradicao.",
    conclusion: String.raw`SPI, com \((x_1,x_2,x_3)=(2-t,1,t)\).`,
    proofConclusion: String.raw`Nao ha contradicao e \(x_3\) fica livre. Logo \(posto(A)=posto(A|b)<3\), entao o sistema e SPI.`,
    commonError: "Confundir linha nula com resposta final.",
    difficulty: 3,
    tags: ["escalonamento", "classificacao", "variavelLivre", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s10-l11-3c-alpha-minus1",
    number: 10,
    origin: "Lista 11 - exercicio 3(c)",
    title: String.raw`Caso \(\alpha=-1\): SI`,
    statement: String.raw`\[\begin{cases}x_1+4x_2-x_3=6\\2x_1-x_2-2x_3=3\\-x_1+3x_2+x_3=5\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&4&-1&6\\2&-1&-2&3\\-1&3&1&5\end{array}\right]\]`,
    typeLabel: "Sistema numerico singular impossivel.",
    strategy: "Escalonar a matriz aumentada e procurar linha contraditoria.",
    determinant: String.raw`Como \(\alpha=-1\), \(\det(A)=0\).`,
    critical: "O determinante zero nao decide sozinho; a ampliada decide.",
    care: "Se aparecer 0 0 0 | c com c diferente de zero, acabou: SI.",
    conclusion: "SI: durante o escalonamento aparece linha contraditoria.",
    proofConclusion: String.raw`A matriz aumentada apresenta uma linha equivalente a \(0=c\), com \(c\neq0\). Logo \(posto(A)\neq posto(A|b)\), entao o sistema e SI.`,
    commonError: "Ver det zero e concluir SPI sem olhar a contradição.",
    difficulty: 3,
    tags: ["escalonamento", "classificacao", "contradicao", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s11-l11-4a-k",
    number: 11,
    origin: "Lista 11 - exercicio 4(a)",
    title: "Discussao com parametro k",
    statement: String.raw`\[\begin{cases}x_1+3x_2+x_3=5\\2x_1+4x_2+3x_3=5\\-x_1+x_2+kx_3=2\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&3&1&5\\2&4&3&5\\-1&1&k&2\end{array}\right]\]`,
    typeLabel: "Sistema 3x3 nao homogeneo com parametro k.",
    strategy: "Calcular det(A), testar k=-3 e classificar.",
    determinant: String.raw`\(\det(A)=-2(k+3)\).`,
    critical: String.raw`Valor critico: \(k=-3\).`,
    care: "Pode nao existir valor que gere SPI; a discussao deve dizer isso.",
    conclusion: String.raw`Se \(k\neq-3\), SPD. Se \(k=-3\), SI. Nao existe k para SPI.`,
    proofConclusion: String.raw`Para \(k\neq-3\), \(\det(A)\neq0\), logo SPD. No caso \(k=-3\), a matriz ampliada e inconsistente; logo SI.`,
    commonError: "Forcar um caso SPI que nao existe.",
    difficulty: 3,
    tags: ["parametro", "determinante", "classificacao", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s12-l11-4b-k0",
    number: 12,
    origin: "Lista 11 - exercicio 4(b)",
    title: "Resolver k=0",
    statement: String.raw`\[\begin{cases}x_1+3x_2+x_3=5\\2x_1+4x_2+3x_3=5\\-x_1+x_2=2\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&3&1&5\\2&4&3&5\\-1&1&0&2\end{array}\right]\]`,
    typeLabel: "Sistema numerico 3x3.",
    strategy: "Escalonar a matriz aumentada e concluir a solucao.",
    determinant: String.raw`Com \(k=0\), \(\det(A)=-6\neq0\).`,
    critical: "Nao ha parametro a discutir depois de fixar k=0.",
    care: "Resolva ate a solucao; nao basta dizer SPD.",
    conclusion: String.raw`SPD, com \((x_1,x_2,x_3)=(0,2,-1)\).`,
    proofConclusion: String.raw`Escalonando, obtemos \(x_1=0\), \(x_2=2\), \(x_3=-1\). Como ha pivo em todas as variaveis, SPD.`,
    commonError: "Parar em det diferente de zero quando o enunciado pediu resolver.",
    difficulty: 2,
    tags: ["escalonamento", "classificacao", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s13-l11-5a-alpha-hom",
    number: 13,
    origin: "Lista 11 - exercicio 5(a)",
    title: String.raw`Homogeneo: valor de \(\alpha\)`,
    statement: String.raw`\[\begin{pmatrix}2&1&1\\1&\alpha&1\\1&-1&2\end{pmatrix}\vec{x}=\begin{pmatrix}0\\0\\0\end{pmatrix}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}2&1&1&0\\1&\alpha&1&0\\1&-1&2&0\end{array}\right]\]`,
    typeLabel: String.raw`Sistema homogeneo 3x3 com parametro \(\alpha\).`,
    strategy: "Calcular determinante e zerar para obter infinitas solucoes.",
    determinant: String.raw`\(\det(A)=3\alpha\).`,
    critical: String.raw`Infinitas solucoes quando \(\alpha=0\).`,
    care: "Em homogeneo, det zero significa solucao nao trivial; nao e SI.",
    conclusion: String.raw`Para \(\alpha=0\), ha infinitas solucoes. Para \(\alpha\neq0\), so trivial.`,
    proofConclusion: String.raw`Como o sistema e homogeneo, a trivial sempre existe. Para infinitas solucoes, precisamos \(\det(A)=0\), entao \(3\alpha=0\Rightarrow\alpha=0\).`,
    commonError: "Esquecer que o vetor zero sempre resolve.",
    tags: ["homogeneo", "parametro", "determinante", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s14-l11-5bc-alpha0",
    number: 14,
    origin: "Lista 11 - exercicio 5(b)(c)",
    title: "Homogeneo singular: solucao geral",
    statement: String.raw`\[\begin{cases}2x_1+x_2+x_3=0\\x_1+x_3=0\\x_1-x_2+2x_3=0\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}2&1&1&0\\1&0&1&0\\1&-1&2&0\end{array}\right]\]`,
    typeLabel: "Sistema homogeneo singular.",
    strategy: "Escalonar, escolher variavel livre e escrever solucao geral.",
    determinant: String.raw`\(\det(A)=0\) no caso \(\alpha=0\).`,
    critical: "A variavel livre gera familia de solucoes.",
    care: "Solucao nao trivial nao substitui a trivial; ela aparece alem da trivial.",
    conclusion: String.raw`\((x_1,x_2,x_3)=t(-1,1,1)\). Para \(t=1\), \((-1,1,1)\).`,
    proofConclusion: String.raw`Com \(t=x_3\), temos \(x_1=-t\), \(x_2=t\), \(x_3=t\). Logo a solucao geral e \(t(-1,1,1)\), incluindo a nao trivial \((-1,1,1)\).`,
    commonError: "Fazer a variavel livre igual a zero e achar que nao ha nao trivial.",
    difficulty: 3,
    tags: ["homogeneo", "variavelLivre", "escalonamento", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s15-l11-6-m-hom",
    number: 15,
    origin: "Lista 11 - exercicio 6",
    title: "Homogeneo com parametro m",
    statement: String.raw`\[\begin{pmatrix}1&2&2\\m-1&1&m-2\\m+1&m-1&2\end{pmatrix}\vec{x}=\begin{pmatrix}0\\0\\0\end{pmatrix}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&2&2&0\\m-1&1&m-2&0\\m+1&m-1&2&0\end{array}\right]\]`,
    typeLabel: "Sistema homogeneo 3x3 com parametro m.",
    strategy: "Usar det(A) para identificar quando existe apenas a trivial.",
    determinant: String.raw`\(\det(A)=3m(m-3)\).`,
    critical: String.raw`So trivial quando \(m\neq0\) e \(m\neq3\).`,
    care: "A pergunta pede apenas a trivial, entao queremos determinante diferente de zero.",
    conclusion: String.raw`Apenas a solucao trivial para \(m\neq0\) e \(m\neq3\). Para \(m=0\) ou \(m=3\), existem nao triviais.`,
    proofConclusion: String.raw`No homogeneo quadrado, \(\det(A)\neq0\) garante apenas a trivial. Como \(\det(A)=3m(m-3)\), isso ocorre quando \(m\neq0,3\).`,
    commonError: "Responder os valores que zeram o determinante quando a pergunta pede so trivial.",
    difficulty: 3,
    tags: ["homogeneo", "parametro", "determinante", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s16-der-2x2-spi",
    number: 16,
    origin: "Derivado Lista 11 - 2x2 com SPI",
    originType: "Derivado",
    title: "Derivado: parametro com SPI",
    statement: String.raw`\[\begin{cases}\lambda x+y=2\\2x+2y=4\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{cc|c}\lambda&1&2\\2&2&4\end{array}\right]\]`,
    typeLabel: "Sistema 2x2 nao homogeneo com parametro lambda.",
    strategy: "Calcular det(A) e testar o caso lambda=1.",
    determinant: String.raw`\(\det(A)=2(\lambda-1)\).`,
    critical: String.raw`Se \(\lambda=1\), as equacoes ficam dependentes e consistentes.`,
    care: "Compare com sistema 17: mesmo det, lado direito diferente muda SPI para SI.",
    conclusion: String.raw`Se \(\lambda\neq1\), SPD. Se \(\lambda=1\), SPI.`,
    proofConclusion: String.raw`Para \(\lambda\neq1\), SPD. Para \(\lambda=1\), as linhas sao equivalentes e nao ha contradicao; sobra variavel livre, logo SPI.`,
    commonError: "Achar que todo det zero vira SI.",
    tags: ["parametro", "classificacao", "variavelLivre", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s17-der-2x2-si",
    number: 17,
    origin: "Derivado Lista 11 - 2x2 com SI",
    originType: "Derivado",
    title: "Derivado: parametro com SI",
    statement: String.raw`\[\begin{cases}\lambda x+y=2\\2x+2y=5\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{cc|c}\lambda&1&2\\2&2&5\end{array}\right]\]`,
    typeLabel: "Sistema 2x2 nao homogeneo com parametro lambda.",
    strategy: "Calcular det(A) e testar lambda=1 na matriz ampliada.",
    determinant: String.raw`\(\det(A)=2(\lambda-1)\).`,
    critical: String.raw`Se \(\lambda=1\), aparece inconsistencia.`,
    care: "det zero em nao homogeneo pode ser SPI ou SI; o lado direito decide.",
    conclusion: String.raw`Se \(\lambda\neq1\), SPD. Se \(\lambda=1\), SI.`,
    proofConclusion: String.raw`Para \(\lambda\neq1\), SPD. Para \(\lambda=1\), as equacoes teriam lados direitos incompatíveis; logo SI.`,
    commonError: "Concluir SPI so porque o determinante zerou.",
    tags: ["parametro", "classificacao", "contradicao", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s18-der-hom-lambda",
    number: 18,
    origin: "Derivado Lista 11 - homogeneo",
    originType: "Derivado",
    title: "Derivado: homogeneo com lambda",
    statement: String.raw`\[\begin{cases}x+y+z=0\\2x+3y+z=0\\x+2y+\lambda z=0\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&1&1&0\\2&3&1&0\\1&2&\lambda&0\end{array}\right]\]`,
    typeLabel: "Sistema homogeneo 3x3 com parametro lambda.",
    strategy: "Usar determinante para separar apenas trivial de nao trivial.",
    determinant: String.raw`\(\det(A)=\lambda\).`,
    critical: String.raw`Se \(\lambda=0\), ha infinitas solucoes.`,
    care: "Homogeneo com det zero tem variavel livre e solucao nao trivial.",
    conclusion: String.raw`Se \(\lambda\neq0\), so trivial. Se \(\lambda=0\), \((x,y,z)=t(-2,1,1)\).`,
    proofConclusion: String.raw`Quando \(\lambda=0\), falta pivo e ha variavel livre. Logo alem da trivial existem solucoes nao triviais como \((-2,1,1)\).`,
    commonError: "Confundir vetor resultado zero com matriz de coeficientes zero.",
    difficulty: 3,
    tags: ["homogeneo", "parametro", "variavelLivre", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s19-der-param-spi",
    number: 19,
    origin: "Derivado Lista 11 - parametro com SPI",
    originType: "Derivado",
    title: "Derivado: det zero gerando SPI",
    statement: String.raw`\[\begin{cases}x+y+z=1\\2x+3y+z=2\\x+2y+kz=1\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&1&1&1\\2&3&1&2\\1&2&k&1\end{array}\right]\]`,
    typeLabel: "Sistema 3x3 nao homogeneo com parametro k.",
    strategy: "Calcular det(A), testar k=0 e comparar posto.",
    determinant: String.raw`\(\det(A)=k\).`,
    critical: String.raw`Se \(k=0\), o caso singular e consistente.`,
    care: "Este e o exemplo em que det zero realmente vira SPI, mas so depois de verificar consistencia.",
    conclusion: String.raw`Se \(k\neq0\), SPD. Se \(k=0\), SPI, com \((x,y,z)=(1-2t,t,t)\).`,
    proofConclusion: String.raw`Para \(k=0\), nao aparece contradicao e sobra variavel livre; logo \(posto(A)=posto(A|b)<3\), entao SPI.`,
    commonError: "Acertar k=0 mas nao justificar posto/variavel livre.",
    difficulty: 3,
    tags: ["parametro", "classificacao", "variavelLivre", "conclusao", "lista11-total"]
  }),
  lista11System({
    id: "s20-der-param-si",
    number: 20,
    origin: "Derivado Lista 11 - parametro com SI",
    originType: "Derivado",
    title: "Derivado: det zero gerando SI",
    statement: String.raw`\[\begin{cases}x+y+z=1\\2x+3y+z=2\\x+2y+kz=3\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&1&1&1\\2&3&1&2\\1&2&k&3\end{array}\right]\]`,
    typeLabel: "Sistema 3x3 nao homogeneo com parametro k.",
    strategy: "Calcular det(A), testar k=0 e procurar contradicao.",
    determinant: String.raw`\(\det(A)=k\).`,
    critical: String.raw`Se \(k=0\), o caso singular fica inconsistente.`,
    care: "Compare com sistema 19: mesma matriz de coeficientes, outro lado direito.",
    conclusion: String.raw`Se \(k\neq0\), SPD. Se \(k=0\), SI.`,
    proofConclusion: String.raw`Para \(k=0\), a matriz ampliada produz linha contraditoria. Assim \(posto(A)\neq posto(A|b)\), logo SI.`,
    commonError: "Concluir SPI por copiar o sistema 19 sem conferir o lado direito.",
    difficulty: 3,
    tags: ["parametro", "classificacao", "contradicao", "conclusao", "lista11-total"]
  })
];

const BLANK_RITUAL = [
  "O que a questao pede?",
  "Tem parametro?",
  "E homogeneo?",
  "Qual estrategia?",
  "Qual valor zera algo?",
  "Testei o caso especial?",
  "Interpretei a matriz?",
  "Escrevi conclusao?"
];

const BLANK_AXIS_LABELS = {
  leitura: "Leitura do enunciado",
  plano: "Plano",
  execucao: "Execucao",
  interpretacao: "Interpretacao",
  conclusao: "Conclusao"
};

const BLANK_STUCK_REASONS = [
  "Nao entendi o enunciado",
  "Nao soube comecar",
  "Travei no escalonamento",
  "Esqueci caso especial",
  "Nao soube classificar",
  "Nao soube escrever conclusao"
];

const BLANK_SHEET_CASES = [
  {
    id: "blank-l11-ex2",
    origin: "Lista 11 - exercicio 2",
    title: "Exercicio 2 - parametro m",
    timeMinutes: 12,
    statement: String.raw`\[\begin{pmatrix}m&1&1\\2&-1&2\\4&-1&1\end{pmatrix}\vec{x}=\begin{pmatrix}2\\5\\6\end{pmatrix}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}m&1&1&2\\2&-1&2&5\\4&-1&1&6\end{array}\right]\]`,
    examGoal: String.raw`Determinar quando ha solucao unica e resolver o caso \(m=2\).`,
    finalModel: String.raw`Como \(\det(A)=m+8\), o sistema tem solucao unica para \(m\neq-8\). No caso \(m=2\), escalonando, obtemos \((x_1,x_2,x_3)=(1,-1,1)\).`,
    stages: [
      {
        key: "pedido",
        axis: "leitura",
        title: "Entender o pedido",
        prompt: "O que a questao esta pedindo antes de qualquer conta?",
        must: [["solucao unica", "unica"], ["m"], ["m=2", "m 2", "resolver"]],
        expected: "Ela pede duas coisas: discutir para quais valores de m existe solucao unica e resolver quando m=2.",
        trap: "Sair escalonando m simbolico sem perceber que o item tambem pede um caso numerico.",
        proof: "Leitura de prova: primeiro decido a unicidade por determinante; depois substituo m=2 e resolvo.",
        next: "Identifique o tipo de sistema e o papel do parametro.",
        helps: [
          "Leia o verbo do enunciado antes de calcular.",
          "Ha uma letra m dentro da matriz. Isso muda a classificacao.",
          "A questao mistura discussao de m com resolucao para m=2.",
          "Escreva: 'preciso achar m para solucao unica e depois resolver m=2'.",
          "Proximo passo aceitavel: calcular det(A) para discutir unicidade."
        ]
      },
      {
        key: "tipo",
        axis: "plano",
        title: "Identificar o tipo",
        prompt: "Que tipo de sistema e esse?",
        must: [["parametro", "m"], ["nao homogeneo", "termo independente", "b"]],
        expected: "E um sistema 3x3 nao homogeneo com parametro m na matriz dos coeficientes.",
        trap: "Tratar como homogeneo. O vetor do lado direito e (2,5,6), nao zero.",
        proof: "Sistema nao homogeneo: \(A\vec{x}=\vec{b}\), com \(\vec{b}\neq\vec{0}\).",
        next: "Escolha a estrategia para solucao unica.",
        helps: [
          "Olhe para o lado direito.",
          "Se o lado direito nao e zero, nao e homogeneo.",
          "A letra m esta nos coeficientes, entao e parametro.",
          "Classifique como 3x3 nao homogeneo com parametro m.",
          "Proximo passo: usar determinante da matriz dos coeficientes."
        ]
      },
      {
        key: "estrategia",
        axis: "plano",
        title: "Escolher estrategia",
        prompt: "Qual e a estrategia para decidir solucao unica?",
        must: [["det", "determinante"], ["diferente de zero", "nao zero", "!= 0", "neq 0"]],
        expected: "Em sistema quadrado, solucao unica ocorre quando det(A) e diferente de zero.",
        trap: "Escalonar tudo sem usar o atalho legitimo do determinante para unicidade.",
        proof: String.raw`Se \(\det(A)\neq0\), \(A\) e inversivel e ha SPD.`,
        next: "Ache o valor que derruba o determinante.",
        helps: [
          "Sistema quadrado 3x3 permite olhar determinante para unicidade.",
          "Solucao unica combina com det(A) diferente de zero.",
          "O objeto certo e a matriz dos coeficientes, nao a coluna b.",
          "Calcule/aceite: det(A)=m+8.",
          "Separe m=-8 do caso m diferente de -8."
        ]
      },
      {
        key: "perigo",
        axis: "execucao",
        title: "Achar ponto perigoso",
        prompt: "Qual valor de m precisa ser separado?",
        must: [["m"], ["-8"]],
        expected: String.raw`Como \(\det(A)=m+8\), o valor critico vem de \(m+8=0\Rightarrow m=-8\).`,
        trap: "Responder m=-8 como solucao unica. Ele e justamente o valor que zera o determinante.",
        proof: String.raw`Caso geral: \(m\neq-8\). Caso especial: \(m=-8\).`,
        next: "Agora resolva o caso numerico pedido, m=2.",
        helps: [
          "Procure quando o determinante zera.",
          "A expressao perigosa e m+8.",
          "Resolva m+8=0.",
          "m=-8 e o caso especial; fora dele ha unicidade.",
          "Proximo: substituir m=2 na matriz e escalonar."
        ]
      },
      {
        key: "executar",
        axis: "execucao",
        title: "Executar m=2",
        prompt: "Depois de substituir m=2, o que a conta deve produzir?",
        must: [["1"], ["-1"], ["1"]],
        expected: String.raw`Para \(m=2\), o escalonamento fornece \((x_1,x_2,x_3)=(1,-1,1)\).`,
        trap: "Parar no det(A)=10. Isso prova unicidade, mas nao resolve o item que pediu a solucao.",
        proof: String.raw`Com \(m=2\), \(\det(A)=10\neq0\), mas ainda escrevemos a solucao: \((1,-1,1)\).`,
        next: "Interprete a classificacao do caso m=2.",
        helps: [
          "m=2 transforma o sistema em numerico.",
          "Nao basta dizer que tem solucao unica.",
          "A solucao esperada tem tres coordenadas.",
          "Escalonando, chega em x1=1, x2=-1, x3=1.",
          "Use isso na conclusao final."
        ]
      },
      {
        key: "interpretar",
        axis: "interpretacao",
        title: "Interpretar",
        prompt: "Que classificacao formal aparece para m=2?",
        must: [["spd", "possivel determinado", "solucao unica"]],
        expected: "Para m=2 ha pivo para cada variavel, entao e SPD.",
        trap: "Dizer apenas 'deu certo'. A prova quer o nome formal e o motivo.",
        proof: "SPD porque existe exatamente uma solucao.",
        next: "Escreva a conclusao final por casos.",
        helps: [
          "Uma unica solucao tem sigla formal.",
          "SPD significa Sistema Possivel Determinado.",
          "Pivo em todas as variaveis implica SPD.",
          "Para m=2, a solucao unica e (1,-1,1).",
          "Agora escreva a conclusao completa."
        ]
      },
      {
        key: "concluir",
        axis: "conclusao",
        title: "Conclusao de prova",
        prompt: "Escreva a conclusao final como voce colocaria na prova.",
        must: [["m"], ["-8"], ["diferente", "neq", "!="], ["1"], ["-1"]],
        expected: String.raw`Para \(m\neq-8\), o sistema possui solucao unica. Para \(m=2\), \((x_1,x_2,x_3)=(1,-1,1)\).`,
        trap: "Nao citar o caso geral ou esquecer a solucao do caso m=2.",
        proof: String.raw`Conclusao: \(m\neq-8\Rightarrow\) SPD. Para \(m=2\), \(S=\{(1,-1,1)\}\).`,
        next: "Feche a questao ou tente outra em folha em branco.",
        helps: [
          "Conclusao de prova precisa ter caso geral e caso pedido.",
          "Inclua m diferente de -8.",
          "Inclua a solucao para m=2.",
          "Modelo: para m neq -8 ha solucao unica; para m=2, S={(1,-1,1)}.",
          "Resolucao parcial liberada: copie o modelo e depois refaca sem ajuda."
        ]
      }
    ]
  },
  {
    id: "blank-l11-ex3",
    origin: "Lista 11 - exercicio 3",
    title: String.raw`Exercicio 3 - parametro \(\alpha\)`,
    timeMinutes: 12,
    statement: String.raw`\[\begin{cases}x_1+4x_2+\alpha x_3=6\\2x_1-x_2+2\alpha x_3=3\\\alpha x_1+3x_2+x_3=5\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&4&\alpha&6\\2&-1&2\alpha&3\\\alpha&3&1&5\end{array}\right]\]`,
    examGoal: String.raw`Verificar por escalonamento os casos \(\alpha=0\), \(\alpha=1\) e \(\alpha=-1\).`,
    finalModel: String.raw`O determinante e \(9(\alpha-1)(\alpha+1)\). Fora de \(\alpha=\pm1\), SPD. No item: \(\alpha=0\) da \((2,1,2)\), \(\alpha=1\) da SPI com \((2-t,1,t)\), \(\alpha=-1\) da SI.`,
    stages: [
      {
        key: "pedido",
        axis: "leitura",
        title: "Entender o pedido",
        prompt: "O que a questao quer que voce verifique?",
        must: [["alpha", "alfa"], ["0"], ["1"], ["-1"]],
        expected: String.raw`Ela pede testar os casos \(\alpha=0\), \(\alpha=1\) e \(\alpha=-1\), nao apenas decorar valores criticos.`,
        trap: "Responder so 'valores criticos' e esquecer o caso alpha=0.",
        proof: String.raw`Na prova: 'Analisarei separadamente \(\alpha=0\), \(\alpha=1\) e \(\alpha=-1\).'`,
        next: "Descubra de onde saem os casos criticos.",
        helps: [
          "Veja quais valores o enunciado destacou.",
          "O item quer verificacao por casos.",
          "Alpha zero e caso numerico; alpha 1 e -1 sao singulares.",
          "Escreva: vou testar alpha=0, alpha=1 e alpha=-1.",
          "Proximo: relacione isso ao determinante."
        ]
      },
      {
        key: "estrategia",
        axis: "plano",
        title: "Estrategia",
        prompt: "Como descobrir os valores que mudam a classificacao?",
        must: [["det", "determinante"], ["alpha", "alfa"]],
        expected: String.raw`Use o determinante da matriz dos coeficientes: \(\det(A)=9(\alpha-1)(\alpha+1)\).`,
        trap: "Achar que alpha=1 e alpha=-1 sairam do nada.",
        proof: String.raw`\(\det(A)=0\Rightarrow \alpha=1\) ou \(\alpha=-1\).`,
        next: "Separe caso geral e casos especiais.",
        helps: [
          "Mudanca de classificacao em 3x3 quadrado costuma aparecer quando det zera.",
          "O determinante ja foi trabalhado no Quadro.",
          "A expressao fatorada mostra dois fatores.",
          "det(A)=9(alpha-1)(alpha+1).",
          "Valores criticos: alpha=1 e alpha=-1."
        ]
      },
      {
        key: "perigo",
        axis: "plano",
        title: "Ponto perigoso",
        prompt: "O que podemos concluir quando alpha nao e 1 nem -1?",
        must: [["spd", "possivel determinado", "solucao unica"], ["det", "diferente", "neq", "!="]],
        expected: String.raw`Se \(\alpha\neq1\) e \(\alpha\neq-1\), entao \(\det(A)\neq0\), logo SPD.`,
        trap: "Continuar discutindo posto sem necessidade no caso det diferente de zero.",
        proof: String.raw`Caso geral: \(\alpha\neq1,-1\Rightarrow\det(A)\neq0\Rightarrow SPD.`,
        next: "Agora teste os casos especiais, um por um.",
        helps: [
          "Fora dos zeros do determinante, a matriz tem pivos suficientes.",
          "Det diferente de zero em sistema quadrado nao homogeneo da solucao unica.",
          "O nome formal e SPD.",
          "Escreva alpha neq 1 e alpha neq -1 implica SPD.",
          "Proximo: alpha=1 nao pode ser decidido so pelo determinante."
        ]
      },
      {
        key: "alpha0",
        axis: "execucao",
        title: "Caso alpha=0",
        prompt: "O que acontece no caso alpha=0?",
        must: [["2"], ["1"], ["2"], ["spd", "solucao unica", "possivel determinado"]],
        expected: String.raw`Para \(\alpha=0\), o sistema e SPD e a solucao e \((2,1,2)\).`,
        trap: "Confundir alpha=0 com valor critico. Aqui det(A)=-9, entao ha solucao unica.",
        proof: String.raw`Conclusao do caso: \(\alpha=0\Rightarrow S=\{(2,1,2)\}\).`,
        next: "Teste alpha=1 e procure variavel livre.",
        helps: [
          "Substitua alpha por zero no sistema.",
          "Com alpha=0, o determinante nao zera.",
          "O escalonamento da x1=2, x2=1, x3=2.",
          "Classificacao: SPD.",
          "Use isso como primeiro caso da conclusao."
        ]
      },
      {
        key: "alpha1",
        axis: "interpretacao",
        title: "Caso alpha=1",
        prompt: "Por que alpha=1 gera SPI?",
        must: [["spi", "possivel indeterminado", "infinitas"], ["livre", "x3", "parametro"], ["sem contradicao", "nao ha contradicao"]],
        expected: String.raw`Ao escalonar \(\alpha=1\), nao aparece contradicao e \(x_3\) fica livre. Logo SPI.`,
        trap: "Dizer SPI so porque det(A)=0. O motivo real e nao haver contradicao e sobrar variavel livre.",
        proof: String.raw`Para \(\alpha=1\): \((x_1,x_2,x_3)=(2-t,1,t)\).`,
        next: "Teste alpha=-1 e procure contradicao.",
        helps: [
          "det zero nao decide SPI sozinho.",
          "No caso alpha=1, duas linhas dizem x2=1.",
          "Nao ha linha 0=numero nao zero.",
          "Sobra x3 sem pivo, entao x3=t.",
          "Conclusao: SPI, com (2-t,1,t)."
        ]
      },
      {
        key: "alphaMinus1",
        axis: "interpretacao",
        title: "Caso alpha=-1",
        prompt: "Por que alpha=-1 gera SI?",
        must: [["si", "impossivel", "sem solucao"], ["contradicao", "0=7", "x2"]],
        expected: String.raw`Para \(\alpha=-1\), o escalonamento gera contradicao: a mesma variavel teria valores incompatíveis. Logo SI.`,
        trap: "Chamar de SPI por causa de det(A)=0.",
        proof: String.raw`Como aparece contradicao, \(posto(A)\neq posto(A|b)\), logo \(S=\varnothing\).`,
        next: "Escreva a conclusao final por casos.",
        helps: [
          "Compare as linhas depois de zerar a primeira coluna.",
          "Uma linha implica x2=1; outra implica x2=11/7.",
          "Isso e contradicao.",
          "Contradicao significa SI, nao SPI.",
          "Use S vazio na conclusao."
        ]
      },
      {
        key: "concluir",
        axis: "conclusao",
        title: "Conclusao de prova",
        prompt: "Escreva a conclusao completa do exercicio 3.",
        must: [["alpha", "alfa"], ["0"], ["2"], ["1"], ["spi"], ["-1"], ["si"]],
        expected: String.raw`Para \(\alpha=0\), SPD com \((2,1,2)\). Para \(\alpha=1\), SPI. Para \(\alpha=-1\), SI. No geral, fora de \(\pm1\), SPD.`,
        trap: "Misturar alpha=0 com os casos singulares ou esquecer a justificativa.",
        proof: String.raw`Modelo: \(\alpha=0\Rightarrow S=\{(2,1,2)\}\); \(\alpha=1\Rightarrow SPI\); \(\alpha=-1\Rightarrow SI\).`,
        next: "Feche a questao ou treine continuacao.",
        helps: [
          "A conclusao precisa listar cada caso.",
          "Inclua alpha=0 com a solucao.",
          "Inclua alpha=1 como SPI.",
          "Inclua alpha=-1 como SI.",
          "Resolucao parcial liberada: copie o modelo e refaca sem ajuda depois."
        ]
      }
    ]
  },
  {
    id: "blank-l11-ex4",
    origin: "Lista 11 - exercicio 4",
    title: "Exercicio 4 - parametro k",
    timeMinutes: 12,
    statement: String.raw`\[\begin{cases}x_1+3x_2+x_3=5\\2x_1+4x_2+3x_3=5\\-x_1+x_2+kx_3=2\end{cases}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&3&1&5\\2&4&3&5\\-1&1&k&2\end{array}\right]\]`,
    examGoal: String.raw`Discutir o sistema em funcao de \(k\) e resolver para \(k=0\).`,
    finalModel: String.raw`\(\det(A)=-2(k+3)\). Se \(k\neq-3\), SPD. Se \(k=-3\), SI. Nao ha k para SPI. Para \(k=0\), \((0,2,-1)\).`,
    stages: [
      {
        key: "pedido",
        axis: "leitura",
        title: "Entender o pedido",
        prompt: "O que voce precisa descobrir nessa questao?",
        must: [["k"], ["classificar", "discutir", "spd", "spi", "si"], ["k=0", "0"]],
        expected: "Discutir os valores de k e resolver o caso k=0.",
        trap: "Resolver so k=0 e esquecer a discussao por valores de k.",
        proof: "Primeiro classifico por k; depois substituo k=0 para obter a solucao.",
        next: "Ache o valor critico de k.",
        helps: [
          "Leia se o item pede discutir ou resolver.",
          "A letra k esta na matriz dos coeficientes.",
          "Ha uma discussao geral e um caso k=0.",
          "Escreva: discutir k e resolver k=0.",
          "Proximo: det(A)."
        ]
      },
      {
        key: "critico",
        axis: "plano",
        title: "Valor critico",
        prompt: "Qual valor de k precisa ser separado?",
        must: [["k"], ["-3"]],
        expected: String.raw`\(\det(A)=-2(k+3)\). O valor critico vem de \(k+3=0\Rightarrow k=-3\).`,
        trap: "Achar que k=-3 automaticamente vira SPI.",
        proof: String.raw`Caso geral: \(k\neq-3\). Caso especial: \(k=-3\).`,
        next: "Classifique o caso geral.",
        helps: [
          "O perigo aparece quando o determinante zera.",
          "A expressao e k+3.",
          "Resolva k+3=0.",
          "O caso especial e k=-3.",
          "Agora separe k diferente de -3."
        ]
      },
      {
        key: "geral",
        axis: "interpretacao",
        title: "Caso geral",
        prompt: "O que acontece quando k nao e -3?",
        must: [["spd", "solucao unica", "possivel determinado"], ["det", "diferente", "neq", "!="]],
        expected: String.raw`Se \(k\neq-3\), \(\det(A)\neq0\), entao SPD.`,
        trap: "Continuar procurando SPI no caso em que a matriz e invertivel.",
        proof: String.raw`Para \(k\neq-3\), o sistema e possivel determinado.`,
        next: "Teste o caso k=-3.",
        helps: [
          "Fora do valor critico, o determinante nao zera.",
          "Det diferente de zero em 3x3 quadrado da solucao unica.",
          "Nome formal: SPD.",
          "Escreva k neq -3 implica SPD.",
          "Agora teste k=-3."
        ]
      },
      {
        key: "especial",
        axis: "interpretacao",
        title: "Caso especial",
        prompt: "Por que k=-3 nao gera SPI?",
        must: [["si", "impossivel", "sem solucao"], ["contradicao", "0=", "inconsistente"]],
        expected: String.raw`Com \(k=-3\), a matriz aumentada fica inconsistente. Aparece contradicao; logo SI.`,
        trap: "det(A)=0 nao garante SPI em sistema nao homogeneo.",
        proof: String.raw`Para \(k=-3\), \(posto(A)\neq posto(A|b)\), portanto SI. Nao ha valor de k que gere SPI.`,
        next: "Resolva o caso k=0.",
        helps: [
          "Det zero so manda investigar.",
          "Sistema nao homogeneo pode virar SI.",
          "No caso k=-3, aparece contradicao.",
          "Contradicao significa SI.",
          "Nao existe k para SPI neste exercicio."
        ]
      },
      {
        key: "k0",
        axis: "execucao",
        title: "Caso k=0",
        prompt: "Qual e a solucao quando k=0?",
        must: [["0"], ["2"], ["-1"]],
        expected: String.raw`Para \(k=0\), a solucao e \((x_1,x_2,x_3)=(0,2,-1)\).`,
        trap: "Dizer apenas SPD. O item pede a solucao.",
        proof: String.raw`Com \(k=0\), \(S=\{(0,2,-1)\}\).`,
        next: "Escreva a conclusao completa.",
        helps: [
          "Substitua k por zero.",
          "Como k=0 nao e -3, ha solucao unica.",
          "Mas a prova pediu resolver.",
          "Escalonando, x1=0, x2=2, x3=-1.",
          "Inclua isso na conclusao."
        ]
      },
      {
        key: "concluir",
        axis: "conclusao",
        title: "Conclusao",
        prompt: "Escreva a conclusao de prova do exercicio 4.",
        must: [["k"], ["-3"], ["spd"], ["si"], ["nao ha", "nenhum", "sem"], ["spi"], ["0"], ["2"], ["-1"]],
        expected: String.raw`Se \(k\neq-3\), SPD. Se \(k=-3\), SI. Nao ha k para SPI. Para \(k=0\), \((0,2,-1)\).`,
        trap: "Forcar SPI porque a questao pergunta classificacao por parametros.",
        proof: String.raw`Conclusao organizada por casos: \(k\neq-3\Rightarrow SPD\); \(k=-3\Rightarrow SI\); para \(k=0\), \(S=\{(0,2,-1)\}\).`,
        next: "Feche a questao.",
        helps: [
          "Conclusao precisa dizer todos os casos.",
          "Inclua k diferente de -3.",
          "Inclua k=-3 como SI.",
          "Diga explicitamente que nao ha k para SPI.",
          "Inclua a solucao do caso k=0."
        ]
      }
    ]
  },
  {
    id: "blank-l11-ex5",
    origin: "Lista 11 - exercicio 5",
    title: String.raw`Exercicio 5 - homogeneo com \(\alpha\)`,
    timeMinutes: 8,
    statement: String.raw`\[\begin{pmatrix}2&1&1\\1&\alpha&1\\1&-1&2\end{pmatrix}\vec{x}=\vec{0}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}2&1&1&0\\1&\alpha&1&0\\1&-1&2&0\end{array}\right]\]`,
    examGoal: String.raw`Achar \(\alpha\) para infinitas solucoes e uma solucao nao trivial.`,
    finalModel: String.raw`Como \(\det(A)=3\alpha\), ha infinitas solucoes quando \(\alpha=0\). A solucao geral e \(t(-1,1,1)\), e uma particular nao trivial e \((-1,1,1)\).`,
    stages: [
      {
        key: "tipo",
        axis: "leitura",
        title: "Reconhecer homogeneo",
        prompt: "Qual e a primeira observacao importante?",
        must: [["homogeneo"], ["trivial", "zero"]],
        expected: "E homogeneo, entao a solucao trivial sempre existe.",
        trap: "Dizer que pode ser impossivel. Sistema homogeneo nunca e SI.",
        proof: String.raw`Como \(A\vec{x}=\vec{0}\), \(\vec{x}=\vec{0}\) sempre resolve.`,
        next: "Use o determinante para descobrir nao triviais.",
        helps: [
          "Olhe para o lado direito.",
          "O vetor do lado direito e zero.",
          "Isso define sistema homogeneo.",
          "Todo homogeneo tem pelo menos a solucao trivial.",
          "Agora procure quando existem outras solucoes."
        ]
      },
      {
        key: "det",
        axis: "plano",
        title: "Determinante",
        prompt: "Quando aparecem infinitas solucoes?",
        must: [["det", "determinante"], ["alpha", "alfa"], ["0"]],
        expected: String.raw`\(\det(A)=3\alpha\). Para existir nao trivial, precisamos \(\det(A)=0\), entao \(\alpha=0\).`,
        trap: "Responder alpha diferente de zero, que e quando so existe a trivial.",
        proof: String.raw`\(\alpha=0\Rightarrow\) falta pivo \(\Rightarrow\) variavel livre.`,
        next: "Escreva a solucao geral.",
        helps: [
          "Homogeneo quadrado usa det para trivial/nao trivial.",
          "So trivial quando det diferente de zero.",
          "Nao trivial aparece quando det zera.",
          "det(A)=3alpha, logo alpha=0.",
          "Agora escalone alpha=0."
        ]
      },
      {
        key: "solucao",
        axis: "execucao",
        title: "Solucao geral",
        prompt: "Qual e a solucao geral quando alpha=0?",
        must: [["t"], ["-1"], ["1"], ["1"]],
        expected: String.raw`A solucao geral e \(t(-1,1,1)\).`,
        trap: "Escolher t=0 e achar que nao existe solucao nao trivial.",
        proof: String.raw`Com \(t=1\), obtemos a particular \((-1,1,1)\).`,
        next: "Interprete trivial e nao trivial.",
        helps: [
          "No caso singular sobra variavel livre.",
          "Chame a variavel livre de t.",
          "O escalonamento leva a x1=-t, x2=t, x3=t.",
          "Logo (x1,x2,x3)=t(-1,1,1).",
          "Para particular nao trivial, use t=1."
        ]
      },
      {
        key: "concluir",
        axis: "conclusao",
        title: "Conclusao",
        prompt: "Escreva a conclusao do exercicio 5.",
        must: [["alpha", "alfa"], ["0"], ["trivial"], ["t"], ["-1"], ["1"], ["particular"]],
        expected: String.raw`Para \(\alpha=0\), ha infinitas solucoes \(t(-1,1,1)\). Uma solucao nao trivial e \((-1,1,1)\). Para \(\alpha\neq0\), apenas a trivial.`,
        trap: "Nao mencionar a trivial ou nao dar uma particular nao trivial.",
        proof: String.raw`Modelo: \(\alpha=0\Rightarrow S=\{t(-1,1,1):t\in\mathbb{R}\}\), particular \((-1,1,1)\).`,
        next: "Feche a questao.",
        helps: [
          "Conclusao de homogeneo deve falar trivial e nao trivial.",
          "Inclua alpha=0.",
          "Inclua a familia t(-1,1,1).",
          "Escolha t=1 para particular.",
          "Diga que para alpha neq 0 so ha a trivial."
        ]
      }
    ]
  },
  {
    id: "blank-l11-ex6",
    origin: "Lista 11 - exercicio 6",
    title: "Exercicio 6 - homogeneo com m",
    timeMinutes: 8,
    statement: String.raw`\[\begin{pmatrix}1&2&2\\m-1&1&m-2\\m+1&m-1&2\end{pmatrix}\vec{x}=\vec{0}\]`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&2&2&0\\m-1&1&m-2&0\\m+1&m-1&2&0\end{array}\right]\]`,
    examGoal: String.raw`Determinar quando existe apenas a solucao trivial.`,
    finalModel: String.raw`Como \(\det(A)=3m(m-3)\), existe apenas a solucao trivial quando \(m\neq0\) e \(m\neq3\).`,
    stages: [
      {
        key: "tipo",
        axis: "leitura",
        title: "Reconhecer a pergunta",
        prompt: "O que a questao pergunta num sistema homogeneo?",
        must: [["trivial"], ["homogeneo"]],
        expected: "Ela quer saber quando o homogeneo tem apenas a solucao trivial.",
        trap: "Procurar lado direito diferente de zero. Aqui ele e zero.",
        proof: String.raw`No homogeneo, SI nao entra: a decisao e 'so trivial' ou 'nao trivial'.`,
        next: "Use determinante.",
        helps: [
          "Olhe o vetor do lado direito.",
          "Ele e zero, entao e homogeneo.",
          "Homogeneo sempre tem a trivial.",
          "A pergunta e quando nao existem outras.",
          "Proximo: det(A) diferente de zero."
        ]
      },
      {
        key: "det",
        axis: "plano",
        title: "Determinante",
        prompt: "Qual condicao garante apenas a trivial?",
        must: [["det", "determinante"], ["diferente", "neq", "!="], ["zero", "0"]],
        expected: String.raw`Apenas trivial ocorre quando \(\det(A)\neq0\).`,
        trap: "Responder os valores que zeram o determinante, que sao justamente os casos com nao triviais.",
        proof: String.raw`Aqui \(\det(A)=3m(m-3)\).`,
        next: "Aplique a condicao em m.",
        helps: [
          "Em homogeneo quadrado, det diferente de zero prende tudo no zero.",
          "Det zero libera variavel livre.",
          "A pergunta pede apenas trivial.",
          "Entao queremos det(A) diferente de zero.",
          "Use det(A)=3m(m-3)."
        ]
      },
      {
        key: "valores",
        axis: "interpretacao",
        title: "Valores de m",
        prompt: "Para quais valores de m ha apenas a trivial?",
        must: [["m"], ["0"], ["3"], ["diferente", "neq", "!="]],
        expected: String.raw`Como \(3m(m-3)\neq0\), precisamos \(m\neq0\) e \(m\neq3\).`,
        trap: "Dizer m=0 ou m=3. Esses sao os valores que geram solucoes nao triviais.",
        proof: String.raw`Valores proibidos para apenas trivial: \(m=0\) e \(m=3\).`,
        next: "Escreva a conclusao.",
        helps: [
          "Resolva quando o produto nao zera.",
          "O produto zera em m=0 ou m=3.",
          "Para ser diferente de zero, m nao pode ser esses valores.",
          "Resposta: m neq 0 e m neq 3.",
          "Agora escreva em frase de prova."
        ]
      },
      {
        key: "concluir",
        axis: "conclusao",
        title: "Conclusao",
        prompt: "Escreva a conclusao de prova do exercicio 6.",
        must: [["m"], ["0"], ["3"], ["trivial"], ["diferente", "neq", "!="]],
        expected: String.raw`O sistema admite apenas a solucao trivial quando \(m\neq0\) e \(m\neq3\). Para \(m=0\) ou \(m=3\), existem solucoes nao triviais.`,
        trap: "Nao dizer o que acontece nos valores excluidos.",
        proof: String.raw`Modelo: \(\det(A)=3m(m-3)\). Assim, \(\det(A)\neq0\) se \(m\neq0,3\); logo apenas a trivial.`,
        next: "Feche a questao.",
        helps: [
          "Conclusao precisa responder exatamente o que foi pedido.",
          "A frase-chave e 'apenas a solucao trivial'.",
          "Inclua m diferente de 0 e diferente de 3.",
          "Diga que m=0 ou m=3 geram nao triviais.",
          "Pronto: essa e a conclusao aceitavel."
        ]
      }
    ]
  },
  {
    id: "blank-continuacao-alpha1",
    origin: "Treino de continuacao - Lista 11 ex. 3",
    title: "Continue daqui - alpha=1",
    timeMinutes: 6,
    statement: String.raw`No caso \(\alpha=1\), depois de duas operacoes, voce chegou em:`,
    matrix: String.raw`\[\left[\begin{array}{ccc|c}1&4&1&6\\0&-9&0&-9\\0&-1&0&-1\end{array}\right]\]`,
    examGoal: "Continuar a leitura da matriz parcialmente escalonada.",
    finalModel: String.raw`As duas ultimas linhas sao equivalentes e indicam \(x_2=1\). Nao ha contradicao, falta pivo em \(x_3\), entao \(x_3=t\) e o sistema e SPI.`,
    stages: [
      {
        key: "proximoPivo",
        axis: "execucao",
        title: "Continuar daqui",
        prompt: "Qual e o proximo passo logico?",
        must: [["comparar", "zerar", "usar"], ["linha 2", "l2", "-9", "linha 3", "l3", "-1"]],
        expected: "Compare as linhas 2 e 3 ou use uma para zerar a outra. Elas dizem a mesma equacao.",
        trap: "Declarar SPI sem verificar se ha contradicao.",
        proof: String.raw`Como \([0,-9,0|-9]\) e \([0,-1,0|-1]\) sao multiplas, nao ha contradicao.`,
        next: "Interprete variavel livre.",
        helps: [
          "A matriz ja esta quase escalonada.",
          "Olhe para as duas ultimas linhas.",
          "Elas sao multiplas?",
          "Ambas indicam x2=1.",
          "Agora procure variavel sem pivo."
        ]
      },
      {
        key: "interpretar",
        axis: "interpretacao",
        title: "Interpretar",
        prompt: "O que essa matriz indica?",
        must: [["spi", "infinitas", "possivel indeterminado"], ["x3", "livre"]],
        expected: "Indica SPI, porque nao ha contradicao e x3 fica livre.",
        trap: "Achar que a linha repetida e erro. Ela e dependencia, nao contradicao.",
        proof: String.raw`Com \(x_3=t\), temos \((x_1,x_2,x_3)=(2-t,1,t)\).`,
        next: "Escreva a conclusao.",
        helps: [
          "Nao apareceu 0=c.",
          "Faltou pivo na coluna x3.",
          "Variavel sem pivo vira parametro.",
          "Parametro livre gera infinitas solucoes.",
          "Conclusao: SPI."
        ]
      },
      {
        key: "concluir",
        axis: "conclusao",
        title: "Conclusao",
        prompt: "Como voce escreveria a conclusao?",
        must: [["spi", "infinitas"], ["x3", "t"], ["2-t", "2 - t"]],
        expected: String.raw`Para \(\alpha=1\), o sistema e SPI e \((x_1,x_2,x_3)=(2-t,1,t)\).`,
        trap: "Dizer 'tem linha repetida' sem transformar isso em conclusao formal.",
        proof: "Modelo: sem contradicao e com variavel livre, portanto SPI.",
        next: "Fechar treino de continuacao.",
        helps: [
          "Use a palavra formal SPI.",
          "Explique sem contradicao.",
          "Explique x3 livre.",
          "Escreva a familia.",
          "Resolucao parcial liberada."
        ]
      }
    ]
  }
];

function normalizeBlankText(text = "") {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\\alpha|α/g, "alpha")
    .replace(/\\lambda|λ/g, "lambda")
    .replace(/\\neq|≠|!=/g, " diferente ")
    .replace(/\\vec/g, " vec ")
    .replace(/[{}()[\],.;:]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function blankTermMatches(text, terms = []) {
  const normalized = normalizeBlankText(text);
  return terms.some((term) => normalized.includes(normalizeBlankText(term)));
}

function evaluateBlankStep(stage, rawText) {
  const text = normalizeBlankText(rawText);
  if (!text || text.length < 4) {
    return {
      ok: false,
      missing: ["Explique seu proximo passo em uma frase curta."],
      feedback: "Ainda nao da para avaliar. Na prova, pensamento escondido nao ganha ponto: escreva o que voce faria e por que."
    };
  }
  const missing = (stage.must || []).filter((group) => !blankTermMatches(text, group));
  const ok = missing.length === 0;
  return {
    ok,
    missing,
    feedback: ok
      ? `<strong>Professor:</strong> agora sim. ${stage.expected}<br><strong>Por que:</strong> ${stage.proof}<br><strong>Armadilha:</strong> ${stage.trap}<br><strong>Proximo passo:</strong> ${stage.next}`
      : `<strong>Professor:</strong> ideia ainda incompleta. Faltou aparecer: ${missing.map((group) => group[0]).join(", ")}.<br><strong>Alerta:</strong> ${stage.trap}<br><strong>Como melhorar:</strong> ${stage.expected}`
  };
}

function newBlankAttempt(caseIndex) {
  const item = BLANK_SHEET_CASES[caseIndex] || BLANK_SHEET_CASES[0];
  return {
    caseId: item.id,
    history: [],
    axes: { leitura: 0, plano: 0, execucao: 0, interpretacao: 0, conclusao: 0 },
    stageComplete: false,
    lastFeedback: "",
    helpLevel: 0,
    usedDeepHelp: false,
    timerStart: null,
    timedOut: false,
    stuckReason: ""
  };
}

function blankTimerExpired(attempt, item) {
  if (!attempt?.timerStart) return false;
  return Date.now() - attempt.timerStart > item.timeMinutes * 60 * 1000;
}

function blankTimerPanel(item, attempt) {
  const running = !!attempt.timerStart;
  const elapsed = running ? Math.floor((Date.now() - attempt.timerStart) / 60000) : 0;
  const expired = blankTimerExpired(attempt, item);
  return `
    <aside class="timer-panel ${expired ? "danger" : ""}">
      <strong>Cronometro de prova</strong>
      <p>${running ? `Rodando: ${elapsed} min de ${item.timeMinutes} min.` : `Tempo sugerido: ${item.timeMinutes} min.`}</p>
      ${running ? "" : `<button class="secondary" type="button" data-blank-timer>Ativar cronometro</button>`}
      ${expired ? `
        <div class="stuck-reasons">
          <p><strong>Tempo estourado.</strong> Onde voce travou?</p>
          ${BLANK_STUCK_REASONS.map((reason) => `<button class="secondary" type="button" data-blank-stuck-reason="${reason}">${reason}</button>`).join("")}
        </div>
      ` : ""}
    </aside>
  `;
}

function ritualPanel() {
  return `
    <aside class="ritual-panel" aria-label="Ritual de prova">
      <strong>Ritual de prova</strong>
      <ol>${BLANK_RITUAL.map((item) => `<li>${item}</li>`).join("")}</ol>
    </aside>
  `;
}

function blankHelpPanel(stage, attempt) {
  if (!attempt.helpLevel) return "";
  const helps = stage.helps.slice(0, attempt.helpLevel);
  return `
    <section class="blank-help" role="status" aria-live="polite">
      <strong>Ajuda progressiva ${attempt.helpLevel}/5</strong>
      <ol>${helps.map((help, index) => `<li><span>Nivel ${index + 1}</span>${help}</li>`).join("")}</ol>
      ${attempt.helpLevel >= 4 ? `<p><strong>Nota honesta:</strong> esta questao nao conta como dominio real sem dica, porque o app ja entregou parte do caminho.</p>` : ""}
    </section>
  `;
}

function blankHistoryPanel(history = []) {
  return `
    <section class="blank-history">
      <h3>Historico da sua folha</h3>
      ${history.length ? `
        <ol>${history.map((entry) => `
          <li class="${entry.ok ? "ok" : "warn"}">
            <strong>${entry.stage}</strong>
            <p>${entry.text}</p>
            <small>${entry.ok ? "aceito" : "precisa ajustar"}</small>
          </li>
        `).join("")}</ol>
      ` : `<p>Ainda sem acao registrada. Escreva o primeiro passo antes de pedir correcao.</p>`}
    </section>
  `;
}

function blankAxisPanel(axes = {}) {
  return `
    <section class="axis-panel" aria-label="Avaliacao por eixo">
      ${Object.entries(BLANK_AXIS_LABELS).map(([key, label]) => `
        <div>
          <strong>${Math.min(100, axes[key] || 0)}%</strong>
          <span>${label}</span>
        </div>
      `).join("")}
    </section>
  `;
}

function blankSheetHome() {
  if (blankTimerHandle) {
    clearTimeout(blankTimerHandle);
    blankTimerHandle = null;
  }
  screen = { mode: "blankSheet", index: 0, boss: "mixed", score: 0, errors: [], item: null };
  const attemptCount = state.blankSheetAttempts?.length || 0;
  setStage(`
    <section class="blank-shell">
      <header class="blank-hero">
        <span class="pill">Modo prova</span>
        <h2>Folha em Branco - Lista 11</h2>
        <p>Sem alternativas. Sem dica inicial. Voce recebe o enunciado, escreve o proximo passo e o app corrige o raciocinio como professor de prova.</p>
      </header>
      <section class="blank-rules">
        <article><strong>Como funciona</strong><p>Responda em texto curto: plano, conta, caso especial, interpretacao e conclusao.</p></article>
        <article><strong>Dominio real</strong><p>So conta se voce avanca sem ajuda profunda, separa casos e escreve conclusao.</p></article>
        <article><strong>Tentativas</strong><p>${attemptCount} tentativa(s) registradas neste modo. XP nao e usado como medida principal aqui.</p></article>
      </section>
      <div class="blank-case-grid">
        ${BLANK_SHEET_CASES.map((item, index) => `
          <button class="blank-case-card" type="button" data-blank-start="${index}">
            <span>${item.origin}</span>
            <strong>${item.title}</strong>
            <small>${item.examGoal}</small>
            <em>${item.timeMinutes} min sugeridos</em>
          </button>
        `).join("")}
      </div>
      <div class="actions">
        <button class="secondary" type="button" data-blank-messy="1">Minha folha ficou confusa</button>
        <button class="secondary" type="button" data-mode="home">Voltar ao menu</button>
      </div>
    </section>
  `);
}

function startBlankCase(caseIndex = 0) {
  const safeIndex = Math.max(0, Math.min(Number(caseIndex) || 0, BLANK_SHEET_CASES.length - 1));
  screen = {
    mode: "blankSheetCase",
    index: 0,
    caseIndex: safeIndex,
    boss: "mixed",
    score: 0,
    errors: [],
    item: null,
    blank: newBlankAttempt(safeIndex)
  };
  renderBlankStage();
}

function renderBlankStage() {
  const item = BLANK_SHEET_CASES[screen.caseIndex] || BLANK_SHEET_CASES[0];
  const stage = item.stages[screen.index] || item.stages[0];
  const attempt = screen.blank || newBlankAttempt(screen.caseIndex);
  const progress = Math.round(((screen.index + 1) / item.stages.length) * 100);
  const expired = blankTimerExpired(attempt, item);
  if (expired) attempt.timedOut = true;
  setStage(`
    <section class="blank-shell blank-workspace">
      <header class="blank-top">
        <div>
          <span class="pill">Folha em Branco</span>
          <h2>${item.title}</h2>
          <p>${item.origin} - etapa ${screen.index + 1}/${item.stages.length}: ${stage.title}</p>
        </div>
        <div class="progress-block">
          <span>Progresso da questao: ${progress}%</span>
          <div class="bar"><span style="width:${progress}%"></span></div>
        </div>
      </header>
      <div class="blank-layout">
        <main class="blank-main">
          <article class="blank-paper">
            <h3>Enunciado cru</h3>
            <p><strong>Pedido:</strong> ${item.examGoal}</p>
            <div class="math-box">${item.statement}</div>
            <div class="math-box">${item.matrix}</div>
          </article>

          <article class="blank-paper focus-panel">
            <h3>${stage.title}</h3>
            <p class="blank-prompt">${stage.prompt}</p>
            <form class="blank-response" data-blank-form>
              <label for="blankStep">O que voce faria agora?</label>
              <textarea id="blankStep" name="blankStep" rows="4" placeholder="Ex.: calcular det(A), separar m=-8 e depois testar m=2"></textarea>
              <div class="actions">
                <button class="primary" type="submit">Registrar proximo passo</button>
                <button class="secondary" type="button" data-blank-stuck>Estou travado</button>
              </div>
            </form>
            ${blankHelpPanel(stage, attempt)}
            <div id="blankFeedback" class="feedback ${attempt.lastFeedback ? "show" : ""} ${attempt.stageComplete ? "success" : "danger"}" role="status" aria-live="polite">${attempt.lastFeedback || "Sem correcao ainda. Primeiro tente escrever seu plano."}</div>
            <div class="actions">
              <button class="primary" type="button" data-blank-next ${attempt.stageComplete ? "" : "disabled"}>${screen.index >= item.stages.length - 1 ? "Fechar questao" : "Proxima etapa"}</button>
              <button class="secondary" type="button" data-blank-messy="${screen.caseIndex}">Minha folha ficou confusa</button>
              <button class="secondary" type="button" data-mode="blankSheet">Escolher outra questao</button>
            </div>
          </article>
        </main>
        <aside class="blank-side">
          ${ritualPanel()}
          ${blankTimerPanel(item, attempt)}
          ${blankAxisPanel(attempt.axes)}
          ${blankHistoryPanel(attempt.history)}
        </aside>
      </div>
    </section>
  `);
}

function submitBlankStep(rawText) {
  if (screen.mode !== "blankSheetCase") return;
  const item = BLANK_SHEET_CASES[screen.caseIndex] || BLANK_SHEET_CASES[0];
  const stage = item.stages[screen.index] || item.stages[0];
  const attempt = screen.blank || newBlankAttempt(screen.caseIndex);
  const result = evaluateBlankStep(stage, rawText);
  if (blankTimerExpired(attempt, item)) attempt.timedOut = true;
  attempt.stageComplete = result.ok;
  attempt.lastFeedback = result.feedback;
  attempt.history = [
    ...attempt.history,
    { stage: stage.title, text: rawText.trim() || "(sem resposta)", ok: result.ok }
  ].slice(-24);
  if (result.ok) {
    attempt.axes[stage.axis] = Math.min(100, (attempt.axes[stage.axis] || 0) + 25);
  } else {
    recordProofError(stage.axis === "execucao" ? "arithmetic" : stage.axis === "conclusao" ? "conclusion" : "conceptual");
  }
  screen.blank = attempt;
  renderBlankStage();
}

function blankRequestHelp() {
  if (screen.mode !== "blankSheetCase") return;
  const attempt = screen.blank || newBlankAttempt(screen.caseIndex);
  attempt.helpLevel = Math.min(5, (attempt.helpLevel || 0) + 1);
  if (attempt.helpLevel >= 4) attempt.usedDeepHelp = true;
  if (attempt.helpLevel >= 5) {
    const item = BLANK_SHEET_CASES[screen.caseIndex] || BLANK_SHEET_CASES[0];
    const stage = item.stages[screen.index] || item.stages[0];
    attempt.stageComplete = true;
    attempt.lastFeedback = `<strong>Ajuda nivel 5 liberada.</strong> ${stage.expected}<br><strong>Modelo de prova:</strong> ${stage.proof}<br>Refaca depois sem ajuda para contar como dominio real.`;
  }
  state.hintsUsed += 1;
  saveState();
  screen.blank = attempt;
  renderBlankStage();
}

function blankNextStep() {
  if (screen.mode !== "blankSheetCase") return;
  const item = BLANK_SHEET_CASES[screen.caseIndex] || BLANK_SHEET_CASES[0];
  if (screen.index >= item.stages.length - 1) return blankSheetResult();
  screen.index += 1;
  screen.blank.stageComplete = false;
  screen.blank.lastFeedback = "";
  screen.blank.helpLevel = 0;
  renderBlankStage();
}

function startBlankTimer() {
  if (screen.mode !== "blankSheetCase") return;
  const item = BLANK_SHEET_CASES[screen.caseIndex] || BLANK_SHEET_CASES[0];
  if (blankTimerHandle) clearTimeout(blankTimerHandle);
  screen.blank.timerStart = Date.now();
  blankTimerHandle = setTimeout(() => {
    if (screen.mode === "blankSheetCase" && screen.blank?.timerStart) {
      screen.blank.timedOut = true;
      renderBlankStage();
    }
  }, item.timeMinutes * 60 * 1000);
  renderBlankStage();
}

function blankRecordStuckReason(reason) {
  if (screen.mode !== "blankSheetCase") return;
  screen.blank.stuckReason = reason;
  screen.blank.usedDeepHelp = true;
  screen.blank.lastFeedback = `<strong>Travamento registrado:</strong> ${reason}. Recomendacao: volte ao Modo Quadro para esse eixo antes de contar dominio real.`;
  renderBlankStage();
}

function blankSheetResult() {
  if (blankTimerHandle) {
    clearTimeout(blankTimerHandle);
    blankTimerHandle = null;
  }
  const item = BLANK_SHEET_CASES[screen.caseIndex] || BLANK_SHEET_CASES[0];
  const attempt = screen.blank || newBlankAttempt(screen.caseIndex);
  const average = Math.round(Object.values(attempt.axes).reduce((sum, value) => sum + value, 0) / Object.keys(BLANK_AXIS_LABELS).length);
  const realMastery = average >= 80 && !attempt.usedDeepHelp && !attempt.timedOut && !attempt.stuckReason;
  const result = {
    date: new Date().toISOString(),
    caseId: item.id,
    title: item.title,
    axes: attempt.axes,
    average,
    realMastery,
    usedDeepHelp: !!attempt.usedDeepHelp,
    timedOut: !!attempt.timedOut,
    stuckReason: attempt.stuckReason || ""
  };
  const caseIndex = screen.caseIndex || 0;
  state.blankSheetAttempts = [...(state.blankSheetAttempts || []), result].slice(-40);
  if (realMastery && !state.completedWithoutHints.includes(`blank-${item.id}`)) state.completedWithoutHints.push(`blank-${item.id}`);
  saveState();
  screen = { mode: "blankSheetResult", index: 0, boss: "mixed", score: average, errors: [], item: null };
  setStage(`
    <section class="panel stack readiness-report">
      <span class="pill">Resultado - Folha em Branco</span>
      <h2>${realMastery ? "Dominio real validado nesta questao" : "Resposta treinada, mas ainda nao blindada"}</h2>
      <p>${realMastery ? "Voce iniciou sem dica profunda, passou pelos eixos principais e fechou a conclusao." : "Voce praticou a questao, mas ainda houve ajuda profunda, tempo estourado ou eixo fraco. Isso e treino, nao dominio real."}</p>
      ${blankAxisPanel(attempt.axes)}
      <div class="feedback show">
        <strong>Modelo final de prova</strong>
        <p>${item.finalModel}</p>
      </div>
      <div class="mission-list">
        <div class="mission-card"><strong>${average}%</strong><small>media dos eixos</small></div>
        <div class="mission-card"><strong>${attempt.usedDeepHelp ? "sim" : "nao"}</strong><small>usou ajuda profunda</small></div>
        <div class="mission-card"><strong>${attempt.timedOut ? "sim" : "nao"}</strong><small>estourou tempo</small></div>
      </div>
      <div class="actions">
        <button class="primary" type="button" data-mode="blankSheet">Resolver outra em folha branca</button>
        <button class="secondary" type="button" data-blank-start="${caseIndex}">Refazer esta questao</button>
        <button class="secondary" type="button" data-mode="board">Voltar ao Modo Quadro</button>
      </div>
    </section>
  `);
}

function startBlankMessy(caseIndex = 1) {
  const safeIndex = Math.max(0, Math.min(Number(caseIndex) || 0, BLANK_SHEET_CASES.length - 1));
  const item = BLANK_SHEET_CASES[safeIndex] || BLANK_SHEET_CASES[1];
  screen = { mode: "blankSheetMessy", index: 0, caseIndex: safeIndex, boss: "mixed", score: 0, errors: [], item: null };
  const blocks = [
    ["dados", "Dados do sistema"],
    ["matriz", "Matriz aumentada"],
    ["operacoes", "Operacoes elementares"],
    ["geral", "Caso geral"],
    ["especial", "Caso especial"],
    ["classificacao", "Classificacao"],
    ["solucao", "Solucao"],
    ["conclusao", "Conclusao"]
  ];
  setStage(`
    <section class="blank-shell">
      <header class="blank-top">
        <div>
          <span class="pill">Organizacao de prova</span>
          <h2>Minha folha ficou confusa</h2>
          <p>${item.origin} - ${item.title}</p>
        </div>
      </header>
      <article class="blank-paper">
        <h3>Questao em organizacao</h3>
        <p>${item.examGoal}</p>
        <div class="math-box">${item.statement}</div>
        <div class="math-box">${item.matrix}</div>
      </article>
      <form class="messy-form" data-messy-form>
        <p><strong>Conta certa em folha confusa ainda perde ponto.</strong> Preencha os blocos que voce colocaria na prova.</p>
        <div class="messy-grid">
          ${blocks.map(([key, label]) => `
            <label>
              <span>${label}</span>
              <textarea name="${key}" rows="3" placeholder="${label}..."></textarea>
            </label>
          `).join("")}
        </div>
        <div class="actions">
          <button class="primary" type="submit">Auditar minha folha</button>
          <button class="secondary" type="button" data-mode="blankSheet">Voltar ao modo Folha</button>
        </div>
      </form>
      <div id="messyFeedback" class="feedback" role="status" aria-live="polite"></div>
    </section>
  `);
}

function submitMessyForm(form) {
  const data = new FormData(form);
  const filled = ["dados", "matriz", "operacoes", "geral", "especial", "classificacao", "solucao", "conclusao"].filter((key) => String(data.get(key) || "").trim().length > 6);
  const conclusion = normalizeBlankText(data.get("conclusao") || "");
  const item = BLANK_SHEET_CASES[screen.caseIndex] || BLANK_SHEET_CASES[1];
  const hasConclusion = conclusion.includes("spd") || conclusion.includes("spi") || conclusion.includes("si") || conclusion.includes("trivial");
  const ok = filled.length >= 6 && hasConclusion;
  state.blankSheetAttempts = [
    ...(state.blankSheetAttempts || []),
    { date: new Date().toISOString(), caseId: item.id, mode: "messy", filled: filled.length, organized: ok }
  ].slice(-40);
  saveState();
  const fb = $("#messyFeedback");
  fb.innerHTML = `
    <strong>${ok ? "Folha auditavel." : "Folha ainda perigosa."}</strong>
    <p>Blocos preenchidos: ${filled.length}/8. ${hasConclusion ? "Conclusao formal detectada." : "Faltou conclusao formal."}</p>
    <p><strong>Modelo compacto:</strong> ${item.finalModel}</p>
    <p>${ok ? "Agora a conta tem trilha de auditoria." : "Antes de refazer conta, organize dados, matriz, caso geral, caso especial e conclusao."}</p>
  `;
  fb.className = `feedback show ${ok ? "success" : "danger"}`;
  typeset();
}

const ESCALONAMENTO_SEM_QUADRO = [
  courseMission({
    id: "mode-esq-01-row-op",
    chapter: "Nivel 1 - operacoes isoladas",
    title: "Calcular uma operacao de linha inteira",
    origin: "Gerada no escopo Lista 10",
    skill: "aritmetica de linhas",
    difficulty: 1,
    data: String.raw`<p>\(L_1=[1,\ 2,\ -1\ |\ 3]\)</p><p>\(L_2=[3,\ 1,\ 4\ |\ 5]\)</p>`,
    explain: "Antes de escalonar uma matriz toda, treine uma linha. A operacao muda cada entrada, inclusive depois da barra.",
    question: String.raw`Calcule \(L_2\leftarrow L_2-3L_1\).`,
    choices: [
      String.raw`\([0,\ -5,\ 7\ |\ -4]\)`,
      String.raw`\([0,\ -5,\ 7\ |\ 5]\)`,
      String.raw`\([0,\ 5,\ 1\ |\ -4]\)`
    ],
    answer: 0,
    feedback: "Certo. Voce atualizou a linha inteira, inclusive o termo independente.",
    feedbacks: [
      "Certo. Estrategia e conta bateram.",
      "Voce acertou os coeficientes, mas perdeu o termo independente: 5 - 3*3 = -4.",
      "Erro de sinal no segundo e terceiro termos. A operacao e entrada por entrada."
    ],
    fullSolution: String.raw`<p>\(3L_1=[3,6,-3|9]\).</p><p>\(L_2-3L_1=[3,1,4|5]-[3,6,-3|9]=[0,-5,7|-4]\).</p>`,
    why: "Esse treino separa erro operacional de erro conceitual."
  }),
  courseMission({
    id: "mode-esq-02-pivot-choice",
    chapter: "Nivel 2 - escolha de pivo",
    title: "Escolher pivo confortavel",
    origin: "Gerada",
    skill: "escolha de pivo",
    difficulty: 1,
    data: matrixTex([[3, 1, -1, 4], [1, 5, 2, 8], [-2, 3, 1, 0]]),
    explain: "Se existe linha com 1 na primeira coluna, ela costuma ser o pivo mais limpo.",
    question: "Qual linha voce colocaria como primeira para comecar melhor?",
    choices: ["Linha 1, porque ja esta em cima", "Linha 2, porque tem pivo 1", "Linha 3, porque tem negativo"],
    answer: 1,
    feedback: "Boa. Se existe pivo 1, nao precisa sofrer com pivo 3.",
    feedbacks: [
      "Funciona, mas cria fracao/conta maior cedo demais. Melhor usar a linha 2 com pivo 1.",
      "Boa. Pivo 1 economiza vida em prova.",
      "Negativo nao e problema, mas aqui o 1 e mais confortavel."
    ],
    fullSolution: String.raw`<p>Trocar \(L_1\leftrightarrow L_2\) nao muda as solucoes. So coloca a equacao mais conveniente no topo.</p>`,
    why: "Escolher pivo bom e organizacao, nao frescura."
  }),
  courseMission({
    id: "mode-esq-03-zero-first-column",
    chapter: "Nivel 3 - zerar primeira coluna",
    title: "Escolher a operacao que zera",
    origin: "Lista 10 sistema I",
    skill: "escalonamento",
    difficulty: 2,
    data: String.raw`<p>\(L_1=[1,2,-1|-10]\)</p><p>\(L_2=[3,7,2|-19]\)</p>`,
    explain: "Objetivo: zerar o 3 abaixo do pivo 1. A operacao nasce da conta 3 - 3*1 = 0.",
    question: "Qual operacao zera o primeiro termo da linha 2?",
    choices: [
      String.raw`\(L_2\leftarrow L_2-3L_1\)`,
      String.raw`\(L_2\leftarrow L_2+3L_1\)`,
      String.raw`\(L_1\leftarrow L_1-3L_2\)`
    ],
    answer: 0,
    feedback: String.raw`Certo. \(3-3\cdot1=0\).`,
    feedbacks: [
      String.raw`Certo. \(3-3\cdot1=0\).`,
      String.raw`Erro de sinal: \(3+3\cdot1=6\), nao zero.`,
      String.raw`Linha errada: quem precisa mudar e \(L_2\), nao \(L_1\).`
    ],
    fullSolution: String.raw`<p>\(3L_1=[3,6,-3|-30]\).</p><p>\(L_2-3L_1=[0,1,5|11]\).</p>`,
    why: "Primeiro objetivo, depois operacao. Isso reduz chute."
  }),
  courseMission({
    id: "mode-esq-04-independent-term",
    chapter: "Nivel 3 - zerar primeira coluna",
    title: "Conferir o termo depois da barra",
    origin: "Lista 10 sistema I",
    skill: "aritmetica de linhas",
    difficulty: 2,
    data: String.raw`<p>\([3,7,2|-19]-[3,6,-3|-30]\)</p>`,
    explain: "O termo independente vai para a guerra junto. Aqui o lado direito e -19 - (-30).",
    question: String.raw`Quanto vale \(-19-(-30)\)?`,
    choices: ["11", "-49", "-11"],
    answer: 0,
    feedback: "Certo. Subtrair numero negativo vira somar.",
    feedbacks: [
      "Certo. Esse 11 aparece depois da barra.",
      "Isso seria -19 - 30. Aqui e -19 - (-30).",
      "Faltou somar 30 depois de tirar o parenteses."
    ],
    fullSolution: String.raw`<p>\(-19-(-30)=-19+30=11\).</p><p>Nova linha: \([0,1,5|11]\).</p>`,
    why: "Muita gente sabe a operacao e perde a questao na barra."
  }),
  courseMission({
    id: "mode-esq-05-2x2-complete",
    chapter: "Nivel 4 - escalonamento 2x2",
    title: "Escalonamento completo 2x2",
    origin: "Gerada",
    skill: "escalonamento",
    difficulty: 2,
    data: String.raw`\[\begin{cases}x+2y=7\\3x-y=5\end{cases}\]`,
    explain: "Monte a matriz e zere o 3 abaixo do pivo 1.",
    question: String.raw`Depois de \(L_2\leftarrow L_2-3L_1\), qual fica a segunda linha?`,
    choices: [String.raw`\([0,-7|-16]\)`, String.raw`\([0,5|16]\)`, String.raw`\([0,-7|16]\)`],
    answer: 0,
    feedback: "Certo. Agora a matriz ja esta escalonada.",
    feedbacks: [
      "Certo. \(3-3=0\), \(-1-6=-7\), \(5-21=-16\).",
      "Sinal errado no coeficiente de y e no lado direito.",
      "Coeficiente certo, mas lado direito errado: 5 - 21 = -16."
    ],
    fullSolution: String.raw`<p>\([3,-1|5]-3[1,2|7]=[3,-1|5]-[3,6|21]=[0,-7|-16]\).</p>`,
    why: "2x2 completo treina o esqueleto sem afogar no tamanho."
  }),
  courseMission({
    id: "mode-esq-06-pivot-not-one",
    chapter: "Nivel 5 - 3x3 sem fracao cedo",
    title: "Pivo diferente de 1: evitar fracao cedo",
    origin: "Lista 10 sistema II",
    skill: "escolha de pivo",
    difficulty: 3,
    data: matrixTex([[3, 1, -1, -10], [2, -1, -1, 6], [-4, 2, -5, 20]]),
    explain: "Com pivo 3 e alvo 2, da para zerar sem fracao usando p*linha alvo - a*linha pivo.",
    question: String.raw`Qual operacao zera o 2 abaixo do pivo 3 sem fracao?`,
    choices: [
      String.raw`\(L_2\leftarrow3L_2-2L_1\)`,
      String.raw`\(L_2\leftarrow2L_2-3L_1\)`,
      String.raw`\(L_2\leftarrow L_2-\frac{3}{2}L_1\)`
    ],
    answer: 0,
    feedback: String.raw`Certo. \(3\cdot2-2\cdot3=0\).`,
    feedbacks: [
      String.raw`Certo. \(3\cdot2-2\cdot3=0\).`,
      String.raw`Da \(2\cdot2-3\cdot3=-5\), nao zero.`,
      "Essa fracao nem e a proporcao certa para zerar o 2 usando pivo 3."
    ],
    fullSolution: String.raw`<p>\(3L_2=[6,-3,-3|18]\).</p><p>\(2L_1=[6,2,-2|-20]\).</p><p>\(3L_2-2L_1=[0,-5,-1|38]\).</p>`,
    why: "Operacao valida nao basta; em prova, operacao limpa reduz erro."
  }),
  courseMission({
    id: "mode-esq-07-fraction-inevitable",
    chapter: "Nivel 6 - fracao inevitavel",
    title: "Quando a fracao aparece",
    origin: "Gerada",
    skill: "aritmetica de linhas",
    difficulty: 3,
    data: String.raw`<p>\(L_1=[2,1|5]\), \(L_2=[1,3|4]\)</p>`,
    explain: "Se voce decide manter o pivo 2, zerar o 1 abaixo pode exigir fracao. A fracao nao e proibida; so precisa ser controlada.",
    question: String.raw`Qual operacao zera o 1 abaixo do pivo 2?`,
    choices: [
      String.raw`\(L_2\leftarrow L_2-\frac12L_1\)`,
      String.raw`\(L_2\leftarrow L_2-2L_1\)`,
      String.raw`\(L_1\leftarrow L_1-\frac12L_2\)`
    ],
    answer: 0,
    feedback: String.raw`Certo. \(1-\frac12\cdot2=0\).`,
    fullSolution: String.raw`<p>\(\frac12L_1=[1,\frac12|\frac52]\).</p><p>\(L_2-\frac12L_1=[0,\frac52|\frac32]\).</p>`,
    why: "Fracao inevitavel nao e derrota; e so uma conta que exige organizacao."
  }),
  courseMission({
    id: "mode-esq-08-param-simple",
    chapter: "Nivel 7 - parametro simples",
    title: "Pivo com parametro",
    origin: "Gerada no escopo Lista 11",
    skill: "parametros",
    difficulty: 3,
    data: String.raw`<p>Durante o escalonamento apareceu um pivo \(k-2\).</p>`,
    explain: "Antes de dividir por um pivo com parametro, pergunte quando ele zera.",
    question: String.raw`Qual separacao de casos e correta?`,
    choices: [
      String.raw`\(k\neq2\) e \(k=2\)`,
      String.raw`\(k\neq-2\) e \(k=-2\)`,
      "dividir direto por \(k-2\)"
    ],
    answer: 0,
    feedback: "Certo. Valor critico primeiro, divisao depois.",
    fullSolution: String.raw`<p>\(k-2=0\Rightarrow k=2\). Se \(k\neq2\), pode dividir. Se \(k=2\), substitua e investigue.</p>`,
    why: "Parametro e onde muita questao de prova pega quem automatizou sem pensar."
  }),
  courseMission({
    id: "mode-esq-09-final-classify",
    chapter: "Nivel 8 - classificar depois",
    title: "Ler o fim do escalonamento",
    origin: "Lista 10 sistema I",
    skill: "classificacao",
    difficulty: 3,
    data: matrixTex([[1, 2, -1, -10], [0, 1, 5, 11], [0, 0, 0, 7]]),
    explain: "Escalonamento so termina quando voce interpreta a matriz final.",
    question: "Como classificamos esse sistema?",
    choices: ["SI", "SPI", "SPD"],
    answer: 0,
    feedback: "Certo. A ultima linha diz 0 = 7.",
    fullSolution: String.raw`<p>\([0,0,0|7]\Rightarrow0=7\). Contradicao. Logo o sistema e impossivel, \(S=\varnothing\).</p>`,
    why: "Sem classificacao final, a conta nao vira resposta."
  })
];

const DISCUSSAO_SISTEMAS = [
  courseMission({
    id: "mode-disc-01-algorithm",
    chapter: "Discussao - algoritmo mental",
    title: "Discutir e classificar por casos",
    origin: "Fundamento de prova",
    skill: "discussao de sistemas",
    difficulty: 2,
    data: "<p>Discutir = dizer para quais valores o sistema e SPD, SPI ou SI.</p>",
    explain: "Determinante diferente de zero resolve: SPD. Determinante zero nao resolve tudo; ele manda investigar.",
    question: "Quando det(A)=0 em sistema com parametro, o que fazer?",
    choices: ["substituir e investigar", "concluir SPI direto", "concluir SI direto"],
    answer: 0,
    feedback: "Certo. Valor critico nao e resposta final.",
    fullSolution: "<p>Algoritmo: tem parametro? matriz quadrada? calcule determinante. Caso geral com det diferente de zero: SPD. Caso especial com det zero: substitua e escalone.</p>",
    why: "Essa e a espinha dorsal da discussao de sistemas."
  }),
  courseMission({
    id: "mode-disc-02-spd",
    chapter: "Discussao sem parametro",
    title: "Matriz final com SPD",
    origin: "Gerada",
    skill: "classificacao",
    difficulty: 1,
    data: matrixTex([[1, 2, -1, 3], [0, 1, 4, 2], [0, 0, 1, 5]]),
    explain: "Ha pivo em todas as variaveis e nao ha contradicao.",
    question: "Classificacao correta:",
    choices: ["SPD", "SPI", "SI"],
    answer: 0,
    feedback: "Certo. Tres pivos para tres incognitas.",
    fullSolution: "<p>Frase-modelo: como ha pivo em todas as variaveis, o sistema e possivel determinado.</p>",
    why: "SPD exige solucao unica, nao so ausencia de erro."
  }),
  courseMission({
    id: "mode-disc-03-si",
    chapter: "Discussao sem parametro",
    title: "Linha contraditoria",
    origin: "Gerada",
    skill: "classificacao",
    difficulty: 1,
    data: matrixTex([[1, 2, -1, 3], [0, 1, 4, 2], [0, 0, 0, 5]]),
    explain: "A ultima linha diz 0 = 5. Isso e contradicao.",
    question: "Classificacao correta:",
    choices: ["SI", "SPI", "SPD"],
    answer: 0,
    feedback: "Certo. Linha contraditoria gera sistema impossivel.",
    fullSolution: String.raw`<p>Frase-modelo: como apareceu uma linha contraditoria, o sistema e impossivel, \(S=\varnothing\).</p>`,
    why: "Contradicao vem antes de falar em variavel livre."
  }),
  courseMission({
    id: "mode-disc-04-spi",
    chapter: "Discussao sem parametro",
    title: "Variavel livre sem contradicao",
    origin: "Gerada",
    skill: "variavel livre",
    difficulty: 2,
    data: matrixTex([[1, 2, -1, 3], [0, 1, 4, 2], [0, 0, 0, 0]]),
    explain: "A ultima linha e 0=0. Nao prende variavel. Se falta pivo, sobra variavel livre.",
    question: "Classificacao correta:",
    choices: ["SPI", "SI", "SPD"],
    answer: 0,
    feedback: "Certo. Sem contradicao e com variavel livre: SPI.",
    fullSolution: "<p>Frase-modelo: como nao ha contradicao e existe variavel livre, o sistema e possivel indeterminado.</p>",
    why: "0=0 nao e alarme; e uma linha que nao traz informacao nova."
  }),
  courseMission({
    id: "mode-disc-05-det-critical",
    chapter: "Discussao com parametro",
    title: "Valor critico do determinante",
    origin: "Gerada no escopo Lista 11",
    skill: "determinante",
    difficulty: 2,
    data: String.raw`\[\det(A)=a-2\]`,
    explain: "O valor critico e onde o determinante zera.",
    question: "Qual e o valor critico?",
    choices: [String.raw`\(a=2\)`, String.raw`\(a=-2\)`, String.raw`\(a\neq2\)`],
    answer: 0,
    feedback: "Certo. Esse valor separa caso geral e caso especial.",
    fullSolution: String.raw`<p>\(a-2=0\Rightarrow a=2\). Para \(a\neq2\), det(A) nao zera e o sistema e SPD.</p>`,
    why: "Achar valor critico e comeco da discussao, nao final."
  }),
  courseMission({
    id: "mode-disc-06-general-case",
    chapter: "Discussao com parametro",
    title: "Caso geral",
    origin: "Gerada no escopo Lista 11",
    skill: "parametros",
    difficulty: 2,
    data: String.raw`\[\det(A)=a-2\]`,
    explain: "Para a diferente do valor critico, o determinante e diferente de zero.",
    question: String.raw`Se \(a\neq2\), entao o sistema e:`,
    choices: ["SPD", "SPI", "SI"],
    answer: 0,
    feedback: "Certo. Determinante diferente de zero resolve: SPD.",
    fullSolution: String.raw`<p>Frase-modelo: para \(a\neq2\), \(\det(A)\neq0\), portanto o sistema e possivel determinado.</p>`,
    why: "Esse caso costuma ser rapido. A investigacao pesada fica no valor critico."
  }),
  courseMission({
    id: "mode-disc-07-special-case",
    chapter: "Discussao com parametro",
    title: "Caso especial",
    origin: "Gerada no escopo Lista 11",
    skill: "discussao de sistemas",
    difficulty: 3,
    data: String.raw`<p>Para \(a=2\), depois de substituir, apareceu:</p>\[[0,\ 0,\ 0\ |\ 5]\]`,
    explain: "Agora a matriz ampliada decide. Aqui apareceu contradicao.",
    question: String.raw`Para \(a=2\), a classificacao e:`,
    choices: ["SI", "SPI", "SPD"],
    answer: 0,
    feedback: "Certo. A linha 0=5 torna o sistema impossivel.",
    fullSolution: String.raw`<p>Conclusao completa: para \(a\neq2\), SPD. Para \(a=2\), SI.</p>`,
    why: "det(A)=0 apenas manda investigar; a linha final decide."
  }),
  courseMission({
    id: "mode-disc-08-write",
    chapter: "Escrita da discussao",
    title: "Completar a conclusao",
    origin: "Gerada no escopo Lista 11",
    skill: "escrita da conclusao",
    difficulty: 3,
    data: String.raw`<p>Dado: \(\det(A)=3a-6\).</p>`,
    explain: "A resposta boa fala do caso geral e do caso especial.",
    question: "Qual frase esta completa?",
    choices: [
      "a = 2",
      "Se a diferente de 2, SPD. Se a = 2, substituir e escalonar para decidir entre SPI e SI.",
      "det(A)=0, logo SPI"
    ],
    answer: 1,
    feedback: "Certo. Voce discutiu os dois caminhos.",
    feedbacks: [
      "Incompleto. Voce achou o valor critico, mas nao discutiu o sistema.",
      "Certo. Caso geral e caso especial aparecem.",
      "Erro conceitual: det(A)=0 nao implica SPI automaticamente."
    ],
    fullSolution: String.raw`<p>Modelo: se \(a\neq2\), entao \(\det(A)\neq0\), logo SPD. Se \(a=2\), entao \(\det(A)=0\), entao precisamos substituir no sistema e escalonar.</p>`,
    why: "A professora cobra discussao, nao so valor critico."
  }),
  courseMission({
    id: "mode-disc-09-homogeneous",
    chapter: "Homogeneos na discussao",
    title: "Homogeneo: lado direito zero",
    origin: "Lista 11",
    skill: "homogeneos",
    difficulty: 2,
    data: String.raw`\[A\vec{x}=\vec{0}\]`,
    explain: "No sistema homogeneo, quem e zero e o vetor do lado direito; a matriz dos coeficientes pode ter qualquer numero.",
    question: String.raw`Se \(\det(A)\neq0\), o homogeneo tem:`,
    choices: ["somente a trivial", "nenhuma solucao", "sempre infinitas solucoes"],
    answer: 0,
    feedback: "Certo. det(A) diferente de zero prende tudo na solucao zero.",
    fullSolution: String.raw`<p>Se \(\det(A)=0\), podem existir solucoes nao triviais. Se \(\det(A)\neq0\), so \(\vec{x}=\vec{0}\).</p>`,
    why: "Homogeneo nunca e SI de cara porque a trivial sempre funciona."
  })
];

const LISTA11_TOTAL = [
  courseMission({
    id: "mode-l11-01-identify-param",
    chapter: "Bloco 1 - identificar o monstro",
    title: "Que tipo de questao e essa?",
    origin: "Lista 11 ex. 1(a)",
    skill: "interpretacao de enunciado",
    difficulty: 2,
    data: String.raw`\[\begin{cases}\lambda x+2y=\lambda-1\\2x+4y=3\lambda\end{cases}\]`,
    explain: "Nao tente resolver tudo no primeiro olhar. Primeiro descubra o tipo da questao.",
    question: "Que tipo de monstro e esse?",
    choices: ["discussao com parametro", "homogeneo", "so matriz aumentada"],
    answer: 0,
    feedback: "Certo. Tem lambda e a classificacao depende do valor dele.",
    fullSolution: "<p>Primeiro passo provavel: montar matriz dos coeficientes e olhar o determinante.</p>",
    why: "Identificar o tipo corta o panico pela metade."
  }),
  courseMission({
    id: "mode-l11-02-first-step",
    chapter: "Bloco 2 - primeiro passo",
    title: "Escolher o primeiro passo",
    origin: "Lista 11 ex. 1(a)",
    skill: "primeiro passo",
    difficulty: 2,
    data: String.raw`\[\begin{cases}\lambda x+2y=\lambda-1\\2x+4y=3\lambda\end{cases}\]`,
    explain: "A matriz dos coeficientes e quadrada. Determinante e bom radar.",
    question: "Qual e o primeiro passo mais produtivo?",
    choices: ["calcular determinante da matriz dos coeficientes", "chutar x=0", "concluir SPI"],
    answer: 0,
    feedback: "Certo. O determinante separa caso geral e caso especial.",
    fullSolution: String.raw`<p>\(A=\begin{pmatrix}\lambda&2\\2&4\end{pmatrix}\), entao \(\det(A)=4\lambda-4=4(\lambda-1)\).</p>`,
    why: "Lista 11 pune quem pula a etapa de identificar a ferramenta."
  }),
  courseMission({
    id: "mode-l11-03-det-case",
    chapter: "Bloco 3 - resolver curto",
    title: "Caso geral do lambda",
    origin: "Lista 11 ex. 1(a)",
    skill: "determinante",
    difficulty: 3,
    data: String.raw`\[\det(A)=4(\lambda-1)\]`,
    explain: "Quando o determinante nao zera, o sistema quadrado e SPD.",
    question: String.raw`Para qual caso o sistema e SPD sem investigar mais?`,
    choices: [String.raw`\(\lambda\neq1\)`, String.raw`\(\lambda=1\)`, "nenhum"],
    answer: 0,
    feedback: "Certo. Determinante diferente de zero resolve: SPD.",
    fullSolution: String.raw`<p>Se \(\lambda\neq1\), \(\det(A)\neq0\). Logo, SPD.</p>`,
    why: "O caso geral geralmente e a parte limpa."
  }),
  courseMission({
    id: "mode-l11-04-critical-case",
    chapter: "Bloco 5 - parametro",
    title: "Caso critico do lambda",
    origin: "Lista 11 ex. 1(a)",
    skill: "discussao de sistemas",
    difficulty: 3,
    data: String.raw`<p>Substitua \(\lambda=1\):</p>\[\begin{cases}x+2y=0\\2x+4y=3\end{cases}\]`,
    explain: "Agora compare as linhas: a segunda esquerda e o dobro da primeira, mas o lado direito nao e.",
    question: String.raw`Para \(\lambda=1\), o sistema e:`,
    choices: ["SI", "SPI", "SPD"],
    answer: 0,
    feedback: "Certo. As equacoes se contradizem.",
    fullSolution: String.raw`<p>Multiplicando a primeira por 2: \(2x+4y=0\), mas a segunda diz \(2x+4y=3\). Contradicao. Logo SI.</p>`,
    why: "O valor critico nao era resposta final; ele abriu a investigacao."
  }),
  courseMission({
    id: "mode-l11-05-homogeneous-type",
    chapter: "Bloco 1 - identificar o monstro",
    title: "Reconhecer homogeneo",
    origin: "Lista 11 ex. 5",
    skill: "homogeneos",
    difficulty: 2,
    data: String.raw`\[\begin{pmatrix}2&1&1\\1&\alpha&1\\1&-1&2\end{pmatrix}\vec{x}=\vec{0}\]`,
    explain: "O lado direito e o vetor zero. Isso e homogeneo.",
    question: "Qual afirmacao e verdadeira?",
    choices: ["sempre existe a solucao trivial", "pode ser impossivel", "os coeficientes precisam ser zero"],
    answer: 0,
    feedback: "Certo. Homogeneo sempre aceita vetor zero.",
    fullSolution: String.raw`<p>Erro comum: achar que a matriz dos coeficientes precisa ser zero. Nao precisa; o lado direito e que e \(\vec{0}\).</p>`,
    why: "Homogeneo entra muito na Lista 11."
  }),
  courseMission({
    id: "mode-l11-06-alpha-discussion",
    chapter: "Bloco 5 - parametro",
    title: "Alpha e solucao nao trivial",
    origin: "Lista 11 ex. 5",
    skill: "parametros",
    difficulty: 3,
    data: String.raw`<p>No exercicio homogeneo da Lista 11, o valor especial e \(\alpha=0\).</p>`,
    explain: "Em homogeneo quadrado, det(A)!=0 significa so trivial; det(A)=0 abre possibilidade de solucao nao trivial.",
    question: String.raw`Para \(\alpha=0\), o que devemos procurar?`,
    choices: ["solucao nao trivial/variavel livre", "contradicao obrigatoria", "termo independente 7"],
    answer: 0,
    feedback: "Certo. Em homogeneo, det zero pode liberar variavel livre.",
    fullSolution: "<p>Como o sistema e homogeneo, ele nao vira SI. No caso especial, escalone e encontre a familia de solucoes.</p>",
    why: "Aqui det(A)=0 nao e fim; e convite para achar solucao nao trivial."
  }),
  courseMission({
    id: "mode-l11-07-m-system",
    chapter: "Bloco 5 - parametro",
    title: "Sistema com m: trivial ou nao",
    origin: "Lista 11 ex. 6",
    skill: "determinante",
    difficulty: 3,
    data: String.raw`\[\begin{pmatrix}1&2&2\\m-1&1&m-2\\m+1&m-1&2\end{pmatrix}\vec{x}=\vec{0}\]`,
    explain: "Pergunta de homogeneo com parametro: quando det(A) e diferente de zero, so existe a trivial.",
    question: "Para concluir que so existe a trivial, precisamos de:",
    choices: [String.raw`\(\det(A)\neq0\)`, String.raw`\(\det(A)=0\)`, "linha contraditoria"],
    answer: 0,
    feedback: "Certo. Determinante diferente de zero prende a solucao no vetor zero.",
    fullSolution: String.raw`<p>Se \(\det(A)=0\), investigue solucoes nao triviais. Se \(\det(A)\neq0\), acabou: so trivial.</p>`,
    why: "A pergunta nao e resolver tudo; e discutir valores."
  }),
  courseMission({
    id: "mode-l11-08-write-final",
    chapter: "Bloco 6 - mini-simulado",
    title: "Conclusao final por casos",
    origin: "Gerada equivalente Lista 11",
    skill: "escrita da conclusao",
    difficulty: 3,
    data: String.raw`<p>Resultado da discussao:</p><p>Para \(k\neq1\), \(\det(A)\neq0\). Para \(k=1\), apareceu \([0,0,0|4]\).</p>`,
    explain: "A resposta final precisa falar de todos os casos.",
    question: "Qual conclusao serve para prova?",
    choices: [
      "k = 1",
      "Para k diferente de 1, SPD. Para k = 1, SI.",
      "det(A)=0"
    ],
    answer: 1,
    feedback: "Certo. Agora voce escreveu a discussao, nao so o valor critico.",
    feedbacks: [
      "Incompleto. Valor critico sozinho nao classifica o sistema.",
      "Certo. Caso geral e caso especial estao classificados.",
      "Incompleto. Falta dizer SPD/SPI/SI."
    ],
    fullSolution: String.raw`<p>Para \(k\neq1\), \(\det(A)\neq0\), logo SPD. Para \(k=1\), a linha \([0,0,0|4]\) da contradicao, logo SI.</p>`,
    why: "Lista 11 Total exige conclusao completa."
  })
];

const PROOF_MODES = {
  escalonamentoSemQuadro: {
    title: "Escalonamento Sem Quadro",
    subtitle: "Treino de pivo, linhas, conta e organizacao.",
    finishId: "mode-escalonamento-sem-quadro-finish",
    done: "Escalonamento treinado sem depender de lousa.",
    items: ESCALONAMENTO_SEM_QUADRO
  },
  discussaoSistemas: {
    title: "Discussao de Sistemas Lineares",
    subtitle: "SPD, SPI, SI, determinante, parametro e conclusao escrita.",
    finishId: "mode-discussao-sistemas-finish",
    done: "Discussao por casos treinada.",
    items: DISCUSSAO_SISTEMAS
  },
  lista11Total: {
    title: "Lista 11 Total",
    subtitle: "Identificar, comecar, resolver e concluir no modo prova.",
    finishId: "mode-lista11-total-finish",
    done: "Lista 11 Total concluida.",
    items: LISTA11_TOTAL
  }
};

function home() {
  screen = { mode: "home", index: 0, boss: "mixed", score: 0, errors: [], item: null };
  const metrics = progressMetrics();
  const boardPosition = nextBoardPosition();
  const currentSystem = LISTA11_SYSTEMS[boardPosition.systemIndex] || LISTA11_SYSTEMS[0];
  setStage(`
    <section class="home-shell board-home">
      <div class="hero course-hero">
        <img src="assets/study-map-banner.png" alt="" loading="eager">
        <div class="hero-content">
          <p class="eyebrow">Modo Guerra de prova</p>
          <h1>Sistemas Lineares</h1>
          <p>Tutor gamificado para diagnosticar sua base, estudar a tecnica certa e praticar escalonamento, classificacao, homogeneos e parametros com feedback de prova.</p>
          <div class="inline-actions">
            <button class="primary big-cta" type="button" data-mode="diagnostic">Come&ccedil;ar diagn&oacute;stico</button>
            <button class="secondary big-cta" type="button" data-mode="journeyMap">Ver trilha de estudo</button>
          </div>
        </div>
      </div>

      <section class="home-section">
        <span class="pill">Como funciona</span>
        ${learningStepper("diagnostic")}
        <p>Voce comeca pelo diagnostico, recebe uma rota, resolve no Quadro com uma decisao por vez, encara o Boss e volta ao Grimorio quando precisar revisar teoria.</p>
      </section>

      <section class="home-section">
        <h2>O que voce vai aprender</h2>
        <div class="info-grid">
          <div class="info-card"><strong>Matriz aumentada</strong><small>Separar coeficientes, lado direito e barra sem copiar sinal errado.</small></div>
          <div class="info-card"><strong>Escalonamento</strong><small>Escolher pivo, zerar abaixo e controlar a linha inteira.</small></div>
          <div class="info-card"><strong>Classificacao</strong><small>Escrever SPD, SPI ou SI com justificativa de posto, contradicao ou variavel livre.</small></div>
          <div class="info-card"><strong>Lista 11</strong><small>Discutir homogeneos e parametros como \\(\\lambda\\), \\(m\\), \\(\\alpha\\) e \\(k\\).</small></div>
        </div>
      </section>

      <section class="home-section">
        <h2>Para quem e</h2>
        <div class="info-grid">
          <div class="info-card"><strong>Aluno que sabe matrizes</strong><small>Mas ainda se perde em pivo, operacoes de linha e interpretacao da matriz final.</small></div>
          <div class="info-card"><strong>Quem quer prova, nao reconhecimento</strong><small>O app nao da dominio alto sem escalonamento, parametros, homogeneos e Boss Final.</small></div>
        </div>
      </section>

      <section class="readiness-card" aria-labelledby="progress-title">
        <span class="pill">Gamificacao a servico do dominio</span>
        <h2 id="progress-title">Seu progresso</h2>
        <div class="metric-grid">
          <div><strong>${metrics.progressPercent}%</strong><span>Progresso do app</span></div>
          <div><strong>${metrics.estimatedMastery}%</strong><span>Dominio estimado - teto ${metrics.masteryCap}%</span></div>
          <div><strong>${metrics.operationalConfidence}</strong><span>Confianca operacional</span></div>
        </div>
        <div class="progress-legend">
          <strong>Legenda</strong>
          <small>XP registra pratica feita. Sequencia mede acertos seguidos. Medalhas marcam habilidades dominadas. Nada disso substitui resolver no quadro.</small>
        </div>
        <p><strong>Risco principal:</strong> ${metrics.risk}.</p>
        <p><strong>Proximo treino:</strong> ${metrics.nextTraining}.</p>
      </section>

      <section class="pedagogy-card">
        <span class="pill">Quadro</span>
        <h2>Seu progresso</h2>
        <p>Proximo sistema recomendado: <strong>Sistema ${String(currentSystem.number).padStart(2, "0")} - ${currentSystem.title}</strong>.</p>
        <div class="board-main-actions" aria-label="Acoes principais">
          ${menuButton("Continuar no Quadro", "Seu progresso: resolver o proximo sistema com conta e conclusao", "board")}
          ${menuButton("Folha em Branco", "Lista 11 como prova: sem alternativas, com raciocinio escrito", "blankSheet")}
          ${menuButton("Diagnostico", "Descubra seu ponto de partida", "diagnostic")}
          ${menuButton("Boss", "Desafio final", "bossFinalBoard")}
          ${menuButton("Grimorio", "Teoria, formulas e exemplos", "grimoire")}
        </div>
      </section>

      <details class="extras-panel">
        <summary>Treinos auxiliares e consulta</summary>
        <div class="menu-grid compact-menu">
          ${menuButton("Escalonamento rapido", "Apoio operacional curto", "escalonamentoSemQuadro")}
          ${menuButton("Discussao SPD/SPI/SI", "Apoio de classificacao", "discussaoSistemas")}
          ${menuButton("Lista 11 Total", "Revisao misturada", "lista11Total")}
          ${menuButton("Minha folha ficou confusa", "Organizar resposta de prova em blocos", "blankSheetMessy")}
          ${menuButton("Grimorio", "Consulta rapida", "grimoire")}
          ${menuButton("Relatorio", "Prontidao real para prova", "readinessReport")}
        </div>
      </details>
    </section>
  `);
}

function proofModeCard(mode, data) {
  const done = state.modeProgress?.[mode] || 0;
  const total = data.items.length;
  const progress = Math.round((Math.min(done, total) / total) * 100);
  return `
    <button class="proof-card" data-mode="${mode}">
      <span class="eyebrow">${done >= total ? "concluido" : `progresso ${done}/${total}`}</span>
      <strong>${data.title}</strong>
      <small>${data.subtitle}</small>
      <span class="bar"><span style="width:${progress}%"></span></span>
    </button>
  `;
}

function menuButton(title, sub, mode, locked = false) {
  return `<button class="game-button ${locked ? "locked" : ""}" type="button" data-mode="${mode}" ${locked ? "data-locked='boss'" : ""}><strong>${title}</strong><small>${sub}</small></button>`;
}

function proofMode(mode, index = state.modeProgress?.[mode] || 0) {
  const config = PROOF_MODES[mode];
  if (!config) return home();
  const safeIndex = Math.max(0, Math.min(index, config.items.length - 1));
  if ((state.modeProgress?.[mode] || 0) >= config.items.length) return proofModeResult(mode);
  screen = { mode, index: safeIndex, boss: "mixed", score: 0, errors: [], item: null };
  renderMission(mode, config.items[safeIndex], safeIndex, config.items.length, {
    kicker: config.title,
    doneLabel: "Ver resultado do modo"
  });
}

function proofModeResult(mode) {
  const config = PROOF_MODES[mode];
  if (!config) return home();
  screen = { mode: `${mode}Result`, index: 0, boss: "mixed", score: 0, errors: [], item: null };
  complete(config.finishId);
  if (mode === "lista11Total") {
    state.lista11TotalAttempts.push({ date: new Date().toISOString(), completed: config.items.length });
    state.lista11TotalAttempts = state.lista11TotalAttempts.slice(-12);
    saveState();
  }
  setStage(`
    <section class="panel stack">
      <span class="pill">${config.title}</span>
      <h2>${config.done}</h2>
      <p>Isso conta mais que acertar pergunta conceitual: voce treinou execucao em passos reais.</p>
      <div class="mission-list">
        <div class="mission-card"><strong>${config.items.length}</strong><small>decisoes treinadas</small></div>
        <div class="mission-card"><strong>${currentFocusText()}</strong><small>proximo foco sugerido</small></div>
      </div>
      <div class="actions">
        <button class="primary" data-mode="home">Voltar aos 3 modos</button>
        <button class="secondary" data-mode="${mode}Reset">Refazer este modo</button>
        <button class="secondary" data-mode="grimoire">Abrir Grimorio</button>
      </div>
    </section>
  `);
}

function advanceProofProgress(mode, index) {
  state.modeProgress[mode] = Math.max(state.modeProgress?.[mode] || 0, index + 1);
  if (mode === "lista11Total") state.lastMode = "lista11Total";
}

const BOARD_STEP_COUNT = 6;

function nextBoardPosition(currentState = state) {
  const currentIndex = Math.max(0, Math.min(currentState.boardProgress?.systemIndex || 0, LISTA11_SYSTEMS.length - 1));
  const currentSystem = LISTA11_SYSTEMS[currentIndex];
  if (currentSystem && !currentState.completedBoardModeSystems?.includes(currentSystem.id)) {
    return { systemIndex: currentIndex, stepIndex: Math.max(0, Math.min(currentState.boardProgress?.stepIndex || 0, BOARD_STEP_COUNT - 1)) };
  }
  const nextIndex = LISTA11_SYSTEMS.findIndex((system) => !currentState.completedBoardModeSystems?.includes(system.id));
  return { systemIndex: nextIndex === -1 ? LISTA11_SYSTEMS.length - 1 : nextIndex, stepIndex: 0 };
}

function boardLevelForSystem(systemIndex) {
  if (systemIndex < 3) return "Quadro guiado";
  if (systemIndex < 8) return "Quadro semi-guiado";
  if (systemIndex < 15) return "Quadro sem dica parcial";
  return "Correcao de professor";
}

function boardNextStepText(stepIndex) {
  return [
    "Agora escolha a estrategia antes de operar.",
    "Agora coloque no quadro o determinante/caso critico ou a primeira conta relevante.",
    "Agora investigue o caso especial; nao pare no determinante.",
    "Agora classifique por posto, contradicao ou variavel livre.",
    "Agora escreva a conclusao no modelo de prova.",
    "Agora refaca sem olhar a conta inteira."
  ][stepIndex] || "Continue a resolucao no quadro.";
}

function boardNotesFor(system) {
  const parameterLine = system.parameterStatus === "fixed"
    ? "Neste item, o parametro ja foi substituido. Agora e sistema numerico, lousa e escalonamento."
    : system.parameterStatus === "symbolic" || system.tags.includes("parametro")
      ? "Se aparecer parametro livre, separe caso antes de dividir."
      : "Use a matriz aumentada para decidir SPD, SPI ou SI.";
  return [
    "Escreva cada operacao antes da conta.",
    "Atualize a linha inteira, inclusive depois da barra.",
    parameterLine
  ].map((line) => `<li>${line}</li>`).join("");
}

function boardDefaultFullSolution(system) {
  return String.raw`
    <div class="deep-solution">
      <h4>1. Matriz aumentada</h4>
      <div class="math-box">${system.matrix}</div>
      <h4>2. Estrategia</h4>
      <p>${system.strategy}</p>
      <h4>3. Determinante ou conta-chave</h4>
      <p>${system.determinant}</p>
      <p>${system.critical}</p>
      <h4>4. Interpretação da matriz final</h4>
      <p>${system.care}</p>
      <h4>5. Conclusão SPD/SPI/SI</h4>
      <p>${system.proofConclusion}</p>
    </div>
  `;
}

function boardWhyLayers(system) {
  if (system.whyLayers) return system.whyLayers;
  return String.raw`
    <div class="why-layers">
      <h4>Camada 1 — Tradução humana</h4>
      <p>Voce nao esta decorando resposta. Voce esta descobrindo se o sistema tem pivos suficientes, contradicao ou variavel livre.</p>
      <h4>Camada 2 — Conta no quadro</h4>
      <p>${system.determinant} ${system.critical}</p>
      <h4>Camada 3 — Relação com SPD/SPI/SI</h4>
      <p>Se ha pivo para todas as variaveis, SPD. Se nao ha contradicao e sobra variavel livre, SPI. Se aparece linha contraditoria, SI.</p>
      <h4>Camada 4 — Erro comum</h4>
      <p>${system.commonError}</p>
      <h4>Camada 5 — Mini-teste</h4>
      <p>Se \(\det(A)=0\) em sistema nao homogeneo, voce ja pode concluir SPI?</p>
      <p><strong>Resposta:</strong> nao. Precisa escalonar a matriz aumentada e verificar se aparece SPI ou SI.</p>
    </div>
  `;
}

function boardCorrectFeedback(system, stepIndex, shortFeedback) {
  const account = system.deepExplanation || String.raw`
    <p>${system.determinant}</p>
    <p>${system.critical}</p>
    <p>${system.strategy}</p>
  `;
  return String.raw`
    <div class="deep-feedback">
      <h4>Resposta curta</h4>
      <p>Voce acertou. ${shortFeedback}</p>
      <p><strong>Conclusao:</strong> ${system.conclusion}</p>
      <h4>Por que?</h4>
      <p>${system.proofConclusion}</p>
      <h4>Conta no quadro</h4>
      ${account}
      <h4>Armadilha</h4>
      <p>${system.commonError}</p>
      <h4>Modelo de prova</h4>
      <p>${system.proofConclusion}</p>
      <h4>Proximo passo</h4>
      <p>${boardNextStepText(stepIndex)}</p>
      ${system.miniTest || ""}
    </div>
  `;
}

function boardStepItem(system, stepIndex) {
  const common = {
    origin: system.origin,
    difficulty: system.difficulty,
    statement: system.statement,
    matrix: system.matrix,
    mission: system.mission || system.strategy || system.typeLabel,
    fullSolution: system.fullBoardSolution || boardDefaultFullSolution(system),
    why: boardWhyLayers(system),
    boardSystemId: system.id,
    boardStep: stepIndex
  };
  const typeWrong = system.tags.includes("homogeneo")
    ? ["Sistema nao homogeneo comum.", "Nao da para saber porque a matriz tem letras."]
    : system.tags.includes("parametro")
      ? ["Sistema homogeneo sem parametro.", "Sistema ja resolvido, basta copiar a resposta."]
      : ["Sistema com parametro ainda nao fixado.", "Questao so de conceito, sem conta."];
  const typeFeedbackWrong = system.tags.includes("homogeneo")
    ? "Erro de leitura: no homogeneo, o lado direito e zero; a matriz dos coeficientes nao precisa ser zero."
    : system.tags.includes("parametro")
      ? "Cuidado: ha parametro no enunciado, entao a classificacao pode depender de casos."
      : "Aqui o parametro ja foi fixado ou nao existe; o gargalo e executar escalonamento e concluir.";
  const templates = [
    {
      key: "tipo",
      title: "Leitura do enunciado",
      skill: "interpretacao de enunciado",
      errorType: "conceptual",
      question: "Que tipo de questao esta na lousa?",
      choices: [system.typeLabel, ...typeWrong],
      feedbacks: [
        "Boa leitura. Antes de operar, voce identificou o monstro.",
        typeFeedbackWrong,
        "Isso pularia a parte que a Lista 11 realmente cobra: discutir ou resolver com criterio."
      ]
    },
    {
      key: "estrategia",
      title: "Escolha da estrategia",
      skill: system.tags.includes("parametro") ? "parameterCaseSplit" : "matrixSetup",
      errorType: system.tags.includes("parametro") ? "missingCaseSplit" : "organization",
      question: "Qual e o primeiro plano seguro?",
      choices: [
        system.strategy,
        "Chutar SPD porque a matriz parece grande.",
        "Procurar a resposta final sem montar matriz aumentada."
      ],
      feedbacks: [
        "Certo. A estrategia vem antes da conta.",
        "Isso e conclusao sem prova. A professora vai cobrar justificativa.",
        "Sem matriz/estrategia, a escrita nao fica auditavel."
      ]
    },
    system.parameterStatus === "fixed" ? {
      key: "primeira-operacao",
      title: "Primeira operacao no quadro",
      skill: "rowOperations",
      errorType: "arithmetic",
      question: "Qual operacao deve entrar no quadro agora?",
      choices: [
        system.firstOperation || "L_2 <- L_2 - 2L_1",
        ...(system.firstOperationWrongChoices.length ? system.firstOperationWrongChoices : ["L_2 <- L_2 + 2L_1", "Nao preciso mexer no lado direito da barra."])
      ],
      feedbacks: [
        system.firstOperationFeedbacks[0] || "Certo. Agora o parametro ja foi fixado; a missao e escalonar o sistema numerico.",
        system.firstOperationFeedbacks[1] || "Sinal errado: essa operacao nao zera a entrada-alvo.",
        system.firstOperationFeedbacks[2] || "Erro de organizacao: a operacao de linha vale para a linha inteira, inclusive depois da barra."
      ]
    } : {
      key: "determinante-caso",
      title: "Determinante ou caso critico",
      skill: system.tags.includes("homogeneo") ? "homogeneousSystems" : system.tags.includes("parametro") ? "determinantUse" : "rowOperations",
      errorType: system.tags.includes("homogeneo") ? "homogeneousConfusion" : system.tags.includes("parametro") ? "determinantMisuse" : "arithmetic",
      question: "Qual informacao deve entrar no quadro agora?",
      choices: [
        `${system.determinant} ${system.critical}`,
        "det(A)=0, logo SPI automaticamente.",
        "Nao preciso olhar o lado direito depois da barra."
      ],
      feedbacks: [
        "Certo. Esse e o radar da discussao, nao a resposta por si so.",
        "Conclusao precipitada: em sistema nao homogeneo, det zero pode virar SPI ou SI.",
        "Erro grave de organizacao: o lado direito decide consistencia."
      ]
    },
    {
      key: "cuidado",
      title: "Anti-vacilo da etapa",
      skill: system.tags.includes("parametro") ? "parameterCaseSplit" : system.tags.includes("homogeneo") ? "homogeneousSystems" : "arithmeticControl",
      errorType: system.tags.includes("parametro") ? "parameterDivision" : system.tags.includes("homogeneo") ? "homogeneousConfusion" : "organization",
      question: "Qual cuidado evita perder ponto aqui?",
      choices: [
        system.care,
        "Misturar duas operacoes de linha sem indicar.",
        "Concluir assim que aparecer uma linha 0 0 0 | 0."
      ],
      feedbacks: [
        "Certo. Esse e o cuidado que separa treino bonito de prova auditavel.",
        "Isso deixa a resolucao suspeita. Escreva cada operacao.",
        "Linha nula sozinha nao conclui SPI; precisa comparar posto e variaveis."
      ]
    },
    {
      key: "classificacao",
      title: "Classificacao e posto",
      skill: "rankDiscussion",
      errorType: system.tags.includes("contradicao") ? "ignoredContradiction" : system.tags.includes("variavelLivre") ? "missingFreeVariable" : "conclusion",
      question: "Qual leitura formal combina com o resultado?",
      choices: [
        system.conclusion,
        "det(A)=0, entao sempre SPI.",
        "Se apareceu parametro, nao da para concluir nada."
      ],
      feedbacks: [
        "Certo. A classificacao esta ligada ao que a matriz aumentada mostra.",
        "Esse e o erro classico: det zero obriga investigar, nao classifica sozinho.",
        "Da para concluir, mas por casos bem escritos."
      ]
    },
    {
      key: "conclusao",
      title: "Conclusao de prova",
      skill: "writtenConclusion",
      errorType: "conclusion",
      question: "Qual conclusao voce escreveria na prova?",
      choices: [
        system.proofConclusion,
        "Resposta: valor critico encontrado.",
        "Acho que da certo porque tem uma linha nula."
      ],
      feedbacks: [
        "Boa. Isso e conclusao auditavel: caso, criterio e classificacao.",
        "Incompleto. Valor critico nao e classificacao do sistema.",
        "Nao basta intuicao. Precisa dizer SPD/SPI/SI, posto/contradicao/variavel livre."
      ]
    }
  ];
  const selected = templates[stepIndex] || templates[0];
  const feedbacks = selected.choices.map((_, optionIndex) => optionIndex === 0
    ? boardCorrectFeedback(system, stepIndex, selected.feedbacks[0])
    : (selected.feedbacks[optionIndex] || "Ainda nao. Leia a questao cobrada e refaca a conta no quadro.")
  );
  return {
    ...common,
    id: `${system.id}-board-${selected.key}`,
    title: selected.title,
    origin: system.origin,
    skill: selected.skill,
    errorType: selected.errorType,
    type: "modo quadro",
    data: system.matrix,
    explain: selected.key === "tipo" ? "Leia antes de operar. A Lista 11 cobra escolher o metodo certo." : system.care,
    question: selected.question,
    choices: selected.choices,
    answer: 0,
    feedback: feedbacks[0],
    feedbacks,
    commonError: system.commonError,
    fullSolution: system.fullBoardSolution || boardDefaultFullSolution(system)
  };
}

function renderBoardMode(systemIndex = state.boardProgress?.systemIndex || 0, stepIndex = state.boardProgress?.stepIndex || 0) {
  const safeSystemIndex = Math.max(0, Math.min(systemIndex, LISTA11_SYSTEMS.length - 1));
  const safeStep = Math.max(0, Math.min(stepIndex, BOARD_STEP_COUNT - 1));
  const system = LISTA11_SYSTEMS[safeSystemIndex];
  const item = boardStepItem(system, safeStep);
  state.currentSystemId = system.id;
  state.currentPhase = "modo-quadro";
  screen = {
    mode: "board",
    index: safeStep,
    systemIndex: safeSystemIndex,
    boss: "mixed",
    score: 0,
    errors: [],
    item,
    hintUsed: false
  };
  const metrics = progressMetrics();
  const globalProgress = Math.round(((safeSystemIndex * BOARD_STEP_COUNT + safeStep + 1) / (LISTA11_SYSTEMS.length * BOARD_STEP_COUNT)) * 100);
  setStage(`
    <section class="board-shell">
      <header class="board-top">
        <div>
          <span class="pill">${boardLevelForSystem(safeSystemIndex)}</span>
          <h2>Sistema ${String(system.number).padStart(2, "0")} — ${system.title}</h2>
          <p>${system.origin} · passo ${safeStep + 1}/${BOARD_STEP_COUNT}</p>
        </div>
        <div class="progress-block">
          <span>Progresso da lousa: ${globalProgress}%</span>
          <div class="bar"><span style="width:${globalProgress}%"></span></div>
        </div>
      </header>

      <div class="board-metrics">
        <span>Progresso: ${metrics.progressPercent}%</span>
        <span>Dominio estimado: ${metrics.estimatedMastery}%</span>
        <span>Confianca: ${metrics.operationalConfidence}</span>
      </div>

      <article class="board-panel">
        <h3>Enunciado</h3>
        <div class="math-box">${system.statement}</div>
      </article>

      <article class="board-panel">
        <h3>Matriz aumentada</h3>
        <div class="math-box">${system.matrix}</div>
      </article>

      <article class="board-panel">
        <h3>Quadro de operacoes</h3>
        <ul class="board-notes">
          ${boardNotesFor(system)}
        </ul>
      </article>

      <article class="board-panel focus-panel">
        <h3>Proximo passo do aluno</h3>
        ${sourceChip(item)}
        ${questionSnapshotBlock(item)}
        <p>${item.explain}</p>
        <div class="choices">
          <p><strong>${item.question}</strong></p>
          ${item.choices.map((choice, i) => `<button class="choice" type="button" data-answer="${i}">${choice}</button>`).join("")}
        </div>
        <button class="secondary quiet" data-why="why-board-${system.id}-${safeStep}">Nao entendi / por que?</button>
        <div id="why-board-${system.id}-${safeStep}" class="feedback">${item.why}</div>
      </article>

      <article class="board-panel">
        <h3>Diagnostico do erro</h3>
        <div id="feedback" class="feedback" role="status" aria-live="polite">Ainda sem resposta. O app vai separar erro conceitual, aritmetico, organizacao e conclusao.</div>
      </article>

      <article class="board-panel">
        <h3>Conclusao de prova esperada</h3>
        <p class="tiny">${safeStep < BOARD_STEP_COUNT - 1 ? "A conclusao completa aparece depois da tentativa. Antes disso, tente decidir a etapa." : system.proofConclusion}</p>
      </article>

      <div class="actions">
        <button class="primary" data-next="board" disabled>${safeStep === BOARD_STEP_COUNT - 1 ? "Fechar sistema" : "Proximo passo"}</button>
        <button class="secondary" data-repeat="board">Refazer passo</button>
        <button class="secondary" data-mode="home">Menu</button>
      </div>
    </section>
  `);
}

function recordProofSkill(skill, amount = 8) {
  if (!state.proofSkills) state.proofSkills = { ...defaultState.proofSkills };
  state.proofSkills[skill] = Math.max(0, Math.min(100, (state.proofSkills[skill] || 0) + amount));
}

function recordProofError(errorType = "conceptual") {
  const map = {
    conceptual: "conceptual",
    arithmetic: "arithmetic",
    aritmetico: "arithmetic",
    organization: "organization",
    organizacao: "organization",
    conclusion: "conclusion",
    conclusao: "conclusion",
    parameterDivision: "parameterDivision",
    missingCaseSplit: "missingCaseSplit",
    homogeneousConfusion: "homogeneousConfusion",
    prematureSPI: "prematureSPI",
    ignoredContradiction: "ignoredContradiction",
    missingFreeVariable: "missingFreeVariable",
    determinantMisuse: "determinantMisuse"
  };
  const key = map[errorType] || "conceptual";
  state.errorProfile[key] = (state.errorProfile[key] || 0) + 1;
}

function advanceBoardProgress(correct, item) {
  const system = LISTA11_SYSTEMS[screen.systemIndex];
  state.boardProgress = {
    systemIndex: screen.systemIndex,
    stepIndex: Math.min(screen.index + 1, BOARD_STEP_COUNT - 1)
  };
  state.currentSystemId = system.id;
  state.currentPhase = "modo-quadro";
  state.boardAttempts = [
    ...(state.boardAttempts || []),
    {
      date: new Date().toISOString(),
      systemId: system.id,
      step: screen.index,
      correct,
      skill: item.skill,
      errorType: item.errorType,
      usedHint: !!screen.hintUsed
    }
  ].slice(-160);
  if (correct) recordProofSkill(item.skill, screen.hintUsed ? 4 : 9);
  else recordProofError(item.errorType);
  if (screen.index === BOARD_STEP_COUNT - 1 && correct) {
    if (!state.completedSystems.includes(system.id)) state.completedSystems.push(system.id);
    if (!state.completedBoardModeSystems.includes(system.id)) state.completedBoardModeSystems.push(system.id);
    if (!screen.hintUsed && !state.completedWithoutHints.includes(system.id)) state.completedWithoutHints.push(system.id);
    if (system.tags?.includes("lista11-total")) complete(`board-${system.id}`);
    if (system.number >= 15) complete("board-lista11-total-marker");
  }
}

function boardSystemResult(systemIndex = screen.systemIndex) {
  const system = LISTA11_SYSTEMS[systemIndex] || LISTA11_SYSTEMS[0];
  const solved = state.completedBoardModeSystems.includes(system.id);
  const nextIndex = Math.min(systemIndex + 1, LISTA11_SYSTEMS.length - 1);
  const metrics = progressMetrics();
  setStage(`
    <section class="panel stack readiness-report">
      <span class="pill">Sistema ${String(system.number).padStart(2, "0")}</span>
      <h2>${solved ? "Sistema fechado no quadro" : "Tentativa registrada"}</h2>
      <p>${solved ? "Boa. Isso conta para dominio real, porque voce passou por leitura, estrategia, caso e conclusao." : "Ainda nao vou contar como dominio. Voce viu a correcao, mas precisa refazer sem tropeçar."}</p>
      <div class="mission-list">
        <div class="mission-card"><strong>${metrics.progressPercent}%</strong><small>progresso do app</small></div>
        <div class="mission-card"><strong>${metrics.estimatedMastery}%</strong><small>dominio estimado</small></div>
        <div class="mission-card"><strong>${metrics.operationalConfidence}</strong><small>confianca operacional</small></div>
      </div>
      <div class="feedback show ${solved ? "success" : "danger"}">
        <strong>Risco principal:</strong> ${metrics.risk}.<br>
        <strong>Proximo treino:</strong> ${metrics.nextTraining}.
      </div>
      <div class="actions">
        <button class="primary" data-board-go="${solved && systemIndex < LISTA11_SYSTEMS.length - 1 ? nextIndex : systemIndex}">${solved && systemIndex < LISTA11_SYSTEMS.length - 1 ? "Proximo sistema" : "Refazer no quadro"}</button>
        <button class="secondary" data-mode="bossFinalBoard">Ir para Boss Final</button>
        <button class="secondary" data-mode="readinessReport">Relatorio de prontidao</button>
      </div>
    </section>
  `);
}

function readinessReport() {
  const metrics = progressMetrics();
  const req = metrics.requirements;
  setStage(`
    <section class="panel stack readiness-report">
      <span class="pill">Relatorio honesto</span>
      <h2>Prontidao para prova</h2>
      <p><strong>100% de progresso nao e 100% de dominio.</strong> O app mede as duas coisas separadamente.</p>
      <div class="mission-list">
        <div class="mission-card"><strong>${metrics.progressPercent}%</strong><small>progresso</small></div>
        <div class="mission-card"><strong>${metrics.estimatedMastery}%</strong><small>dominio estimado · teto ${metrics.masteryCap}%</small></div>
        <div class="mission-card"><strong>${metrics.operationalConfidence}</strong><small>confianca operacional</small></div>
      </div>
      <div class="readiness-grid">
        ${Object.entries({
          "conceitos basicos": req.concepts,
          "2 escalonamentos medios": req.twoMediumEscalations,
          "sistema com parametro": req.parameterSystem,
          "discussao SPD/SPI/SI": req.classification,
          "homogeneo": req.homogeneous,
          "conclusao escrita": req.writtenConclusion,
          "Boss Final sem dica": req.bossFinal
        }).map(([label, done]) => `<div class="readiness-item ${done ? "ok" : "warn"}"><strong>${done ? "OK" : "Falta"}</strong><span>${label}</span></div>`).join("")}
      </div>
      <div class="feedback show">
        <strong>Risco principal:</strong> ${metrics.risk}.<br>
        <strong>Proximo treino:</strong> ${metrics.nextTraining}.
      </div>
      <div class="actions">
        <button class="primary" data-mode="board">Resolver no quadro</button>
        <button class="secondary" data-mode="bossFinalBoard">Boss Final</button>
        <button class="secondary" data-mode="home">Menu</button>
      </div>
    </section>
  `);
}

const BOSS_FINAL_SYSTEM_IDS = [
  "s02-l11-1b-lambda-mu",
  "s04-l11-1d-hom-lambda",
  "s06-l11-2b-m2",
  "s10-l11-3c-alpha-minus1",
  "s19-der-param-spi",
  "s20-der-param-si"
];

function bossFinalItem(index) {
  const system = systemById(BOSS_FINAL_SYSTEM_IDS[index]) || LISTA11_SYSTEMS[index];
  const prompts = [
    "Discuta o sistema com parametro e escreva a conclusao completa.",
    "Identifique o comportamento do sistema homogeneo.",
    "Resolva o escalonamento numerico e conclua SPD/SPI/SI.",
    "Decida se apareceu SI e justifique por posto/contradicao.",
    "Reconheca o caso SPI sem concluir cedo demais.",
    "Compare com o caso SPI e explique por que agora e SI."
  ];
  return {
    id: `boss-final-${system.id}`,
    origin: system.origin,
    difficulty: 3,
    title: `Boss Final ${index + 1}/6 — Sistema ${String(system.number).padStart(2, "0")}`,
    skill: index === 1 ? "homogeneousSystems" : index >= 3 ? "rankDiscussion" : "writtenConclusion",
    errorType: index === 1 ? "homogeneousConfusion" : index >= 3 ? "conclusion" : "organization",
    type: "boss final",
    data: `${system.statement}${system.matrix}`,
    explain: "Sem dica direta. Primeiro identifique, depois resolva e conclua como prova.",
    question: prompts[index] || "Qual conclusao final e correta?",
    choices: [
      system.proofConclusion,
      "det(A)=0, portanto SPI automaticamente.",
      "Valor critico encontrado; isso ja basta como resposta."
    ],
    answer: 0,
    feedback: "Certo. Essa resposta tem criterio e conclusao de prova.",
    feedbacks: [
      "Certo. Essa resposta tem criterio e conclusao de prova.",
      "Erro conceitual: det(A)=0 nao classifica sozinho sistema nao homogeneo.",
      "Incompleto: valor critico e etapa, nao conclusao final."
    ],
    fullSolution: system.proofConclusion,
    why: "No Boss Final, usar dica derruba a validacao de dominio maximo."
  };
}

function bossFinalBoard(index = 0, score = 0, errors = []) {
  const total = BOSS_FINAL_SYSTEM_IDS.length;
  const safeIndex = Math.max(0, Math.min(index, total - 1));
  const item = bossFinalItem(safeIndex);
  screen = { mode: "bossFinalBoard", index: safeIndex, boss: "final", score, errors, item, hintUsed: false };
  setStage(`
    <section class="board-shell boss-board">
      <header class="board-top">
        <div>
          <span class="pill">Boss Final</span>
          <h2>${item.title}</h2>
          <p>Voce passou do tutorial. Agora vamos ver se aguenta prova.</p>
        </div>
        <div class="progress-block">
          <span>${safeIndex + 1}/${total}</span>
          <div class="bar"><span style="width:${((safeIndex + 1) / total) * 100}%"></span></div>
        </div>
      </header>
      <div class="board-metrics">
        <span>Sem dica direta</span>
        <span>Sem porcentagem fake</span>
        <span>Conclusao escrita obrigatoria</span>
      </div>
      <article class="board-panel">
        <h3>Enunciado e matriz</h3>
        <div class="math-box">${item.data}</div>
      </article>
      <article class="board-panel focus-panel">
        <h3>Resposta de prova</h3>
        ${questionSnapshotBlock(item)}
        <p>${item.explain}</p>
        <div class="choices">
          <p><strong>${item.question}</strong></p>
          ${item.choices.map((choice, i) => `<button class="choice" type="button" data-answer="${i}">${choice}</button>`).join("")}
        </div>
      </article>
      <article class="board-panel">
        <h3>Diagnostico</h3>
        <div id="feedback" class="feedback" role="status" aria-live="polite">Responda antes de ver a correcao. Boss nao entrega caminho antes da tentativa.</div>
      </article>
      <div class="actions">
        <button class="primary" data-next="bossFinalBoard" disabled>${safeIndex === total - 1 ? "Ver relatorio final" : "Proximo boss"}</button>
        <button class="secondary" data-mode="board">Voltar ao Modo Quadro</button>
      </div>
    </section>
  `);
}

function bossFinalResult() {
  const total = BOSS_FINAL_SYSTEM_IDS.length;
  const passed = screen.score >= 5 && !(screen.errors || []).length;
  state.bossFinalAttempts = [
    ...(state.bossFinalAttempts || []),
    { date: new Date().toISOString(), score: screen.score, total, passed, usedHint: false, errors: screen.errors || [] }
  ].slice(-20);
  if (passed) {
    state.bossFinalPassed = true;
    complete("boss-final-lista11-board");
    award("boss");
  }
  saveState();
  const metrics = progressMetrics();
  setStage(`
    <section class="panel stack readiness-report">
      <span class="pill">Resultado do Boss Final</span>
      <h2>${passed ? "Boss vencido" : "Boss revelou o gargalo"}</h2>
      <p>${passed ? "Agora sim: voce provou resolucao pratica, discussao e conclusao sob pressao." : "Isso nao zera seu progresso. Ele mostra onde a prova ainda pode te pegar."}</p>
      <div class="mission-list">
        <div class="mission-card"><strong>${screen.score}/${total}</strong><small>acertos no Boss</small></div>
        <div class="mission-card"><strong>${metrics.estimatedMastery}%</strong><small>dominio estimado</small></div>
        <div class="mission-card"><strong>${metrics.operationalConfidence}</strong><small>confianca operacional</small></div>
      </div>
      <div class="feedback show ${passed ? "success" : "danger"}">
        <strong>Diagnostico honesto:</strong> ${passed ? "forte, mas mantenha revisao nos parametros." : metrics.risk}.<br>
        <strong>Proximo treino:</strong> ${passed ? "revisao fina dos Sistemas 02, 07, 11 e 20." : metrics.nextTraining}.
      </div>
      <div class="actions">
        <button class="primary" data-mode="readinessReport">Ver relatorio completo</button>
        <button class="secondary" data-mode="bossFinalBoard">Refazer Boss</button>
        <button class="secondary" data-mode="home">Menu</button>
      </div>
    </section>
  `);
}

function courseIds() {
  return new Set(COURSE_PATH.map((mission) => mission.id));
}

function getCourseCompletedCount() {
  const ids = courseIds();
  return state.completed.filter((id) => ids.has(id)).length;
}

function getNextCourseMissionIndex() {
  return COURSE_PATH.findIndex((mission) => !state.completed.includes(mission.id));
}

function getNextCourseMission() {
  const index = getNextCourseMissionIndex();
  return index === -1 ? null : COURSE_PATH[index];
}

function hasCourseProgress() {
  return getCourseCompletedCount() > 0;
}

function resetCourseProgress() {
  const ids = courseIds();
  state.completed = state.completed.filter((id) => !ids.has(id));
  state.optionalReview.foundations = false;
  saveState();
}

function nextMission() {
  const index = getNextCourseMissionIndex();
  if (index === -1) return { label: "Campanha concluída", mode: "campaignComplete" };
  if (state.adaptiveQueue?.length) {
    const key = state.adaptiveQueue[0];
    return { label: `Microcorrecao: ${CORRECTIVE_MISSIONS[key]?.title || key}`, mode: "journey" };
  }
  const item = COURSE_PATH[index];
  return { label: `${index + 1}/${COURSE_PATH.length}: ${item.title}`, mode: "journey" };
}

function renderMission(mode, data, index, total, options = {}) {
  const progress = Math.round(((index + 1) / total) * 100);
  setStage(`
    <section class="micro lesson-flow">
      ${courseHeader({ mode, data, index, total, progress, kicker: options.kicker })}
      ${sourceChip(data)}
      ${contextBlock(data)}
      ${conceptCard(data)}
      ${exerciseCard(data)}
      ${feedbackCard(mode, data, index, total, options)}
      ${mode === "journey" ? miniGrimoireLink() : ""}
    </section>
  `);
}

function journey(index = getNextCourseMissionIndex()) {
  if (state.adaptiveQueue?.length && index === getNextCourseMissionIndex()) {
    return adaptiveMission(state.adaptiveQueue[0]);
  }
  if (index < 0) return showCampaignComplete();
  screen = { mode: "journey", index, boss: "mixed", score: 0, errors: [], item: null };
  renderMission("journey", COURSE_PATH[index], index, COURSE_PATH.length, { doneLabel: "Ver conclusão" });
}

function adaptiveMission(key = state.adaptiveQueue?.[0]) {
  const data = CORRECTIVE_MISSIONS[key] || CORRECTIVE_MISSIONS.fundamentos;
  screen = { mode: "adaptive", index: 0, boss: "mixed", score: 0, errors: [], item: null, skillKey: key };
  renderMission("adaptive", data, 0, 1, { kicker: "Microtreino adaptativo", doneLabel: "Voltar para Jornada" });
}

function journeyMap() {
  screen = { mode: "journeyMap", index: 0, boss: "mixed", score: 0, errors: [], item: null };
  const nextIndex = getNextCourseMissionIndex();
  const completedCount = getCourseCompletedCount();
  const cards = COURSE_CHAPTERS.map((chapter) => {
    const missions = COURSE_PATH.map((mission, index) => ({ ...mission, index })).filter((mission) => mission.chapter === chapter);
    const done = missions.filter((mission) => state.completed.includes(mission.id)).length;
    const firstIncomplete = missions.find((mission) => !state.completed.includes(mission.id));
    const firstIndex = firstIncomplete?.index ?? missions[0]?.index ?? 0;
    const isComplete = done === missions.length;
    const isCurrent = nextIndex !== -1 && missions.some((mission) => mission.index === nextIndex);
    const isBlocked = nextIndex !== -1 && missions.every((mission) => mission.index > nextIndex);
    const status = isComplete ? "concluído" : isCurrent ? "atual" : isBlocked ? "bloqueado" : "disponível";
    return `
      <button class="chapter-card ${status}" ${isBlocked ? "disabled" : `data-course-jump="${firstIndex}"`}>
        <strong>${chapter}</strong>
        <small>${done}/${missions.length} missões · ${status}</small>
      </button>
    `;
  }).join("");
  setStage(`
    <section class="panel stack">
      <span class="pill">Mapa da Jornada</span>
      <h2>Campanha linear</h2>
      <p>A Jornada segue sempre a próxima missão não concluída. Lab, Duelos e Treino Infinito são academia de treino.</p>
      <div class="bar"><span style="width:${Math.round((completedCount / COURSE_PATH.length) * 100)}%"></span></div>
      <div class="campaign-map">${cards}</div>
      <div class="actions">
        <button class="primary" data-mode="journey">${nextIndex === -1 ? "Ver conclusão" : "Continuar jornada"}</button>
        <button class="secondary" data-mode="home">Menu</button>
      </div>
    </section>
  `);
}

function confirmRestartJourney() {
  if (!hasCourseProgress()) {
    resetCourseProgress();
    return journey(0);
  }
  setStage(`
    <section class="panel stack">
      <span class="pill">Reiniciar campanha</span>
      <h2>Começar do zero?</h2>
      <p>Isso reinicia apenas a campanha linear. XP, medalhas, histórico de Lab, Duelos e Treino Infinito ficam preservados.</p>
      <div class="actions">
        <button class="danger" data-confirm-reset-journey>Sim, reiniciar Jornada</button>
        <button class="secondary" data-mode="journey">Cancelar e continuar</button>
      </div>
    </section>
  `);
}

function resetDiagnosticOnly() {
  state.diagnostic = null;
  state.userProfile = null;
  state.lastRecommendation = null;
  state.adaptiveQueue = [];
  state.optionalReview = { ...state.optionalReview, skippedTo: null };
  saveState();
  home();
}

function showCampaignComplete() {
  screen = { mode: "campaignComplete", index: 0, boss: "mixed", score: 0, errors: [], item: null };
  const skills = [...new Set(COURSE_PATH.map((mission) => mission.skill))].slice(0, 12);
  setStage(`
    <section class="panel stack">
      <span class="pill">Campanha concluída</span>
      <h2>Campanha concluída</h2>
      <p>Você fechou a trilha principal de Sistemas Lineares. Agora os modos auxiliares viram revisão e velocidade.</p>
      <div class="mission-list">
        <div class="mission-card"><strong>${state.xp} XP</strong><small>XP total</small></div>
        <div class="mission-card"><strong>${state.medals.length}</strong><small>medalhas</small></div>
        <div class="mission-card"><strong>${state.bestStreak}</strong><small>melhor sequência</small></div>
      </div>
      <div class="feedback show"><strong>Habilidades dominadas:</strong> ${skills.join(", ")}.</div>
      <div class="actions">
        <button class="primary" data-mode="journeyMap">Revisar capítulos</button>
        <button class="secondary" data-mode="infinite">Treino Infinito</button>
        <button class="secondary" data-mode="finalBoss">Boss Final de novo</button>
      </div>
    </section>
  `);
}

function diagnosticMode(index = 0, score = 0, misses = [], answers = []) {
  screen = { mode: "diagnostic", index, score, errors: misses, answers, item: null };
  const item = diagnostic[index];
  setStage(`
    <section class="micro">
      <div class="module-header">
        <span class="pill">Chapéu Seletor</span>
        <h2>Triagem da Jornada Modo Guerra</h2>
        <div class="bar"><span style="width:${((index + 1) / diagnostic.length) * 100}%"></span></div>
      </div>
      <p>Responda para eu escolher sua entrada na Jornada. O objetivo e rota, nao nota bonita.</p>
      <p class="tiny"><strong>Habilidade avaliada:</strong> ${skillLabel(item.skill)}.</p>
      ${contextBlock(item)}
      ${questionSnapshotBlock(item)}
      <div class="choices">
        <p><strong>${item.q}</strong></p>
        ${item.c.map((choice, i) => `<button class="choice" type="button" data-answer="${i}">${choice}</button>`).join("")}
      </div>
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
      <div class="actions">
        <button class="primary" data-next="diagnostic" disabled>${index === diagnostic.length - 1 ? "Ver resultado" : "Proxima"}</button>
        <button class="secondary" data-mode="home">Sair</button>
      </div>
    </section>
  `);
}

function diagnosticResult(score, misses, answers = []) {
  const result = buildDiagnosticResult(answers);
  applyDiagnosticResult(result);
  showDiagnosticResult(result);
}

function showDiagnosticResult(result) {
  const recommendation = recommendNextMode(result);
  const weak = result.weakPoints?.length
    ? result.weakPoints.map(skillLabel).join(", ")
    : "nenhum ponto fraco grave detectado";
  const strong = result.strengths?.length
    ? result.strengths.map(skillLabel).join(", ")
    : "ainda vamos medir melhor durante a Jornada";
  const bySkill = Object.entries(result.bySkill || {})
    .filter(([, value]) => value.total > 0)
    .map(([skill, value]) => `
      <div class="mission-card compact">
        <strong>${skillLabel(skill)}</strong>
        <small>${value.correct}/${value.total} acertos</small>
      </div>
    `).join("");
  setStage(`
    <section class="panel stack diagnostic-report">
      <span class="pill">Resultado do Chapeu Seletor</span>
      <h2>${result.levelLabel || "Rota calibrada"}</h2>
      ${learningStepper("study")}
      <p><strong>Voce acertou ${result.score} de ${result.total}.</strong> Isso mede leitura rapida, nao dominio de prova.</p>
      <p class="tiny"><strong>Dominio estimado apos diagnostico:</strong> ${result.percent}% (teto atual: ${result.cap}%). Voce nao esta zerado, mas tambem nao esta blindado enquanto nao resolver no quadro, discutir parametros e passar pelo Boss Final.</p>
      <p>${result.message}</p>
      <div class="home-section">
        <h2>Feedback por objetivo</h2>
        <div class="info-grid">
          <div class="info-card"><strong>O que voce domina</strong><small>${strong}</small></div>
          <div class="info-card"><strong>O que precisa revisar</strong><small>${weak}</small></div>
          <div class="info-card"><strong>Proximo passo recomendado</strong><small>${recommendation.missionTitle || result.recommendedRoute}</small></div>
        </div>
      </div>
      ${errorSummaryBlock(result.weakPoints?.map((skill) => `Revisar: ${skillLabel(skill)}`) || [], "Pontos de revisao do diagnostico")}
      <div class="mission-list">
        <div class="mission-card"><strong>Pontos fortes</strong><small>${strong}</small></div>
        <div class="mission-card"><strong>Pontos a treinar</strong><small>${weak}</small></div>
        <div class="mission-card"><strong>Proxima fase</strong><small>Fase ${result.recommendedStartPhase}: ${result.recommendedRoute}</small></div>
      </div>
      <div class="feedback show success">
        <strong>Missao recomendada:</strong> ${recommendation.missionTitle || result.recommendedRoute}.<br>
        O app marcou as telas anteriores como revisao opcional quando voce mostrou base suficiente.
      </div>
      <details class="solution" open>
        <summary>Mapa do diagnostico</summary>
        <div class="mission-list">${bySkill}</div>
      </details>
      <div class="actions">
        <button class="primary" data-mode="${recommendation.mode}">${recommendationLabel(recommendation.mode)}</button>
        <button class="secondary" data-mode="journeyMap">Ver mapa discreto</button>
        <button class="secondary" data-mode="home">Voltar ao menu</button>
      </div>
    </section>
  `);
}

function pocketStep({ id, title, matrix, q: prompt, choices, why, solution, skill = "escalonamento" }) {
  return { id, title, matrix, q: prompt, choices, why, solution, skill };
}

const POCKET_ESCALATIONS = [
  {
    id: "lista10-si",
    title: "Sistema I: termina em SI",
    origin: "Lista 10 sistema I",
    summary: "Pivo 1, linha por linha, ate aparecer [0,0,0|7].",
    steps: [
      pocketStep({
        id: "pivot",
        title: "Escolha o primeiro pivo",
        matrix: matrixTex([[1, 2, -1, -10], [3, 7, 2, -19], [5, 12, 5, -21]]),
        q: "Qual numero serve como primeiro pivo natural?",
        choices: [
          { t: "1 na linha 1", ok: true, f: "Certo: ele ja esta na primeira coluna e facilita zerar 3 e 5." },
          { t: "-10 depois da barra", ok: false, f: "Depois da barra e lado direito; nao e pivo de variavel." },
          { t: "7 na linha 2", ok: false, f: "O primeiro pivo deve ficar na primeira coluna da primeira linha ativa." }
        ],
        why: "Pivo e o numero de apoio usado para limpar a coluna abaixo.",
        solution: "<p>Primeira coluna: o 1 da primeira linha e o apoio mais simples.</p>"
      }),
      pocketStep({
        id: "targets",
        title: "Quais numeros precisam zerar?",
        matrix: matrixTex([[1, 2, -1, -10], [3, 7, 2, -19], [5, 12, 5, -21]]),
        q: "Abaixo do pivo 1, queremos zerar:",
        choices: [
          { t: "3 e 5", ok: true, f: "Certo: sao os numeros abaixo do pivo na primeira coluna." },
          { t: "2 e -1", ok: false, f: "Esses estao na linha do pivo, nao abaixo dele." },
          { t: "-19 e -21", ok: false, f: "Esses ficam depois da barra; tambem mudam, mas nao sao alvos de pivo." }
        ],
        why: "Escalonar e construir uma escada de zeros abaixo dos pivos.",
        solution: "<p>Na primeira coluna, abaixo do 1 aparecem 3 e 5.</p>"
      }),
      pocketStep({
        id: "op-l2",
        title: "Zerar o 3",
        matrix: String.raw`\[L_1=[1,2,-1|-10],\quad L_2=[3,7,2|-19]\]`,
        q: "Qual operacao zera o 3 da linha 2?",
        choices: [
          { t: String.raw`\(L_2\leftarrow L_2-3L_1\)`, ok: true, f: String.raw`Certo: \(3-3\cdot1=0\).` },
          { t: String.raw`\(L_2\leftarrow L_2+3L_1\)`, ok: false, f: String.raw`Sinal errado: \(3+3\cdot1=6\).` },
          { t: String.raw`\(L_1\leftarrow L_1-3L_2\)`, ok: false, f: "Linha errada: queremos substituir a linha 2." }
        ],
        why: "O 3 vem do numero que queremos zerar.",
        solution: fullResolution({
          objective: "zerar o primeiro termo da linha 2",
          operation: String.raw`\(L_2\leftarrow L_2-3L_1\)`,
          reason: String.raw`\(3-3\cdot1=0\)`,
          account: String.raw`\(3L_1=[3,6,-3|-30]\)`,
          result: String.raw`\(L_2-3L_1=[0,1,5|11]\)`,
          interpretation: "A linha 2 nova comeca com zero.",
          trap: "O lado direito tambem muda: -19-(-30)=11."
        })
      }),
      pocketStep({
        id: "3l1",
        title: "Calcule 3L1",
        matrix: String.raw`\[L_1=[1,2,-1|-10]\]`,
        q: String.raw`Quanto e \(3L_1\)?`,
        choices: [
          { t: rowTex([3, 6, -3, -30]), ok: true, f: "Certo: multiplicou a linha inteira." },
          { t: rowTex([3, 6, -3, -10]), ok: false, f: "Esqueceu de multiplicar o lado direito depois da barra." },
          { t: rowTex([1, 6, -3, -30]), ok: false, f: "Tambem precisa multiplicar o primeiro termo." }
        ],
        why: "Operacao de linha sempre mexe na linha inteira.",
        solution: String.raw`<p>\(3[1,2,-1|-10]=[3,6,-3|-30]\).</p>`
      }),
      pocketStep({
        id: "l2-result",
        title: "Subtraia entrada por entrada",
        matrix: String.raw`\[[3,7,2|-19]-[3,6,-3|-30]\]`,
        q: "Qual e a nova linha 2?",
        choices: [
          { t: rowTex([0, 1, 5, 11]), ok: true, f: "Certo: inclusive depois da barra." },
          { t: rowTex([0, 1, -1, 11]), ok: false, f: "Sinal no terceiro termo: 2-(-3)=5." },
          { t: rowTex([0, 1, 5, -49]), ok: false, f: "Erro de sinal: -19-(-30)=11, nao -49." }
        ],
        why: "Cada entrada da linha participa da conta.",
        solution: String.raw`<p>\([3,7,2|-19]-[3,6,-3|-30]=[0,1,5|11]\).</p>`
      }),
      pocketStep({
        id: "l3-result",
        title: "Zerar o 5",
        matrix: String.raw`\[L_3=[5,12,5|-21],\quad L_1=[1,2,-1|-10]\]`,
        q: String.raw`Depois de \(L_3\leftarrow L_3-5L_1\), a linha 3 vira:`,
        choices: [
          { t: rowTex([0, 2, 10, 29]), ok: true, f: "Certo: 5L1=[5,10,-5|-50]." },
          { t: rowTex([0, 2, 0, 29]), ok: false, f: "No terceiro termo: 5-(-5)=10." },
          { t: rowTex([0, 2, 10, -71]), ok: false, f: "Depois da barra: -21-(-50)=29." }
        ],
        why: "O multiplicador 5 vem do alvo abaixo do pivo.",
        solution: String.raw`<p>\(5L_1=[5,10,-5|-50]\).</p><p>\(L_3-5L_1=[0,2,10|29]\).</p>`
      }),
      pocketStep({
        id: "second-pivot",
        title: "Zerar abaixo do segundo pivo",
        matrix: matrixTex([[1, 2, -1, -10], [0, 1, 5, 11], [0, 2, 10, 29]]),
        q: "Qual operacao zera o 2 abaixo do pivo 1 da segunda coluna?",
        choices: [
          { t: String.raw`\(L_3\leftarrow L_3-2L_2\)`, ok: true, f: String.raw`Certo: \(2-2\cdot1=0\).` },
          { t: String.raw`\(L_3\leftarrow L_3+2L_2\)`, ok: false, f: String.raw`Isso faz \(2+2=4\), nao zero.` },
          { t: String.raw`\(L_2\leftarrow L_2-2L_3\)`, ok: false, f: "Linha errada: a linha 3 e o alvo." }
        ],
        why: "Agora o apoio e a linha 2.",
        solution: String.raw`<p>Como o alvo e 2 e o pivo e 1, usamos \(L_3-2L_2\).</p>`
      }),
      pocketStep({
        id: "final-row",
        title: "Interprete a linha final",
        matrix: matrixTex([[1, 2, -1, -10], [0, 1, 5, 11], [0, 0, 0, 7]]),
        q: String.raw`A linha \([0,0,0|7]\) quer dizer:`,
        choices: [
          { t: String.raw`\(0=7\), sistema impossivel`, ok: true, f: "Certo: apareceu contradicao." },
          { t: "variavel livre", ok: false, f: "Variavel livre aparece sem contradicao; aqui o lado direito e 7." },
          { t: "solucao unica", ok: false, f: "Nao pode haver solucao se uma linha exige 0=7." }
        ],
        why: "Essa e a linha que mata o Sistema I.",
        solution: String.raw`<p>\(0x_1+0x_2+0x_3=7\Rightarrow0=7\). Logo, SI e \(S=\varnothing\).</p>`
      })
    ]
  },
  {
    id: "pivot3-spd",
    title: "Pivo 3: sem fracao",
    origin: "Gerada no escopo da Lista 10",
    summary: "Treina a operacao sem fracao quando o pivo nao e 1.",
    steps: [
      pocketStep({
        id: "choose",
        title: "Escolha o pivo",
        matrix: matrixTex([[3, 1, -1, -10], [2, -1, -1, 6], [-4, 2, -5, 20]]),
        q: "Qual e o primeiro pivo?",
        choices: [
          { t: "3", ok: true, f: "Certo: ele abre a primeira coluna." },
          { t: "2", ok: false, f: "O 2 e alvo abaixo do pivo." },
          { t: "-10", ok: false, f: "Depois da barra nao e pivo." }
        ],
        why: "Nem todo pivo precisa ser 1.",
        solution: "<p>O pivo e 3. Vamos evitar fracao multiplicando a linha alvo.</p>"
      }),
      pocketStep({
        id: "l2-op",
        title: "Zerar o 2 sem fracao",
        matrix: String.raw`\[L_1=[3,1,-1|-10],\quad L_2=[2,-1,-1|6]\]`,
        q: "Qual operacao zera o 2?",
        choices: [
          { t: String.raw`\(L_2\leftarrow3L_2-2L_1\)`, ok: true, f: String.raw`Certo: \(3\cdot2-2\cdot3=0\).` },
          { t: String.raw`\(L_2\leftarrow2L_2-3L_1\)`, ok: false, f: String.raw`Da \(4-9=-5\), nao zero.` },
          { t: String.raw`\(L_2\leftarrow L_2-2L_1\)`, ok: false, f: String.raw`Da \(2-6=-4\), nao zero.` }
        ],
        why: String.raw`Formula sem fracao: \(L_{\text{alvo}}\leftarrow pL_{\text{alvo}}-aL_{\text{pivo}}\).`,
        solution: String.raw`<p>Aqui \(p=3\) e \(a=2\). Entao \(3L_2-2L_1\).</p>`
      }),
      pocketStep({
        id: "l2-calc",
        title: "Calcule a nova L2",
        matrix: String.raw`\[3L_2=[6,-3,-3|18],\quad 2L_1=[6,2,-2|-20]\]`,
        q: String.raw`Quanto e \(3L_2-2L_1\)?`,
        choices: [
          { t: rowTex([0, -5, -1, 38]), ok: true, f: "Certo: 18-(-20)=38." },
          { t: rowTex([0, -5, -1, -2]), ok: false, f: "Cuidado: o lado direito e 18-(-20), nao 18-20." },
          { t: rowTex([0, -1, -5, 38]), ok: false, f: "Voce trocou as entradas do meio." }
        ],
        why: "A conferencia do termo independente e o anti-vacilo aqui.",
        solution: String.raw`<p>\([6,-3,-3|18]-[6,2,-2|-20]=[0,-5,-1|38]\).</p>`
      }),
      pocketStep({
        id: "l3-op",
        title: "Zerar o -4",
        matrix: String.raw`\[L_3=[-4,2,-5|20],\quad L_1=[3,1,-1|-10]\]`,
        q: "Com p=3 e alvo a=-4, qual operacao sem fracao?",
        choices: [
          { t: String.raw`\(L_3\leftarrow3L_3+4L_1\)`, ok: true, f: String.raw`Certo: \(3(-4)+4(3)=0\).` },
          { t: String.raw`\(L_3\leftarrow3L_3-4L_1\)`, ok: false, f: String.raw`Isso da \(-12-12=-24\).` },
          { t: String.raw`\(L_3\leftarrow4L_3+3L_1\)`, ok: false, f: String.raw`Isso da \(-16+9=-7\).` }
        ],
        why: String.raw`Como \(a=-4\), subtrair \(aL_1\) vira somar \(4L_1\).`,
        solution: String.raw`<p>\(L_3\leftarrow3L_3-(-4)L_1=3L_3+4L_1\).</p>`
      }),
      pocketStep({
        id: "l3-result",
        title: "Nova L3",
        matrix: String.raw`\[3L_3=[-12,6,-15|60],\quad4L_1=[12,4,-4|-40]\]`,
        q: String.raw`Quanto e \(3L_3+4L_1\)?`,
        choices: [
          { t: rowTex([0, 10, -19, 20]), ok: true, f: "Certo." },
          { t: rowTex([0, 2, -11, 100]), ok: false, f: "Voce subtraiu em vez de somar." },
          { t: rowTex([0, 10, -19, 100]), ok: false, f: "Depois da barra: 60+(-40)=20." }
        ],
        why: "Quando o alvo e negativo, o sinal da operacao fica mais perigoso.",
        solution: String.raw`<p>\([-12,6,-15|60]+[12,4,-4|-40]=[0,10,-19|20]\).</p>`
      }),
      pocketStep({
        id: "second-column",
        title: "Zerar abaixo do segundo pivo",
        matrix: matrixTex([[3, 1, -1, -10], [0, -5, -1, 38], [0, 10, -19, 20]]),
        q: "Qual operacao zera o 10 usando o pivo -5?",
        choices: [
          { t: String.raw`\(L_3\leftarrow L_3+2L_2\)`, ok: true, f: String.raw`Certo: \(10+2(-5)=0\).` },
          { t: String.raw`\(L_3\leftarrow L_3-2L_2\)`, ok: false, f: String.raw`Isso da \(10-2(-5)=20\).` },
          { t: String.raw`\(L_2\leftarrow L_2+2L_3\)`, ok: false, f: "Linha errada: quem tem o 10 e L3." }
        ],
        why: "O sinal do pivo -5 muda a escolha.",
        solution: String.raw`<p>Queremos \(10+c(-5)=0\). Entao \(c=2\).</p>`
      }),
      pocketStep({
        id: "final",
        title: "Forma escalonada",
        matrix: matrixTex([[3, 1, -1, -10], [0, -5, -1, 38], [0, 0, -21, 96]]),
        q: "Essa forma final indica:",
        choices: [
          { t: "SPD: pivo nas tres variaveis", ok: true, f: "Certo: nao ha contradicao e ha pivo em x1, x2, x3." },
          { t: "SI: aparece 0=96", ok: false, f: "A ultima linha tem coeficiente -21 em x3, nao e 0=96." },
          { t: "SPI: x3 e livre", ok: false, f: "x3 tem pivo -21, entao nao e livre." }
        ],
        why: "Classificar vem depois de ler pivos e contradicoes.",
        solution: String.raw`<p>\(-21x_3=96\Rightarrow x_3=-\frac{32}{7}\). Ha pivo em todas as variaveis: SPD.</p>`
      })
    ]
  },
  {
    id: "generated-spi",
    title: "Sistema que termina em SPI",
    origin: "Gerada no escopo da Lista 10",
    summary: "Treina linha 0=0 e variavel livre sem confundir com SI.",
    steps: [
      pocketStep({
        id: "start",
        title: "Primeiro pivo",
        matrix: matrixTex([[1, 2, -1, 3], [2, 4, -2, 6], [0, 1, 1, 4]]),
        q: "Qual operacao mostra que a linha 2 e repetida?",
        choices: [
          { t: String.raw`\(L_2\leftarrow L_2-2L_1\)`, ok: true, f: "Certo: a linha 2 vira tudo zero." },
          { t: String.raw`\(L_2\leftarrow L_2+2L_1\)`, ok: false, f: "Sinal errado: isso dobra em vez de cancelar." },
          { t: String.raw`\(L_3\leftarrow L_3-L_1\)`, ok: false, f: "A linha 3 nao e multiplo direto da linha 1." }
        ],
        why: "Linha repetida costuma virar 0=0.",
        solution: String.raw`<p>\([2,4,-2|6]-2[1,2,-1|3]=[0,0,0|0]\).</p>`
      }),
      pocketStep({
        id: "swap",
        title: "Organizar a escada",
        matrix: matrixTex([[1, 2, -1, 3], [0, 0, 0, 0], [0, 1, 1, 4]]),
        q: "Para ficar escalonada, o que fazemos?",
        choices: [
          { t: String.raw`\(L_2\leftrightarrow L_3\)`, ok: true, f: "Certo: linha nula vai para baixo." },
          { t: String.raw`\(L_1\leftrightarrow L_2\)`, ok: false, f: "Isso colocaria linha nula no topo." },
          { t: "Nada: linha nula no meio e ideal", ok: false, f: "Forma escalonada deixa linhas nulas no fim." }
        ],
        why: "Escada limpa facilita ler pivos.",
        solution: String.raw`<p>Depois da troca: \([1,2,-1|3]\), \([0,1,1|4]\), \([0,0,0|0]\).</p>`
      }),
      pocketStep({
        id: "classify",
        title: "Classifique",
        matrix: matrixTex([[1, 2, -1, 3], [0, 1, 1, 4], [0, 0, 0, 0]]),
        q: "A matriz final e:",
        choices: [
          { t: "SPI: sem contradicao e x3 livre", ok: true, f: "Certo: nao ha pivo na terceira coluna." },
          { t: "SI: 0=0 e contradicao", ok: false, f: "0=0 nao e contradicao; e identidade." },
          { t: "SPD: tres pivos", ok: false, f: "So ha pivos em x1 e x2." }
        ],
        why: "0=0 nao derruba o sistema; variavel sem pivo gera infinitas.",
        solution: String.raw`<p>Como \(x_3\) nao tem pivo, tome \(x_3=t\). Entao \(x_2=4-t\) e \(x_1=-5+3t\).</p>`
      })
    ]
  }
];

function pocketHome() {
  screen = { mode: "pocketHome", index: 0, boss: "mixed", score: 0, errors: [], item: null };
  const cards = POCKET_ESCALATIONS.map((board, index) => `
    <button class="skill-card pocket-card" data-pocket-start="${index}">
      <strong>${board.title}</strong>
      <small>${board.summary}</small>
      <span>${board.steps.length} passos curtos</span>
    </button>
  `).join("");
  setStage(`
    <section class="panel stack lab-home">
      <span class="eyebrow">Quadro de Bolso</span>
      <h2>Sem lousa? Sem desculpa.</h2>
      <p>O celular quebra o escalonamento em decisoes pequenas: escolher pivo, calcular uma linha, conferir sinal e classificar.</p>
      <div class="skill-grid">${cards}</div>
      <button class="secondary" data-mode="home">Voltar</button>
    </section>
  `);
}

function pocketMode(boardIndex = 0, stepIndex = 0, score = 0, errors = []) {
  const board = POCKET_ESCALATIONS[boardIndex] || POCKET_ESCALATIONS[0];
  const item = board.steps[stepIndex];
  screen = { mode: "pocket", index: stepIndex, boardIndex, boss: "mixed", score, errors, item: null };
  const data = {
    id: item.id,
    title: item.title,
    chapter: `Quadro de Bolso - ${board.title}`,
    phase: `${stepIndex + 1}/${board.steps.length}`,
    origin: board.origin,
    skill: item.skill,
    difficulty: 3,
    type: "escalonamento completo",
    data: item.matrix,
    explain: item.why,
    question: item.q,
    choices: item.choices.map((choice) => choice.t),
    why: item.why
  };
  setStage(`
    <section class="micro lesson-flow">
      ${courseHeader({ mode: "pocket", data, index: stepIndex, total: board.steps.length, progress: Math.round(((stepIndex + 1) / board.steps.length) * 100), kicker: "Quadro de Bolso" })}
      ${sourceChip(data)}
      ${contextBlock(data)}
      ${conceptCard(data)}
      ${exerciseCard(data, "data-pocket-answer")}
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
      <div class="actions">
        <button class="primary" data-next="pocket" disabled>${stepIndex === board.steps.length - 1 ? "Fechar escalonamento" : "Proximo pedaco"}</button>
        <button class="secondary" data-repeat="pocket">Refazer passo</button>
        <button class="secondary" data-mode="pocketHome">Trocar sistema</button>
      </div>
    </section>
  `);
}

function answerPocket(selected) {
  const board = POCKET_ESCALATIONS[screen.boardIndex] || POCKET_ESCALATIONS[0];
  const item = board.steps[screen.index];
  const choice = item.choices[selected];
  const correctIndex = item.choices.findIndex((c) => c.ok);
  markChoices(selected, correctIndex, "[data-pocket-answer]");
  if (choice.ok) {
    screen.score += 1;
    addXp(8, "quadro de bolso");
    complete(`pocket-${board.id}-${item.id}`);
  } else {
    screen.errors.push(item.skill);
    miss(item.skill);
  }
  $("#feedback").innerHTML = `${choice.ok ? "Acertou. " : "Ainda nao. "}${choice.f}${solutionBlock(item, "Ver conta completa")}${reviewLinkBlock(item)}`;
  $("#feedback").className = `feedback show ${choice.ok ? "success" : "danger"}`;
  enableNextButtons();
  typeset();
}

function pocketResult() {
  const board = POCKET_ESCALATIONS[screen.boardIndex] || POCKET_ESCALATIONS[0];
  complete(`pocket-${board.id}-finish`);
  setStage(`
    <section class="panel stack">
      <span class="pill">Escalonamento completo</span>
      <h2>${board.title} concluido</h2>
      <p>Voce resolveu em blocos pequenos, do pivo ate a classificacao.</p>
      <div class="mission-list">
        <div class="mission-card"><strong>${screen.score}/${board.steps.length}</strong><small>passos certos</small></div>
        <div class="mission-card"><strong>${state.xp}</strong><small>XP total</small></div>
      </div>
      <div class="actions">
        <button class="primary" data-mode="pocketHome">Treinar outro sistema</button>
        <button class="secondary" data-mode="params">Ir para parametros</button>
        <button class="secondary" data-mode="home">Menu</button>
      </div>
    </section>
  `);
}

const LAB_GROUPS = [
  { title: "Escalonamento completo", hint: "Sistemas 3x3 em blocos pequenos.", mode: "pocketHome", label: "Abrir Quadro de Bolso" },
  { title: "Operações de linha", hint: "Trocar, multiplicar e combinar linhas.", start: 0, label: "Abrir treino de linhas" },
  { title: "Sinais e aritmética", hint: "Sinais, distribuição e lado direito.", start: 49, label: "Abrir treino de contas" },
  { title: "Matriz aumentada", hint: "Antes da barra e depois da barra.", boss: "matrix", label: "Abrir treino de matrizes" },
  { title: "Classificação", hint: "SPD, SPI, SI e contradição.", boss: "classify", label: "Abrir classificador" },
  { title: "Parâmetros", hint: "Casos especiais sem dividir por zero.", mode: "params", label: "Abrir treino de parâmetros" }
];

function labHome() {
  screen = { mode: "lab", index: 0, boss: "mixed", score: 0, errors: [], item: null };
  const cards = LAB_GROUPS.map((group) => {
    const attr = group.boss
      ? `data-boss="${group.boss}"`
      : group.mode
        ? `data-mode="${group.mode}"`
        : `data-lab-start="${group.start}"`;
    return `<button class="skill-card" ${attr}>
      <strong>${group.title}</strong>
      <small>${group.hint}</small>
      <span>${group.label}</span>
    </button>`;
  }).join("");
  setStage(`
    <section class="panel stack lab-home">
      <span class="eyebrow">Laboratório</span>
      <h2>Treino focado</h2>
      <p>Escolha uma habilidade. Cada treino mostra só dados, pergunta, feedback e próxima ação.</p>
      <div class="skill-grid">${cards}</div>
      <button class="secondary" data-mode="home">Voltar</button>
    </section>
  `);
}

function escalationTrack() {
  screen = { mode: "escalation", index: 0, boss: "mixed", score: 0, errors: [], item: null };
  setStage(`
    <section class="panel stack lab-home">
      <span class="eyebrow">Trilha direta</span>
      <h2>Escalonamento completo</h2>
      <p>Sem ficar preso no basico: escolha um treino 3x3, veja uma conta por tela e classifique no final.</p>
      <div class="skill-grid">
        <button class="skill-card" data-mode="pocketHome"><strong>Quadro de Bolso</strong><small>3 escalonamentos completos guiados</small><span>Uma conta por tela</span></button>
        <button class="skill-card" data-jump="course-c5-31b-pivot-not-one"><strong>Pivo diferente de 1</strong><small>Operacao sem fracao</small><span>Ir para a microaula</span></button>
        <button class="skill-card" data-mode="guided"><strong>Exemplo Lista 10</strong><small>Sistema I passo a passo</small><span>Resolver exemplo guiado</span></button>
        <button class="skill-card" data-mode="classificationTrack"><strong>Classificacao</strong><small>SPD, SPI, SI</small><span>Ler matriz final</span></button>
      </div>
      <button class="secondary" data-mode="home">Voltar</button>
    </section>
  `);
}

function labMode(index = 0) {
  screen = { mode: "lab", index, boss: "mixed", score: 0, errors: [], item: null };
  const item = lab[index];
  const data = {
    title: item.title,
    chapter: "Laboratório",
    phase: `Treino ${index + 1}/${lab.length}`,
    origin: item.origin,
    skill: item.skill,
    difficulty: item.difficulty,
    type: "treino focado",
    data: item.matrix,
    explain: item.why,
    question: item.q,
    choices: item.choices.map((choice) => choice.t),
    why: item.why
  };
  setStage(`
    <section class="micro lesson-flow">
      ${courseHeader({ mode: "lab", data, index, total: lab.length, progress: Math.round(((index + 1) / lab.length) * 100), kicker: "Laboratório" })}
      ${sourceChip(item)}
      ${contextBlock(data)}
      ${conceptCard(data)}
      ${exerciseCard(data, "data-lab")}
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
      <div class="actions">
        <button class="primary" data-next="lab" disabled>${index === lab.length - 1 ? "Concluir lab" : "Próximo treino"}</button>
        <button class="secondary" data-repeat="lab">Refazer desafio</button>
        <button class="secondary" data-mode="lab">Trocar habilidade</button>
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

function bossMode(key = "mixed", index = 0, score = 0, errors = [], force = false) {
  if (key === "mixed" && !state.bossUnlocked && !force) {
    setStage(`
      <section class="panel stack">
        <span class="pill">Boss bloqueado</span>
        <h2>Treine um pouco antes.</h2>
        <p>Recomendado ganhar 140 XP ou concluir o exemplo guiado. Mas se voce quer prova bruta agora, pode entrar.</p>
        <button class="primary" data-mode="lista11Boss">Entrar mesmo assim</button>
        <button class="secondary" data-mode="pocketHome">Treinar escalonamento antes</button>
      </section>
    `);
    return;
  }
  const set = bossSets[key];
  screen = { mode: key === "mixed" ? "finalBoss" : "boss", index, boss: key, score, errors, item: null };
  const item = set.qs[index];
  const whyId = `why-boss-${item.id}`;
  setStage(`
    <section class="micro">
      <div class="module-header">
        <span class="pill">Pontuação ${score}/${set.qs.length}</span>
        <h2>${set.title}</h2>
        <div class="bar"><span style="width:${((index + 1) / set.qs.length) * 100}%"></span></div>
      </div>
      ${sourceChip(item)}
      ${contextBlock(item)}
      ${questionSnapshotBlock(item)}
      <div class="choices">
        <p><strong>${item.prompt}</strong></p>
        ${item.choices.map((choice, i) => `<button class="choice" type="button" data-boss-answer="${i}">${choice}</button>`).join("")}
      </div>
      <button class="secondary" data-why="${whyId}">Por quê?</button>
      <div id="${whyId}" class="feedback">${item.why || item.review || "Leia os dados, identifique o objeto matemático e só então escolha a alternativa."}</div>
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
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
  const whyId = `why-infinite-${item.id}`;
  setStage(`
    <section class="micro">
      <div class="module-header">
        <span class="pill">Treino infinito</span>
        <h2>${item.tipo || "Questão"}</h2>
        <div class="bar"><span style="width:${Math.min(100, state.streak * 10)}%"></span></div>
      </div>
      ${sourceChip(item)}
      ${contextBlock(item)}
      ${questionSnapshotBlock(item)}
      <div class="choices">
        <p><strong>${item.prompt}</strong></p>
        ${item.choices.map((choice, i) => `<button class="choice" type="button" data-infinite-answer="${i}">${choice}</button>`).join("")}
      </div>
      <button class="secondary" data-why="${whyId}">Por quê?</button>
      <div id="${whyId}" class="feedback">${item.why || item.review || "A pergunta deve ser resolvida usando apenas os dados mostrados acima."}</div>
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
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
    ["Equação e sistema formal", String.raw`<ul><li>Equação linear: \(a_1x_1+\cdots+a_nx_n=b\).</li><li>\(x_1,\ldots,x_n\): incógnitas.</li><li>\(a_1,\ldots,a_n\): coeficientes.</li><li>\(b\): termo independente.</li><li>Sistema linear: \(m\) equações com \(n\) incógnitas; a solução deve satisfazer todas ao mesmo tempo.</li></ul>`],
    ["Solução e conjunto solução", String.raw`<ul><li>Solução como n-upla: \((x_1,x_2,\ldots,x_n)\).</li><li>Solução como vetor: \(\vec{x}=\begin{pmatrix}x_1\\x_2\\\vdots\\x_n\end{pmatrix}\).</li><li>Conjunto solução: \(S=\{(x_1,\ldots,x_n)\in\mathbb{R}^n:\text{satisfaz o sistema}\}\).</li><li>Sem solução: \(S=\varnothing\).</li></ul>`],
    ["Matriz e forma matricial", String.raw`<ul><li>Matriz dos coeficientes: \(A=(a_{ij})\).</li><li>Vetor dos termos independentes: \(\vec{b}=(b_1,\ldots,b_m)^T\).</li><li>Forma matricial: \(A\vec{x}=\vec{b}\).</li><li>Matriz aumentada: \([A|\vec{b}]\). Antes da barra: coeficientes. Depois da barra: termos independentes.</li></ul>`],
    ["Tabela de operações", String.raw`<ul><li>\(L_i\leftrightarrow L_j\): troca a ordem das equações.</li><li>\(L_i\leftarrow cL_i\), \(c\neq0\): multiplica a linha inteira.</li><li>\(L_i\leftarrow L_i+cL_j\): soma múltiplo de outra linha.</li><li>\(c=0\) é proibido porque apaga informação.</li></ul>`],
    [String.raw`Exemplo \(L_2-3L_1\)`, String.raw`<p>Objetivo: zerar o 3 abaixo do pivô 1.</p><p>\(3L_1=[3,6,-3|-30]\).</p><p>\([3,7,2|-19]-[3,6,-3|-30]=[0,1,5|11]\).</p><p>A barra participa: \(-19-(-30)=11\).</p>`],
    ["Classificação formal", String.raw`<ul><li>SPD: Sistema Possível Determinado. Exatamente uma solução; pivô para cada variável. Exemplo: \(S=\{(2,3,-5)\}\).</li><li>SPI: Sistema Possível Indeterminado. Infinitas soluções; sem contradição e com variável livre.</li><li>SI: Sistema Impossível. Nenhuma solução; aparece contradição como \([0,0,0|7]\), isto é, \(0=7\). Notação: \(S=\varnothing\).</li><li>\([0,0,0|0]\) sozinho não prova infinitas; precisa faltar pivô.</li></ul>`],
    ["Homogêneos", String.raw`<ul><li>Forma: \(A\vec{x}=\vec{0}\).</li><li>Sempre tem a solução trivial \(\vec{x}=\vec{0}\).</li><li>\(\det(A)\neq0\): só trivial.</li><li>\(\det(A)=0\): podem existir soluções não triviais.</li><li>Lista 11 ex. 5: \(\det=3\alpha\), especial \(\alpha=0\), geral \((-t,t,t)\).</li><li>Lista 11 ex. 6: \(\det=3m(m-3)\), só trivial se \(m\neq0,3\).</li></ul>`],
    ["Parâmetros", String.raw`<ul><li>Parâmetro é uma letra cujo valor será discutido: \(k\), \(m\), \(\lambda\), \(\alpha\).</li><li>Não divida por \(k-2\), \(m+1\), \(\lambda-1\) ou \(\alpha+1\) sem separar o zero.</li><li>Exemplo: \(k-2=0\Rightarrow k=2\). Casos: \(k\neq2\) e \(k=2\).</li><li>Caso geral: expressão \(\neq0\), pode dividir.</li><li>Caso especial: expressão \(=0\), substitua e classifique.</li><li>Lista 11 ex. 1(a): \(\lambda\neq1\) única; \(\lambda=1\) nenhuma; infinitas nunca.</li><li>Lista 11 ex. 4: \(k\neq-3\) única; \(k=-3\) nenhuma; infinitas nunca.</li></ul>`],
    ["Lista 10 Sistema III", String.raw`<p>Marcado como <strong>conferir enunciado</strong>. A extração do PDF mostrou a segunda equação como \(-2x_1+5x-72x_3=27\), com possível erro de OCR. O app não inventa essa equação.</p>`],
    ["Erros comuns", String.raw`<ul><li>Esquecer o lado direito depois da barra.</li><li>Somar quando precisava subtrair.</li><li>Dividir por parâmetro que pode zerar.</li><li>Chamar \(0=0\) de contradição.</li><li>Achar que passar em uma equação basta.</li></ul>`],
    ["Checklist de prova", "<ul><li>Copiei sinais?</li><li>Montei [A|b] corretamente?</li><li>Escolhi pivô não nulo?</li><li>Mostrei a conta da linha inteira?</li><li>Classifiquei por pivô, contradição e variável livre?</li><li>Separei casos de parâmetro?</li></ul>"]
  ];
  const sections = [
    ["Vocabulário formal", [cards[0], cards[1], cards[2]]],
    ["Matriz aumentada", [cards[3]]],
    ["Operações de linha", [cards[4], cards[5], ["Pivô diferente de 1", String.raw`<p>Com fração: \(L_{\text{alvo}}\leftarrow L_{\text{alvo}}-\frac{a}{p}L_{\text{pivô}}\).</p><p>Sem fração: \(L_{\text{alvo}}\leftarrow pL_{\text{alvo}}-aL_{\text{pivô}}\).</p><p>No exemplo com pivô \(3\) e alvo \(2\): \(L_2\leftarrow3L_2-2L_1\). O termo independente fica \(18-(-20)=38\).</p>`]]],
    ["Classificação SPD/SPI/SI", [cards[6]]],
    ["Homogêneos", [cards[7]]],
    ["Parâmetros", [cards[8]]],
    ["Protocolo anti-erro", [cards[11]]],
    ["Erros comuns", [cards[10], cards[9]]]
  ];
  setStage(`
    <section class="stack grimoire-shell">
      <div class="panel stack">
        <span class="eyebrow">Consulta</span>
        <h2>Grimório</h2>
        <p>Teoria completa fica aqui. A Jornada ensina em passos curtos; o Grimório serve para revisar quando bater dúvida.</p>
      </div>
      <div class="grimoire-sections">
        ${sections.map(([title, items], index) => `
          <details class="grimoire-section" ${index === 0 ? "open" : ""}>
            <summary>${title}</summary>
            <div class="grimoire-grid">${items.map(([cardTitle, body]) => `<article class="grimoire-card"><h3>${cardTitle}</h3>${body}</article>`).join("")}</div>
          </details>
        `).join("")}
      </div>
      <button class="primary" data-mode="checklist">Abrir protocolo anti-erro</button>
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
  const item = currentAnswerItem();
  if (!item) return;
  const correctAnswer = item.answer ?? item.a;
  const correct = selected === correctAnswer;
  markChoices(selected, correctAnswer);
  const fb = $("#feedback");
  if (screen.mode === "diagnostic") {
    if (correct) screen.score += 1;
    else screen.errors.push(item.target);
    screen.answers = [
      ...(screen.answers || []),
      {
        id: item.id,
        target: item.target,
        skill: item.skill,
        errorType: item.errorType,
        selected,
        correct
      }
    ];
    fb.innerHTML = item.feedbacks?.[selected] || (correct ? "Acertou." : "Quase. Vou recomendar revisao, sem bloquear nada.");
  } else {
    const msg = correct
      ? (item.feedbacks?.[selected] || item.feedback || item.f || "Certo.")
      : (item.feedbacks?.[selected] || item.wrong || item.feedback || item.f || "Revise a conta.");
    fb.innerHTML = `${correct ? addXp(10, "missão") : "Ainda não."} ${msg}${solutionBlock(item, item.solutionLabel || "Ver conta inteira")}${reviewLinkBlock(item)}`;
    if (screen.mode === "board") {
      advanceBoardProgress(correct, item);
    }
    if (screen.mode === "bossFinalBoard") {
      if (correct) screen.score += 1;
      else screen.errors.push(item.errorType || "conclusion");
    }
    if (correct) {
      recordPerformance({ skill: item.skill || "jornada", correct: true, source: screen.mode || "jornada" });
      if (PROOF_MODES[screen.mode]) advanceProofProgress(screen.mode, screen.index);
      complete(item.id);
      if (screen.mode === "adaptive") {
        state.adaptiveQueue = (state.adaptiveQueue || []).filter((key) => key !== screen.skillKey);
        saveState();
      }
    } else {
      if (screen.mode !== "board") recordProofError(item.errorType);
      miss(item.skill || "jornada");
    }
  }
  fb.className = `feedback show ${correct ? "success" : "danger"}`;
  if (correct || screen.mode === "diagnostic" || screen.mode === "board" || screen.mode === "bossFinalBoard") enableNextButtons();
  typeset();
}

function currentAnswerItem() {
  if (screen.mode === "journey") return COURSE_PATH[screen.index];
  if (screen.mode === "guided") return guided[screen.index];
  if (screen.mode === "diagnostic") return diagnostic[screen.index];
  if (screen.mode === "adaptive") return CORRECTIVE_MISSIONS[screen.skillKey];
  if (screen.mode === "board" || screen.mode === "bossFinalBoard") return screen.item;
  if (PROOF_MODES[screen.mode]) return PROOF_MODES[screen.mode].items[screen.index];
  return null;
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
  $("#feedback").innerHTML = `${choice.ok ? "" : "Ainda não. "}${choice.f}${solutionBlock(item)}${reviewLinkBlock(item)}`;
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
  $("#feedback").innerHTML = `${correct ? "Acertou. " : "Ainda não. "}${msg}${solutionBlock(item)}${reviewLinkBlock(item)}`;
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
  $("#feedback").innerHTML = `${correct ? "Acertou. " : "Ainda não. "}${msg}${solutionBlock(item)}${reviewLinkBlock(item)}${recs.length ? `<p class="tiny">Erros frequentes: ${recs.map(([k, v]) => `${k} (${v})`).join(", ")}.</p>` : ""}`;
  $("#feedback").className = `feedback show ${correct ? "success" : "danger"}`;
  enableNextButtons();
  typeset();
}

function markChoices(selected, answer, selector = "[data-answer]") {
  $$(selector).forEach((btn) => {
    btn.disabled = true;
    const value = Number(btn.dataset.answer ?? btn.dataset.lab ?? btn.dataset.bossAnswer ?? btn.dataset.infiniteAnswer ?? btn.dataset.pocketAnswer);
    if (value === answer) btn.classList.add("correct");
    if (value === selected && value !== answer) btn.classList.add("wrong");
  });
}

function next(kind) {
  if (kind === "journey") {
    const index = getNextCourseMissionIndex();
    if (index === -1) return showCampaignComplete();
    return journey(index);
  }
  if (kind === "diagnostic") {
    if (screen.index >= diagnostic.length - 1) return diagnosticResult(screen.score, screen.errors, screen.answers || []);
    return diagnosticMode(screen.index + 1, screen.score, screen.errors, screen.answers || []);
  }
  if (kind === "lab") {
    if (screen.index >= lab.length - 1) return labHome();
    return labMode(screen.index + 1);
  }
  if (kind === "pocket") {
    const board = POCKET_ESCALATIONS[screen.boardIndex] || POCKET_ESCALATIONS[0];
    if (screen.index >= board.steps.length - 1) return pocketResult();
    return pocketMode(screen.boardIndex, screen.index + 1, screen.score, screen.errors);
  }
  if (kind === "board") {
    if (screen.index >= BOARD_STEP_COUNT - 1) return boardSystemResult(screen.systemIndex);
    return renderBoardMode(screen.systemIndex, screen.index + 1);
  }
  if (kind === "bossFinalBoard") {
    if (screen.index >= BOSS_FINAL_SYSTEM_IDS.length - 1) return bossFinalResult();
    return bossFinalBoard(screen.index + 1, screen.score, screen.errors);
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
  if (kind === "adaptive") return journey(getNextCourseMissionIndex());
  if (PROOF_MODES[kind]) {
    const total = PROOF_MODES[kind].items.length;
    if (screen.index >= total - 1) return proofModeResult(kind);
    return proofMode(kind, screen.index + 1);
  }
}

function repeat(kind) {
  if (kind === "journey") return journey(screen.index);
  if (kind === "adaptive") return adaptiveMission(screen.skillKey);
  if (PROOF_MODES[kind]) return proofMode(kind, screen.index);
  if (kind === "lab") return labMode(screen.index);
  if (kind === "pocket") return pocketMode(screen.boardIndex, screen.index, screen.score, screen.errors);
  if (kind === "board") return renderBoardMode(screen.systemIndex, screen.index);
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
  if (mode === "campaignComplete") return showCampaignComplete();
  if (mode === "journey") return journey();
  if (mode === "recommendedJourney") {
    const missionId = state.diagnostic?.recommendedMissionId || state.lastRecommendation?.missionId;
    const index = COURSE_PATH.findIndex((mission) => mission.id === missionId && !state.completed.includes(mission.id));
    return journey(index >= 0 ? index : getNextCourseMissionIndex());
  }
  if (mode === "startJourney") return confirmRestartJourney();
  if (mode === "journeyMap") return journeyMap();
  if (mode === "diagnostic") return diagnosticMode(0, 0, []);
  if (mode === "resetDiagnostic") return resetDiagnosticOnly();
  if (mode === "blankSheet") return blankSheetHome();
  if (mode === "blankSheetMessy") return startBlankMessy(1);
  if (mode === "board") {
    if (uniqueCount(state.completedBoardModeSystems || []) >= LISTA11_SYSTEMS.length) return readinessReport();
    const position = nextBoardPosition();
    return renderBoardMode(position.systemIndex, position.stepIndex);
  }
  if (mode === "bossFinalBoard") return bossFinalBoard(0, 0, []);
  if (mode === "readinessReport") return readinessReport();
  if (PROOF_MODES[mode]) return proofMode(mode);
  if (mode.endsWith("Reset")) {
    const proofModeName = mode.replace("Reset", "");
    if (PROOF_MODES[proofModeName]) {
      state.modeProgress[proofModeName] = 0;
      saveState();
      return proofMode(proofModeName, 0);
    }
  }
  if (mode === "escalation") return escalationTrack();
  if (mode === "pocketHome") return pocketHome();
  if (mode === "classificationTrack") return bossMode("classify", 0, 0, []);
  if (mode === "homogeneousTrack") return bossMode("homogeneous", 0, 0, []);
  if (mode === "parametersTrack") return paramsMode();
  if (mode === "lista11Boss") return bossMode("mixed", 0, 0, [], true);
  if (mode === "lab") return labHome();
  if (mode === "guided") return guidedMode(0);
  if (mode === "duels") return duels();
  if (mode === "params") return paramsMode();
  if (mode === "finalBoss") return bossMode("mixed", 0, 0, []);
  if (mode === "infinite") return infiniteMode();
  if (mode === "grimoire") return grimoire();
  if (mode === "checklist") return checklist();
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-theme-toggle]")) {
    toggleTheme();
    return;
  }

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

  const labStart = event.target.closest("[data-lab-start]");
  if (labStart) return labMode(Number(labStart.dataset.labStart));

  const pocketStart = event.target.closest("[data-pocket-start]");
  if (pocketStart) return pocketMode(Number(pocketStart.dataset.pocketStart), 0, 0, []);

  const blankStart = event.target.closest("[data-blank-start]");
  if (blankStart) return startBlankCase(Number(blankStart.dataset.blankStart));

  const blankStuck = event.target.closest("[data-blank-stuck]");
  if (blankStuck) return blankRequestHelp();

  const blankNext = event.target.closest("[data-blank-next]");
  if (blankNext) return blankNextStep();

  const blankTimer = event.target.closest("[data-blank-timer]");
  if (blankTimer) return startBlankTimer();

  const blankStuckReason = event.target.closest("[data-blank-stuck-reason]");
  if (blankStuckReason) return blankRecordStuckReason(blankStuckReason.dataset.blankStuckReason);

  const blankMessy = event.target.closest("[data-blank-messy]");
  if (blankMessy) return startBlankMessy(Number(blankMessy.dataset.blankMessy));

  const boardGo = event.target.closest("[data-board-go]");
  if (boardGo) {
    const index = Number(boardGo.dataset.boardGo);
    state.boardProgress = { systemIndex: index, stepIndex: 0 };
    saveState();
    return renderBoardMode(index, 0);
  }

  const bossAns = event.target.closest("[data-boss-answer]");
  if (bossAns) return answerBoss(Number(bossAns.dataset.bossAnswer));

  const infiniteAns = event.target.closest("[data-infinite-answer]");
  if (infiniteAns) return answerInfinite(Number(infiniteAns.dataset.infiniteAnswer));

  const pocketAns = event.target.closest("[data-pocket-answer]");
  if (pocketAns) return answerPocket(Number(pocketAns.dataset.pocketAnswer));

  const nextBtn = event.target.closest("[data-next]");
  if (nextBtn) return next(nextBtn.dataset.next);

  const repeatBtn = event.target.closest("[data-repeat]");
  if (repeatBtn) return repeat(repeatBtn.dataset.repeat);

  const why = event.target.closest("[data-why]");
  if (why) {
    const panel = document.getElementById(why.dataset.why);
    panel.classList.toggle("show");
    if (panel.classList.contains("show")) {
      if (screen.mode === "board" || screen.mode === "bossFinalBoard") screen.hintUsed = true;
      state.hintsUsed += 1;
      const activeItem = PROOF_MODES[screen.mode]?.items?.[screen.index]
        || (screen.mode === "board" || screen.mode === "bossFinalBoard" ? screen.item : null)
        || (screen.mode === "journey" ? COURSE_PATH[screen.index] : null)
        || (screen.mode === "adaptive" ? CORRECTIVE_MISSIONS[screen.skillKey] : null)
        || screen.item;
      if (activeItem?.skill) recordPerformance({ skill: activeItem.skill, correct: false, errorType: "pressa", source: "dica" });
      saveState();
    }
    return;
  }

  const boss = event.target.closest("[data-boss]");
  if (boss) return bossMode(boss.dataset.boss, 0, 0, []);

  const jump = event.target.closest("[data-jump]");
  if (jump) {
    const index = COURSE_PATH.findIndex((mission) => mission.id === jump.dataset.jump);
    return journey(Math.max(index, 0));
  }

  const courseJump = event.target.closest("[data-course-jump]");
  if (courseJump) return journey(Number(courseJump.dataset.courseJump));

  if (event.target.closest("[data-confirm-reset-journey]")) {
    resetCourseProgress();
    return journey(0);
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

document.addEventListener("submit", (event) => {
  const blankForm = event.target.closest("[data-blank-form]");
  if (blankForm) {
    event.preventDefault();
    return submitBlankStep(new FormData(blankForm).get("blankStep") || "");
  }

  const messyForm = event.target.closest("[data-messy-form]");
  if (messyForm) {
    event.preventDefault();
    return submitMessyForm(messyForm);
  }
});

home();
renderHud();
