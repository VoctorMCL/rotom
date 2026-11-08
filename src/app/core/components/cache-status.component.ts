import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-cache-status',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cache-status" [class.ready]="isReady()" [class.updating]="isUpdating()">
      <div class="status-dot"></div>
      <span class="status-text">{{ statusShortMessage() }}</span>
      @if (updateAvailable()) {
        <button class="pixel-update-btn" (click)="applyUpdate()">ACTUALIZAR</button>
      }
    </div>
  `,
  styles: [`
    .cache-status {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.55rem;
      border: 2px solid var(--border-bright, #00ff66);
      background: #091409;
      box-shadow: 2px 2px 0px #000;
      font-family: var(--font-pixel, monospace);
      font-size: 0.55rem;
      color: var(--text-secondary, #74ad74);
      transition: all 0.2s ease;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      background: #3e683e;
      box-shadow: 0 0 2px #000;
    }

    .cache-status.ready {
      color: var(--accent, #00ff66);
      .status-dot {
        background: var(--accent, #00ff66);
        box-shadow: 0 0 6px var(--accent, #00ff66);
      }
    }

    .cache-status.updating {
      color: var(--warning, #ffd60a);
      border-color: var(--warning, #ffd60a);
      .status-dot {
        background: var(--warning, #ffd60a);
        animation: pulse 1s infinite;
      }
    }

    .pixel-update-btn {
      padding: 0.2rem 0.4rem;
      border: 1px solid #000;
      background: var(--warning, #ffd60a);
      color: #000;
      font-family: var(--font-pixel, monospace);
      font-size: 0.5rem;
      font-weight: 700;
      cursor: pointer;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `],
})
export class CacheStatusComponent implements OnInit, OnDestroy {
  private readonly swUpdate = inject(SwUpdate);
  private subscription?: Subscription;

  readonly isReady = signal(false);
  readonly isUpdating = signal(false);
  readonly updateAvailable = signal(false);
  readonly statusShortMessage = signal('ONLINE');

  ngOnInit(): void {
    if (!this.swUpdate.isEnabled) {
      this.statusShortMessage.set('OFFLINE READY');
      this.isReady.set(true);
      return;
    }

    this.subscription = this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateAvailable.set(true);
        this.statusShortMessage.set('NUEVO PARCHE');
      });

    this.checkCacheStatus();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private async checkCacheStatus(): Promise<void> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const ngswCaches = cacheNames.filter((n) => n.startsWith('ngsw:'));

        if (ngswCaches.length > 0) {
          this.isReady.set(true);
          this.statusShortMessage.set('100% OFFLINE');
        } else {
          this.isUpdating.set(true);
          this.statusShortMessage.set('DESCARGANDO...');
          setTimeout(() => this.checkCacheStatus(), 4000);
        }
      }
    } catch {
      this.statusShortMessage.set('LOCAL');
    }
  }

  async applyUpdate(): Promise<void> {
    this.isUpdating.set(true);
    this.statusShortMessage.set('APLICANDO...');
    await this.swUpdate.activateUpdate();
    document.location.reload();
  }
}
