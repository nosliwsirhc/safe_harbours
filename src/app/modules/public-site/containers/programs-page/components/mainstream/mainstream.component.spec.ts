import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MainstreamComponent } from './mainstream.component';

describe('MainstreamComponent', () => {
  let component: MainstreamComponent;
  let fixture: ComponentFixture<MainstreamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MainstreamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MainstreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
