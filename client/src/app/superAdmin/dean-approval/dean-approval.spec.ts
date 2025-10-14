import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeanApproval } from './dean-approval';

describe('DeanApproval', () => {
  let component: DeanApproval;
  let fixture: ComponentFixture<DeanApproval>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeanApproval]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeanApproval);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

