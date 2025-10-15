import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminChairpersonDetails } from './admin-chairperson-details';

describe('AdminChairpersonDetails', () => {
  let component: AdminChairpersonDetails;
  let fixture: ComponentFixture<AdminChairpersonDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminChairpersonDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminChairpersonDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

