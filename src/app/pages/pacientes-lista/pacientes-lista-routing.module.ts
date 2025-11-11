import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PacientesListaPage } from './pacientes-lista.page';

const routes: Routes = [
  {
    path: '',
    component: PacientesListaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PacientesListaPageRoutingModule {}
