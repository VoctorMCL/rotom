import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../core/services/storage.service';
import { CatalogService } from '../../core/services/catalog.service';
import type { CalendarEvent, DailyCheckIn } from '../../core/models/state.models';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="calendar-container">
      <header class="page-header">
        <h2>Agenda & Hábitos</h2>
        <p class="subtitle">Planifica comidas, lavados y check-ins diarios</p>
      </header>

      <!-- Horizontal Days Strip (iOS Style Week Selector) -->
      <div class="days-strip">
        @for (d of nextDays; track d.dateStr) {
          <button
            type="button"
            class="day-chip"
            [class.selected]="selectedDate() === d.dateStr"
            (click)="selectDate(d.dateStr)"
          >
            <span class="day-name">{{ d.dayName }}</span>
            <span class="day-num">{{ d.dayNum }}</span>
          </button>
        }
      </div>

      <!-- Selected Day Summary Card -->
      <section class="selected-day-card">
        <div class="card-head">
          <h3>{{ formatSelectedDate(selectedDate()) }}</h3>
          @if (dayCheckIn()) {
            <span class="checkin-pill">
              Ánimo: {{ getMoodEmoji(dayCheckIn()!.mood) }} | Energía: {{ dayCheckIn()!.energyLevel }}⚡
            </span>
          }
        </div>

        <!-- Add Event Quick Form -->
        <div class="schedule-form">
          <input
            type="text"
            [(ngModel)]="newEventTitle"
            placeholder="Planificar comida, lavado o tarea..."
            (keyup.enter)="addEvent()"
            class="event-input"
          />

          <div class="form-row">
            <select [(ngModel)]="newEventType" class="type-select">
              <option value="comida">🍳 Comida / Receta</option>
              <option value="lavado">🧺 Lavado de Ropa</option>
              <option value="tarea">✓ Tarea</option>
              <option value="evento">📌 Evento</option>
            </select>

            <button class="btn-schedule" (click)="addEvent()">
              Agendar
            </button>
          </div>
        </div>

        <!-- Day Events List -->
        <div class="events-list">
          @if (dayEvents().length === 0) {
            <p class="no-events">No hay nada programado para este día.</p>
          } @else {
            @for (event of dayEvents(); track event.id) {
              <div
                class="event-row"
                [class.completed]="event.completed"
                (click)="toggleEvent(event.id!)"
              >
                <div class="event-check">
                  {{ event.completed ? '✓' : getEventEmoji(event.type) }}
                </div>
                <div class="event-info">
                  <span class="event-title">{{ event.title }}</span>
                  <span class="event-type-badge">{{ event.type | titlecase }}</span>
                </div>
                <button
                  type="button"
                  class="btn-delete"
                  (click)="$event.stopPropagation(); removeEvent(event.id!)"
                >
                  ✕
                </button>
              </div>
            }
          }
        </div>
      </section>

      <!-- Quick Schedule from Catalog -->
      <section class="quick-catalog-schedule">
        <h4>Agendar Receta o Lavado de la Wiki</h4>
        <div class="catalog-pills">
          @for (item of catalog.items(); track item.id) {
            <button
              type="button"
              class="quick-cat-btn"
              (click)="scheduleCatalogItem(item.title, item.type === 'recipe' ? 'comida' : 'lavado')"
            >
              + {{ item.type === 'recipe' ? '🍳' : '🧺' }} {{ item.title }}
            </button>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .calendar-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .page-header {
      h2 { font-size: 1.7rem; font-weight: 800; margin: 0; }
      .subtitle { color: var(--text-secondary, #8e8e93); font-size: 0.85rem; margin-top: 0.25rem; }
    }

    .days-strip {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      -webkit-overflow-scrolling: touch;
      &::-webkit-scrollbar { display: none; }

      .day-chip {
        flex: 0 0 54px;
        height: 72px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        background: var(--bg-secondary, #1c1c1e);
        border: 1px solid var(--border, #38383a);
        border-radius: var(--input-radius, 12px);
        color: var(--text-secondary, #8e8e93);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;

        &.selected {
          background: var(--accent, #ff3b30);
          border-color: var(--accent, #ff3b30);
          color: #fff;
          transform: scale(1.04);
        }

        .day-name { font-size: 0.65rem; text-transform: uppercase; font-weight: 700; }
        .day-num { font-size: 1.15rem; font-weight: 800; }
      }
    }

    .selected-day-card {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;

        h3 { font-size: 1.1rem; margin: 0; }
        .checkin-pill {
          font-size: 0.75rem;
          color: var(--success, #30d158);
          background: rgba(48, 209, 88, 0.15);
          padding: 0.2rem 0.5rem;
          border-radius: 8px;
        }
      }
    }

    .schedule-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .event-input {
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px solid var(--border, #38383a);
        border-radius: var(--input-radius, 12px);
        color: var(--text-primary, #fff);
        padding: 0.65rem 0.85rem;
        font-size: 0.9rem;
        &:focus { outline: none; border-color: var(--accent, #ff3b30); }
      }

      .form-row {
        display: flex;
        gap: 0.5rem;
      }

      .type-select {
        flex: 1;
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px solid var(--border, #38383a);
        border-radius: var(--input-radius, 12px);
        color: var(--text-primary, #fff);
        padding: 0.5rem;
        font-size: 0.8rem;
      }

      .btn-schedule {
        background: var(--accent, #ff3b30);
        color: #fff;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: var(--input-radius, 12px);
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
      }
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .no-events {
        font-size: 0.85rem;
        color: var(--text-secondary, #8e8e93);
        text-align: center;
        padding: 1rem 0;
      }

      .event-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem 0.75rem;
        background: var(--bg-tertiary, #2c2c2e);
        border-radius: var(--input-radius, 12px);
        cursor: pointer;

        &.completed {
          opacity: 0.45;
          .event-title { text-decoration: line-through; }
        }

        .event-check {
          font-size: 1rem;
          width: 24px;
          text-align: center;
        }

        .event-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;

          .event-title { font-size: 0.9rem; font-weight: 500; }
          .event-type-badge {
            font-size: 0.65rem;
            color: var(--text-secondary, #8e8e93);
          }
        }

        .btn-delete {
          background: none;
          border: none;
          color: var(--text-tertiary, #636366);
          font-size: 0.85rem;
          cursor: pointer;
        }
      }
    }

    .quick-catalog-schedule {
      h4 { font-size: 0.95rem; margin-bottom: 0.5rem; }
      .catalog-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .quick-cat-btn {
        background: var(--bg-secondary, #1c1c1e);
        border: 1px solid var(--border, #38383a);
        color: var(--text-primary, #fff);
        padding: 0.4rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        cursor: pointer;

        &:active { opacity: 0.7; }
      }
    }
  `],
})
export class CalendarComponent implements OnInit {
  readonly storage = inject(StorageService);
  readonly catalog = inject(CatalogService);

  selectedDate = signal(new Date().toISOString().slice(0, 10));
  dayEvents = signal<CalendarEvent[]>([]);
  dayCheckIn = signal<DailyCheckIn | null>(null);

  newEventTitle = '';
  newEventType: 'comida' | 'lavado' | 'tarea' | 'evento' = 'comida';

  readonly nextDays: { dateStr: string; dayName: string; dayNum: number }[] = [];

  constructor() {
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = new Intl.DateTimeFormat('es-CL', { weekday: 'short' }).format(d);
      const dayNum = d.getDate();
      this.nextDays.push({ dateStr, dayName, dayNum });
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadDayData(this.selectedDate());
  }

  async selectDate(dateStr: string): Promise<void> {
    this.selectedDate.set(dateStr);
    await this.loadDayData(dateStr);
  }

  async loadDayData(dateStr: string): Promise<void> {
    const events = await this.storage.getEventsForDate(dateStr);
    this.dayEvents.set(events);

    const checkIn = await this.storage.getCheckInForDate(dateStr);
    this.dayCheckIn.set(checkIn || null);
  }

  formatSelectedDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  }

  getMoodEmoji(mood: number): string {
    const map = ['😫', '😕', '😐', '🙂', '🔥'];
    return map[mood - 1] || '😐';
  }

  getEventEmoji(type: string): string {
    switch (type) {
      case 'comida': return '🍳';
      case 'lavado': return '🧺';
      case 'tarea': return '✓';
      default: return '📌';
    }
  }

  async addEvent(): Promise<void> {
    const title = this.newEventTitle.trim();
    if (!title) return;

    await this.storage.addCalendarEvent({
      title,
      date: this.selectedDate(),
      type: this.newEventType,
      completed: false,
      createdAt: new Date().toISOString(),
    });

    this.newEventTitle = '';
    await this.loadDayData(this.selectedDate());
  }

  async scheduleCatalogItem(title: string, type: 'comida' | 'lavado'): Promise<void> {
    await this.storage.addCalendarEvent({
      title,
      date: this.selectedDate(),
      type,
      completed: false,
      createdAt: new Date().toISOString(),
    });
    await this.loadDayData(this.selectedDate());
  }

  async toggleEvent(id: number): Promise<void> {
    await this.storage.toggleCalendarEvent(id);
    await this.loadDayData(this.selectedDate());
  }

  async removeEvent(id: number): Promise<void> {
    await this.storage.removeCalendarEvent(id);
    await this.loadDayData(this.selectedDate());
  }
}
