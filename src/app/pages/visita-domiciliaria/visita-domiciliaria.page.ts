import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { NavController, AlertController, LoadingController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { ActivatedRoute } from '@angular/router';

declare var google: any;

@Component({
  selector: 'app-visita-domiciliaria',
  templateUrl: './visita-domiciliaria.page.html',
  styleUrls: ['./visita-domiciliaria.page.scss'],
  standalone: false
})
export class VisitaDomiciliariaPage implements OnInit, OnDestroy {
  @ViewChild('map', { static: false }) mapElement!: ElementRef;
  
  paciente: any = null;
  ubicacionActual: any = null;
  map: any = null;
  marker: any = null;
  estaCargando: boolean = false;
  watchId: string = '';

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    // Obtener datos del paciente
    this.route.queryParams.subscribe((params: any) => {
      if (params['pacienteId']) {
        this.paciente = {
          id: params['pacienteId'],
          nombre: params['pacienteNombre'] || 'Paciente'
        };
      }
    });

    await this.obtenerUbicacionActual();
  }

  ngOnDestroy() {
    this.detenerSeguimientoUbicacion();
  }

  // ✅ OBTENER UBICACIÓN ACTUAL
  async obtenerUbicacionActual() {
    this.estaCargando = true;
    const loading = await this.loadingController.create({
      message: 'Obteniendo ubicación...'
    });
    await loading.present();

    try {
      // Verificar permisos
      const permisos = await Geolocation.checkPermissions();
      console.log('📍 Permisos de ubicación:', permisos);

      if (permisos.location !== 'granted') {
        const nuevosPermisos = await Geolocation.requestPermissions();
        if (nuevosPermisos.location !== 'granted') {
          throw new Error('Permisos de ubicación denegados');
        }
      }

      // Obtener ubicación actual
      const coordenadas = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      this.ubicacionActual = {
        latitud: coordenadas.coords.latitude,
        longitud: coordenadas.coords.longitude,
        precision: coordenadas.coords.accuracy,
        timestamp: new Date(coordenadas.timestamp)
      };

      console.log('📍 Ubicación obtenida:', this.ubicacionActual);
      
      // Inicializar mapa
      await this.inicializarMapa();
      
      this.mostrarMensaje('Ubicación obtenida exitosamente');

    } catch (error) {
      console.error('❌ Error obteniendo ubicación:', error);
      this.mostrarError('No se pudo obtener la ubicación. Verifica los permisos de GPS.');
    } finally {
      await loading.dismiss();
      this.estaCargando = false;
    }
  }

  // ✅ INICIALIZAR MAPA GOOGLE
  async inicializarMapa() {
    if (!this.ubicacionActual) return;

    try {
      // Cargar Google Maps API dinámicamente
      await this.cargarGoogleMaps();

      const mapOptions = {
        center: new google.maps.LatLng(
          this.ubicacionActual.latitud,
          this.ubicacionActual.longitud
        ),
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ]
      };

      this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

      // Agregar marcador
      this.marker = new google.maps.Marker({
        position: mapOptions.center,
        map: this.map,
        title: `Ubicación actual - ${this.paciente?.nombre || 'Visita'}`,
        animation: google.maps.Animation.DROP,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        }
      });

      // Agregar info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 10px;">
            <h3>📍 Ubicación de Visita</h3>
            <p><strong>Paciente:</strong> ${this.paciente?.nombre || 'No especificado'}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
            <p><strong>Coordenadas:</strong><br>
            Lat: ${this.ubicacionActual.latitud.toFixed(6)}<br>
            Lng: ${this.ubicacionActual.longitud.toFixed(6)}</p>
          </div>
        `
      });

      this.marker.addListener('click', () => {
        infoWindow.open(this.map, this.marker);
      });

      console.log('🗺️ Mapa inicializado correctamente');

    } catch (error) {
      console.error('❌ Error inicializando mapa:', error);
      this.mostrarError('Error cargando el mapa');
    }
  }

  // ✅ CARGAR GOOGLE MAPS API
  private cargarGoogleMaps(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=TU_API_KEY&libraries=geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Error cargando Google Maps'));
      
      document.head.appendChild(script);
    });
  }

  // ✅ SEGUIMIENTO EN TIEMPO REAL
  async iniciarSeguimientoUbicacion() {
    try {
      this.watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000
      }, (position, err) => {
        if (err) {
          console.error('Error seguimiento ubicación:', err);
          return;
        }

        if (position) {
          this.ubicacionActual = {
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            precision: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          };

          // Actualizar marcador en mapa
          if (this.marker && this.map) {
            const newPosition = new google.maps.LatLng(
              this.ubicacionActual.latitud,
              this.ubicacionActual.longitud
            );
            this.marker.setPosition(newPosition);
            this.map.setCenter(newPosition);
          }

          console.log('📍 Ubicación actualizada:', this.ubicacionActual);
        }
      });

      this.mostrarMensaje('Seguimiento de ubicación activado');

    } catch (error) {
      console.error('❌ Error iniciando seguimiento:', error);
    }
  }

  // ✅ DETENER SEGUIMIENTO
  async detenerSeguimientoUbicacion() {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = '';
      console.log('📍 Seguimiento de ubicación detenido');
    }
  }

  // ✅ GUARDAR VISITA CON UBICACIÓN
  async guardarVisitaDomiciliaria() {
    if (!this.ubicacionActual || !this.paciente) {
      this.mostrarError('No hay ubicación o paciente seleccionado');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Visita',
      message: `¿Guardar visita domiciliaria para ${this.paciente.nombre} en la ubicación actual?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async () => {
            await this.ejecutarGuardadoVisita();
          }
        }
      ]
    });

    await alert.present();
  }

  private async ejecutarGuardadoVisita() {
    const loading = await this.loadingController.create({
      message: 'Guardando visita...'
    });
    await loading.present();

    try {
      const visita = {
        id: 'V' + Date.now(),
        pacienteId: this.paciente.id,
        pacienteNombre: this.paciente.nombre,
        ubicacion: this.ubicacionActual,
        fecha: new Date().toISOString(),
        tipo: 'domiciliaria',
        estado: 'completada'
      };

      // Aquí guardarías en tu base de datos
      console.log('💾 Visita guardada:', visita);
      
      await loading.dismiss();
      this.mostrarMensaje('Visita domiciliaria guardada exitosamente');
      
      // Volver al detalle del paciente
      setTimeout(() => {
        this.navCtrl.navigateBack('/paciente-detalle');
      }, 2000);

    } catch (error) {
      await loading.dismiss();
      this.mostrarError('Error guardando la visita');
    }
  }

  // ✅ MENSAJES
  private async mostrarMensaje(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Éxito',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async mostrarError(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  // ✅ VOLVER
  volverAlPaciente() {
    this.navCtrl.navigateBack('/paciente-detalle');
  }
}