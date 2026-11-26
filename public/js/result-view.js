import { formatDuration, icon, questionTypeLabel } from "./view-utils.js";

const submissionDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function createResultView(dialog) {
  const byId = (id) => dialog.querySelector(`#${id}`);
  const list = byId("review-question-list");
  const emptyState = byId("review-empty");
  const detail = byId("review-detail");
  const detailTitle = byId("review-question-title");
  const filterButtons = dialog.querySelectorAll("[data-review-filter]");
  let entries = [];
  let filter = "all";
  let selectedIndex = 0;

  function renderOption(option, question, result) {
    const row = document.createElement("li");
    const letter = document.createElement("span");
    const text = document.createElement("span");
    const labels = document.createElement("span");
    const isCorrect = option.id === question.answer;
    const isSelected = option.id === result.selected;

    row.className = "review-option";
    letter.className = "option-letter";
    letter.textContent = option.id;
    text.textContent = option.text;
    labels.className = "review-option-label";
    if (isCorrect || isSelected) {
      row.dataset.state = isCorrect ? "correct" : "wrong";
      labels.append(icon(isCorrect ? "check" : "x"));
      labels.append(
        isCorrect && isSelected ? "Tu respuesta, correcta" : isCorrect ? "Respuesta correcta" : "Tu respuesta",
      );
    }
    row.append(letter, text, labels);
    return row;
  }

  function showQuestion(entry) {
    const { question, index, result, marked } = entry;
    selectedIndex = index;
    list.querySelector("[aria-current]")?.removeAttribute("aria-current");
    list.querySelector(`[data-review-index="${index}"]`)?.setAttribute("aria-current", "true");
    detailTitle.textContent = `Pregunta ${index + 1}`;
    byId("review-question-meta").textContent = [
      question.topic,
      questionTypeLabel(question),
      `Tiempo: ${formatDuration(result.time)}`,
      marked ? "Marcada" : "",
    ].filter(Boolean).join(" · ");
    byId("review-question-text").textContent = question.prompt;
    byId("review-options").replaceChildren(
      ...question.options.map((option) => renderOption(option, question, result)),
    );
    byId("review-explanation").textContent = question.explanation;
  }

  function renderList() {
    const visible = entries.filter((entry) => {
      if (filter === "wrong") return !entry.result.isCorrect;
      if (filter === "marked") return entry.marked;
      return true;
    });
    const current = visible.find((entry) => entry.index === selectedIndex) || visible[0];

    list.replaceChildren(...visible.map(({ index, result, marked }) => {
      const button = document.createElement("button");
      const number = document.createElement("span");
      const info = document.createElement("span");
      const title = document.createElement("strong");
      const status = document.createElement("small");

      button.className = "review-item";
      button.type = "button";
      button.dataset.reviewIndex = index;
      number.className = `review-item-number ${result.isCorrect ? "is-correct" : "is-wrong"}`;
      number.textContent = index + 1;
      number.setAttribute("aria-hidden", "true");
      title.textContent = `Pregunta ${index + 1}`;
      status.textContent = `${result.isCorrect ? "Correcta" : "Incorrecta"} · ${formatDuration(result.time)}`;
      info.append(title, status);
      button.append(number, info);
      if (marked) {
        button.append(icon("bookmark", "icon icon-marked"));
        const markLabel = document.createElement("span");
        markLabel.className = "show-for-sr";
        markLabel.textContent = "Marcada";
        button.append(markLabel);
      }
      return button;
    }));
    list.hidden = !current;
    detail.hidden = !current;
    emptyState.hidden = Boolean(current);
    if (current) {
      showQuestion(current);
    } else {
      emptyState.textContent = filter === "wrong" ? "No hubo respuestas incorrectas." : "No marcaste preguntas.";
    }
  }

  function setFilter(value) {
    filter = value;
    filterButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.reviewFilter === filter));
    });
    renderList();
    list.scrollTop = 0;
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.reviewFilter));
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-review-index]");
    if (!button) return;
    showQuestion(entries[Number(button.dataset.reviewIndex)]);
    if (window.matchMedia("(max-width: 42rem)").matches) {
      detailTitle.focus({ preventScroll: true });
      detailTitle.scrollIntoView({ block: "start" });
    }
  });

  return {
    open({ bank, entries: submittedEntries, submittedAt, duration, stats }) {
      byId("result-bank").textContent = bank.title;
      byId("result-score").textContent = `${stats.score}%`;
      byId("result-answered").textContent = `${stats.answered} de ${stats.total} respondidas`;
      byId("result-correct").textContent = stats.correct;
      byId("result-wrong").textContent = stats.wrong;
      byId("result-marked").textContent = stats.marked;
      byId("result-total-time").textContent = formatDuration(duration);
      byId("result-average-time").textContent = formatDuration(duration / stats.total);
      byId("result-meta").textContent = `Enviado el ${submissionDate.format(submittedAt)}`;
      entries = submittedEntries;
      selectedIndex = 0;
      setFilter("all");
      dialog.showModal();
      dialog.querySelector(".report-body").scrollTop = 0;
    },
  };
}
