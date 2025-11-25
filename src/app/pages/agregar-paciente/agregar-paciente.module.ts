import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AgregarPacientePageRoutingModule } from './agregar-paciente-routing.module';

import { AgregarPacientePage } from './agregar-paciente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgregarPacientePageRoutingModule
  ],
  declarations: [AgregarPacientePage]
})
export class AgregarPacientePageModule {}
