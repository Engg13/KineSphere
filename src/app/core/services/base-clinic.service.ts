import { inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { ClinicContextService } from '../tenancy/clinic-context.service';

export abstract class BaseClinicService {

  protected firestore = inject(Firestore);
  protected clinicContext = inject(ClinicContextService);

  // 🔒 Sanitizador global para Firestore
  protected sanitize<T>(data: T): T {
    return this.removeUndefinedDeep(data);
  }

  // 🔥 Eliminación profunda de undefined
  private removeUndefinedDeep(obj: any): any {

    if (Array.isArray(obj)) {
      return obj.map(v => this.removeUndefinedDeep(v))
      .filter(v => v !== undefined);
    }

    if (obj !== null && typeof obj === 'object') {

      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, this.removeUndefinedDeep(v)])
      );

    }

    return obj;
  }

  protected get clinicId(): string {

    const clinicId = this.clinicContext.clinicId;

    if (!clinicId) {
      throw new Error('Clinic context not initialized');
    }

    return clinicId;

  }

  protected get professionalId(): string {

    const uid = this.clinicContext.uid;

    if (!uid) {
      throw new Error('Professional not authenticated');
    }

    return uid;

  }

  protected requireClinicContext() {
    return {
      clinicId: this.clinicId,
      professionalId: this.professionalId
    };
  }

}