#!/usr/bin/env node

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrarRutinasEstado() {
  const snapshot = await db.collection('rutinas').get();

  if (snapshot.empty) {
    console.log('No hay rutinas para migrar.');
    return;
  }

  let actualizadas = 0;
  const batch = db.batch();

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();

    if (data.estado) {
      return;
    }

    const estado = data.completada === true ? 'completed' : 'active';

    batch.update(docSnap.ref, {
      estado,
      completada: admin.firestore.FieldValue.delete()
    });

    actualizadas += 1;
  });

  if (actualizadas === 0) {
    console.log('No se encontraron documentos legacy con completada.');
    return;
  }

  await batch.commit();
  console.log(`Migración completada. Rutinas actualizadas: ${actualizadas}`);
}

migrarRutinasEstado().catch((error) => {
  console.error('Error en migración de rutinas:', error);
  process.exit(1);
});
