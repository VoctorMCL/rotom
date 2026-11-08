import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalLockService } from '../../core/services/local-lock.service';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="lock-container">
      <div class="lock-card">
        <div class="logo">
          <img src="assets/images/rotom/rotom-default.webp" alt="Rotom" class="lock-rotom" />
        </div>
        <h1>Rotom</h1>
        <p class="subtitle">Tu asistente personal</p>

        @if (!lockService.isSetup()) {
          <!-- First-time Setup -->
          <div class="setup-section">
            <p class="info">Configura tu PIN de acceso</p>
            <input
              type="password"
              inputmode="numeric"
              pattern="[0-9]*"
              [(ngModel)]="pinInput"
              placeholder="Crear PIN (mín. 4 dígitos)"
              class="pin-input"
              (keyup.enter)="setupPin()"
            />
            <button class="btn-primary" (click)="setupPin()">
              Crear PIN
            </button>
          </div>
        } @else {
          <!-- Unlock -->
          @if (lockService.hasBiometric()) {
            <button class="btn-biometric" (click)="unlockBiometric()">
              <span class="icon">👤</span>
              Desbloquear con Face ID
            </button>
            <div class="divider">
              <span>o usa tu PIN</span>
            </div>
          }

          <input
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            [(ngModel)]="pinInput"
            placeholder="Ingresa tu PIN"
            class="pin-input"
            (keyup.enter)="unlockPin()"
          />
          <button class="btn-primary" (click)="unlockPin()">
            Desbloquear
          </button>
        }

        @if (lockService.errorMessage(); as error) {
          <p class="error">{{ error }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .lock-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: env(safe-area-inset-top) env(safe-area-inset-right)
        env(safe-area-inset-bottom) env(safe-area-inset-left);
      background: var(--bg-primary, #000);
      color: var(--text-primary, #fff);
    }

    .lock-card {
      text-align: center;
      padding: 2rem;
      max-width: 320px;
      width: 100%;
    }

    .logo {
      display: flex;
      justify-content: center;
      margin-bottom: 0.75rem;

      .lock-rotom {
        width: 100px;
        height: 100px;
        object-fit: contain;
        animation: rotomFloatLock 3s ease-in-out infinite alternate;
        filter: drop-shadow(0 0 16px rgba(255, 107, 53, 0.5));
      }
    }

    @keyframes rotomFloatLock {
      0% {
        transform: translateY(0px) scale(1);
      }
      50% {
        transform: translateY(-8px) scale(1.02);
      }
      100% {
        transform: translateY(-14px) scale(1.05);
      }
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .subtitle {
      color: var(--text-secondary, #888);
      margin: 0.25rem 0 2rem;
      font-size: 0.9rem;
    }

    .info {
      color: var(--text-secondary, #888);
      margin-bottom: 1rem;
      font-size: 0.85rem;
    }

    .pin-input {
      display: block;
      width: 100%;
      padding: 0.875rem 1rem;
      border: 1px solid var(--border, #333);
      border-radius: 12px;
      background: var(--bg-secondary, #1a1a1a);
      color: var(--text-primary, #fff);
      font-size: 1.25rem;
      text-align: center;
      letter-spacing: 0.5rem;
      margin-bottom: 1rem;
      -webkit-appearance: none;

      &:focus {
        outline: none;
        border-color: var(--accent, #ff3b30);
      }
    }

    .btn-primary {
      display: block;
      width: 100%;
      padding: 0.875rem;
      border: none;
      border-radius: 12px;
      background: var(--accent, #ff3b30);
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;

      &:active {
        opacity: 0.8;
        transform: scale(0.98);
      }
    }

    .btn-biometric {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.875rem;
      border: 1px solid var(--border, #333);
      border-radius: 12px;
      background: var(--bg-secondary, #1a1a1a);
      color: var(--text-primary, #fff);
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;

      .icon { font-size: 1.25rem; }

      &:active {
        opacity: 0.8;
        background: var(--bg-tertiary, #2a2a2a);
      }
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 1.25rem 0;
      color: var(--text-secondary, #888);
      font-size: 0.8rem;

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border, #333);
      }

      span { padding: 0 0.75rem; }
    }

    .error {
      color: #ff453a;
      font-size: 0.85rem;
      margin-top: 1rem;
    }

    .setup-section {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  `],
})
export class LockScreenComponent {
  readonly lockService = inject(LocalLockService);
  private readonly router = inject(Router);

  pinInput = '';

  async setupPin(): Promise<void> {
    await this.lockService.setupPin(this.pinInput);
    if (this.lockService.isUnlocked()) {
      this.pinInput = '';
      this.router.navigate(['/']);
    }
  }

  async unlockPin(): Promise<void> {
    const success = await this.lockService.unlockWithPin(this.pinInput);
    if (success) {
      this.pinInput = '';
      this.router.navigate(['/']);
    }
  }

  async unlockBiometric(): Promise<void> {
    const success = await this.lockService.unlockWithBiometric();
    if (success) {
      this.router.navigate(['/']);
    }
  }
}
