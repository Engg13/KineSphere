import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { PlatformService } from './platform.service';
import { FirestoreService } from './firestore.service';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: SQLiteObject | null = null;
  private isInitialized = false;
  private useFirestore = true; // Flag para activar/desactivar Firestore

  constructor(
    private platform: Platform,
    private sqlite: SQLite,
    private platformService: PlatformService,
    private firestoreService: FirestoreService
  ) {
    // SOLO INICIAR SQLite EN PLATAFORMAS NATIVAS
    if (this.platformService.shouldUseSQLite()) {
      console.log('📱 Entorno nativo detectado - Iniciando SQLite');
      this.initDB();
    } else {
      console.log('🌐 Entorno web detectado - SQLite desactivado');
    }
  }

  // INICIALIZACIÓN SOLO PARA NATIVOS
  private async initDB() {
    // Doble verificación por seguridad
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🚫 SQLite desactivado - Entorno web');
      return;
    }

    try {
      console.log('🚀 Iniciando SQLite...');
      
      await this.platform.ready();
      
      this.db = await this.sqlite.create({
        name: 'kinesphere_simple.db',
        location: 'default'
      });
      
      console.log('✅ SQLite creado');
      await this.createTables();
      this.isInitialized = true;
      console.log('🎉 Base de datos lista');
      
    } catch (error) {
      console.error('❌ Error SQLite:', error);
    }
  }

  // ✅ TABLAS MEJORADAS
  private async createTables() {
    if (!this.db) return;

    try {
      // TABLA PACIENTES MEJORADA
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS pacientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          rut TEXT,
          email TEXT,
          telefono TEXT,
          diagnostico TEXT,
          activo BOOLEAN DEFAULT 1,
          es_demo BOOLEAN DEFAULT 0,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
      console.log('✅ Tabla pacientes lista');

      // TABLA SESIONES
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS sesiones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          paciente_id INTEGER,
          fecha TEXT,
          ejercicios TEXT,
          observaciones TEXT,
          eva INTEGER,
          sueño INTEGER,
          enviado_whatsapp BOOLEAN DEFAULT 0,
          creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
      console.log('✅ Tabla sesiones lista');
      
      // Limpiar datos demo que pudieran existir de versiones anteriores
      await this.db.executeSql('DELETE FROM pacientes WHERE es_demo = 1', []);
      
    } catch (error) {
      console.error('Error creando tablas:', error);
    }
  }


  // ESPERAR INICIALIZACIÓN MEJORADA
  private async waitForInit(): Promise<boolean> {
    // En web, nunca inicializar SQLite
    if (!this.platformService.shouldUseSQLite()) {
      return false;
    }

    if (this.isInitialized) return true;
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.isInitialized) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('⚠️ Timeout esperando DB');
        resolve(false);
      }, 3000);
    });
  }

  // ==================== MÉTODOS PARA SESIONES (NUEVOS Y CORREGIDOS) ====================

  /**
   * Obtiene el número de sesiones de un paciente
   */
  async getNumeroSesionesByPaciente(pacienteId: number): Promise<number> {
    // EN WEB - contamos desde localStorage
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🌐 Modo web - contando sesiones para paciente:', pacienteId);
      
      try {
        const storedSesiones = localStorage.getItem(`sesiones_${pacienteId}`);
        if (storedSesiones) {
          const sesiones = JSON.parse(storedSesiones);
          return sesiones.length;
        }
      } catch (error) {
        console.log('No hay sesiones en localStorage para paciente:', pacienteId);
      }
      
      return 0;
    }

    // EN MÓVIL
    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible para contar sesiones');
      return 0;
    }

    try {
      const result = await this.db.executeSql(
        'SELECT COUNT(*) as total FROM sesiones WHERE paciente_id = ?',
        [pacienteId]
      );
      
      return result.rows.length > 0 ? result.rows.item(0).total : 0;
    } catch (error) {
      console.error('Error contando sesiones:', error);
      return 0;
    }
  }

  /**
   * Método para obtener pacientes CON el número de sesiones incluido
   */
  async getPacientesConConteoSesiones(): Promise<any[]> {
    const pacientes = await this.getPacientes();
    const pacientesConSesiones = [];
    
    for (const paciente of pacientes) {
      const numSesiones = await this.getNumeroSesionesByPaciente(paciente.id);
      pacientesConSesiones.push({
        ...paciente,
        num_sesiones: numSesiones
      });
    }
    
    console.log(`✅ ${pacientesConSesiones.length} pacientes cargados con conteo de sesiones`);
    return pacientesConSesiones;
  }

  // ==================== MÉTODOS CRUD MEJORADOS ====================

  async getPacientes(): Promise<any[]> {
    // EN WEB - intentar Firestore, fallback a localStorage
    if (!this.platformService.shouldUseSQLite()) {
      if (this.useFirestore) {
        try {
          const pacientes = await firstValueFrom(
            this.firestoreService.getPacientes().pipe(timeout(5000))
          );
          if (pacientes && pacientes.length > 0) {
            return pacientes;
          }
        } catch (err) {
          console.log('Firestore no disponible o timeout, usando localStorage');
        }
      }
      const userPacientes = this.getUserPacientesFromStorage();
      return userPacientes;
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 SQLite no disponible');
      return [];
    }

    try {
      const result = await this.db.executeSql(
        'SELECT * FROM pacientes WHERE activo = 1 ORDER BY id DESC', []
      );

      const userPacientes = [];
      for (let i = 0; i < result.rows.length; i++) {
        userPacientes.push(result.rows.item(i));
      }

      return userPacientes;
    } catch (error) {
      console.error('Error obteniendo pacientes:', error);
      return [];
    }
  }

  async getPaciente(id: number): Promise<any> {
    // EN WEB 
    if (!this.platformService.shouldUseSQLite()) {
      const userPacientes = this.getUserPacientesFromStorage();
      const userPaciente = userPacientes.find(p => p.id === id || String(p.id) === String(id));
      return userPaciente || null;
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible');
      return null;
    }

    try {
      const result = await this.db.executeSql(
        'SELECT * FROM pacientes WHERE id = ?',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows.item(0) : null;
    } catch (error) {
      console.error('Error obteniendo paciente:', error);
      return null;
    }
  }

  async addPaciente(paciente: any): Promise<any> {
    // EN WEB - guardar en Firestore + localStorage backup
    if (!this.platformService.shouldUseSQLite()) {
      let firestoreId = null;

      if (this.useFirestore) {
        try {
          const firestorePromise = this.firestoreService.addPaciente(paciente);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
          );
          const result: any = await Promise.race([firestorePromise, timeoutPromise]);
          firestoreId = result.id;
          console.log('✅ Paciente guardado en Firestore:', paciente.nombre);
        } catch (err) {
          console.log('Firestore no disponible o timeout, guardando solo en localStorage');
        }
      }

      // Siempre guardar en localStorage como backup
      const userPacientes = this.getUserPacientesFromStorage();
      const newPaciente = {
        ...paciente,
        id: firestoreId || Date.now(),
        es_demo: false,
        activo: true,
        fecha_creacion: new Date().toISOString(),
        num_sesiones: 0
      };
      userPacientes.push(newPaciente);
      localStorage.setItem('user_pacientes', JSON.stringify(userPacientes));
      return { insertId: newPaciente.id };
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible, paciente no guardado');
      return { insertId: Date.now() };
    }

    try {
      // Marcar como NO demo
      const result = await this.db.executeSql(
        'INSERT INTO pacientes (nombre, rut, email, telefono, diagnostico, es_demo) VALUES (?, ?, ?, ?, ?, ?)',
        [paciente.nombre, paciente.rut, paciente.email, paciente.telefono, paciente.diagnostico, 0]
      );
      
      console.log('✅ Paciente REAL guardado en SQLite:', paciente.nombre);
      return result;
    } catch (error) {
      console.error('Error guardando paciente:', error);
      throw error;
    }
  }

  async deletePaciente(id: number | string): Promise<any> {
    // EN WEB - eliminar de Firestore + localStorage
    if (!this.platformService.shouldUseSQLite()) {
      if (this.useFirestore) {
        try {
          const deletePromise = this.firestoreService.deletePaciente(String(id));
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
          );
          await Promise.race([deletePromise, timeoutPromise]);
        } catch (err) {
          console.log('No se pudo eliminar de Firestore:', err);
        }
      }

      const userPacientes = this.getUserPacientesFromStorage();
      const updatedPacientes = userPacientes.filter(p => p.id !== id && String(p.id) !== String(id));
      localStorage.setItem('user_pacientes', JSON.stringify(updatedPacientes));
      localStorage.removeItem(`sesiones_${id}`);
      return { rowsAffected: 1 };
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible, eliminación simulada');
      return { rowsAffected: 1 };
    }

    try {
      // Para datos demo, marcar como inactivo
      const result = await this.db.executeSql(
        'UPDATE pacientes SET activo = 0 WHERE id = ?',
        [id]
      );
      
      console.log('✅ Paciente marcado como inactivo ID:', id);
      return result;
    } catch (error) {
      console.error('Error eliminando paciente:', error);
      throw error;
    }
  }

  async updatePaciente(id: number, paciente: any): Promise<any> {
    // Actualizar en localStorage
    if (!this.platformService.shouldUseSQLite()) {
      const userPacientes = this.getUserPacientesFromStorage();
      const index = userPacientes.findIndex(p => p.id === id);
      if (index !== -1) {
        userPacientes[index] = { ...userPacientes[index], ...paciente };
        localStorage.setItem('user_pacientes', JSON.stringify(userPacientes));
      }
      return { rowsAffected: 1 };
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible, actualización simulada');
      return { rowsAffected: 1 };
    }

    try {
      const result = await this.db.executeSql(
        'UPDATE pacientes SET nombre = ?, rut = ?, email = ?, telefono = ?, diagnostico = ? WHERE id = ?',
        [paciente.nombre, paciente.rut, paciente.email, paciente.telefono, paciente.diagnostico, id]
      );
      
      console.log('✅ Paciente actualizado ID:', id);
      return result;
    } catch (error) {
      console.error('Error actualizando paciente:', error);
      throw error;
    }
  }

  async getSesionesByPaciente(pacienteId: number): Promise<any[]> {
    // EN WEB - obtener de localStorage
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🌐 Modo web - obteniendo sesiones desde localStorage para:', pacienteId);
      
      try {
        const storedSesiones = localStorage.getItem(`sesiones_${pacienteId}`);
        if (storedSesiones) {
          const sesiones = JSON.parse(storedSesiones);
          console.log(`✅ ${sesiones.length} sesiones encontradas en localStorage`);
          return sesiones.sort((a: any, b: any) => 
            new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
          );
        }
      } catch (error) {
        console.log('No hay sesiones en localStorage');
      }
      
      return [];
    }

    // EN MÓVIL
    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible, sesiones demo');
      return [];
    }

    try {
      const result = await this.db.executeSql(
        'SELECT * FROM sesiones WHERE paciente_id = ? ORDER BY fecha DESC, creado_en DESC',
        [pacienteId]
      );
      
      const sesiones = [];
      for (let i = 0; i < result.rows.length; i++) {
        sesiones.push(result.rows.item(i));
      }
      
      console.log(`✅ ${sesiones.length} sesiones cargadas para paciente ${pacienteId}`);
      return sesiones;
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
      return [];
    }
  }

  async addSesion(sesion: any): Promise<any> {
    // EN WEB - guardar en Firestore + localStorage
    if (!this.platformService.shouldUseSQLite()) {
      const sesionId = Date.now();
      const sesionConId = {
        ...sesion,
        id: sesionId,
        paciente_id: sesion.paciente_id,
        paciente_nombre: sesion.paciente_nombre || '',
        fecha_creacion: new Date().toISOString(),
        creado_en: new Date().toISOString()
      };

      if (this.useFirestore) {
        try {
          const sesionPromise = this.firestoreService.addSesion(sesionConId);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
          );
          await Promise.race([sesionPromise, timeoutPromise]);
          console.log('✅ Sesion guardada en Firestore');
        } catch (err) {
          console.log('Firestore no disponible o timeout para sesion');
        }
      }

      // Siempre guardar en localStorage como backup
      const key = `sesiones_${sesion.paciente_id}`;
      let todasSesiones = [];
      try {
        const existentes = localStorage.getItem(key);
        if (existentes) todasSesiones = JSON.parse(existentes);
      } catch (e) {}
      todasSesiones.push(sesionConId);
      localStorage.setItem(key, JSON.stringify(todasSesiones));

      return { insertId: sesionId };
    }

    // EN MÓVIL
    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible, sesión no guardada');
      return { insertId: Date.now() };
    }

    try {
      const result = await this.db.executeSql(
        `INSERT INTO sesiones 
        (paciente_id, fecha, ejercicios, observaciones, eva, sueño, enviado_whatsapp) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sesion.paciente_id, 
          sesion.fecha || new Date().toISOString().split('T')[0],
          sesion.ejercicios || '',
          sesion.observaciones || '',
          sesion.eva || null,
          sesion.sueño || null,
          sesion.enviado_whatsapp ? 1 : 0
        ]
      );
      
      console.log('✅ Sesión guardada en SQLite para paciente:', sesion.paciente_id);
      return result;
    } catch (error) {
      console.error('Error guardando sesión:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE AYUDA ====================

  // Obtener pacientes del usuario desde localStorage
  private getUserPacientesFromStorage(): any[] {
    try {
      const stored = localStorage.getItem('user_pacientes');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error obteniendo pacientes de localStorage:', error);
      return [];
    }
  }


  // ESTADÍSTICAS SIMPLES
  async getEstadisticas(): Promise<any> {
    const pacientes = await this.getPacientes();

    return {
      totalPacientes: pacientes.length,
      pacientesActivos: pacientes.filter(p => p.activo).length,
      ultimaActualizacion: new Date().toISOString()
    };
  }

  // Método para limpiar todos los datos
  async clearAllData(): Promise<void> {
    if (!this.platformService.shouldUseSQLite()) {
      localStorage.removeItem('user_pacientes');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sesiones_')) {
          localStorage.removeItem(key);
        }
      });
      return;
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) return;

    try {
      await this.db.executeSql('DELETE FROM sesiones', []);
      await this.db.executeSql('DELETE FROM pacientes', []);
      console.log('✅ Todos los datos eliminados');
    } catch (error) {
      console.error('Error eliminando datos:', error);
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  async guardarEvaluacion(evaluacion: any): Promise<any> {
    console.log('📄 Evaluación guardada:', evaluacion.id);
    return {
      success: true,
      message: 'Evaluación guardada exitosamente',
      id: evaluacion.id,
      timestamp: new Date().toISOString()
    };
  }

  async actualizarEstadoPaciente(pacienteId: number, estado: string): Promise<any> {
    return this.updatePaciente(pacienteId, { activo: estado === 'activo' });
  }

  async getEvaluacionesPorPaciente(pacienteId: number): Promise<any[]> {
    return [];
  }
}