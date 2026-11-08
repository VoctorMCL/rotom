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
      <span class="status-text">{{ statusMessage() }}</span>
      @if (updateAvailable()) {
        <button class="update-btn" (click)="applyUpdate()">Actualizar</button>
      }
    </div>
  `,
  styles: [`
    .cache-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 20px;
      background: var(--bg-tertiary, #2c2c2e);
      font-size: 0.75rem;
      color: var(--text-secondary, #8e8e93);
      transition: all 0.3s ease;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-tertiary, #636366);
      transition: background 0.3s ease;
    }

    .cache-status.ready .status-dot {
      background: var(--success, #30d158);
    }

    .cache-status.updating .status-dot {
      background: var(--warning, #ffd60a);
      animation: pulse 1.5s infinite;
    }

    .update-btn {
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 8px;
      background: var(--accent, #ff3b30);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `],
})
export class CacheStatusComponent implements OnInit, OnDestroy {
  private readonly swUpdate = inject(SwUpdate);
  private subscription?: Subscription;

  readonly isReady = signal(false);
  readonly isUpdating = signal(false);
  readonly updateAvailable = signal(false);
  readonly statusMessage = signal('Verificando caché...');

  ngOnInit(): void {
    if (!this.swUpdate.isEnabled) {
      this.statusMessage.set('Service Worker deshabilitado (dev mode)');
      return;
    }

    // Listen for new versions
    this.subscription = this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateAvailable.set(true);
        this.statusMessage.set('Nueva versión disponible');
      });

    // Check cache status
    this.checkCacheStatus();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private async checkCacheStatus(): Promise<void> {
    try {
      // Check if caches exist (SW has cached everything)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const ngswCaches = cacheNames.filter((n) => n.startsWith('ngsw:'));

        if (ngswCaches.length > 0) {
          this.isReady.set(true);
          this.statusMessage.set('Rotom: 100% descargado y listo para usar sin señal');
        } else {
          this.isUpdating.set(true);
          this.statusMessage.set('Descargando contenido offline...');

          // Re-check after a delay
          setTimeout(() => this.checkCacheStatus(), 5000);
        }
      }
    } catch {
      this.statusMessage.set('Error verificando caché');
    }
  }

  async applyUpdate(): Promise<void> {
    this.isUpdating.set(true);
    this.statusMessage.set('Actualizando...');
    await this.swUpdate.activateUpdate();
    document.location.reload();
  }
}
