# Simulador SecDevOps

Simulador web simple para practicar examenes de SecDevOps y administracion de
redes cloud. No usa React ni Node: Python solo sirve los archivos estaticos.
La interfaz usa Foundation for Sites desde CDN y una capa local de estilos en
`public/styles.css`.
Incluye un switch de modo oscuro que guarda la preferencia en el navegador.

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

## Banco de preguntas

El banco por defecto esta en:

```text
public/question-banks/secdevops-unir.json
```

Contiene 120 preguntas generadas desde el material fuente de la asignatura.
Cada intento usa el numero de preguntas elegido en el campo `Preguntas`; por
defecto son 25 y el valor se limita automaticamente al total del banco cargado.
La seleccion se hace barajando todo el banco y tomando la cantidad solicitada.
La app muestra inmediatamente si la respuesta elegida es correcta o incorrecta.
Las opciones tambien se barajan por intento, por lo que la respuesta correcta no
queda fija en la misma letra.
No hay cuota fija de verdadero/falso ni de ABCD: el tipo de pregunta depende del
resultado aleatorio de cada intento.
Al terminar las 25 respuestas, el boton `Enviar examen` abre un dashboard
flotante con calificacion, aciertos, fallos, preguntas marcadas, tiempo total,
tiempo promedio y revision pregunta por pregunta. Desde ese panel se puede
revisar cada pregunta, la respuesta elegida, la correcta y la explicacion.
El banco fue recalibrado para evitar pistas obvias por longitud o especificidad
de la respuesta correcta, y sus explicaciones fueron ampliadas para la revision.

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
      "explanation": "Explicacion breve."
    }
  ]
}
```

Tambien normaliza campos comunes como `question`, `choices`, `correctAnswer`,
`correct_answer`, `correct`, `rationale` y respuestas booleanas para
verdadero/falso.
