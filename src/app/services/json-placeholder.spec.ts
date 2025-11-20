import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { JsonPlaceholderService } from './json-placeholder.service';

describe('JsonPlaceholderService', () => {
  let service: JsonPlaceholderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [JsonPlaceholderService]
    });
    service = TestBed.inject(JsonPlaceholderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verifica que no hay requests pendientes
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch posts', () => {
    const mockPosts = [
      { id: 1, title: 'Test Post 1', body: 'Test Body 1', userId: 1 },
      { id: 2, title: 'Test Post 2', body: 'Test Body 2', userId: 1 }
    ];

    service.getPosts().subscribe(posts => {
      expect(posts.length).toBe(2);
      expect(posts).toEqual(mockPosts);
    });

    const req = httpMock.expectOne(`${service['apiUrl']}/posts`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPosts);
  });

  it('should create a post', () => {
    const newPost = {
      title: 'New Post',
      body: 'New Post Body',
      userId: 1
    };

    service.createPost(newPost).subscribe(post => {
      expect(post).toEqual(newPost);
    });

    const req = httpMock.expectOne(`${service['apiUrl']}/posts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newPost);
    req.flush(newPost);
  });
});