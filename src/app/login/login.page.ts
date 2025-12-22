import { Component, inject } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  username: string = '';
  password: string = '';
  profesionalSeleccionado: string = 'Esteban';
  rememberMe: boolean = false;
  showPwd: boolean = false;
  isLoading: boolean = false;

  private navCtrl = inject(NavController);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);

  getProfesionalNombre(): string {
    const nombres: any = {
      'Esteban': 'Klgo. Esteban Gomez',
    };
    return nombres[this.profesionalSeleccionado] || 'Profesional';
  }

  togglePwd() {
    this.showPwd = !this.showPwd;
  }

  async login(form?: NgForm) {
    console.log('Login attempt:', this.username, this.password);
    
    // Validación manual antes de proceder
    const validationErrors = this.validateCredentials();
    
    if (validationErrors.length > 0) {
      // Mostrar todos los errores
      for (const error of validationErrors) {
        await this.mostrarError(error);
      }
      return;
    }
    
    this.isLoading = true;
    
    try {
      if (this.authService.login(this.username, this.password)) {
        console.log(' Login successful!');
        
        // Mostrar mensaje de éxito
        await this.mostrarExito('Inicio de sesión exitoso');
        
        // Navegar al dashboard
        this.navCtrl.navigateRoot('/dashboard');
      } else {
        console.log('❌ Login failed - Credenciales incorrectas');
        await this.mostrarError('Usuario o contraseña incorrectos');
      }
    } catch (error) {
      console.error('Error en login:', error);
      await this.mostrarError('Error al iniciar sesión');
    } finally {
      this.isLoading = false;
    }
  }

  // Método de validación personalizada
  private validateCredentials(): string[] {
    const errors: string[] = [];
    
    // Validar usuario
    if (!this.username || this.username.trim() === '') {
      errors.push('El usuario es requerido');
    } else if (this.username.length < 3) {
      errors.push('El usuario debe tener al menos 3 caracteres');
    } else if (this.username.length > 8) {
      errors.push('El usuario no puede tener más de 8 caracteres');
    } else if (!/^[a-zA-Z0-9]+$/.test(this.username)) {
      errors.push('El usuario solo puede contener letras y números');
    }
    
    // Validar contraseña
    if (!this.password || this.password.trim() === '') {
      errors.push('La contraseña es requerida');
    } else if (this.password.length !== 4) {
      errors.push('La contraseña debe tener exactamente 4 dígitos');
    } else if (!/^\d+$/.test(this.password)) {
      errors.push('La contraseña solo puede contener números');
    }
    
    return errors;
  }

  // Método para validación en tiempo real 
  validateUsernameInRealTime(): string {
    if (!this.username) return '';
    
    if (this.username.length < 3) {
      return '❌ Mínimo 3 caracteres';
    } else if (this.username.length > 8) {
      return '❌ Máximo 8 caracteres';
    } else if (!/^[a-zA-Z0-9]+$/.test(this.username)) {
      return '❌ Solo letras y números';
    }
    return '✅';
  }

  validatePasswordInRealTime(): string {
    if (!this.password) return '';
    
    if (this.password.length !== 4) {
      return '❌ Debe tener 4 dígitos';
    } else if (!/^\d+$/.test(this.password)) {
      return '❌ Solo números';
    }
    return '✅';
  }

  // Método para mostrar errores
  private async mostrarError(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom',
      buttons: [{
        text: 'OK',
        role: 'cancel'
      }]
    });
    await toast.present();
  }

  // Método para mostrar éxito
  private async mostrarExito(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2000,
      position: 'top',
      color: 'success'
    });
    await toast.present();
  }

// Animacion del placeholder
  animatedPlaceholder: string = '';
  private placeholderTexts: string[] = [
    'Ingresa tu usuario',
    '3-8 caracteres',
    'Solo letras y números'
  ];
  private currentPlaceholderIndex: number = 0;
  private placeholderInterval: any;

  ngOnInit() {
    this.startPlaceholderAnimation();
  }

  ionViewDidEnter() {
    this.startPlaceholderAnimation();
  }

  ionViewWillLeave() {
    this.stopPlaceholderAnimation();
  }

  private startPlaceholderAnimation() {
  let charIndex = 0;
  let textIndex = 0;
  let isDeleting = false;
  let typingSpeed = 100; // Velocidad al escribir
  const deletingSpeed = 300; // Velocidad al borrar 
  const pauseAfterTyping = 1500; // Pausa después de escribir
  const pauseBeforeTyping = 500; // Pausa antes de empezar nuevo
  
  const type = () => {
    const currentText = this.placeholderTexts[textIndex];
    
    if (!isDeleting) {
      
      this.animatedPlaceholder = currentText.substring(0, charIndex + 1);
      charIndex++;
      
      if (charIndex === currentText.length) {
        isDeleting = true;
        typingSpeed = pauseAfterTyping; 
      } else {
        typingSpeed = 100;
      }
    } else {
      
      this.animatedPlaceholder = currentText.substring(0, charIndex - 1);
      charIndex--;
      
      if (charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % this.placeholderTexts.length;
        typingSpeed = pauseBeforeTyping; 
      } else {
        typingSpeed = deletingSpeed; 
      }
    }
    
    this.placeholderInterval = setTimeout(type, typingSpeed);
  };
  
  type();
}

  private stopPlaceholderAnimation() {
    if (this.placeholderInterval) {
      clearTimeout(this.placeholderInterval);
    }
  }
}