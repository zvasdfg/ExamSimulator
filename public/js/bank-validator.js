export function validateBank(bank) {
  const errors = [];
  const warnings = [];

  if (!bank || typeof bank !== "object") {
    errors.push("El banco normalizado no es un objeto valido.");
    return { valid: false, errors, warnings };
  }

  if (!Array.isArray(bank.questions) || bank.questions.length === 0) {
    errors.push("El banco no contiene preguntas validas.");
    return { valid: false, errors, warnings };
  }

  const seenIds = new Set();

  bank.questions.forEach((question, index) => {
    const label = question.id || `pregunta ${index + 1}`;

    if (!question.id) {
      errors.push(`La pregunta ${index + 1} no tiene id.`);
    } else if (seenIds.has(question.id)) {
      errors.push(`El id de pregunta esta duplicado: ${question.id}.`);
    } else {
      seenIds.add(question.id);
    }

    if (!question.prompt) {
      errors.push(`${label}: falta el texto de la pregunta.`);
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`${label}: debe tener al menos dos opciones.`);
    }

    const optionIds = new Set();
    question.options.forEach((option) => {
      if (!option.id || !option.text) {
        errors.push(`${label}: una opcion no tiene id o texto.`);
      }

      if (optionIds.has(option.id)) {
        errors.push(`${label}: hay opciones con id duplicado (${option.id}).`);
      }
      optionIds.add(option.id);
    });

    if (!question.answer || !optionIds.has(question.answer)) {
      errors.push(`${label}: la respuesta correcta no existe entre las opciones.`);
    }

    if (!question.explanation || question.explanation === "Sin explicacion registrada.") {
      warnings.push(`${label}: no tiene explicacion especifica.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function assertValidBank(bank) {
  const validation = validateBank(bank);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }
  return validation;
}
