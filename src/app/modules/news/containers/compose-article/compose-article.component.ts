import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { COMMA, ENTER, TAB } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { AngularFirestore } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { faUpload } from '@fortawesome/free-solid-svg-icons';
import { IArticle } from '../../../../models/article.model';

import * as moment from 'moment';
import { MAT_DATE_FORMATS } from '@angular/material/core';

const MY_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'LL',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-compose-article',
  templateUrl: './compose-article.component.html',
  styleUrls: ['./compose-article.component.scss'],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS }
  ]
})
export class ComposeArticleComponent implements OnInit {

  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA, TAB];
  keywords: string[] = [];

  faUpload = faUpload;
  editorContent = '';

  public articleForm: FormGroup;
  public titleLength$: BehaviorSubject<number> = new BehaviorSubject(0);
  public descriptionLength$: BehaviorSubject<number> = new BehaviorSubject(0);

  task: AngularFireUploadTask;
  percentage: Observable<number>;
  snapshot: Observable<any>;
  isHovering: boolean;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private storage: AngularFireStorage,
    private sb: MatSnackBar, 
    private afs: AngularFirestore) { }

  ngOnInit() {
    this.articleForm = this.initArticleForm();
    this.articleForm.valueChanges.subscribe(value => {
      this.titleLength$.next(value.title.length);
      this.descriptionLength$.next(value.description.length);
      this.editorContent = value.content;
      this.articleForm.patchValue({ slug: this.cleanSlug(value.title) }, { emitEvent: false });
    });
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.keywords.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  remove(keyword: string): void {
    const index = this.keywords.indexOf(keyword);

    if (index >= 0) {
      this.keywords.splice(index, 1);
    }
  }

  toggleHover(event: Event) {
    this.isHovering = !!event;
  }

  startUpload(event: Event) {
    // The File object
    const file = event.target['files'].item(0);

    // Client-side validation example
    if (file.type.split('/')[0] !== 'image') {
      console.error('unsupported file type :(');
      return;
    }

    // The storage path
    const path = `images/${new Date().getTime()}_${file.name}`;

    // Totally optional metadata
    // const customMetadata = { app: 'My AngularFire-powered PWA!' };

    // The main task
    this.task = this.storage.upload(path, file);

    // Progress monitoring
    this.percentage = this.task.percentageChanges();
    this.snapshot = this.task.snapshotChanges();

    // The file's download URL
    this.snapshot.pipe(
      finalize(() => {
        // this.downloadURL = this.storage.ref(path).getDownloadURL();
        this.storage.ref(path).getDownloadURL().toPromise().then(imgUrl => this.articleForm.patchValue({ imgUrl }));
      })
    ).subscribe();
  }

  // Determines if the upload task is active
  isActive(snapshot) {
    return snapshot.state === 'running' && snapshot.bytesTransferred < snapshot.totalBytes;
  }

  initArticleForm() {
    return this.fb.group({
      title: ['', Validators.compose([Validators.required, Validators.minLength(2), Validators.maxLength(60)])],
      description: ['', Validators.compose([Validators.required, Validators.minLength(2), Validators.maxLength(155)])],
      slug: ['', Validators.compose([Validators.required])],
      imgUrl: [''],
      imgAlt: [''],
      content: ['', Validators.compose([Validators.required])],
      publishedTime: [moment()],
      published: [false]
    });
  }

  cleanSlug(title: string) {
    return title.toLowerCase().replace(/(^\s+|[^a-zA-Z0-9 ]+|\s+$)/g, "").replace(/\s+/g, "-");
  }

  publish() {
    const formValues = this.articleForm.value;
    const article: IArticle = { ...formValues, publishedTime: formValues.publishedTime._d, keywords: this.keywords, published: true };
    this.afs.doc<IArticle>(`articles/${article.slug}`).set(article)
      .then(() => this.router.navigateByUrl(`/news/${article.slug}`))
      .catch(() => this.sb.open('Failed to Publish Article', null, { duration: 3000 }));
  }

  save() {
    const formValues = this.articleForm.value;
    const article: IArticle = { ...formValues, publishedTime: formValues.publishedTime._d, keywords: this.keywords };
    this.afs.doc<IArticle>(`articles/${article.slug}`).set(article)
      .then(() => this.router.navigateByUrl(`/news/${article.slug}`))
      .catch(() => this.sb.open('Failed to Publish Article', null, { duration: 3000 }));
  }

}
