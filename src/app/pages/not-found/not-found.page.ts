import { Component } from '@angular/core';
import { NavController, IonicModule } from '@ionic/angular';

@Component({
    selector: 'app-not-found',
    templateUrl: './not-found.page.html',
    styleUrls: ['./not-found.page.scss'],
    standalone: true,
    imports: [IonicModule]
})
export class NotFoundPage {

  constructor(private navCtrl: NavController) { }

  goToDashboard() {
    this.navCtrl.navigateRoot('/dashboard');
  }

  goToPatients() {
    this.navCtrl.navigateRoot('/pacientes-lista');
  }
}