import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDocuments } from './admin-documents';

describe('AdminDocuments', () => {
  let component: AdminDocuments;
  let fixture: ComponentFixture<AdminDocuments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDocuments]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDocuments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
