# MarioFit V12 — Midnight Zodiac

Tema inspirado en la referencia visual compartida:

- Fondo azul medianoche: `#030318`
- Superficie principal: `#0C1028`
- Superficie elevada: `#111734`
- Azul eléctrico: `#2389D7`
- Lima: `#B3D62E`
- Verde: `#22B96B`
- Púrpura: `#9A2BBD`
- Texto: `#F7F8FF`

## Criterio visual

- Azul como acción principal y navegación.
- Lima y verde para progreso, calentamiento y confirmaciones.
- Púrpura para hover, notas e interacciones secundarias.
- Gradientes más oscuros y discretos.
- Menos brillo neón y mayor similitud con una aplicación móvil nocturna.
- Círculos decorativos sutiles en el fondo.

`loadRoutineDb()` permanece configurado únicamente para obtener la rutina desde el API.


## Ajuste de tarjetas estáticas

- Las tarjetas de ejercicios ya no cambian de gradiente al pasar el cursor.
- Se eliminaron desplazamientos, transformaciones y sombras reactivas.
- Las filas de series y calentamiento mantienen un fondo fijo.
- Cada grupo muscular se identifica mediante una línea lateral de color.
- El feedback hover se conserva únicamente en botones, inputs y controles interactivos.


## Actualización: esfuerzo en lenguaje simple y UX

- La interfaz ya no muestra valores como `RPE 6-7`.
- Ahora indica directamente cuántas repeticiones limpias deben quedar:
  - RPE 6-7 → `3-4 repeticiones más`
  - RPE 8 → `2 repeticiones más`
  - RPE 9 → `1 repetición más`
  - RPE 10 → `0 repeticiones más / fallo técnico`
- Se agregó una guía desplegable de esfuerzo.
- Se agregó progreso de series efectivas registradas.
- Una serie se marca visualmente como completada cuando tiene peso y repeticiones.
- Las tarjetas siguen siendo estáticas al hacer hover.
- Las animaciones son únicamente de entrada y confirmación, con soporte para `prefers-reduced-motion`.


## Ajuste minimalista adicional

- Se eliminó el check visual extra de cada fila.
- La indicación de esfuerzo ahora se muestra en formato corto:
  - `3-4 reps más`
  - `2 reps más`
  - `1 rep más`
  - `0 reps más`
- La descripción de cada serie se presenta en una sola línea.
- Las técnicas especiales se mantienen aparte como chip secundario.


## Corrección del porcentaje de aproximación

Las filas de calentamiento ahora muestran nuevamente el porcentaje y las repeticiones en una sola línea:

- `APROXIMACIÓN · 45% carga · 6-10 reps`
- `APROXIMACIÓN · 75% carga · 3-5 reps · opcional`


## Selección explícita para guardado

- El candado ahora marca el ejercicio con `data-save-selected="true"`.
- El guardado procesa únicamente las tarjetas seleccionadas.
- Una tarjeta bloqueada muestra el estado **Seleccionado para guardar**.
- Se indica cuántas series con peso se enviarán.
- El contenido queda visualmente congelado y los inputs no pueden modificarse.
- El candado permanece disponible para quitar el ejercicio de la selección.
- El botón inferior muestra cuántos ejercicios están seleccionados.
