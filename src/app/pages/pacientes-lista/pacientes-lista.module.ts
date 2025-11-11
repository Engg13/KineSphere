import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PacientesListaPageRoutingModule } from './pacientes-lista-routing.module';

import { PacientesListaPage } from './pacientes-lista.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PacientesListaPageRoutingModule
  ],
  declarations: [PacientesListaPage]
})
export class PacientesListaPageModule {}
