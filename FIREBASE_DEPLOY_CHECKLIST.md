# KineSphere · checklist para desplegar en Firebase

## Estado actual del proyecto

- ✅ La app ya inicializa Firebase (`Auth` + `Firestore`) en `src/main.ts`.
- ✅ El proyecto y credenciales web ya están configurados en `src/environments/environment*.ts`.
- ⚠️ Faltaban archivos base de Firebase CLI para despliegue (`firebase.json`, `.firebaserc`, reglas e índices).
- ⚠️ El `npm install` falla por conflicto de versiones de Capacitor y por restricción de acceso al registry para `@capacitor/filesystem`.

## Qué falta para subirla completa

1. Instalar Firebase CLI en tu máquina local:
   - `npm i -g firebase-tools`
2. Login y selección de proyecto:
   - `firebase login`
   - `firebase use kinesphere-6834d`
3. Instalar dependencias del frontend:
   - `npm install`
4. Compilar aplicación web:
   - `npm run build`
5. Desplegar Hosting + Firestore + Storage:
   - `firebase deploy`

## Correcciones aplicadas en esta rama

- Se añadieron archivos de despliegue Firebase:
  - `firebase.json`
  - `.firebaserc`
  - `firestore.rules`
  - `firestore.indexes.json`
  - `storage.rules`
- Se ajustaron versiones para evitar conflicto de peer deps en Capacitor:
  - `@capacitor/filesystem` `^8.1.0` -> `^7.1.0`
  - `@capacitor/share` `^8.0.0` -> `^7.0.3`

## Errores/revisiones recomendadas antes de producción

1. **Reglas de Firestore muy amplias en lógica de app**
   - La app usa varias colecciones (`pacientes`, `sesiones`, `documentos`, `rutinas`, etc.) con lecturas/escrituras autenticadas generales.
   - Antes de producción conviene restringir por `profesionalId`/rol para evitar acceso cruzado.

2. **Inconsistencia de campos en sesiones**
   - Hay consultas usando `paciente_id` y otras usando `pacienteId`.
   - Unifica naming para no romper filtros, índices ni reportes.

3. **Dependencia residual de JSON Server**
   - Existe servicio paralelo contra `http://localhost:3000`.
   - Si migras totalmente a Firebase, elimina/aisla este modo para no mezclar fuentes.

4. **Credenciales en environments**
   - Para apps cliente es normal exponer config web de Firebase, pero separa proyecto `dev/staging/prod` y revisa App Check para endurecer seguridad.

## Comandos útiles

```bash
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```


## Migración de tests clínicos (GROC, KOOS, etc.)

- La configuración de tests ya se guarda en Firestore en la colección `test_templates` con respaldo en `localStorage` para tolerar fallos de red.
- Páginas conectadas al repositorio de Firestore: configuración de tests, sesión clínica y evaluación final.
- Recomendado siguiente paso: migrar también resultados históricos de tests por sesión a una colección dedicada para análisis longitudinal.
