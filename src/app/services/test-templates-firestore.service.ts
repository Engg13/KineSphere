import { Injectable } from '@angular/core';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
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

    const clinicId = this.clinicId;
    const ref = collection(this.firestore, COLLECTION_NAME);

    const q = query(
      ref,
      where('clinicId', '==', clinicId),
      orderBy('fechaCreacion', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<TestTemplate, 'id'>),
      source: 'firebase' as const
    }));
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
      return;
    }

    for (const test of TESTS_PREDETERMINADOS) {
      await this.upsertTest(test);
    }

  }

}