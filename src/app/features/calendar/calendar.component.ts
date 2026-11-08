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
      gap: 1rem;
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
            width: 28px;
            height: 28px;
            image-rendering: pixelated;
          }

          h2 { font-size: 0.95rem; margin: 0; }
        }

        .btn-schedule-recipe {
          background: #0f2b0f;
          border: 2px solid var(--border-bright, #00ff66);
          box-shadow: 2px 2px 0px #000;
          color: var(--accent, #00ff66);
          font-family: var(--font-pixel, monospace);
          font-size: 0.55rem;
          padding: 0.4rem 0.65rem;
          cursor: pointer;
          &:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0px #000; }
        }
      }

      .subtitle {
        font-family: var(--font-terminal, monospace);
        color: var(--text-secondary, #74ad74);
        font-size: 1.1rem;
        margin-top: 0.2rem;
      }
    }

    /* ─── Full Month Calendar Card ─── */
    .month-card {
      background: #081408;
      border: 2px solid var(--border-bright, #00ff66);
      box-shadow: 3px 3px 0px #000;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;

      .month-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .btn-nav-month {
          background: #040804;
          border: 2px solid var(--border-bright, #00ff66);
          box-shadow: 2px 2px 0px #000;
          color: var(--accent, #00ff66);
          width: 32px;
          height: 32px;
          font-family: var(--font-pixel, monospace);
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          &:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0px #000; }
        }

        .current-month-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          h3 {
            font-size: 0.85rem;
            margin: 0;
            text-transform: uppercase;
            color: #fff;
          }

          .btn-today-pill {
            background: #0f2b0f;
            border: 1px solid var(--border-bright, #00ff66);
            color: var(--accent, #00ff66);
            font-family: var(--font-pixel, monospace);
            font-size: 0.5rem;
            padding: 0.15rem 0.4rem;
            cursor: pointer;
          }
        }
      }

      .weekdays-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        font-family: var(--font-pixel, monospace);
        font-size: 0.55rem;
        color: var(--text-secondary, #74ad74);
        padding-bottom: 0.25rem;
        border-bottom: 1px solid var(--border, #184218);
      }

      .month-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;

        .calendar-day-cell {
          aspect-ratio: 1 / 1.1;
          background: #040804;
          border: 1px solid var(--border, #184218);
          color: var(--text-primary, #e6ffe6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 2px 1px;
          cursor: pointer;
          position: relative;
          -webkit-tap-highlight-color: transparent;

          .day-number {
            font-family: var(--font-pixel, monospace);
            font-size: 0.6rem;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          &.not-current-month {
            opacity: 0.2;
          }

          &.is-today {
            border-color: #ffd60a;
            .day-number {
              color: #ffd60a;
              font-weight: 700;
            }
          }

          &.is-selected {
            background: #0d260d;
            border-color: var(--accent, #00ff66);
            box-shadow: 2px 2px 0px #000;

            .day-number {
              background: var(--accent, #00ff66);
              color: #000;
            }
          }

          .day-indicators {
            display: flex;
            gap: 1px;
            margin-top: 1px;
            align-items: center;
            justify-content: center;

            .event-dot {
              font-size: 0.6rem;
              line-height: 1;
            }

            .more-dot {
              font-family: var(--font-pixel, monospace);
              font-size: 0.45rem;
              color: var(--accent, #00ff66);
            }
          }
        }
      }
    }

    /* ─── Selected Day Section ─── */
    .selected-day-section {
      background: #081408;
      border: 2px solid var(--border-bright, #00ff66);
      box-shadow: 3px 3px 0px #000;
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      .day-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .day-header-text {
          h3 { font-size: 0.8rem; margin: 0; text-transform: uppercase; color: #fff; }
          .day-events-count {
            font-family: var(--font-terminal, monospace);
            font-size: 1.1rem;
            color: var(--text-secondary, #74ad74);
          }
        }

        .btn-quick-recipe-link {
          background: #331505;
          border: 1px solid #ff6b35;
          color: #ff6b35;
          font-family: var(--font-pixel, monospace);
          padding: 0.35rem 0.6rem;
          font-size: 0.55rem;
          cursor: pointer;
        }
      }

      .quick-add-bar {
        display: flex;
        gap: 0.4rem;

        .input-quick-title {
          flex: 2;
          background: #040804;
          border: 2px solid var(--border, #184218);
          color: #fff;
          font-family: var(--font-terminal, monospace);
          font-size: 1.25rem;
          padding: 0.35rem 0.55rem;
          &:focus { outline: none; border-color: var(--accent, #00ff66); }
        }

        .select-quick-type {
          width: 95px;
          background: #040804;
          border: 2px solid var(--border, #184218);
          color: #fff;
          font-family: var(--font-terminal, monospace);
          font-size: 1.1rem;
          padding: 0.25rem;
        }

        .btn-add-quick {
          width: 36px;
          background: #0f2b0f;
          border: 2px solid var(--border-bright, #00ff66);
          color: var(--accent, #00ff66);
          font-family: var(--font-pixel, monospace);
          font-size: 0.85rem;
          cursor: pointer;
        }
      }

      .day-events-list {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;

        .no-events-card {
          text-align: center;
          padding: 1.25rem 1rem;
          background: #040804;
          border: 1px solid var(--border, #184218);

          .no-events-emoji { font-size: 1.4rem; }
          p { font-family: var(--font-terminal, monospace); font-size: 1.15rem; color: var(--text-secondary, #74ad74); margin: 0.35rem 0 0.5rem; }
          .btn-link-first-recipe {
            background: #0f2b0f;
            border: 2px solid var(--border-bright, #00ff66);
            color: var(--accent, #00ff66);
            padding: 0.4rem 0.75rem;
            font-family: var(--font-pixel, monospace);
            font-size: 0.55rem;
            cursor: pointer;
          }
        }

        .event-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #040804;
          border: 2px solid var(--border, #184218);
          box-shadow: 2px 2px 0px #000;
          padding: 0.55rem 0.65rem;
          gap: 0.5rem;

          &.completed {
            opacity: 0.45;
            .event-title { text-decoration: line-through; }
          }

          &.is-recipe {
            border-color: #ff6b35;
            background: #120803;
          }

          .event-main {
            display: flex;
            align-items: center;
            gap: 0.55rem;
            flex: 1;
            cursor: pointer;

            .event-check {
              width: 22px;
              height: 22px;
              border: 2px solid var(--border-bright, #00ff66);
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: var(--font-pixel, monospace);
              font-size: 0.6rem;
              flex-shrink: 0;
            }

            .event-details {
              display: flex;
              flex-direction: column;
              gap: 0.1rem;

              .event-title-row {
                display: flex;
                align-items: center;
                gap: 0.35rem;

                .event-title {
                  font-family: var(--font-terminal, monospace);
                  font-size: 1.25rem;
                  color: #fff;
                }

                .pill-recurrence {
                  font-family: var(--font-pixel, monospace);
                  font-size: 0.45rem;
                  color: #000;
                  background: #ffd60a;
                  padding: 1px 3px;
                }
              }

              .event-meta-row {
                display: flex;
                gap: 0.35rem;

                .meta-tag {
                  font-family: var(--font-pixel, monospace);
                  font-size: 0.45rem;
                  color: var(--text-secondary, #74ad74);
                  &.type-tag { color: var(--accent, #00ff66); text-transform: uppercase; }
                }
              }
            }
          }

          .event-actions {
            display: flex;
            align-items: center;
            gap: 0.3rem;

            .btn-event-action {
              background: #081408;
              border: 1px solid var(--border, #184218);
              color: var(--text-primary, #e6ffe6);
              font-family: var(--font-pixel, monospace);
              font-size: 0.5rem;
              padding: 0.3rem 0.45rem;
              cursor: pointer;

              &.btn-wiki-link {
                color: #ff6b35;
                border-color: #ff6b35;
              }

              &.btn-cart-push {
                color: var(--accent, #00ff66);
                border-color: var(--accent, #00ff66);
              }
            }

            .btn-delete-event {
              background: none;
              border: none;
              color: #ff3b30;
              font-family: var(--font-pixel, monospace);
              font-size: 0.75rem;
              padding: 0.2rem;
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
      background: rgba(0, 0, 0, 0.85);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.85rem;
    }

    .modal-card {
      background: #081408;
      border: 3px solid var(--border-bright, #00ff66);
      box-shadow: 4px 4px 0px #000;
      width: 100%;
      max-width: 480px;
      overflow: hidden;

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        border-bottom: 2px solid var(--border-bright, #00ff66);

        .modal-title-with-sprite {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          .modal-sprite { width: 24px; height: 24px; image-rendering: pixelated; }
          h3 { font-size: 0.8rem; margin: 0; color: #fff; }
        }

        .btn-close-modal {
          background: none;
          border: none;
          color: var(--text-secondary, #74ad74);
          font-family: var(--font-pixel, monospace);
          font-size: 0.85rem;
          cursor: pointer;
        }
      }

      .modal-body {
        padding: 0.85rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;

        .modal-desc {
          font-family: var(--font-terminal, monospace);
          font-size: 1.15rem;
          color: var(--text-secondary, #74ad74);
          margin: 0;
          strong { color: #fff; }
        }

        label {
          font-family: var(--font-pixel, monospace);
          font-size: 0.55rem;
          color: var(--text-secondary, #74ad74);
        }

        .recipe-select {
          background: #040804;
          border: 2px solid var(--border, #184218);
          color: #fff;
          font-family: var(--font-terminal, monospace);
          font-size: 1.25rem;
          padding: 0.45rem;
          &:focus { outline: none; border-color: var(--accent, #00ff66); }
        }

        .meal-time-selector {
          display: flex;
          gap: 0.35rem;

          .btn-time-pick {
            flex: 1;
            background: #040804;
            border: 1px solid var(--border, #184218);
            color: var(--text-secondary, #74ad74);
            padding: 0.4rem 0.2rem;
            font-family: var(--font-pixel, monospace);
            font-size: 0.55rem;
            cursor: pointer;

            &.selected {
              background: #0f2b0f;
              color: #fff;
              border-color: var(--border-bright, #00ff66);
              box-shadow: 2px 2px 0px #000;
            }
          }
        }

        .recurrence-box {
          background: #040804;
          border: 2px solid #ffd60a;
          box-shadow: 2px 2px 0px #000;
          padding: 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;

          .recurrence-title {
            color: #ffd60a;
            font-family: var(--font-pixel, monospace);
            font-size: 0.65rem;
          }

          .recurrence-hint {
            font-family: var(--font-terminal, monospace);
            font-size: 1.05rem;
            color: var(--text-secondary, #74ad74);
            margin: 0 0 0.2rem;
          }

          .recurrence-options {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;

            .btn-rec-opt {
              text-align: left;
              background: #081408;
              border: 1px solid var(--border, #184218);
              color: var(--text-secondary, #74ad74);
              padding: 0.4rem 0.55rem;
              font-family: var(--font-terminal, monospace);
              font-size: 1.15rem;
              cursor: pointer;

              &.active {
                border-color: #ffd60a;
                color: #ffd60a;
                background: #1c1800;
              }
            }
          }
        }
      }

      .modal-footer {
        padding: 0.65rem 1rem;
        border-top: 2px solid var(--border, #184218);
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;

        .btn-cancel {
          background: #040804;
          border: 2px solid var(--border, #184218);
          color: var(--text-secondary, #74ad74);
          font-family: var(--font-pixel, monospace);
          padding: 0.45rem 0.75rem;
          font-size: 0.55rem;
          cursor: pointer;
        }

        .btn-confirm-schedule {
          background: #0f2b0f;
          border: 2px solid var(--border-bright, #00ff66);
          color: var(--accent, #00ff66);
          font-family: var(--font-pixel, monospace);
          padding: 0.45rem 1rem;
          font-size: 0.6rem;
          cursor: pointer;
          &:disabled { opacity: 0.3; }
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
