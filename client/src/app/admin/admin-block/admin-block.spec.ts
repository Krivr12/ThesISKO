import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBlock } from './admin-block';

describe('AdminBlock', () => {
  let component: AdminBlock;
  let fixture: ComponentFixture<AdminBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBlock]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminBlock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
