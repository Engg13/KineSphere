import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EvaluacionFinalPage } from './evaluacion-final.page';

const routes: Routes = [
  {
    path: '',
    component: EvaluacionFinalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EvaluacionFinalPageRoutingModule {}
