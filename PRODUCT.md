# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Atleta individual que usa la app principalmente desde el móvil durante sus sesiones en el gimnasio.

## Product Purpose

MarioFit Pro permite seguir una rutina personalizada, registrar peso y repeticiones, controlar descansos y consultar el progreso de entrenamiento sincronizado con Supabase. El éxito consiste en completar y guardar una sesión con poca fricción y con información suficiente para entrenar con confianza.

## Positioning

La app combina una rutina estructurada con adaptación práctica durante la sesión: prioridad por ejercicio, modo de energía, recomendaciones de carga, alternativas y recuperación de sesiones perdidas.

## Operating Context

Se utiliza en un gimnasio, normalmente desde un teléfono, entre series y con atención limitada. La interfaz debe tolerar sesiones largas, entradas rápidas, cambios de ejercicio, descansos y conectividad imperfecta mediante caché local.

## Capabilities and Constraints

- Autenticación, datos de rutina, historial y guardado de sesiones mediante Supabase Auth, RLS y la API cliente existente.
- Registro de calentamientos, series efectivas, peso, repeticiones, notas, fotos y descanso.
- Advisor de cargas, alternativas de ejercicios, recuperación, historial, peso corporal y conversor de unidades.
- El rediseño debe conservar la lógica de Supabase, los contratos de datos, la seguridad y los identificadores usados por JavaScript.
- La interfaz debe funcionar en móvil y desktop, con prioridad de uso móvil.

## Brand Commitments

- El nombre MarioFit Pro debe conservarse.
- La voz debe mantenerse directa, útil y orientada al entrenamiento, en español.
- El rediseño puede reemplazar la apariencia visual acumulada actual, pero no debe alterar el significado del contenido ni las funciones.

## Evidence on Hand

- Implementación existente en `versions/supabase/v1/index.html`, `estilos.css` y `app.js`.
- Integración Supabase existente y datos reales de rutinas, ejercicios, sesiones y registros.
- No se deben inventar testimonios, métricas comerciales ni claims externos.

## Product Principles

- Registrar una serie debe requerir la menor atención posible.
- La prioridad de la sesión debe ser evidente antes de empezar.
- Los estados de guardado, error y conectividad deben ser comprensibles.
- Las funciones avanzadas deben estar disponibles sin competir con el flujo principal.
- La consistencia visual debe servir a la confianza y a la velocidad de uso.

## Accessibility & Inclusion

- Controles táctiles cómodos para uso móvil.
- Contraste suficiente, foco visible y mensajes de estado anunciables.
- No depender solo del color para comunicar progreso, prioridad o error.
