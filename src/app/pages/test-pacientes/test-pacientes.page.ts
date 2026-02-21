import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
    selector: 'app-test-pacientes',
    templateUrl: './test-pacientes.page.html',
    styleUrls: ['./test-pacientes.page.scss'],
    standalone: true,
    imports: [IonicModule]
})
export class TestPacientesPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
