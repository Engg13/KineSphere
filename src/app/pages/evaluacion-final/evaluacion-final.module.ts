import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EvaluacionFinalPageRoutingModule } from './evaluacion-final-routing.module';

import { EvaluacionFinalPage } from './evaluacion-final.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EvaluacionFinalPageRoutingModule
  ],
  declarations: [EvaluacionFinalPage]
})
export class EvaluacionFinalPageModule {}
