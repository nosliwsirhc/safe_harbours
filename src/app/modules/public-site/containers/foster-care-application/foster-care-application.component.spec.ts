import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FosterCareApplicationComponent } from './foster-care-application.component';

describe('FosterCareApplicationComponent', () => {
  let component: FosterCareApplicationComponent;
  let fixture: ComponentFixture<FosterCareApplicationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FosterCareApplicationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FosterCareApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
