import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Chairperson } from './chairperson';

describe('Chairperson', () => {
  let component: Chairperson;
  let fixture: ComponentFixture<Chairperson>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Chairperson]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Chairperson);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
