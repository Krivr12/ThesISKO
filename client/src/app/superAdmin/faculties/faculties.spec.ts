import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Faculties } from './faculties';

describe('Faculties', () => {
  let component: Faculties;
  let fixture: ComponentFixture<Faculties>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Faculties]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Faculties);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

