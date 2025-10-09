import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsIssues } from './documents-issues';

describe('DocumentsIssues', () => {
  let component: DocumentsIssues;
  let fixture: ComponentFixture<DocumentsIssues>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsIssues]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentsIssues);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
