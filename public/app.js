import { clampExamSize } from "./js/attempt-engine.js";
import { createAttemptSession, newAttemptDraft } from "./js/attempt-session.js";
import { ATTEMPT_STORAGE_KEY, createAttemptStore } from "./js/attempt-store.js";
import { normalizeBank } from "./js/bank-normalizer.js";
import { assertValidBank } from "./js/bank-validator.js";
import { DEFAULT_EXAM_SIZE } from "./js/constants.js";
import { createExamView } from "./js/exam-view.js";
import { createResultView } from "./js/result-view.js";
import { createSubmissionView } from "./js/submission-view.js";
import { applyTheme, getStoredTheme, saveTheme } from "./js/theme.js";
import { formatDuration } from "./js/view-utils.js";

const DEFAULT_BANK = "secdevops-unir.json";
const byId = (id) => document.getElementById(id);
const examLayout = byId("exam-layout");
const preparation = byId("preparation-view");
const submission = byId("submission-view");
const examView = createExamView(examLayout);
const submissionView = createSubmissionView(submission, goToQuestion);
const resultDialog = byId("result-dialog");
const resultView = createResultView(resultDialog);
const replaceDialog = byId("replace-dialog");
const form = byId("attempt-form");
const sizeInput = byId("attempt-size");
const presets = Array.from(document.querySelectorAll("[data-size]"));
const input = byId("json-input");
const loadJson = byId("load-json");
const useDefault = byId("restore-default-bank");
const startButton = byId("start-attempt");

const store = createAttemptStore();
const saved = store.load();
let imported = saved.imported ?? null;
let selection = imported;
let session = saved.draft ? createAttemptSession(saved.draft) : null;
let lastResult = saved.result ?? null;
let preferredSize = session?.total ?? lastResult?.stats.total ?? DEFAULT_EXAM_SIZE;
let bankRequest = 0;
let waitingForBank = false;
let timer;
let resultTrigger;

function currentStage() {
  return !session || session.phase === "paused" ? "prepare" : session.phase;
}

function showStorageStatus(status) {
  const notice = byId("storage-status");
  notice.hidden = status === "saved";
  if (status === "conflict") {
    notice.textContent = "Otra pestaña actualizó el intento guardado. El avance de esta pestaña se conserva mientras esté abierta.";
  } else if (status === "unavailable") {
    notice.textContent = "El navegador no pudo guardar el avance. Mantén abierta esta pestaña para conservarlo.";
  }
}

function persist() {
  const draft = session && session.phase !== "submitted" ? session.snapshot() : null;
  showStorageStatus(store.save({ imported, draft, result: lastResult }));
}

function bankSummary() {
  if (!selection) return null;
  const { bank, source } = selection;
  return { title: bank.title, examLevel: bank.examLevel, total: bank.questions.length, source };
}

function renderBank(summary) {
  const title = summary?.title ?? "Portal de práctica";
  byId("app-title").textContent = title;
  document.title = `${title} | Lumbre`;
  byId("bank-meta").hidden = !summary;
  if (!summary) return;
  byId("bank-count").textContent = summary.total === 1 ? "1 pregunta" : `${summary.total} preguntas`;
  const level = typeof summary.examLevel === "string" ? summary.examLevel.trim() : "";
  byId("bank-level").textContent = level.toLowerCase() === "maestria" ? "Maestría" : level;
  byId("bank-level").hidden = !level;
  byId("source-label").textContent = summary.source;
  byId("source-label").hidden = false;
}

function updateSizeControls() {
  const value = sizeInput.valueAsNumber;
  byId("decrease-size").disabled = value <= 1;
  byId("increase-size").disabled = value >= Number(sizeInput.max);
  presets.forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.size) === value));
  });
}

function setSize(value) {
  sizeInput.value = clampExamSize(value, selection.bank.questions.length);
  updateSizeControls();
}

function renderPreparation() {
  const hasDraft = session?.phase === "paused";
  const hasReport = Boolean(lastResult);
  form.hidden = !selection;
  byId("saved-attempts").hidden = !hasDraft && !hasReport;
  byId("resume-section").hidden = !hasDraft;
  byId("last-result-section").hidden = !hasReport;
  if (hasDraft) {
    const { answered, total } = session.stats;
    byId("resume-bank").textContent = session.bank.title;
    byId("resume-progress").textContent = `${answered} de ${total} respondidas · ${formatDuration(session.elapsed)}`;
  }
  if (hasReport) {
    const { correct, total, score } = lastResult.stats;
    byId("last-result-bank").textContent = lastResult.bank.title;
    byId("last-result-stats").textContent = `${score}% · ${correct} de ${total} aciertos`;
  }

  byId("start-label").textContent = hasDraft ? "Empezar otro intento" : "Empezar práctica";
  startButton.classList.toggle("btn-primary", !hasDraft);
  startButton.classList.toggle("btn-outline", hasDraft);
  useDefault.hidden = !imported;
}

function applySelectedSize() {
  const total = selection.bank.questions.length;
  sizeInput.max = total;
  byId("attempt-range").textContent = total === 1 ? "1 pregunta disponible" : `De 1 a ${total} preguntas`;
  presets.forEach((button) => {
    button.hidden = Number(button.dataset.size) > total;
  });
  byId("size-presets").hidden = presets.every((button) => button.hidden);
  setSize(preferredSize);
}

function refreshClock() {
  if (session) examView.setElapsed(session.elapsed);
}

function renderStage(focus = false) {
  const stage = currentStage();
  const preparing = stage === "prepare";
  const reviewing = stage === "reviewing";
  const answering = stage === "answering";
  const hasContent = Boolean(selection || session || lastResult);
  byId("exam-empty").hidden = hasContent;
  byId("attempt-steps").hidden = !hasContent;
  for (const step of document.querySelectorAll("[data-step]")) {
    if (step.dataset.step === stage) {
      step.setAttribute("aria-current", "step");
    } else {
      step.removeAttribute("aria-current");
    }
  }
  byId("leave-attempt").hidden = preparing;
  byId("bank-actions").hidden = !preparing;
  preparation.hidden = !preparing || !hasContent;
  submission.hidden = !reviewing;
  examLayout.hidden = preparing || reviewing;
  renderBank(preparing ? bankSummary() : session.bank);
  clearInterval(timer);

  if (preparing) {
    renderPreparation();
    if (focus) byId("preparation-title").focus();
  } else if (reviewing) {
    submissionView.open(session);
    if (focus) byId("finish-title").focus();
  } else {
    examView.open(session, focus);
    refreshClock();
    if (answering) timer = setInterval(refreshClock, 1000);
  }
}

function readBank(raw) {
  const bank = normalizeBank(raw);
  const { warnings } = assertValidBank(bank);
  if (warnings.length) console.warn("Advertencias del banco:", warnings);
  return bank;
}

function showBankError(error) {
  const notice = byId("bank-error");
  notice.textContent = error instanceof SyntaxError
    ? "El archivo no contiene JSON válido."
    : error.message || "No se pudo cargar el banco.";
  notice.hidden = false;
  byId("exam-empty").textContent = "Carga un banco para preparar un intento.";
}

async function selectBank(read, source, isImport, remember = true) {
  const request = ++bankRequest;
  waitingForBank = true;
  loadJson.disabled = isImport;
  startButton.disabled = useDefault.disabled = true;
  byId("bank-error").hidden = true;
  try {
    const bank = await read();
    if (request !== bankRequest) return;
    selection = { bank, source };
    imported = isImport ? selection : null;
    applySelectedSize();
    if (currentStage() === "prepare") renderStage();
    if (remember) persist();
  } catch (error) {
    if (request === bankRequest) showBankError(error);
  } finally {
    if (request === bankRequest) {
      waitingForBank = false;
      loadJson.disabled = startButton.disabled = useDefault.disabled = false;
    }
  }
}

function loadDefault(remember = true) {
  return selectBank(async () => {
    const response = await fetch(`./question-banks/${DEFAULT_BANK}`);
    if (!response.ok) throw new Error("No se pudo cargar el banco predeterminado.");
    return readBank(await response.json());
  }, DEFAULT_BANK, false, remember);
}

function startAttempt() {
  if (!selection || waitingForBank) return;
  preferredSize = clampExamSize(sizeInput.value, selection.bank.questions.length);
  session = createAttemptSession(newAttemptDraft(selection, preferredSize));
  continueAttempt();
}

function continueAttempt() {
  session?.setVisible(!document.hidden);
  if (!session?.resume()) return;
  persist();
  renderStage(true);
}

function leaveAttempt() {
  if (session?.phase === "submitted") {
    session = null;
  } else {
    session?.pause();
    persist();
  }
  renderStage(true);
}

function goToQuestion(index) {
  const fromReview = currentStage() === "reviewing";
  if (!session?.navigate(index)) return;
  if (session.phase !== "submitted") persist();
  if (fromReview) {
    renderStage(true);
  } else {
    examView.showQuestion(session, true);
  }
}

function openSubmission() {
  if (!session?.review()) return;
  persist();
  renderStage(true);
}

function showResults(trigger) {
  if (!lastResult || resultDialog.open) return;
  resultTrigger = trigger;
  resultView.open(lastResult);
}

function submitAttempt() {
  if (session?.phase !== "reviewing") return;
  if (session.stats.remaining > 0) {
    goToQuestion(session.nextPending());
    return;
  }
  const result = session.submit();
  if (!result) return;
  lastResult = result;
  persist();
  renderStage();
  showResults(byId("view-results"));
}

loadJson.addEventListener("click", () => input.click());
input.addEventListener("change", () => {
  const [file] = input.files;
  if (!file || currentStage() !== "prepare") return;
  input.value = "";
  selectBank(async () => readBank(JSON.parse(await file.text())), file.name, true);
});
useDefault.addEventListener("click", () => loadDefault());

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (waitingForBank || !selection) return;
  if (session?.phase === "paused") {
    replaceDialog.showModal();
  } else {
    startAttempt();
  }
});
byId("confirm-replace").addEventListener("click", () => {
  replaceDialog.close();
  startAttempt();
});
byId("resume-attempt").addEventListener("click", continueAttempt);
byId("back-to-questions").addEventListener("click", continueAttempt);
byId("leave-attempt").addEventListener("click", leaveAttempt);
sizeInput.addEventListener("input", updateSizeControls);
sizeInput.addEventListener("change", () => setSize(sizeInput.value));
byId("decrease-size").addEventListener("click", () => setSize(sizeInput.valueAsNumber - 1));
byId("increase-size").addEventListener("click", () => setSize(sizeInput.valueAsNumber + 1));
presets.forEach((button) => button.addEventListener("click", () => setSize(button.dataset.size)));

byId("options").addEventListener("click", (event) => {
  const button = event.target.closest("[data-answer-id]");
  if (!button || !session?.answer(button.dataset.answerId)) return;
  persist();
  examView.answer(session);
});
byId("mark-review").addEventListener("click", () => {
  if (!session?.toggleMark()) return;
  persist();
  examView.mark(session);
});
byId("question-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");
  if (button) goToQuestion(Number(button.dataset.index));
});
byId("prev-question").addEventListener("click", () => goToQuestion(session.index - 1));
byId("next-question").addEventListener("click", () => {
  if (session.index === session.total - 1) {
    openSubmission();
  } else {
    goToQuestion(session.index + 1);
  }
});
byId("next-pending").addEventListener("click", () => goToQuestion(session.nextPending()));
byId("review-attempt").addEventListener("click", openSubmission);
byId("confirm-finish").addEventListener("click", submitAttempt);
for (const id of ["view-results", "open-last-result"]) {
  byId(id).addEventListener("click", (event) => showResults(event.currentTarget));
}

for (const dialog of [replaceDialog, resultDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-dialog-close]")) dialog.close();
  });
}
resultDialog.addEventListener("close", () => resultTrigger?.focus());

function setAttemptVisibility(visible) {
  if (!session || !["answering", "reviewing"].includes(session.phase)) return;
  session.setVisible(visible);
  if (visible) refreshClock();
  else persist();
}

document.addEventListener("visibilitychange", () => setAttemptVisibility(!document.hidden));
window.addEventListener("pagehide", () => setAttemptVisibility(false));
window.addEventListener("pageshow", () => setAttemptVisibility(!document.hidden));
window.addEventListener("storage", (event) => {
  if (event.key === ATTEMPT_STORAGE_KEY || event.key === null) showStorageStatus("conflict");
});

const desktopLayout = window.matchMedia("(min-width: 56rem)");
const syncNavigator = () => { byId("question-navigator").open = desktopLayout.matches; };
desktopLayout.addEventListener("change", syncNavigator);
syncNavigator();

const themeOptions = document.querySelectorAll("[data-theme-choice]");
themeOptions.forEach((button) => {
  button.addEventListener("click", () => {
    saveTheme(applyTheme(button.dataset.themeChoice, { controls: themeOptions }));
  });
});
applyTheme(getStoredTheme(), { controls: themeOptions });
if (selection) applySelectedSize();
renderStage();
if (!selection) loadDefault(false);
