import { Component } from '@angular/core';
import { NavController, AlertController, ViewWillEnter, IonicModule } from '@ionic/angular';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestPregunta, TestRangoResultado, TestTemplate } from '../../models/test-template.model';
import { TestTemplatesFirestoreService } from '../../services/test-templates-firestore.service';

const TESTS_PREDETERMINADOS: TestTemplate[] = [
  {
    id: 'predefinido_groc',
    nombre: 'GROC - Escala Global de Cambio',
    descripcion: 'Global Rating of Change. Mide la percepcion del paciente sobre su cambio global desde el inicio del tratamiento. Escala de -7 (mucho peor) a +7 (mucho mejor).',
    preguntas: [
      {
        texto: 'En comparacion con el inicio del tratamiento, como describiria su condicion actual?',
        puntajeMin: -7,
        puntajeMax: 7
      }
    ],
    rangos: [
      { nombre: 'Mucho peor', min: -7, max: -5, color: '#ef4444' },
      { nombre: 'Peor', min: -4, max: -2, color: '#f97316' },
      { nombre: 'Sin cambio significativo', min: -1, max: 1, color: '#6b7280' },
      { nombre: 'Mejor', min: 2, max: 4, color: '#22c55e' },
      { nombre: 'Mucho mejor', min: 5, max: 7, color: '#10b981' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_barthel',
    nombre: 'Indice de Barthel',
    descripcion: 'Mide la capacidad funcional para actividades basicas de la vida diaria (ABVD). Puntaje de 0 (dependencia total) a 100 (independencia).',
    preguntas: [
      { texto: 'Comer (0=incapaz, 5=necesita ayuda, 10=independiente)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Trasladarse sillon-cama (0=incapaz, 5=gran ayuda, 10=minima ayuda, 15=independiente)', puntajeMin: 0, puntajeMax: 15 },
      { texto: 'Aseo personal (0=necesita ayuda, 5=independiente)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Uso del retrete (0=dependiente, 5=necesita ayuda, 10=independiente)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Banarse/ducharse (0=dependiente, 5=independiente)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Desplazarse (0=inmovil, 5=silla de ruedas, 10=ayuda de una persona, 15=independiente)', puntajeMin: 0, puntajeMax: 15 },
      { texto: 'Subir/bajar escaleras (0=incapaz, 5=necesita ayuda, 10=independiente)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Vestirse/desvestirse (0=dependiente, 5=necesita ayuda, 10=independiente)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Control de heces (0=incontinente, 5=accidente ocasional, 10=continente)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Control de orina (0=incontinente, 5=accidente ocasional, 10=continente)', puntajeMin: 0, puntajeMax: 10 }
    ],
    rangos: [
      { nombre: 'Dependencia total', min: 0, max: 20, color: '#ef4444' },
      { nombre: 'Dependencia grave', min: 21, max: 60, color: '#f97316' },
      { nombre: 'Dependencia moderada', min: 61, max: 90, color: '#f59e0b' },
      { nombre: 'Dependencia escasa', min: 91, max: 99, color: '#22c55e' },
      { nombre: 'Independencia', min: 100, max: 100, color: '#10b981' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_eva_funcional',
    nombre: 'EVA Funcional',
    descripcion: 'Escala Visual Analogica aplicada a multiples dimensiones funcionales del paciente. Evalua dolor, funcion y satisfaccion.',
    preguntas: [
      { texto: 'Dolor en reposo (0=sin dolor, 10=maximo dolor)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Dolor en movimiento (0=sin dolor, 10=maximo dolor)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Dificultad para actividades cotidianas (0=ninguna, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Dificultad para actividad laboral (0=ninguna, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Dificultad para actividad deportiva/recreativa (0=ninguna, 10=imposible)', puntajeMin: 0, puntajeMax: 10 }
    ],
    rangos: [
      { nombre: 'Leve', min: 0, max: 15, color: '#10b981' },
      { nombre: 'Moderado', min: 16, max: 30, color: '#f59e0b' },
      { nombre: 'Severo', min: 31, max: 40, color: '#f97316' },
      { nombre: 'Muy severo', min: 41, max: 50, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_tinetti_marcha',
    nombre: 'Tinetti - Marcha',
    descripcion: 'Evaluacion de la marcha del test de Tinetti. Detecta riesgo de caidas en adultos mayores. Puntaje marcha: 0-12.',
    preguntas: [
      { texto: 'Inicio de la marcha (0=vacilacion/varios intentos, 1=sin vacilacion)', puntajeMin: 0, puntajeMax: 1 },
      { texto: 'Longitud y altura del paso derecho (0=no sobrepasa pie izq, 1=sobrepasa, pie se levanta)', puntajeMin: 0, puntajeMax: 1 },
      { texto: 'Longitud y altura del paso izquierdo (0=no sobrepasa pie der, 1=sobrepasa, pie se levanta)', puntajeMin: 0, puntajeMax: 1 },
      { texto: 'Simetria del paso (0=desigual, 1=igual)', puntajeMin: 0, puntajeMax: 1 },
      { texto: 'Continuidad de los pasos (0=discontinuos, 1=continuos)', puntajeMin: 0, puntajeMax: 1 },
      { texto: 'Trayectoria (0=desviacion marcada, 1=desviacion leve, 2=recta sin ayuda)', puntajeMin: 0, puntajeMax: 2 },
      { texto: 'Tronco (0=balanceo marcado, 1=no balancea pero flexiona, 2=sin balanceo ni flexion)', puntajeMin: 0, puntajeMax: 2 },
      { texto: 'Postura al caminar (0=talones separados, 1=talones casi juntos)', puntajeMin: 0, puntajeMax: 1 }
    ],
    rangos: [
      { nombre: 'Alto riesgo de caidas', min: 0, max: 5, color: '#ef4444' },
      { nombre: 'Riesgo moderado', min: 6, max: 9, color: '#f59e0b' },
      { nombre: 'Bajo riesgo', min: 10, max: 12, color: '#10b981' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_ndi',
    nombre: 'NDI - Indice de Discapacidad Cervical',
    descripcion: 'Neck Disability Index. Evalua como el dolor de cuello afecta las actividades diarias. 10 secciones, puntaje 0-50.',
    preguntas: [
      { texto: 'Intensidad del dolor de cuello (0=sin dolor, 5=el peor imaginable)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Cuidado personal (0=sin problemas, 5=necesita ayuda en todo)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Levantar objetos (0=puedo levantar pesados, 5=no puedo levantar nada)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Lectura (0=sin problemas, 5=no puedo leer)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Dolor de cabeza (0=sin cefalea, 5=cefalea constante)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Concentracion (0=puedo concentrarme, 5=no puedo concentrarme)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Trabajo (0=puedo trabajar normal, 5=no puedo trabajar)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Conducir (0=sin problemas, 5=no puedo conducir)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Dormir (0=sin problemas, 5=no puedo dormir)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Recreacion (0=sin limitacion, 5=no puedo hacer nada)', puntajeMin: 0, puntajeMax: 5 }
    ],
    rangos: [
      { nombre: 'Sin discapacidad', min: 0, max: 4, color: '#10b981' },
      { nombre: 'Discapacidad leve', min: 5, max: 14, color: '#22c55e' },
      { nombre: 'Discapacidad moderada', min: 15, max: 24, color: '#f59e0b' },
      { nombre: 'Discapacidad severa', min: 25, max: 34, color: '#f97316' },
      { nombre: 'Discapacidad completa', min: 35, max: 50, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_oswestry',
    nombre: 'Oswestry - Discapacidad Lumbar',
    descripcion: 'Oswestry Disability Index (ODI). Evalua como el dolor lumbar afecta las actividades diarias. 10 secciones, puntaje 0-50.',
    preguntas: [
      { texto: 'Intensidad del dolor (0=sin dolor, 5=el peor imaginable)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Cuidado personal (0=normal, 5=necesita ayuda en todo)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Levantar objetos (0=puedo levantar pesados, 5=no puedo levantar nada)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Caminar (0=sin limite, 5=cama/silla todo el dia)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Sentarse (0=sin limite, 5=no puedo sentarme)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Estar de pie (0=sin limite, 5=no puedo estar de pie)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Dormir (0=sin problemas, 5=no puedo dormir)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Vida social (0=normal, 5=sin vida social)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Viajar (0=sin problemas, 5=solo voy al medico)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Empleo/Tareas del hogar (0=normal, 5=no puedo hacer nada)', puntajeMin: 0, puntajeMax: 5 }
    ],
    rangos: [
      { nombre: 'Discapacidad minima', min: 0, max: 4, color: '#10b981' },
      { nombre: 'Discapacidad moderada', min: 5, max: 14, color: '#22c55e' },
      { nombre: 'Discapacidad intensa', min: 15, max: 24, color: '#f59e0b' },
      { nombre: 'Discapacidad severa', min: 25, max: 34, color: '#f97316' },
      { nombre: 'Maxima discapacidad', min: 35, max: 50, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_koos',
    nombre: 'KOOS - Rodilla',
    descripcion: 'Knee injury and Osteoarthritis Outcome Score. Evalua dolor, sintomas, funcion en AVD, deporte/recreacion y calidad de vida en patologias de rodilla. 42 items, cada uno 0 (sin problemas) a 4 (problemas extremos). Puntaje total 0-168.',
    preguntas: [
      // SINTOMAS (7 items)
      { texto: 'S1. Tiene inflamacion en la rodilla? (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S2. Siente crujidos o chasquidos al mover la rodilla? (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S3. Se le traba o bloquea la rodilla? (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S4. Puede estirar la rodilla completamente? (0=siempre, 4=nunca)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S5. Puede doblar la rodilla completamente? (0=siempre, 4=nunca)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S6. Rigidez matutina de rodilla (0=ninguna, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S7. Rigidez durante el dia tras estar sentado/acostado (0=ninguna, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      // DOLOR (9 items)
      { texto: 'D1. Frecuencia del dolor de rodilla (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D2. Dolor al girar/rotar sobre la rodilla (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D3. Dolor al estirar la rodilla completamente (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D4. Dolor al doblar la rodilla completamente (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D5. Dolor al caminar en superficie plana (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D6. Dolor al subir o bajar escaleras (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D7. Dolor durante la noche en cama (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D8. Dolor al estar sentado o acostado (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D9. Dolor al estar de pie (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      // AVD - ACTIVIDADES VIDA DIARIA (17 items)
      { texto: 'A1. Bajar escaleras (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A2. Subir escaleras (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A3. Levantarse de estar sentado (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A4. Estar de pie (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A5. Agacharse al suelo/recoger objeto (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A6. Caminar en superficie plana (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A7. Entrar/salir del auto (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A8. Ir de compras (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A9. Ponerse calcetines/medias (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A10. Levantarse de la cama (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A11. Quitarse calcetines/medias (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A12. Girar/darse vuelta en la cama (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A13. Entrar/salir de la banera o ducha (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A14. Sentarse (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A15. Sentarse/levantarse del retrete (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A16. Tareas domesticas pesadas (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A17. Tareas domesticas ligeras (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      // DEPORTE Y RECREACION (5 items)
      { texto: 'R1. Ponerse en cuclillas (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R2. Correr (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R3. Saltar (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R4. Girar/rotar sobre la rodilla afectada (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R5. Arrodillarse (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      // CALIDAD DE VIDA (4 items)
      { texto: 'Q1. Con que frecuencia es consciente de su problema de rodilla? (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'Q2. Ha modificado su estilo de vida para evitar actividades daninas? (0=nada, 4=totalmente)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'Q3. Cuanta falta de confianza siente en su rodilla? (0=ninguna, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'Q4. En general, cuanta dificultad tiene con su rodilla? (0=ninguna, 4=extrema)', puntajeMin: 0, puntajeMax: 4 }
    ],
    rangos: [
      { nombre: 'Sin problemas / Normal', min: 0, max: 33, color: '#10b981' },
      { nombre: 'Leve', min: 34, max: 67, color: '#22c55e' },
      { nombre: 'Moderada', min: 68, max: 101, color: '#f59e0b' },
      { nombre: 'Severa', min: 102, max: 134, color: '#f97316' },
      { nombre: 'Extrema', min: 135, max: 168, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_30s_sit_stand',
    nombre: '30s Sit to Stand Test',
    descripcion: 'Mide la fuerza funcional de extremidades inferiores y resistencia. El paciente se levanta y sienta de una silla el mayor numero de veces en 30 segundos. Se registra el numero total de repeticiones.',
    preguntas: [
      { texto: 'Numero de repeticiones completadas en 30 segundos (sentarse y levantarse)', puntajeMin: 0, puntajeMax: 30 }
    ],
    rangos: [
      { nombre: 'Muy por debajo del promedio', min: 0, max: 7, color: '#ef4444' },
      { nombre: 'Por debajo del promedio', min: 8, max: 11, color: '#f97316' },
      { nombre: 'Promedio', min: 12, max: 16, color: '#f59e0b' },
      { nombre: 'Por encima del promedio', min: 17, max: 21, color: '#22c55e' },
      { nombre: 'Muy por encima del promedio', min: 22, max: 30, color: '#10b981' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_pcs',
    nombre: 'PCS - Pain Catastrophizing Scale',
    descripcion: 'Escala de Catastrofismo ante el Dolor. Evalua pensamientos y sentimientos catastroficos asociados al dolor. 13 items en 3 dimensiones: Rumiacion, Magnificacion e Indefension. Cada item 0-4, puntaje total 0-52.',
    preguntas: [
      // RUMIACION (4 items)
      { texto: 'R1. No puedo dejar de pensar en lo mucho que me duele (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R2. No paro de pensar en cuanto deseo que desaparezca el dolor (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R3. No puedo apartar el dolor de mi mente (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R4. No dejo de pensar en lo dolorosa que es la experiencia (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      // MAGNIFICACION (3 items)
      { texto: 'M1. Me pregunto si algo grave puede suceder (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'M2. Siento que no puedo soportarlo mas (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'M3. Tengo miedo de que el dolor empeore (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      // INDEFENSION (6 items)
      { texto: 'I1. Siento que no puedo seguir asi (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'I2. Me parece que no hay nada que pueda hacer para reducir la intensidad del dolor (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'I3. Me pregunto si me puede pasar algo grave (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'I4. Pienso que esto nunca se va a acabar (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'I5. No hay nada que pueda hacer para aliviar mi dolor (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'I6. Me preocupa que el dolor no desaparecera (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 }
    ],
    rangos: [
      { nombre: 'Bajo catastrofismo', min: 0, max: 14, color: '#10b981' },
      { nombre: 'Moderado', min: 15, max: 25, color: '#f59e0b' },
      { nombre: 'Alto catastrofismo', min: 26, max: 38, color: '#f97316' },
      { nombre: 'Catastrofismo severo', min: 39, max: 52, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_sane',
    nombre: 'SANE - Single Assessment Numeric Evaluation',
    descripcion: 'Evaluacion numerica unica. Pregunta global que mide la percepcion del paciente sobre la funcion de la articulacion o zona afectada en una escala de 0 (peor posible) a 100 (normal, sin problemas).',
    preguntas: [
      { texto: 'Como calificaria la funcion de su articulacion/zona afectada? (0=peor posible, 100=normal sin problemas)', puntajeMin: 0, puntajeMax: 100 }
    ],
    rangos: [
      { nombre: 'Funcion muy pobre', min: 0, max: 24, color: '#ef4444' },
      { nombre: 'Funcion pobre', min: 25, max: 49, color: '#f97316' },
      { nombre: 'Funcion aceptable', min: 50, max: 69, color: '#f59e0b' },
      { nombre: 'Buena funcion', min: 70, max: 84, color: '#22c55e' },
      { nombre: 'Funcion normal', min: 85, max: 100, color: '#10b981' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_spadi',
    nombre: 'SPADI-Sp - Indice Dolor y Discapacidad de Hombro',
    descripcion: 'Shoulder Pain and Disability Index version espanola. Evalua dolor (5 items) y discapacidad funcional (8 items) del hombro. Cada item 0-10, puntaje total 0-130. Valores mas altos indican mayor dolor/discapacidad.',
    preguntas: [
      // DOLOR (5 items)
      { texto: 'D1. Dolor en el peor momento (0=sin dolor, 10=el peor imaginable)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'D2. Dolor al acostarse sobre el lado afectado (0=sin dolor, 10=el peor imaginable)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'D3. Dolor al alcanzar algo en un estante alto (0=sin dolor, 10=el peor imaginable)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'D4. Dolor al tocarse la nuca (0=sin dolor, 10=el peor imaginable)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'D5. Dolor al empujar con el brazo afectado (0=sin dolor, 10=el peor imaginable)', puntajeMin: 0, puntajeMax: 10 },
      // DISCAPACIDAD (8 items)
      { texto: 'F1. Lavarse el pelo (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'F2. Lavarse la espalda (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'F3. Ponerse una camiseta o jersey (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'F4. Ponerse una camisa con botones por delante (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'F5. Ponerse los pantalones (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'F6. Colocar un objeto en un estante alto (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'F7. Cargar un objeto pesado (+5kg) (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'F8. Sacar algo del bolsillo trasero (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 }
    ],
    rangos: [
      { nombre: 'Sin discapacidad', min: 0, max: 19, color: '#10b981' },
      { nombre: 'Discapacidad leve', min: 20, max: 45, color: '#22c55e' },
      { nombre: 'Discapacidad moderada', min: 46, max: 75, color: '#f59e0b' },
      { nombre: 'Discapacidad severa', min: 76, max: 105, color: '#f97316' },
      { nombre: 'Discapacidad maxima', min: 106, max: 130, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_prwe',
    nombre: 'PRWE - Evaluacion Muneca y Mano (Version Espanola)',
    descripcion: 'Patient-Rated Wrist Evaluation version espanola. Evalua dolor (5 items) y funcion (10 items) de la muneca. Dolor: cada item 0-10 (subtotal 0-50). Funcion: cada item 0-10 dividido por 2 (subtotal 0-50). Puntaje total 0-100.',
    preguntas: [
      // DOLOR (5 items)
      { texto: 'D1. Dolor en reposo (0=sin dolor, 10=el peor imaginable)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'D2. Dolor durante movimientos repetitivos de muneca (0=sin dolor, 10=el peor imaginable)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'D3. Dolor al levantar un objeto pesado (0=sin dolor, 10=el peor imaginable)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'D4. Dolor cuando esta en su peor momento (0=sin dolor, 10=el peor imaginable)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'D5. Con que frecuencia tiene dolor? (0=nunca, 10=siempre)', puntajeMin: 0, puntajeMax: 10 },
      // ACTIVIDADES ESPECIFICAS (6 items)
      { texto: 'E1. Girar la perilla de una puerta (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'E2. Cortar carne con cuchillo (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'E3. Abrochar botones de camisa (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'E4. Usar la mano afectada para empujar y levantarse de una silla (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'E5. Cargar 5kg con la mano afectada (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'E6. Usar papel higienico con la mano afectada (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      // ACTIVIDADES HABITUALES (4 items)
      { texto: 'H1. Cuidado personal (vestirse, lavarse) (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'H2. Tareas del hogar (limpieza, cocina) (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'H3. Trabajo habitual (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'H4. Actividades recreativas (0=sin dificultad, 10=imposible)', puntajeMin: 0, puntajeMax: 10 }
    ],
    rangos: [
      { nombre: 'Sin discapacidad', min: 0, max: 25, color: '#10b981' },
      { nombre: 'Discapacidad leve', min: 26, max: 55, color: '#22c55e' },
      { nombre: 'Discapacidad moderada', min: 56, max: 95, color: '#f59e0b' },
      { nombre: 'Discapacidad severa', min: 96, max: 125, color: '#f97316' },
      { nombre: 'Discapacidad maxima', min: 126, max: 150, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  }
];

@Component({
    selector: 'app-tests-config',
    templateUrl: './tests-config.page.html',
    styleUrls: ['./tests-config.page.scss'],
    standalone: true,
    imports: [IonicModule, NgIf, NgFor, FormsModule]
})
export class TestsConfigPage implements ViewWillEnter {
  tests: TestTemplate[] = [];
  modoCrear = false;
  modoEditar = false;
  testEditandoId = '';

  // Formulario nuevo test
  nuevoTest = {
    nombre: '',
    descripcion: ''
  };

  preguntas: TestPregunta[] = [];
  rangos: TestRangoResultado[] = [];

  coloresDisponibles = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#3b82f6'];

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private testTemplatesService: TestTemplatesFirestoreService
  ) {}

  async ionViewWillEnter() {
    await this.cargarTests();
  }

  async cargarTests() {
    this.tests = await this.testTemplatesService.getTests();
  }

  guardarTests() {
    this.testTemplatesService.persistLocalBackup(this.tests);
  }

  // === CREAR / EDITAR TEST ===

  iniciarCreacion() {
    this.modoCrear = true;
    this.modoEditar = false;
    this.testEditandoId = '';
    this.nuevoTest = { nombre: '', descripcion: '' };
    this.preguntas = [{ texto: '', puntajeMin: 0, puntajeMax: 10 }];
    this.rangos = [
      { nombre: 'Normal', min: 0, max: 5, color: '#10b981' },
      { nombre: 'Alterado', min: 6, max: 10, color: '#ef4444' }
    ];
  }

  editarTest(test: TestTemplate) {
    this.modoCrear = true;
    this.modoEditar = true;
    this.testEditandoId = test.id;
    this.nuevoTest = { nombre: test.nombre, descripcion: test.descripcion };
    this.preguntas = test.preguntas.map(p => ({ ...p }));
    this.rangos = test.rangos.map(r => ({ ...r }));
  }

  cancelarCreacion() {
    this.modoCrear = false;
    this.modoEditar = false;
    this.testEditandoId = '';
  }

  // === PREGUNTAS ===

  agregarPregunta() {
    this.preguntas.push({ texto: '', puntajeMin: 0, puntajeMax: 10 });
  }

  eliminarPregunta(index: number) {
    if (this.preguntas.length > 1) {
      this.preguntas.splice(index, 1);
    }
  }

  // === RANGOS ===

  agregarRango() {
    const ultimoMax = this.rangos.length > 0 ? this.rangos[this.rangos.length - 1].max + 1 : 0;
    const colorIndex = this.rangos.length % this.coloresDisponibles.length;
    this.rangos.push({
      nombre: '',
      min: ultimoMax,
      max: ultimoMax + 10,
      color: this.coloresDisponibles[colorIndex]
    });
  }

  eliminarRango(index: number) {
    if (this.rangos.length > 1) {
      this.rangos.splice(index, 1);
    }
  }

  // === GUARDAR ===

  formularioValido(): boolean {
    if (!this.nuevoTest.nombre.trim()) return false;
    if (this.preguntas.length === 0) return false;
    if (this.preguntas.some(p => !p.texto.trim())) return false;
    if (this.rangos.length === 0) return false;
    if (this.rangos.some(r => !r.nombre.trim())) return false;
    return true;
  }

  async guardarTest() {
    if (!this.formularioValido()) return;

    let testGuardado: TestTemplate | null = null;

    if (this.modoEditar) {
      const index = this.tests.findIndex(t => t.id === this.testEditandoId);
      if (index !== -1) {
        testGuardado = {
          ...this.tests[index],
          nombre: this.nuevoTest.nombre.trim(),
          descripcion: this.nuevoTest.descripcion.trim(),
          preguntas: [...this.preguntas],
          rangos: [...this.rangos]
        };
        this.tests[index] = testGuardado;
      }
    } else {
      testGuardado = {
        id: 'test_' + Date.now(),
        nombre: this.nuevoTest.nombre.trim(),
        descripcion: this.nuevoTest.descripcion.trim(),
        preguntas: [...this.preguntas],
        rangos: [...this.rangos],
        fechaCreacion: new Date().toISOString()
      };
      this.tests.push(testGuardado);
    }

    if (testGuardado) {
      await this.testTemplatesService.upsertTest(testGuardado);
    }

    this.guardarTests();
    this.modoCrear = false;
    this.modoEditar = false;
  }

  // === ELIMINAR ===

  async confirmarEliminar(test: TestTemplate) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Test',
      message: `Eliminar "${test.nombre}"? Los resultados ya registrados se mantienen.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            this.tests = this.tests.filter(t => t.id !== test.id);
            this.guardarTests();
            try {
              await this.testTemplatesService.deleteTest(test.id);
            } catch (error) {
              console.warn('No se pudo eliminar en Firestore. Se eliminó solo localmente.', error);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // === TESTS PREDETERMINADOS ===

  testsPredeterminados = TESTS_PREDETERMINADOS;

  testYaAgregado(testId: string): boolean {
    return this.tests.some(t => t.id === testId);
  }

  async agregarTestPredeterminado(test: TestTemplate) {
    if (this.testYaAgregado(test.id)) return;
    this.tests.push({
      ...test,
      preguntas: test.preguntas.map(p => ({ ...p })),
      rangos: test.rangos.map(r => ({ ...r })),
      fechaCreacion: new Date().toISOString()
    });
    await this.testTemplatesService.upsertTest(this.tests[this.tests.length - 1]);
    this.guardarTests();
  }

  async agregarTodosPredeterminados() {
    let agregados = 0;
    for (const test of TESTS_PREDETERMINADOS) {
      if (!this.testYaAgregado(test.id)) {
        this.tests.push({
          ...test,
          preguntas: test.preguntas.map(p => ({ ...p })),
          rangos: test.rangos.map(r => ({ ...r })),
          fechaCreacion: new Date().toISOString()
        });
        agregados++;
      }
    }
    if (agregados > 0) {
      for (const test of this.tests) {
        await this.testTemplatesService.upsertTest(test);
      }
      this.guardarTests();
    }
    return agregados;
  }

  // === PUNTAJE MAXIMO CALCULADO ===

  getPuntajeMaximo(): number {
    return this.preguntas.reduce((sum, p) => sum + p.puntajeMax, 0);
  }

  volverAtras() {
    this.navCtrl.navigateRoot('/dashboard');
  }
}
