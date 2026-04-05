import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxResourcePlus } from './ngx-resource-plus';

describe('NgxResourcePlus', () => {
  let component: NgxResourcePlus;
  let fixture: ComponentFixture<NgxResourcePlus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxResourcePlus],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxResourcePlus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
