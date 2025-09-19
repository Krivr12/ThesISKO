import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacultyHome } from './faculty-home';

describe('FacultyHome', () => {
  let component: FacultyHome;
  let fixture: ComponentFixture<FacultyHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacultyHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacultyHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
