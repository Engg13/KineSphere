import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TestsConfigPage } from './tests-config.page';

const routes: Routes = [
  {
    path: '',
    component: TestsConfigPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TestsConfigPageRoutingModule {}
