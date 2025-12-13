import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular'; 
import { LoginPage } from './login.page';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; 

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(async () => { 
    // CONFIGURAR EL TestBed 
    await TestBed.configureTestingModule({
      declarations: [LoginPage], 
      imports: [
        IonicModule.forRoot(),   
        FormsModule,             
        ReactiveFormsModule      
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA] 
    }).compileComponents(); 

    
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});