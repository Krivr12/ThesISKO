import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchThesis } from './search-thesis';

describe('SearchThesis', () => {
  let component: SearchThesis;
  let fixture: ComponentFixture<SearchThesis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchThesis]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchThesis);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});