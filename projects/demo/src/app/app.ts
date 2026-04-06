import {
  ChangeDetectionStrategy,
  Component,
  resource,
  ResourceLoaderParams,
  signal,
  WritableSignal,
} from '@angular/core';
import { resourcePlus } from 'ngx-resource-plus';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly requestTrigger: WritableSignal<number> = signal(0);

  private createFlakyApi(identifier: string) {
    let attemptCounter = 0;

    return async (ctx: ResourceLoaderParams<number>): Promise<string> => {
      attemptCounter++;
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (attemptCounter % 3 !== 0) {
        throw new Error(`[${identifier}] Network failure on attempt ${attemptCounter}`);
      }

      return `Secure Payload Data v${ctx.params}`;
    };
  }

  public readonly native = resource({
    params: () => this.requestTrigger(),
    loader: this.createFlakyApi('Native API'),
  });

  public readonly enhanced = resourcePlus({
    params: () => this.requestTrigger(),
    loader: this.createFlakyApi('Enhanced API'),
  });

  public triggerReload(): void {
    this.requestTrigger.update((v) => v + 1);
  }
}
