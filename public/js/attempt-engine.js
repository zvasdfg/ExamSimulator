import { DEFAULT_EXAM_SIZE } from "./constants.js";
import { fallbackOptionId } from "./bank-normalizer.js";

export function clampExamSize(value, maxExamSize, defaultSize = DEFAULT_EXAM_SIZE) {
  const maximum = Math.max(Number(maxExamSize) || defaultSize, 1);
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return Math.min(defaultSize, maximum);
  }

  return Math.min(Math.max(parsed, 1), maximum);
}

export function shuffle(items, random = Math.random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

export function randomizeQuestionOptions(question, random = Math.random) {
  const randomizedOptions = shuffle(
    question.options.map((option) => ({
      text: option.text,
      isCorrect: option.id === question.answer,
    })),
    random,
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

export function buildAttempt(
  questions,
  requestedSize = DEFAULT_EXAM_SIZE,
  maxExamSize = questions.length,
  random = Math.random,
) {
  const needed = Math.min(clampExamSize(requestedSize, maxExamSize), questions.length);
  if (!needed) {
    return [];
  }

  return shuffle(questions, random).slice(0, needed).map((question) =>
    randomizeQuestionOptions(question, random),
  );
}
