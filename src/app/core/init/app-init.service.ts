import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { ClinicContextService } from '../tenancy/clinic-context.service';
import { TestTemplatesFirestoreService } from 'src/app/services/test-templates-firestore.service';
import { EjerciciosSeederService } from './ejercicios-seeder.service';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {

  private authService = inject(AuthService);
  private clinicContext = inject(ClinicContextService);
  private testTemplatesService = inject(TestTemplatesFirestoreService);
  private ejerciciosSeeder = inject(EjerciciosSeederService);

  async init(): Promise<void> {

    try {

      const user = await firstValueFrom(
        this.authService.user$.pipe(
          filter(user => !!user),
          take(1)
        )
      );

      console.log('Auth initialized', user?.uid);

      // cargar contexto multi-tenant
      await this.clinicContext.init();

      console.log('Clinic context loaded');

      // 🌱 seed ejercicios si no existen
      await this.ejerciciosSeeder.seed();

      // 🌱 seed tests clínicos
      await this.testTemplatesService.seedTestsIfEmpty();

      console.log('App initialization complete');

    } catch (err) {

      console.error('Error initializing app', err);

    }

  }

}