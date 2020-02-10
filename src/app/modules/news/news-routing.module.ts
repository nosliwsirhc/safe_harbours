import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { NewsComponent } from './news.component';
import { ComposeArticleComponent } from './containers/compose-article/compose-article.component';
import { AuthGuard } from '../../guards/auth.guard';
import { ArticleComponent } from './containers/article/article.component';

const routes: Routes = [
  {path: '', component: NewsComponent, pathMatch: 'full'},
  {path: 'compose', component: ComposeArticleComponent, canActivate: [AuthGuard]},
  {path: ':id', component: ArticleComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NewsRoutingModule { }
