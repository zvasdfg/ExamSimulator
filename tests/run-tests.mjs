import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeBank } from "../public/js/bank-normalizer.js";
import { assertValidBank, validateBank } from "../public/js/bank-validator.js";
import {
  buildAttempt,
  clampExamSize,
  randomizeQuestionOptions,
} from "../public/js/attempt-engine.js";
import { createAttemptSession, newAttemptDraft } from "../public/js/attempt-session.js";
import { ATTEMPT_STORAGE_KEY, createAttemptStore } from "../public/js/attempt-store.js";
import { DEFAULT_BANK } from "../public/js/constants.js";
import { getQuestionResult, getStats } from "../public/js/scoring.js";
import { normalizeTheme } from "../public/js/theme.js";

function constantRandom(value) {
  return () => value;
}

function testDefaultBank() {
  return readFile(new URL(`../public/question-banks/${DEFAULT_BANK}`, import.meta.url), "utf8")
    .then((contents) => {
      const bank = normalizeBank(JSON.parse(contents));
      const validation = assertValidBank(bank);

      assert.equal(bank.questions.length, 120);
      assert.equal(validation.errors.length, 0);
      assert.match(bank.title, /^Contenedores\b/i);
      assert.equal(bank.examLevel, "maestria");
    });
}

function testFlexibleBankNormalization() {
  const bank = normalizeBank({
    metadata: { title: "Banco flexible" },
    items: [
      {
        id: "bool-1",
        type: "boolean",
        question: "SecDevOps integra seguridad temprano.",
        correct: true,
        rationale: "La integracion temprana reduce revisiones tardias.",
      },
      {
        id: "mc-1",
        category: "Redes",
        text: "Que capa usa IP?",
        choices: {
          A: "Aplicacion",
          B: "Red",
          C: "Transporte",
          D: "Sesion",
        },
        correctAnswer: "B",
        feedback: "IP opera como protocolo de capa de red.",
      },
    ],
  });

  assert.equal(bank.title, "Banco flexible");
  assert.equal(bank.questions.length, 2);
  assert.equal(bank.questions[0].type, "true_false");
  assert.equal(bank.questions[0].answer, "A");
  assert.equal(bank.questions[1].topic, "Redes");
  assert.equal(bank.questions[1].answer, "B");
}

function testValidationFindsDuplicates() {
  const validation = validateBank({
    title: "Duplicado",
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        topic: "General",
        prompt: "Uno",
        options: [
          { id: "A", text: "Correcta" },
          { id: "B", text: "Incorrecta" },
        ],
        answer: "A",
        explanation: "Explicacion.",
      },
      {
        id: "q1",
        type: "multiple_choice",
        topic: "General",
        prompt: "Dos",
        options: [
          { id: "A", text: "Correcta" },
          { id: "B", text: "Incorrecta" },
        ],
        answer: "A",
        explanation: "Explicacion.",
      },
    ],
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("duplicado")));
}

function testInvalidQuestionsAreReported() {
  const bank = normalizeBank({
    title: "Banco invalido",
    questions: [
      {
        id: "bad-1",
        options: [{ id: "A", text: "Opcion sin pregunta" }],
        answer: "A",
      },
    ],
  });
  const validation = validateBank(bank);

  assert.equal(bank.questions.length, 1);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("falta el texto")));
  assert.ok(validation.errors.some((error) => error.includes("al menos dos opciones")));
}

function testAttemptKeepsCorrectAnswerAfterShuffle() {
  const question = {
    id: "q1",
    type: "multiple_choice",
    topic: "General",
    prompt: "Pregunta",
    options: [
      { id: "A", text: "Distractor 1" },
      { id: "B", text: "Distractor 2" },
      { id: "C", text: "Correcta" },
      { id: "D", text: "Distractor 3" },
    ],
    answer: "C",
    explanation: "Explicacion.",
  };

  const randomized = randomizeQuestionOptions(question, constantRandom(0));
  const correctOption = randomized.options.find((option) => option.id === randomized.answer);

  assert.equal(correctOption.text, "Correcta");
  assert.notEqual(randomized.answer, "C");
}

function testBuildAttemptAndClamp() {
  const questions = Array.from({ length: 5 }, (_, index) => ({
    id: `q${index + 1}`,
    type: "true_false",
    topic: "General",
    prompt: `Pregunta ${index + 1}`,
    options: [
      { id: "A", text: "Verdadero" },
      { id: "B", text: "Falso" },
    ],
    answer: "A",
    explanation: "Explicacion.",
  }));

  assert.equal(clampExamSize("99", questions.length), 5);
  assert.equal(clampExamSize("0", questions.length), 1);
  assert.equal(clampExamSize("abc", questions.length), 5);
  assert.equal(buildAttempt(questions, 3, questions.length, constantRandom(0.5)).length, 3);
}

function testScoring() {
  const attempt = [
    { id: "q1", answer: "A", options: [{ id: "A", text: "A" }] },
    { id: "q2", answer: "B", options: [{ id: "B", text: "B" }] },
    { id: "q3", answer: "C", options: [{ id: "C", text: "C" }] },
  ];
  const answers = { q1: "A", q2: "A" };
  const marked = { q3: true };
  const stats = getStats({ attempt, answers, marked });
  const result = getQuestionResult(attempt[1], answers, { q2: 2500 });

  assert.deepEqual(
    {
      answered: stats.answered,
      correct: stats.correct,
      wrong: stats.wrong,
      remaining: stats.remaining,
      score: stats.score,
      marked: stats.marked,
    },
    {
      answered: 2,
      correct: 1,
      wrong: 1,
      remaining: 1,
      score: 33,
      marked: 1,
    },
  );
  assert.equal(result.isCorrect, false);
  assert.equal(result.time, 2500);
}

function testThemeAliases() {
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("oled"), "oled");
  assert.equal(normalizeTheme("black"), "oled");
  assert.equal(normalizeTheme("invalid"), "light");
}

function testResumableAttempt() {
  const bank = normalizeBank({ title: "Banco de prueba", questions: [
    { id: "constructor", prompt: "¿Dos más dos?", options: ["Cuatro", "Cinco"], answer: "A" },
    { id: "q2", prompt: "Un triángulo tiene tres lados.", answer: true },
  ] });
  const selection = { bank, source: "prueba.json" };
  const draft = newAttemptDraft(selection, 2, constantRandom(0.99));
  const time = { now: 100 };
  const clock = { now: () => time.now };
  const session = createAttemptSession(draft, clock);

  time.now += 8000;
  assert.equal(session.elapsed, 0);
  assert.equal(session.answer("A"), false);
  assert.equal(session.resume(), true);
  assert.equal(session.answer("Z"), false);
  assert.equal(session.toggleMark(), true);
  time.now += 1200;
  assert.equal(session.answer(session.item().question.answer), true);
  assert.equal(session.answer("B"), false);
  time.now += 300;
  assert.equal(session.nextPending(), 1);
  assert.equal(session.navigate(1), true);
  time.now += 600;
  assert.equal(session.review(), true);
  assert.equal(session.answer("B"), false);
  assert.equal(session.submit(), null);
  time.now += 150;
  session.setVisible(false);
  time.now += 100000;
  assert.equal(session.elapsed, 2250);
  assert.equal(session.pause(), true);

  const storage = new Map();
  const getStorage = () => ({
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  });
  const store = createAttemptStore(getStorage);
  assert.equal(store.save({ imported: selection, draft: session.snapshot(), result: null }), "saved");
  const saved = store.load();
  assert.deepEqual(saved.imported, selection);
  const resumed = createAttemptSession(saved.draft, clock);
  assert.equal(resumed.phase, "paused");
  assert.equal(resumed.index, 1);
  assert.equal(resumed.elapsed, 2250);
  assert.equal(resumed.item(0).marked, true);
  assert.equal(resumed.item(0).result.time, 1200);
  assert.deepEqual(resumed.items().map(({ question }) => question), draft.attempt);

  const otherTab = createAttemptStore(getStorage);
  otherTab.load();
  assert.equal(resumed.resume(), true);
  time.now += 2000;
  const { options, answer } = resumed.item().question;
  assert.equal(resumed.answer(options.find(({ id }) => id !== answer).id), true);
  assert.equal(resumed.review(), true);
  time.now += 800;
  const result = resumed.submit();
  assert.equal(result.duration, 5050);
  assert.equal(result.stats.score, 50);
  assert.equal(result.stats.marked, 1);
  assert.equal(result.entries[1].result.time, 2600);
  assert.equal(resumed.toggleMark(), false);
  assert.equal(resumed.submit(), null);
  assert.equal(resumed.navigate(0), true);
  assert.equal(resumed.answer("B"), false);
  assert.equal(store.save({ imported: selection, draft: null, result }), "saved");
  assert.deepEqual(store.load().result, result);
  assert.equal(otherTab.save({ imported: null, draft: saved.draft, result: null }), "conflict");
  assert.deepEqual(store.load().result, result);

  storage.set(ATTEMPT_STORAGE_KEY, "{");
  assert.deepEqual(store.load(), {});
  const blocked = createAttemptStore(() => { throw new Error("Sin acceso a almacenamiento"); });
  assert.deepEqual(blocked.load(), {});
  assert.equal(blocked.save({ draft, result }), "unavailable");
}

await testDefaultBank();
testFlexibleBankNormalization();
testValidationFindsDuplicates();
testInvalidQuestionsAreReported();
testAttemptKeepsCorrectAnswerAfterShuffle();
testBuildAttemptAndClamp();
testScoring();
testThemeAliases();
testResumableAttempt();

console.log("All tests passed");
