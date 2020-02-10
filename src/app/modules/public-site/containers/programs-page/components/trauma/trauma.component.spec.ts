import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TraumaComponent } from './trauma.component';

describe('TraumaComponent', () => {
  let component: TraumaComponent;
  let fixture: ComponentFixture<TraumaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TraumaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TraumaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
