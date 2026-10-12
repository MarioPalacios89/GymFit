// ==========================================
// MarioFit Pro · Sistema unificado v9
// Spreadsheet + Apps Script + Top Set Advisor
// ==========================================

const JSON_INICIAL = JSON.stringify(
{
  "version": "v12_week_6",
  "perfil": {
    "nombre": "Mario",
    "objetivo": "Ganancia de fuerza y masa muscular manteniendo recomposición corporal",
    "nivel": "Intermedio-Avanzado",
    "frecuencia": "5 días de entrenamiento y 2 días de descanso",
    "enfoque": "Torso y tren inferior de fuerza, junto con tirón, empuje y piernas de hipertrofia"
  },
  "calentamiento": [
    {
      "nombre": "Cardio suave en la máquina de tu elección",
      "reps": "5-10 min"
    },
    {
      "nombre": "Círculos de brazos",
      "reps": "10 por lado"
    },
    {
      "nombre": "Rotación externa en polea (opcional)",
      "reps": "15 por lado"
    },
    {
      "nombre": "Balanceos de brazos y piernas",
      "reps": "10 por lado y por dirección"
    },
    {
      "nombre": "Series de aproximación específicas del ejercicio",
      "reps": "1-4 series progresivas entre 45% y 85% de la carga de trabajo, según calentamiento_series"
    }
  ],
  "semana": [
    {
      "dia": "Lunes",
      "enfoque": "Torso (Enfoque de fuerza)",
      "ejercicios": [
        {
          "nombre": "45° Incline DB Press",
          "video": "https://www.youtube.com/shorts/8fXfwG4ftaQ",
          "series": 2,
          "repeticiones": "8-10",
          "calentamiento_series": "2-3",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~6-7"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~7-8"
            }
          ],
          "descanso": "3-5 min",
          "alternativas": [
            "45° Incline Barbell Press",
            "45° Incline Machine Press"
          ],
          "nota": "Haz una pausa de 1 segundo en la parte inferior de cada repetición, manteniendo la tensión en los pectorales."
        },
        {
          "nombre": "Pec Deck",
          "video": "https://www.youtube.com/shorts/g3T7LsEeDWQ",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Cable Crossover Ladder",
            "Bottom-Half DB Flye"
          ],
          "nota": "Concéntrate en acercar los codos, no las manos."
        },
        {
          "nombre": "Dual-Handle Lat Pulldown",
          "video": "https://www.youtube.com/shorts/RV998JY--HY",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~6-7"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~7-8"
            }
          ],
          "descanso": "2-3 min",
          "alternativas": [
            "Wide-Grip Lat Pulldown",
            "Wide-Grip Pull-Up"
          ],
          "nota": "Inclínate hacia atrás aproximadamente 15° y lleva los codos hacia abajo mientras juntas los omóplatos. Debes sentir una combinación de dorsales y trapecio medio."
        },
        {
          "nombre": "High-Cable Lateral Raise",
          "video": "https://www.youtube.com/shorts/lMJUXEvcMkQ",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "High-Cable Cuffed Lateral Raise",
            "Lean-In DB Lateral Raise"
          ],
          "nota": "Concéntrate en contraer el deltoide lateral para mover el peso."
        },
        {
          "nombre": "Smith Machine Row",
          "video": "https://www.youtube.com/shorts/tGGq2VZIW_M",
          "series": 2,
          "repeticiones": "8-10",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "2-3 min",
          "alternativas": [
            "Pendlay Deficit Row",
            "Single-Arm DB Row"
          ],
          "nota": "Concéntrate en juntar los omóplatos mientras mantienes los codos en un ángulo aproximado de 45°."
        },
        {
          "nombre": "Overhead Cable Triceps Extension (Bar)",
          "video": "https://www.youtube.com/watch?v=1u18yJELsh0",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "1",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Overhead Cable Triceps Extension (Rope)",
            "DB Skull Crusher"
          ],
          "nota": "Opcionalmente, haz una pausa de 0.5-1 segundo en la posición de máximo estiramiento de cada repetición."
        },
        {
          "nombre": "Bayesian Cable Curl",
          "video": "https://www.youtube.com/shorts/BaSd7C58L3o",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "1",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Seated Super- Bayesian High Cable Curl",
            "Incline DB Stretch Curl"
          ],
          "nota": "Si tienes un desequilibrio de tamaño entre ambos bíceps, realiza el ejercicio con un brazo a la vez, comenzando por el más débil. Lleva el brazo débil hasta el RPE indicado y luego iguala las repeticiones con el otro brazo, aunque su RPE sea menor. Si no tienes desequilibrio, trabaja ambos brazos al mismo tiempo."
        }
      ]
    },
    {
      "dia": "Martes",
      "enfoque": "Tren inferior (Enfoque de fuerza)",
      "ejercicios": [
        {
          "nombre": "Lying Leg Curl",
          "video": "https://www.youtube.com/shorts/d6sg829PgNs",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Seated Leg Curl",
            "Nordic Ham Curl"
          ],
          "nota": "Ajusta la máquina para conseguir el mayor estiramiento posible en la parte inferior. Evita que los glúteos se levanten mientras flexionas las piernas."
        },
        {
          "nombre": "Smith Machine Static Lunge w/ Elevated Front Foot",
          "video": "https://www.youtube.com/shorts/X0M5kpxmKAY",
          "series": 2,
          "repeticiones": "8-10",
          "calentamiento_series": "2-4",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~6-7"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~7-8"
            }
          ],
          "descanso": "3-5 min",
          "alternativas": [
            "DB Bulgarian Split Squat",
            "High-Bar Back Squat"
          ],
          "nota": "Eleva el pie delantero sobre una caja pequeña y minimiza la participación de la pierna trasera."
        },
        {
          "nombre": "45° Hyperextension",
          "video": "https://www.youtube.com/shorts/FROOQzY9MwE",
          "series": 2,
          "repeticiones": "8-10",
          "calentamiento_series": "2-4",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~6-7"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~7-8"
            }
          ],
          "descanso": "2-3 min",
          "alternativas": [
            "Glute-Ham Raise",
            "Cable Pull- Through"
          ],
          "nota": "Contrae con fuerza los glúteos en la parte superior de cada repetición. Desciende lentamente y de forma controlada, seguido de una fase positiva explosiva."
        },
        {
          "nombre": "Leg Extension",
          "video": "https://www.youtube.com/shorts/iQ92TuvBqRo",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Reverse Nordic",
            "Sissy Squat"
          ],
          "nota": "Lleva el respaldo tan atrás como sea posible sin perder comodidad. Sujeta las asas con fuerza para mantener los glúteos pegados al asiento. Haz una fase negativa de 2-3 segundos y siente el estiramiento de los cuádriceps."
        },
        {
          "nombre": "Leg Press Calf Press",
          "video": "https://www.youtube.com/shorts/I6l4KsRbyqQ",
          "series": 2,
          "repeticiones": "8-10",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Seated Calf Raise",
            "Standing Calf Raise"
          ],
          "nota": "Haz una pausa de 1-2 segundos en la parte inferior de cada repetición. En lugar de limitarte a subir sobre las puntas, piensa en desplazar el tobillo hacia delante y atrás sobre la zona del antepié."
        },
        {
          "nombre": "Machine Crunch",
          "video": "https://www.youtube.com/shorts/ys9-c-RDFzU",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "1",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Decline Weighted Crunch",
            "Cable Crunch"
          ],
          "nota": "Redondea la zona lumbar al realizar la contracción. Mantén la conexión mente-músculo con los abdominales."
        }
      ]
    },
    {
      "dia": "Miércoles",
      "enfoque": "Descanso",
      "ejercicios": []
    },
    {
      "dia": "Jueves",
      "enfoque": "Tirón (Enfoque de hipertrofia)",
      "ejercicios": [
        {
          "nombre": "Lean-Back Lat Pulldown",
          "video": "https://www.youtube.com/shorts/kGaPDVAB8vA",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "2-3",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~6-7"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~7-8"
            }
          ],
          "descanso": "2-3 min",
          "alternativas": [
            "Lean-Back Machine Pulldown",
            "Pull-Up"
          ],
          "nota": "Inicia el jalón con el torso erguido. Mientras bajas la barra, inclínate hacia atrás entre 15° y 30° para involucrar más la espalda media. Toca suavemente el pecho con la barra en cada repetición y mantén el control del peso."
        },
        {
          "nombre": "Chest-Supported T-Bar Row",
          "video": "https://www.youtube.com/shorts/Mlr-Lx-10HQ",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "2-3",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~6-7"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~7-8"
            }
          ],
          "descanso": "2-3 min",
          "alternativas": [
            "Chest-Supported Machine Row",
            "Incline Chest- Supported DB Row"
          ],
          "nota": "Abre los codos aproximadamente 45° y junta con fuerza los omóplatos al final de cada repetición."
        },
        {
          "nombre": "Dual-Handle Elbows-Out Cable Row",
          "video": "https://www.youtube.com/shorts/aQrKbFqkgkM",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "2-3 min",
          "alternativas": [
            "Arm-Out Single- Arm DB Row",
            "Meadows Row"
          ],
          "nota": "Abre los codos aproximadamente 45° y realiza repeticiones fluidas y controladas."
        },
        {
          "nombre": "1-Arm 45° Cable Rear Delt Flye",
          "video": "https://www.youtube.com/shorts/tt9EmQRyLys",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Rope Face Pull",
            "Reverse Pec Deck"
          ],
          "nota": "Haz una pausa de 1-2 segundos en la contracción de cada repetición y aprieta con fuerza los deltoides posteriores."
        },
        {
          "nombre": "Cable Paused Shrug-In",
          "video": "https://www.youtube.com/shorts/1mGXae-LCiM",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "2-3",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Machine Shrug",
            "DB Shrug"
          ],
          "nota": "Eleva los hombros hacia arriba y hacia dentro, como si quisieras acercarlos a las orejas. Haz una pausa de 1-2 segundos en la contracción superior y otra de 1-2 segundos en el estiramiento inferior."
        },
        {
          "nombre": "Cable Rope Hammer Curl",
          "video": "https://www.youtube.com/shorts/S8GfvLvX3gI",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "DB Hammer Curl",
            "Hammer Preacher Curl"
          ],
          "nota": "Aprieta con fuerza la cuerda mientras flexionas el peso. Realiza repeticiones fluidas y controladas."
        },
        {
          "nombre": "DB Concentration Curl",
          "video": "https://www.youtube.com/shorts/YEgmqqn9obo",
          "series": 1,
          "repeticiones": "15-20",
          "calentamiento_series": "1",
          "sets": [
            {
              "set": 1,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Concentration Cable Curl",
            "DB Preacher Curl"
          ],
          "nota": "Realiza repeticiones fluidas y controladas, manteniendo la conexión mente-músculo con los bíceps."
        }
      ]
    },
    {
      "dia": "Viernes",
      "enfoque": "Empuje (Enfoque de hipertrofia)",
      "ejercicios": [
        {
          "nombre": "Machine Chest Press",
          "video": "https://www.youtube.com/shorts/Qu7-ceCvq7w",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "2-4",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~6-7"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~7-8"
            }
          ],
          "descanso": "3-5 min",
          "alternativas": [
            "Barbell Bench Press",
            "DB Bench Press"
          ],
          "nota": "Haz una pausa de 1 segundo en la parte inferior de cada repetición, manteniendo la tensión en los pectorales."
        },
        {
          "nombre": "Seated DB Shoulder Press",
          "video": "https://www.youtube.com/shorts/2D0TyoHv_EY",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "2-3",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~6-7"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~7-8"
            }
          ],
          "descanso": "2-3 min",
          "alternativas": [
            "Cable Shoulder Press",
            "Machine Shoulder Press"
          ],
          "nota": "Asegúrate de que los codos superen al menos los 90°. Mantén la conexión mente-músculo con los deltoides y realiza repeticiones fluidas y controladas."
        },
        {
          "nombre": "Bottom-Half Seated Cable Flye",
          "video": "https://www.youtube.com/shorts/sgerBKynRWA",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Bottom-Half DB Flye",
            "Low-to-High Cable Crossover"
          ],
          "nota": "Realiza todas las repeticiones y series en la mitad inferior del recorrido. Busca un estiramiento profundo de los pectorales en la parte inferior de cada repetición."
        },
        {
          "nombre": "High-Cable Lateral Raise",
          "video": "https://www.youtube.com/shorts/lMJUXEvcMkQ",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "High-Cable Cuffed Lateral Raise",
            "Lean-In DB Lateral Raise"
          ],
          "nota": "Concéntrate en contraer el deltoide lateral para mover el peso."
        },
        {
          "nombre": "EZ-Bar Skull Crusher",
          "video": "https://www.youtube.com/shorts/hG9FS0XVqFo",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "DB Skull Crusher",
            "Katana Triceps Extension"
          ],
          "nota": "Opcionalmente, haz una pausa de 0.5-1 segundo en la posición de máximo estiramiento de cada repetición."
        },
        {
          "nombre": "Triceps Pressdown (Bar)",
          "video": "https://www.youtube.com/shorts/uHv7uy0FLTM",
          "series": 1,
          "repeticiones": "15-20",
          "calentamiento_series": "1",
          "sets": [
            {
              "set": 1,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Triceps Pressdown (Rope)",
            "DB Triceps Kickback"
          ],
          "nota": "Concéntrate en contraer los tríceps para mover el peso."
        },
        {
          "nombre": "Ab Wheel Rollout",
          "video": "https://www.youtube.com/shorts/kyK4k7_jzs8",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Swiss Ball Rollout",
            "Long-Lever Plank"
          ],
          "nota": "No te limites a flexionar la cadera. Usa los abdominales para descender de forma controlada y volver a subir. Si todavía no tienes la fuerza de core necesaria para extenderte por completo en la parte inferior, aumenta progresivamente el recorrido semana a semana."
        }
      ]
    },
    {
      "dia": "Sábado",
      "enfoque": "Piernas (Enfoque de hipertrofia)",
      "ejercicios": [
        {
          "nombre": "Hack Squat",
          "video": "https://www.youtube.com/shorts/k8BoDL0auNc",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "2-4",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~6-7"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~7-8"
            }
          ],
          "descanso": "2-3 min",
          "alternativas": [
            "Leg Press",
            "DB Walking Lunge"
          ],
          "nota": "Realiza una fase negativa controlada, sin dejarte caer, y luego sube de forma explosiva."
        },
        {
          "nombre": "Seated Leg Curl",
          "video": "https://www.youtube.com/shorts/xdbEG3xGLI8",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Lying Leg Curl",
            "Nordic Ham Curl"
          ],
          "nota": "Inclínate hacia delante sobre la máquina para conseguir el máximo estiramiento de los isquiotibiales."
        },
        {
          "nombre": "Walking Lunge",
          "video": "https://www.youtube.com/shorts/2ea3_b9rFdM",
          "series": 2,
          "repeticiones": "10-12",
          "calentamiento_series": "2-3",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~6-7"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~7-8"
            }
          ],
          "descanso": "2-3 min",
          "alternativas": [
            "Smith Machine Static Lunge",
            "DB Static Lunge"
          ],
          "nota": "Da zancadas de longitud media y minimiza la participación de la pierna trasera."
        },
        {
          "nombre": "Leg Extension",
          "video": "https://www.youtube.com/shorts/iQ92TuvBqRo",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Reverse Nordic",
            "Sissy Squat"
          ],
          "nota": "Lleva el respaldo tan atrás como sea posible sin perder comodidad. Sujeta las asas con fuerza para mantener los glúteos pegados al asiento. Haz una fase negativa de 2-3 segundos y siente el estiramiento de los cuádriceps."
        },
        {
          "nombre": "Machine Hip Adduction",
          "video": "https://www.youtube.com/shorts/iPLvw74e7Tk",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Cable Hip Adduction",
            "Copenhagen Hip Adduction"
          ],
          "nota": "Mantén la conexión mente-músculo con la parte interna de los muslos. Este ejercicio es excelente para añadir masa visible en los muslos; trabájalo con intensidad."
        },
        {
          "nombre": "Machine Hip Abduction",
          "video": "https://www.youtube.com/shorts/S_FGYHNHJ_c",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Cable Hip Abduction",
            "Lateral Band Walk"
          ],
          "nota": "Si es posible, utiliza almohadillas para aumentar el recorrido de la máquina. Inclínate hacia delante y sujeta las barras para incrementar el estiramiento de los glúteos."
        },
        {
          "nombre": "Standing Calf Raise",
          "video": "https://www.youtube.com/shorts/yQZDGjL-xT4",
          "series": 2,
          "repeticiones": "12-15",
          "calentamiento_series": "1-2",
          "sets": [
            {
              "set": 1,
              "tipo": "serie_previa",
              "rpe": "~7-8"
            },
            {
              "set": 2,
              "tipo": "ultima_serie",
              "rpe": "~8-9"
            }
          ],
          "descanso": "1-2 min",
          "alternativas": [
            "Seated Calf Raise",
            "Leg Press Calf Press"
          ],
          "nota": "Haz una pausa de 1-2 segundos en la parte inferior de cada repetición. En lugar de limitarte a subir sobre las puntas, piensa en desplazar el tobillo hacia delante y atrás sobre la zona del antepié."
        }
      ]
    },
    {
      "dia": "Domingo",
      "enfoque": "Descanso",
      "ejercicios": []
    }
  ]
}

);
const REG_HEADERS = ["Fecha", "Dia", "Ejercicio", "Serie", "Peso", "Reps", "Nota", "FotoURL", "FotoFileId", "PesoNormalizadoKg", "EjercicioCanonico", "AliasComparableBase", "ContextoDetectado", "ComparableAdvisor", "SesionCanonica", "ObservacionSistema"];
const MAP_HEADERS = ["Alias", "EjercicioCanonico", "ComparableBase", "TipoCarga", "IncrementoKg", "InicioPct", "ContextoEsperado", "Comentario"];
const ADVISOR_HEADERS = ["Día", "Ejercicio", "Rango objetivo", "Incremento Kg", "Factor inicio", "Sesiones limpias", "Última fecha limpia", "Último top limpio (kg)", "Reps top último", "Mejor top reciente (kg)", "Observación histórica", "Estado", "Inicio recomendado (kg)", "Top set sugerido (kg)", "Alerta subida", "RepMin", "RepMax", "Récord limpio (kg)"];
const DEFAULT_EXERCISE_MAP = [["Barbell Bench Press", "Barbell Bench Press", true, "compuesto", 2.5, 0.9, "", "Canónico actual"], ["Incline Dumbbell Press", "Incline Dumbbell Press", true, "compuesto", 2.0, 0.92, "", "Canónico actual"], ["Seated Overhead Press", "Seated Overhead Press", true, "compuesto", 2.0, 0.92, "", "Canónico actual"], ["Cable Lateral Raise", "Cable Lateral Raise", true, "aislado", 1.0, 0.93, "", "Canónico actual"], ["Triceps Rope Pushdown", "Triceps Rope Pushdown", true, "aislado", 2.0, 0.93, "", "Canónico actual"], ["Ab Crunch Machine", "Ab Crunch Machine", true, "core", 5.0, 0.9, "", "Canónico actual"], ["Neutral Grip Lat Pulldown", "Neutral Grip Lat Pulldown", true, "compuesto", 5.0, 0.9, "", "Canónico actual"], ["Chest Supported Row", "Chest Supported Row", true, "compuesto", 5.0, 0.92, "", "Canónico actual"], ["One Arm Lat Pulldown", "One Arm Lat Pulldown", true, "compuesto", 2.0, 0.92, "", "Canónico actual"], ["Face Pull", "Face Pull", true, "aislado", 2.0, 0.93, "", "Canónico actual"], ["Machine Preacher Curl", "Machine Preacher Curl", true, "aislado", 2.0, 0.93, "", "Canónico actual"], ["Hammer Curl", "Hammer Curl", true, "aislado", 2.0, 0.93, "", "Canónico actual"], ["Hack Squat", "Hack Squat", true, "compuesto", 5.0, 0.9, "", "Canónico actual"], ["Leg Press", "Leg Press", true, "compuesto", 10.0, 0.92, "", "Canónico actual"], ["Seated Leg Curl", "Seated Leg Curl", true, "compuesto", 5.0, 0.92, "", "Canónico actual"], ["Leg Extension", "Leg Extension", true, "aislado", 5.0, 0.93, "", "Canónico actual"], ["Standing Calf Raise", "Standing Calf Raise", true, "aislado", 5.0, 0.93, "", "Canónico actual"], ["Reverse Crunch", "Reverse Crunch", true, "core", 2.5, 0.9, "", "Canónico actual"], ["Dead Bug con pausa", "Dead Bug con pausa", true, "core", 2.5, 0.9, "", "Canónico actual"], ["Machine Chest Press", "Machine Chest Press", true, "compuesto", 5.0, 0.9, "", "Canónico actual"], ["Butterfly (Pec Deck)", "Butterfly (Pec Deck)", true, "aislado", 5.0, 0.93, "", "Canónico actual"], ["Seated Overhead Press", "Seated Overhead Press", true, "compuesto", 2.0, 0.92, "", "Canónico actual"], ["Cable Lateral Raise", "Cable Lateral Raise", true, "aislado", 1.0, 0.93, "", "Canónico actual"], ["Overhead Cable Triceps Extension (Bar)", "Overhead Cable Triceps Extension (Bar)", true, "aislado", 2.0, 0.93, "", "Canónico actual"], ["Triceps Rope Pushdown", "Triceps Rope Pushdown", true, "aislado", 2.0, 0.93, "", "Canónico actual"], ["Seated Cable Row", "Seated Cable Row", true, "compuesto", 5.0, 0.9, "", "Canónico actual"], ["Neutral Grip Lat Pulldown", "Neutral Grip Lat Pulldown", true, "compuesto", 5.0, 0.92, "", "Canónico actual"], ["Reverse Pec Deck", "Reverse Pec Deck", true, "aislado", 2.0, 0.93, "", "Canónico actual"], ["Face Away Bayesian Curl", "Face Away Bayesian Curl", true, "aislado", 2.0, 0.93, "", "Canónico actual"], ["Hammer Curl", "Hammer Curl", true, "aislado", 2.0, 0.93, "", "Canónico actual"], ["Cable Crunch", "Cable Crunch", true, "core", 5.0, 0.9, "", "Canónico actual"], ["Hanging Knee Raise", "Hanging Knee Raise", true, "core", 2.5, 0.9, "", "Canónico actual"], ["Hip Thrust (Barbell)", "Hip Thrust (Barbell)", true, "compuesto", 10.0, 0.9, "", "Canónico actual"], ["Romanian Deadlift (Dumbbell)", "Romanian Deadlift (Dumbbell)", true, "compuesto", 4.0, 0.92, "", "Canónico actual"], ["Lying Leg Curl", "Lying Leg Curl", true, "compuesto", 5.0, 0.92, "", "Canónico actual"], ["Split Squat Estático", "Split Squat Estático", true, "compuesto", 2.0, 0.92, "", "Canónico actual"], ["Machine Hip Abduction", "Machine Hip Abduction", true, "aislado", 5.0, 0.93, "", "Canónico actual"], ["Standing Calf Raise", "Standing Calf Raise", true, "aislado", 5.0, 0.93, "", "Canónico actual"], ["Press de banca", "Barbell Bench Press", true, "compuesto", 2.5, 0.9, "", "Misma variante libre"], ["Press de banca con pausa (1s)", "Barbell Bench Press", true, "compuesto", 2.5, 0.9, "", "Comparable pero con pausa"], ["Press inclinado mancuernas", "Incline Dumbbell Press", true, "compuesto", 2.0, 0.92, "", "Misma familia"], ["Se hizo en maquina", "Incline Dumbbell Press", false, "compuesto", 2.0, 0.92, "", "No comparable por cambio de implemento"], ["Press hombro mancuernas", "Seated Overhead Press", true, "compuesto", 2.0, 0.92, "", "Comparable prudente"], ["Arnold Press", "Seated Overhead Press", false, "compuesto", 2.0, 0.92, "", "No comparable exacto"], ["Behind-the-back Cable Lateral Raise", "Cable Lateral Raise", true, "aislado", 1.0, 0.93, "", "Cable lateral similar"], ["Lateral Raise (Dumbbell)", "Cable Lateral Raise", false, "aislado", 1.0, 0.93, "", "No comparable con mancuerna"], ["Extensión tríceps cuerda", "Triceps Rope Pushdown", true, "aislado", 2.0, 0.93, "", "Misma variante"], ["Barra recta", "Triceps Rope Pushdown", false, "aislado", 2.0, 0.93, "", "No comparable con cuerda"], ["Crunch polea alta", "Ab Crunch Machine", true, "core", 5.0, 0.9, "", "Core cargado comparable"], ["Jalón al pecho pesado", "Neutral Grip Lat Pulldown", true, "compuesto", 5.0, 0.9, "", "Tirón vertical comparable"], ["Jalón al pecho", "Neutral Grip Lat Pulldown", true, "compuesto", 5.0, 0.9, "", "Tirón vertical comparable"], ["Lat Pulldown (Cable)", "Neutral Grip Lat Pulldown", true, "compuesto", 5.0, 0.9, "", "Tirón vertical comparable"], ["Wide Grip Lat Pulldown", "Neutral Grip Lat Pulldown", false, "compuesto", 5.0, 0.9, "", "Agarre distinto"], ["Remo máquina", "Chest Supported Row", true, "compuesto", 5.0, 0.92, "", "Si es apoyo pecho/máquina"], ["Remo máquina unilateral", "Chest Supported Row", false, "compuesto", 5.0, 0.92, "", "No comparable por unilateral"], ["Dumbbell Row", "Chest Supported Row", false, "compuesto", 5.0, 0.92, "", "No comparable por patrón distinto"], ["Face pull", "Face Pull", true, "aislado", 2.0, 0.93, "", "Misma variante"], ["Curl bíceps", "Machine Preacher Curl", false, "aislado", 2.0, 0.93, "", "Demasiado genérico"], ["Predicador con barra z", "Machine Preacher Curl", false, "aislado", 2.0, 0.93, "", "No comparable"], ["Curl martillo", "Hammer Curl", true, "aislado", 2.0, 0.93, "", "Misma variante"], ["Hack squat", "Hack Squat", true, "compuesto", 5.0, 0.9, "", "Misma variante"], ["Smith Machine Squat", "Hack Squat", false, "compuesto", 5.0, 0.9, "", "No comparable"], ["Sentadilla / Prensa", "Hack Squat", false, "compuesto", 5.0, 0.9, "", "No comparable"], ["Sentadilla goblet pesada", "Hack Squat", false, "compuesto", 5.0, 0.9, "", "No comparable"], ["Curl femoral", "Seated Leg Curl", true, "compuesto", 5.0, 0.92, "", "Flexión rodilla comparable"], ["Curl Leg Machine", "Seated Leg Curl", true, "compuesto", 5.0, 0.92, "", "Flexión rodilla comparable"], ["Extensión cuádriceps", "Leg Extension", true, "aislado", 5.0, 0.93, "", "Misma familia"], ["Elevación talones", "Standing Calf Raise", true, "aislado", 5.0, 0.93, "", "Pantorrilla comparable"], ["Crunch inverso banco", "Reverse Crunch", true, "core", 2.5, 0.9, "", "Comparable por patrón"], ["Dead bug", "Dead Bug con pausa", true, "core", 2.5, 0.9, "", "Comparable si hay pausa controlada"], ["Dead bug con pausa", "Dead Bug con pausa", true, "core", 2.5, 0.9, "", "Canónico"], ["Pec Deck (Chest Fly Machine)", "Butterfly (Pec Deck)", true, "aislado", 5.0, 0.93, "", "Misma máquina"], ["Barbell Skullcrusher", "Overhead Cable Triceps Extension (Bar)", false, "aislado", 2.0, 0.93, "", "No comparable"], ["Skullcrusher (Dumbbell)", "Overhead Cable Triceps Extension (Bar)", false, "aislado", 2.0, 0.93, "", "No comparable"], ["Remo sentado", "Seated Cable Row", true, "compuesto", 5.0, 0.9, "", "Misma familia"], ["Remo sentado pesado", "Seated Cable Row", true, "compuesto", 5.0, 0.9, "", "Misma familia"], ["Cable Y Raise", "Reverse Pec Deck", false, "aislado", 2.0, 0.93, "", "No comparable exacto"], ["Elevación piernas", "Hanging Knee Raise", true, "core", 2.5, 0.9, "", "Comparable por patrón"], ["Hip Thrust", "Hip Thrust (Barbell)", true, "compuesto", 10.0, 0.9, "", "Misma familia"], ["Hip Thrust con pausa (2s arriba)", "Hip Thrust (Barbell)", true, "compuesto", 10.0, 0.9, "", "Comparable prudente"], ["Hip Thrust con pausa (3s)", "Hip Thrust (Barbell)", true, "compuesto", 10.0, 0.9, "", "Comparable prudente"], ["Hip Thrust unilateral", "Hip Thrust (Barbell)", false, "compuesto", 10.0, 0.9, "", "No comparable"], ["Peso muerto rumano", "Romanian Deadlift (Dumbbell)", true, "compuesto", 4.0, 0.92, "", "Misma familia"], ["Split Squat estático", "Split Squat Estático", true, "compuesto", 2.0, 0.92, "", "Misma variante"], ["Zancada búlgara", "Split Squat Estático", false, "compuesto", 2.0, 0.92, "", "No comparable"], ["Reverse lunge", "Split Squat Estático", false, "compuesto", 2.0, 0.92, "", "No comparable"], ["Walking Lunges", "Split Squat Estático", false, "compuesto", 2.0, 0.92, "", "No comparable"], ["Máquina de patada de glúteo", "Machine Hip Abduction", false, "aislado", 5.0, 0.93, "", "No comparable"]];

function INSTALAR_SISTEMA() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureRoutineConfig_(ss, true);
  ensureRegistrosSheet_(ss);
  ensurePesoSheet_(ss);
  ensureExerciseMapSheet_(ss);
  ensureAdvisorSheet_(ss);
  ensureDashboardSheet_(ss, true);
  enrichHistoricalRowsIncremental_(ss, true);
  rebuildAdvisorSheet_(ss);
  return 'Sistema MarioFit listo con Top Set Advisor (optimizado).';
}

function ACTUALIZAR_RUTINA_V9() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureRoutineConfig_(ss, true);
  ensureExerciseMapSheet_(ss);
  enrichHistoricalRowsIncremental_(ss, false);
  rebuildAdvisorSheet_(ss);
  return 'Rutina + advisor v9 cargados correctamente (optimizado).';
}

function RECONSTRUIR_ADVISOR_COMPLETO() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  enrichHistoricalRowsIncremental_(ss, true);
  rebuildAdvisorSheet_(ss);
  return 'Advisor reconstruido completamente.';
}

function ensureRoutineConfig_(ss, force) {
  let sh = ss.getSheetByName('Config');
  if (!sh) sh = ss.insertSheet('Config');
  let shouldWrite = !!force;
  if (!shouldWrite) {
    try {
      const raw = sh.getRange('A1').getValue();
      const curr = raw ? JSON.parse(raw) : null;
      shouldWrite = !curr || curr.version !== '8.2_TOPSET_ADVISOR' || !curr.feature_topset_advisor;
    } catch (err) {
      shouldWrite = true;
    }
  }
  if (shouldWrite) sh.getRange('A1').setValue(JSON_INICIAL);
  return JSON.parse(sh.getRange('A1').getValue());
}

function ensureRegistrosSheet_(ss) {
  let sh = ss.getSheetByName('Registros');
  if (!sh) sh = ss.insertSheet('Registros');

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, REG_HEADERS.length).setValues([REG_HEADERS]);
    sh.getRange(1, 1, 1, REG_HEADERS.length).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    return sh;
  }

  const currHeaders = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), REG_HEADERS.length)).getValues()[0];
  let needsHeaderWrite = false;
  for (var i = 0; i < REG_HEADERS.length; i++) {
    if (String(currHeaders[i] || '') !== String(REG_HEADERS[i])) {
      needsHeaderWrite = true;
      break;
    }
  }
  if (needsHeaderWrite) {
    sh.getRange(1, 1, 1, REG_HEADERS.length).setValues([REG_HEADERS]);
    sh.getRange(1, 1, 1, REG_HEADERS.length).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function ensurePesoSheet_(ss) {
  let sh = ss.getSheetByName('PesoUsuario');
  if (!sh) sh = ss.insertSheet('PesoUsuario');
  if (sh.getLastRow() === 0) {
    sh.getRange('A1:B1').setValues([['Fecha', 'Peso KG']]);
    sh.getRange('A1:B1').setFontWeight('bold').setBackground('#cfe2f3');
  }
  return sh;
}

function ensureExerciseMapSheet_(ss) {
  let sh = ss.getSheetByName('MapaEjercicios');
  if (!sh) sh = ss.insertSheet('MapaEjercicios');

  const isEmpty = sh.getLastRow() === 0;
  if (isEmpty) {
    sh.getRange(1, 1, 1, MAP_HEADERS.length).setValues([MAP_HEADERS]);
    sh.getRange(1, 1, 1, MAP_HEADERS.length).setFontWeight('bold').setBackground('#5B9BD5').setFontColor('#ffffff');
    if (DEFAULT_EXERCISE_MAP.length) {
      sh.getRange(2, 1, DEFAULT_EXERCISE_MAP.length, MAP_HEADERS.length).setValues(DEFAULT_EXERCISE_MAP);
    }
    sh.setFrozenRows(1);
    return sh;
  }

  const currHeaders = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), MAP_HEADERS.length)).getValues()[0];
  let needsHeaderWrite = false;
  for (var i = 0; i < MAP_HEADERS.length; i++) {
    if (String(currHeaders[i] || '') !== String(MAP_HEADERS[i])) {
      needsHeaderWrite = true;
      break;
    }
  }
  if (needsHeaderWrite) {
    sh.getRange(1, 1, 1, MAP_HEADERS.length).setValues([MAP_HEADERS]);
    sh.getRange(1, 1, 1, MAP_HEADERS.length).setFontWeight('bold').setBackground('#5B9BD5').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function ensureAdvisorSheet_(ss) {
  let sh = ss.getSheetByName('TopSetAdvisor');
  if (!sh) sh = ss.insertSheet('TopSetAdvisor');
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, ADVISOR_HEADERS.length).setValues([ADVISOR_HEADERS]);
    sh.getRange(1, 1, 1, ADVISOR_HEADERS.length).setFontWeight('bold').setBackground('#70AD47').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    return sh;
  }

  const currHeaders = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), ADVISOR_HEADERS.length)).getValues()[0];
  let needsHeaderWrite = false;
  for (var i = 0; i < ADVISOR_HEADERS.length; i++) {
    if (String(currHeaders[i] || '') !== String(ADVISOR_HEADERS[i])) {
      needsHeaderWrite = true;
      break;
    }
  }
  if (needsHeaderWrite) {
    sh.getRange(1, 1, 1, ADVISOR_HEADERS.length).setValues([ADVISOR_HEADERS]);
    sh.getRange(1, 1, 1, ADVISOR_HEADERS.length).setFontWeight('bold').setBackground('#70AD47').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function ensureDashboardSheet_(ss, force) {
  let sh = ss.getSheetByName('Dashboard');
  if (!sh) sh = ss.insertSheet('Dashboard');
  if (!force && sh.getLastRow() > 0) return sh;

  sh.clear();
  sh.getRange('A1:E1').setValues([['Ejercicio', 'Máximo Histórico (kg)', 'Último Peso Usado', 'Progreso Visual', 'Total Series']]);
  sh.getRange('A1:E1').setFontWeight('bold').setBackground('#d9ead3');
  sh.getRange('A2').setFormula('=SORT(UNIQUE(Registros!C2:C))');
  sh.getRange('B2').setFormula('=BYROW(A2:A, LAMBDA(x, IF(x="", "", MAXIFS(Registros!J:J, Registros!K:K, x, Registros!N:N, TRUE))))');
  sh.getRange('C2').setFormula('=BYROW(A2:A, LAMBDA(x, IF(x="", "", IFERROR(INDEX(SORT(FILTER({Registros!A:A,Registros!J:J}, Registros!K:K=x, Registros!N:N=TRUE), 1, 0), 1, 2), "-"))))');
  sh.getRange('E2').setFormula('=BYROW(A2:A, LAMBDA(x, IF(x="", "", COUNTIF(Registros!K:K, x))))');
  return sh;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getProcessingContext_(ss, routineOpt) {
  const routine = routineOpt || ensureRoutineConfig_(ss, false);
  const aliasMap = loadExerciseMap_(ss);
  const catalog = getExerciseCatalog_(routine);
  return { ss: ss, routine: routine, aliasMap: aliasMap, catalog: catalog };
}

function loadExerciseMap_(ss) {
  const sh = ss.getSheetByName('MapaEjercicios') || ensureExerciseMapSheet_(ss);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return {};
  const rows = sh.getRange(2, 1, lastRow - 1, MAP_HEADERS.length).getValues().filter(function (r) { return r[0]; });
  const aliasMap = {};
  rows.forEach(function (r) {
    aliasMap[String(r[0])] = {
      canonico: String(r[1] || r[0]),
      comparableBase: String(r[2]).toUpperCase() === 'TRUE' || r[2] === true,
      tipoCarga: String(r[3] || ''),
      incrementoKg: parseFloat(r[4]) || 0,
      inicioPct: parseFloat(r[5]) || 0.92,
      contextoEsperado: String(r[6] || ''),
      comentario: String(r[7] || '')
    };
  });
  return aliasMap;
}

function getExerciseCatalog_(routine) {
  const map = {};
  (routine.semana || []).forEach(function (dia) {
    (dia.ejercicios || []).forEach(function (ex) {
      map[ex.nombre] = { dia: dia.dia, ejercicio: ex };
    });
  });
  return map;
}

function parseRepRange_(txt) {
  const str = String(txt || '');
  const m = str.match(/(\d+)\s*-\s*(\d+)/);
  if (m) return { min: parseInt(m[1], 10), max: parseInt(m[2], 10) };
  const n = str.match(/(\d+)/);
  if (n) {
    const v = parseInt(n[1], 10);
    return { min: v, max: v };
  }
  return { min: null, max: null };
}

function normalizeWeightKg_(peso, nota) {
  let w = parseFloat(peso);
  if (isNaN(w)) w = 0;
  const note = String(nota || '').toLowerCase();
  if (note.indexOf('libra') >= 0 || note.indexOf(' lb') >= 0 || note.startsWith('lb')) {
    return Math.round(w * 0.453592 * 10) / 10;
  }
  return Math.round(w * 10) / 10;
}

function detectContext_(nombre, nota) {
  const txt = (String(nombre || '') + ' ' + String(nota || '')).toLowerCase();
  const tags = [];
  if (txt.indexOf('libra') >= 0 || txt.indexOf(' lb') >= 0 || txt.indexOf('lb ') >= 0) tags.push('lb');
  if (txt.indexOf('smith') >= 0) tags.push('smith');
  if (txt.indexOf('barra z') >= 0 || txt.indexOf('barra ez') >= 0) tags.push('barra_z');
  if (txt.indexOf('barra recta') >= 0) tags.push('barra_recta');
  if (txt.indexOf('mancuerna') >= 0) tags.push('mancuerna');
  if (txt.indexOf('maquina') >= 0 || txt.indexOf('máquina') >= 0) tags.push('maquina');
  if (txt.indexOf('polea') >= 0 || txt.indexOf('cable') >= 0) tags.push('polea');
  if (txt.indexOf('unilateral') >= 0 || txt.indexOf('un brazo') >= 0 || txt.indexOf('1 brazo') >= 0) tags.push('unilateral');
  if (txt.indexOf('pausa') >= 0) tags.push('pausa');
  return tags.join(', ');
}

function canonicalExercise_(nombre, aliasMap) {
  const info = aliasMap[String(nombre || '')];
  return info ? info.canonico : String(nombre || '');
}

function isComparableForAdvisor_(nombre, canonico, nota, aliasMap, repRange, reps) {
  const info = aliasMap[String(nombre || '')];
  const catalogComparable = !!info && info.comparableBase;
  const currentCanon = !!aliasMap[String(canonico || '')] || Object.keys(aliasMap).some(function (k) { return aliasMap[k].canonico === canonico; });
  if (!catalogComparable && String(nombre || '') !== String(canonico || '')) {
    return { comparable: false, obs: 'Alias no comparable' };
  }
  if (!currentCanon) return { comparable: false, obs: 'Fuera de la rutina actual' };
  const note = String(nota || '').toLowerCase();

  if (canonico === 'Triceps Rope Pushdown' && note.indexOf('barra recta') >= 0) return { comparable: false, obs: 'Barra recta, no cuerda' };
  if (canonico === 'Machine Preacher Curl' && (note.indexOf('barra z') >= 0 || note.indexOf('barra ez') >= 0)) return { comparable: false, obs: 'Predicador con barra Z' };
  if (canonico === 'Face Pull' && (note.indexOf('maquina') >= 0 || note.indexOf('máquina') >= 0)) return { comparable: false, obs: 'Se hizo en máquina' };
  if (canonico === 'Incline Dumbbell Press' && (note.indexOf('maquina') >= 0 || note.indexOf('máquina') >= 0)) return { comparable: false, obs: 'Se hizo en máquina' };
  if (canonico === 'Chest Supported Row' && (note.indexOf('polea') >= 0 || note.indexOf('unilateral') >= 0)) return { comparable: false, obs: 'Polea/unilateral distinto' };
  if (canonico === 'Neutral Grip Lat Pulldown' && String(nombre || '') === 'Wide Grip Lat Pulldown') return { comparable: false, obs: 'Agarre distinto' };
  if (canonico === 'Hack Squat' && ['Hack Squat', 'Hack squat'].indexOf(String(nombre || '')) === -1) return { comparable: false, obs: 'No es hack squat real' };
  const repsNum = parseFloat(reps);
  if (repRange && repRange.max && !isNaN(repsNum) && repsNum > (repRange.max * 2)) return { comparable: false, obs: 'Reps fuera de rango lógico' };
  if (!info && String(nombre || '') !== String(canonico || '')) return { comparable: false, obs: 'Alias no reconocido' };
  return { comparable: true, obs: '' };
}

function enrichRegisterRowValuesFromCtx_(ctx, fecha, dia, nombre, serie, peso, reps, nota) {
  const canonico = canonicalExercise_(nombre, ctx.aliasMap);
  const repRange = ctx.catalog[canonico] ? parseRepRange_(ctx.catalog[canonico].ejercicio.repeticiones) : null;
  const compData = isComparableForAdvisor_(nombre, canonico, nota, ctx.aliasMap, repRange, reps);
  const aliasBase = ctx.aliasMap[String(nombre || '')] ? ctx.aliasMap[String(nombre || '')].comparableBase : (String(nombre || '') === String(canonico || '') && !!ctx.catalog[canonico]);
  const pesoKg = normalizeWeightKg_(peso, nota);
  const contexto = detectContext_(nombre, nota);
  const dt = fecha ? new Date(fecha) : new Date();
  const sesion = Utilities.formatDate(dt, Session.getScriptTimeZone(), 'yyyy-MM-dd') + '|' + String(dia || '') + '|' + String(canonico || '');
  return [
    pesoKg,
    canonico,
    aliasBase,
    contexto,
    compData.comparable,
    sesion,
    compData.obs || ''
  ];
}

function enrichHistoricalRowsIncremental_(ss, forceAll) {
  const sh = ensureRegistrosSheet_(ss);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;

  const ctx = getProcessingContext_(ss);
  let startRow = 2;

  if (!forceAll) {
    const normalizedCol = sh.getRange(2, 10, lastRow - 1, 1).getValues();
    let firstPendingIndex = -1;
    for (var i = 0; i < normalizedCol.length; i++) {
      if (normalizedCol[i][0] === '' || normalizedCol[i][0] === null) {
        firstPendingIndex = i;
        break;
      }
    }
    if (firstPendingIndex === -1) return 0;
    startRow = firstPendingIndex + 2;
  }

  const numRows = lastRow - startRow + 1;
  if (numRows <= 0) return 0;
  const values = sh.getRange(startRow, 1, numRows, 7).getValues();
  const out = values.map(function (r) {
    return enrichRegisterRowValuesFromCtx_(ctx, r[0], r[1], r[2], r[3], r[4], r[5], r[6]);
  });
  sh.getRange(startRow, 10, out.length, 7).setValues(out);
  return out.length;
}

function buildAdvisorMap_(ss, routine) {
  const sh = ensureRegistrosSheet_(ss);
  const lastRow = sh.getLastRow();
  const catalog = getExerciseCatalog_(routine);
  const grouped = {};
  const latestRawByCanon = {};

  if (lastRow >= 2) {
    const rows = sh.getRange(2, 1, lastRow - 1, 16).getValues();
    rows.forEach(function (r) {
      const fecha = r[0] ? new Date(r[0]) : null;
      const canon = String(r[10] || '');
      const comparable = String(r[13]).toUpperCase() === 'TRUE' || r[13] === true;
      const pesoKg = parseFloat(r[9]) || 0;
      const reps = parseFloat(r[5]) || 0;
      const sesion = String(r[14] || '');
      if (!canon || !catalog[canon]) return;

      if (fecha && (!latestRawByCanon[canon] || latestRawByCanon[canon].getTime() < fecha.getTime())) {
        latestRawByCanon[canon] = fecha;
      }

      if (!comparable || pesoKg <= 0 || !sesion) return;

      if (!grouped[canon]) grouped[canon] = {};
      if (!grouped[canon][sesion] || grouped[canon][sesion].topPeso < pesoKg || (grouped[canon][sesion].topPeso === pesoKg && grouped[canon][sesion].topReps < reps)) {
        grouped[canon][sesion] = {
          fecha: fecha || new Date(),
          topPeso: pesoKg,
          topReps: reps,
          nota: String(r[6] || '')
        };
      }
    });
  }

  const advisorByExercise = {};
  const sheetRows = [];
  const ventana = (routine.feature_topset_advisor && routine.feature_topset_advisor.ventana_sesiones_limpias) || 5;

  (routine.semana || []).forEach(function (dia) {
    (dia.ejercicios || []).forEach(function (ex) {
      const canon = ex.nombre;
      const repRange = parseRepRange_(ex.repeticiones);
      const topset = ex.topset || {};
      const stepKg = parseFloat(topset.step_kg) || 0;
      const startPct = parseFloat(topset.start_pct) || 0.92;
      const usable = !!topset.usar_asesor && stepKg > 0;
      const sessions = Object.keys(grouped[canon] || {}).map(function (k) { return grouped[canon][k]; }).sort(function (a, b) { return a.fecha.getTime() - b.fecha.getTime(); });
      const recent = sessions.slice(Math.max(0, sessions.length - ventana));

      let latest = null;
      let bestRecent = '';
      let lastTop = '';
      let lastReps = '';
      let note = '';
      let state = 'SIN_DATA';
      let startKgVal = '';
      let targetTop = '';
      let recordKg = '';

      if (sessions.length) {
        latest = recent[recent.length - 1];
        bestRecent = Math.max.apply(null, recent.map(function (x) { return x.topPeso; }));
        lastTop = latest.topPeso;
        lastReps = latest.topReps;
        recordKg = Math.max.apply(null, sessions.map(function (x) { return x.topPeso; }));

        if (latestRawByCanon[canon] && latestRawByCanon[canon].getTime() > latest.fecha.getTime()) {
          note = 'Tomé el último dato limpio; la sesión más reciente traía contexto distinto.';
        } else if (sessions.length < 2) {
          note = 'Base limpia todavía corta; consolida una sesión más.';
        }

        if (!usable || !repRange.max) {
          state = 'REPS';
        } else if (lastReps >= repRange.max) {
          state = 'SUBIR';
        } else if (repRange.min && lastReps >= repRange.min) {
          state = 'MANTENER';
        } else {
          state = 'CONSOLIDAR';
        }

        if (usable) {
          startKgVal = Math.min(lastTop, Math.round((lastTop * startPct) / stepKg) * stepKg);
          startKgVal = Math.round(startKgVal * 10) / 10;
          targetTop = Math.round((lastTop + (state === 'SUBIR' ? stepKg : 0)) * 10) / 10;
        }
      }

      advisorByExercise[canon] = {
        enabled: !!(usable && lastTop !== ''),
        start_kg: startKgVal === '' ? null : startKgVal,
        top_set_kg: targetTop === '' ? null : targetTop,
        step_kg: stepKg,
        status: state,
        status_label: state,
        note: note,
        reference_date: latest ? Utilities.formatDate(latest.fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
        clean_sessions: sessions.length,
        last_top_kg: lastTop === '' ? null : lastTop,
        last_top_reps: lastReps === '' ? null : lastReps,
        best_recent_kg: bestRecent === '' ? null : bestRecent,
        record_kg: recordKg === '' ? 0 : recordKg
      };

      sheetRows.push([
        dia.dia,
        canon,
        ex.repeticiones || '',
        stepKg,
        startPct,
        sessions.length,
        latest ? Utilities.formatDate(latest.fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
        lastTop,
        lastReps,
        bestRecent,
        note,
        state,
        startKgVal,
        targetTop,
        state === 'SIN_DATA' ? 'Sin base limpia' : (state === 'REPS' ? 'Guíate por reps' : (state === 'SUBIR' ? 'Sube ' + stepKg + ' kg' : (state === 'MANTENER' ? 'Mantén y limpia técnica' : 'No subas todavía'))),
        repRange.min || '',
        repRange.max || '',
        recordKg
      ]);
    });
  });

  return { advisorByExercise: advisorByExercise, sheetRows: sheetRows };
}

function rebuildAdvisorSheet_(ss) {
  const routine = ensureRoutineConfig_(ss, false);
  const result = buildAdvisorMap_(ss, routine);
  const sh = ensureAdvisorSheet_(ss);
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, ADVISOR_HEADERS.length).clearContent();
  }
  if (result.sheetRows.length) {
    sh.getRange(2, 1, result.sheetRows.length, ADVISOR_HEADERS.length).setValues(result.sheetRows);
  }
  return result;
}

function readAdvisorSheetMap_(ss) {
  const sh = ensureAdvisorSheet_(ss);
  const lastRow = sh.getLastRow();
  const map = {};
  if (lastRow < 2) return map;
  const rows = sh.getRange(2, 1, lastRow - 1, ADVISOR_HEADERS.length).getValues();
  rows.forEach(function (r) {
    const name = String(r[1] || '');
    if (!name) return;
    map[name] = {
      enabled: !!r[12] || !!r[13],
      start_kg: r[12] === '' ? null : r[12],
      top_set_kg: r[13] === '' ? null : r[13],
      step_kg: r[3] === '' ? null : r[3],
      status: String(r[11] || 'SIN_DATA'),
      status_label: String(r[11] || 'SIN_DATA'),
      note: String(r[10] || ''),
      reference_date: String(r[6] || ''),
      clean_sessions: parseInt(r[5], 10) || 0,
      last_top_kg: r[7] === '' ? null : r[7],
      last_top_reps: r[8] === '' ? null : r[8],
      best_recent_kg: r[9] === '' ? null : r[9],
      record_kg: r[17] === '' ? 0 : (parseFloat(r[17]) || 0)
    };
  });
  return map;
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const routine = ensureRoutineConfig_(ss, false);
  ensureRegistrosSheet_(ss);
  ensureExerciseMapSheet_(ss);

  if (e && e.parameter && e.parameter.getRoutine) {
    enrichHistoricalRowsIncremental_(ss, false);

    let advisor = readAdvisorSheetMap_(ss);
    if (!Object.keys(advisor).length) {
      advisor = rebuildAdvisorSheet_(ss).advisorByExercise || {};
    }

    (routine.semana || []).forEach(function (dia) {
      (dia.ejercicios || []).forEach(function (ex) {
        const ad = advisor[ex.nombre] || {};
        ex.record = { peso: ad.record_kg || 0, reps: ad.last_top_reps || 0 };
        ex.advisor = ad;
      });
    });

    return ContentService.createTextOutput(JSON.stringify(routine))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.getTodaySummary) {
    const sheet = ensureRegistrosSheet_(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    const startRow = Math.max(2, lastRow - 400);
    const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, 6).getValues();
    const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yy');
    const summary = rows.filter(function (row) {
      if (!row[0]) return false;
      const fechaFila = Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'dd/MM/yy');
      return fechaFila === hoy;
    }).map(function (row) {
      return {
        ejercicio: row[2],
        serie: row[3],
        peso: row[4],
        reps: row[5]
      };
    });

    return ContentService.createTextOutput(JSON.stringify(summary))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.getHistory) {
    try {
      const sh = ensureRegistrosSheet_(ss);
      const lastRow = sh.getLastRow();
      if (lastRow < 2) {
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
      }

      const limit = 250;
      const startRow = Math.max(2, lastRow - limit + 1);
      const rows = sh.getRange(startRow, 1, lastRow - startRow + 1, 8).getValues();
      const history = [];
      for (var i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        if (!row[2]) continue;
        history.push({
          fecha: Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'dd/MM/yy'),
          dia: row[1],
          ejercicio: row[2],
          serie: row[3],
          peso: row[4],
          reps: row[5],
          nota: row[6] || '',
          fotoUrl: row[7] || '',
          foto: row[7] || ''
        });
      }
      return ContentService.createTextOutput(JSON.stringify(history)).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
  }

  const html = HtmlService.createTemplateFromFile('Index');
  html.scriptUrl = ScriptApp.getService().getUrl();
  return html.evaluate()
    .setTitle('MarioFit Pro')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(20000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);
    const timestamp = new Date();

    if (data.tipo === 'PESO_CORPORAL') {
      const sheetPeso = ensurePesoSheet_(ss);
      sheetPeso.appendRow([timestamp, data.valor]);
      return ContentService.createTextOutput('Peso guardado');
    }

    const sheetReg = ensureRegistrosSheet_(ss);
    const ctx = getProcessingContext_(ss);

    if (data.tipo === 'INACTIVIDAD') {
      const extra = enrichRegisterRowValuesFromCtx_(ctx, timestamp, data.dia, '⚠️ REPORTE: ' + data.motivo, '-', 0, 0, '');
      const row = [[
        timestamp,
        data.dia,
        '⚠️ REPORTE: ' + data.motivo,
        '-',
        0,
        0,
        '',
        '',
        '',
        extra[0], extra[1], extra[2], extra[3], extra[4], extra[5], extra[6]
      ]];
      const targetRow = sheetReg.getLastRow() + 1;
      sheetReg.getRange(targetRow, 1, 1, REG_HEADERS.length).setValues(row);
      rebuildAdvisorSheet_(ss);
      return ContentService.createTextOutput('Nota guardada');
    }

    const payloadRows = (data.ejercicios || []).map(function (ex) {
      const extra = enrichRegisterRowValuesFromCtx_(ctx, timestamp, data.dia, ex.nombre, ex.serie, ex.peso, ex.reps, ex.nota || '');
      return [
        timestamp,
        data.dia,
        ex.nombre,
        ex.serie,
        ex.peso,
        ex.reps,
        ex.nota || '',
        ex.foto || '',
        ex.fotoFileId || '',
        extra[0], extra[1], extra[2], extra[3], extra[4], extra[5], extra[6]
      ];
    });

    if (payloadRows.length) {
      const targetRow = sheetReg.getLastRow() + 1;
      sheetReg.getRange(targetRow, 1, payloadRows.length, REG_HEADERS.length).setValues(payloadRows);
      rebuildAdvisorSheet_(ss);
    }

    return ContentService.createTextOutput('Entrenamiento guardado');
  } catch (error) {
    return ContentService.createTextOutput('Error: ' + error.toString());
  } finally {
    try { lock.releaseLock(); } catch (e) { }
  }
}
