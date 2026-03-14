# KineSphere — Diagnóstico Arquitectónico y Rediseño

**Fecha:** 2026-03-14
**Autor:** Principal Software Architect
**Versión:** 1.0

---

## 1. COMPRENSIÓN DEL SISTEMA

### Flujo de Autenticación
1. Usuario ingresa email/password en `LoginPage`
2. `AuthService` ejecuta `signInWithEmailAndPassword` de Firebase Auth
3. Si es exitoso, se navega a `/dashboard`
4. `AuthGuard` protege todas las rutas (excepto `/login` y `/r/:token`)
5. En algún punto post-login, `ClinicContextService.init()` se ejecuta para cargar `clinicId` y `role` desde `users/{uid}`

### Carga de Clínica
- `ClinicContextService` lee el documento `users/{uid}` de Firestore
- Extrae `clinicId` y `role` y los almacena en propiedades de instancia
- Todos los servicios heredan de `BaseClinicService`, que expone `clinicId` y `professionalId` como getters

### Acceso a Pacientes
- `PacientesService` consulta colección root `pacientes` filtrando por `clinicId`
- Soft-delete con flag `isDeleted`
- Validación de unicidad de RUT por clínica

### Manejo de Rutinas
- **Templates:** subcollection `clinics/{clinicId}/rutinas_templates`
- **Rutinas de paciente:** subcollection `clinics/{clinicId}/rutinas_paciente`
- Dos tipos: `clinica` y `domiciliaria`
- Las domiciliarias soportan acceso público vía `publicToken`
- Al crear nueva domiciliaria, se desactivan las anteriores (transacción)

### Manejo de Sesiones / Evoluciones
- `FlujoClinicoService` orquesta el flujo clínico completo
- Tres tipos de evolución: `initial`, `progress`, `discharge`
- Las sesiones de progreso usan transacciones para incrementar `nextSessionNumber` en `tratamientos`
- Estructura SOAP (Subjective, Objective, Assessment, Plan)

### Lo que NO está claro
- **No hay registro de usuarios desde la app** — la creación de usuarios/clínicas parece manual o por superadmin
- **No hay flujo de onboarding** para nuevas clínicas
- **BackupService usa localStorage** — parece código legacy de una versión pre-Firestore que no fue eliminado

---

## 2. DIAGNÓSTICO ARQUITECTÓNICO

### 2.1 Organización de Módulos Angular

**Estado actual:**
- Standalone components (buena práctica moderna Angular 15+)
- Lazy loading por ruta via `loadComponent`
- Estructura plana de páginas bajo `src/app/pages/`
- Componentes compartidos bajo `src/app/components/`

**Problemas detectados:**

| # | Problema | Severidad |
|---|---------|-----------|
| 1 | **No hay feature modules** — todas las páginas están al mismo nivel sin agrupación funcional | Media |
| 2 | **Archivos de routing module legacy** — existen `-routing.module.ts` y `.module.ts` que coexisten con standalone components pero probablemente no se usan | Baja |
| 3 | **No hay barrel exports** — no hay archivos `index.ts` para organizar imports | Baja |
| 4 | **Mezcla de patrones de inyección** — `constructor injection` vs `inject()` coexisten | Baja |

### 2.2 Uso de Servicios

**Lo bueno:**
- `BaseClinicService` como clase abstracta que centraliza `clinicId` y `professionalId` — excelente patrón
- `FlujoClinicoService` como orquestador del flujo clínico — buena separación
- Uso de transacciones Firestore para operaciones atómicas

**Problemas detectados:**

| # | Problema | Severidad |
|---|---------|-----------|
| 1 | **`DocumentosService` NO extiende `BaseClinicService`** — inyecta `Firestore` y `ClinicContextService` directamente, rompiendo la consistencia | Alta |
| 2 | **`DocumentosService.addDocumento()` acepta `any` sin validar clinicId** — un cliente puede enviar cualquier documento a cualquier clínica | CRÍTICA |
| 3 | **`DocumentosService.deleteDocumento()` no valida pertenencia a clínica** — cualquier usuario autenticado puede eliminar documentos de otra clínica | CRÍTICA |
| 4 | **`BackupService` usa `localStorage`** — código legacy completamente desacoplado de Firestore, puede confundir y generar inconsistencias | Alta |
| 5 | **Duplicación de `removeUndefinedFields`** — existe en `BaseClinicService.sanitize()`, `PacientesService`, y `EvolucionesService` | Media |
| 6 | **`EjerciciosFirestoreService.crearEjercicio()` acepta `any`** — sin tipado ni validación | Media |
| 7 | **Console.log en producción** — múltiples `console.log` de debug en `TratamientosService.listActivos()`, `DashboardPage.cargarDashboard()`, etc. | Baja |

### 2.3 Separación de Responsabilidades

**Problemas:**

| # | Problema | Severidad |
|---|---------|-----------|
| 1 | **Interfaces definidas dentro de archivos de servicio** — `PacienteDocument` está en `pacientes.service.ts`, `TratamientoDocument` en `tratamientos.service.ts`, `EvolucionDocument` en `evoluciones.service.ts`. Esto acopla los modelos a los servicios | Media |
| 2 | **Lógica de negocio en componentes** — `PacienteDetallePage` calcula edad, agrupa sesiones por tratamiento, formatea fechas. Debería estar en servicios | Media |
| 3 | **Modelo duplicado** — `EvolucionDocument` y las interfaces de `evolucion.model.ts` parecen solaparse | Media |
| 4 | **No hay capa de DTOs** — los datos van directo de Firestore al template sin transformación intermedia | Baja |

### 2.4 Lógica de Negocio

**Lo bueno:**
- `FlujoClinicoService` encapsula correctamente el ciclo de vida clínico
- Validaciones de negocio en `EvolucionesService.create()` (tipo vs sessionNumber)
- Transacciones para operaciones atómicas en `crearSesionProgreso` y `finalizarTratamiento`

**Problemas:**

| # | Problema | Severidad |
|---|---------|-----------|
| 1 | **`crearEvaluacionInicial` no usa transacción** — crea `tratamiento` y `evolución` en dos operaciones separadas. Si la segunda falla, queda un tratamiento huérfano | Alta |
| 2 | **No hay validación de que un paciente pertenece a la clínica al crear sesiones/rutinas** — se asume pero no se verifica explícitamente | Media |
| 3 | **El `guardarRutinaPaciente` acepta objetos con `clinicId: ''`** — ver `irACrearRutina()` en evolucion.page.ts línea 746 | Alta |

### 2.5 Deuda Técnica

| # | Deuda | Impacto |
|---|-------|---------|
| 1 | **BackupService completo** — usa localStorage, irrelevante para la arquitectura Firestore actual | Alto — debe eliminarse |
| 2 | **Campo `activa` deprecado en rutinas** — migración parcial a `estado`, ambos coexisten | Medio |
| 3 | **Colección `sesiones` legacy** — existe en security rules pero parece en desuso | Medio |
| 4 | **Archivos `.module.ts` legacy** — ~10 archivos de módulos que probablemente no se usan con standalone components | Bajo |
| 5 | **`rutina-template-editor.page.ts`** existe como archivo pero la ruta redirige a `rutina-editor` | Bajo |
| 6 | **`pdf.services.ts`** — nombre con plural `.services` inconsistente | Bajo |

---

## 3. MODELO DE DATOS FIRESTORE

### 3.1 Estructura Actual

```
ROOT
├── users/{uid}                           ← Perfil del usuario (clinicId, role)
├── clinics/{clinicId}                    ← Datos de la clínica
│   ├── ejercicios/{id}                   ← Ejercicios propios de la clínica
│   ├── rutinas_templates/{id}            ← Templates de rutinas
│   ├── rutinas_paciente/{id}             ← Rutinas asignadas a pacientes
│   ├── rutina_sesiones/{id}              ← Sesiones de rutina
│   └── rutina_logs/{id}                  ← Logs detallados de ejercicios
├── pacientes/{id}                        ← Root collection con clinicId field
├── tratamientos/{id}                     ← Root collection con clinicId field
├── evoluciones/{id}                      ← Root collection con clinicId field
├── ejercicios_globales/{id}              ← Biblioteca global pública
├── testTemplates/{id}                    ← Root collection con clinicId field
├── documentos/{id}                       ← Root collection con clinicId field
└── sesiones/{id}                         ← LEGACY — probablemente en desuso
```

### 3.2 Inconsistencia Arquitectónica Principal

**El problema más importante del modelo de datos es la inconsistencia en la estrategia de multi-tenancy:**

- **Patrón A (subcollection):** `rutinas_templates`, `rutinas_paciente`, `rutina_sesiones`, `rutina_logs`, `ejercicios` → viven bajo `clinics/{clinicId}/...`
- **Patrón B (root + field):** `pacientes`, `tratamientos`, `evoluciones`, `testTemplates`, `documentos` → son colecciones root con campo `clinicId`

**Impacto:**
- Con el Patrón B, **no se puede aprovechar la jerarquía de path en security rules** — cada regla debe hacer `get()` al documento del usuario para verificar clinicId
- Cada lectura de verificación de `clinicId` en security rules **consume una lectura adicional de Firestore** (billing)
- El Patrón A es inherentemente más seguro porque el `clinicId` está en el path

### 3.3 Problemas de Escalabilidad

| # | Problema | Impacto a escala |
|---|---------|-----------------|
| 1 | **`pacientes` como root collection** — listar pacientes de una clínica requiere query con filtro `clinicId`. Con 1000 clínicas y 100K pacientes totales, esto es ineficiente vs subcollection | Alto |
| 2 | **`evoluciones` como root collection** — misma situación. Queries como `listHoy()` o `listByPaciente()` escanean toda la colección filtrando por clinicId | Alto |
| 3 | **`DashboardPage` hace 4 queries seriales** — `list()` + `listActivos()` + `listHoy()` + `listIniciales()`. Con 500 pacientes, esto es lento | Alto |
| 4 | **Collection group queries para rutinas públicas** — `collectionGroup('rutinas_paciente')` escaneará todas las clínicas buscando un token | Medio |
| 5 | **Índices compuestos insuficientes** — faltan índices para queries frecuentes como `evoluciones` por `clinicId + patientId + activo + createdAt` | Medio |
| 6 | **No hay paginación** — `list()` de pacientes y evoluciones carga todo de golpe | Alto |

### 3.4 Queries Necesarias vs Existentes

| Query | Implementada | Problema |
|-------|-------------|---------|
| Pacientes por clínica | ✅ | Sin paginación |
| Evoluciones por paciente | ✅ | OK |
| Evoluciones del día | ✅ | Filtro por timestamp sin índice declarado |
| Tratamiento activo por paciente | ✅ | OK |
| Historial por tratamiento | ❌ | Se calcula en frontend agrupando |
| Pacientes con tratamiento activo | ❌ | Se calcula cruzando dos queries |
| Búsqueda de paciente por nombre | ❌ | No implementada (Firestore no soporta `LIKE`) |
| Estadísticas por período | ❌ | No implementada |

### 3.5 Modelo de Datos Ideal

```
ROOT
├── users/{uid}
│   └── role, clinicId, name, email, phone, specialty, license
│
├── clinics/{clinicId}
│   ├── info → nombre, dirección, logo, plan, settings
│   │
│   ├── staff/{uid}                          ← Miembros del equipo
│   │   └── role, joinedAt, active
│   │
│   ├── patients/{patientId}                 ← Pacientes de esta clínica
│   │   └── nombre, rut, fechaNacimiento, contacto, antecedentes
│   │
│   ├── treatments/{treatmentId}             ← Episodios clínicos
│   │   └── patientId, professionalId, estado, diagnosis, zones
│   │
│   ├── clinical_notes/{noteId}              ← Notas clínicas (evoluciones)
│   │   └── patientId, treatmentId, type, SOAP, painScale, ROM, tests
│   │
│   ├── exercise_library/{exerciseId}        ← Biblioteca de ejercicios
│   │
│   ├── routine_templates/{templateId}       ← Templates de rutinas
│   │
│   ├── patient_routines/{routineId}         ← Rutinas asignadas
│   │   └── patientId, exercises, type, status, publicToken
│   │
│   ├── routine_sessions/{sessionId}         ← Registro de sesiones de rutina
│   │
│   ├── routine_logs/{logId}                 ← Logs granulares
│   │
│   ├── test_templates/{testId}              ← Templates de tests clínicos
│   │
│   └── documents/{docId}                    ← Documentos médicos
│
├── global_exercises/{id}                    ← Biblioteca pública global
│
└── system/
    └── settings, billing, audit_log
```

**Ventajas del modelo propuesto:**
- **Aislamiento total por path** — security rules basadas en path, sin necesidad de `get()` adicionales
- **Queries eficientes** — cada clínica consulta solo sus datos
- **Costos reducidos** — elimina lecturas de verificación de clinicId
- **Escalabilidad natural** — cada clínica es un shard natural
- **Eliminación más limpia** — borrar una clínica = borrar un árbol de subcollections

---

## 4. SEGURIDAD DEL SISTEMA

### 4.1 Estado Actual de Security Rules

**Lo bueno:**
- Funciones helper reutilizables (`isSignedIn`, `hasProfile`, `sameClinic`, etc.)
- Verificación de clinicId en la mayoría de colecciones
- Restricción de `delete` a admins en la mayoría de los casos
- Verificación de `professionalId` en creación de pacientes

**VULNERABILIDADES DETECTADAS:**

| # | Vulnerabilidad | Severidad | Descripción |
|---|---------------|-----------|-------------|
| 1 | **`rutina_sesiones` create: `allow create: if true`** | **CRÍTICA** | Cualquier persona (incluso no autenticada) puede crear sesiones de rutina en cualquier clínica |
| 2 | **`rutina_logs` create: `allow create: if true`** | **CRÍTICA** | Cualquier persona puede crear logs de rutina en cualquier clínica |
| 3 | **`ejercicios_globales` read: `allow read: if true`** | **MEDIA** | Accesible sin autenticación. Aceptable solo si es información pública |
| 4 | **`ejercicios_globales` create: `allow create: if hasProfile()`** | **ALTA** | Cualquier usuario autenticado puede crear ejercicios globales visibles por todos |
| 5 | **`testTemplates` read: `allow read: if hasProfile()`** | **MEDIA** | Un usuario de clínica A puede leer templates de test de clínica B (falta filtro por clínica) |
| 6 | **`rutinas_paciente` read pública sin filtro de token** | **MEDIA** | La regla `allow read: if resource.data.publicEnabled == true` permite leer CUALQUIER rutina pública sin necesidad de conocer el token |
| 7 | **No hay regla para `documentos`** | **CRÍTICA** | La colección `documentos` no tiene security rules definidas. Probablemente hereda deny-all, pero debería ser explícita |
| 8 | **Usuarios pueden modificar su propio documento** | **ALTA** | `allow update: if request.auth.uid == userId` — un usuario podría cambiar su propio `clinicId` o `role` para escalar privilegios |
| 9 | **No se valida el contenido del write** | **ALTA** | En ninguna regla se verifica `request.resource.data` para campos obligatorios o tipos de datos |

### 4.2 Roles Esperados vs Implementados

| Rol | Estado | Capacidades actuales |
|-----|--------|---------------------|
| superadmin | ✅ Parcial | CRUD total en clinics/users, pero no definido en app |
| admin | ✅ Implementado | Delete en la mayoría, update en pacientes del equipo |
| professional | ✅ Implícito | Es el rol default, CRUD de sus propios datos |
| owner | ⚠️ En modelo, no en rules | Existe en el modelo de datos pero no en security rules |
| recepcionista | ❌ No existe | No hay rol implementado |
| paciente | ❌ No existe | No hay acceso de paciente al sistema |

### 4.3 Recomendaciones Críticas de Seguridad

```javascript
// FIX URGENTE #1: rutina_sesiones y rutina_logs
match /clinics/{clinicIdDoc}/rutina_sesiones/{id} {
  allow create: if sameClinicPath(clinicIdDoc) ||
                   (isSignedIn() == false &&
                    resource.data.publicEnabled == true);
  // O mejor aún, validar token en el request
}

// FIX URGENTE #2: users self-update
match /users/{userId} {
  allow update: if isSuperAdmin() ||
                   (request.auth.uid == userId &&
                    !('role' in request.resource.data) &&
                    !('clinicId' in request.resource.data));
}

// FIX URGENTE #3: testTemplates
match /testTemplates/{id} {
  allow read: if hasProfile() && sameClinic(resource.data);
}
```

---

## 5. FLUJO CLÍNICO REAL

### 5.1 Flujo Esperado vs Implementado

| Paso | Esperado | Estado | Observación |
|------|----------|--------|-------------|
| 1. Crear paciente | ✅ | Implementado | Funciona correctamente |
| 2. Evaluación inicial | ✅ | Implementado | Crea tratamiento + evolución initial |
| 3. Diagnóstico funcional | ⚠️ | Parcial | Solo `diagnostico` como texto libre en paciente, `zonaPrincipal` en tratamiento |
| 4. Plan de tratamiento | ⚠️ | Parcial | Solo `objetivos` en evaluación inicial, no hay plan estructurado |
| 5. Rutina de ejercicios | ✅ | Implementado | Clínica + domiciliaria con templates |
| 6. Sesiones registradas | ✅ | Implementado | Evoluciones de progreso con SOAP |
| 7. Evolución clínica | ⚠️ | Parcial | Datos de cada sesión pero sin vista longitudinal |
| 8. Alta | ✅ | Implementado | Evolución discharge + cierre de tratamiento |

### 5.2 Lo que FALTA

| Funcionalidad | Criticidad | Descripción |
|--------------|-----------|-------------|
| **Anamnesis estructurada** | CRÍTICA | No hay registro de antecedentes médicos, quirúrgicos, familiares, farmacológicos |
| **Diagnóstico CIE-10/CIF** | IMPORTANTE | Sin codificación estándar de diagnósticos |
| **Plan de tratamiento formal** | IMPORTANTE | Objetivos existen pero no hay frecuencia, duración, ni metas medibles |
| **Consentimiento informado** | CRÍTICA | No hay registro de consentimiento del paciente |
| **Escalas funcionales estandarizadas** | IMPORTANTE | Solo hay tests configurables, pero no hay escalas estándar (Barthel, FIM, etc.) |
| **Derivaciones** | MEJORA | No hay registro de interconsultas o derivaciones |
| **Imágenes/archivos adjuntos** | IMPORTANTE | DocumentosService existe pero no maneja archivos reales (Firebase Storage) |
| **Agenda/calendario** | IMPORTANTE | No hay sistema de agendamiento |

---

## 6. USABILIDAD CLÍNICA

### 6.1 Perspectiva del Kinesiólogo en Consulta

**Lo que funciona bien:**
- Flujo intuitivo: paciente → evaluación → sesiones → alta
- SOAP notes bien estructurado
- EVA (Escala Visual Analógica) de dolor
- ROM (Range of Motion) con articulaciones predefinidas
- Rutinas con ejercicios y videos
- Acceso público a rutinas domiciliarias (QR/link para paciente)

**Lo que falta o es difícil:**

| # | Problema de Usabilidad | Impacto Clínico |
|---|----------------------|----------------|
| 1 | **No hay historial clínico longitudinal** — no se puede ver la evolución del dolor en el tiempo sin ir a "evaluación de alta" | Alto |
| 2 | **No hay comparación entre sesiones** — no se puede comparar ROM de sesión 1 vs sesión 5 | Alto |
| 3 | **No hay dashboard de paciente** — no se ve un resumen rápido de estado del paciente | Medio |
| 4 | **No hay búsqueda de pacientes por nombre** — solo se puede scrollear la lista | Alto |
| 5 | **No hay escalas funcionales integradas** — solo tests configurables, faltan estándar | Medio |
| 6 | **No hay registro rápido de sesión** — el formulario es largo; para una sesión rápida de 20 min, llenar SOAP completo es costoso | Alto |
| 7 | **No hay campo de signos vitales** — presión, FC, temperatura (relevante para contexto clínico) | Bajo |
| 8 | **No hay timer/cronómetro** — para registrar tiempo de ejercicios | Bajo |
| 9 | **No hay notas rápidas** — tipo "sticky notes" para recordatorios del profesional | Bajo |
| 10 | **La navegación usa `navigateRoot`** — esto destruye el back stack; al presionar "volver" después de guardar, no siempre funciona como esperado | Medio |

### 6.2 Seguimiento Funcional

**Lo implementado:**
- EVA (dolor) por sesión
- ROM por sesión
- Calidad de sueño
- Tests clínicos con rangos

**Lo que falta:**
- Gráfico de evolución del dolor (existe solo en evaluación de alta)
- Gráfico de evolución del ROM
- Comparación side-by-side de evaluación inicial vs última sesión
- Porcentaje de logro de objetivos
- Índice de adherencia a rutinas (existe para domiciliaria, no para clínica)

---

## 7. ESCALABILIDAD SaaS

### 7.1 Análisis por Escala

| Métrica | 10 clínicas | 100 clínicas | 1000 clínicas |
|---------|------------|-------------|--------------|
| Pacientes estimados | ~500 | ~5,000 | ~50,000 |
| Evoluciones/mes | ~2,000 | ~20,000 | ~200,000 |
| Reads/día | ~10,000 | ~100,000 | ~1,000,000 |
| **Costo estimado Firestore** | ~$5/mes | ~$50/mes | ~$500+/mes |

### 7.2 Cuellos de Botella

| # | Problema | Escala afectada | Solución |
|---|---------|----------------|----------|
| 1 | **Root collections con filtro clinicId** | 100+ clínicas | Migrar a subcollections bajo `clinics/{id}/` |
| 2 | **Dashboard hace 4 queries sin paginación** | 50+ pacientes por clínica | Implementar contadores y paginación |
| 3 | **`listIniciales()` carga TODAS las evaluaciones iniciales** | 100+ pacientes | Paginar o usar contadores denormalizados |
| 4 | **Security rules hacen `get()` en cada request** | Todo momento | Con subcollections, el clinicId está en el path — no necesita get() |
| 5 | **`PreloadAllModules`** en routing | Todo momento | Cambiar a lazy loading selectivo |
| 6 | **No hay caché client-side** | Todo momento | Implementar enableIndexedDbPersistence o caché manual |
| 7 | **Batch writes limitados a 500** | 1000+ clínicas | Implementar batches paginados |
| 8 | **Collection group index para rutinas públicas** | 100+ clínicas | Crear colección separada `public_routines` con token como ID |

### 7.3 Límites de Firestore Relevantes

- **1 write/sec por documento** — no es problema para uso clínico
- **10 MiB máximo por documento** — ROM extensos podrían acercarse
- **500 operaciones por batch** — logs de rutina podrían superar esto
- **Composite indexes limitados** — máximo ~200, actualmente solo 3 declarados
- **10,000 reads en `get()` dentro de security rules** — con root collections, cada request consume reads extras

---

## 8. QUÉ FALTA PARA PRODUCCIÓN

### CRÍTICO (sin esto no puede usarse clínicamente)

| # | Ítem | Razón |
|---|------|-------|
| 1 | **Arreglar security rules de `rutina_sesiones` y `rutina_logs`** | `allow create: if true` es una vulnerabilidad que permite a cualquiera inyectar datos |
| 2 | **Arreglar security rules de `users` (escalación de privilegios)** | Un usuario puede cambiar su propio rol y clinicId |
| 3 | **Implementar anamnesis/antecedentes** | Requisito legal y clínico fundamental |
| 4 | **Implementar consentimiento informado** | Requisito legal para tratamiento |
| 5 | **Validar `DocumentosService`** | Actualmente no valida clínica en write/delete |
| 6 | **Eliminar `BackupService` legacy** | Usa localStorage, puede causar confusión y pérdida de datos si alguien lo usa |
| 7 | **Remover console.log en producción** | Expone datos sensibles en la consola del browser |
| 8 | **Implementar manejo de errores global** | Actualmente los errores se muestran solo en console |

### IMPORTANTE (mejoraría mucho el sistema)

| # | Ítem | Beneficio |
|---|------|-----------|
| 1 | **Migrar colecciones root a subcollections** | Escalabilidad, seguridad, costos |
| 2 | **Implementar paginación** | Performance con muchos pacientes |
| 3 | **Búsqueda de pacientes** | Usabilidad crítica para clínicas con 50+ pacientes |
| 4 | **Dashboard de evolución del paciente** | Visualizar progreso clínico |
| 5 | **Roles recepcionista** | Separar acceso administrativo vs clínico |
| 6 | **Sistema de agenda** | Gestión de citas es fundamental para clínicas |
| 7 | **Comparación entre sesiones** | Valor clínico alto |
| 8 | **Formulario de sesión rápida** | Reducir tiempo de documentación |
| 9 | **Offline support** | Clínicas con mala conexión |
| 10 | **Audit log** | Trazabilidad de cambios para datos médicos |

### MEJORAS FUTURAS

| # | Ítem | Beneficio |
|---|------|-----------|
| 1 | Portal de paciente | Paciente ve sus rutinas, evolución, citas |
| 2 | Reportes y analytics | KPIs de la clínica, productividad |
| 3 | Integración calendario (Google/Apple) | Sincronización de agenda |
| 4 | Notificaciones push | Recordatorios de citas y rutinas |
| 5 | Firma digital | Consentimiento y documentos firmados |
| 6 | Exportación a PDF profesional | Informes para derivación |
| 7 | Multi-idioma | Expansión a otros mercados |
| 8 | Sistema de facturación/cobros | Integración con FONASA/Isapres (Chile) |
| 9 | IA para sugerencias de ejercicios | Basado en diagnóstico y evolución |
| 10 | Integración con dispositivos IoT | Sensores de movimiento, electromiografía |

---

## 9. REDISEÑO ARQUITECTÓNICO RECOMENDADO

### 9.1 Arquitectura Ideal

```
┌──────────────────────────────────────────────────┐
│                   PRESENTACIÓN                    │
│                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Pages   │ │Components│ │  Modals  │          │
│  │(standalone)│(standalone)│(standalone)│          │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘          │
│        └────────────┼────────────┘                │
│                     │                              │
├─────────────────────┼──────────────────────────────┤
│              ESTADO / FACADES                      │
│                     │                              │
│  ┌──────────────────┼──────────────────┐          │
│  │      Feature Facade Services        │          │
│  │  (PacienteFacade, ClinicFacade,     │          │
│  │   EvolucionFacade, RutinaFacade)    │          │
│  └──────────────────┼──────────────────┘          │
│                     │                              │
├─────────────────────┼──────────────────────────────┤
│              LÓGICA DE NEGOCIO                     │
│                     │                              │
│  ┌─────────┐ ┌──────┼──────┐ ┌──────────┐        │
│  │Validators│ │  Domain    │ │ Workflow  │        │
│  │         │ │  Services  │ │ Services  │        │
│  │         │ │            │ │(FlujoClinico)│      │
│  └─────────┘ └──────┼──────┘ └──────────┘        │
│                     │                              │
├─────────────────────┼──────────────────────────────┤
│              INFRAESTRUCTURA                       │
│                     │                              │
│  ┌──────────────────┼──────────────────┐          │
│  │    BaseClinicService (abstract)      │          │
│  │    ClinicContextService             │          │
│  │    FirestoreRepository<T>           │          │
│  └──────────────────┼──────────────────┘          │
│                     │                              │
│  ┌──────────────────┼──────────────────┐          │
│  │    Firebase Auth  │  Firestore       │          │
│  └──────────────────┼──────────────────┘          │
└─────────────────────┴──────────────────────────────┘
```

### 9.2 Estructura de Módulos Angular

```
src/app/
├── core/                              ← Singleton services, guards, interceptors
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts
│   │   └── role.guard.ts             ← NUEVO: guard por rol
│   ├── tenancy/
│   │   ├── clinic-context.service.ts
│   │   └── clinic.resolver.ts        ← NUEVO: resolver para cargar contexto
│   ├── services/
│   │   ├── base-clinic.service.ts
│   │   └── error-handler.service.ts  ← NUEVO
│   └── models/                        ← TODOS los modelos/interfaces aquí
│       ├── patient.model.ts
│       ├── treatment.model.ts
│       ├── clinical-note.model.ts
│       ├── routine.model.ts
│       ├── exercise.model.ts
│       └── user.model.ts
│
├── features/                          ← Feature-based organization
│   ├── auth/
│   │   └── login/
│   │       ├── login.page.ts
│   │       └── login.page.html
│   │
│   ├── dashboard/
│   │   ├── dashboard.page.ts
│   │   ├── dashboard.page.html
│   │   └── dashboard.facade.ts       ← Facade para el dashboard
│   │
│   ├── patients/
│   │   ├── pages/
│   │   │   ├── patient-list/
│   │   │   ├── patient-detail/
│   │   │   └── patient-form/
│   │   ├── components/
│   │   │   ├── patient-card/
│   │   │   └── patient-search/       ← NUEVO
│   │   └── services/
│   │       └── patients.service.ts
│   │
│   ├── clinical-flow/                 ← TODO el flujo clínico junto
│   │   ├── pages/
│   │   │   ├── initial-evaluation/
│   │   │   ├── progress-session/
│   │   │   └── discharge/
│   │   ├── components/
│   │   │   ├── soap-form/
│   │   │   ├── eva-scale/
│   │   │   ├── rom-assessment/
│   │   │   ├── sleep-quality/
│   │   │   └── clinical-test/
│   │   └── services/
│   │       ├── clinical-flow.service.ts
│   │       ├── treatments.service.ts
│   │       └── clinical-notes.service.ts
│   │
│   ├── routines/
│   │   ├── pages/
│   │   │   ├── routine-editor/
│   │   │   ├── routine-templates/
│   │   │   ├── assign-routine/
│   │   │   └── public-routine/
│   │   ├── components/
│   │   │   ├── routine-builder/
│   │   │   ├── exercise-picker/
│   │   │   └── active-routine/
│   │   └── services/
│   │       ├── routines.service.ts
│   │       └── routine-sessions.service.ts
│   │
│   ├── exercises/
│   │   └── services/
│   │       └── exercises.service.ts
│   │
│   └── settings/
│       ├── pages/
│       │   ├── profile/
│       │   └── test-config/
│       └── services/
│           └── test-templates.service.ts
│
└── shared/                            ← Componentes reutilizables
    ├── components/
    │   ├── loading-spinner/
    │   ├── empty-state/
    │   └── confirm-dialog/
    ├── pipes/
    │   ├── fecha.pipe.ts              ← Reemplaza formatearFecha()
    │   └── rut.pipe.ts
    └── utils/
        ├── date.utils.ts
        └── firestore.utils.ts
```

### 9.3 Estructura de Servicios

```typescript
// === NUEVO: Repository genérico ===
abstract class FirestoreRepository<T> extends BaseClinicService {
  abstract readonly collectionPath: string;

  protected getRef() {
    return collection(this.firestore,
      `clinics/${this.clinicId}/${this.collectionPath}`);
  }

  async create(data: Omit<T, 'id'>): Promise<T> { ... }
  async update(id: string, changes: Partial<T>): Promise<void> { ... }
  async getById(id: string): Promise<T | null> { ... }
  async list(options?: ListOptions): Promise<PaginatedResult<T>> { ... }
  async softDelete(id: string): Promise<void> { ... }
}

// === Implementación concreta ===
class PatientsService extends FirestoreRepository<Patient> {
  readonly collectionPath = 'patients';

  async searchByName(term: string): Promise<Patient[]> { ... }
  async validateRut(rut: string, excludeId?: string): Promise<void> { ... }
}
```

### 9.4 Estrategia de Seguridad

```javascript
// PRINCIPIO: Todo bajo clinics/{clinicId}/ — verificación por path
// PRINCIPIO: Validar campos inmutables en writes
// PRINCIPIO: Roles granulares

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function userDoc() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
    function userClinic() { return userDoc().clinicId; }
    function userRole() { return userDoc().role; }

    // Helper: pertenece a esta clínica
    function belongsToClinic(clinicId) {
      return isSignedIn() && userClinic() == clinicId;
    }

    // Helper: roles
    function isClinicAdmin(clinicId) {
      return belongsToClinic(clinicId) && userRole() in ['admin', 'owner'];
    }

    function isProfessional(clinicId) {
      return belongsToClinic(clinicId) && userRole() in ['admin', 'owner', 'professional'];
    }

    function isReceptionist(clinicId) {
      return belongsToClinic(clinicId) && userRole() in ['admin', 'owner', 'receptionist'];
    }

    // USERS — campos inmutables protegidos
    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || userRole() == 'superadmin');
      allow update: if request.auth.uid == userId &&
                       !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'clinicId']);
    }

    // CLÍNICA Y TODO SU CONTENIDO
    match /clinics/{clinicId} {
      allow read: if belongsToClinic(clinicId);

      // Pacientes: profesionales y recepcionistas pueden leer, solo profesionales escriben clínica
      match /patients/{patientId} {
        allow read: if belongsToClinic(clinicId);
        allow create: if isProfessional(clinicId) || isReceptionist(clinicId);
        allow update: if isProfessional(clinicId);
        allow delete: if isClinicAdmin(clinicId);
      }

      // Notas clínicas: solo profesionales
      match /clinical_notes/{noteId} {
        allow read: if isProfessional(clinicId);
        allow create: if isProfessional(clinicId);
        allow update: if isProfessional(clinicId) &&
                         resource.data.professionalId == request.auth.uid;
        allow delete: if isClinicAdmin(clinicId);
      }

      // Rutinas de paciente con acceso público
      match /patient_routines/{routineId} {
        allow read: if belongsToClinic(clinicId) ||
                       resource.data.publicEnabled == true;
        allow write: if isProfessional(clinicId);
      }

      // Sesiones de rutina — acceso público para pacientes ejecutando rutina
      match /routine_sessions/{sessionId} {
        allow read: if belongsToClinic(clinicId);
        allow create: if belongsToClinic(clinicId) ||
                         request.resource.data.publicToken != null;
        allow update, delete: if isProfessional(clinicId);
      }
    }
  }
}
```

---

## 10. ROADMAP TÉCNICO

### Fase 1 — Seguridad y Estabilización (1-2 semanas)
**Objetivo:** Hacer el sistema seguro para uso clínico real

- [ ] Arreglar security rules críticas (`rutina_sesiones`, `rutina_logs`, `users`)
- [ ] Arreglar `DocumentosService` (validar clinicId)
- [ ] Eliminar `BackupService` legacy
- [ ] Eliminar `console.log` de servicios y páginas
- [ ] Implementar error handler global
- [ ] Proteger campos inmutables en security rules de `users`
- [ ] Agregar validación a `testTemplates` read (filtrar por clinicId)

### Fase 2 — Base Clínica Completa (3-4 semanas)
**Objetivo:** Completar el flujo clínico mínimo viable

- [ ] Implementar anamnesis/antecedentes del paciente
- [ ] Implementar consentimiento informado digital
- [ ] Crear vista de historial clínico longitudinal
- [ ] Implementar comparación entre sesiones (ROM, EVA)
- [ ] Implementar búsqueda de pacientes por nombre
- [ ] Agregar paginación a lista de pacientes
- [ ] Crear formulario de sesión rápida (SOAP simplificado)
- [ ] Usar transacción en `crearEvaluacionInicial`

### Fase 3 — Evolución y Seguimiento (2-3 semanas)
**Objetivo:** Dar herramientas de seguimiento clínico

- [ ] Gráficos de evolución del dolor (EVA) en detalle del paciente
- [ ] Gráficos de evolución del ROM
- [ ] Dashboard de paciente con resumen de estado
- [ ] Porcentaje de logro de objetivos
- [ ] Escalas funcionales estándar (Barthel, DASH, etc.)
- [ ] Mejorar cálculo de adherencia
- [ ] Exportación a PDF de ficha clínica

### Fase 4 — Migración de Modelo de Datos (2-3 semanas)
**Objetivo:** Mover a subcollections para escalar

- [ ] Crear script de migración de datos
- [ ] Migrar `pacientes` → `clinics/{id}/patients`
- [ ] Migrar `tratamientos` → `clinics/{id}/treatments`
- [ ] Migrar `evoluciones` → `clinics/{id}/clinical_notes`
- [ ] Migrar `testTemplates` → `clinics/{id}/test_templates`
- [ ] Migrar `documentos` → `clinics/{id}/documents`
- [ ] Actualizar security rules
- [ ] Actualizar todos los servicios
- [ ] Validar con pruebas

### Fase 5 — Multi-Clínica Real (2-3 semanas)
**Objetivo:** Soportar múltiples clínicas con roles

- [ ] Implementar sistema de roles (admin, professional, receptionist)
- [ ] Crear RoleGuard para rutas
- [ ] Implementar panel de administración de clínica
- [ ] CRUD de miembros del equipo
- [ ] Implementar onboarding de nueva clínica
- [ ] Configuración por clínica (logo, nombre, horarios)
- [ ] Dashboard administrativo (stats por profesional)

### Fase 6 — SaaS Completo (4-6 semanas)
**Objetivo:** Plataforma lista para comercializar

- [ ] Sistema de planes/suscripciones
- [ ] Landing page y registro de clínicas
- [ ] Portal de paciente (ver rutinas, citas, evolución)
- [ ] Sistema de agenda/calendario
- [ ] Notificaciones push
- [ ] Integración WhatsApp (ya existe servicio)
- [ ] Offline support
- [ ] Analytics y reportes
- [ ] Audit log para trazabilidad
- [ ] Términos de servicio y política de privacidad

---

## 11. QUICK WINS

Mejoras que se pueden implementar en **1-2 días cada una** con alto impacto:

| # | Quick Win | Esfuerzo | Impacto |
|---|-----------|----------|---------|
| 1 | **Arreglar `allow create: if true`** en security rules | 10 min | CRÍTICO |
| 2 | **Arreglar self-update de `users`** para proteger role/clinicId | 10 min | CRÍTICO |
| 3 | **Eliminar `BackupService`** y limpiar referencias | 30 min | Alto |
| 4 | **Crear pipe `FechaPipe`** para reemplazar `formatearFecha()` duplicado | 1 hora | Medio |
| 5 | **Unificar `removeUndefinedFields`** — usar solo `BaseClinicService.sanitize()` | 30 min | Medio |
| 6 | **Agregar `ion-searchbar`** en lista de pacientes (filtro client-side) | 2 horas | Alto |
| 7 | **Usar transacción en `crearEvaluacionInicial`** | 1 hora | Alto |
| 8 | **Mover gráfico de EVA al detalle del paciente** (no solo en alta) | 2 horas | Alto |
| 9 | **Agregar confirmación antes de cerrar formulario con datos** (canDeactivate guard) | 2 horas | Medio |
| 10 | **Agregar `environment.production` check para console.log** | 30 min | Medio |
| 11 | **Implementar caché en `DashboardPage`** ya existe parcialmente, mejorar con TTL | 1 hora | Medio |
| 12 | **Arreglar `irACrearRutina`** en evolucion.page.ts — pasa `clinicId: ''`** | 5 min | Alto |
| 13 | **Agregar `documentos` a security rules** | 15 min | CRÍTICO |
| 14 | **Cambiar `navigateRoot` a `navigateForward`** donde corresponda | 1 hora | Medio |

---

## RESUMEN EJECUTIVO

**KineSphere tiene una base sólida.** La arquitectura de servicios con `BaseClinicService`, el flujo clínico con `FlujoClinicoService`, las transacciones en operaciones críticas, y el modelo SOAP son decisiones buenas que demuestran pensamiento arquitectónico.

**Sin embargo, hay 3 problemas que deben resolverse ANTES de uso clínico real:**

1. **Vulnerabilidades de seguridad** — `allow create: if true` en sesiones/logs, escalación de privilegios en `users`, y `DocumentosService` sin validación
2. **Inconsistencia en modelo de datos** — la mezcla de root collections y subcollections complica seguridad, aumenta costos, y dificulta escalabilidad
3. **Funcionalidades clínicas faltantes** — anamnesis, consentimiento informado, e historial longitudinal son requisitos legales y clínicos fundamentales

**La recomendación principal es:** ejecutar las Fases 1 y 2 del roadmap antes de cualquier despliegue clínico. Los Quick Wins #1, #2, #12, y #13 son fixes que se pueden hacer hoy mismo y eliminan las vulnerabilidades más graves.
