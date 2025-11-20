import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class JsonPlaceholderService {
  private apiUrl = 'https://jsonplaceholder.typicode.com';

  constructor(private http: HttpClient) { }

  //  MÉTODOS PARA POSTS 
  getPosts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/posts`);
  }

  getPost(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/posts/${id}`);
  }

  createPost(post: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/posts`, post);
  }

  updatePost(id: number, post: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/posts/${id}`, post);
  }

  deletePost(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/posts/${id}`);
  }

  // MÉTODOS ADICIONALES 
  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`);
  }

  getComments(): Observable<any> {
    return this.http.get(`${this.apiUrl}/comments`);
  }

  getCommentsByPost(postId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/posts/${postId}/comments`);
  }
}