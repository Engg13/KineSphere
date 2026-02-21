import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PerfilProfesionalPageRoutingModule } from './perfil-profesional-routing.module';

import { PerfilProfesionalPage } from './perfil-profesional.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PerfilProfesionalPageRoutingModule
  ],
  declarations: [PerfilProfesionalPage]
})
export class PerfilProfesionalPageModule {}
