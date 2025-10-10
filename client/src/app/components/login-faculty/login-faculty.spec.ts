import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginFaculty } from './login-faculty';

describe('LoginFaculty', () => {
  let component: LoginFaculty;
  let fixture: ComponentFixture<LoginFaculty>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginFaculty]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginFaculty);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
