import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForFIC } from './for-fic';

describe('ForFIC', () => {
  let component: ForFIC;
  let fixture: ComponentFixture<ForFIC>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForFIC]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForFIC);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
