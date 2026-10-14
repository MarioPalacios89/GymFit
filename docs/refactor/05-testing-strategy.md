# Estrategia de testing

## Unitarias

Planificador de cargas, RPE, rangos, temporizador, recuperación, mapeo Supabase, payload de sesión y migración de storage.

## Integración

Login, rutina cacheada/remota, restauración de borrador, fallo de foto, guardado de sesión, historial y aislamiento entre usuarios.

## E2E móvil

Probar 320, 360, 390 y 430 px. Flujos: escribir `12` reps, cambiar día sin perder datos, recargar, guardar, abrir historial, reportar inactividad y cambiar de usuario.

## Datos

Usar staging para Supabase. Verificar RLS con dos cuentas y validar que datos históricos continúan siendo legibles.
