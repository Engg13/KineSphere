import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TestsConfigPageRoutingModule } from './tests-config-routing.module';

import { TestsConfigPage } from './tests-config.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TestsConfigPageRoutingModule
  ],
  declarations: [TestsConfigPage]
})
export class TestsConfigPageModule {}
