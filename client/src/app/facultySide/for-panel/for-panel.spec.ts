import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForPanel } from './for-panel';

describe('ForPanel', () => {
  let component: ForPanel;
  let fixture: ComponentFixture<ForPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
