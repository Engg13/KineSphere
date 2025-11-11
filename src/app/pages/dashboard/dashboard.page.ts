import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage {
  // INTERPOLACIÓN: Datos dinámicos para mostrar
  usuarioNombre: string = 'Klgo. Esteban Gomez';
  totalPacientes: number = 8;
  sesionesHoy: number = 3;
  evaluacionesPendientes: number = 2;
  
  // Array para mostrar lista con *ngFor
  proximasSesiones: any[] = [
    { nombre: 'Juan Pérez', hora: '10:00 AM', eva: 4 },
    { nombre: 'María González', hora: '11:30 AM', eva: 6 },
    { nombre: 'Carlos López', hora: '03:00 PM', eva: 3 }
  ];

  constructor(private router: Router) {}
  // MÉTODOS DE NAVEGACIÓN
  irAPacientes() {
    this.router.navigateByUrl('/pacientes-lista');
  }

  irASesion() {
    this.router.navigateByUrl('/sesion');
  }
}