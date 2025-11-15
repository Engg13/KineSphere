import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private database: SQLiteObject | undefined; // ← INICIALIZAR COMO UNDEFINED
  private dbReady: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor(
    private platform: Platform,
    private sqlite: SQLite
  ) {
    this.initializeDatabase();
  }

  private initializeDatabase() {
    this.platform.ready().then(() => {
      this.sqlite.create({
        name: 'kinesphere.db',
        location: 'default'
      })
      .then((db: SQLiteObject) => {
        this.database = db; // ← AHORA SE INICIALIZA AQUÍ
        this.createTables();
      })
      .catch(e => console.log('Error creating database:', e));
    });
  }

  private createTables() {
    // Verificar que database esté inicializado
    if (!this.database) {
      console.error('Database no está inicializado');
      return;
    }

    // Tabla de Pacientes
    this.database.executeSql(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        edad INTEGER,
        genero TEXT,
        telefono TEXT,
        email TEXT,
        direccion TEXT,
        fecha_ingreso DATE DEFAULT CURRENT_DATE,
        diagnostico TEXT,
        observaciones TEXT,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, [])
    .then(() => {
      console.log('Tabla pacientes creada');
      // Insertar paciente de prueba
      this.addPaciente({
        nombre: 'Paciente Demo',
        edad: 35,
        genero: 'Masculino',
        telefono: '+56912345678',
        diagnostico: 'Lumbalgia crónica'
      });
    })
    .catch(e => console.log('Error creando tabla pacientes:', e));

    // Tabla de Sesiones
    this.database.executeSql(`
      CREATE TABLE IF NOT EXISTS sesiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER,
        numero_sesion INTEGER,
        fecha DATE DEFAULT CURRENT_DATE,
        eva INTEGER CHECK(eva >= 0 AND eva <= 10),
        sueño INTEGER CHECK(sueño >= 1 AND sueño <= 5),
        ejercicios TEXT,
        observaciones TEXT,
        enviado_whatsapp BOOLEAN DEFAULT 0,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
      )`, [])
    .then(() => console.log('Tabla sesiones creada'))
    .catch(e => console.log('Error creando tabla sesiones:', e));

    // Tabla de Evaluaciones
    this.database.executeSql(`
      CREATE TABLE IF NOT EXISTS evaluaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER,
        tipo TEXT CHECK(tipo IN ('inicial', 'final')),
        fecha DATE DEFAULT CURRENT_DATE,
        movilidad TEXT,
        fuerza TEXT,
        dolor TEXT,
        eva_inicial INTEGER,
        observaciones TEXT,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
      )`, [])
    .then(() => console.log('Tabla evaluaciones creada'))
    .catch(e => console.log('Error creando tabla evaluaciones:', e));

    this.dbReady.next(true);
  }

  // ==================== MÉTODOS PARA PACIENTES ====================

  getPacientes() {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    return this.database.executeSql('SELECT * FROM pacientes ORDER BY creado_en DESC', [])
      .then(data => {
        let pacientes = [];
        for (let i = 0; i < data.rows.length; i++) {
          pacientes.push(data.rows.item(i));
        }
        return pacientes;
      });
  }

  getPaciente(id: number) {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    return this.database.executeSql('SELECT * FROM pacientes WHERE id = ?', [id])
      .then(data => {
        if (data.rows.length > 0) {
          return data.rows.item(0);
        }
        return null;
      });
  }

  addPaciente(paciente: any) {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    let data = [
      paciente.nombre,
      paciente.edad || null,
      paciente.genero || null,
      paciente.telefono || null,
      paciente.email || null,
      paciente.direccion || null,
      paciente.diagnostico || null,
      paciente.observaciones || null
    ];
    
    return this.database.executeSql(`
      INSERT INTO pacientes 
      (nombre, edad, genero, telefono, email, direccion, diagnostico, observaciones) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, data);
  }

  // ... (los demás métodos también necesitan verificar this.database)
  getSesionesByPaciente(pacienteId: number) {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    return this.database.executeSql(
      'SELECT * FROM sesiones WHERE paciente_id = ? ORDER BY fecha DESC', 
      [pacienteId]
    ).then(data => {
      let sesiones = [];
      for (let i = 0; i < data.rows.length; i++) {
        sesiones.push(data.rows.item(i));
      }
      return sesiones;
    });
  }

  getDatabaseState() {
    return this.dbReady.asObservable();
  }

  // En database.service.ts - agregar este método
getEstadisticas() {
  if (!this.database) {
    return Promise.reject('Database no inicializado');
  }

  const hoy = new Date().toISOString().split('T')[0];

  return Promise.all([
    // Total pacientes
    this.database.executeSql('SELECT COUNT(*) as total FROM pacientes', []),
    // Sesiones de hoy
    this.database.executeSql('SELECT COUNT(*) as total FROM sesiones WHERE fecha = ?', [hoy]),
    // Total de evaluaciones
    this.database.executeSql('SELECT COUNT(*) as total FROM evaluaciones', [])
  ]).then(([pacientesData, sesionesHoyData, evaluacionesData]) => {
    return {
      totalPacientes: pacientesData.rows.item(0).total,
      sesionesHoy: sesionesHoyData.rows.item(0).total,
      totalEvaluaciones: evaluacionesData.rows.item(0).total
    };
  }).catch(error => {
    console.log('Error en getEstadisticas:', error);
    // Retornar valores por defecto en caso de error
    return {
      totalPacientes: 0,
      sesionesHoy: 0,
      totalEvaluaciones: 0
     };
   });
 }
}