# KineSphere - Full Technical Audit Report

**Date:** 2026-03-09
**Stack:** Angular 18 + Ionic 8 + Firebase/Firestore + Capacitor 7
**Architecture:** Standalone components, multi-tenant (clinicId-based)

---

## SECTION 1 - Critical Errors

### 1.1 CRITICAL: Debugging code left in production
**File:** `src/app/pages/evolucion/evolucion.page.ts:179-181`

**Problem:** A `setTimeout` on line 179 sets `document.body.style.background = 'red'` 500ms after the page loads. This is leftover debugging code that will visibly break the UI in production.

**Why it's problematic:** Every user visiting the evolucion page will see the entire page background turn red.

**Minimal safe fix:**
```typescript
// DELETE these 3 lines entirely (179-181):
// setTimeout(() => {
//   document.body.style.background = 'red';
// }, 500);
```

---

### 1.2 CRITICAL: Broken HTML template tag
**File:** `src/app/pages/evaluacion-final/evaluacion-final.page.html:53`

**Problem:** Line 53 has `< *ngIf="pacienteSeleccionado && !cargando">` - an incomplete/malformed HTML tag. The `<` has no element name.

**Why it's problematic:** The Angular template compiler may fail or silently ignore the entire conditional block. All content inside (patient info, charts, stats, PDF generation) would be hidden.

**Minimal safe fix:**
```html
<!-- Change line 53 from: -->
< *ngIf="pacienteSeleccionado && !cargando">
<!-- To: -->
<div *ngIf="pacienteSeleccionado && !cargando">
```
Also add the matching `</div>` before `</div>` at line 308.

---

### 1.3 CRITICAL: Uninitialized service injection - rutinasPacienteService
**File:** `src/app/pages/evolucion/evolucion.page.ts:53`

**Problem:** `rutinasPacienteService` is declared as `private rutinasPacienteService: RutinasPacienteService;` but is **never injected** via `inject()` or constructor. It will be `undefined` at runtime.

**Why it's problematic:** Calling `cargarRutinasDisponibles()` (line 340) or `irACrearRutina()` (line 707) will throw `TypeError: Cannot read properties of undefined`.

**Minimal safe fix:**
```typescript
// Change line 53 from:
private rutinasPacienteService: RutinasPacienteService;
// To:
private rutinasPacienteService = inject(RutinasPacienteService);
```

---

### 1.4 CRITICAL: Routing error - loadChildren used with standalone component
**File:** `src/app/app-routing.module.ts:54`

**Problem:** The `documentos-medicos` route uses `loadChildren` pointing to a standalone component (`DocumentosMedicosPage`), not a module. Standalone components must use `loadComponent`.

**Why it's problematic:** Angular will fail to load this route since `DocumentosMedicosPage` is not a module and has no `RouterModule.forChild()` configuration.

**Minimal safe fix:**
```typescript
// Change line 53-56 from:
{
  path: 'documentos-medicos',
  loadChildren: () => import('./pages/documentos-medicos/documentos-medicos.page').then( m => m.DocumentosMedicosPage),
  canActivate: [AuthGuard]
},
// To:
{
  path: 'documentos-medicos',
  loadComponent: () => import('./pages/documentos-medicos/documentos-medicos.page').then(m => m.DocumentosMedicosPage),
  canActivate: [AuthGuard]
},
```

---

### 1.5 CRITICAL: Firestore field name mismatch in documentos
**Files:** `src/app/services/documentos.service.ts:31` and `src/app/pages/documentos-medicos/documentos-medicos.page.ts:115`

**Problem:** The service queries documents with `where('patientId', '==', pacienteId)` (line 31), but the page saves documents with field `pacienteId` (line 115). These field names don't match, so saved documents will never be retrieved.

**Why it's problematic:** Documents are written but can never be read back - silent data loss from the user's perspective.

**Minimal safe fix (align to service convention):**
```typescript
// In documentos-medicos.page.ts, change line 115 from:
pacienteId: this.pacienteId,
// To:
patientId: this.pacienteId,
```

---

## SECTION 2 - High Risk Issues

### 2.1 HIGH: TestTemplatesFirestoreService reads globally without clinicId filter
**File:** `src/app/services/test-templates-firestore.service.ts:23-38`

**Problem:** `getTests()` queries the root-level `testTemplates` collection with no `clinicId` filter. All clinics share the same unscoped collection.

**Why it's problematic:** Multi-tenant data isolation violation. Clinic A can see test templates created by Clinic B. The `seedTestsIfEmpty()` method also reads globally, meaning if any clinic has seeded, no other clinic will get seeded.

**Minimal safe fix:**
```typescript
// Option 1: Add clinicId filter to getTests()
async getTests(): Promise<TestTemplate[]> {
  const ref = collection(this.firestore, COLLECTION_NAME);
  const q = query(
    ref,
    where('clinicId', '==', this.clinicId),
    orderBy('fechaCreacion', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    ...(d.data() as Omit<TestTemplate, 'id'>),
    source: 'firebase' as const
  }));
}
```

---

### 2.2 HIGH: Evoluciones and Tratamientos stored in root-level collections without path scoping
**Files:** `src/app/services/evoluciones.service.ts:466-468`, `src/app/services/tratamientos.service.ts:212-214`

**Problem:** Both services store data in root-level Firestore collections (`evoluciones`, `tratamientos`) instead of clinic-scoped subcollections (`clinics/{clinicId}/evoluciones`). They rely solely on query-level `clinicId` filtering.

**Why it's problematic:** Without Firestore Security Rules enforcing clinic isolation at the path level, any authenticated user could theoretically read/write documents from other clinics using the Firebase SDK directly. Query-level filtering is client-side only and not a security boundary.

**Recommendation:** Verify that Firestore Security Rules enforce `clinicId` matching on these collections. This is a rules-level fix, not a code change.

---

### 2.3 HIGH: DocumentosService.deleteDocumento has no clinic ownership check
**File:** `src/app/services/documentos.service.ts:42-46`

**Problem:** `deleteDocumento(id)` deletes any document by ID without verifying that the document belongs to the current clinic.

**Why it's problematic:** Cross-tenant document deletion is possible if a user knows another clinic's document ID.

**Minimal safe fix:**
```typescript
async deleteDocumento(id: string) {
  const docRef = doc(this.firestore, `documentos/${id}`);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Documento no encontrado');
  const data = snap.data();
  if (data?.['clinicId'] !== this.clinicContext.clinicId) {
    throw new Error('No autorizado');
  }
  return deleteDoc(docRef);
}
```

---

### 2.4 HIGH: Race condition in PacientesService.create() - RUT uniqueness
**File:** `src/app/services/pacientes.service.ts:60-75`

**Problem:** `ensureRutIsUnique()` is called before `addDoc()` with no transaction. Another user could insert the same RUT between the check and the insert.

**Why it's problematic:** Duplicate RUT patients could be created in concurrent scenarios.

**Recommendation:** Use a Firestore transaction or a unique document ID based on RUT to enforce uniqueness atomically. Low risk in single-professional clinics but a structural issue.

---

### 2.5 HIGH: FlujoClinicoService.asignarTemplateAPaciente reads outside transaction
**File:** `src/app/services/rutinas-paciente.service.ts:70-76`

**Problem:** Active rutinas are fetched via `getDocs()` outside the transaction (line 76), then the transaction updates them (line 82). If another operation modifies these rutinas between the fetch and the transaction commit, the transaction operates on stale data.

**Why it's problematic:** Could result in multiple active rutinas for the same patient, violating business logic.

**Minimal safe fix:** Move the query inside the transaction using `transaction.get()`.

---

### 2.6 HIGH: Missing AuthGuard on rutina-paciente-editor route
**File:** `src/app/app-routing.module.ts:63-68`

**Problem:** The `rutina-paciente-editor/:id` route has no `canActivate: [AuthGuard]`.

**Why it's problematic:** Unauthenticated users could navigate to this page. The page would crash (clinic context not initialized) but the route itself is unprotected.

**Minimal safe fix:**
```typescript
{
  path: 'rutina-paciente-editor/:id',
  loadComponent: () =>
    import('./pages/rutina-paciente-editor/rutina-paciente-editor.page')
      .then(m => m.RutinaPacienteEditorPage),
  canActivate: [AuthGuard]  // ADD THIS
},
```

---

### 2.7 HIGH: TratamientoDocument interface missing nextSessionNumber field
**Files:** `src/app/services/tratamientos.service.ts:18-30` (interface), `src/app/services/flujoclinico.service.ts:99,121` (usage)

**Problem:** `FlujoClinicoService.crearSesionProgreso()` reads and writes `nextSessionNumber` on tratamiento documents, but this field is not defined in the `TratamientoDocument` interface. It's accessed via bracket notation `tratamientoData['nextSessionNumber']` to bypass type checking.

**Minimal safe fix:**
```typescript
// Add to TratamientoDocument interface:
export interface TratamientoDocument {
  // ... existing fields
  nextSessionNumber?: number;  // ADD THIS
}
```

---

## SECTION 3 - Architecture Problems

### 3.1 Duplicate type definitions for EvolucionCreateInput and TipoEvolucion
**Files:** `src/app/models/evolucion.model.ts` and `src/app/services/evoluciones.service.ts`

**Problem:** `TipoEvolucion`, `EvolucionCreateInput`, `ArticulacionRom`, `EvolucionTest`, and `ObjetivoClinico` are all defined in both files with slightly different shapes. The `EvolucionCreateInput` in the service uses complex `Required<Pick<...>> & Omit<Partial<...>>` composition while the model file uses a simple interface.

**Why it's problematic:** Different parts of the app may import from different locations, causing subtle type mismatches. `FlujoClinicoService` imports from `models/evolucion.model.ts` while `EvolucionesService` uses its own internal type.

**Recommendation:** Consolidate all types in `models/evolucion.model.ts` and remove duplicates from the service.

---

### 3.2 Duplicate removeUndefinedFields implementation
**Files:** `src/app/services/evoluciones.service.ts:398-405`, `src/app/services/pacientes.service.ts:199-206`

**Problem:** Identical utility function duplicated across two services.

**Recommendation:** Extract to a shared utility (e.g., `core/utils/firestore.utils.ts`).

---

### 3.3 Mixed module and standalone patterns
**Files:** Various pages

**Problem:** The app mixes NgModule-based pages (`pacientes-lista`, `paciente-detalle`, `evaluacion-final`, `test-pacientes`, `agregar-paciente`, `config-test`, `tests-config`, `perfil-profesional`) with standalone components (`dashboard`, `evolucion`, `documentos-medicos`, `rutina-publica`, `rutina-template-editor`, `rutina-paciente-editor`). The NgModule-based pages already have standalone components inside them.

**Why it's problematic:** Inconsistency increases cognitive load and can cause issues like the `loadChildren`/`loadComponent` mismatch (Section 1.4).

---

### 3.4 BackupService operates on localStorage, not Firestore
**File:** `src/app/services/backup.service.ts`

**Problem:** The entire BackupService reads/writes from `localStorage` using keys like `user_pacientes`, `sesiones_{id}`, `documentos_{id}`. This appears to be legacy code from before the Firestore migration.

**Why it's problematic:** The backup feature exports/imports stale or empty localStorage data while the actual data lives in Firestore. The backup functionality is effectively non-functional.

---

### 3.5 Dual model systems (Paciente vs PacienteDocument)
**Files:** `src/app/models/interfaces.ts` (Paciente), `src/app/services/pacientes.service.ts` (PacienteDocument)

**Problem:** Two different interfaces describe the same entity:
- `Paciente` (interfaces.ts): `id: number | string`, has `direccion`, `es_demo`, `fecha_creacion`, `observaciones`, etc.
- `PacienteDocument` (pacientes.service.ts): `id: string`, uses `isDeleted`, `createdAt: Timestamp`

**Why it's problematic:** Code using `Paciente` interface may not match actual Firestore data shape.

---

### 3.6 DocumentosService does not extend BaseClinicService
**File:** `src/app/services/documentos.service.ts`

**Problem:** Unlike all other services, `DocumentosService` manually injects `Firestore` and `ClinicContextService` instead of extending `BaseClinicService`. It also stores `documentosRef` as an instance field initialized at construction time.

**Why it's problematic:** The collection reference `this.documentosRef` is created before `clinicContext` may be initialized. Inconsistent with the rest of the codebase.

---

## SECTION 4 - Firestore Issues

### 4.1 Evoluciones collection not scoped by clinic path
**File:** `src/app/services/evoluciones.service.ts:466-468`

The `evoluciones` collection is at the Firestore root level. Queries include `clinicId` filtering, but path-level security is missing. Same applies to `tratamientos` and `testTemplates`.

**Collections at root level (need Security Rules verification):**
- `evoluciones` - filtered by clinicId in queries
- `tratamientos` - filtered by clinicId in queries
- `testTemplates` - **NOT filtered by clinicId** (see 2.1)
- `documentos` - filtered by clinicId in queries
- `pacientes` - filtered by clinicId in queries

**Collections properly scoped under clinic path:**
- `clinics/{clinicId}/ejercicios`
- `clinics/{clinicId}/rutinas_paciente`
- `clinics/{clinicId}/rutinas_templates`
- `ejercicios_globales` (intentionally global)

---

### 4.2 Missing Firestore composite indexes
**File:** `src/app/services/evoluciones.service.ts`

The following queries likely need composite indexes:
1. `evoluciones`: `clinicId + patientId + activo + createdAt` (line 295-301)
2. `evoluciones`: `clinicId + patientId + tipoEvolucion + activo + createdAt` (line 320-328)
3. `evoluciones`: `clinicId + patientId + tipoEvolucion + activo + sessionNumber` (line 350-358)
4. `evoluciones`: `clinicId + activo + createdAt` (line 414-420)
5. `tratamientos`: `clinicId + patientId + estado + createdAt` (line 127-134)
6. `tratamientos`: `clinicId + professionalId + estado` (line 170-175)
7. `pacientes`: `clinicId + isDeleted + createdAt` (line 137-142)

If these indexes don't exist in `firestore.indexes.json`, queries will fail at runtime.

---

### 4.3 Console logging of sensitive clinic data
**File:** `src/app/services/tratamientos.service.ts:167-168,179`

```typescript
console.log("clinicId", this.clinicId);
console.log("professionalId", this.professionalId);
console.log("TRATAMIENTOS SNAPSHOT", snapshot.size);
```

**Also in:** `src/app/core/tenancy/clinic-context.service.ts:35-36`

**Recommendation:** Remove or guard behind `isDevMode()`.

---

## SECTION 5 - Performance Issues

### 5.1 Template method calls in evaluacion-final SVG charts
**File:** `src/app/pages/evaluacion-final/evaluacion-final.page.html:175-183`

**Problem:** `getEvaPolyline()`, `getEvaCircles()`, `getSuenoPolyline()`, `getSuenoCircles()` are called in the template. These methods are invoked on every change detection cycle, recalculating SVG data repeatedly.

**Recommendation:** Pre-compute these values into component properties and update them when `sesiones` changes.

---

### 5.2 Storing base64 images directly in Firestore documents
**File:** `src/app/pages/documentos-medicos/documentos-medicos.page.ts:111`

**Problem:** Photo data URLs (base64-encoded images) are stored directly as Firestore document fields. A single high-quality photo could be 1-5MB of base64 data.

**Why it's problematic:** Firestore documents have a 1MB size limit. Large images will fail to save. Even smaller images bloat document reads and Firestore costs.

**Recommendation:** Upload images to Firebase Storage and store the download URL in Firestore.

---

### 5.3 EjerciciosFirestoreService.getEjercicios uses combineLatest with two real-time listeners
**File:** `src/app/services/ejercicios-firestore.service.ts:35`

**Problem:** `combineLatest([global$, clinic$])` keeps two active Firestore listeners open simultaneously.

**Recommendation:** If global exercises change rarely, fetch them once and only keep clinic exercises as real-time.

---

## SECTION 6 - Code Smells

### 6.1 Memory leaks - subscriptions without unsubscribe

| File | Line | Observable | Fix |
|------|------|-----------|-----|
| `pages/documentos-medicos/documentos-medicos.page.ts` | 40 | `route.queryParams.subscribe()` | Add `OnDestroy` + unsubscribe |
| `pages/documentos-medicos/documentos-medicos.page.ts` | 56 | `getDocumentosByPaciente().subscribe()` | Add `OnDestroy` + unsubscribe |
| `pages/rutina-paciente-editor/rutina-paciente-editor.page.ts` | ~40 | `getRutinaById().subscribe()` | Add `OnDestroy` + unsubscribe |
| `pages/rutina-template-editor/rutina-template-editor.page.ts` | ~63 | `getEjercicios().subscribe()` | Add `OnDestroy` + unsubscribe |
| `components/ejercicio-picker/ejercicio-picker.component.ts` | ~42 | `getEjercicios().subscribe()` | Add `OnDestroy` + unsubscribe |
| `pages/evolucion/evolucion.page.ts` | 200 | `tipoEvolucion.valueChanges.subscribe()` | Use `takeUntilDestroyed()` |
| `pages/evolucion/evolucion.page.ts` | 212 | `test.valueChanges.subscribe()` | Use `takeUntilDestroyed()` |

---

### 6.2 Demo/debug flag left in production code
**File:** `src/app/pages/evolucion/evolucion.page.ts:54-55`

```typescript
private usarDatosDemo = true;
// poner en false en produccion
```

This causes the EVA chart to show demo data instead of real data when there are fewer than 3 evoluciones.

---

### 6.3 Duplicate YouTube thumbnail extraction
**Files:** `src/app/services/ejercicios-firestore.service.ts:97-109`, `src/app/core/init/ejercicios-seeder.service.ts` (similar function)

Identical regex-based YouTube thumbnail extraction duplicated.

---

### 6.4 Professional data stored in localStorage
**File:** `src/app/pages/perfil-profesional/perfil-profesional.page.ts`

Professional profile data (nombre, RUT, especialidad) is stored in `localStorage` and read from there by `PdfService`. This data should come from the clinic context or Firestore user document.

---

## SECTION 7 - Type Safety Problems

### 7.1 `any` type usage inventory

| File | Location | Variable/Parameter | Suggested Type |
|------|----------|-------------------|---------------|
| `services/documentos.service.ts` | Line 25 | `Observable<any[]>` | `Observable<Documento[]>` |
| `services/documentos.service.ts` | Line 38 | `documento: any` | `Omit<Documento, 'id'>` |
| `services/ejercicios-firestore.service.ts` | Line 46 | `ejercicio: any` | `Omit<Ejercicio, 'id'>` |
| `services/ejercicios-firestore.service.ts` | Line 63 | `cambios: any` | `Partial<Ejercicio>` |
| `services/ejercicios-firestore.service.ts` | Line 84 | `ejercicios: any[]` | `Omit<Ejercicio, 'id'>[]` |
| `services/tratamientos.service.ts` | Line 183 | `as any` | `as Omit<TratamientoDocument, 'id'>` |
| `services/backup.service.ts` | Lines 19-20 | `any[]` | `Sesion[]` / `Documento[]` |
| `pages/evolucion/evolucion.page.ts` | Line 67 | `rutinasDisponibles: any[]` | `RutinaPaciente[]` |
| `pages/evolucion/evolucion.page.ts` | Line 68 | `rutinaSeleccionada: any` | `RutinaPaciente \| null` |
| `pages/evolucion/evolucion.page.ts` | Line 72 | `pacienteActual: any` | `PacienteDocument \| null` |
| `pages/documentos-medicos/documentos-medicos.page.ts` | Line 19 | `documentos: any[]` | `Documento[]` |

---

### 7.2 Paciente.id typed as `number | string`
**File:** `src/app/models/interfaces.ts:5`

Firestore document IDs are always strings. Having `id: number | string` is misleading and can cause `===` comparison failures.

---

### 7.3 EvolucionCreateInput defined differently in two places
**Files:** `src/app/models/evolucion.model.ts:61-79` and `src/app/services/evoluciones.service.ts:68-80`

The service version uses complex mapped types while the model version is a simple interface. They produce different shapes - the service version makes `sessionNumber` and `treatmentId` optional (via Partial) while the model version omits them entirely.

---

## SECTION 8 - UI Problems

### 8.1 Evaluacion-final template missing closing tag
**File:** `src/app/pages/evaluacion-final/evaluacion-final.page.html:53,308`

The malformed `<` tag on line 53 (see Section 1.2) means the entire patient content section may not render. Even after fixing to `<div>`, verify that the closing `</div>` exists before line 308's `</div>`.

---

### 8.2 DocumentosMedicosPage missing FormsModule
**File:** `src/app/pages/documentos-medicos/documentos-medicos.page.ts:13`

The component only imports `[IonicModule]`. If any template uses `ngModel` or forms directives, it will fail. Current template doesn't use forms but the `eliminarDocumento` handler passes `documento.id` directly rather than using the `doc` loop variable's `id` - should verify template consistency.

---

### 8.3 DocumentosMedicosPage template delete button handler mismatch
**File:** `src/app/pages/documentos-medicos/documentos-medicos.page.html:47`

The delete button calls `eliminarDocumento(doc.id)` but the component method `eliminarDocumento(documento: any)` expects the full document object (it accesses `documento.id` inside). This will pass the ID string where an object is expected.

**Minimal safe fix:**
```html
<!-- Change from: -->
(click)="eliminarDocumento(doc.id)"
<!-- To: -->
(click)="eliminarDocumento(doc)"
```

---

## SECTION 9 - Suggested Improvements (SAFE)

### 9.1 Add DestroyRef-based cleanup pattern
For all components with subscriptions, use Angular's `DestroyRef` + `takeUntilDestroyed()`:

```typescript
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// In component:
private destroyRef = inject(DestroyRef);

// In subscription:
this.someObservable$
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(...);
```

### 9.2 Extract shared Firestore utility
Create `src/app/core/utils/firestore.utils.ts`:
```typescript
export function removeUndefinedFields<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.entries(data).reduce<Partial<T>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key as keyof T] = value as T[keyof T];
    }
    return acc;
  }, {});
}
```

### 9.3 Consolidate model types
Move all model types to `src/app/models/` and remove duplicate definitions from service files. The service should import from models, not define its own.

### 9.4 Add clinicId to DocumentosService.addDocumento
```typescript
async addDocumento(documento: Omit<Documento, 'id'>) {
  return addDoc(this.documentosRef, {
    ...documento,
    clinicId: this.clinicContext.clinicId  // Enforce clinic isolation
  });
}
```

### 9.5 Remove console.log statements from services
Remove or guard behind `isDevMode()` all console.log calls in:
- `tratamientos.service.ts:167-168,179`
- `clinic-context.service.ts:35-36`
- `app-init.service.ts:31,36,44`
- `evolucion.page.ts:218,227,353`

---

## SAFE PATCH PLAN

Priority order for fixes that preserve existing behavior:

### Phase 1 - Critical Runtime Fixes (Do First)
1. **Remove debug background code** (`evolucion.page.ts:179-181`) - Delete 3 lines
2. **Fix rutinasPacienteService injection** (`evolucion.page.ts:53`) - Change to `inject()`
3. **Fix evaluacion-final template** (`evaluacion-final.page.html:53`) - Add `div` element name
4. **Fix documentos-medicos routing** (`app-routing.module.ts:54`) - Change `loadChildren` to `loadComponent`
5. **Fix documentos field name mismatch** (`documentos-medicos.page.ts:115` or `documentos.service.ts:31`) - Align `pacienteId`/`patientId`
6. **Fix documentos-medicos delete handler** (`documentos-medicos.page.html:47`) - Pass full object, not ID

### Phase 2 - Security Fixes
7. **Add AuthGuard to rutina-paciente-editor route** (`app-routing.module.ts:64`)
8. **Add clinicId filter to TestTemplatesFirestoreService.getTests()** (`test-templates-firestore.service.ts:23`)
9. **Add clinic ownership check to DocumentosService.deleteDocumento()** (`documentos.service.ts:42`)
10. **Set `usarDatosDemo = false`** (`evolucion.page.ts:54`)

### Phase 3 - Type Safety
11. **Add `nextSessionNumber` to TratamientoDocument interface** (`tratamientos.service.ts:18`)
12. **Replace `as any` in tratamientos.service.ts** (line 183)
13. **Type DocumentosService methods** (replace `any` with `Documento`)

### Phase 4 - Memory Leak Fixes
14. Add `OnDestroy` + subscription cleanup to:
    - `documentos-medicos.page.ts`
    - `rutina-paciente-editor.page.ts`
    - `rutina-template-editor.page.ts`
    - `ejercicio-picker.component.ts`
15. Add `takeUntilDestroyed()` to `evolucion.page.ts` valueChanges subscriptions

### Phase 5 - Cleanup
16. Remove console.log statements from services
17. Consolidate duplicate type definitions
18. Extract shared `removeUndefinedFields` utility

---

## Repeated Patterns / Reusable Abstractions (NOT TO IMPLEMENT YET)

1. **Subscription cleanup mixin/base class** - Almost every page needs OnDestroy + unsubscribe. Consider a base page class or directive.
2. **Firestore CRUD base service** - `getById`, `getByIdOrThrow`, `removeUndefinedFields`, `getCollection`, `docRef` are repeated across evoluciones, pacientes, and tratamientos services.
3. **YouTube thumbnail utility** - Duplicated regex extraction could be a pure function in utils.
4. **Toast notification service** - `mostrarToast()` pattern is duplicated across multiple pages.
5. **Query params extraction pattern** - Multiple pages extract `patientId`/`pacienteId` from query params with the same fallback logic.
