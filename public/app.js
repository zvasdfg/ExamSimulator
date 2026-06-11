const DEFAULT_BANK_URL = "/question-banks/secdevops-unir.json";
const THEME_STORAGE_KEY = "exam-simulator-theme";
const DEFAULT_EXAM_SIZE = 25;
const OPTION_IDS = ["A", "B", "C", "D", "E", "F"];
const THEMES = ["light", "dark", "oled"];

const state = {
  bank: null,
  attempt: [],
  currentIndex: 0,
  answers: {},
  marked: {},
  submitted: false,
  resultOverlayOpen: false,
  submittedAt: null,
  attemptStartedAt: null,
  activeQuestionId: null,
  activeQuestionStartedAt: null,
  questionTimes: {},
  reviewQuestionId: null,
  requestedExamSize: DEFAULT_EXAM_SIZE,
  theme: "light",
  sourceLabel: "secdevops-unir.json",
};

const els = {
  appTitle: document.querySelector("#app-title"),
  sourceLabel: document.querySelector("#source-label"),
  bankStatus: document.querySelector("#bank-status"),
  progressStatus: document.querySelector("#progress-status"),
  scoreStatus: document.querySelector("#score-status"),
  loadJson: document.querySelector("#load-json"),
  jsonInput: document.querySelector("#json-input"),
  newAttempt: document.querySelector("#new-attempt"),
  themeOptions: document.querySelectorAll("[data-theme-choice]"),
  attemptSize: document.querySelector("#attempt-size"),
  topicBadge: document.querySelector("#topic-badge"),
  typeBadge: document.querySelector("#type-badge"),
  markedBadge: document.querySelector("#marked-badge"),
  questionCounter: document.querySelector("#question-counter"),
  questionText: document.querySelector("#question-text"),
  markReview: document.querySelector("#mark-review"),
  options: document.querySelector("#options"),
  feedback: document.querySelector("#feedback"),
  progressFill: document.querySelector("#progress-fill"),
  prevQuestion: document.querySelector("#prev-question"),
  nextQuestion: document.querySelector("#next-question"),
  nextPending: document.querySelector("#next-pending"),
  submitExam: document.querySelector("#submit-exam"),
  viewResults: document.querySelector("#view-results"),
  scoreBig: document.querySelector("#score-big"),
  scoreCount: document.querySelector("#score-count"),
  correctCount: document.querySelector("#correct-count"),
  wrongCount: document.querySelector("#wrong-count"),
  markedCount: document.querySelector("#marked-count"),
  pendingCount: document.querySelector("#pending-count"),
  questionGrid: document.querySelector("#question-grid"),
  bankTitle: document.querySelector("#bank-title"),
  bankTotal: document.querySelector("#bank-total"),
  attemptTotal: document.querySelector("#attempt-total"),
  resultOverlay: document.querySelector("#result-overlay"),
  resultDashboard: document.querySelector("#result-dashboard"),
  closeDashboard: document.querySelector("#close-dashboard"),
  resultStatus: document.querySelector("#result-status"),
  resultScore: document.querySelector("#result-score"),
  resultAnswered: document.querySelector("#result-answered"),
  resultCorrect: document.querySelector("#result-correct"),
  resultWrong: document.querySelector("#result-wrong"),
  resultPending: document.querySelector("#result-pending"),
  resultMarked: document.querySelector("#result-marked"),
  resultTotalTime: document.querySelector("#result-total-time"),
  resultAverageTime: document.querySelector("#result-average-time"),
  reviewQuestionList: document.querySelector("#review-question-list"),
  reviewQuestionTitle: document.querySelector("#review-question-title"),
  reviewQuestionDetail: document.querySelector("#review-question-detail"),
  resultMeta: document.querySelector("#result-meta"),
};

function fallbackOptionId(index) {
  return OPTION_IDS[index] || String(index + 1);
}

function getMaxExamSize() {
  return Math.max(state.bank?.questions.length || DEFAULT_EXAM_SIZE, 1);
}

function clampExamSize(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return Math.min(DEFAULT_EXAM_SIZE, getMaxExamSize());
  }

  return Math.min(Math.max(parsed, 1), getMaxExamSize());
}

function syncAttemptSizeInput() {
  const size = clampExamSize(state.requestedExamSize);
  state.requestedExamSize = size;
  els.attemptSize.max = String(getMaxExamSize());
  els.attemptSize.value = String(size);
}

function getStoredTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "extra-dark" || storedTheme === "black") {
      return "oled";
    }
    return THEMES.includes(storedTheme) ? storedTheme : "light";
  } catch (error) {
    return "light";
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {}
}

function applyTheme(theme) {
  const normalizedTheme = THEMES.includes(theme) ? theme : "light";
  state.theme = normalizedTheme;

  if (document.documentElement) {
    if (normalizedTheme === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.dataset.theme = normalizedTheme;
    }
  }

  els.themeOptions.forEach((button) => {
    const active = button.dataset.themeChoice === normalizedTheme;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function normalizeOptions(rawOptions, rawType, rawAnswer) {
  if (Array.isArray(rawOptions)) {
    return rawOptions
      .map((option, index) => {
        if (typeof option === "string") {
          return { id: fallbackOptionId(index), text: option.trim() };
        }

        const id = String(
          option.id || option.key || option.label || fallbackOptionId(index),
        )
          .trim()
          .replace(/[.)]$/, "")
          .toUpperCase();
        const text = String(
          option.text || option.title || option.value || option.label || id,
        ).trim();
        return { id, text };
      })
      .filter((option) => option.id && option.text);
  }

  if (rawOptions && typeof rawOptions === "object") {
    return Object.entries(rawOptions)
      .map(([id, text]) => ({
        id: String(id).trim().replace(/[.)]$/, "").toUpperCase(),
        text: String(text).trim(),
      }))
      .filter((option) => option.id && option.text);
  }

  const typeValue = String(rawType || "").toLowerCase();
  const isBoolean =
    typeof rawAnswer === "boolean" ||
    typeValue.includes("true") ||
    typeValue.includes("false") ||
    typeValue.includes("verdadero") ||
    typeValue.includes("falso") ||
    typeValue.includes("boolean");

  return isBoolean
    ? [
        { id: "A", text: "Verdadero" },
        { id: "B", text: "Falso" },
      ]
    : [];
}

function normalizeQuestionType(rawType, options, rawAnswer) {
  const value = String(rawType || "").toLowerCase();
  const optionText = options.map((option) => option.text.toLowerCase()).join(" ");

  if (
    typeof rawAnswer === "boolean" ||
    value.includes("true") ||
    value.includes("false") ||
    value.includes("verdadero") ||
    value.includes("falso") ||
    value.includes("boolean") ||
    (options.length === 2 &&
      optionText.includes("verdadero") &&
      optionText.includes("falso"))
  ) {
    return "true_false";
  }

  return "multiple_choice";
}

function normalizeAnswer(rawAnswer, options, type) {
  if (typeof rawAnswer === "boolean") {
    return rawAnswer ? "A" : "B";
  }

  if (typeof rawAnswer === "number") {
    return (options[rawAnswer] || options[rawAnswer - 1] || {}).id || "";
  }

  const answer = String(rawAnswer || "").trim();
  if (!answer) {
    return "";
  }

  const cleaned = answer.replace(/[.)]$/, "");
  const byId = options.find(
    (option) => option.id.toLowerCase() === cleaned.toLowerCase(),
  );

  if (byId) {
    return byId.id;
  }

  if (type === "true_false") {
    const lowered = cleaned.toLowerCase();
    if (["true", "verdadero", "v"].includes(lowered)) {
      return "A";
    }
    if (["false", "falso", "f"].includes(lowered)) {
      return "B";
    }
  }

  const byText = options.find(
    (option) => option.text.toLowerCase() === cleaned.toLowerCase(),
  );
  return byText ? byText.id : "";
}

function firstNonEmptyString(values, fallback = "") {
  const found = values.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return found ? found.trim() : fallback;
}

function getRawBankTitle(rawBank) {
  if (Array.isArray(rawBank)) {
    return "Banco importado";
  }

  return firstNonEmptyString(
    [
      rawBank.title,
      rawBank.name,
      rawBank.examTitle,
      rawBank.courseTitle,
      rawBank.subject,
      rawBank.metadata?.title,
      rawBank.metadata?.name,
      rawBank.meta?.title,
      rawBank.meta?.name,
      rawBank.exam?.title,
      rawBank.exam?.name,
    ],
    "Banco importado",
  );
}

function getRawBankDescription(rawBank) {
  if (Array.isArray(rawBank)) {
    return "";
  }

  return firstNonEmptyString(
    [
      rawBank.description,
      rawBank.summary,
      rawBank.metadata?.description,
      rawBank.meta?.description,
      rawBank.exam?.description,
    ],
    "Banco de preguntas cargado desde JSON.",
  );
}

function normalizeBank(rawBank) {
  const rawQuestions = Array.isArray(rawBank)
    ? rawBank
    : rawBank.questions || rawBank.items || [];

  if (!Array.isArray(rawQuestions)) {
    throw new Error("El JSON no contiene un arreglo de preguntas.");
  }

  const questions = rawQuestions
    .map((rawQuestion, index) => {
      const rawAnswer =
        rawQuestion.answer ??
        rawQuestion.correctAnswer ??
        rawQuestion.correct_answer ??
        rawQuestion.correct;
      const options = normalizeOptions(
        rawQuestion.options || rawQuestion.choices,
        rawQuestion.type,
        rawAnswer,
      );
      const type = normalizeQuestionType(rawQuestion.type, options, rawAnswer);
      const answer = normalizeAnswer(rawAnswer, options, type);

      return {
        id: String(rawQuestion.id || `question-${index + 1}`),
        type,
        topic: String(rawQuestion.topic || rawQuestion.category || "General"),
        prompt: String(
          rawQuestion.prompt || rawQuestion.question || rawQuestion.text || "",
        ).trim(),
        options,
        answer,
        explanation: String(
          rawQuestion.explanation ||
            rawQuestion.rationale ||
            rawQuestion.feedback ||
            "Sin explicacion registrada.",
        ).trim(),
      };
    })
    .filter(
      (question) =>
        question.prompt &&
        question.options.length >= 2 &&
        question.answer &&
        question.options.some((option) => option.id === question.answer),
    );

  if (!questions.length) {
    throw new Error("No se encontraron preguntas validas en el JSON.");
  }

  return {
    title: getRawBankTitle(rawBank),
    description: getRawBankDescription(rawBank),
    version: Array.isArray(rawBank) ? "" : rawBank.version || "",
    questions,
  };
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function randomizeQuestionOptions(question) {
  const randomizedOptions = shuffle(
    question.options.map((option) => ({
      text: option.text,
      isCorrect: option.id === question.answer,
    })),
  ).map((option, index) => ({
    id: fallbackOptionId(index),
    text: option.text,
    isCorrect: option.isCorrect,
  }));
  const answer = randomizedOptions.find((option) => option.isCorrect)?.id;

  return {
    ...question,
    options: randomizedOptions.map(({ id, text }) => ({ id, text })),
    answer: answer || question.answer,
  };
}

function buildAttempt(questions, requestedSize = state.requestedExamSize) {
  const needed = Math.min(clampExamSize(requestedSize), questions.length);
  if (!needed) {
    return [];
  }

  return shuffle(questions).slice(0, needed).map(randomizeQuestionOptions);
}

function getStats() {
  const answered = state.attempt.filter((question) => state.answers[question.id]);
  const correct = answered.filter(
    (question) => state.answers[question.id] === question.answer,
  );
  const wrong = answered.length - correct.length;
  const total = state.attempt.length || clampExamSize(state.requestedExamSize);
  const completion = state.attempt.length
    ? Math.round((answered.length / state.attempt.length) * 100)
    : 0;
  const score = state.attempt.length
    ? Math.round((correct.length / state.attempt.length) * 100)
    : 0;
  const marked = Object.values(state.marked).filter(Boolean).length;

  return {
    total,
    answered: answered.length,
    correct: correct.length,
    wrong,
    completion,
    score,
    marked,
    remaining: Math.max(state.attempt.length - answered.length, 0),
  };
}

function formatSubmittedAt(date) {
  if (!date) {
    return "";
  }

  return date.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(Math.round(milliseconds / 1000), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getAttemptDuration() {
  if (!state.attemptStartedAt) {
    return 0;
  }

  const endTime = state.submittedAt ? state.submittedAt.getTime() : Date.now();
  return Math.max(endTime - state.attemptStartedAt, 0);
}

function trackActiveQuestionTime() {
  if (
    !state.activeQuestionId ||
    !state.activeQuestionStartedAt ||
    state.submitted ||
    state.answers[state.activeQuestionId]
  ) {
    return;
  }

  const elapsed = Date.now() - state.activeQuestionStartedAt;
  state.questionTimes[state.activeQuestionId] =
    (state.questionTimes[state.activeQuestionId] || 0) + Math.max(elapsed, 0);
  state.activeQuestionStartedAt = Date.now();
}

function activateCurrentQuestion() {
  const question = state.attempt[state.currentIndex];
  state.activeQuestionId = question?.id || null;
  state.activeQuestionStartedAt = question ? Date.now() : null;
}

function setCurrentQuestion(index) {
  trackActiveQuestionTime();
  state.currentIndex = Math.min(Math.max(index, 0), Math.max(state.attempt.length - 1, 0));
  activateCurrentQuestion();
}

function getTypeLabel(type) {
  return type === "true_false" ? "Verdadero/Falso" : "ABCD";
}

function setStatus(message) {
  els.bankStatus.textContent = message;
}

function getBankDisplayTitle() {
  return state.bank?.title || "Simulador de examenes";
}

function updateDocumentTitle() {
  const title = getBankDisplayTitle();
  els.appTitle.textContent = title;
  document.title = `${title} | Simulador`;
}

function updateBankStatus() {
  const total = state.bank?.questions.length || 0;
  if (!total) {
    return;
  }

  els.bankStatus.textContent = `${total} preguntas disponibles`;
  updateDocumentTitle();
  syncAttemptSizeInput();
}

function startAttempt(questions = state.bank?.questions || []) {
  state.requestedExamSize = clampExamSize(els.attemptSize.value);
  syncAttemptSizeInput();
  state.attempt = buildAttempt(questions);
  updateBankStatus();
  state.currentIndex = 0;
  state.answers = {};
  state.marked = {};
  state.submitted = false;
  state.resultOverlayOpen = false;
  state.submittedAt = null;
  state.attemptStartedAt = Date.now();
  state.activeQuestionId = state.attempt[0]?.id || null;
  state.activeQuestionStartedAt = state.activeQuestionId ? Date.now() : null;
  state.questionTimes = {};
  state.reviewQuestionId = state.activeQuestionId;
  render();
}

function optionClass(question, option, selected) {
  if (!selected) {
    return "";
  }

  if (option.id === question.answer) {
    return "correct";
  }

  if (option.id === selected) {
    return "wrong";
  }

  return "dim";
}

function renderQuestion() {
  const question = state.attempt[state.currentIndex];
  els.options.innerHTML = "";

  if (!question) {
    els.topicBadge.textContent = "Sin banco";
    els.typeBadge.textContent = "-";
    els.markedBadge.classList.add("hidden");
    els.questionCounter.textContent = "Pregunta 0 de 0";
    els.questionText.textContent = "No hay preguntas cargadas.";
    els.markReview.disabled = true;
    els.feedback.className = "feedback callout hidden";
    els.feedback.textContent = "";
    return;
  }

  const selected = state.answers[question.id];
  const correctOption = question.options.find((option) => option.id === question.answer);

  els.topicBadge.textContent = question.topic;
  els.typeBadge.textContent = question.type === "true_false" ? "Verdadero/Falso" : "ABCD";
  els.markedBadge.classList.toggle("hidden", !state.marked[question.id]);
  els.markReview.disabled = state.submitted;
  els.questionCounter.textContent = `Pregunta ${state.currentIndex + 1} de ${
    state.attempt.length
  }`;
  els.questionText.textContent = question.prompt;

  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button hollow expanded option ${optionClass(
      question,
      option,
      selected,
    )}`.trim();
    button.disabled = Boolean(selected);
    button.innerHTML = `
      <span class="letter">${option.id}</span>
      <span class="text"></span>
    `;
    button.querySelector(".text").textContent = option.text;
    button.addEventListener("click", () => {
      if (state.answers[question.id]) {
        return;
      }

      trackActiveQuestionTime();
      state.answers[question.id] = option.id;
      render();
    });
    els.options.appendChild(button);
  });

  if (selected) {
    const isCorrect = selected === question.answer;
    els.feedback.className = `feedback callout ${isCorrect ? "success" : "alert"}`;
    els.feedback.innerHTML = `
      <strong>${isCorrect ? "Correcta" : "Incorrecta"}</strong>
      ${
        isCorrect
          ? ""
          : `<p><b>Respuesta correcta:</b> ${question.answer}${
              correctOption ? ` - ${escapeHtml(correctOption.text)}` : ""
            }</p>`
      }
      <p>${escapeHtml(question.explanation)}</p>
    `;
  } else {
    els.feedback.className = "feedback callout hidden";
    els.feedback.textContent = "";
  }

  els.prevQuestion.disabled = state.currentIndex === 0;
  els.nextQuestion.disabled = state.currentIndex === state.attempt.length - 1;
}

function renderGrid() {
  els.questionGrid.innerHTML = "";
  state.attempt.forEach((question, index) => {
    const selected = state.answers[question.id];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "question-dot";
    if (index === state.currentIndex) {
      button.classList.add("current");
    } else if (selected === question.answer) {
      button.classList.add("correct");
    } else if (selected) {
      button.classList.add("wrong");
    }
    if (state.marked[question.id]) {
      button.classList.add("marked");
    }
    button.textContent = String(index + 1);
    button.addEventListener("click", () => {
      setCurrentQuestion(index);
      render();
    });
    els.questionGrid.appendChild(button);
  });
}

function renderStats() {
  const stats = getStats();
  els.sourceLabel.textContent = state.sourceLabel;
  els.progressStatus.textContent = `${stats.answered}/${stats.total} respondidas`;
  els.scoreStatus.textContent = `${stats.correct} correctas - ${stats.score}%`;
  els.scoreBig.textContent = `${stats.score}%`;
  els.scoreCount.textContent = `${stats.correct}/${stats.total}`;
  els.correctCount.textContent = stats.correct;
  els.wrongCount.textContent = stats.wrong;
  els.markedCount.textContent = stats.marked;
  els.pendingCount.textContent = `${stats.remaining} pendientes`;
  els.progressFill.style.width = `${stats.completion}%`;
  els.bankTitle.textContent = state.bank?.title || "Sin banco";
  els.bankTotal.textContent = state.bank?.questions.length || 0;
  els.attemptTotal.textContent = state.attempt.length || 0;
  els.nextPending.disabled = stats.remaining === 0;
  els.submitExam.disabled =
    !state.attempt.length || stats.remaining > 0 || state.submitted;
  els.submitExam.textContent = state.submitted ? "Examen enviado" : "Enviar examen";
  els.viewResults.classList.toggle("hidden", !state.submitted);
  els.viewResults.disabled = !state.submitted;
  els.newAttempt.disabled = !state.bank;
}

function getQuestionResult(question) {
  const selected = state.answers[question.id];
  const correctOption = question.options.find((option) => option.id === question.answer);
  const selectedOption = question.options.find((option) => option.id === selected);

  return {
    selected,
    correctOption,
    selectedOption,
    isCorrect: selected === question.answer,
    time: state.questionTimes[question.id] || 0,
  };
}

function renderReviewList() {
  els.reviewQuestionList.innerHTML = "";

  state.attempt.forEach((question, index) => {
    const result = getQuestionResult(question);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `review-question-item ${
      result.isCorrect ? "correct" : "wrong"
    } ${state.reviewQuestionId === question.id ? "current" : ""}`.trim();

    const number = document.createElement("strong");
    number.textContent = String(index + 1);

    const body = document.createElement("span");
    body.className = "review-question-copy";

    const topic = document.createElement("span");
    topic.className = "review-question-topic";
    topic.textContent = question.topic;

    const meta = document.createElement("span");
    meta.className = "review-question-meta";
    meta.textContent = `${result.isCorrect ? "Correcta" : "Incorrecta"} - ${formatDuration(
      result.time,
    )}`;

    body.append(topic, meta);
    button.append(number, body);
    button.addEventListener("click", () => {
      state.reviewQuestionId = question.id;
      setCurrentQuestion(index);
      render();
    });
    els.reviewQuestionList.appendChild(button);
  });
}

function renderReviewDetail() {
  const question =
    state.attempt.find((item) => item.id === state.reviewQuestionId) || state.attempt[0];

  els.reviewQuestionDetail.innerHTML = "";

  if (!question) {
    els.reviewQuestionTitle.textContent = "Detalle";
    els.reviewQuestionDetail.textContent = "Sin preguntas para revisar.";
    return;
  }

  const index = state.attempt.findIndex((item) => item.id === question.id);
  const result = getQuestionResult(question);

  els.reviewQuestionTitle.textContent = `Pregunta ${index + 1}`;

  const meta = document.createElement("div");
  meta.className = "review-detail-meta";

  [question.topic, getTypeLabel(question.type), formatDuration(result.time)].forEach((value) => {
    const label = document.createElement("span");
    label.className = "label secondary";
    label.textContent = value;
    meta.appendChild(label);
  });

  const prompt = document.createElement("p");
  prompt.className = "review-prompt";
  prompt.textContent = question.prompt;

  const optionList = document.createElement("div");
  optionList.className = "review-option-list";

  question.options.forEach((option) => {
    const row = document.createElement("div");
    const isSelected = option.id === result.selected;
    const isCorrect = option.id === question.answer;
    row.className = `review-option ${isCorrect ? "correct" : ""} ${
      isSelected && !isCorrect ? "wrong" : ""
    }`.trim();

    const letter = document.createElement("strong");
    letter.textContent = option.id;

    const text = document.createElement("span");
    text.textContent = option.text;

    const status = document.createElement("em");
    status.textContent = isCorrect && isSelected
      ? "Correcta y elegida"
      : isCorrect
        ? "Correcta"
        : isSelected
          ? "Elegida"
          : "";

    row.append(letter, text, status);
    optionList.appendChild(row);
  });

  const explanation = document.createElement("div");
  explanation.className = "callout explanation-box";

  const explanationTitle = document.createElement("strong");
  explanationTitle.textContent = result.isCorrect
    ? "Tu respuesta fue correcta"
    : "Revision de la respuesta";

  const correctAnswer = document.createElement("p");
  correctAnswer.innerHTML = `<b>Respuesta correcta:</b> ${escapeHtml(
    question.answer,
  )} - ${escapeHtml(result.correctOption?.text || "")}`;

  const selectedAnswer = document.createElement("p");
  selectedAnswer.innerHTML = `<b>Tu respuesta:</b> ${escapeHtml(
    result.selected || "-",
  )} - ${escapeHtml(result.selectedOption?.text || "Sin respuesta")}`;

  const rationale = document.createElement("p");
  rationale.textContent = question.explanation;

  explanation.append(explanationTitle, selectedAnswer, correctAnswer, rationale);
  els.reviewQuestionDetail.append(meta, prompt, optionList, explanation);
}

function renderDashboard() {
  const stats = getStats();
  const showOverlay = state.submitted && state.resultOverlayOpen;
  els.resultOverlay.classList.toggle("hidden", !showOverlay);

  if (!state.submitted) {
    return;
  }

  if (!showOverlay) {
    return;
  }

  const totalTime = getAttemptDuration();
  const averageTime = stats.total ? totalTime / stats.total : 0;

  els.resultStatus.textContent = `${stats.correct} correctas de ${stats.total} preguntas enviadas.`;
  els.resultScore.textContent = `${stats.score}%`;
  els.resultAnswered.textContent = `${stats.answered}/${stats.total}`;
  els.resultCorrect.textContent = stats.correct;
  els.resultWrong.textContent = stats.wrong;
  els.resultPending.textContent = `${stats.remaining} pendientes`;
  els.resultMarked.textContent = stats.marked;
  els.resultTotalTime.textContent = formatDuration(totalTime);
  els.resultAverageTime.textContent = formatDuration(averageTime);
  els.resultMeta.textContent = `Enviado: ${formatSubmittedAt(state.submittedAt)}`;
  state.reviewQuestionId = state.reviewQuestionId || state.attempt[0]?.id || null;

  renderReviewList();
  renderReviewDetail();
}

function render() {
  renderQuestion();
  renderGrid();
  renderStats();
  renderDashboard();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

async function loadDefaultBank() {
  try {
    const response = await fetch(DEFAULT_BANK_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("No se pudo cargar el JSON por defecto.");
    }

    state.bank = normalizeBank(await response.json());
    setStatus(`${state.bank.questions.length} preguntas disponibles`);
    startAttempt(state.bank.questions);
  } catch (error) {
    setStatus(error.message || "Error al cargar JSON.");
    render();
  }
}

async function handleJsonUpload(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  try {
    state.bank = normalizeBank(JSON.parse(await file.text()));
    state.sourceLabel = file.name;
    setStatus(`${state.bank.questions.length} preguntas disponibles`);
    startAttempt(state.bank.questions);
  } catch (error) {
    setStatus(error.message || "No se pudo leer el archivo JSON.");
  } finally {
    event.target.value = "";
  }
}

els.loadJson.addEventListener("click", () => els.jsonInput.click());
els.jsonInput.addEventListener("change", handleJsonUpload);
els.newAttempt.addEventListener("click", () => startAttempt());
els.attemptSize.addEventListener("change", () => {
  state.requestedExamSize = clampExamSize(els.attemptSize.value);
  syncAttemptSizeInput();
});
els.themeOptions.forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.dataset.themeChoice;
    applyTheme(theme);
    saveTheme(state.theme);
  });
});
els.markReview.addEventListener("click", () => {
  const question = state.attempt[state.currentIndex];
  if (!question) {
    return;
  }
  state.marked[question.id] = !state.marked[question.id];
  render();
});
els.prevQuestion.addEventListener("click", () => {
  setCurrentQuestion(state.currentIndex - 1);
  render();
});
els.nextQuestion.addEventListener("click", () => {
  setCurrentQuestion(state.currentIndex + 1);
  render();
});
els.nextPending.addEventListener("click", () => {
  const pendingIndex = state.attempt.findIndex((question) => !state.answers[question.id]);
  if (pendingIndex >= 0) {
    setCurrentQuestion(pendingIndex);
    render();
  }
});
els.viewResults.addEventListener("click", () => {
  if (!state.submitted) {
    return;
  }

  state.resultOverlayOpen = true;
  render();
});
els.closeDashboard.addEventListener("click", () => {
  state.resultOverlayOpen = false;
  render();
});
els.resultOverlay.addEventListener("click", (event) => {
  if (event.target === els.resultOverlay) {
    state.resultOverlayOpen = false;
    render();
  }
});
els.submitExam.addEventListener("click", () => {
  const stats = getStats();
  if (!state.attempt.length || stats.remaining > 0) {
    const pendingIndex = state.attempt.findIndex((question) => !state.answers[question.id]);
    if (pendingIndex >= 0) {
      setCurrentQuestion(pendingIndex);
    }
    render();
    return;
  }

  trackActiveQuestionTime();
  state.submitted = true;
  state.submittedAt = new Date();
  state.resultOverlayOpen = true;
  state.reviewQuestionId = state.attempt[0]?.id || null;
  render();
});

applyTheme(getStoredTheme());
render();
loadDefaultBank();
