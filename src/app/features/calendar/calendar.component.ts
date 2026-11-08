import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { CatalogService } from '../../core/services/catalog.service';
import type { CalendarEvent } from '../../core/models/state.models';
import type { Recipe } from '../../core/models/catalog.models';

interface CalendarDay {
  dayNum: number;
  dateStr: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="calendar-container">
      <header class="page-header">
        <div class="header-title-row">
          <div class="title-left">
            <img src="assets/images/rotom/rotom-sprite.webp" alt="Rotom" class="header-sprite" />
            <h2>Calendario & Agenda</h2>
          </div>
          <button class="btn-schedule-recipe" (click)="openRecipeModal()">
            + Vincular Receta 🍳
          </button>
        </div>
        <p class="subtitle">Planifica comidas, repeticiones semanales y guías en tu iPhone</p>
      </header>

      <!-- Month Navigation Header -->
      <section class="month-card">
        <div class="month-controls">
          <button type="button" class="btn-nav-month" (click)="prevMonth()">‹</button>
          <div class="current-month-display">
            <h3>{{ currentMonthTitle() }}</h3>
            <button type="button" class="btn-today-pill" (click)="goToToday()">Hoy</button>
          </div>
          <button type="button" class="btn-nav-month" (click)="nextMonth()">›</button>
        </div>

        <!-- Weekday Headers (Lun - Dom) -->
        <div class="weekdays-grid">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>

        <!-- Full Month 7xN Grid -->
        <div class="month-grid">
          @for (day of monthDays(); track day.dateStr) {
            <button
              type="button"
              class="calendar-day-cell"
              [class.is-today]="day.isToday"
              [class.is-selected]="selectedDate() === day.dateStr"
              [class.not-current-month]="!day.isCurrentMonth"
              (click)="selectDate(day.dateStr)"
            >
              <span class="day-number">{{ day.dayNum }}</span>
              <div class="day-indicators">
                @for (ev of day.events.slice(0, 3); track ev.id) {
                  <span class="event-dot" [class]="ev.type" [title]="ev.title">
                    {{ getEventMiniSymbol(ev.type) }}
                  </span>
                }
                @if (day.events.length > 3) {
                  <span class="more-dot">+{{ day.events.length - 3 }}</span>
                }
              </div>
            </button>
          }
        </div>
      </section>

      <!-- Selected Day Schedule View -->
      <section class="selected-day-section">
        <div class="day-header">
          <div class="day-header-text">
            <h3>{{ formatSelectedDate(selectedDate()) }}</h3>
            <span class="day-events-count">
              {{ dayEvents().length }} planificado{{ dayEvents().length === 1 ? '' : 's' }}
            </span>
          </div>
          <button class="btn-quick-recipe-link" (click)="openRecipeModal()">
            🍳 Agendar Comida
          </button>
        </div>

        <!-- Quick Add Event (Tarea / Lavado / Nota) -->
        <div class="quick-add-bar">
          <input
            type="text"
            [(ngModel)]="newEventTitle"
            placeholder="Añadir tarea, recordatorio o lavado..."
            (keyup.enter)="addQuickEvent()"
            class="input-quick-title"
          />
          <select [(ngModel)]="newEventType" class="select-quick-type">
            <option value="tarea">✓ Tarea</option>
            <option value="lavado">🧺 Lavado</option>
            <option value="evento">📌 Evento</option>
          </select>
          <button class="btn-add-quick" (click)="addQuickEvent()">
            +
          </button>
        </div>

        <!-- Events List for Selected Day -->
        <div class="day-events-list">
          @if (dayEvents().length === 0) {
            <div class="no-events-card">
              <span class="no-events-emoji">🍃</span>
              <p>No hay recetas ni tareas agendadas para este día.</p>
              <button class="btn-link-first-recipe" (click)="openRecipeModal()">
                Vincular una receta ahora
              </button>
            </div>
          } @else {
            @for (event of dayEvents(); track event.id) {
              <div
                class="event-card"
                [class.completed]="event.completed"
                [class.is-recipe]="event.type === 'comida'"
              >
                <div class="event-main" (click)="toggleEvent(event.id!)">
                  <div class="event-check">
                    {{ event.completed ? '✓' : getEventMiniSymbol(event.type) }}
                  </div>
                  <div class="event-details">
                    <div class="event-title-row">
                      <span class="event-title">{{ event.title }}</span>
                      @if (event.recurrenceSeriesId) {
                        <span class="pill-recurrence" title="Se repite cada semana">🔁 Semanal</span>
                      }
                    </div>
                    <div class="event-meta-row">
                      <span class="meta-tag">{{ event.time || (event.type === 'comida' ? 'Almuerzo' : 'Todo el día') }}</span>
                      <span class="meta-tag type-tag">{{ event.type }}</span>
                    </div>
                  </div>
                </div>

                <!-- Recipe Specific Action Buttons -->
                <div class="event-actions">
                  @if (event.linkedItemId) {
                    <button
                      type="button"
                      class="btn-event-action btn-wiki-link"
                      (click)="goToWikiRecipe(event.linkedItemId)"
                      title="Abrir receta en Wiki"
                    >
                      📖 Ver Receta
                    </button>
                    <button
                      type="button"
                      class="btn-event-action btn-cart-push"
                      (click)="pushRecipeToShopping(event.linkedItemId)"
                      title="Enviar ingredientes a lista de compras"
                    >
                      🛒 Comprar
                    </button>
                  }
                  <button
                    type="button"
                    class="btn-delete-event"
                    (click)="removeEvent(event.id!)"
                    title="Eliminar evento"
                  >
                    ✕
                  </button>
                </div>
              </div>
            }
          }
        </div>
      </section>

      <!-- ================= MODAL VINCULAR RECETA CON REPETICIÓN ================= -->
      @if (showRecipeModal()) {
        <div class="modal-backdrop" (click)="closeRecipeModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-with-sprite">
                <img src="assets/images/rotom/rotom-heat-sprite.webp" alt="Rotom Horno" class="modal-sprite" />
                <h3>Vincular Receta al Día</h3>
              </div>
              <button class="btn-close-modal" (click)="closeRecipeModal()">✕</button>
            </div>

            <div class="modal-body">
              <p class="modal-desc">
                Agendando para: <strong>{{ formatSelectedDate(selectedDate()) }}</strong>
              </p>

              <!-- Recipe Dropdown / Picker -->
              <label>Selecciona la receta de cocina</label>
              <select [(ngModel)]="selectedRecipeId" class="recipe-select">
                <option value="" disabled>-- Elige una receta del catálogo --</option>
                @for (r of catalog.allRecipes(); track r.id) {
                  <option [value]="r.id">
                    🍳 {{ r.title }} ({{ r.cookTimeMinutes || 20 }}m)
                  </option>
                }
              </select>

              <!-- Meal Type -->
              <label>Momento de la comida</label>
              <div class="meal-time-selector">
                <button
                  type="button"
                  class="btn-time-pick"
                  [class.selected]="selectedMealTime === 'Desayuno'"
                  (click)="selectedMealTime = 'Desayuno'"
                >
                  Desayuno
                </button>
                <button
                  type="button"
                  class="btn-time-pick"
                  [class.selected]="selectedMealTime === 'Almuerzo'"
                  (click)="selectedMealTime = 'Almuerzo'"
                >
                  Almuerzo
                </button>
                <button
                  type="button"
                  class="btn-time-pick"
                  [class.selected]="selectedMealTime === 'Cena'"
                  (click)="selectedMealTime = 'Cena'"
                >
                  Cena
                </button>
              </div>

              <!-- RECURRENCIA PREGUNTA ESPECÍFICA -->
              <div class="recurrence-box">
                <label class="recurrence-title">
                  🔁 ¿Repetir las siguientes semanas?
                </label>
                <p class="recurrence-hint">
                  Rotom programará automáticamente esta comida el mismo día cada semana.
                </p>
                <div class="recurrence-options">
                  <button
                    type="button"
                    class="btn-rec-opt"
                    [class.active]="selectedRepeatWeeks === 0"
                    (click)="selectedRepeatWeeks = 0"
                  >
                    No repetir (solo este día)
                  </button>
                  <button
                    type="button"
                    class="btn-rec-opt"
                    [class.active]="selectedRepeatWeeks === 1"
                    (click)="selectedRepeatWeeks = 1"
                  >
                    Repetir 2 semanas (+1 semana)
                  </button>
                  <button
                    type="button"
                    class="btn-rec-opt"
                    [class.active]="selectedRepeatWeeks === 3"
                    (click)="selectedRepeatWeeks = 3"
                  >
                    Repetir 4 semanas (1 mes)
                  </button>
                  <button
                    type="button"
                    class="btn-rec-opt"
                    [class.active]="selectedRepeatWeeks === 7"
                    (click)="selectedRepeatWeeks = 7"
                  >
                    Repetir 8 semanas (2 meses)
                  </button>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeRecipeModal()">
                Cancelar
              </button>
              <button
                type="button"
                class="btn-confirm-schedule"
                [disabled]="!selectedRecipeId"
                (click)="confirmRecipeSchedule()"
              >
                ✓ Agendar Receta
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .calendar-container {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .page-header {
      .header-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .title-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .header-sprite {
            width: 30px;
            height: 30px;
            image-rendering: pixelated;
          }

          h2 { font-size: 1.6rem; font-weight: 800; margin: 0; }
        }

        .btn-schedule-recipe {
          background: var(--accent, #ff3b30);
          color: #fff;
          border: none;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.45rem 0.8rem;
          border-radius: 20px;
          cursor: pointer;
          &:active { opacity: 0.8; }
        }
      }

      .subtitle { color: var(--text-secondary, #8e8e93); font-size: 0.85rem; margin-top: 0.25rem; }
    }

    /* ─── Full Month Calendar Card ─── */
    .month-card {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;

      .month-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .btn-nav-month {
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid var(--border, #38383a);
          color: var(--text-primary, #fff);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          &:active { opacity: 0.7; }
        }

        .current-month-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          h3 {
            font-size: 1.1rem;
            font-weight: 800;
            margin: 0;
            text-transform: capitalize;
          }

          .btn-today-pill {
            background: var(--bg-tertiary, #2c2c2e);
            border: 1px solid var(--border, #38383a);
            color: var(--accent, #ff3b30);
            font-size: 0.7rem;
            font-weight: 700;
            padding: 0.15rem 0.45rem;
            border-radius: 6px;
            cursor: pointer;
          }
        }
      }

      .weekdays-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-secondary, #8e8e93);
        padding-bottom: 0.25rem;
        border-bottom: 1px solid var(--border, #38383a);
      }

      .month-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 3px;

        .calendar-day-cell {
          aspect-ratio: 1 / 1.1;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          color: var(--text-primary, #fff);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 3px 1px;
          cursor: pointer;
          position: relative;
          -webkit-tap-highlight-color: transparent;

          .day-number {
            font-size: 0.8rem;
            font-weight: 700;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }

          &.not-current-month {
            opacity: 0.25;
          }

          &.is-today {
            .day-number {
              background: rgba(255, 59, 48, 0.25);
              color: var(--accent, #ff3b30);
            }
          }

          &.is-selected {
            background: var(--bg-tertiary, #2c2c2e);
            border-color: var(--accent, #ff3b30);

            .day-number {
              background: var(--accent, #ff3b30);
              color: #fff;
            }
          }

          .day-indicators {
            display: flex;
            gap: 1px;
            margin-top: 2px;
            align-items: center;
            justify-content: center;

            .event-dot {
              font-size: 0.6rem;
              line-height: 1;
            }

            .more-dot {
              font-size: 0.55rem;
              color: var(--text-secondary, #8e8e93);
            }
          }
        }
      }
    }

    /* ─── Selected Day Section ─── */
    .selected-day-section {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;

      .day-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .day-header-text {
          h3 { font-size: 1.1rem; margin: 0; text-transform: capitalize; }
          .day-events-count {
            font-size: 0.75rem;
            color: var(--text-secondary, #8e8e93);
          }
        }

        .btn-quick-recipe-link {
          background: rgba(255, 107, 53, 0.18);
          border: 1px solid rgba(255, 107, 53, 0.4);
          color: #ff6b35;
          padding: 0.35rem 0.65rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
      }

      .quick-add-bar {
        display: flex;
        gap: 0.4rem;

        .input-quick-title {
          flex: 2;
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid var(--border, #38383a);
          border-radius: 8px;
          color: #fff;
          padding: 0.45rem 0.65rem;
          font-size: 0.85rem;
          &:focus { outline: none; border-color: var(--accent, #ff3b30); }
        }

        .select-quick-type {
          width: 90px;
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid var(--border, #38383a);
          border-radius: 8px;
          color: #fff;
          font-size: 0.75rem;
          padding: 0.35rem;
        }

        .btn-add-quick {
          width: 36px;
          background: var(--accent, #ff3b30);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 800;
          font-size: 1.1rem;
          cursor: pointer;
        }
      }

      .day-events-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .no-events-card {
          text-align: center;
          padding: 1.5rem 1rem;
          background: var(--bg-tertiary, #2c2c2e);
          border-radius: 12px;

          .no-events-emoji { font-size: 1.5rem; }
          p { font-size: 0.85rem; color: var(--text-secondary, #8e8e93); margin: 0.5rem 0 0.75rem; }
          .btn-link-first-recipe {
            background: var(--accent, #ff3b30);
            color: #fff;
            border: none;
            padding: 0.45rem 0.85rem;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
          }
        }

        .event-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid var(--border, #38383a);
          border-radius: 12px;
          padding: 0.65rem 0.75rem;
          gap: 0.5rem;

          &.completed {
            opacity: 0.5;
            .event-title { text-decoration: line-through; }
          }

          &.is-recipe {
            border-color: rgba(255, 107, 53, 0.4);
            background: linear-gradient(90deg, rgba(255, 107, 53, 0.08), var(--bg-tertiary, #2c2c2e));
          }

          .event-main {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            flex: 1;
            cursor: pointer;

            .event-check {
              width: 26px;
              height: 26px;
              border-radius: 50%;
              border: 1.5px solid var(--border, #555);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.8rem;
              flex-shrink: 0;
            }

            .event-details {
              display: flex;
              flex-direction: column;
              gap: 0.15rem;

              .event-title-row {
                display: flex;
                align-items: center;
                gap: 0.4rem;

                .event-title { font-size: 0.9rem; font-weight: 600; }
                .pill-recurrence {
                  font-size: 0.65rem;
                  color: #ffd60a;
                  background: rgba(255, 214, 10, 0.15);
                  padding: 0.1rem 0.35rem;
                  border-radius: 4px;
                  font-weight: 700;
                }
              }

              .event-meta-row {
                display: flex;
                gap: 0.35rem;

                .meta-tag {
                  font-size: 0.65rem;
                  color: var(--text-secondary, #8e8e93);
                  &.type-tag { text-transform: uppercase; font-weight: 700; }
                }
              }
            }
          }

          .event-actions {
            display: flex;
            align-items: center;
            gap: 0.35rem;

            .btn-event-action {
              background: var(--bg-secondary, #1c1c1e);
              border: 1px solid var(--border, #38383a);
              color: var(--text-primary, #fff);
              font-size: 0.7rem;
              padding: 0.3rem 0.5rem;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;

              &.btn-wiki-link {
                color: #ff6b35;
                border-color: rgba(255, 107, 53, 0.3);
              }

              &.btn-cart-push {
                color: var(--success, #30d158);
                border-color: rgba(48, 209, 88, 0.3);
              }
            }

            .btn-delete-event {
              background: none;
              border: none;
              color: var(--text-secondary, #8e8e93);
              font-size: 0.85rem;
              padding: 0.3rem;
              cursor: pointer;
            }
          }
        }
      }
    }

    /* ─── Modal Styles ─── */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-card {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: 20px;
      width: 100%;
      max-width: 480px;
      overflow: hidden;
      animation: popIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border, #38383a);

        .modal-title-with-sprite {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          .modal-sprite { width: 28px; height: 28px; image-rendering: pixelated; }
          h3 { font-size: 1.15rem; font-weight: 800; margin: 0; }
        }

        .btn-close-modal {
          background: none;
          border: none;
          color: var(--text-secondary, #8e8e93);
          font-size: 1.1rem;
          cursor: pointer;
        }
      }

      .modal-body {
        padding: 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;

        .modal-desc {
          font-size: 0.85rem;
          color: var(--text-secondary, #8e8e93);
          margin: 0;
          strong { color: #fff; }
        }

        label {
          font-size: 0.75rem;
          color: var(--text-secondary, #8e8e93);
          font-weight: 600;
        }

        .recipe-select {
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid var(--border, #38383a);
          border-radius: 8px;
          color: #fff;
          padding: 0.6rem;
          font-size: 0.85rem;
          &:focus { outline: none; border-color: var(--accent, #ff3b30); }
        }

        .meal-time-selector {
          display: flex;
          gap: 0.4rem;

          .btn-time-pick {
            flex: 1;
            background: var(--bg-tertiary, #2c2c2e);
            border: 1px solid var(--border, #38383a);
            color: var(--text-secondary, #8e8e93);
            padding: 0.45rem 0.2rem;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;

            &.selected {
              background: var(--accent, #ff3b30);
              color: #fff;
              border-color: var(--accent, #ff3b30);
            }
          }
        }

        .recurrence-box {
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid rgba(255, 214, 10, 0.25);
          border-radius: 12px;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;

          .recurrence-title {
            color: #ffd60a;
            font-size: 0.85rem;
            font-weight: 700;
          }

          .recurrence-hint {
            font-size: 0.7rem;
            color: var(--text-secondary, #8e8e93);
            margin: 0 0 0.25rem;
            line-height: 1.3;
          }

          .recurrence-options {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;

            .btn-rec-opt {
              text-align: left;
              background: var(--bg-secondary, #1c1c1e);
              border: 1px solid var(--border, #38383a);
              color: var(--text-secondary, #8e8e93);
              padding: 0.45rem 0.65rem;
              border-radius: 8px;
              font-size: 0.75rem;
              cursor: pointer;

              &.active {
                border-color: #ffd60a;
                color: #ffd60a;
                background: rgba(255, 214, 10, 0.1);
                font-weight: 700;
              }
            }
          }
        }
      }

      .modal-footer {
        padding: 0.75rem 1.25rem;
        border-top: 1px solid var(--border, #38383a);
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;

        .btn-cancel {
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid var(--border, #38383a);
          color: var(--text-secondary, #8e8e93);
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .btn-confirm-schedule {
          background: var(--accent, #ff3b30);
          color: #fff;
          border: none;
          padding: 0.5rem 1.2rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          &:disabled { opacity: 0.4; }
        }
      }
    }

    @keyframes popIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `],
})
export class CalendarComponent implements OnInit {
  readonly storage = inject(StorageService);
  readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);

  // Month navigation state
  currentYear = signal(new Date().getFullYear());
  currentMonth = signal(new Date().getMonth()); // 0-11
  selectedDate = signal(new Date().toISOString().slice(0, 10));

  dayEvents = signal<CalendarEvent[]>([]);

  // Quick event
  newEventTitle = '';
  newEventType: 'comida' | 'lavado' | 'tarea' | 'evento' = 'tarea';

  // Recipe recurrence modal state
  showRecipeModal = signal(false);
  selectedRecipeId = '';
  selectedMealTime = 'Almuerzo';
  selectedRepeatWeeks = 0; // 0 = solo este día, 1 = +1 semana, 3 = 1 mes, 7 = 2 meses

  readonly currentMonthTitle = computed(() => {
    const d = new Date(this.currentYear(), this.currentMonth(), 1);
    return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(d);
  });

  /**
   * Genera la grilla completa del mes (con días previos y posteriores para completar semanas de 7 días, lunes a domingo).
   */
  readonly monthDays = computed<CalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const allEvents = this.storage.calendarEvents();

    // Event map by dateStr
    const eventMap = new Map<string, CalendarEvent[]>();
    for (const ev of allEvents) {
      if (!eventMap.has(ev.date)) eventMap.set(ev.date, []);
      eventMap.get(ev.date)!.push(ev);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Día de la semana del 1er día (0 = Domingo, 1 = Lunes, ...)
    // En formato Lunes=0 ... Domingo=6:
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek < 0) startingDayOfWeek = 6;

    const days: CalendarDay[] = [];

    // Días del mes anterior para rellenar la primera semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      const prevD = new Date(year, month - 1, dNum);
      const dateStr = prevD.toISOString().slice(0, 10);
      days.push({
        dayNum: dNum,
        dateStr,
        isToday: dateStr === todayStr,
        isCurrentMonth: false,
        events: eventMap.get(dateStr) || [],
      });
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const curD = new Date(year, month, d);
      const dateStr = curD.toISOString().slice(0, 10);
      days.push({
        dayNum: d,
        dateStr,
        isToday: dateStr === todayStr,
        isCurrentMonth: true,
        events: eventMap.get(dateStr) || [],
      });
    }

    // Días del mes siguiente para completar la última semana
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextD = new Date(year, month + 1, d);
      const dateStr = nextD.toISOString().slice(0, 10);
      days.push({
        dayNum: d,
        dateStr,
        isToday: dateStr === todayStr,
        isCurrentMonth: false,
        events: eventMap.get(dateStr) || [],
      });
    }

    return days;
  });

  async ngOnInit(): Promise<void> {
    await this.loadDayEvents(this.selectedDate());
  }

  async selectDate(dateStr: string): Promise<void> {
    this.selectedDate.set(dateStr);
    const [y, m] = dateStr.split('-').map(Number);
    if (y !== this.currentYear() || m - 1 !== this.currentMonth()) {
      this.currentYear.set(y);
      this.currentMonth.set(m - 1);
    }
    await this.loadDayEvents(dateStr);
  }

  async loadDayEvents(dateStr: string): Promise<void> {
    const events = await this.storage.getEventsForDate(dateStr);
    this.dayEvents.set(events);
  }

  prevMonth(): void {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.update((y) => y - 1);
    } else {
      this.currentMonth.update((m) => m - 1);
    }
  }

  nextMonth(): void {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.update((y) => y + 1);
    } else {
      this.currentMonth.update((m) => m + 1);
    }
  }

  goToToday(): void {
    const today = new Date();
    this.currentYear.set(today.getFullYear());
    this.currentMonth.set(today.getMonth());
    this.selectDate(today.toISOString().slice(0, 10));
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

  getEventMiniSymbol(type: string): string {
    switch (type) {
      case 'comida': return '🍳';
      case 'lavado': return '🧺';
      case 'tarea': return '✓';
      default: return '📌';
    }
  }

  async toggleEvent(id: number): Promise<void> {
    await this.storage.toggleCalendarEvent(id);
    await this.loadDayEvents(this.selectedDate());
  }

  async removeEvent(id: number): Promise<void> {
    await this.storage.removeCalendarEvent(id);
    await this.loadDayEvents(this.selectedDate());
  }

  async addQuickEvent(): Promise<void> {
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
    await this.loadDayEvents(this.selectedDate());
  }

  // ─── Modal Recipe Recurrence ───
  openRecipeModal(): void {
    this.showRecipeModal.set(true);
    this.selectedRepeatWeeks = 0;
    const recipes = this.catalog.allRecipes();
    if (recipes.length > 0 && !this.selectedRecipeId) {
      this.selectedRecipeId = recipes[0].id;
    }
  }

  closeRecipeModal(): void {
    this.showRecipeModal.set(false);
  }

  async confirmRecipeSchedule(): Promise<void> {
    if (!this.selectedRecipeId) return;
    const recipe = this.catalog.getRecipeById(this.selectedRecipeId);
    if (!recipe) return;

    await this.storage.scheduleRecipeWithRecurrence({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      startDate: this.selectedDate(),
      time: this.selectedMealTime,
      repeatWeeks: this.selectedRepeatWeeks,
    });

    this.closeRecipeModal();
    await this.loadDayEvents(this.selectedDate());
  }

  goToWikiRecipe(recipeId: string): void {
    this.router.navigate(['/wiki', recipeId]);
  }

  async pushRecipeToShopping(recipeId: string): Promise<void> {
    const recipe = this.catalog.getRecipeById(recipeId);
    if (recipe) {
      const added = await this.storage.pushIngredientsToShoppingList(recipe, 'D1');
      alert(`✓ ¡${added} ingredientes añadidos a la lista de compras (D1)!`);
    }
  }
}
