import { NgModule} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SesionPageRoutingModule } from './sesion-routing.module';

import { SesionPage } from './sesion.page';
import { EvaScaleComponent } from '../../components/eva-scale/eva-scale.component';
import { SleepQualityComponent } from '../../components/sleep-quality/sleep-quality.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SesionPageRoutingModule
  ],
  declarations: [SesionPage,
    EvaScaleComponent,
    SleepQualityComponent
  ]
})
export class SesionPageModule {}
