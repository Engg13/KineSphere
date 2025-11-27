import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { PlatformService } from './platform.service'; // ✅ AÑADIR

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: SQLiteObject | null = null;
  private isInitialized = false;

  constructor(
    private platform: Platform,
    private sqlite: SQLite,
    private platformService: PlatformService // ✅ INYECTAR
  ) {
    // ✅ SOLO INICIAR SQLite EN PLATAFORMAS NATIVAS
    if (this.platformService.shouldUseSQLite()) {
      console.log('📱 Entorno nativo detectado - Iniciando SQLite');
      this.initDB();
    } else {
      console.log('🌐 Entorno web detectado - SQLite desactivado');
    }
  }

  // ✅ INICIALIZACIÓN SOLO PARA NATIVOS
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

  // ✅ TABLAS MÍNIMAS
  private async createTables() {
    if (!this.db) return;

    try {
      // TABLA PACIENTES
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS pacientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          rut TEXT,
          email TEXT,
          telefono TEXT,
          diagnostico TEXT,
          activo BOOLEAN DEFAULT 1,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, []);
      console.log('✅ Tabla pacientes lista');

      // ✅ TABLA SESIONES (AÑADIR SI NO EXISTE)
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
      
      // Verificar si hay datos
      const result = await this.getPacientes();
      if (result.length === 0) {
        await this.addDemoData();
      }
      
    } catch (error) {
      console.error('Error creando tablas:', error);
    }
  }

  // ✅ DATOS DEMO SIMPLES
  private async addDemoData() {
    // Solo agregar datos demo en entorno nativo
    if (!this.platformService.shouldUseSQLite()) return;

    const demoPacientes = [
      { nombre: 'Ana González', email: 'ana@email.com', telefono: '+56912345678', diagnostico: 'Lumbalgia' },
      { nombre: 'Carlos Méndez', email: 'carlos@email.com', telefono: '+56923456789', diagnostico: 'Artrosis' },
      { nombre: 'María Silva', email: 'maria@email.com', telefono: '+56934567890', diagnostico: 'Tendinitis' }
    ];

    for (const paciente of demoPacientes) {
      await this.addPaciente(paciente);
    }
    console.log('✅ Datos demo agregados');
  }

  // ✅ ESPERAR INICIALIZACIÓN MEJORADA
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

  // ==================== MÉTODOS CRUD MEJORADOS ====================

  async getPacientes(): Promise<any[]> {
    // ✅ EN WEB: Retornar datos demo directamente
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🌐 Modo web - usando datos demo');
      return this.getDemoPacientes();
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 SQLite no disponible');
      return this.getDemoPacientes();
    }

    try {
      const result = await this.db.executeSql('SELECT * FROM pacientes WHERE activo = 1', []);
      const pacientes = [];
      
      for (let i = 0; i < result.rows.length; i++) {
        pacientes.push(result.rows.item(i));
      }
      
      return pacientes;
    } catch (error) {
      console.error('Error obteniendo pacientes:', error);
      return this.getDemoPacientes();
    }
  }

  async getPaciente(id: number): Promise<any> {
    // ✅ EN WEB: Retornar datos demo
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🌐 Modo web - paciente demo');
      return this.getDemoPacientes().find(p => p.id === id) || null;
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible, paciente demo');
      return this.getDemoPacientes().find(p => p.id === id) || null;
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
    // ✅ EN WEB: Simular éxito
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🌐 Modo web - paciente no guardado (simulado)');
      return { insertId: Date.now() };
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible, paciente no guardado');
      return { insertId: Date.now() };
    }

    try {
      const result = await this.db.executeSql(
        'INSERT INTO pacientes (nombre, rut, email, telefono, diagnostico) VALUES (?, ?, ?, ?, ?)',
        [paciente.nombre, paciente.rut, paciente.email, paciente.telefono, paciente.diagnostico]
      );
      
      console.log('✅ Paciente guardado:', paciente.nombre);
      return result;
    } catch (error) {
      console.error('Error guardando paciente:', error);
      throw error;
    }
  }

  async deletePaciente(id: number): Promise<any> {
    // ✅ EN WEB: Simular éxito
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🌐 Modo web - eliminación simulada');
      return { rowsAffected: 1 };
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible, eliminación simulada');
      return { rowsAffected: 1 };
    }

    try {
      const result = await this.db.executeSql(
        'DELETE FROM pacientes WHERE id = ?',
        [id]
      );
      
      console.log('✅ Paciente eliminado ID:', id);
      return result;
    } catch (error) {
      console.error('Error eliminando paciente:', error);
      throw error;
    }
  }

  async updatePaciente(id: number, paciente: any): Promise<any> {
    // ✅ EN WEB: Simular éxito
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🌐 Modo web - actualización simulada');
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
    // ✅ EN WEB: Retornar array vacío
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🌐 Modo web - sesiones vacías');
      return [];
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 DB no disponible, sesiones demo');
      return [];
    }

    try {
      const result = await this.db.executeSql(
        'SELECT * FROM sesiones WHERE paciente_id = ? ORDER BY fecha DESC',
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
    // ✅ EN WEB: Simular éxito
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🌐 Modo web - sesión no guardada (simulado)');
      return { insertId: Date.now() };
    }

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
      
      console.log('✅ Sesión guardada para paciente:', sesion.paciente_id);
      return result;
    } catch (error) {
      console.error('Error guardando sesión:', error);
      throw error;
    }
  }

  // ✅ DATOS DEMO DE FALLBACK
  private getDemoPacientes(): any[] {
    return [
      { id: 1, nombre: 'Ana González', email: 'ana@email.com', telefono: '+56912345678', diagnostico: 'Lumbalgia', activo: 1 },
      { id: 2, nombre: 'Carlos Méndez', email: 'carlos@email.com', telefono: '+56923456789', diagnostico: 'Artrosis', activo: 1 },
      { id: 3, nombre: 'María Silva', email: 'maria@email.com', telefono: '+56934567890', diagnostico: 'Tendinitis', activo: 1 }
    ];
  }

  // ✅ ESTADÍSTICAS SIMPLES
  async getEstadisticas(): Promise<any> {
    const pacientes = await this.getPacientes();
    
    return {
      totalPacientes: pacientes.length,
      pacientesActivos: pacientes.filter(p => p.activo).length,
      ultimaActualizacion: new Date().toISOString()
    };
  }
}