import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminChairpersons } from './admin-chairpersons';

describe('AdminChairpersons', () => {
  let component: AdminChairpersons;
  let fixture: ComponentFixture<AdminChairpersons>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminChairpersons]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminChairpersons);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
