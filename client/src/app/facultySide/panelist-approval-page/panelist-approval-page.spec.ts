import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelistApprovalPage } from './panelist-approval-page';

describe('PanelistApprovalPage', () => {
  let component: PanelistApprovalPage;
  let fixture: ComponentFixture<PanelistApprovalPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelistApprovalPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelistApprovalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
