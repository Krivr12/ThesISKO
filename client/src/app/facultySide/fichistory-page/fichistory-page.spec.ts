import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FICHistoryPage } from './fichistory-page';

describe('FICHistoryPage', () => {
  let component: FICHistoryPage;
  let fixture: ComponentFixture<FICHistoryPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FICHistoryPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FICHistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
