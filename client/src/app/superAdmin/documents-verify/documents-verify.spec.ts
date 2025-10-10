import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsVerify } from './documents-verify';

describe('DocumentsVerify', () => {
  let component: DocumentsVerify;
  let fixture: ComponentFixture<DocumentsVerify>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsVerify]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentsVerify);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
