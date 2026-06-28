const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const index = read("index.html");
const script = read("script.js");
const css = read("style.css");

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

assert(index.includes('class="skip-link"') && index.includes("Ir para o conteúdo principal"), "skip link exists");
assert(index.includes("<header") && index.includes("<main") && index.includes("<nav") && index.includes("<footer"), "landmarks exist");
assert(index.includes('aria-pressed="false"') && index.includes("Tema: claro"), "theme toggle has accessible state");
assert(index.includes("Quadro") && index.includes("Seu progresso"), "nav explains Quadro");
assert(index.includes("Diagnóstico") && index.includes("Ponto de partida"), "nav explains Diagnostico");
assert(script.includes("document.title = pageTitleFor()"), "page title updates by mode");
assert(script.includes("ensureSingleH1"), "dynamic screens enforce an H1");
assert((script.includes("Começar diagnóstico") || script.includes("Come&ccedil;ar diagn&oacute;stico")) && script.includes("Ver trilha de estudo"), "home has primary and secondary CTAs");
assert(script.includes("Feedback por objetivo"), "diagnostic result gives formative feedback");
assert(script.includes("errorSummaryBlock") && script.includes("Pontos de revisao do diagnostico"), "diagnostic has accessible review summary");
assert(script.includes("reviewLinkBlock"), "exercise feedback links to Grimoire review");
assert(script.includes('role="status" aria-live="polite"'), "dynamic feedback uses aria-live");
assert(script.includes("Folha em Branco - Lista 11") && script.includes("BLANK_SHEET_CASES"), "blank sheet exam mode exists");
assert(script.includes("data-blank-form") && script.includes("Estou travado"), "blank sheet mode uses open response and progressive help");
assert(script.includes("Ritual de prova") && script.includes("blankSheetAttempts"), "blank sheet mode tracks exam ritual and attempts");
assert(script.includes("seededShuffleIndexes") && script.includes("data-blank-trap"), "blank sheet traps shuffle alternatives after written attempt");
assert(script.includes("blankRubricPanel") && script.includes("Caso especial"), "blank sheet result has explicit rubric including special cases");
assert(css.includes(".skip-link") && css.includes(":focus-visible"), "visible focus and skip link styles exist");
assert(css.includes(".stepper-step") && css.includes(".info-card"), "study stepper and info cards are styled");
assert(css.includes(".blank-shell") && css.includes(".ritual-panel"), "blank sheet mode styles exist");
assert(css.includes(".trap-panel") && css.includes(".rubric-panel") && css.includes(".blank-case-card.featured"), "blank sheet mode has vivid exam UI states");

if (process.exitCode) process.exit(process.exitCode);
