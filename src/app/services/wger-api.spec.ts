import { TestBed } from '@angular/core/testing';
import { WgerApiService } from './wger-api.service';

describe('WgerApiService', () => {
  let service: WgerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WgerApiService]
    });
    service = TestBed.inject(WgerApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});