const ICONS = "./assets/icons.svg";
const SVG_NS = "http://www.w3.org/2000/svg";

export function setIcon(use, name) {
  use.setAttribute("href", `${ICONS}#${name}`);
}

export function icon(name, className = "icon") {
  const svg = document.createElementNS(SVG_NS, "svg");
  const use = document.createElementNS(SVG_NS, "use");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  setIcon(use, name);
  svg.append(use);
  return svg;
}

export function formatDuration(milliseconds) {
  const seconds = Math.max(Math.round(milliseconds / 1000), 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const time = [minutes, seconds % 60].map((part) => String(part).padStart(2, "0")).join(":");
  return hours ? `${hours}:${time}` : time;
}

export function questionTypeLabel(question) {
  return question.type === "true_false" ? "Verdadero o falso" : "Opción múltiple";
}
