// app-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.page').then(m => m.LoginPage)
  },

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'pacientes-lista',
    loadComponent: () =>
      import('./pages/pacientes-lista/pacientes-lista.page')
        .then(m => m.PacientesListaPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'paciente-detalle',
    loadComponent: () =>
      import('./pages/paciente-detalle/paciente-detalle.page')
        .then(m => m.PacienteDetallePage),
    canActivate: [AuthGuard]
  },

  {
    path: 'evolucion',
    loadComponent: () =>
      import('./pages/evolucion/evolucion.page')
        .then(m => m.EvolucionPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'evaluacion-final',
    loadComponent: () =>
      import('./pages/evaluacion-final/evaluacion-final.page')
        .then(m => m.EvaluacionFinalPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'test-pacientes',
    loadComponent: () =>
      import('./pages/test-pacientes/test-pacientes.page')
        .then(m => m.TestPacientesPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'agregar-paciente',
    loadComponent: () =>
      import('./pages/agregar-paciente/agregar-paciente.page')
        .then(m => m.AgregarPacientePage),
    canActivate: [AuthGuard]
  },

  {
    path: 'documentos-medicos',
    loadComponent: () =>
      import('./pages/documentos-medicos/documentos-medicos.page')
        .then(m => m.DocumentosMedicosPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'config-test',
    loadComponent: () =>
      import('./pages/config-test/config-test.page')
        .then(m => m.ConfigTestPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'tests-config',
    loadComponent: () =>
      import('./pages/tests-config/tests-config.page')
        .then(m => m.TestsConfigPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'asignar-rutina',
    loadComponent: () =>
      import('./pages/asignar-rutina/asignar-rutina.page')
        .then(m => m.AsignarRutinaPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'rutinas-templates',
    loadComponent: () =>
      import('./pages/rutinas-templates/rutinas-templates.page')
        .then(m => m.RutinasTemplatesPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'rutina-editor',
    loadComponent: () =>
      import('./pages/rutina-editor/rutina-editor.page')
        .then(m => m.RutinaEditorPage),
    canActivate: [AuthGuard]
  },

  // Legacy routes redirect to unified editor
  {
    path: 'rutina-template-editor',
    redirectTo: '/rutina-editor?tipo=template',
    pathMatch: 'full'
  },

  {
    path: 'perfil-profesional',
    loadComponent: () =>
      import('./pages/perfil-profesional/perfil-profesional.page')
        .then(m => m.PerfilProfesionalPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'r/:token',
    loadComponent: () =>
      import('./pages/rutina-publica/rutina-publica.page')
        .then(m => m.RutinaPublicaPage)
  },

  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.page')
        .then(m => m.NotFoundPage)
  }

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}