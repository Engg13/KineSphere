import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
  standalone: false
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