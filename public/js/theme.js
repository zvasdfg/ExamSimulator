import { THEMES, THEME_STORAGE_KEY } from "./constants.js";

export function normalizeTheme(theme) {
  if (theme === "extra-dark" || theme === "black") {
    return "oled";
  }

  return THEMES.includes(theme) ? theme : "light";
}

export function getStoredTheme(storage) {
  try {
    return normalizeTheme((storage ?? globalThis.localStorage).getItem(THEME_STORAGE_KEY));
  } catch (error) {
    return "light";
  }
}

export function saveTheme(theme, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(THEME_STORAGE_KEY, normalizeTheme(theme));
  } catch (error) {}
}

export function applyTheme(theme, options = {}) {
  const normalizedTheme = normalizeTheme(theme);
  const root = options.root || document.documentElement;
  const controls = options.controls || [];

  if (root) {
    if (normalizedTheme === "light") {
      root.removeAttribute("data-theme");
    } else {
      root.dataset.theme = normalizedTheme;
    }
  }

  controls.forEach((button) => {
    const active = button.dataset.themeChoice === normalizedTheme;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  return normalizedTheme;
}
