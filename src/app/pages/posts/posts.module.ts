import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PostsPageRoutingModule } from './posts-routing.module';
import { PostsPage } from './posts.page';
import { PostsComponent } from '../../components/posts/posts.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PostsPageRoutingModule
  ],
  declarations: [
    PostsPage,
    PostsComponent
  ]
})
export class PostsPageModule {}