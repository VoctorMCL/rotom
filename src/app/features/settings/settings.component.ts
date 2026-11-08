import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { LocalLockService } from '../../core/services/local-lock.service';
import { SyncService } from '../../core/services/sync.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <header class="page-header">
        <div class="title-with-sprite">
          <img src="assets/images/rotom/rotom-sprite.webp" alt="Rotom" class="header-sprite" />
          <div class="header-text">
            <h2>CONFIGURACIÓN</h2>
            <p class="subtitle">Sincronización, persistencia Safari y seguridad</p>
          </div>
        </div>
      </header>

      <!-- Section: PC ↔ Celular Sync -->
      <section class="settings-card sync-card">
        <div class="card-title">
          <span class="icon">🔌</span>
          <div>
            <h3>LINK CABLE (PC ↔ CELULAR)</h3>
            <p>Escribe tu lista en el PC y llévala en tu iPhone 100% offline.</p>
          </div>
        </div>

        <div class="setting-row">
          <span class="row-label">ESTADO DE CONEXIÓN:</span>
          <span class="status-tag" [class.active]="sync.syncState() === 'synced'">
            {{ sync.statusMessage() | uppercase }}
          </span>
        </div>

        <div class="sync-key-box">
          <label>CLAVE DE SINCRONIZACIÓN PRIVADA</label>
          <div class="key-input-row">
            <input
              type="text"
              [(ngModel)]="syncKeyInput"
              placeholder="Ej: victor-rotom"
              class="sync-input"
            />
            <button class="btn-save-key" (click)="saveSyncKey()">
              GUARDAR
            </button>
          </div>
          <p class="key-help">Usa exactamente la misma clave en tu PC y en tu celular.</p>
        </div>

        <div class="sync-actions-row">
          <button class="btn-action btn-sync" (click)="triggerSync()" [disabled]="sync.syncState() === 'syncing'">
            {{ sync.syncState() === 'syncing' ? 'BAJANDO CAMBIOS...' : '⬇️ BAJAR CAMBIOS DEL PC' }}
          </button>
        </div>
      </section>

      <!-- Section: Safari WebKit Storage Persistence -->
      <section class="settings-card">
        <div class="card-title">
          <span class="icon">🛡️</span>
          <div>
            <h3>MEMORIA FLASH SAFARI (iOS)</h3>
            <p>Apple concede persistencia física permanente cuando instalas Rotom como PWA en tu pantalla de inicio.</p>
          </div>
        </div>

        <div class="setting-row">
          <span class="row-label">MODO PANTALLA INICIO:</span>
          <span class="status-tag" [class.active]="storage.isStandalone()">
            {{ storage.isStandalone() ? 'INSTALADA (PWA) ✓' : 'EN NAVEGADOR' }}
          </span>
        </div>

        <div class="setting-row">
          <span class="row-label">PERSISTENCIA FLASH:</span>
          <span class="status-tag" [class.active]="storage.isPersistent()">
            {{ storage.isPersistent() ? 'PROTEGIDO ✓' : 'PENDIENTE' }}
          </span>
        </div>

        @if (!storage.isStandalone()) {
          <div class="safari-steps">
            <strong>CÓMO BLINDAR EN TU IPHONE:</strong>
            <ol>
              <li>Abre <code>rotom.victormcl.me</code> en Safari.</li>
              <li>Toca el botón <strong>Compartir</strong> (icono ⬆️).</li>
              <li>Selecciona <strong>"Añadir a pantalla de inicio"</strong>.</li>
              <li>Abre Rotom desde el icono creado. WebKit aislará y blindará la memoria contra purgas automáticas.</li>
            </ol>
          </div>
        }

        <button class="btn-action btn-secondary" (click)="requestPersistence()">
          SOLICITAR PERSISTENCIA A SAFARI
        </button>
      </section>

      <!-- Section: Local Backup & Restore -->
      <section class="settings-card">
        <div class="card-title">
          <span class="icon">💾</span>
          <div>
            <h3>CARTUCHO / BACKUP LOCAL</h3>
            <p>Exporta o importa toda tu base de datos como archivo JSON directo a "Archivos" de iOS.</p>
          </div>
        </div>

        <div class="backup-actions">
          <button class="btn-action" (click)="exportBackup()">
            📥 EXPORTAR BACKUP (.JSON)
          </button>

          <label class="btn-action btn-secondary file-label">
            📤 IMPORTAR BACKUP (.JSON)
            <input type="file" accept=".json" (change)="importBackup($event)" hidden />
          </label>
        </div>

        @if (backupMsg()) {
          <div class="alert-box">
            <span class="alert-msg">{{ backupMsg() }}</span>
          </div>
        }
      </section>

      <!-- Section: Security & Offline Lock -->
      <section class="settings-card">
        <div class="card-title">
          <span class="icon">🔒</span>
          <div>
            <h3>SEGURIDAD LOCAL (SIN INTERNET)</h3>
            <p>Face ID / Touch ID vía WebAuthn y PIN con hash SHA-256 local.</p>
          </div>
        </div>

        <div class="setting-row">
          <span class="row-label">BIOMETRÍA (FACE ID):</span>
          <span class="status-tag" [class.active]="lockService.hasBiometric()">
            {{ lockService.hasBiometric() ? 'ACTIVO ✓' : 'NO DISPONIBLE' }}
          </span>
        </div>

        <div class="security-actions">
          <button class="btn-action btn-secondary" (click)="setupBiometric()">
            👤 CONFIGURAR / PROBAR FACE ID
          </button>

          <div class="pin-change-box">
            <h4>CAMBIAR PIN</h4>
            <input
              type="password"
              inputmode="numeric"
              pattern="[0-9]*"
              [(ngModel)]="currentPin"
              placeholder="PIN ACTUAL"
              class="pin-input"
            />
            <input
              type="password"
              inputmode="numeric"
              pattern="[0-9]*"
              [(ngModel)]="newPin"
              placeholder="NUEVO PIN (MÍN. 4 DÍGITOS)"
              class="pin-input"
            />
            <button class="btn-action btn-secondary" (click)="changePin()">
              ACTUALIZAR PIN
            </button>
          </div>

          <button class="btn-danger" (click)="lockNow()">
            🔒 BLOQUEAR ROTOM AHORA
          </button>
        </div>

        @if (secMsg()) {
          <div class="alert-box">
            <span class="alert-msg">{{ secMsg() }}</span>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .settings-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .page-header {
      .title-with-sprite {
        display: flex;
        align-items: center;
        gap: 0.6rem;

        .header-sprite {
          width: 32px;
          height: 32px;
          image-rendering: pixelated;
        }

        h2 {
          font-family: var(--font-pixel, monospace);
          font-size: 0.95rem;
          color: var(--accent, #00ff66);
          margin: 0;
          letter-spacing: 0.05em;
        }

        .subtitle {
          font-family: var(--font-terminal, monospace);
          color: var(--text-secondary, #74ad74);
          font-size: 1.15rem;
          margin: 0.2rem 0 0;
        }
      }
    }

    .settings-card {
      background: #081408;
      border: 2px solid var(--border, #184218);
      box-shadow: 3px 3px 0px #000;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;

      .card-title {
        display: flex;
        gap: 0.65rem;
        align-items: flex-start;

        .icon { font-size: 1.3rem; }
        h3 {
          font-family: var(--font-pixel, monospace);
          font-size: 0.75rem;
          color: var(--accent, #00ff66);
          margin: 0 0 0.25rem;
          letter-spacing: 0.03em;
        }
        p {
          font-family: var(--font-terminal, monospace);
          font-size: 1.1rem;
          color: var(--text-secondary, #74ad74);
          margin: 0;
          line-height: 1.3;
        }
      }

      &.sync-card {
        border-color: var(--border-bright, #00ff66);
      }
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0;
      border-bottom: 1px dashed #184218;

      .row-label {
        font-family: var(--font-pixel, monospace);
        font-size: 0.55rem;
        color: var(--text-secondary, #74ad74);
      }
    }

    .status-tag {
      font-family: var(--font-pixel, monospace);
      font-size: 0.55rem;
      font-weight: 700;
      padding: 0.2rem 0.45rem;
      border: 1px solid currentColor;
      background: rgba(255, 59, 48, 0.15);
      color: #ff3b30;

      &.active {
        background: rgba(0, 255, 102, 0.15);
        color: var(--accent, #00ff66);
      }
    }

    .sync-key-box {
      background: #030603;
      border: 2px solid var(--border, #184218);
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      label {
        font-family: var(--font-pixel, monospace);
        font-size: 0.55rem;
        color: var(--accent, #00ff66);
      }

      .key-input-row {
        display: flex;
        gap: 0.5rem;
      }

      .sync-input {
        flex: 1;
        background: #081408;
        border: 2px solid var(--border, #184218);
        color: #fff;
        font-family: var(--font-terminal, monospace);
        font-size: 1.25rem;
        padding: 0.35rem 0.6rem;
        &:focus {
          outline: none;
          border-color: var(--accent, #00ff66);
        }
        &::placeholder {
          color: #436b43;
        }
      }

      .btn-save-key {
        background: var(--accent, #00ff66);
        color: #000;
        font-family: var(--font-pixel, monospace);
        font-size: 0.6rem;
        font-weight: 700;
        border: 2px solid #000;
        box-shadow: 2px 2px 0px #000;
        padding: 0.4rem 0.75rem;
        cursor: pointer;

        &:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px #000;
        }
      }

      .key-help {
        font-family: var(--font-terminal, monospace);
        font-size: 1.05rem;
        color: var(--text-secondary, #74ad74);
        margin: 0.2rem 0 0;
      }
    }

    .safari-steps {
      background: #091709;
      border: 2px dashed #ffd60a;
      padding: 0.75rem;
      font-family: var(--font-terminal, monospace);
      font-size: 1.15rem;
      color: var(--text-secondary, #74ad74);

      strong {
        font-family: var(--font-pixel, monospace);
        font-size: 0.6rem;
        color: #ffd60a;
        display: block;
        margin-bottom: 0.4rem;
      }
      ol { padding-left: 1.2rem; margin: 0; }
      li { margin-bottom: 0.3rem; }
      code {
        color: var(--accent, #00ff66);
        background: #000;
        padding: 0.1rem 0.3rem;
        border: 1px solid var(--border, #184218);
      }
    }

    .btn-action {
      background: var(--accent, #00ff66);
      color: #000;
      border: 2px solid #000;
      box-shadow: 2px 2px 0px #000;
      padding: 0.65rem 0.85rem;
      font-family: var(--font-pixel, monospace);
      font-weight: 700;
      font-size: 0.6rem;
      cursor: pointer;
      text-align: center;
      -webkit-tap-highlight-color: transparent;

      &:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0px #000;
      }

      &.btn-sync {
        background: var(--accent, #00ff66);
      }

      &.btn-secondary {
        background: #030603;
        border: 2px solid var(--border, #184218);
        color: var(--accent, #00ff66);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-danger {
      background: #ff3b30;
      color: #000;
      border: 2px solid #000;
      box-shadow: 2px 2px 0px #000;
      padding: 0.65rem 0.85rem;
      font-family: var(--font-pixel, monospace);
      font-weight: 700;
      font-size: 0.6rem;
      cursor: pointer;
      text-align: center;

      &:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0px #000;
      }
    }

    .file-label {
      display: block;
      cursor: pointer;
    }

    .backup-actions,
    .security-actions {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .pin-change-box {
      background: #030603;
      border: 2px solid var(--border, #184218);
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      h4 {
        font-family: var(--font-pixel, monospace);
        font-size: 0.6rem;
        color: var(--accent, #00ff66);
        margin: 0;
      }
    }

    .pin-input {
      background: #081408;
      border: 2px solid var(--border, #184218);
      color: #fff;
      font-family: var(--font-pixel, monospace);
      padding: 0.6rem;
      font-size: 0.85rem;
      text-align: center;
      letter-spacing: 0.2em;

      &:focus {
        outline: none;
        border-color: var(--accent, #00ff66);
      }
      &::placeholder {
        letter-spacing: normal;
        font-size: 0.6rem;
        color: #436b43;
      }
    }

    .alert-box {
      background: #030603;
      border: 2px solid var(--accent, #00ff66);
      padding: 0.5rem;
      text-align: center;
    }

    .alert-msg {
      font-family: var(--font-terminal, monospace);
      font-size: 1.15rem;
      color: var(--accent, #00ff66);
    }
  `],
})
export class SettingsComponent {
  readonly storage = inject(StorageService);
  readonly lockService = inject(LocalLockService);
  readonly sync = inject(SyncService);
  private readonly router = inject(Router);

  syncKeyInput = this.sync.syncKey();
  currentPin = '';
  newPin = '';
  backupMsg = signal<string | null>(null);
  secMsg = signal<string | null>(null);

  async saveSyncKey(): Promise<void> {
    await this.sync.setSyncKey(this.syncKeyInput);
    this.backupMsg.set('✓ Clave de sincronización guardada.');
  }

  async triggerSync(): Promise<void> {
    await this.sync.pullFromCloud();
  }

  async requestPersistence(): Promise<void> {
    const granted = await this.storage.requestPersistentStorage();
    if (granted) {
      this.backupMsg.set('✓ Safari WebKit concedió almacenamiento persistente.');
    } else {
      this.backupMsg.set('Para blindar al 100%, añade Rotom a la pantalla de inicio desde Compartir.');
    }
  }

  async exportBackup(): Promise<void> {
    await this.storage.exportDatabase();
    this.backupMsg.set('✓ Archivo JSON generado. Guárdalo en "Archivos" de iOS.');
  }

  async importBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      try {
        await this.storage.importDatabase(input.files[0]);
        this.backupMsg.set('✓ Base de datos importada exitosamente.');
      } catch {
        this.backupMsg.set('Error al importar el archivo JSON.');
      }
    }
  }

  async setupBiometric(): Promise<void> {
    const success = await this.lockService.setupBiometric();
    if (success) {
      this.secMsg.set('✓ Face ID / Touch ID configurado en este iPhone.');
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
