#!/usr/bin/env node

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const CLINIC_ID = 'clinic_kinesiologia_fundadores';
const CLINIC_NAME = 'Kinesiología Fundadores';
const OWNER_ID = 'HUuD8cljbah6YXwUdEePf1v5mnt2';
const MAX_BATCH_OPS = 500;

async function createClinicIfMissing() {
  const clinicRef = db.collection('clinics').doc(CLINIC_ID);
  const clinicSnap = await clinicRef.get();

  if (!clinicSnap.exists) {
    await clinicRef.set({
      nombre: CLINIC_NAME,
      ownerId: OWNER_ID,
      createdAt: FieldValue.serverTimestamp()
    });
    console.log(`✅ Clínica creada: ${CLINIC_ID}`);
  } else {
    console.log(`ℹ️ Clínica ya existe: ${CLINIC_ID}`);
  }
}

async function patchCollectionClinicId(collectionName) {
  const snapshot = await db.collection(collectionName).get();

  if (snapshot.empty) {
    console.log(`ℹ️ ${collectionName}: sin documentos`);
    return;
  }

  let pending = [];
  let updated = 0;

  const flush = async () => {
    if (pending.length === 0) return;
    const batch = db.batch();
    pending.forEach((docSnap) => {
      batch.update(docSnap.ref, { clinicId: CLINIC_ID });
    });
    await batch.commit();
    updated += pending.length;
    pending = [];
  };

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    if (data.clinicId) {
      continue;
    }

    pending.push(docSnap);

    if (pending.length === MAX_BATCH_OPS) {
      await flush();
    }
  }

  await flush();
  console.log(`✅ ${collectionName}: ${updated} documento(s) actualizados`);
}

async function run() {
  await createClinicIfMissing();
  await patchCollectionClinicId('users');
  await patchCollectionClinicId('pacientes');
  await patchCollectionClinicId('rutinas');
  await patchCollectionClinicId('sesiones');
  console.log('🎉 Migración clinicId finalizada');
}

run().catch((error) => {
  console.error('❌ Error en migración clinicId:', error);
  process.exit(1);
});
