import { icon, setIcon } from "./view-utils.js";

export function createSubmissionView(root, openQuestion) {
  const byId = (id) => root.querySelector(`#${id}`);
  const buttons = root.querySelectorAll("[data-summary-filter]");
  const list = byId("submission-list");
  let items = [];

  function showList(filter) {
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.summaryFilter === filter));
    });
    const visible = items.filter(({ result, marked }) =>
      filter === "all" || (filter === "pending" && !result.selected) || (filter === "marked" && marked),
    );

    list.replaceChildren(...visible.map(({ index, question, result, marked }) => {
      const row = document.createElement("li");
      const button = document.createElement("button");
      const number = document.createElement("span");
      const prompt = document.createElement("span");
      const status = document.createElement("span");

      button.type = "button";
      button.dataset.jump = index;
      number.className = "summary-number";
      number.textContent = index + 1;
      number.setAttribute("aria-hidden", "true");
      prompt.className = "summary-prompt";
      prompt.textContent = question.prompt;
      status.className = "summary-status";
      status.dataset.state = result.selected ? "answered" : "pending";
      status.textContent = [result.selected ? "Respondida" : "Pendiente", marked ? "Marcada" : ""]
        .filter(Boolean).join(" · ");
      button.setAttribute("aria-label", `Pregunta ${index + 1}. ${question.prompt} ${status.textContent}`);
      button.append(number, prompt, status, icon("chevron-right"));
      row.append(button);
      return row;
    }));
    list.scrollTop = 0;
    const empty = byId("submission-empty");
    empty.hidden = visible.length > 0;
    empty.textContent = filter === "marked" ? "No hay preguntas marcadas." : "No hay preguntas pendientes.";
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => showList(button.dataset.summaryFilter));
  });
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-jump]");
    if (button) openQuestion(Number(button.dataset.jump));
  });

  return {
    open(session) {
      const stats = session.stats;
      items = session.items();
      byId("finish-answered").textContent = stats.answered;
      byId("finish-pending").textContent = stats.remaining;
      byId("finish-marked").textContent = stats.marked;
      byId("finish-message").hidden = !stats.remaining;
      byId("confirm-finish-label").textContent = stats.remaining ? "Ir a pendiente" : "Confirmar envío";
      setIcon(byId("confirm-finish-icon"), stats.remaining ? "arrow-right" : "send");
      showList("all");
    },
  };
}
