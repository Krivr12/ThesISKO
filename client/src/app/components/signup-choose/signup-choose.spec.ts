import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupChoose } from './signup-choose';

describe('SignupChoose', () => {
  let component: SignupChoose;
  let fixture: ComponentFixture<SignupChoose>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupChoose]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SignupChoose);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
