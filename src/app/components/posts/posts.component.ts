import { Component, OnInit } from '@angular/core';
import { JsonPlaceholderService } from '../../services/json-placeholder.service';

@Component({
  selector: 'app-posts',
  templateUrl: './posts.component.html',
  styleUrls: ['./posts.component.scss'],
  standalone: false
})
export class PostsComponent implements OnInit {
  posts: any[] = [];
  newPost = {
    title: '',
    body: '',
    userId: 1
  };
  loading = false;

  constructor(private jsonPlaceholderService: JsonPlaceholderService) { }

  ngOnInit() {
    this.loadPosts();
  }

  loadPosts() {
    this.loading = true;
    this.jsonPlaceholderService.getPosts().subscribe({
      next: (posts) => {
        this.posts = posts.slice(0, 5); // Solo primeros 5 posts
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading posts:', error);
        this.loading = false;
      }
    });
  }

  createPost() {
    if (!this.newPost.title || !this.newPost.body) {
      alert('Por favor completa título y contenido');
      return;
    }

    this.jsonPlaceholderService.createPost(this.newPost).subscribe({
      next: (response) => {
        console.log('Post creado:', response);
        alert('Post creado exitosamente en JSONPlaceholder');
        this.newPost = { title: '', body: '', userId: 1 };
        this.loadPosts(); // Recargar lista
      },
      error: (error) => {
        console.error('Error creando post:', error);
        alert(' Error creando post');
      }
    });
  }

  deletePost(id: number) {
    this.jsonPlaceholderService.deletePost(id).subscribe({
      next: () => {
        console.log('Post eliminado:', id);
        alert(' Post eliminado exitosamente');
        this.loadPosts(); // Recargar lista
      },
      error: (error) => {
        console.error('Error eliminando post:', error);
        alert(' Error eliminando post');
      }
    });
  }
}