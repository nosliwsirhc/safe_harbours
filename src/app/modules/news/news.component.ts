import { Component, OnInit } from '@angular/core';
// import { TransferState, makeStateKey } from '@angular/platform-browser';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IArticle } from '../..//models/article.model';
import { faClock, faUser } from '@fortawesome/free-regular-svg-icons';
import { SeoService } from '../../services/seo.service';

// The state saved from the server render
// const DATA = makeStateKey<any>('articles');

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit {

  faClock = faClock;
  faUser = faUser;

  articles$: Observable<IArticle[]>;

  constructor(
    private afs: AngularFirestore,
    private seo: SeoService
    // private state: TransferState
  ) { }

  ngOnInit() {
    this.seo.generateTags({
      title: 'Foster Care News',
      description: 'Foster care in Ontario is changing. Stay informed with our latest news from the foster care sector.',
      slug: 'news'
    });
    // If state is available, start with it your observable
    // const exists = this.state.get(DATA, [] as any);

    this.articles$ = this.afs.collection<IArticle>('articles', ref => ref.where('published', '==', true)).snapshotChanges().pipe(
      // tap(list => {
      //   this.state.set(DATA, list);
      // }),
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as IArticle;
        const publishedTime = data.publishedTime;
        const id = a.payload.doc.id;
        return { ...data, id, publishedTime } as IArticle;
      })),
      // startWith(exists)
    );
  }

}
