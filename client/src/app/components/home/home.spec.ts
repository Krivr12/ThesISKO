import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Home } from './home';

declare global {
  function describe(description: string, specDefinitions: () => void): void;
  function it(expectation: string, assertion: () => void): void;
  function beforeEach(action: () => void): void;
  function expect(actual: any): any;
}

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
