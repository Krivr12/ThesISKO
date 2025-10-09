import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForPanellanding } from './for-panellanding';

describe('ForPanellanding', () => {
  let component: ForPanellanding;
  let fixture: ComponentFixture<ForPanellanding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForPanellanding]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForPanellanding);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
