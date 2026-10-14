# Auditoría de MarioFit Pro

## Estado

Aplicación web HTML/CSS/JavaScript con Supabase Auth, PostgreSQL, Storage privado y RPC para el advisor. `index.html`, `app.js` y `estilos.css` son la versión activa. `versions/`, `json/` y `codigo.gs` son históricos o legacy.

## Hallazgos prioritarios

- **P1 pérdida de entradas:** `app.js:2108-2263` reemplaza todo `#mainContent`; varias acciones llaman `renderDia()` mientras peso y repeticiones solo viven en el DOM.
- **P1 foco prematuro:** `app.js:264-283` avanza al siguiente peso durante cada evento `input`, incompatible con números de dos dígitos.
- **P1 datos mezclados:** claves `mariofit_*` no incluyen usuario.
- **P1 duplicación:** funciones como `init`, `enviarDatos`, `loadRoutineDb` y `cargarHistorial` se declaran dos veces; Supabase sobrescribe la implementación legacy.
- **P1 accesibilidad:** inputs dinámicos sin etiquetas, modales sin foco gestionado y acordeones con `div onclick`.
- **P2 rendimiento:** Tailwind Play CDN, Chart.js y confetti cargados globalmente, historial completo y renderizados HTML completos.
- **P2 CSS:** 4.991 líneas, varios bloques `:root`, sobrescrituras y `!important`.

## Funciones existentes

Login, rutinas, calentamiento, series, advisor, planificador de cargas, temporizador, alternativas, notas, fotos, recuperación, historial, peso corporal, gráfico y logout.

## Persistencia

Supabase guarda sesiones, series, notas, fotos y peso corporal. `localStorage` guarda preferencias, caché, notas pendientes, alternativas, energía, recuperación y ahora borrador de sesión.

## Baseline

Tamaños activos aproximados: HTML 23.7 KB, CSS 143.7 KB, JS 162.2 KB. No se debe eliminar ninguna clave legacy sin migración y validación.
