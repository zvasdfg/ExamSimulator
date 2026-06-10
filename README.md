# Simulador SecDevOps

Plataforma web para practicar examenes de SecDevOps y administracion de redes
cloud usando bancos de preguntas en JSON.

## Funcionalidad principal

- Banco por defecto con 120 preguntas basadas en el material de la asignatura.
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
- Incluye modo oscuro con preferencia guardada en el navegador.

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

La app acepta un objeto con `questions` o un arreglo directo de preguntas. El
formato recomendado es:

```json
{
  "title": "Nombre del banco",
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
      "explanation": "Explicacion de la respuesta correcta."
    }
  ]
}
```

Tambien normaliza campos comunes como `question`, `choices`, `correctAnswer`,
`correct_answer`, `correct`, `rationale` y respuestas booleanas para
verdadero/falso.
