import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { LocalLockService } from '../../core/services/local-lock.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <header class="page-header">
        <h2>Ajustes</h2>
        <p class="subtitle">Persistencia, seguridad y copias de seguridad locales</p>
      </header>

      <!-- Section: Safari Storage Persistence -->
      <section class="settings-card">
        <div class="card-title">
          <span class="icon">🛡️</span>
          <div>
            <h3>Blindaje de Safari WebKit</h3>
            <p>Evita que iOS purgue la memoria flash de la PWA si no la abres en 7 días.</p>
          </div>
        </div>

        <div class="setting-row">
          <span>Almacenamiento persistente:</span>
          <span class="status-tag" [class.active]="storage.isPersistent()">
            {{ storage.isPersistent() ? 'ACTIVADO ✓' : 'NO ACTIVADO' }}
          </span>
        </div>

        @if (!storage.isPersistent()) {
          <button class="btn-action" (click)="requestPersistence()">
            Solicitar Persistencia a Safari
          </button>
        }
      </section>

      <!-- Section: Local Backup & Restore -->
      <section class="settings-card">
        <div class="card-title">
          <span class="icon">💾</span>
          <div>
            <h3>Copia de Seguridad Local</h3>
            <p>Exporta o importa toda tu base de datos Dexie como archivo JSON directo a "Archivos" de iOS.</p>
          </div>
        </div>

        <div class="backup-actions">
          <button class="btn-action" (click)="exportBackup()">
            📥 Exportar Backup (.json)
          </button>

          <label class="btn-action btn-secondary file-label">
            📤 Importar Backup (.json)
            <input type="file" accept=".json" (change)="importBackup($event)" hidden />
          </label>
        </div>

        @if (backupMsg()) {
          <p class="alert-msg">{{ backupMsg() }}</p>
        }
      </section>

      <!-- Section: Security & Offline Lock -->
      <section class="settings-card">
        <div class="card-title">
          <span class="icon">🔒</span>
          <div>
            <h3>Seguridad Local (Sin Internet)</h3>
            <p>Face ID / Touch ID vía WebAuthn y PIN con hash SHA-256.</p>
          </div>
        </div>

        <div class="setting-row">
          <span>Biometría (Face ID):</span>
          <span class="status-tag" [class.active]="lockService.hasBiometric()">
            {{ lockService.hasBiometric() ? 'CONFIGURADO ✓' : 'NO DISPONIBLE' }}
          </span>
        </div>

        <div class="security-actions">
          <button class="btn-action" (click)="setupBiometric()">
            👤 Configurar / Probar Face ID
          </button>

          <div class="pin-change-box">
            <h4>Cambiar PIN</h4>
            <input
              type="password"
              inputmode="numeric"
              pattern="[0-9]*"
              [(ngModel)]="currentPin"
              placeholder="PIN actual"
              class="pin-input"
            />
            <input
              type="password"
              inputmode="numeric"
              pattern="[0-9]*"
              [(ngModel)]="newPin"
              placeholder="Nuevo PIN (mín. 4 dígitos)"
              class="pin-input"
            />
            <button class="btn-action btn-secondary" (click)="changePin()">
              Actualizar PIN
            </button>
          </div>

          <button class="btn-danger" (click)="lockNow()">
            🔒 Bloquear Rotom Ahora
          </button>
        </div>

        @if (secMsg()) {
          <p class="alert-msg">{{ secMsg() }}</p>
        }
      </section>

      <!-- Section: PWA & Offline Info -->
      <section class="settings-card info-card">
        <h3>Rotom</h3>
        <p><strong>Subdominio:</strong> rotom.victormcl.me</p>
        <p><strong>Modo de Instalación:</strong> PWA en Pantalla de Inicio (Safari)</p>
        <p><strong>Modo Offline:</strong> 100% de assets y datos en disco local</p>
        <p><strong>Base de datos:</strong> IndexedDB (Dexie.js)</p>
      </section>
    </div>
  `,
  styles: [`
    .settings-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .page-header {
      h2 { font-size: 1.7rem; font-weight: 800; margin: 0; }
      .subtitle { color: var(--text-secondary, #8e8e93); font-size: 0.85rem; margin-top: 0.25rem; }
    }

    .settings-card {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .card-title {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;

        .icon { font-size: 1.4rem; }
        h3 { font-size: 1.05rem; margin: 0 0 0.25rem; }
        p { font-size: 0.8rem; color: var(--text-secondary, #8e8e93); margin: 0; line-height: 1.4; }
      }
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      font-size: 0.85rem;
    }

    .status-tag {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 8px;
      background: rgba(255, 59, 48, 0.15);
      color: var(--accent, #ff3b30);

      &.active {
        background: rgba(48, 209, 88, 0.15);
        color: var(--success, #30d158);
      }
    }

    .btn-action {
      background: var(--accent, #ff3b30);
      color: #fff;
      border: none;
      padding: 0.75rem;
      border-radius: var(--input-radius, 12px);
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      text-align: center;
      -webkit-tap-highlight-color: transparent;

      &:active { opacity: 0.8; }

      &.btn-secondary {
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px solid var(--border, #38383a);
        color: var(--text-primary, #fff);
      }
    }

    .btn-danger {
      background: rgba(255, 59, 48, 0.15);
      border: 1px solid rgba(255, 59, 48, 0.3);
      color: #ff3b30;
      padding: 0.75rem;
      border-radius: var(--input-radius, 12px);
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;

      &:active { opacity: 0.8; }
    }

    .file-label {
      display: block;
      cursor: pointer;
    }

    .backup-actions,
    .security-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .pin-change-box {
      background: var(--bg-tertiary, #2c2c2e);
      border-radius: var(--input-radius, 12px);
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      h4 { font-size: 0.85rem; margin: 0; }
    }

    .pin-input {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: 8px;
      color: #fff;
      padding: 0.6rem;
      font-size: 0.9rem;
      text-align: center;
      &:focus { outline: none; border-color: var(--accent, #ff3b30); }
    }

    .alert-msg {
      font-size: 0.8rem;
      color: var(--success, #30d158);
      text-align: center;
      font-weight: 600;
    }

    .info-card {
      font-size: 0.8rem;
      color: var(--text-secondary, #8e8e93);
      h3 { font-size: 1rem; color: #fff; margin-bottom: 0.5rem; }
      p { margin: 0.25rem 0; }
      strong { color: #fff; }
    }
  `],
})
export class SettingsComponent {
  readonly storage = inject(StorageService);
  readonly lockService = inject(LocalLockService);
  private readonly router = inject(Router);

  currentPin = '';
  newPin = '';
  backupMsg = signal<string | null>(null);
  secMsg = signal<string | null>(null);

  async requestPersistence(): Promise<void> {
    const granted = await this.storage.requestPersistentStorage();
    if (granted) {
      this.backupMsg.set('✓ Safari concedió almacenamiento persistente.');
    } else {
      this.backupMsg.set('Safari no concedió persistencia automática. Agrega la app a Pantalla de Inicio.');
    }
  }

  async exportBackup(): Promise<void> {
    await this.storage.exportDatabase();
    this.backupMsg.set('✓ Archivo JSON generado. Guárdalo en la app "Archivos" de iOS.');
  }

  async importBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      try {
        await this.storage.importDatabase(input.files[0]);
        this.backupMsg.set('✓ Base de datos importada exitosamente desde el JSON.');
      } catch (err) {
        this.backupMsg.set('Error al importar el archivo JSON.');
      }
    }
  }

  async setupBiometric(): Promise<void> {
    const success = await this.lockService.setupBiometric();
    if (success) {
      this.secMsg.set('✓ Face ID / Touch ID configurado y verificado en este iPhone.');
    } else {
      this.secMsg.set(this.lockService.errorMessage() || 'No se pudo configurar Face ID.');
    }
  }

  async changePin(): Promise<void> {
    if (!this.currentPin || !this.newPin) {
      this.secMsg.set('Ingresa el PIN actual y el nuevo.');
      return;
    }

    const ok = await this.lockService.changePin(this.currentPin, this.newPin);
    if (ok) {
      this.secMsg.set('✓ PIN actualizado correctamente.');
      this.currentPin = '';
      this.newPin = '';
    } else {
      this.secMsg.set(this.lockService.errorMessage() || 'Error al cambiar PIN.');
    }
  }

  lockNow(): void {
    this.lockService.lock();
    this.router.navigate(['/lock']);
  }
}
