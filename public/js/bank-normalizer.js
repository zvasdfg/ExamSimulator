import { OPTION_IDS } from "./constants.js";

export function fallbackOptionId(index) {
  return OPTION_IDS[index] || String(index + 1);
}

function firstNonEmptyString(values, fallback = "") {
  const found = values.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return found ? found.trim() : fallback;
}

function getRawBankTitle(rawBank) {
  if (Array.isArray(rawBank)) {
    return "Banco importado";
  }

  return firstNonEmptyString(
    [
      rawBank.title,
      rawBank.name,
      rawBank.examTitle,
      rawBank.courseTitle,
      rawBank.subject,
      rawBank.metadata?.title,
      rawBank.metadata?.name,
      rawBank.meta?.title,
      rawBank.meta?.name,
      rawBank.exam?.title,
      rawBank.exam?.name,
    ],
    "Banco importado",
  );
}

function getRawBankDescription(rawBank) {
  if (Array.isArray(rawBank)) {
    return "";
  }

  return firstNonEmptyString(
    [
      rawBank.description,
      rawBank.summary,
      rawBank.metadata?.description,
      rawBank.meta?.description,
      rawBank.exam?.description,
    ],
    "Banco de preguntas cargado desde JSON.",
  );
}

export function normalizeOptions(rawOptions, rawType, rawAnswer) {
  if (Array.isArray(rawOptions)) {
    return rawOptions
      .map((option, index) => {
        if (typeof option === "string") {
          return { id: fallbackOptionId(index), text: option.trim() };
        }

        const id = String(
          option.id || option.key || option.label || fallbackOptionId(index),
        )
          .trim()
          .replace(/[.)]$/, "")
          .toUpperCase();
        const text = String(
          option.text || option.title || option.value || option.label || id,
        ).trim();
        return { id, text };
      })
      .filter((option) => option.id && option.text);
  }

  if (rawOptions && typeof rawOptions === "object") {
    return Object.entries(rawOptions)
      .map(([id, text]) => ({
        id: String(id).trim().replace(/[.)]$/, "").toUpperCase(),
        text: String(text).trim(),
      }))
      .filter((option) => option.id && option.text);
  }

  const typeValue = String(rawType || "").toLowerCase();
  const isBoolean =
    typeof rawAnswer === "boolean" ||
    typeValue.includes("true") ||
    typeValue.includes("false") ||
    typeValue.includes("verdadero") ||
    typeValue.includes("falso") ||
    typeValue.includes("boolean");

  return isBoolean
    ? [
        { id: "A", text: "Verdadero" },
        { id: "B", text: "Falso" },
      ]
    : [];
}

export function normalizeQuestionType(rawType, options, rawAnswer) {
  const value = String(rawType || "").toLowerCase();
  const optionText = options.map((option) => option.text.toLowerCase()).join(" ");

  if (
    typeof rawAnswer === "boolean" ||
    value.includes("true") ||
    value.includes("false") ||
    value.includes("verdadero") ||
    value.includes("falso") ||
    value.includes("boolean") ||
    (options.length === 2 &&
      optionText.includes("verdadero") &&
      optionText.includes("falso"))
  ) {
    return "true_false";
  }

  return "multiple_choice";
}

export function normalizeAnswer(rawAnswer, options, type) {
  if (typeof rawAnswer === "boolean") {
    return rawAnswer ? "A" : "B";
  }

  if (typeof rawAnswer === "number") {
    return (options[rawAnswer] || options[rawAnswer - 1] || {}).id || "";
  }

  const answer = String(rawAnswer || "").trim();
  if (!answer) {
    return "";
  }

  const cleaned = answer.replace(/[.)]$/, "");
  const byId = options.find(
    (option) => option.id.toLowerCase() === cleaned.toLowerCase(),
  );

  if (byId) {
    return byId.id;
  }

  if (type === "true_false") {
    const lowered = cleaned.toLowerCase();
    if (["true", "verdadero", "v"].includes(lowered)) {
      return "A";
    }
    if (["false", "falso", "f"].includes(lowered)) {
      return "B";
    }
  }

  const byText = options.find(
    (option) => option.text.toLowerCase() === cleaned.toLowerCase(),
  );
  return byText ? byText.id : "";
}

export function normalizeBank(rawBank) {
  if (!rawBank || typeof rawBank !== "object") {
    throw new Error("El banco debe ser un objeto o un arreglo de preguntas.");
  }

  const rawQuestions = Array.isArray(rawBank)
    ? rawBank
    : rawBank.questions || rawBank.items || [];

  if (!Array.isArray(rawQuestions)) {
    throw new Error("El JSON no contiene un arreglo de preguntas.");
  }

  const questions = rawQuestions.map((rawQuestion, index) => {
    if (!rawQuestion || typeof rawQuestion !== "object" || Array.isArray(rawQuestion)) {
      throw new Error(`La pregunta ${index + 1} debe ser un objeto.`);
    }

    const rawAnswer =
      rawQuestion.answer ??
      rawQuestion.correctAnswer ??
      rawQuestion.correct_answer ??
      rawQuestion.correct;
    const options = normalizeOptions(
      rawQuestion.options || rawQuestion.choices,
      rawQuestion.type,
      rawAnswer,
    );
    const type = normalizeQuestionType(rawQuestion.type, options, rawAnswer);
    const answer = normalizeAnswer(rawAnswer, options, type);

    return {
      id: String(rawQuestion.id || `question-${index + 1}`),
      type,
      topic: String(rawQuestion.topic || rawQuestion.category || "General"),
      prompt: String(
        rawQuestion.prompt || rawQuestion.question || rawQuestion.text || "",
      ).trim(),
      options,
      answer,
      explanation: String(
        rawQuestion.explanation ||
          rawQuestion.rationale ||
          rawQuestion.feedback ||
          "Sin explicacion registrada.",
      ).trim(),
      difficulty: rawQuestion.difficulty ? String(rawQuestion.difficulty) : "",
    };
  });

  if (!questions.length) {
    throw new Error("No se encontraron preguntas en el JSON.");
  }

  return {
    title: getRawBankTitle(rawBank),
    description: getRawBankDescription(rawBank),
    version: Array.isArray(rawBank) ? "" : rawBank.version || "",
    examLevel: Array.isArray(rawBank) ? "" : rawBank.examLevel || "",
    questions,
  };
}
