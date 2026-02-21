import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EvaScaleComponent } from './eva-scale.component';

describe('EvaScaleComponent', () => {
  let component: EvaScaleComponent;
  let fixture: ComponentFixture<EvaScaleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [IonicModule.forRoot(), EvaScaleComponent]
}).compileComponents();

    fixture = TestBed.createComponent(EvaScaleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
