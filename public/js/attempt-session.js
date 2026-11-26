import { buildAttempt } from "./attempt-engine.js";
import { getQuestionResult, getStats } from "./scoring.js";

export function newAttemptDraft({ bank, source }, size, random = Math.random) {
  return {
    bank: { title: bank.title, examLevel: bank.examLevel, total: bank.questions.length, source },
    attempt: buildAttempt(bank.questions, size, bank.questions.length, random),
    answers: Object.create(null),
    marked: Object.create(null),
    questionTimes: Object.create(null),
    currentIndex: 0,
    elapsed: 0,
  };
}

export function createAttemptSession(draft, { now = Date.now } = {}) {
  const state = structuredClone(draft);
  for (const field of ["answers", "marked", "questionTimes"]) {
    state[field] = Object.assign(Object.create(null), state[field]);
  }

  let phase = "paused";
  let visible = true;
  let clockStart = null;

  function currentQuestion() {
    return state.attempt[state.currentIndex];
  }

  function checkpoint() {
    if (clockStart === null) return;
    const time = now();
    const delta = Math.max(0, time - clockStart);
    state.elapsed += delta;
    const { id } = currentQuestion();
    if (phase === "answering" && !state.answers[id]) {
      state.questionTimes[id] = (state.questionTimes[id] ?? 0) + delta;
    }
    clockStart = time;
  }

  function syncClock() {
    const running = phase === "answering" || phase === "reviewing";
    clockStart = running && visible ? now() : null;
  }

  function setPhase(next) {
    checkpoint();
    phase = next;
    syncClock();
  }

  function item(index = state.currentIndex) {
    const question = state.attempt[index];
    return {
      index,
      question,
      result: getQuestionResult(question, state.answers, state.questionTimes),
      marked: Boolean(state.marked[question.id]),
    };
  }

  return {
    get phase() { return phase; },
    get bank() { return state.bank; },
    get index() { return state.currentIndex; },
    get total() { return state.attempt.length; },
    get elapsed() {
      return state.elapsed + (clockStart === null ? 0 : Math.max(0, now() - clockStart));
    },
    get stats() { return getStats(state); },
    item,
    items() {
      return state.attempt.map((_, index) => item(index));
    },
    snapshot() {
      checkpoint();
      return structuredClone(state);
    },
    setVisible(value) {
      if (value === visible) return;
      checkpoint();
      visible = value;
      syncClock();
    },
    resume() {
      if (phase !== "paused" && phase !== "reviewing") return false;
      setPhase("answering");
      return true;
    },
    pause() {
      if (phase !== "answering" && phase !== "reviewing") return false;
      setPhase("paused");
      return true;
    },
    navigate(index) {
      if (phase === "paused" || !Number.isInteger(index) || !state.attempt[index]) return false;
      checkpoint();
      state.currentIndex = index;
      if (phase === "reviewing") phase = "answering";
      syncClock();
      return true;
    },
    nextPending() {
      const pending = (question) => !state.answers[question.id];
      const next = state.attempt.findIndex((question, index) => index > state.currentIndex && pending(question));
      return next === -1 ? state.attempt.findIndex(pending) : next;
    },
    answer(optionId) {
      const question = currentQuestion();
      if (phase !== "answering" || state.answers[question.id]) return false;
      if (!question.options.some((option) => option.id === optionId)) return false;
      checkpoint();
      state.answers[question.id] = optionId;
      return true;
    },
    toggleMark() {
      if (phase !== "answering") return false;
      const { id } = currentQuestion();
      if (state.marked[id]) {
        delete state.marked[id];
      } else {
        state.marked[id] = true;
      }
      return true;
    },
    review() {
      if (phase !== "answering") return false;
      setPhase("reviewing");
      return true;
    },
    submit() {
      if (phase !== "reviewing") return null;
      const stats = getStats(state);
      if (stats.remaining > 0) return null;
      setPhase("submitted");
      return structuredClone({
        bank: state.bank,
        duration: state.elapsed,
        submittedAt: now(),
        stats,
        entries: state.attempt.map((_, index) => item(index)),
      });
    },
  };
}
