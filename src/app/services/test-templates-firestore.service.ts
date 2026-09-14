import { Injectable } from '@angular/core';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc
} from '@angular/fire/firestore';

import { TestTemplate } from '../models/test-template.model';
import { BaseClinicService } from '../core/services/base-clinic.service';
import { TESTS_PREDETERMINADOS } from '../core/constant/clinical-tests.constants';

const COLLECTION_NAME = 'testTemplates';

@Injectable({
  providedIn: 'root'
})
export class TestTemplatesFirestoreService extends BaseClinicService {

  async getTests(): Promise<TestTemplate[]> {

    const ref = collection(this.firestore, 'testTemplates');

    try {

      const snapshot = await getDocs(ref);

      return snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<TestTemplate, 'id'>),
        source: 'firebase' as const
      }));

    } catch (error) {

      console.error('===== TEST TEMPLATES ERROR =====');
      console.error(error);
      throw error;
    }
  }

  async upsertTest(test: TestTemplate): Promise<void> {

    const clinicId = this.clinicId;

    const payload = {
      nombre: test.nombre,
      descripcion: test.descripcion,
      preguntas: test.preguntas,
      rangos: test.rangos,
      fechaCreacion: test.fechaCreacion,
      updatedAt: new Date().toISOString(),
      clinicId
    };

    await setDoc(
      doc(this.firestore, `${COLLECTION_NAME}/${test.id}`),
      payload,
      { merge: true }
    );
  }

  async deleteTest(testId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `${COLLECTION_NAME}/${testId}`));
  }

  async seedTestsIfEmpty(): Promise<void> {

    const tests = await this.getTests();

    if (tests.length > 0) {
      console.log(`Tests ya existentes (${tests.length}), no se hace seed.`);
      return;
    }

    console.log('Seeding tests predeterminados...');

    for (const test of TESTS_PREDETERMINADOS) {
      await this.upsertTest(test);
    }

  }

}