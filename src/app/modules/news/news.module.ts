import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { NewsRoutingModule } from './news-routing.module';

import { NewsComponent } from './news.component';

import { ComposeArticleComponent } from './containers/compose-article/compose-article.component';
import { ArticleComponent } from './containers/article/article.component';

@NgModule({
  declarations: [
    NewsComponent,
    ComposeArticleComponent,
    ArticleComponent
  ],
  imports: [
    SharedModule,
    NewsRoutingModule
  ]
})
export class NewsModule { }
