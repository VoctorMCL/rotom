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
          <span class="brand-title">Rotom</span>
        </div>
        <div class="header-actions">
          <app-cache-status></app-cache-status>
          <button class="icon-btn lock-btn" (click)="lockApp()" title="Bloquear">
            🔒
          </button>
        </div>
      </header>

      <!-- Main Content Outlet -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- iOS Bottom Tab Bar -->
      <nav class="bottom-tab-bar">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="tab-item">
          <span class="tab-icon">🏠</span>
          <span class="tab-label">Inicio</span>
        </a>

        <a routerLink="/wiki" routerLinkActive="active" class="tab-item">
          <span class="tab-icon">📖</span>
          <span class="tab-label">Wiki</span>
        </a>

        <a routerLink="/shopping" routerLinkActive="active" class="tab-item">
          <span class="tab-icon">
            🛒
            @if (storage.uncheckedShoppingCount() > 0) {
              <span class="badge">{{ storage.uncheckedShoppingCount() }}</span>
            }
          </span>
          <span class="tab-label">Compras</span>
        </a>

        <a routerLink="/todo" routerLinkActive="active" class="tab-item">
          <span class="tab-icon">
            ✓
            @if (storage.pendingTodoCount() > 0) {
              <span class="badge">{{ storage.pendingTodoCount() }}</span>
            }
          </span>
          <span class="tab-label">Tareas</span>
        </a>

        <a routerLink="/calendar" routerLinkActive="active" class="tab-item">
          <span class="tab-icon">📅</span>
          <span class="tab-label">Agenda</span>
        </a>

        <a routerLink="/settings" routerLinkActive="active" class="tab-item">
          <span class="tab-icon">⚙️</span>
          <span class="tab-label">Ajustes</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      background: var(--bg-primary, #000);
      color: var(--text-primary, #fff);
      overflow: hidden;
    }

    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem 0.5rem;
      background: rgba(28, 28, 30, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border, #38383a);
      z-index: 10;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 800;
      font-size: 1.2rem;
      letter-spacing: -0.3px;
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

    .icon-btn {
      background: var(--bg-tertiary, #2c2c2e);
      border: 1px solid var(--border, #38383a);
      color: var(--text-primary, #fff);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;

      &:active {
        opacity: 0.7;
        transform: scale(0.95);
      }
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 1rem 1rem calc(5.5rem + env(safe-area-inset-bottom)) 1rem;
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
      background: rgba(28, 28, 30, 0.92);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-top: 1px solid var(--border, #38383a);
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
      color: var(--text-secondary, #8e8e93);
      transition: color 0.15s ease;
      -webkit-tap-highlight-color: transparent;

      &.active {
        color: var(--accent, #ff3b30);
      }

      &:active {
        opacity: 0.7;
      }
    }

    .tab-icon {
      font-size: 1.25rem;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .badge {
      position: absolute;
      top: -4px;
      right: -8px;
      background: var(--accent, #ff3b30);
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }

    .tab-label {
      font-size: 0.65rem;
      font-weight: 500;
      margin-top: 2px;
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
