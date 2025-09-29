import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForFICLanding } from './for-ficlanding';

describe('ForFICLanding', () => {
  let component: ForFICLanding;
  let fixture: ComponentFixture<ForFICLanding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForFICLanding]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForFICLanding);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
