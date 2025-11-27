import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VisitaDomiciliariaPage } from './visita-domiciliaria.page';

const routes: Routes = [
  {
    path: '',
    component: VisitaDomiciliariaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VisitaDomiciliariaPageRoutingModule {}
