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
    loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardPageModule),
    canActivate: [AuthGuard]  // ✅ PROTEGIDO
  },
  {
    path: 'pacientes-lista',
    loadChildren: () => import('./pages/pacientes-lista/pacientes-lista.module').then(m => m.PacientesListaPageModule),
    canActivate: [AuthGuard]  // ✅ PROTEGIDO
  },
  {
    path: 'paciente-detalle',
    loadChildren: () => import('./pages/paciente-detalle/paciente-detalle.module').then(m => m.PacienteDetallePageModule),
    canActivate: [AuthGuard]  // ✅ PROTEGIDO
  },
  {
    path: 'sesion',
    loadChildren: () => import('./pages/sesion/sesion.module').then(m => m.SesionPageModule),
    canActivate: [AuthGuard]  // ✅ PROTEGIDO
  },
  {
    path: 'ejercicios',
    loadChildren: () => import('./pages/ejercicios/ejercicios.module').then(m => m.EjerciciosPageModule),
    canActivate: [AuthGuard]  // ✅ PROTEGIDO
  },
  {
    path: 'evaluacion-final',
    loadChildren: () => import('./pages/evaluacion-final/evaluacion-final.module').then(m => m.EvaluacionFinalPageModule),
    canActivate: [AuthGuard]  // ✅ PROTEGIDO
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'posts',
    loadChildren: () => import('./pages/posts/posts.module').then( m => m.PostsPageModule)
  },
  {
    path: 'test-pacientes',
    loadChildren: () => import('./pages/test-pacientes/test-pacientes.module').then( m => m.TestPacientesPageModule)
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