import { inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { ClinicContextService } from '../tenancy/clinic-context.service';

export abstract class BaseClinicService {

  protected firestore = inject(Firestore);
  protected clinicContext = inject(ClinicContextService);

  // 🔒 Sanitizador global para Firestore
  protected sanitize(data: any) {
    return this.removeUndefinedDeep(data);
  }

  // 🔥 Eliminación profunda de undefined
  private removeUndefinedDeep(obj: any): any {

    if (Array.isArray(obj)) {
      return obj.map(v => this.removeUndefinedDeep(v));
    }

    if (obj !== null && typeof obj === 'object') {

      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
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

}