import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BackupData } from '../models/interfaces';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Injectable({
  providedIn: 'root'
})
export class BackupService {

  constructor(private platform: Platform) {}

  /**
   * Recolecta todos los datos locales y genera un objeto BackupData
   */
  generarBackup(): BackupData {
    const pacientes = this.obtenerPacientes();
    const sesiones: { [key: string]: any[] } = {};
    const documentos: { [key: string]: any[] } = {};

    // Recolectar sesiones y documentos por paciente
    for (const paciente of pacientes) {
      const id = String(paciente.id);

      // Sesiones
      try {
        const storedSesiones = localStorage.getItem(`sesiones_${id}`);
        if (storedSesiones) {
          sesiones[id] = JSON.parse(storedSesiones);
        }
      } catch { /* sin sesiones */ }

      // Documentos
      try {
        const storedDocs = localStorage.getItem(`documentos_${id}`);
        if (storedDocs) {
          documentos[id] = JSON.parse(storedDocs);
        }
      } catch { /* sin documentos */ }
    }

    return {
      version: '1.0.0',
      fecha: new Date().toISOString(),
      app: 'KineSphere',
      pacientes,
      sesiones,
      documentos
    };
  }

  /**
   * Exporta los datos como archivo JSON descargable
   */
  async exportarDatos(): Promise<{ success: boolean; message: string }> {
    try {
      const backup = this.generarBackup();
      const jsonString = JSON.stringify(backup, null, 2);
      const fileName = `kinesphere_backup_${new Date().toISOString().split('T')[0]}.json`;

      if (this.platform.is('hybrid')) {
        return await this.exportarEnDispositivo(jsonString, fileName);
      } else {
        return this.exportarEnWeb(jsonString, fileName);
      }
    } catch (error) {
      console.error('Error exportando datos:', error);
      return { success: false, message: 'Error al exportar datos' };
    }
  }

  /**
   * Exporta en dispositivo nativo usando Filesystem + Share
   */
  private async exportarEnDispositivo(jsonString: string, fileName: string): Promise<{ success: boolean; message: string }> {
    try {
      // Guardar archivo en el dispositivo
      const result = await Filesystem.writeFile({
        path: fileName,
        data: jsonString,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      // Compartir para que el usuario lo envie a Drive, WhatsApp, etc.
      await Share.share({
        title: 'Backup KineSphere',
        text: `Respaldo de datos KineSphere - ${new Date().toLocaleDateString('es-CL')}`,
        url: result.uri,
        dialogTitle: 'Guardar respaldo en...'
      });

      return {
        success: true,
        message: `Backup guardado: ${fileName}`
      };
    } catch (error) {
      console.error('Error exportando en dispositivo:', error);
      return { success: false, message: 'Error al guardar en dispositivo' };
    }
  }

  /**
   * Exporta en navegador web descargando el archivo
   */
  private exportarEnWeb(jsonString: string, fileName: string): { success: boolean; message: string } {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: `Archivo descargado: ${fileName}`
    };
  }

  /**
   * Importa datos desde un archivo JSON de backup
   */
  async importarDatos(jsonString: string): Promise<{ success: boolean; message: string; stats?: any }> {
    try {
      const backup: BackupData = JSON.parse(jsonString);

      // Validar formato
      if (!backup.app || backup.app !== 'KineSphere') {
        return { success: false, message: 'El archivo no es un backup valido de KineSphere' };
      }

      if (!backup.pacientes || !Array.isArray(backup.pacientes)) {
        return { success: false, message: 'El archivo no contiene datos de pacientes' };
      }

      let pacientesImportados = 0;
      let sesionesImportadas = 0;
      let documentosImportados = 0;

      // Importar pacientes
      const pacientesExistentes = this.obtenerPacientes();
      const idsExistentes = new Set(pacientesExistentes.map(p => String(p.id)));

      for (const paciente of backup.pacientes) {
        if (!idsExistentes.has(String(paciente.id))) {
          pacientesExistentes.push(paciente);
          pacientesImportados++;
        }
      }
      localStorage.setItem('user_pacientes', JSON.stringify(pacientesExistentes));

      // Importar sesiones
      if (backup.sesiones) {
        for (const [patientId, sesiones] of Object.entries(backup.sesiones)) {
          const key = `sesiones_${patientId}`;
          const existentes = this.obtenerArray(key);
          const idsExistentes = new Set(existentes.map((s: any) => String(s.id)));

          for (const sesion of sesiones) {
            if (!idsExistentes.has(String(sesion.id))) {
              existentes.push(sesion);
              sesionesImportadas++;
            }
          }
          localStorage.setItem(key, JSON.stringify(existentes));
        }
      }

      // Importar documentos
      if (backup.documentos) {
        for (const [patientId, docs] of Object.entries(backup.documentos)) {
          const key = `documentos_${patientId}`;
          const existentes = this.obtenerArray(key);
          const idsExistentes = new Set(existentes.map((d: any) => String(d.id)));

          for (const doc of docs) {
            if (!idsExistentes.has(String(doc.id))) {
              existentes.push(doc);
              documentosImportados++;
            }
          }
          localStorage.setItem(key, JSON.stringify(existentes));
        }
      }

      const stats = {
        pacientes: pacientesImportados,
        sesiones: sesionesImportadas,
        documentos: documentosImportados,
        fechaBackup: backup.fecha
      };

      return {
        success: true,
        message: `Importados: ${pacientesImportados} pacientes, ${sesionesImportadas} sesiones, ${documentosImportados} documentos`,
        stats
      };
    } catch (error) {
      console.error('Error importando datos:', error);
      return { success: false, message: 'Error al leer el archivo de backup. Verifica que sea un JSON valido.' };
    }
  }

  /**
   * Lee archivo JSON desde un input file del navegador
   */
  leerArchivoWeb(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsText(file);
    });
  }

  /**
   * Obtiene estadisticas del backup actual
   */
  obtenerEstadisticasLocales(): { pacientes: number; sesiones: number; documentos: number } {
    const pacientes = this.obtenerPacientes();
    let totalSesiones = 0;
    let totalDocumentos = 0;

    for (const p of pacientes) {
      totalSesiones += this.obtenerArray(`sesiones_${p.id}`).length;
      totalDocumentos += this.obtenerArray(`documentos_${p.id}`).length;
    }

    return { pacientes: pacientes.length, sesiones: totalSesiones, documentos: totalDocumentos };
  }

  private obtenerPacientes(): any[] {
    try {
      const stored = localStorage.getItem('user_pacientes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private obtenerArray(key: string): any[] {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}
