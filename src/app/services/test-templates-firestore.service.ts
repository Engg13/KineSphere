import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc
} from '@angular/fire/firestore';
import { TestTemplate } from '../models/test-template.model';

const COLLECTION_NAME = 'test_templates';
const STORAGE_KEY = 'test_templates';

@Injectable({
  providedIn: 'root'
})
export class TestTemplatesFirestoreService {
  private firestore = inject(Firestore);

  async getTests(): Promise<TestTemplate[]> {
    try {
      const ref = collection(this.firestore, COLLECTION_NAME);
      const q = query(ref, orderBy('fechaCreacion', 'desc'));
      const snapshot = await getDocs(q);
      const tests = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<TestTemplate, 'id'>),
        source: 'firebase' as const
      }));

      this.persistLocalBackup(tests);
      return tests;
    } catch (error) {
      console.warn('No se pudo cargar tests desde Firestore, usando respaldo local.', error);
      return this.getLocalBackup();
    }
  }

  async upsertTest(test: TestTemplate): Promise<void> {
    const payload = {
      nombre: test.nombre,
      descripcion: test.descripcion,
      preguntas: test.preguntas,
      rangos: test.rangos,
      fechaCreacion: test.fechaCreacion,
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(this.firestore, `${COLLECTION_NAME}/${test.id}`), payload, { merge: true });
  }

  async deleteTest(testId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `${COLLECTION_NAME}/${testId}`));
  }

  getLocalBackup(): TestTemplate[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  persistLocalBackup(tests: TestTemplate[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  }
}
