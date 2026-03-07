import { inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { ClinicContextService } from '../tenancy/clinic-context.service';

export abstract class BaseClinicService {

  protected firestore = inject(Firestore);
  protected clinicContext = inject(ClinicContextService);

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