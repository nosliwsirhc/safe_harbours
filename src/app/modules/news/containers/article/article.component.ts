import { Component, OnInit, ViewEncapsulation } from '@angular/core';
// import { TransferState, makeStateKey } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { switchMap, map, tap, startWith } from 'rxjs/operators';
import { IArticle } from '../../../..//models/article.model';
import { SeoService } from '../../../../services/seo.service';

// const DATA = makeStateKey<any>('article');

@Component({
  selector: 'app-article',
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ArticleComponent implements OnInit {

  article$: Observable<IArticle>;

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private seo: SeoService,
    // private state: TransferState
  ) { }

  ngOnInit() {
    // const exists = this.state.get(DATA, {} as any);

    this.article$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        return this.afs.doc<IArticle>(`articles/${id}`).valueChanges().pipe(
          tap(article => {
            // this.state.set(DATA, article);
            this.seo.generateTags({
              title: article.title,
              description: article.description,
              slug: `news/${article.slug}`,
              image: article.imgUrl
            })
          }),
          // map(article => {
          //   const publishedDate = new Date(article.publishedTime.seconds * 1000);
          //   return { ...article, publishedDate };
          // }),
          // startWith(exists)
        );
      })
    );
  }

}
