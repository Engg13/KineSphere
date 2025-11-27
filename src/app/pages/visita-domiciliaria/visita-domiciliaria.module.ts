import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VisitaDomiciliariaPageRoutingModule } from './visita-domiciliaria-routing.module';

import { VisitaDomiciliariaPage } from './visita-domiciliaria.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VisitaDomiciliariaPageRoutingModule
  ],
  declarations: [VisitaDomiciliariaPage]
})
export class VisitaDomiciliariaPageModule {}
