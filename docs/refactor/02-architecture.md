# Arquitectura objetivo

## Decisión

Vanilla JavaScript modular con Vite, JSDoc y Supabase existente. Astro no se incorpora: la superficie principal es autenticada y altamente interactiva; Astro no resolvería estado ni persistencia.

## Capas

```text
UI DOM → controladores y estado → reglas puras → Supabase/localStorage
```

No usar gestor de estado pesado ni repositorios artificiales.

## Estructura objetivo

```text
src/
  main.js
  app/
  features/auth/
  features/routines/
  features/workouts/
  features/exercises/
  features/history/
  features/progress/
  lib/supabase/
  lib/storage/
  lib/dom/
  styles/
tests/
```

La primera entrega añade `src/lib/storage.js` y tests de aislamiento. El runtime legacy se mantiene hasta completar la extracción por flujo.

## Estado

Mantener un estado pequeño: usuario, rutina, día visible, día calendario, borrador, recuperación, temporizador y estado de modales.

## Tipado

Usar JSDoc en la primera fase. Evaluar TypeScript después de eliminar globals y duplicaciones.
