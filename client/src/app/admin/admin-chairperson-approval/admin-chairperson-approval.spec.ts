import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminChairpersonApproval } from './admin-chairperson-approval';

describe('AdminChairpersonApproval', () => {
  let component: AdminChairpersonApproval;
  let fixture: ComponentFixture<AdminChairpersonApproval>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminChairpersonApproval]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminChairpersonApproval);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

