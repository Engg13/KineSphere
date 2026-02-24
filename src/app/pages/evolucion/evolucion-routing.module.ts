import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EvolucionPage } from './evolucion.page';

const routes: Routes = [
  {
    path: '',
    component: EvolucionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EvolucionPageRoutingModule {}
