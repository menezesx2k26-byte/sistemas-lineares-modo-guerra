const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const index = read("index.html");
const script = read("script.js");
const css = read("style.css");
const removedTrapHook = "data-blank-" + "trap";
const removedShuffleHelper = "seeded" + "ShuffleIndexes";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

assert(index.includes('class="skip-link"') && index.includes("Ir para o conteudo principal"), "skip link exists");
assert(index.includes("<header") && index.includes("<main") && index.includes("<nav") && index.includes("<footer"), "landmarks exist");
assert(index.includes('aria-pressed="false"') && index.includes("Tema: claro"), "theme toggle has accessible state");
assert(index.includes("Trilha") && index.includes("Lista 11"), "nav focuses the single Lista 11 trail");
assert(index.includes("Guiada") && index.includes("Passo a passo"), "nav exposes guided Lista 11 mode");
assert(script.includes("document.title = pageTitleFor()"), "page title updates by mode");
assert(script.includes("ensureSingleH1"), "dynamic screens enforce an H1");
assert(script.includes("LISTA11_DESESPERO") && script.includes("data-des-choice"), "Lista 11 despair trail exists with A/B/C/D choices");
assert(script.includes("desesperoHome") && script.includes("desesperoMode") && script.includes("answerDesespero"), "despair mode has home, renderer and answer handler");
assert(script.includes("desesperoChoiceOrder") && script.includes("hashDesesperoSeed"), "despair choices are shuffled per attempt instead of fixed on A");
assert(script.includes("LISTA11_GUIDED_RESOLUTION") && script.includes("guidedLista11Mode"), "guided Lista 11 resolution mode exists");
assert(script.includes("data-guided-next") && script.includes("data-guided-prev"), "guided mode has next and previous controls");
assert(script.includes("De onde saiu o") && script.includes("mini-examples"), "guided mode explains free variables and parametric examples");
assert(script.includes("assets/lista11/ex4.png") && script.includes("Imagem original do exercicio"), "guided/despair modes reference exercise images");
assert(script.includes("Feedback por objetivo"), "diagnostic result gives formative feedback");
assert(script.includes("errorSummaryBlock") && script.includes("Pontos de revisao do diagnostico"), "diagnostic has accessible review summary");
assert(script.includes("reviewLinkBlock"), "exercise feedback links to Grimoire review");
assert(script.includes('role="status" aria-live="polite"'), "dynamic feedback uses aria-live");
assert(script.includes("Folha em Branco - Lista 11") && script.includes("BLANK_SHEET_CASES"), "blank sheet exam mode still exists");
assert(script.includes("data-blank-form") && script.includes("Estou travado"), "blank sheet mode keeps open response and progressive help");
assert(script.includes("Ritual de prova") && script.includes("blankSheetAttempts"), "blank sheet mode tracks exam ritual and attempts");
assert(script.includes("blank-l11-ex4") && script.includes("semSPI") && script.includes("detectBlankAmbiguity"), "blank sheet exercise 4 keeps written reasoning with ambiguity checks");
assert(!script.includes(removedTrapHook) && !script.includes(removedShuffleHelper), "blank sheet exercise 4 no longer depends on quiz traps");
assert(script.includes("blankRubricPanel") && script.includes("Identificacao do caso especial") && script.includes("Teste do caso especial"), "blank sheet result has explicit rubric including special cases");
assert(css.includes(".skip-link") && css.includes(":focus-visible"), "visible focus and skip link styles exist");
assert(css.includes(".despair-shell") && css.includes(".des-choice") && css.includes(".panic-meter"), "despair visual system exists");
assert(css.includes(".guided-shell") && css.includes(".exercise-snapshot"), "guided resolution visual system exists");
assert(css.includes(".guided-note") && css.includes(".mini-examples"), "guided explanation note styles exist");
assert(css.includes(".blank-shell") && css.includes(".ritual-panel"), "blank sheet mode styles still exist");
assert(css.includes(".continue-card") && css.includes(".rubric-panel") && css.includes(".blank-case-card.featured"), "blank sheet mode keeps exam UI states");

if (process.exitCode) process.exit(process.exitCode);
