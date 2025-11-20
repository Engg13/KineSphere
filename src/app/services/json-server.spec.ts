import { TestBed } from '@angular/core/testing';

import { JsonServer } from './json-server';

describe('JsonServer', () => {
  let service: JsonServer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JsonServer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
