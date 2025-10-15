import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeanDetails } from './dean-details';

describe('DeanDetails', () => {
  let component: DeanDetails;
  let fixture: ComponentFixture<DeanDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeanDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeanDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

