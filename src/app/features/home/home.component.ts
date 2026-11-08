import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { CatalogService } from '../../core/services/catalog.service';
import { SyncService } from '../../core/services/sync.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="home-container">
      <!-- Greeting & Mascot Header -->
      <section class="pixel-welcome-box">
        <div class="welcome-header">
          <div class="welcome-text">
            <span class="pixel-date-badge">{{ todayFormatted }}</span>
            <h1>¡HOLA, VÍCTOR! 👋</h1>
            <p class="pixel-subtitle">ROTOM DEX V2.5 ONLINE EN TU CELULAR</p>
          </div>
          <div class="rotom-avatar">
            <img src="assets/images/rotom/rotom-sprite.webp" alt="Rotom" class="pixel-rotom-avatar" />
          </div>
        </div>
      </section>

      <!-- Sync Status & Quick Cloud Sync (Estilo Link Cable) -->
      <section class="pixel-sync-banner" (click)="sync.pullFromCloud()">
        <div class="sync-left">
          <span class="pixel-led" [class]="sync.syncState()"></span>
          <div class="sync-text">
            <strong>LINK PC ↔ CELULAR</strong>
            <span>{{ sync.statusMessage() }}</span>
          </div>
        </div>
        <button class="pixel-btn-action" [disabled]="sync.syncState() === 'syncing'">
          {{ sync.syncState() === 'syncing' ? 'BAJANDO...' : 'BAJAR CAMBIOS ⬇️' }}
        </button>
      </section>

      @if (sync.toastMessage()) {
        <div class="pixel-toast-alert">
          {{ sync.toastMessage() }}
        </div>
      }

      <!-- Safari Storage Protection Alert / Status -->
      @if (!storage.isStandalone() && !storage.isPersistent()) {
        <div class="pixel-banner-warning" (click)="requestPersistence()">
          <span class="banner-icon">⚠️</span>
          <div class="banner-content">
            <strong>MEMORIA SAFARI PENDIENTE</strong>
            <span>Toca Compartir > "Añadir a pantalla de inicio" para blindar el guardado offline.</span>
          </div>
        </div>
      } @else {
        <div class="pixel-banner-ok">
          <span class="ok-icon">🛡️</span>
          <span>MEMORIA FLASH BLINDADA (100% OFFLINE EN SAFARI)</span>
        </div>
      }

      <!-- ACCESOS RÁPIDOS PRINCIPALES (POKÉMON MENU BOXES) -->
      <section class="quick-access-section">
        <h3 class="section-title">MENU PRINCIPAL</h3>

        <div class="pixel-grid">
          <!-- 1. Compras (Éxito & D1) -->
          <a routerLink="/shopping" class="pixel-tile shopping-tile">
            <div class="tile-top">
              <span class="tile-icon">🛒</span>
              <div class="store-badges">
                <span class="badge-d1">D1:{{ storage.shoppingByStore().d1.length }}</span>
                <span class="badge-exito">ÉXI:{{ storage.shoppingByStore().exito.length }}</span>
              </div>
            </div>
            <div class="tile-bottom">
              <h4>LISTA COMPRAS</h4>
              <p>{{ storage.uncheckedShoppingCount() }} items pendientes</p>
            </div>
          </a>

          <!-- 2. Lavadora (Rotom Wash - Agua) -->
          <a routerLink="/wiki" [queryParams]="{ type: 'laundry' }" class="pixel-tile wash-tile">
            <div class="tile-top">
              <img src="assets/images/rotom/rotom-wash-sprite.webp" alt="Rotom Lavadora" class="tile-sprite" />
              <span class="type-pill-water">AGUA 💧</span>
            </div>
            <div class="tile-bottom">
              <h4>ROTOM WASH</h4>
              <p>Guías de lavado y telas</p>
            </div>
          </a>

          <!-- 3. Cocina & Recetas (Rotom Heat - Fuego) -->
          <a routerLink="/wiki" [queryParams]="{ type: 'recipe' }" class="pixel-tile heat-tile">
            <div class="tile-top">
              <img src="assets/images/rotom/rotom-heat-sprite.webp" alt="Rotom Horno" class="tile-sprite" />
              <span class="type-pill-fire">FUEGO 🔥</span>
            </div>
            <div class="tile-bottom">
              <h4>ROTOM HORNO</h4>
              <p>Recetas y cocina casera</p>
            </div>
          </a>

          <!-- 4. Calendario / Agenda -->
          <a routerLink="/calendar" class="pixel-tile calendar-tile">
            <div class="tile-top">
              <span class="tile-icon">📅</span>
              <span class="tile-stat">{{ todayEventsCount }} HOY</span>
            </div>
            <div class="tile-bottom">
              <h4>AGENDA MES</h4>
              <p>Comidas y repeticiones</p>
            </div>
          </a>

          <!-- 5. Tareas Rápidas -->
          <a routerLink="/todo" class="pixel-tile todo-tile">
            <div class="tile-top">
              <span class="tile-icon">✓</span>
              <span class="tile-stat">{{ storage.pendingTodoCount() }} ACT</span>
            </div>
            <div class="tile-bottom">
              <h4>MISIONES</h4>
              <p>Tareas ergonómicas</p>
            </div>
          </a>

          <!-- 6. Ajustes & Backup -->
          <a routerLink="/settings" class="pixel-tile settings-tile">
            <div class="tile-top">
              <span class="tile-icon">⚙️</span>
              <span class="tile-stat">LOCAL</span>
            </div>
            <div class="tile-bottom">
              <h4>CONFIG</h4>
              <p>PIN, Face ID y Backup</p>
            </div>
          </a>
        </div>
      </section>

      <!-- Highlights del Catálogo -->
      <section class="quick-wiki">
        <div class="section-header">
          <h3>ARCHIVADOS EN DISCO</h3>
          <a routerLink="/wiki" class="pixel-see-all">VER TODOS ▶</a>
        </div>

        <div class="horizontal-scroll">
          @for (item of catalog.allItems(); track item.id) {
            <a [routerLink]="['/wiki', item.id]" class="pixel-wiki-mini">
              <div class="mini-sprite-wrap">
                <img
                  [src]="item.type === 'recipe' ? 'assets/images/rotom/rotom-heat-sprite.webp' : 'assets/images/rotom/rotom-wash-sprite.webp'"
                  alt=""
                  class="mini-sprite"
                />
              </div>
              <div class="mini-info">
                <h4>{{ item.title }}</h4>
                <span class="mini-meta">
                  {{ item.type === 'recipe' ? 'FORMA HORNO 🔥' : 'FORMA LAVADO 💧' }}
                </span>
              </div>
            </a>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home-container {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    /* ─── Pixel Welcome Box ─── */
    .pixel-welcome-box {
      background: #081408;
      border: 3px solid var(--border-bright, #00ff66);
      box-shadow: 3px 3px 0px #000, -1px -1px 0px rgba(0, 255, 102, 0.3) inset;
      padding: 0.85rem 1rem;

      .welcome-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .welcome-text {
        flex: 1;

        .pixel-date-badge {
          display: inline-block;
          font-family: var(--font-pixel, monospace);
          font-size: 0.55rem;
          color: var(--accent, #00ff66);
          text-transform: uppercase;
          margin-bottom: 0.35rem;
        }

        h1 {
          font-size: 1.15rem;
          margin: 0;
        }

        .pixel-subtitle {
          font-family: var(--font-terminal, monospace);
          font-size: 1.1rem;
          color: var(--text-secondary, #74ad74);
          margin-top: 0.25rem;
        }
      }

      .rotom-avatar {
        width: 68px;
        height: 68px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .pixel-rotom-avatar {
          width: 58px;
          height: 58px;
          object-fit: contain;
          image-rendering: pixelated;
          filter: drop-shadow(0 0 8px rgba(0, 255, 102, 0.5));
          animation: pixelFloat 2s steps(2) infinite alternate;
        }
      }
    }

    /* ─── Sync Status Banner (Link Cable) ─── */
    .pixel-sync-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0a170a;
      border: 2px solid var(--border, #184218);
      border-left: 6px solid var(--border-bright, #00ff66);
      box-shadow: 2px 2px 0px #000;
      padding: 0.65rem 0.85rem;
      cursor: pointer;

      .sync-left {
        display: flex;
        align-items: center;
        gap: 0.65rem;

        .pixel-led {
          width: 8px;
          height: 8px;
          background: #477047;
          border: 1px solid #000;

          &.synced { background: var(--success, #00ff66); box-shadow: 0 0 6px #00ff66; }
          &.syncing { background: var(--warning, #ffd60a); animation: blink 0.5s infinite; }
          &.offline { background: #3e683e; }
        }

        .sync-text {
          display: flex;
          flex-direction: column;
          strong {
            font-family: var(--font-pixel, monospace);
            font-size: 0.65rem;
            color: var(--text-primary, #e6ffe6);
          }
          span {
            font-family: var(--font-terminal, monospace);
            font-size: 1rem;
            color: var(--text-secondary, #74ad74);
          }
        }
      }

      .pixel-btn-action {
        background: #0f2b0f;
        border: 2px solid var(--border-bright, #00ff66);
        box-shadow: 2px 2px 0px #000;
        color: var(--accent, #00ff66);
        font-family: var(--font-pixel, monospace);
        font-size: 0.55rem;
        padding: 0.4rem 0.6rem;
        cursor: pointer;

        &:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px #000;
        }
      }
    }

    .pixel-toast-alert {
      background: #0f2e0f;
      border: 2px solid var(--accent, #00ff66);
      box-shadow: 2px 2px 0px #000;
      color: var(--accent, #00ff66);
      font-family: var(--font-terminal, monospace);
      font-size: 1.15rem;
      padding: 0.5rem 0.85rem;
      text-align: center;
    }

    /* ─── Safari Protection Status ─── */
    .pixel-banner-warning {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.65rem 0.85rem;
      background: #1c1a05;
      border: 2px solid #ffd60a;
      box-shadow: 2px 2px 0px #000;
      color: #ffd60a;
      cursor: pointer;

      .banner-icon { font-size: 1.2rem; }
      .banner-content {
        display: flex;
        flex-direction: column;
        strong { font-family: var(--font-pixel, monospace); font-size: 0.6rem; }
        span { font-family: var(--font-terminal, monospace); font-size: 1.05rem; line-height: 1.25; }
      }
    }

    .pixel-banner-ok {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.75rem;
      background: #091709;
      border: 2px solid var(--border, #184218);
      color: var(--accent, #00ff66);
      font-family: var(--font-pixel, monospace);
      font-size: 0.55rem;

      .ok-icon { font-size: 0.85rem; }
    }

    /* ─── ACCESOS RÁPIDOS GRID ─── */
    .quick-access-section {
      .section-title {
        font-size: 0.85rem;
        margin-bottom: 0.65rem;
      }
    }

    .pixel-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.65rem;
    }

    .pixel-tile {
      background: #081408;
      border: 2px solid var(--border-bright, #00ff66);
      box-shadow: 3px 3px 0px #000;
      padding: 0.75rem;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 110px;
      -webkit-tap-highlight-color: transparent;

      &:active {
        transform: translate(2px, 2px);
        box-shadow: 1px 1px 0px #000;
        background: #0e240e;
      }

      .tile-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.35rem;
      }

      .tile-icon { font-size: 1.35rem; }
      .tile-stat {
        font-family: var(--font-pixel, monospace);
        font-size: 0.55rem;
        background: #040804;
        border: 1px solid var(--border, #184218);
        padding: 0.2rem 0.35rem;
        color: var(--accent, #00ff66);
      }

      .tile-bottom {
        h4 {
          font-family: var(--font-pixel, monospace);
          font-size: 0.65rem;
          margin-bottom: 0.25rem;
          color: #fff;
        }
        p {
          font-family: var(--font-terminal, monospace);
          font-size: 1.05rem;
          color: var(--text-secondary, #74ad74);
          line-height: 1.2;
        }
      }

      &.shopping-tile {
        border-color: #00ff66;
        .store-badges {
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: flex-end;

          .badge-d1 {
            font-family: var(--font-pixel, monospace);
            font-size: 0.45rem;
            background: #ffd60a;
            color: #000;
            padding: 1px 3px;
          }
          .badge-exito {
            font-family: var(--font-pixel, monospace);
            font-size: 0.45rem;
            background: #ff3b30;
            color: #fff;
            padding: 1px 3px;
          }
        }
      }

      &.wash-tile {
        border-color: #00d4ff;
        .type-pill-water {
          font-family: var(--font-pixel, monospace);
          font-size: 0.5rem;
          color: #00d4ff;
          background: #002b3d;
          padding: 1px 4px;
          border: 1px solid #00d4ff;
        }
      }

      &.heat-tile {
        border-color: #ff6b35;
        .type-pill-fire {
          font-family: var(--font-pixel, monospace);
          font-size: 0.5rem;
          color: #ff6b35;
          background: #331505;
          padding: 1px 4px;
          border: 1px solid #ff6b35;
        }
      }

      .tile-sprite {
        width: 32px;
        height: 32px;
        object-fit: contain;
        image-rendering: pixelated;
      }
    }

    /* ─── Highlights ─── */
    .quick-wiki {
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.65rem;

        h3 { font-size: 0.8rem; margin: 0; }
        .pixel-see-all {
          font-family: var(--font-pixel, monospace);
          font-size: 0.55rem;
          color: var(--accent, #00ff66);
          text-decoration: none;
        }
      }
    }

    .horizontal-scroll {
      display: flex;
      gap: 0.65rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      -webkit-overflow-scrolling: touch;
      &::-webkit-scrollbar { display: none; }
    }

    .pixel-wiki-mini {
      flex: 0 0 150px;
      background: #081408;
      border: 2px solid var(--border-bright, #00ff66);
      box-shadow: 2px 2px 0px #000;
      text-decoration: none;
      color: inherit;

      &:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0px #000;
      }

      .mini-sprite-wrap {
        height: 60px;
        background: #040804;
        border-bottom: 2px solid var(--border, #184218);
        display: flex;
        align-items: center;
        justify-content: center;

        .mini-sprite {
          width: 36px;
          height: 36px;
          image-rendering: pixelated;
        }
      }

      .mini-info {
        padding: 0.5rem;
        h4 {
          font-family: var(--font-pixel, monospace);
          font-size: 0.55rem;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #fff;
        }
        .mini-meta {
          font-family: var(--font-terminal, monospace);
          font-size: 0.95rem;
          color: var(--accent, #00ff66);
        }
      }
    }

    @keyframes pixelFloat {
      0% { transform: translateY(0px); }
      100% { transform: translateY(-4px); }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }
  `],
})
export class HomeComponent implements OnInit {
  readonly storage = inject(StorageService);
  readonly catalog = inject(CatalogService);
  readonly sync = inject(SyncService);

  readonly todayStr = new Date().toISOString().slice(0, 10);
  readonly todayFormatted = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  todayEventsCount = 0;

  async ngOnInit(): Promise<void> {
    const events = await this.storage.getEventsForDate(this.todayStr);
    this.todayEventsCount = events.length;
  }

  async requestPersistence(): Promise<void> {
    await this.storage.requestPersistentStorage();
  }
}
