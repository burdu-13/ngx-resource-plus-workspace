import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { createMockResourcePlus } from 'ngx-resource-plus/testing';

describe('App Component (Demo)', () => {
  let fixture: ComponentFixture<App>;
  let component: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
  });

  it('should display the SWR revalidating badge when data is stale', () => {
    const mock = createMockResourcePlus('Initial Data');
    Object.defineProperty(component, 'enhanced', { value: mock });

    mock.internalIsStale.set(true);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.revalidating-badge'));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent).toContain('Revalidating');
  });

  it('should display the retry attempt pill when a network error occurs', () => {
    const mock = createMockResourcePlus<string>();
    Object.defineProperty(component, 'enhanced', { value: mock });

    mock.internalRetryAttempt.set(2);
    fixture.detectChanges();

    const pill = fixture.debugElement.query(By.css('.pill.warning'));
    expect(pill).toBeTruthy();
    expect(pill.nativeElement.textContent).toContain('Retry: 2');
  });
});
