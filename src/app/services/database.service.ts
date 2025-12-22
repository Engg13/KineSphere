import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { PlatformService } from './platform.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: SQLiteObject | null = null;
  private isInitialized = false;
  private hasDemoData = false;

  constructor(
    private platform: Platform,
    private sqlite: SQLite,
    private platformService: PlatformService
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
      
      // Verificar si hay datos REALES
      const result = await this.db.executeSql(
        'SELECT COUNT(*) as count FROM pacientes WHERE es_demo = 0', []
      );
      const count = result.rows.item(0).count;
      
      // Solo agregar demo si no hay datos del usuario
      if (count === 0) {
        await this.addDemoData();
        this.hasDemoData = true;
      }
      
    } catch (error) {
      console.error('Error creando tablas:', error);
    }
  }

  // DATOS DEMO 
  private async addDemoData() {
    // Solo agregar datos demo en entorno nativo
    if (!this.platformService.shouldUseSQLite()) return;

    const demoPacientes = [
      { 
        nombre: 'Ana González', 
        email: 'ana@email.com', 
        telefono: '+56912345678', 
        diagnostico: 'Lumbalgia',
        es_demo: 1  
      },
      { 
        nombre: 'Carlos Méndez', 
        email: 'carlos@email.com', 
        telefono: '+56923456789', 
        diagnostico: 'Artrosis',
        es_demo: 1  
      },
      { 
        nombre: 'María Silva', 
        email: 'maria@email.com', 
        telefono: '+56934567890', 
        diagnostico: 'Tendinitis',
        es_demo: 1  
      }
    ];

    for (const paciente of demoPacientes) {
      if (this.db) {
        await this.db.executeSql(
          'INSERT INTO pacientes (nombre, email, telefono, diagnostico, es_demo) VALUES (?, ?, ?, ?, ?)',
          [paciente.nombre, paciente.email, paciente.telefono, paciente.diagnostico, paciente.es_demo]
        );
      }
    }
    console.log('✅ Datos DEMO agregados (marcados como demo)');
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
      
      // Datos demo para desarrollo
      const demoCounts: { [key: number]: number } = {
        1: 5,
        2: 3,
        3: 7
      };
      return demoCounts[pacienteId] || 0;
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
    // Usar localStorage para datos del usuario
    if (!this.platformService.shouldUseSQLite()) {
      const userPacientes = this.getUserPacientesFromStorage();
      // Solo mostrar demo si no hay datos del usuario
      return userPacientes.length > 0 ? userPacientes : this.getDemoPacientes();
    }

    const ready = await this.waitForInit();
    if (!ready || !this.db) {
      console.log('📱 SQLite no disponible');
      return this.getDemoPacientes();
    }

    try {
      // Priorizar pacientes del usuario, demo solo si no hay datos reales
      const result = await this.db.executeSql(
        'SELECT * FROM pacientes WHERE activo = 1 AND es_demo = 0 ORDER BY id DESC', []
      );
      
      const userPacientes = [];
      for (let i = 0; i < result.rows.length; i++) {
        userPacientes.push(result.rows.item(i));
      }
      
      // Si no hay pacientes del usuario, incluir demo
      if (userPacientes.length === 0 && this.hasDemoData) {
        const demoResult = await this.db.executeSql(
          'SELECT * FROM pacientes WHERE activo = 1 AND es_demo = 1', []
        );
        
        for (let i = 0; i < demoResult.rows.length; i++) {
          userPacientes.push(demoResult.rows.item(i));
        }
      }
      
      return userPacientes;
    } catch (error) {
      console.error('Error obteniendo pacientes:', error);
      return this.getDemoPacientes();
    }
  }

  async getPaciente(id: number): Promise<any> {
    // EN WEB 
    if (!this.platformService.shouldUseSQLite()) {
      const userPacientes = this.getUserPacientesFromStorage();
      const userPaciente = userPacientes.find(p => p.id === id);
      return userPaciente || this.getDemoPacientes().find(p => p.id === id) || null;
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
    // Guardar en localStorage
    if (!this.platformService.shouldUseSQLite()) {
      const userPacientes = this.getUserPacientesFromStorage();
      const newPaciente = {
        ...paciente,
        id: Date.now(), // ID temporal
        es_demo: false,
        activo: true,
        fecha_creacion: new Date().toISOString(),
        num_sesiones: 0 // Inicialmente 0 sesiones
      };
      userPacientes.push(newPaciente);
      localStorage.setItem('user_pacientes', JSON.stringify(userPacientes));
      console.log('✅ Paciente guardado en localStorage:', paciente.nombre);
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

  async deletePaciente(id: number): Promise<any> {
    // Eliminar de localStorage
    if (!this.platformService.shouldUseSQLite()) {
      const userPacientes = this.getUserPacientesFromStorage();
      const updatedPacientes = userPacientes.filter(p => p.id !== id);
      localStorage.setItem('user_pacientes', JSON.stringify(updatedPacientes));
      // También eliminar sesiones asociadas
      localStorage.removeItem(`sesiones_${id}`);
      console.log('✅ Paciente y sesiones eliminados de localStorage ID:', id);
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
    // EN WEB - guardar en localStorage
    if (!this.platformService.shouldUseSQLite()) {
      console.log('🌐 Modo web - guardando sesión REAL en localStorage');
      
      try {
        const sesionId = Date.now();
        const sesionConId = {
          ...sesion,
          id: sesionId,
          paciente_id: Number(sesion.paciente_id), // Asegurar que es número
          paciente_nombre: sesion.paciente_nombre || '',
          fecha_creacion: new Date().toISOString(),
          creado_en: new Date().toISOString()
        };
        
        // Guardar en localStorage
        const key = `sesiones_${sesion.paciente_id}`;
        const sesionesExistentes = localStorage.getItem(key);
        let todasSesiones = [];
        
        if (sesionesExistentes) {
          todasSesiones = JSON.parse(sesionesExistentes);
        }
        
        todasSesiones.push(sesionConId);
        localStorage.setItem(key, JSON.stringify(todasSesiones));
        
        console.log(`✅ Sesión guardada en localStorage para paciente ${sesion.paciente_id}`, sesionConId);
        return { insertId: sesionId };
      } catch (error) {
        console.error('Error guardando sesión en localStorage:', error);
        return { insertId: Date.now() };
      }
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

  // DATOS DEMO DE FALLBACK 
  private getDemoPacientes(): any[] {
    return [
      { id: 1, nombre: 'Ana González', email: 'ana@email.com', telefono: '+56912345678', diagnostico: 'Lumbalgia', activo: 1, es_demo: true },
      { id: 2, nombre: 'Carlos Méndez', email: 'carlos@email.com', telefono: '+56923456789', diagnostico: 'Artrosis', activo: 1, es_demo: true },
      { id: 3, nombre: 'María Silva', email: 'maria@email.com', telefono: '+56934567890', diagnostico: 'Tendinitis', activo: 1, es_demo: true }
    ];
  }

  // ESTADÍSTICAS SIMPLES
  async getEstadisticas(): Promise<any> {
    const pacientes = await this.getPacientes();
    
    return {
      totalPacientes: pacientes.length,
      pacientesActivos: pacientes.filter(p => p.activo).length,
      pacientesReales: pacientes.filter(p => !p.es_demo).length,
      pacientesDemo: pacientes.filter(p => p.es_demo).length,
      ultimaActualizacion: new Date().toISOString()
    };
  }

  // Método para limpiar datos demo 
  async clearDemoData(): Promise<void> {
    if (!this.platformService.shouldUseSQLite()) {
      localStorage.removeItem('user_pacientes');
      // Limpiar todas las sesiones demo
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
      await this.db.executeSql('DELETE FROM pacientes WHERE es_demo = 1', []);
      this.hasDemoData = false;
      console.log('✅ Datos demo eliminados');
    } catch (error) {
      console.error('Error eliminando datos demo:', error);
    }
  }

  // ==================== MÉTODOS DEMO (MANTENER) ====================

  /**
   * Guarda una evaluación final (demo)
   */
  async guardarEvaluacion(evaluacion: any): Promise<any> {
    console.log('📄 [DEMO] Evaluación guardada simulada:', {
      id: evaluacion.id,
      paciente: evaluacion.pacienteNombre,
      fecha: new Date().toLocaleString()
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { 
      success: true, 
      message: 'Evaluación guardada exitosamente',
      id: evaluacion.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Actualiza estado del paciente (demo)
   */
  async actualizarEstadoPaciente(pacienteId: number, estado: string): Promise<any> {
    console.log('🔄 [DEMO] Estado actualizado simuladamente:', {
      pacienteId,
      nuevoEstado: estado,
      fecha: new Date().toLocaleString()
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return { 
      success: true, 
      message: `Paciente marcado como: ${estado}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Obtener evaluaciones (demo)
   */
  async getEvaluacionesPorPaciente(pacienteId: number): Promise<any[]> {
    return [
      {
        id: 'eval_001',
        fecha: '2024-01-15',
        eva: 3,
        recomendacion: 'Continuar tratamiento',
        observaciones: 'Buen progreso en movilidad'
      },
      {
        id: 'eval_002', 
        fecha: '2024-02-01',
        eva: 2,
        recomendacion: 'Alta programada',
        observaciones: 'Paciente listo para alta'
      }
    ];
  }
}