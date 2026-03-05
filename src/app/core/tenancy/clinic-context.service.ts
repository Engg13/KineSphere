import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ClinicContextService {

  private authService = inject(AuthService);

  getClinicId(): string {

    const user = this.authService.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    return user.clinicId;
  }

  getProfessionalId(): string {

    const user = this.authService.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    return user.uid;
  }

  getUser() {
    return this.authService.getCurrentUser();
    }

}