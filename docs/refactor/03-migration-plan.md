# Plan incremental

1. Baseline y contratos de Supabase.
2. Borrador persistente y aislamiento por usuario.
3. Vite/Vitest sin cambio funcional.
4. Eliminar funciones legacy redefinidas.
5. Extraer cálculos, storage y cliente Supabase.
6. Extraer controladores de rutinas, sesiones e historial.
7. Sustituir render completo por actualizaciones parciales.
8. Consolidar CSS y accesibilidad.
9. Carga bajo demanda, paginación y medición.
10. E2E móvil, RLS y validación de rollback.

Cada etapa debe conservar el commit anterior como rollback. No migrar datos ni cambiar tablas sin fixtures y pruebas de lectura histórica.
