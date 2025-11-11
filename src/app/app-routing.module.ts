import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
      },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then( m => m.DashboardPageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'pacientes-lista',
    loadChildren: () => import('./pages/pacientes-lista/pacientes-lista.module').then( m => m.PacientesListaPageModule)
  },
  {
    path: 'paciente-detalle',
    loadChildren: () => import('./pages/paciente-detalle/paciente-detalle.module').then( m => m.PacienteDetallePageModule)
  },
  {
    path: 'sesion',
    loadChildren: () => import('./pages/sesion/sesion.module').then( m => m.SesionPageModule)
  },
  {
    path: 'ejercicios',
    loadChildren: () => import('./pages/ejercicios/ejercicios.module').then( m => m.EjerciciosPageModule)
  },
  {
    path: 'evaluacion-final',
    loadChildren: () => import('./pages/evaluacion-final/evaluacion-final.module').then( m => m.EvaluacionFinalPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
