import { Component } from '@angular/core';

@Component({
  selector: 'app-posts-page',
  templateUrl: './posts.page.html', 
  styleUrls: ['./posts.page.scss'],
  standalone: false
})
export class PostsPage {
  
  constructor() {
    console.log('🎯 DEBUG: PostsPage CONSTRUCTOR ejecutado');
  }

  ngOnInit() {
    console.log('🎯 DEBUG: PostsPage ngOnInit ejecutado');
  }

  ionViewDidEnter() {
    console.log('🎯 DEBUG: PostsPage ION_VIEW_DID_ENTER - ¡Página visible!');
  }
}