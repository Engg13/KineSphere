import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { JsonServerService } from './json-server.service';

describe('JsonServer', () => {
  let service: JsonServerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        JsonServerService,
        provideHttpClient(withInterceptorsFromDi()), 
        provideHttpClientTesting()                    
      ]
    });

    service = TestBed.inject(JsonServerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
