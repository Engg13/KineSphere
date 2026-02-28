# Análisis técnico KineSphere (MVP en producción)

Fecha: 2026-02-23

## Hallazgos priorizados

### Alta
1. **Firestore Rules demasiado permisivas en colecciones clínicas**
   - `pacientes`, `sesiones`, `rutinas`, `documentos` y `test_templates` permiten lectura/escritura a cualquier usuario autenticado.
   - Riesgo: acceso cruzado entre profesionales, modificación/borrado de datos ajenos y dependencia total del frontend para aislamiento.

2. **Filtrado de seguridad en frontend (sobrelectura + fuga de datos en tránsito)**
   - En rutinas/ejercicios se hace `collectionData` de la colección completa y luego `filter` en cliente por `professionalId`.
   - Riesgo: descarga de documentos de otros profesionales (aunque no se muestren), alto costo y mayor latencia.

3. **Control de rol no reforzado en guard/ruteo**
   - Existe guard de autenticación, pero no guard de autorización por rol ni por ownership.
   - Riesgo: navegación a pantallas administrativas si el usuario conoce rutas.

### Media
4. **Inconsistencia de parámetros de navegación (`id` vs `pacienteId`)**
   - Lista de pacientes navega con `id`, detalle espera `pacienteId`.
   - Riesgo: errores intermitentes al abrir fichas o comportamiento no determinista.

5. **Autosave agresivo por campo en rutinas**
   - Cambios de repeticiones/peso/checkbox disparan `updateDoc` inmediato por interacción.
   - Riesgo: muchas escrituras, condiciones de carrera, estado parcial en conexiones inestables.

6. **Suscripciones sin gestión homogénea**
   - Hay páginas con gestión correcta y otras con `subscribe` sin `unsubscribe` explícito (ej. carga de rutinas en sesión).
   - Riesgo: memory leaks y listeners duplicados al reingresar a vistas.

7. **Modelo de identidad/tenant incompleto para SaaS multi-clínica**
   - Se usa `professionalId` en documentos, pero no aparece un `clinicId/tenantId` transversal.
   - Riesgo: migración costosa al escalar a múltiples clínicas/equipos.

### Baja
8. **Uso extenso de `any` y contratos débiles**
   - Dificulta validación de esquema y detección temprana de errores.

9. **Mezcla de responsabilidades UI + dominio en páginas grandes**
   - Especialmente en `ejercicios.page.ts`.
   - Riesgo: mantenimiento difícil, onboarding lento y regresiones.

---

## Qué corregir primero (orden recomendado)

1. **Blindaje de Firestore Rules**
   - Aplicar `resource.data.professionalId == request.auth.uid` para profesional.
   - Permitir bypass solo para admin con función `isAdmin()`.
   - En `create`, validar `request.resource.data.professionalId == request.auth.uid` (o lógica admin explícita).

2. **Eliminar sobrelectura en queries**
   - Reemplazar lecturas globales + filtro cliente por queries con `where('professionalId','==',uid)`.
   - Mantener reglas como última línea de defensa.

3. **Agregar Authorization Guard por rol**
   - Guard específico para rutas admin y validación de acceso por recurso.

4. **Normalizar navegación e IDs**
   - Unificar `pacienteId` en toda la app.

5. **Introducir autosave robusto**
   - Debounce (300–800 ms), cola local y confirmación visual de estado (guardando/guardado/error).

---

## Recomendaciones estratégicas (3–6 meses)

### Arquitectura
- Extraer lógica de páginas a **facades/services de caso de uso**:
  - `PacientesFacade`, `RutinasFacade`, `SesionesFacade`.
- Adoptar tipado estricto para entidades críticas y DTOs.
- Separar capa de acceso Firestore de la capa de negocio.

### Seguridad + SaaS
- Incorporar `clinicId` (tenant) en todas las entidades.
- Evolucionar reglas a patrón multi-tenant:
  - admin global
  - admin clínica
  - profesional clínica
- Evaluar Cloud Functions para operaciones críticas (clonado, cierres, agregados).

### Datos y rendimiento
- Modelo sugerido:
  - `clinics/{clinicId}/professionals/{uid}`
  - `clinics/{clinicId}/pacientes/{pacienteId}`
  - `clinics/{clinicId}/rutinas/{rutinaId}`
  - `clinics/{clinicId}/sesiones/{sesionId}`
- Evitar arrays grandes mutables (`ejercicios` dentro de rutina) cuando crezca volumen; usar subcolecciones para granularidad y concurrencia.
- Añadir campos operativos:
  - `updatedAt`, `updatedBy`, `status`, `version`, `archivedAt`.

### UX/estado
- Formalizar estados de rutina: `draft`, `active`, `completed`, `archived`, `cancelled`.
- Para autosave, mostrar:
  - indicador persistente de sincronización
  - recuperación de cambios pendientes
  - rollback ante error.

### Calidad
- Estandarizar patrón de desuscripción (`takeUntilDestroyed` en Angular 16+).
- Añadir tests focalizados:
  - navegación y params
  - permisos por rol
  - reglas Firestore (emulator tests)
  - autosave con fallos de red.
