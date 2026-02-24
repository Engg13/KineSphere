import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EvolucionPageRoutingModule } from './evolucion-routing.module';

import { EvolucionPage } from './evolucion.page';
import { SleepQualityComponent } from '../../components/sleep-quality/sleep-quality.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EvolucionPageRoutingModule,
    EvolucionPage,
    SleepQualityComponent
  ]
})
export class EvolucionPageModule {}
