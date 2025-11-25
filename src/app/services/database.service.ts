import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private database: SQLiteObject | undefined;
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
        this.database = db;
        this.createTables();
      })
      .catch(e => console.log('Error creating database:', e));
    });
  }

  private createTables() {
    if (!this.database) {
      console.error('Database no está inicializado');
      return;
    }

    // TABLA PACIENTES
    this.database.executeSql(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        rut TEXT UNIQUE,
        edad INTEGER,
        email TEXT,
        telefono TEXT,
        diagnostico TEXT,
        sesiones_planificadas INTEGER DEFAULT 0,
        sesiones_completadas INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        observaciones TEXT,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, [])
    .then(() => {
      console.log('✅ Tabla pacientes creada/actualizada');
      // Insertar paciente de prueba SOLO si la tabla está vacía
      this.getPacientes().then(pacientes => {
        if (pacientes.length === 0) {
          this.addPaciente({
            nombre: 'Paciente Demo',
            rut: '12.345.678-9',
            edad: 35,
            email: 'demo@email.com',
            telefono: '+56912345678',
            diagnostico: 'Lumbalgia crónica',
            sesionesPlanificadas: 5,
            sesionesCompletadas: 0,
            activo: true
          });
        }
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
    .then(() => console.log('✅ Tabla sesiones creada'))
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
    .then(() => console.log('✅ Tabla evaluaciones creada'))
    .catch(e => console.log('Error creando tabla evaluaciones:', e));

    this.dbReady.next(true);
  }

  // ==================== MÉTODOS PARA PACIENTES ====================

  getPacientes() {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    return this.database.executeSql(`
      SELECT 
        id,
        nombre,
        rut,
        edad,
        email,
        telefono,
        diagnostico,
        sesiones_planificadas as sesionesPlanificadas,
        sesiones_completadas as sesionesCompletadas,
        activo,
        fecha_creacion as fechaCreacion,
        observaciones,
        creado_en as creadoEn
      FROM pacientes 
      ORDER BY creado_en DESC`, [])
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

    return this.database.executeSql(`
      SELECT 
        id,
        nombre,
        rut,
        edad,
        email,
        telefono,
        diagnostico,
        sesiones_planificadas as sesionesPlanificadas,
        sesiones_completadas as sesionesCompletadas,
        activo,
        fecha_creacion as fechaCreacion,
        observaciones,
        creado_en as creadoEn
      FROM pacientes 
      WHERE id = ?`, [id])
      .then(data => {
        if (data.rows.length > 0) {
          return data.rows.item(0);
        }
        return null;
      });
  }

  // MÉTODOS TODOS LOS CAMPOS
  addPaciente(paciente: any) {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    let data = [
      paciente.nombre,
      paciente.rut || null,
      paciente.edad || null,
      paciente.email || null,
      paciente.telefono || null,
      paciente.diagnostico || null,
      paciente.sesionesPlanificadas || 0,
      paciente.sesionesCompletadas || 0,
      paciente.activo ? 1 : 0,
      paciente.fechaCreacion || new Date().toISOString(),
      paciente.observaciones || null
    ];
    
    return this.database.executeSql(`
      INSERT INTO pacientes 
      (nombre, rut, edad, email, telefono, diagnostico, sesiones_planificadas, sesiones_completadas, activo, fecha_creacion, observaciones) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, data);
  }

  updatePaciente(id: number, paciente: any) {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    let data = [
      paciente.nombre,
      paciente.rut,
      paciente.edad,
      paciente.email,
      paciente.telefono,
      paciente.diagnostico,
      paciente.sesionesPlanificadas,
      paciente.sesionesCompletadas,
      paciente.activo ? 1 : 0,
      paciente.observaciones,
      id
    ];
    
    return this.database.executeSql(`
      UPDATE pacientes 
      SET nombre = ?, rut = ?, edad = ?, email = ?, telefono = ?, diagnostico = ?, 
          sesiones_planificadas = ?, sesiones_completadas = ?, activo = ?, observaciones = ?
      WHERE id = ?`, data);
  }

  deletePaciente(id: number) {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    return this.database.executeSql('DELETE FROM pacientes WHERE id = ?', [id]);
  }

  // ==================== MÉTODOS PARA SESIONES ====================

  addSesion(sesion: any) {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    let data = [
      sesion.paciente_id,
      sesion.numero_sesion,
      sesion.fecha || new Date().toISOString().split('T')[0],
      sesion.eva || null,
      sesion.sueño || null,
      sesion.ejercicios || null,
      sesion.observaciones || null,
      sesion.enviado_whatsapp ? 1 : 0
    ];
    
    return this.database.executeSql(`
      INSERT INTO sesiones 
      (paciente_id, numero_sesion, fecha, eva, sueño, ejercicios, observaciones, enviado_whatsapp) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, data);
  }

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

  // ==================== MÉTODOS PARA EVALUACIONES ====================

  addEvaluacion(evaluacion: any) {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    let data = [
      evaluacion.paciente_id,
      evaluacion.tipo,
      evaluacion.fecha || new Date().toISOString().split('T')[0],
      evaluacion.movilidad || null,
      evaluacion.fuerza || null,
      evaluacion.dolor || null,
      evaluacion.eva_inicial || null,
      evaluacion.observaciones || null
    ];
    
    return this.database.executeSql(`
      INSERT INTO evaluaciones 
      (paciente_id, tipo, fecha, movilidad, fuerza, dolor, eva_inicial, observaciones) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, data);
  }

  // ==================== MÉTODOS UTILITARIOS ====================

  getDatabaseState() {
    return this.dbReady.asObservable();
  }

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
      return {
        totalPacientes: 0,
        sesionesHoy: 0,
        totalEvaluaciones: 0
      };
    });
  }

  //Buscar pacientes por nombre o RUT
  buscarPacientes(termino: string) {
    if (!this.database) {
      return Promise.reject('Database no inicializado');
    }

    return this.database.executeSql(`
      SELECT 
        id,
        nombre,
        rut,
        edad,
        telefono,
        diagnostico,
        sesiones_planificadas as sesionesPlanificadas,
        sesiones_completadas as sesionesCompletadas,
        activo
      FROM pacientes 
      WHERE nombre LIKE ? OR rut LIKE ?
      ORDER BY nombre`, [`%${termino}%`, `%${termino}%`])
      .then(data => {
        let pacientes = [];
        for (let i = 0; i < data.rows.length; i++) {
          pacientes.push(data.rows.item(i));
        }
        return pacientes;
      });
  }
}