import { formatDuration, icon, questionTypeLabel, setIcon } from "./view-utils.js";

const statusLabels = { correct: "correcta", wrong: "incorrecta", pending: "pendiente" };

function makeOption(option) {
  const button = document.createElement("button");
  const letter = document.createElement("span");
  const text = document.createElement("span");
  const status = icon("check", "icon option-status");

  button.type = "button";
  button.className = "option";
  button.dataset.answerId = option.id;
  letter.className = "option-letter";
  letter.textContent = option.id;
  text.textContent = option.text;
  status.setAttribute("hidden", "");
  button.append(letter, text, status);
  return button;
}

function makeDot(_, index) {
  const button = document.createElement("button");
  const label = document.createElement("span");
  const status = icon("check", "icon dot-status");
  const bookmark = icon("bookmark", "icon dot-mark icon-marked");

  button.type = "button";
  button.className = "question-dot";
  button.dataset.index = index;
  label.textContent = index + 1;
  button.append(label, status, bookmark);
  return button;
}

export function createExamView(root) {
  const byId = (id) => root.querySelector(`#${id}`);
  const questionText = byId("question-text");
  const options = byId("options");
  const grid = byId("question-grid");
  const mark = byId("mark-review");

  function renderAnswer({ question, result }, announce = false) {
    const answered = Boolean(result.selected);
    const feedback = byId("feedback");
    for (const button of options.children) {
      const id = button.dataset.answerId;
      const selected = id === result.selected;
      const correct = id === question.answer;
      button.setAttribute("aria-pressed", String(selected));
      button.tabIndex = !answered || selected ? 0 : -1;
      if (answered) {
        button.setAttribute("aria-disabled", "true");
        button.dataset.state = correct ? "correct" : selected ? "wrong" : "muted";
        const status = button.lastElementChild;
        status.toggleAttribute("hidden", !correct && !selected);
        setIcon(status.firstElementChild, correct ? "check" : "x");
      }
    }

    feedback.hidden = !answered;
    byId("feedback-live").textContent = "";
    if (!answered) return;
    const title = result.isCorrect ? "Respuesta correcta" : "Respuesta incorrecta";
    const correctAnswer = result.isCorrect ? "" : `La opción correcta es ${question.answer}. ${result.correctOption.text}`;
    feedback.dataset.state = result.isCorrect ? "correct" : "wrong";
    setIcon(byId("feedback-icon"), result.isCorrect ? "circle-check" : "circle-alert");
    byId("feedback-title").textContent = title;
    byId("feedback-answer").textContent = correctAnswer;
    byId("feedback-answer").hidden = !correctAnswer;
    byId("feedback-explanation").textContent = question.explanation;
    if (announce) {
      byId("feedback-live").textContent = [title, correctAnswer].filter(Boolean).join(". ");
    }
  }

  function renderMark({ marked }, submitted) {
    mark.setAttribute("aria-pressed", String(marked));
    mark.disabled = submitted;
    byId("mark-label").textContent = marked ? "Marcada" : "Marcar";
  }

  function renderMap(session) {
    Array.from(grid.children).forEach((button, index) => {
      const { result, marked } = session.item(index);
      const status = result.selected ? (result.isCorrect ? "correct" : "wrong") : "pending";
      const [, statusIcon, bookmark] = button.children;
      button.dataset.state = status;
      statusIcon.toggleAttribute("hidden", !result.selected);
      setIcon(statusIcon.firstElementChild, result.isCorrect ? "check" : "x");
      bookmark.toggleAttribute("hidden", !marked);
      button.setAttribute(
        "aria-label",
        `Pregunta ${index + 1}, ${statusLabels[status]}${marked ? ", marcada para revisar" : ""}`,
      );
      if (index === session.index) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  function renderProgress(session) {
    const stats = session.stats;
    const submitted = session.phase === "submitted";
    const count = `${stats.answered} de ${stats.total} respondidas`;
    byId("progress-status").textContent = count;
    byId("progress-percent").textContent = `${stats.completion}%`;
    byId("progress-track").setAttribute("aria-valuenow", stats.completion);
    byId("progress-track").setAttribute("aria-valuetext", count);
    byId("progress-fill").style.width = `${stats.completion}%`;
    byId("correct-count").textContent = stats.correct;
    byId("wrong-count").textContent = stats.wrong;
    byId("pending-count").textContent = stats.remaining === 1 ? "1 pendiente" : `${stats.remaining} pendientes`;
    byId("next-pending").hidden = !stats.remaining;
    byId("review-attempt").hidden = submitted;
    byId("review-attempt").dataset.ready = String(stats.remaining === 0);
    byId("view-results").hidden = !submitted;
  }

  function showQuestion(session, focus = false) {
    const item = session.item();
    const { question } = item;
    const submitted = session.phase === "submitted";
    const isLast = session.index === session.total - 1;
    byId("question-counter").textContent = `Pregunta ${session.index + 1} de ${session.total}`;
    byId("topic-badge").textContent = question.topic;
    byId("type-badge").textContent = questionTypeLabel(question);
    questionText.textContent = question.prompt;
    options.replaceChildren(...question.options.map(makeOption));
    byId("feedback-details").open = false;
    byId("prev-question").disabled = session.index === 0;
    byId("next-question").disabled = isLast && submitted;
    byId("next-label").textContent = isLast && !submitted ? "Revisar intento" : "Siguiente";
    renderMark(item, submitted);
    renderAnswer(item);
    renderMap(session);

    if (focus) {
      questionText.focus({ preventScroll: true });
      const panel = questionText.closest(".question-panel");
      if (panel.getBoundingClientRect().top < 8 || questionText.getBoundingClientRect().bottom > window.innerHeight) {
        panel.scrollIntoView({ block: "start" });
      }
    }
  }

  return {
    open(session, focus) {
      grid.replaceChildren(...Array.from({ length: session.total }, makeDot));
      showQuestion(session, focus);
      renderProgress(session);
      const current = grid.children[session.index];
      grid.scrollTop = Math.max(0, current.offsetTop - grid.children[0].offsetTop - grid.clientHeight / 2);
    },
    showQuestion,
    answer(session) {
      renderAnswer(session.item(), true);
      renderProgress(session);
      renderMap(session);
    },
    mark(session) {
      renderMark(session.item(), session.phase === "submitted");
      renderMap(session);
    },
    setElapsed(elapsed) {
      byId("elapsed-time").textContent = formatDuration(elapsed);
    },
  };
}
