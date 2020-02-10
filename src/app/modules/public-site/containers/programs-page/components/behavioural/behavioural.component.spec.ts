import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BehaviouralComponent } from './behavioural.component';

describe('BehaviouralComponent', () => {
  let component: BehaviouralComponent;
  let fixture: ComponentFixture<BehaviouralComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BehaviouralComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BehaviouralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
