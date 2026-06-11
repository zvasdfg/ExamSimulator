# Simulador SecDevOps

Plataforma web para practicar examenes de SecDevOps y administracion de redes
cloud usando bancos de preguntas en JSON.

## Funcionalidad principal

- Banco por defecto con 120 preguntas basadas en el material de la asignatura.
- El titulo visible del examen se toma de la metadata del JSON, por ejemplo
  `title`, `name`, `metadata.title`, `exam.title`, `courseTitle` o `subject`.
- El usuario elige cuantas preguntas quiere contestar por intento.
- Cada intento selecciona preguntas de forma aleatoria desde el banco completo.
- No hay cuota fija de preguntas verdadero/falso ni ABCD.
- Las respuestas se reordenan aleatoriamente en cada intento, por lo que la
  respuesta correcta no queda fija en la misma letra.
- Al elegir una respuesta, la app indica de inmediato si fue correcta o
  incorrecta.
- El boton `Enviar examen` genera un dashboard flotante con resultado final.
- El dashboard muestra calificacion, aciertos, fallos, preguntas marcadas,
  tiempo total y tiempo promedio por pregunta.
- Desde el dashboard se puede revisar cada pregunta, la respuesta elegida, la
  respuesta correcta, el tiempo dedicado y la explicacion.
- Incluye selector de tema claro, oscuro y OLED con preferencia guardada en el
  navegador.

## Banco de preguntas

El banco por defecto esta en:

```text
public/question-banks/secdevops-unir.json
```

El banco fue recalibrado para reducir pistas obvias por longitud o especificidad
de la respuesta correcta. Las explicaciones tambien fueron ampliadas para que el
dashboard sirva como herramienta de revision despues del intento.

## Ejecutar

```bash
cd /Path/To/Project/ExamSimulator
python3 server.py
```

Abre en el navegador:

```text
http://localhost:8000/
```

Para detener el servidor, usa `Ctrl+C` en la terminal.

## Formato JSON

La app acepta un objeto con `questions`, un objeto con `items` o un arreglo
directo de preguntas. El formato recomendado para un banco completo es:

```json
{
  "title": "Nombre del banco",
  "description": "Descripcion breve del banco de preguntas.",
  "version": "1.0.0",
  "examLevel": "maestria",
  "questions": [
    {
      "id": "q-001",
      "type": "multiple_choice",
      "topic": "SecDevOps",
      "prompt": "Pregunta",
      "options": [
        { "id": "A", "text": "Opcion A" },
        { "id": "B", "text": "Opcion B" },
        { "id": "C", "text": "Opcion C" },
        { "id": "D", "text": "Opcion D" }
      ],
      "answer": "B",
      "explanation": "Explicacion de la respuesta correcta.",
      "difficulty": "maestria"
    },
    {
      "id": "q-002",
      "type": "true_false",
      "topic": "SecDevOps",
      "prompt": "La seguridad debe integrarse desde etapas tempranas del pipeline.",
      "options": [
        { "id": "A", "text": "Verdadero" },
        { "id": "B", "text": "Falso" }
      ],
      "answer": "A",
      "explanation": "La afirmacion es correcta porque SecDevOps desplaza los controles de seguridad hacia el inicio del ciclo de entrega.",
      "difficulty": "maestria"
    }
  ]
}
```

Campos esperados por pregunta:

- `id`: identificador unico. Si falta, la app genera uno automaticamente.
- `type`: `multiple_choice` o `true_false`.
- `topic`: tema o categoria de la pregunta.
- `prompt`: texto de la pregunta.
- `options`: arreglo de opciones con `id` y `text`.
- `answer`: `id` de la opcion correcta.
- `explanation`: explicacion mostrada en feedback y dashboard.
- `difficulty`: opcional; recomendado para clasificar el banco, aunque la app
  actual no filtra por dificultad.

Tambien normaliza variantes comunes:

- Preguntas: `prompt`, `question` o `text`.
- Opciones: `options` o `choices`; tambien acepta opciones como objeto
  `{ "A": "Texto", "B": "Texto" }`.
- Respuesta correcta: `answer`, `correctAnswer`, `correct_answer` o `correct`.
- Explicacion: `explanation`, `rationale` o `feedback`.
- Tema: `topic` o `category`.
- Titulo del banco: `title`, `name`, `metadata.title`, `exam.title`,
  `courseTitle` o `subject`.

Para verdadero/falso, si la respuesta viene como booleano (`true` o `false`) o
el tipo indica booleano, la app puede generar las opciones `Verdadero` y `Falso`.
Para evitar ambiguedad, el formato recomendado sigue siendo declarar las dos
opciones y usar `answer` con el `id` correcto.
