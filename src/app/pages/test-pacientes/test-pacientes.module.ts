import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TestPacientesPageRoutingModule } from './test-pacientes-routing.module';

import { TestPacientesPage } from './test-pacientes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TestPacientesPageRoutingModule
  ],
  declarations: [TestPacientesPage]
})
export class TestPacientesPageModule {}
