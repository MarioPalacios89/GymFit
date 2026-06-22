# MarioFit V12 — Planificador de cargas

Se agregó una utilidad por ejercicio para calcular la distribución de pesos desde el peso de la fase efectiva.

## Funcionamiento

1. Abre **Planificar cargas** en la tarjeta o en el menú de acciones.
2. Ingresa el peso de trabajo de las series efectivas.
3. Selecciona el salto de peso disponible en tu máquina o barra.
4. La aplicación calcula:
   - Cargas de aproximación usando los porcentajes del JSON.
   - Peso de cada serie efectiva.
   - Repeticiones programadas y reserva de repeticiones.
5. Presiona **Aplicar pesos** para completar los campos de KG.

Por seguridad, la aplicación completa únicamente campos vacíos. La opción **Sobrescribir pesos existentes** permite reemplazarlos.

La carga de la rutina continúa realizándose únicamente mediante el API.


## Tag de último récord

Cada ejercicio ahora muestra una referencia compacta con:

- Último peso récord.
- Repeticiones, cuando el API las proporciona.
- Fecha en que se alcanzó.
- La misma referencia dentro del planificador de cargas.

El frontend reconoce distintos nombres de propiedades de fecha, pero se recomienda que el API devuelva:

```json
{
  "record": {
    "peso": 60,
    "reps": 8,
    "fecha": "2026-06-14"
  }
}
```

Si el peso existe pero la fecha no llega desde el API, se mostrará `fecha no disponible`.
