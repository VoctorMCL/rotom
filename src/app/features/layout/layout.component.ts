import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CacheStatusComponent } from '../../core/components/cache-status.component';
import { StorageService } from '../../core/services/storage.service';
import { LocalLockService } from '../../core/services/local-lock.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CacheStatusComponent],
  template: `
    <div class="app-shell">
      <!-- Header / Top Safe Area -->
      <header class="app-header">
        <div class="brand">
          <img src="assets/images/rotom/rotom-sprite.webp" alt="Rotom" class="brand-sprite" />
          <span class="brand-title">ROTOM</span>
        </div>
        <div class="header-actions">
          <app-cache-status></app-cache-status>
          <button class="pixel-icon-btn lock-btn" (click)="lockApp()" title="Bloquear">
            🔒
          </button>
        </div>
      </header>

      <!-- Main Content Outlet -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- iOS Bottom Tab Bar Retro Game Boy Style -->
      <nav class="bottom-tab-bar">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="tab-item">
          <span class="tab-icon">🏠</span>
          <span class="tab-label">INICIO</span>
        </a>

        <a routerLink="/wiki" routerLinkActive="active" class="tab-item">
          <span class="tab-icon">📖</span>
          <span class="tab-label">DEX</span>
        </a>

        <a routerLink="/shopping" routerLinkActive="active" class="tab-item">
          <span class="tab-icon">
            🛒
            @if (storage.uncheckedShoppingCount() > 0) {
              <span class="pixel-badge">{{ storage.uncheckedShoppingCount() }}</span>
            }
          </span>
          <span class="tab-label">ITEMS</span>
        </a>

        <a routerLink="/todo" routerLinkActive="active" class="tab-item">
          <span class="tab-icon">
            ✓
            @if (storage.pendingTodoCount() > 0) {
              <span class="pixel-badge">{{ storage.pendingTodoCount() }}</span>
            }
          </span>
          <span class="tab-label">MISIONES</span>
        </a>

        <a routerLink="/calendar" routerLinkActive="active" class="tab-item">
          <span class="tab-icon">📅</span>
          <span class="tab-label">AGENDA</span>
        </a>

        <a routerLink="/settings" routerLinkActive="active" class="tab-item">
          <span class="tab-icon">⚙️</span>
          <span class="tab-label">CONFIG</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      background: var(--bg-primary, #040804);
      color: var(--text-primary, #e6ffe6);
      overflow: hidden;
    }

    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.65rem 0.85rem 0.5rem;
      background: #061006;
      border-bottom: 3px solid var(--border-bright, #00ff66);
      box-shadow: 0 3px 0px rgba(0, 0, 0, 0.8);
      z-index: 10;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .brand-title {
        font-family: var(--font-pixel, monospace);
        font-weight: 700;
        font-size: 0.95rem;
        letter-spacing: 1px;
        color: var(--accent, #00ff66);
        text-shadow: 0 0 8px rgba(0, 255, 102, 0.6);
      }
    }

    .brand-sprite {
      width: 32px;
      height: 32px;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pixel-icon-btn {
      background: #0c1c0c;
      border: 2px solid var(--border-bright, #00ff66);
      box-shadow: 2px 2px 0px #000;
      color: var(--accent, #00ff66);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;

      &:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0px #000;
      }
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 1rem 0.85rem calc(5.5rem + env(safe-area-inset-bottom)) 0.85rem;
    }

    .bottom-tab-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      height: calc(3.8rem + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
      background: #061006;
      border-top: 3px solid var(--border-bright, #00ff66);
      box-shadow: 0 -3px 0px rgba(0, 0, 0, 0.9);
      z-index: 100;
    }

    .tab-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      height: 100%;
      text-decoration: none;
      color: var(--text-secondary, #74ad74);
      transition: color 0.15s ease;
      -webkit-tap-highlight-color: transparent;

      &.active {
        color: var(--accent, #00ff66);
        text-shadow: 0 0 8px rgba(0, 255, 102, 0.6);

        .tab-label {
          color: var(--accent, #00ff66);
        }
      }

      &:active {
        opacity: 0.7;
      }
    }

    .tab-icon {
      font-size: 1.15rem;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .pixel-badge {
      position: absolute;
      top: -5px;
      right: -10px;
      background: #ffd60a;
      color: #000;
      font-family: var(--font-pixel, monospace);
      font-size: 0.5rem;
      font-weight: 700;
      min-width: 16px;
      height: 16px;
      border: 1px solid #000;
      box-shadow: 1px 1px 0px #000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 2px;
    }

    .tab-label {
      font-family: var(--font-pixel, monospace);
      font-size: 0.5rem;
      letter-spacing: 0.5px;
      margin-top: 3px;
    }
  `],
})
export class LayoutComponent {
  readonly storage = inject(StorageService);
  private readonly lockService = inject(LocalLockService);
  private readonly router = inject(Router);

  lockApp(): void {
    this.lockService.lock();
    this.router.navigate(['/lock']);
  }
}
