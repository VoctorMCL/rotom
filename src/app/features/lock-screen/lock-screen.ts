import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalLockService } from '../../core/services/local-lock.service';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="lock-container">
      <div class="pixel-lock-card">
        <div class="logo">
          <img src="assets/images/rotom/rotom-sprite.webp" alt="Rotom" class="lock-rotom" />
        </div>
        <h1>ROTOM</h1>
        <p class="subtitle">SISTEMA PRIVADO LOCAL</p>

        @if (!lockService.isSetup()) {
          <!-- First-time Setup -->
          <div class="setup-section">
            <p class="info">CONFIGURA TU PIN DE ACCESO</p>
            <input
              type="password"
              inputmode="numeric"
              pattern="[0-9]*"
              [(ngModel)]="pinInput"
              placeholder="NUEVO PIN"
              class="pixel-pin-input"
              (keyup.enter)="setupPin()"
            />
            <button class="pixel-btn-primary" (click)="setupPin()">
              GUARDAR PIN
            </button>
          </div>
        } @else {
          <!-- Unlock -->
          @if (lockService.hasBiometric()) {
            <button class="pixel-btn-biometric" (click)="unlockBiometric()">
              <span class="icon">👤</span>
              FACE ID / TOUCH ID
            </button>
            <div class="divider">
              <span>O INGRESA TU PIN</span>
            </div>
          }

          <input
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            [(ngModel)]="pinInput"
            placeholder="PIN"
            class="pixel-pin-input"
            (keyup.enter)="unlockPin()"
          />
          <button class="pixel-btn-primary" (click)="unlockPin()">
            DESBLOQUEAR ▶
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
      background: #040804;
      color: var(--text-primary, #e6ffe6);
    }

    .pixel-lock-card {
      text-align: center;
      padding: 1.5rem;
      max-width: 320px;
      width: 100%;
      background: #081408;
      border: 3px solid var(--border-bright, #00ff66);
      box-shadow: 4px 4px 0px #000;
    }

    .logo {
      display: flex;
      justify-content: center;
      margin-bottom: 0.5rem;

      .lock-rotom {
        width: 72px;
        height: 72px;
        object-fit: contain;
        image-rendering: pixelated;
        filter: drop-shadow(0 0 10px rgba(0, 255, 102, 0.6));
        animation: pixelBounce 2s steps(2) infinite alternate;
      }
    }

    @keyframes pixelBounce {
      0% { transform: translateY(0); }
      100% { transform: translateY(-6px); }
    }

    h1 {
      font-size: 1.3rem;
      margin: 0;
      color: var(--accent, #00ff66);
      text-shadow: 0 0 8px rgba(0, 255, 102, 0.6);
    }

    .subtitle {
      font-family: var(--font-terminal, monospace);
      color: var(--text-secondary, #74ad74);
      margin: 0.25rem 0 1.25rem;
      font-size: 1.15rem;
    }

    .info {
      font-family: var(--font-pixel, monospace);
      color: var(--accent, #00ff66);
      margin-bottom: 0.75rem;
      font-size: 0.55rem;
    }

    .pixel-pin-input {
      display: block;
      width: 100%;
      padding: 0.65rem 0.75rem;
      border: 2px solid var(--border-bright, #00ff66);
      background: #040804;
      color: var(--accent, #00ff66);
      font-family: var(--font-terminal, monospace);
      font-size: 1.6rem;
      text-align: center;
      letter-spacing: 0.4rem;
      margin-bottom: 0.85rem;
      -webkit-appearance: none;

      &:focus {
        outline: none;
        box-shadow: 0 0 8px rgba(0, 255, 102, 0.5);
      }
    }

    .pixel-btn-primary {
      display: block;
      width: 100%;
      padding: 0.65rem;
      border: 2px solid var(--border-bright, #00ff66);
      background: #0f2b0f;
      color: var(--accent, #00ff66);
      font-family: var(--font-pixel, monospace);
      font-size: 0.65rem;
      cursor: pointer;
      box-shadow: 2px 2px 0px #000;

      &:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0px #000;
      }
    }

    .pixel-btn-biometric {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      width: 100%;
      padding: 0.6rem;
      border: 2px solid var(--border, #184218);
      background: #040804;
      color: var(--text-primary, #e6ffe6);
      font-family: var(--font-pixel, monospace);
      font-size: 0.55rem;
      cursor: pointer;
      box-shadow: 2px 2px 0px #000;

      .icon { font-size: 1rem; }

      &:active {
        background: #0f2b0f;
        transform: translate(1px, 1px);
      }
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 1rem 0;
      color: var(--text-secondary, #74ad74);
      font-family: var(--font-pixel, monospace);
      font-size: 0.5rem;

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border, #184218);
      }

      span { padding: 0 0.5rem; }
    }

    .error {
      font-family: var(--font-terminal, monospace);
      color: #ff3b30;
      font-size: 1.15rem;
      margin-top: 0.75rem;
    }

    .setup-section {
      display: flex;
      flex-direction: column;
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
