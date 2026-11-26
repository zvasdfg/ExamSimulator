import { validateBank } from "./bank-validator.js";

export const ATTEMPT_STORAGE_KEY = "exam-simulator-attempts";
const VERSION = 1;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validBank(bank) {
  return isRecord(bank)
    && typeof bank.title === "string"
    && Array.isArray(bank.questions)
    && bank.questions.every((question) =>
      isRecord(question)
      && Array.isArray(question.options)
      && question.options.every(isRecord))
    && validateBank(bank).valid;
}

function validSummary(bank) {
  return isRecord(bank) && typeof bank.title === "string" && typeof bank.source === "string"
    && Number.isInteger(bank.total) && bank.total > 0;
}

function validTime(value) {
  return Number.isFinite(value) && value >= 0;
}

function validDraft(draft) {
  if (!isRecord(draft) || !validSummary(draft.bank)) return false;
  if (!validBank({ ...draft.bank, questions: draft.attempt })) return false;
  if (!Number.isInteger(draft.currentIndex) || !draft.attempt[draft.currentIndex]) return false;
  if (!validTime(draft.elapsed)) return false;
  if (![draft.answers, draft.marked, draft.questionTimes].every(isRecord)) return false;

  const questions = new Map(draft.attempt.map((question) => [question.id, question]));
  return Object.entries(draft.answers).every(([id, answer]) =>
    questions.get(id)?.options.some((option) => option.id === answer))
    && Object.entries(draft.marked).every(([id, value]) => questions.has(id) && value === true)
    && Object.entries(draft.questionTimes).every(([id, value]) => questions.has(id) && validTime(value));
}

function validResult(result) {
  if (!isRecord(result) || !validSummary(result.bank)) return false;
  if (!validTime(result.duration) || !validTime(result.submittedAt)) return false;
  if (!Number.isFinite(new Date(result.submittedAt).getTime())) return false;
  if (!isRecord(result.stats) || !Array.isArray(result.entries) || !result.entries.length) return false;
  if (result.stats.total !== result.entries.length || !Number.isFinite(result.stats.score)) return false;
  return result.entries.every((entry, index) =>
    isRecord(entry) && entry.index === index && isRecord(entry.result) && validTime(entry.result.time))
    && validBank({ ...result.bank, questions: result.entries.map(({ question }) => question) });
}

function decode(raw) {
  if (raw === null) return {};
  try {
    const value = JSON.parse(raw);
    if (value?.version !== VERSION) return {};
    const { draft, result, imported } = value;
    return {
      draft: validDraft(draft) ? draft : null,
      result: validResult(result) ? result : null,
      imported: isRecord(imported) && typeof imported.source === "string" && validBank(imported.bank)
        ? imported
        : null,
    };
  } catch {
    return {};
  }
}

export function createAttemptStore(getStorage = () => globalThis.localStorage) {
  let lastRead;
  return {
    load() {
      try {
        lastRead = getStorage().getItem(ATTEMPT_STORAGE_KEY);
        return decode(lastRead);
      } catch {
        return {};
      }
    },
    save(data) {
      try {
        const storage = getStorage();
        const current = storage.getItem(ATTEMPT_STORAGE_KEY);
        if (lastRead !== undefined && current !== lastRead) return "conflict";
        const next = JSON.stringify({ version: VERSION, ...data });
        if (next !== current) storage.setItem(ATTEMPT_STORAGE_KEY, next);
        lastRead = next;
        return "saved";
      } catch {
        return "unavailable";
      }
    },
  };
}
