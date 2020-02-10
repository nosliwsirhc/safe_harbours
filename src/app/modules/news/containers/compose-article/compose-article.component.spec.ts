import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ComposeArticleComponent } from './compose-article.component';

describe('ComposeArticleComponent', () => {
  let component: ComposeArticleComponent;
  let fixture: ComponentFixture<ComposeArticleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ComposeArticleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComposeArticleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
