// app.routing.ts
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
    canActivate: [AuthGuard]  
  },
  {
    path: 'pacientes-lista',
    loadChildren: () => import('./pages/pacientes-lista/pacientes-lista.module').then(m => m.PacientesListaPageModule),
    canActivate: [AuthGuard]  
  },
  {
    path: 'paciente-detalle',
    loadChildren: () => import('./pages/paciente-detalle/paciente-detalle.module').then(m => m.PacienteDetallePageModule),
    canActivate: [AuthGuard]  
  },

  {
    path: 'evolucion',
    loadComponent: () => import('./pages/evolucion/evolucion.page').then(m => m.EvolucionPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'evaluacion-final',
    loadChildren: () => import('./pages/evaluacion-final/evaluacion-final.module').then(m => m.EvaluacionFinalPageModule),
    canActivate: [AuthGuard]  
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'test-pacientes',
    loadChildren: () => import('./pages/test-pacientes/test-pacientes.module').then( m => m.TestPacientesPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'agregar-paciente',
    loadChildren: () => import('./pages/agregar-paciente/agregar-paciente.module').then( m => m.AgregarPacientePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'documentos-medicos',
    loadChildren: () => import('./pages/documentos-medicos/documentos-medicos.page').then( m => m.DocumentosMedicosPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'config-test',
    loadChildren: () => import('./pages/config-test/config-test.module').then(m => m.ConfigTestPageModule),
    canActivate: [AuthGuard]
  },  
  {
    path: 'tests-config',
    loadChildren: () => import('./pages/tests-config/tests-config.module').then(m => m.TestsConfigPageModule),
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
    path: 'perfil-profesional',
    loadChildren: () => import('./pages/perfil-profesional/perfil-profesional.module').then(m => m.PerfilProfesionalPageModule),
    canActivate: [AuthGuard]
  },

  {
    path: 'r/:token',
    loadComponent: () =>
      import('./pages/rutina-publica/rutina-publica.page')
        .then(m => m.RutinaPublicaPage)
  },

  {
    path: 'rutina-template-editor',
    loadComponent: () =>
      import('./pages/rutina-template-editor/rutina-template-editor.page')
        .then(m => m.RutinaTemplateEditorPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'rutina-template-editor/:id',
    loadComponent: () =>
      import('./pages/rutina-template-editor/rutina-template-editor.page')
        .then(m => m.RutinaTemplateEditorPage),
    canActivate: [AuthGuard]
  },
  
  {
    path: '**',
    loadChildren: () => import('./pages/not-found/not-found.module').then(m => m.NotFoundPageModule)  // ✅ 404
  },
  

  

  
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }