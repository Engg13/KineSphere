import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DocumentosMedicosPageRoutingModule } from './documentos-medicos-routing.module';

import { DocumentosMedicosPage } from './documentos-medicos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DocumentosMedicosPageRoutingModule
  ],
  declarations: [DocumentosMedicosPage] 
})
export class DocumentosMedicosPageModule {}