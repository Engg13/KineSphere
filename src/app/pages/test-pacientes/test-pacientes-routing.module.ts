import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TestPacientesPage } from './test-pacientes.page';

const routes: Routes = [
  {
    path: '',
    component: TestPacientesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TestPacientesPageRoutingModule {}
