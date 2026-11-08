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
      <section class="welcome-section">
        <div class="welcome-header">
          <div class="welcome-text">
            <span class="date-badge">{{ todayFormatted }}</span>
            <h1>¡Hola, Víctor! 👋</h1>
            <p class="subtitle">Rotom listo en tu dispositivo.</p>
          </div>
          <div class="rotom-avatar">
            <img src="assets/images/rotom/rotom-default.webp" alt="Rotom" class="floating-rotom" />
          </div>
        </div>
      </section>

      <!-- Sync Status & Quick Cloud Sync -->
      <section class="sync-banner" (click)="sync.pullFromCloud()">
        <div class="sync-left">
          <span class="sync-indicator" [class]="sync.syncState()"></span>
          <div class="sync-text">
            <strong>PC ↔ Celular</strong>
            <span>{{ sync.statusMessage() }}</span>
          </div>
        </div>
        <button class="btn-sync-action" [disabled]="sync.syncState() === 'syncing'">
          {{ sync.syncState() === 'syncing' ? 'Bajando...' : 'Bajar cambios del PC ⬇️' }}
        </button>
      </section>

      @if (sync.toastMessage()) {
        <div class="sync-toast-home">
          {{ sync.toastMessage() }}
        </div>
      }

      <!-- Safari Storage Protection Alert / Status -->
      @if (!storage.isStandalone() && !storage.isPersistent()) {
        <div class="banner-safari-install" (click)="requestPersistence()">
          <span class="banner-icon">🛡️</span>
          <div class="banner-content">
            <strong>Blindaje Safari para iPhone</strong>
            <span>Pulsa Compartir > "Añadir a pantalla de inicio" para proteger datos de la purga de 7 días.</span>
          </div>
        </div>
      } @else {
        <div class="banner-safari-ok">
          <span class="ok-icon">✓</span>
          <span>Almacenamiento protegido en iOS (100% offline).</span>
        </div>
      }

      <!-- ACCESOS RÁPIDOS PRINCIPALES -->
      <section class="quick-access-section">
        <h3 class="section-title">Accesos Rápidos</h3>

        <div class="quick-access-grid">
          <!-- 1. Compras (Éxito & D1) -->
          <a routerLink="/shopping" class="quick-tile shopping-tile">
            <div class="tile-top">
              <span class="tile-emoji">🛒</span>
              <div class="store-badges">
                <span class="badge-d1">D1: {{ storage.shoppingByStore().d1.length }}</span>
                <span class="badge-exito">Éxito: {{ storage.shoppingByStore().exito.length }}</span>
              </div>
            </div>
            <div class="tile-bottom">
              <h4>Lista de Compras</h4>
              <p>{{ storage.uncheckedShoppingCount() }} productos pendientes</p>
            </div>
          </a>

          <!-- 2. Lavadora (Modo Lavado) -->
          <a routerLink="/wiki" [queryParams]="{ type: 'laundry' }" class="quick-tile wash-tile">
            <div class="tile-top">
              <img src="assets/images/rotom/rotom-wash.webp" alt="Rotom Lavadora" class="tile-rotom-img wash-glow" />
              <span class="type-pill-water">Agua 💧</span>
            </div>
            <div class="tile-bottom">
              <h4>Lavadora de Ropa</h4>
              <p>Manuales de lavado y cuidado</p>
            </div>
          </a>

          <!-- 3. Cocina & Recetas (Modo Horno) -->
          <a routerLink="/wiki" [queryParams]="{ type: 'recipe' }" class="quick-tile heat-tile">
            <div class="tile-top">
              <img src="assets/images/rotom/rotom-heat.webp" alt="Rotom Horno" class="tile-rotom-img heat-glow" />
              <span class="type-pill-fire">Fuego 🔥</span>
            </div>
            <div class="tile-bottom">
              <h4>Cocina & Recetas</h4>
              <p>Pastel de choclo, sopaipillas...</p>
            </div>
          </a>

          <!-- 4. Calendario / Agenda -->
          <a routerLink="/calendar" class="quick-tile calendar-tile">
            <div class="tile-top">
              <span class="tile-emoji">📅</span>
              <span class="tile-stat">{{ todayEventsCount }} hoy</span>
            </div>
            <div class="tile-bottom">
              <h4>Agenda</h4>
              <p>Planificación de comidas y lavados</p>
            </div>
          </a>

          <!-- 5. Tareas Rápidas -->
          <a routerLink="/todo" class="quick-tile todo-tile">
            <div class="tile-top">
              <span class="tile-emoji">✓</span>
              <span class="tile-stat">{{ storage.pendingTodoCount() }} activas</span>
            </div>
            <div class="tile-bottom">
              <h4>Tareas</h4>
              <p>To-Do list ergonómica a una mano</p>
            </div>
          </a>

          <!-- 6. Ajustes & Backup -->
          <a routerLink="/settings" class="quick-tile settings-tile">
            <div class="tile-top">
              <span class="tile-emoji">⚙️</span>
              <span class="tile-stat">Local</span>
            </div>
            <div class="tile-bottom">
              <h4>Ajustes</h4>
              <p>Seguridad Face ID, PIN y Backup</p>
            </div>
          </a>
        </div>
      </section>

      <!-- Highlights del Catálogo -->
      <section class="quick-wiki">
        <div class="section-header">
          <h3>Destacados en Disco</h3>
          <a routerLink="/wiki" class="see-all">Ver todos →</a>
        </div>

        <div class="horizontal-scroll">
          @for (item of catalog.items(); track item.id) {
            <a [routerLink]="['/wiki', item.id]" class="wiki-card-mini">
              <div class="cover-placeholder">
                <img
                  [src]="item.type === 'recipe' ? 'assets/images/rotom/rotom-heat-sprite.webp' : 'assets/images/rotom/rotom-wash-sprite.webp'"
                  alt=""
                  class="mini-sprite"
                />
              </div>
              <div class="mini-info">
                <h4>{{ item.title }}</h4>
                <span class="mini-meta">
                  {{ item.type === 'recipe' ? 'Receta · Horno' : 'Prendas · Lavadora' }}
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
      gap: 1.25rem;
    }

    .welcome-section {
      margin-top: 0.25rem;

      .welcome-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .welcome-text { flex: 1; }

      .rotom-avatar {
        width: 76px;
        height: 76px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .floating-rotom {
          width: 72px;
          height: 72px;
          object-fit: contain;
          animation: rotomFloat 3s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 12px rgba(255, 107, 53, 0.4));
        }
      }

      .date-badge {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-secondary, #8e8e93);
        margin-bottom: 0.25rem;
      }

      h1 {
        font-size: 1.8rem;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.5px;
      }

      .subtitle {
        color: var(--text-secondary, #8e8e93);
        font-size: 0.85rem;
        margin-top: 0.25rem;
      }
    }

    /* ─── Sync Status Banner (PC ↔ Celular) ─── */
    .sync-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 0.75rem 1rem;
      cursor: pointer;

      .sync-left {
        display: flex;
        align-items: center;
        gap: 0.65rem;

        .sync-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #8e8e93;

          &.synced { background: var(--success, #30d158); }
          &.syncing { background: var(--warning, #ffd60a); animation: pulse 1s infinite; }
          &.offline { background: #636366; }
        }

        .sync-text {
          display: flex;
          flex-direction: column;
          strong { font-size: 0.85rem; color: #fff; }
          span { font-size: 0.75rem; color: var(--text-secondary, #8e8e93); }
        }
      }

      .btn-sync-action {
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px solid var(--border, #38383a);
        color: var(--text-primary, #fff);
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.35rem 0.65rem;
        border-radius: 8px;
        cursor: pointer;
        &:active { opacity: 0.7; }
      }
    }

    .sync-toast-home {
      background: rgba(48, 209, 88, 0.15);
      border: 1px solid rgba(48, 209, 88, 0.35);
      color: var(--success, #30d158);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.55rem 0.85rem;
      border-radius: 12px;
      text-align: center;
    }

    /* ─── Safari Protection Status ─── */
    .banner-safari-install {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: var(--card-radius, 16px);
      background: rgba(255, 214, 10, 0.12);
      border: 1px solid rgba(255, 214, 10, 0.3);
      color: #ffd60a;
      cursor: pointer;

      .banner-icon { font-size: 1.4rem; }
      .banner-content {
        display: flex;
        flex-direction: column;
        strong { font-size: 0.85rem; }
        span { font-size: 0.75rem; opacity: 0.9; line-height: 1.35; }
      }
    }

    .banner-safari-ok {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.85rem;
      border-radius: 10px;
      background: rgba(48, 209, 88, 0.1);
      border: 1px solid rgba(48, 209, 88, 0.25);
      color: var(--success, #30d158);
      font-size: 0.75rem;
      font-weight: 600;

      .ok-icon { font-size: 0.9rem; }
    }

    /* ─── ACCESOS RÁPIDOS GRID ─── */
    .quick-access-section {
      .section-title {
        font-size: 1.15rem;
        font-weight: 800;
        margin: 0 0 0.75rem;
      }
    }

    .quick-access-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .quick-tile {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 1rem;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 120px;
      transition: all 0.15s ease;
      -webkit-tap-highlight-color: transparent;

      &:active {
        transform: scale(0.97);
        background: var(--bg-tertiary, #2c2c2e);
      }

      .tile-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.5rem;
      }

      .tile-emoji { font-size: 1.6rem; }
      .tile-stat {
        font-size: 0.7rem;
        background: var(--bg-tertiary, #2c2c2e);
        padding: 0.2rem 0.45rem;
        border-radius: 6px;
        color: var(--text-secondary, #8e8e93);
        font-weight: 700;
      }

      .tile-bottom {
        h4 { font-size: 0.95rem; font-weight: 700; margin: 0 0 0.2rem; }
        p { font-size: 0.75rem; color: var(--text-secondary, #8e8e93); margin: 0; line-height: 1.3; }
      }

      &.shopping-tile {
        border-color: rgba(255, 59, 48, 0.3);
        .store-badges {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          align-items: flex-end;

          .badge-d1 {
            font-size: 0.65rem;
            font-weight: 800;
            background: rgba(255, 214, 10, 0.18);
            color: #ffd60a;
            padding: 0.15rem 0.35rem;
            border-radius: 4px;
          }
          .badge-exito {
            font-size: 0.65rem;
            font-weight: 800;
            background: rgba(255, 59, 48, 0.18);
            color: #ff3b30;
            padding: 0.15rem 0.35rem;
            border-radius: 4px;
          }
        }
      }

      &.wash-tile {
        border-color: rgba(10, 132, 255, 0.3);
        .type-pill-water {
          font-size: 0.65rem;
          font-weight: 800;
          color: #0a84ff;
          background: rgba(10, 132, 255, 0.15);
          padding: 0.15rem 0.4rem;
          border-radius: 6px;
        }
      }

      &.heat-tile {
        border-color: rgba(255, 107, 53, 0.3);
        .type-pill-fire {
          font-size: 0.65rem;
          font-weight: 800;
          color: #ff6b35;
          background: rgba(255, 107, 53, 0.15);
          padding: 0.15rem 0.4rem;
          border-radius: 6px;
        }
      }

      .tile-rotom-img {
        width: 38px;
        height: 38px;
        object-fit: contain;

        &.wash-glow { filter: drop-shadow(0 0 6px rgba(10, 132, 255, 0.5)); }
        &.heat-glow { filter: drop-shadow(0 0 6px rgba(255, 107, 53, 0.5)); }
      }
    }

    /* ─── Highlights ─── */
    .quick-wiki {
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;

        h3 { font-size: 1.15rem; font-weight: 800; margin: 0; }
        .see-all {
          font-size: 0.8rem;
          color: var(--accent, #ff3b30);
          text-decoration: none;
          font-weight: 600;
        }
      }
    }

    .horizontal-scroll {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      &::-webkit-scrollbar { display: none; }
    }

    .wiki-card-mini {
      flex: 0 0 160px;
      scroll-snap-align: start;
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      overflow: hidden;
      text-decoration: none;
      color: inherit;

      &:active { transform: scale(0.97); }

      .cover-placeholder {
        height: 70px;
        background: linear-gradient(135deg, #2c2c2e, #1c1c1e);
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
        padding: 0.65rem 0.75rem;
        h4 {
          font-size: 0.85rem;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mini-meta {
          font-size: 0.7rem;
          color: var(--text-secondary, #8e8e93);
        }
      }
    }

    @keyframes rotomFloat {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
      100% { transform: translateY(-10px); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
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
