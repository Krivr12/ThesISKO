import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperAdminNavBar } from './super-admin-nav-bar';

describe('SuperAdminNavBar', () => {
  let component: SuperAdminNavBar;
  let fixture: ComponentFixture<SuperAdminNavBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperAdminNavBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuperAdminNavBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
