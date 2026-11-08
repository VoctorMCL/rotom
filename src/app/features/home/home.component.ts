import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { CatalogService } from '../../core/services/catalog.service';
import type { DailyCheckIn } from '../../core/models/state.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="home-container">
      <!-- Greeting & Date -->
      <section class="welcome-section">
        <div class="welcome-header">
          <div class="welcome-text">
            <span class="date-badge">{{ todayFormatted }}</span>
            <h1>¡Hola, Víctor! 👋</h1>
            <p class="subtitle">Rotom está activo y 100% offline en tu iPhone.</p>
          </div>
          <div class="rotom-avatar">
            <img src="assets/images/rotom/rotom-default.webp" alt="Rotom" class="floating-rotom" />
          </div>
        </div>
      </section>

      <!-- Persistent Storage Banner if not granted -->
      @if (!storage.isPersistent()) {
        <div class="banner-persistent" (click)="requestPersistence()">
          <span class="banner-icon">🛡️</span>
          <div class="banner-content">
            <strong>Protege tus datos contra Safari</strong>
            <span>Toca para activar almacenamiento persistente.</span>
          </div>
        </div>
      }

      <!-- Daily Check-In Widget -->
      <section class="card checkin-card">
        <div class="card-header">
          <h3>Check-In de Hoy</h3>
          @if (todayCheckIn()) {
            <span class="badge-done">Completado ✓</span>
          }
        </div>

        <div class="checkin-row">
          <label>Ánimo</label>
          <div class="emoji-selector">
            @for (item of moodOptions; track item.val) {
              <button
                type="button"
                class="emoji-btn"
                [class.selected]="selectedMood === item.val"
                (click)="setMood(item.val)"
              >
                {{ item.emoji }}
              </button>
            }
          </div>
        </div>

        <div class="checkin-row">
          <label>Energía</label>
          <div class="energy-selector">
            @for (level of [1, 2, 3, 4, 5]; track level) {
              <button
                type="button"
                class="level-btn"
                [class.selected]="selectedEnergy === level"
                (click)="setEnergy(level)"
              >
                {{ level }}⚡
              </button>
            }
          </div>
        </div>

        <button class="btn-save-checkin" (click)="saveCheckIn()">
          {{ todayCheckIn() ? 'Actualizar Check-In' : 'Guardar Check-In' }}
        </button>
      </section>

      <!-- Quick Metrics Grid -->
      <section class="metrics-grid">
        <a routerLink="/shopping" class="metric-card">
          <div class="metric-top">
            <span class="metric-icon">🛒</span>
            <span class="metric-val">{{ storage.uncheckedShoppingCount() }}</span>
          </div>
          <span class="metric-label">Por comprar</span>
        </a>

        <a routerLink="/todo" class="metric-card">
          <div class="metric-top">
            <span class="metric-icon">✓</span>
            <span class="metric-val">{{ storage.pendingTodoCount() }}</span>
          </div>
          <span class="metric-label">Tareas pendientes</span>
        </a>

        <a routerLink="/calendar" class="metric-card">
          <div class="metric-top">
            <span class="metric-icon">📅</span>
            <span class="metric-val">{{ todayEventsCount }}</span>
          </div>
          <span class="metric-label">Agenda hoy</span>
        </a>
      </section>

      <!-- Quick Wiki Highlights -->
      <section class="quick-wiki">
        <div class="section-header">
          <h3>Wiki Rápida</h3>
          <a routerLink="/wiki" class="see-all">Ver todo →</a>
        </div>

        <div class="horizontal-scroll">
          @for (item of catalog.items(); track item.id) {
            <a [routerLink]="['/wiki', item.id]" class="wiki-card-mini">
              <div class="cover-placeholder">
                <span class="cover-type">{{ item.type === 'recipe' ? '🍳' : '🧺' }}</span>
              </div>
              <div class="mini-info">
                <h4>{{ item.title }}</h4>
                <span class="mini-meta">
                  {{ item.type === 'recipe' ? 'Receta' : 'Lavado' }}
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

      .welcome-text {
        flex: 1;
      }

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

    .banner-persistent {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: var(--card-radius, 16px);
      background: rgba(255, 214, 10, 0.15);
      border: 1px solid rgba(255, 214, 10, 0.3);
      color: #ffd60a;
      cursor: pointer;

      .banner-icon { font-size: 1.5rem; }
      .banner-content {
        display: flex;
        flex-direction: column;
        strong { font-size: 0.85rem; }
        span { font-size: 0.75rem; opacity: 0.9; }
      }
    }

    .card {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 1.25rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      h3 { font-size: 1.1rem; margin: 0; }
      .badge-done {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--success, #30d158);
        background: rgba(48, 209, 88, 0.15);
        padding: 0.2rem 0.5rem;
        border-radius: 8px;
      }
    }

    .checkin-row {
      margin-bottom: 1rem;

      label {
        display: block;
        font-size: 0.8rem;
        color: var(--text-secondary, #8e8e93);
        margin-bottom: 0.5rem;
      }
    }

    .emoji-selector,
    .energy-selector {
      display: flex;
      gap: 0.5rem;
      justify-content: space-between;
    }

    .emoji-btn,
    .level-btn {
      flex: 1;
      padding: 0.5rem 0.25rem;
      border-radius: var(--input-radius, 12px);
      border: 1px solid var(--border, #38383a);
      background: var(--bg-tertiary, #2c2c2e);
      font-size: 1.25rem;
      color: var(--text-primary, #fff);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-tap-highlight-color: transparent;

      &.selected {
        background: var(--accent, #ff3b30);
        border-color: var(--accent, #ff3b30);
        transform: scale(1.05);
      }
    }

    .level-btn {
      font-size: 0.85rem;
      font-weight: 600;
    }

    .btn-save-checkin {
      width: 100%;
      padding: 0.75rem;
      border-radius: var(--input-radius, 12px);
      border: none;
      background: var(--accent, #ff3b30);
      color: #fff;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      margin-top: 0.25rem;

      &:active {
        opacity: 0.8;
      }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .metric-card {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 1rem 0.75rem;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      &:active {
        transform: scale(0.97);
      }

      .metric-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .metric-icon { font-size: 1.25rem; }
      .metric-val {
        font-size: 1.4rem;
        font-weight: 800;
        color: var(--accent, #ff3b30);
      }

      .metric-label {
        font-size: 0.75rem;
        color: var(--text-secondary, #8e8e93);
        font-weight: 500;
      }
    }

    .quick-wiki {
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;

        h3 { font-size: 1.1rem; margin: 0; }
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

    @keyframes rotomFloat {
      0% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-6px) rotate(2deg);
      }
      100% {
        transform: translateY(-12px) rotate(-2deg);
      }
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

      &:active {
        transform: scale(0.97);
      }

      .cover-placeholder {
        height: 90px;
        background: linear-gradient(135deg, #2c2c2e, #1c1c1e);
        display: flex;
        align-items: center;
        justify-content: center;

        .cover-type { font-size: 2.25rem; }
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
  `],
})
export class HomeComponent implements OnInit {
  readonly storage = inject(StorageService);
  readonly catalog = inject(CatalogService);

  readonly todayStr = new Date().toISOString().slice(0, 10);
  readonly todayFormatted = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  readonly moodOptions: { val: 1 | 2 | 3 | 4 | 5; emoji: string }[] = [
    { val: 1, emoji: '😫' },
    { val: 2, emoji: '😕' },
    { val: 3, emoji: '😐' },
    { val: 4, emoji: '🙂' },
    { val: 5, emoji: '🔥' },
  ];

  selectedMood: 1 | 2 | 3 | 4 | 5 = 4;
  selectedEnergy: number = 3;
  todayCheckIn = signal<DailyCheckIn | null>(null);
  todayEventsCount = 0;

  async ngOnInit(): Promise<void> {
    const existing = await this.storage.getCheckInForDate(this.todayStr);
    if (existing) {
      this.todayCheckIn.set(existing);
      this.selectedMood = existing.mood;
      this.selectedEnergy = existing.energyLevel;
    }

    const events = await this.storage.getEventsForDate(this.todayStr);
    this.todayEventsCount = events.length;
  }

  setMood(val: 1 | 2 | 3 | 4 | 5): void {
    this.selectedMood = val;
  }

  setEnergy(val: number): void {
    this.selectedEnergy = val;
  }

  async saveCheckIn(): Promise<void> {
    const checkIn: Omit<DailyCheckIn, 'id'> = {
      date: this.todayStr,
      mood: this.selectedMood,
      energyLevel: this.selectedEnergy as 1 | 2 | 3 | 4 | 5,
      createdAt: new Date().toISOString(),
    };

    await this.storage.addCheckIn(checkIn);
    this.todayCheckIn.set(checkIn as DailyCheckIn);
  }

  async requestPersistence(): Promise<void> {
    await this.storage.requestPersistentStorage();
  }
}
