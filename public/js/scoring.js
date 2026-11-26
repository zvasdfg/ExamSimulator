import { DEFAULT_EXAM_SIZE } from "./constants.js";
import { clampExamSize } from "./attempt-engine.js";

export function getStats({
  attempt,
  answers,
  marked,
  requestedExamSize = DEFAULT_EXAM_SIZE,
  maxExamSize = attempt.length || DEFAULT_EXAM_SIZE,
}) {
  const answered = attempt.filter((question) => answers[question.id]);
  const correct = answered.filter(
    (question) => answers[question.id] === question.answer,
  );
  const wrong = answered.length - correct.length;
  const total = attempt.length || clampExamSize(requestedExamSize, maxExamSize);
  const completion = attempt.length
    ? Math.round((answered.length / attempt.length) * 100)
    : 0;
  const score = attempt.length
    ? Math.round((correct.length / attempt.length) * 100)
    : 0;
  const markedCount = Object.values(marked || {}).filter(Boolean).length;

  return {
    total,
    answered: answered.length,
    correct: correct.length,
    wrong,
    completion,
    score,
    marked: markedCount,
    remaining: Math.max(attempt.length - answered.length, 0),
  };
}

export function getQuestionResult(question, answers, questionTimes = {}) {
  const selected = answers[question.id];
  const correctOption = question.options.find((option) => option.id === question.answer);
  const selectedOption = question.options.find((option) => option.id === selected);

  return {
    selected,
    correctOption,
    selectedOption,
    isCorrect: selected === question.answer,
    time: questionTimes[question.id] || 0,
  };
}
