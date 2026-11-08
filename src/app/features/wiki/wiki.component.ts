import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { StorageService } from '../../core/services/storage.service';
import type { Recipe, LaundryGuide, CatalogItem, Ingredient, Step } from '../../core/models/catalog.models';
import type { CustomCatalogItem, SupermarketStore } from '../../core/models/state.models';

@Component({
  selector: 'app-wiki',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wiki-container">
      @if (!selectedItem()) {
        <!-- Main Catalog List View -->
        <header class="wiki-header">
          <div class="header-title-row">
            <div class="title-left">
              <h2>Wiki de Vida</h2>
              <div class="rotom-modes-preview">
                <img src="assets/images/rotom/rotom-heat-sprite.webp" alt="Rotom Horno" title="Modo Cocina" class="mode-sprite" />
                <img src="assets/images/rotom/rotom-wash-sprite.webp" alt="Rotom Lavadora" title="Modo Lavado" class="mode-sprite" />
              </div>
            </div>
            <button class="btn-open-create" (click)="openCreateModal()">
              + Nueva Guía
            </button>
          </div>
          <p class="subtitle">Recetas y manuales de lavado guardados en tu iPhone</p>

          <!-- Type Filter Tabs -->
          <div class="segmented-control">
            <button
              type="button"
              [class.active]="activeType() === 'all'"
              (click)="activeType.set('all')"
            >
              Todos ({{ catalog.allItems().length }})
            </button>
            <button
              type="button"
              [class.active]="activeType() === 'recipe'"
              (click)="activeType.set('recipe')"
            >
              <img src="assets/images/rotom/rotom-heat-sprite.webp" class="tab-sprite" alt="" />
              Recetas ({{ catalog.allRecipes().length }})
            </button>
            <button
              type="button"
              [class.active]="activeType() === 'laundry'"
              (click)="activeType.set('laundry')"
            >
              <img src="assets/images/rotom/rotom-wash-sprite.webp" class="tab-sprite" alt="" />
              Lavado ({{ catalog.allLaundryGuides().length }})
            </button>
          </div>

          <!-- Search Input -->
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Buscar recetas, ingredientes, prendas..."
            />
            @if (searchQuery) {
              <button class="btn-clear-q" (click)="searchQuery = ''">✕</button>
            }
          </div>
        </header>

        <!-- Catalog Grid -->
        <div class="catalog-grid">
          @for (item of filteredItems(); track item.id) {
            <article class="catalog-card" (click)="openDetail(item)">
              <div class="card-cover">
                <img
                  [src]="item.coverImage || (item.type === 'recipe' ? 'assets/images/rotom/rotom-heat.webp' : 'assets/images/rotom/rotom-wash.webp')"
                  [alt]="item.title"
                  (error)="onImgError($event)"
                  loading="lazy"
                />
                <!-- Rotom Form Badge on Card -->
                <div class="rotom-card-badge" [class.heat]="item.type === 'recipe'" [class.wash]="item.type === 'laundry'">
                  <img
                    [src]="item.type === 'recipe' ? 'assets/images/rotom/rotom-heat-sprite.webp' : 'assets/images/rotom/rotom-wash-sprite.webp'"
                    [alt]="item.type === 'recipe' ? 'Rotom Horno' : 'Rotom Lavadora'"
                    class="badge-icon"
                  />
                  <span>{{ item.type === 'recipe' ? 'Horno' : 'Lavadora' }}</span>
                </div>
              </div>

              <div class="card-body">
                <div class="card-body-top">
                  <h3>{{ item.title }}</h3>
                  @if (isCustomItem(item.id)) {
                    <span class="custom-badge-pill">✨ Tuya</span>
                  }
                </div>
                <p class="desc">{{ item.description }}</p>

                <div class="card-footer">
                  <div class="tags">
                    @for (tag of item.tags; track tag) {
                      <span class="tag">#{{ tag }}</span>
                    }
                  </div>
                  @if (item.type === 'recipe') {
                    <span class="meta-time">⏱️ {{ asRecipe(item).cookTimeMinutes || 20 }}m</span>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      } @else {
        <!-- Detail View -->
        <div class="detail-view">
          <div class="detail-top-nav">
            <button class="btn-back" (click)="closeDetail()">
              ← Volver al catálogo
            </button>
            @if (isCustomItem(selectedItem()!.id)) {
              <button class="btn-delete-custom" (click)="deleteSelectedCustomItem()">
                🗑️ Eliminar
              </button>
            }
          </div>

          <!-- ================= RECIPE DETAIL (ROTOM HORNO) ================= -->
          @if (selectedItem()!.type === 'recipe') {
            @let r = asRecipe(selectedItem()!);
            <article class="detail-card">
              <!-- Rotom Mascot Companion Banner: FORMA HORNO (Fuego) -->
              <div class="rotom-companion-banner heat-mode">
                <div class="companion-avatar-wrap">
                  <img src="assets/images/rotom/rotom-heat.webp" alt="Rotom Horno" class="rotom-companion-img heat-glow" />
                </div>
                <div class="companion-info">
                  <div class="companion-tag">ROTOM FORMA HORNO 🔥 (TIPO FUEGO)</div>
                  <h4>¡A cocinar se ha dicho!</h4>
                  <p>Mantengo el calor listo. Sigue cada paso y envía los ingredientes a tu lista de compras.</p>
                </div>
              </div>

              <div class="detail-header-img">
                <img
                  [src]="r.coverImage || 'assets/images/rotom/rotom-heat.webp'"
                  [alt]="r.title"
                  (error)="onImgError($event)"
                />
                <div class="img-overlay">
                  <span class="badge-type">🍳 Receta de Cocina</span>
                  <h2>{{ r.title }}</h2>
                </div>
              </div>

              <div class="detail-content">
                <p class="detail-desc">{{ r.description }}</p>

                <div class="stats-row">
                  <div class="stat">
                    <span class="stat-label">Porciones</span>
                    <span class="stat-val">{{ r.servings || 2 }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Prep</span>
                    <span class="stat-val">{{ r.prepTimeMinutes || 10 }}m</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Cocción</span>
                    <span class="stat-val">{{ r.cookTimeMinutes || 20 }}m</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Dificultad</span>
                    <span class="stat-val">{{ r.difficulty || 'media' }}</span>
                  </div>
                </div>

                <!-- Push Ingredients to Shopping List with Store Option -->
                <div class="action-box">
                  <div class="push-store-picker">
                    <span class="label-push-store">Enviar a:</span>
                    <button
                      type="button"
                      class="btn-store-pick"
                      [class.active]="targetPushStore === 'D1'"
                      (click)="targetPushStore = 'D1'"
                    >
                      🟡 D1
                    </button>
                    <button
                      type="button"
                      class="btn-store-pick"
                      [class.active]="targetPushStore === 'Éxito'"
                      (click)="targetPushStore = 'Éxito'"
                    >
                      🔴 Éxito
                    </button>
                  </div>
                  <button class="btn-push-shopping" (click)="pushIngredients(r)">
                    🛒 Enviar {{ r.ingredients?.length || 0 }} ingredientes a Compras
                  </button>
                  @if (pushMessage()) {
                    <p class="push-alert">{{ pushMessage() }}</p>
                  }
                </div>

                <!-- Ingredients Section -->
                @if (r.ingredients && r.ingredients.length > 0) {
                  <section class="ingredients-section">
                    <h3>Ingredientes</h3>
                    <ul class="ingredients-list">
                      @for (ing of r.ingredients; track ing.name) {
                        <li class="ingredient-item">
                          <span class="ing-name">{{ ing.name }}</span>
                          <span class="ing-qty">{{ ing.quantity }}</span>
                          @if (ing.optional) {
                            <span class="ing-optional">(opcional)</span>
                          }
                        </li>
                      }
                    </ul>
                  </section>
                }

                <!-- Steps Section with Checkable Progress & Custom Step Addition -->
                <section class="steps-section">
                  <div class="steps-header">
                    <div class="steps-title-with-mascot">
                      <img src="assets/images/rotom/rotom-heat-sprite.webp" class="step-mascot-sprite" alt="" />
                      <h3>Pasos de Preparación</h3>
                    </div>
                    <button class="btn-reset-steps" (click)="resetSteps(r.id)">
                      Reiniciar
                    </button>
                  </div>

                  <div class="steps-list">
                    @for (s of r.steps; track s.order) {
                      <div
                        class="step-item"
                        [class.completed]="isStepDone(s.order)"
                        (click)="toggleStep(r.id, s.order)"
                      >
                        <div class="step-checkbox">
                          {{ isStepDone(s.order) ? '✓' : s.order }}
                        </div>
                        <div class="step-text">
                          <p>{{ s.instruction }}</p>
                          @if (s.durationMinutes) {
                            <span class="step-timer">⏱️ ~{{ s.durationMinutes }} minutos</span>
                          }
                          @if (s.image) {
                            <img [src]="s.image" [alt]="'Paso ' + s.order" class="step-img" (error)="onImgError($event)" />
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <!-- AÑADIR PASO A CUALQUIER RECETA -->
                  <div class="add-step-card">
                    @if (!showAddStepInput) {
                      <button class="btn-trigger-add-step" (click)="showAddStepInput = true">
                        + Agregar paso a esta receta
                      </button>
                    } @else {
                      <div class="add-step-inline-form">
                        <h4>Añadir nuevo paso</h4>
                        <textarea
                          [(ngModel)]="newStepText"
                          placeholder="Describe el paso que quieres agregar..."
                          rows="2"
                          class="step-textarea"
                        ></textarea>
                        <div class="step-form-row">
                          <input
                            type="number"
                            [(ngModel)]="newStepDuration"
                            placeholder="Minutos (opcional)"
                            class="step-time-input"
                          />
                          <button class="btn-save-step" (click)="saveNewStep(r)">
                            ✓ Guardar Paso
                          </button>
                          <button class="btn-cancel-step" (click)="showAddStepInput = false">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </section>
              </div>
            </article>
          }

          <!-- ================= LAUNDRY DETAIL (ROTOM LAVADORA) ================= -->
          @if (selectedItem()!.type === 'laundry') {
            @let l = asLaundry(selectedItem()!);
            <article class="detail-card">
              <!-- Rotom Mascot Companion Banner: FORMA LAVADORA (Agua) -->
              <div class="rotom-companion-banner wash-mode">
                <div class="companion-avatar-wrap">
                  <img src="assets/images/rotom/rotom-wash.webp" alt="Rotom Lavadora" class="rotom-companion-img wash-glow" />
                </div>
                <div class="companion-info">
                  <div class="companion-tag">ROTOM FORMA LAVADORA 💧 (TIPO AGUA)</div>
                  <h4>¡Ciclo de lavado listo!</h4>
                  <p>Calculo el flujo de agua y centrifugado óptimo para proteger esta tela.</p>
                </div>
              </div>

              <div class="detail-header-img">
                <img
                  [src]="l.coverImage || 'assets/images/rotom/rotom-wash.webp'"
                  [alt]="l.title"
                  (error)="onImgError($event)"
                />
                <div class="img-overlay">
                  <span class="badge-type">🧺 Guía de Lavado</span>
                  <h2>{{ l.title }}</h2>
                </div>
              </div>

              <div class="detail-content">
                <p class="detail-desc">{{ l.description }}</p>

                <!-- Fabric Care Symbols -->
                @if (l.fabricCare && l.fabricCare.length > 0) {
                  <div class="care-symbols-box">
                    <h4>Símbolos de Cuidado</h4>
                    <div class="symbols-grid">
                      @for (symbol of l.fabricCare; track symbol.label) {
                        <div class="symbol-card">
                          <img [src]="symbol.icon" [alt]="symbol.label" class="symbol-img" (error)="onImgError($event)" />
                          <strong>{{ symbol.label }}</strong>
                          <p>{{ symbol.description }}</p>
                        </div>
                      }
                    </div>
                  </div>
                }

                <div class="stats-row">
                  <div class="stat">
                    <span class="stat-label">Temperatura</span>
                    <span class="stat-val">{{ l.washTemp || 'Fría' }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Secado</span>
                    <span class="stat-val">{{ l.dryMethod || 'Sombra' }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Planchado</span>
                    <span class="stat-val">{{ l.ironTemp || 'Tibia' }}</span>
                  </div>
                </div>

                <!-- Steps Section -->
                <section class="steps-section">
                  <div class="steps-header">
                    <div class="steps-title-with-mascot">
                      <img src="assets/images/rotom/rotom-wash-sprite.webp" class="step-mascot-sprite" alt="" />
                      <h3>Instrucciones de Lavado</h3>
                    </div>
                    <button class="btn-reset-steps" (click)="resetSteps(l.id)">
                      Reiniciar
                    </button>
                  </div>

                  <div class="steps-list">
                    @for (s of l.steps; track s.order) {
                      <div
                        class="step-item"
                        [class.completed]="isStepDone(s.order)"
                        (click)="toggleStep(l.id, s.order)"
                      >
                        <div class="step-checkbox">
                          {{ isStepDone(s.order) ? '✓' : s.order }}
                        </div>
                        <div class="step-text">
                          <p>{{ s.instruction }}</p>
                          @if (s.durationMinutes) {
                            <span class="step-timer">⏱️ ~{{ s.durationMinutes }} min</span>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <!-- AÑADIR PASO A CUALQUIER GUÍA DE LAVADO -->
                  <div class="add-step-card">
                    @if (!showAddStepInput) {
                      <button class="btn-trigger-add-step" (click)="showAddStepInput = true">
                        + Agregar paso a esta guía de lavado
                      </button>
                    } @else {
                      <div class="add-step-inline-form">
                        <h4>Añadir nuevo paso de lavado</h4>
                        <textarea
                          [(ngModel)]="newStepText"
                          placeholder="Describe el paso que quieres agregar..."
                          rows="2"
                          class="step-textarea"
                        ></textarea>
                        <div class="step-form-row">
                          <input
                            type="number"
                            [(ngModel)]="newStepDuration"
                            placeholder="Minutos (opcional)"
                            class="step-time-input"
                          />
                          <button class="btn-save-step" (click)="saveNewStep(l)">
                            ✓ Guardar Paso
                          </button>
                          <button class="btn-cancel-step" (click)="showAddStepInput = false">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </section>

                <!-- Pro Tips -->
                @if (l.tips && l.tips.length > 0) {
                  <section class="tips-section">
                    <h4>💡 Consejos del Experto</h4>
                    <ul>
                      @for (tip of l.tips; track tip) {
                        <li>{{ tip }}</li>
                      }
                    </ul>
                  </section>
                }
              </div>
            </article>
          }
        </div>
      }

      <!-- ================= MODAL CREAR RECETA O LAVADO ================= -->
      @if (isCreating()) {
        <div class="modal-backdrop" (click)="closeCreateModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-header-title">
                <img
                  [src]="createType === 'recipe' ? 'assets/images/rotom/rotom-heat-sprite.webp' : 'assets/images/rotom/rotom-wash-sprite.webp'"
                  alt=""
                  class="modal-sprite"
                />
                <h3>Crear Nueva Guía</h3>
              </div>
              <button class="btn-close-modal" (click)="closeCreateModal()">✕</button>
            </div>

            <!-- Type Selector Tabs -->
            <div class="create-type-selector">
              <button
                type="button"
                class="type-btn"
                [class.active]="createType === 'recipe'"
                (click)="createType = 'recipe'"
              >
                🍳 Receta de Cocina (Rotom Horno)
              </button>
              <button
                type="button"
                class="type-btn"
                [class.active]="createType === 'laundry'"
                (click)="createType = 'laundry'"
              >
                🧺 Guía de Lavado (Rotom Lavadora)
              </button>
            </div>

            <div class="modal-body-scroll">
              <!-- General Info -->
              <label>Título *</label>
              <input
                type="text"
                [(ngModel)]="createTitle"
                [placeholder]="createType === 'recipe' ? 'Ej: Arroz con Pollo Criollo' : 'Ej: Lavado de Chaqueta Impermeable'"
                class="modal-input"
              />

              <label>Descripción</label>
              <textarea
                [(ngModel)]="createDesc"
                placeholder="Breve resumen o recomendaciones..."
                rows="2"
                class="modal-textarea"
              ></textarea>

              <label>Etiquetas (separadas por coma)</label>
              <input
                type="text"
                [(ngModel)]="createTagsStr"
                placeholder="ej: pollo, rápido, almuerzo"
                class="modal-input"
              />

              <!-- Recipe Specific Fields -->
              @if (createType === 'recipe') {
                <div class="recipe-specific-box">
                  <div class="grid-2-col">
                    <div>
                      <label>Tiempo Prep (min)</label>
                      <input type="number" [(ngModel)]="createPrepTime" class="modal-input" />
                    </div>
                    <div>
                      <label>Tiempo Cocción (min)</label>
                      <input type="number" [(ngModel)]="createCookTime" class="modal-input" />
                    </div>
                  </div>

                  <div class="grid-2-col">
                    <div>
                      <label>Porciones</label>
                      <input type="number" [(ngModel)]="createServings" class="modal-input" />
                    </div>
                    <div>
                      <label>Dificultad</label>
                      <select [(ngModel)]="createDifficulty" class="modal-select">
                        <option value="fácil">Fácil</option>
                        <option value="intermedio">Intermedio</option>
                        <option value="avanzado">Avanzado</option>
                      </select>
                    </div>
                  </div>

                  <!-- Ingredients Manager -->
                  <div class="ingredients-builder">
                    <label>Ingredientes</label>
                    <div class="ing-add-row">
                      <input
                        type="text"
                        [(ngModel)]="newIngName"
                        placeholder="Ingrediente (ej: Pechuga)"
                        class="modal-input flex-2"
                      />
                      <input
                        type="text"
                        [(ngModel)]="newIngQty"
                        placeholder="Cant. (500g)"
                        class="modal-input flex-1"
                      />
                      <button type="button" class="btn-sub-add" (click)="addIngredientToDraft()">
                        + Añadir
                      </button>
                    </div>

                    <div class="ing-draft-chips">
                      @for (ing of draftIngredients; track ing.name; let idx = $index) {
                        <span class="draft-chip">
                          {{ ing.name }} ({{ ing.quantity }})
                          <button type="button" (click)="removeIngredientFromDraft(idx)">×</button>
                        </span>
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- Laundry Specific Fields -->
              @if (createType === 'laundry') {
                <div class="laundry-specific-box">
                  <label>Temperatura recomendada</label>
                  <input
                    type="text"
                    [(ngModel)]="createWashTemp"
                    placeholder="Ej: 30°C / Agua Fría"
                    class="modal-input"
                  />

                  <div class="grid-2-col">
                    <div>
                      <label>Secado</label>
                      <input
                        type="text"
                        [(ngModel)]="createDryMethod"
                        placeholder="Ej: A la sombra"
                        class="modal-input"
                      />
                    </div>
                    <div>
                      <label>Planchado</label>
                      <input
                        type="text"
                        [(ngModel)]="createIronTemp"
                        placeholder="Ej: Plancha tibia"
                        class="modal-input"
                      />
                    </div>
                  </div>

                  <label>Consejos o advertencias (separados por coma)</label>
                  <textarea
                    [(ngModel)]="createTipsStr"
                    placeholder="Ej: No usar suavizante, abotonar antes de centrifugar"
                    rows="2"
                    class="modal-textarea"
                  ></textarea>
                </div>
              }

              <!-- Steps Builder -->
              <div class="steps-builder">
                <label>Pasos a seguir</label>
                <div class="step-add-row">
                  <input
                    type="text"
                    [(ngModel)]="draftStepText"
                    placeholder="Escribe un paso y pulsa Añadir..."
                    class="modal-input flex-3"
                    (keyup.enter)="addStepToDraft()"
                  />
                  <input
                    type="number"
                    [(ngModel)]="draftStepMins"
                    placeholder="Min."
                    class="modal-input flex-1"
                  />
                  <button type="button" class="btn-sub-add" (click)="addStepToDraft()">
                    + Añadir
                  </button>
                </div>

                <div class="draft-steps-list">
                  @for (s of draftSteps; track s.order; let idx = $index) {
                    <div class="draft-step-item">
                      <span class="step-num">{{ idx + 1 }}.</span>
                      <span class="step-text">{{ s.instruction }}</span>
                      @if (s.durationMinutes) {
                        <span class="step-mins">({{ s.durationMinutes }}m)</span>
                      }
                      <button type="button" class="btn-del-step" (click)="removeStepFromDraft(idx)">✕</button>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeCreateModal()">Cancelar</button>
              <button type="button" class="btn-save-item" (click)="saveCreatedItem()">
                ✓ Guardar en Rotom
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .wiki-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .wiki-header {
      .header-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .title-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;

          h2 { font-size: 1.7rem; font-weight: 800; margin: 0; }
          .rotom-modes-preview {
            display: flex;
            gap: 0.25rem;
            .mode-sprite {
              width: 26px;
              height: 26px;
              image-rendering: pixelated;
            }
          }
        }

        .btn-open-create {
          background: var(--accent, #ff3b30);
          color: #fff;
          border: none;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 0.45rem 0.85rem;
          border-radius: 20px;
          cursor: pointer;
          &:active { opacity: 0.8; transform: scale(0.97); }
        }
      }

      .subtitle { color: var(--text-secondary, #8e8e93); font-size: 0.85rem; margin: 0.25rem 0 1rem; }
    }

    .segmented-control {
      display: flex;
      background: var(--bg-tertiary, #2c2c2e);
      padding: 3px;
      border-radius: var(--input-radius, 12px);
      margin-bottom: 0.75rem;

      button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        padding: 0.5rem 0.25rem;
        border: none;
        background: transparent;
        color: var(--text-secondary, #8e8e93);
        font-size: 0.8rem;
        font-weight: 600;
        border-radius: 9px;
        cursor: pointer;
        transition: all 0.2s ease;

        .tab-sprite {
          width: 18px;
          height: 18px;
          image-rendering: pixelated;
        }

        &.active {
          background: var(--bg-secondary, #1c1c1e);
          color: var(--text-primary, #fff);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        }
      }
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--input-radius, 12px);
      padding: 0.6rem 0.85rem;

      .search-icon { font-size: 0.9rem; opacity: 0.6; }
      input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-primary, #fff);
        font-size: 0.9rem;
        &:focus { outline: none; }
      }
      .btn-clear-q {
        background: none;
        border: none;
        color: var(--text-secondary, #8e8e93);
        font-size: 0.85rem;
        cursor: pointer;
      }
    }

    .catalog-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .catalog-card {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.15s ease;

      &:active { transform: scale(0.98); }

      .card-cover {
        position: relative;
        height: 160px;
        background: #2c2c2e;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .rotom-card-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.6rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);

          .badge-icon {
            width: 18px;
            height: 18px;
            image-rendering: pixelated;
          }

          &.heat {
            background: rgba(255, 107, 53, 0.85);
            color: #fff;
          }

          &.wash {
            background: rgba(10, 132, 255, 0.85);
            color: #fff;
          }
        }
      }

      .card-body {
        padding: 0.85rem 1rem;

        .card-body-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;

          h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
          .custom-badge-pill {
            font-size: 0.65rem;
            color: #ffd60a;
            background: rgba(255, 214, 10, 0.15);
            padding: 0.15rem 0.4rem;
            border-radius: 6px;
            font-weight: 700;
          }
        }

        .desc {
          color: var(--text-secondary, #8e8e93);
          font-size: 0.8rem;
          margin: 0 0 0.75rem;
          line-height: 1.35;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .tags {
            display: flex;
            gap: 0.35rem;
            flex-wrap: wrap;

            .tag {
              font-size: 0.7rem;
              color: var(--accent, #ff3b30);
              background: rgba(255, 59, 48, 0.1);
              padding: 0.15rem 0.4rem;
              border-radius: 4px;
            }
          }

          .meta-time {
            font-size: 0.75rem;
            color: var(--text-secondary, #8e8e93);
            font-weight: 600;
          }
        }
      }
    }

    /* ─── Detail View ─── */
    .detail-view {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .detail-top-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .btn-back {
          background: var(--bg-secondary, #1c1c1e);
          border: 1px solid var(--border, #38383a);
          color: var(--text-primary, #fff);
          padding: 0.4rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .btn-delete-custom {
          background: rgba(255, 59, 48, 0.15);
          border: 1px solid rgba(255, 59, 48, 0.3);
          color: var(--accent, #ff3b30);
          padding: 0.4rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
      }
    }

    .detail-card {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      overflow: hidden;
    }

    .rotom-companion-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border, #38383a);

      &.heat-mode {
        background: linear-gradient(135deg, rgba(255, 107, 53, 0.18), rgba(28, 28, 30, 0.95));
        .companion-tag { color: #ff6b35; }
      }

      &.wash-mode {
        background: linear-gradient(135deg, rgba(10, 132, 255, 0.18), rgba(28, 28, 30, 0.95));
        .companion-tag { color: #0a84ff; }
      }

      .companion-avatar-wrap {
        width: 54px;
        height: 54px;
        flex-shrink: 0;

        .rotom-companion-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          animation: rotomFloat 3s ease-in-out infinite alternate;

          &.heat-glow { filter: drop-shadow(0 0 8px rgba(255, 107, 53, 0.6)); }
          &.wash-glow { filter: drop-shadow(0 0 8px rgba(10, 132, 255, 0.6)); }
        }
      }

      .companion-info {
        flex: 1;
        .companion-tag { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.5px; }
        h4 { font-size: 0.95rem; font-weight: 800; margin: 0.15rem 0 0.1rem; }
        p { font-size: 0.75rem; color: var(--text-secondary, #8e8e93); margin: 0; line-height: 1.25; }
      }
    }

    .detail-header-img {
      position: relative;
      height: 200px;
      img { width: 100%; height: 100%; object-fit: cover; }
      .img-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 1.25rem 1rem 0.75rem;
        background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
        .badge-type {
          font-size: 0.7rem;
          color: #ffd60a;
          text-transform: uppercase;
          font-weight: 700;
        }
        h2 { font-size: 1.4rem; font-weight: 800; margin: 0.2rem 0 0; color: #fff; }
      }
    }

    .detail-content {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;

      .detail-desc {
        color: var(--text-secondary, #8e8e93);
        font-size: 0.9rem;
        line-height: 1.4;
        margin: 0;
      }
    }

    .stats-row {
      display: flex;
      background: var(--bg-tertiary, #2c2c2e);
      border-radius: var(--input-radius, 12px);
      padding: 0.65rem 0.5rem;
      justify-content: space-around;

      .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.15rem;

        .stat-label { font-size: 0.65rem; color: var(--text-secondary, #8e8e93); text-transform: uppercase; }
        .stat-val { font-size: 0.85rem; font-weight: 700; }
      }
    }

    .action-box {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: rgba(255, 59, 48, 0.08);
      border: 1px solid rgba(255, 59, 48, 0.25);
      border-radius: var(--input-radius, 12px);
      padding: 0.75rem;

      .push-store-picker {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        .label-push-store { font-size: 0.75rem; color: var(--text-secondary, #8e8e93); }
        .btn-store-pick {
          background: var(--bg-secondary, #1c1c1e);
          border: 1px solid var(--border, #38383a);
          color: var(--text-secondary, #8e8e93);
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          &.active { border-color: #fff; color: #fff; font-weight: 700; }
        }
      }

      .btn-push-shopping {
        background: var(--accent, #ff3b30);
        color: #fff;
        border: none;
        padding: 0.65rem;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
      }

      .push-alert {
        font-size: 0.75rem;
        color: var(--success, #30d158);
        margin: 0;
        text-align: center;
      }
    }

    .ingredients-section {
      h3 { font-size: 1rem; margin-bottom: 0.5rem; }
      .ingredients-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        .ingredient-item {
          display: flex;
          justify-content: space-between;
          padding: 0.4rem 0.5rem;
          background: var(--bg-tertiary, #2c2c2e);
          border-radius: 8px;
          font-size: 0.85rem;

          .ing-qty { color: var(--accent, #ff3b30); font-weight: 600; }
          .ing-optional { color: var(--text-secondary, #8e8e93); font-size: 0.75rem; margin-left: 0.35rem; }
        }
      }
    }

    .steps-section {
      .steps-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.65rem;

        .steps-title-with-mascot {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          .step-mascot-sprite { width: 22px; height: 22px; image-rendering: pixelated; }
          h3 { font-size: 1rem; margin: 0; }
        }

        .btn-reset-steps {
          background: none;
          border: none;
          color: var(--text-secondary, #8e8e93);
          font-size: 0.75rem;
          cursor: pointer;
        }
      }

      .steps-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .step-item {
        display: flex;
        align-items: flex-start;
        gap: 0.65rem;
        padding: 0.65rem;
        background: var(--bg-tertiary, #2c2c2e);
        border-radius: var(--input-radius, 12px);
        cursor: pointer;

        &.completed {
          opacity: 0.5;
          .step-checkbox { background: var(--success, #30d158); color: #000; border-color: var(--success, #30d158); }
          .step-text p { text-decoration: line-through; }
        }

        .step-checkbox {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1.5px solid var(--border, #555);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .step-text {
          flex: 1;
          p { font-size: 0.85rem; margin: 0 0 0.25rem; line-height: 1.35; }
          .step-timer { font-size: 0.7rem; color: #ffd60a; font-weight: 600; }
          .step-img { margin-top: 0.35rem; width: 100%; border-radius: 6px; max-height: 140px; object-fit: cover; }
        }
      }
    }

    /* ─── Add Step Card ─── */
    .add-step-card {
      margin-top: 0.75rem;

      .btn-trigger-add-step {
        width: 100%;
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px dashed var(--border, #555);
        color: var(--text-primary, #fff);
        padding: 0.65rem;
        border-radius: 10px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
      }

      .add-step-inline-form {
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px solid var(--border, #555);
        border-radius: 12px;
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        h4 { font-size: 0.85rem; margin: 0; }
        .step-textarea {
          background: var(--bg-secondary, #1c1c1e);
          border: 1px solid var(--border, #38383a);
          border-radius: 8px;
          color: #fff;
          padding: 0.5rem;
          font-size: 0.85rem;
          resize: none;
        }

        .step-form-row {
          display: flex;
          gap: 0.5rem;

          .step-time-input {
            width: 110px;
            background: var(--bg-secondary, #1c1c1e);
            border: 1px solid var(--border, #38383a);
            border-radius: 8px;
            color: #fff;
            padding: 0.4rem 0.5rem;
            font-size: 0.8rem;
          }

          .btn-save-step {
            flex: 1;
            background: var(--accent, #ff3b30);
            color: #fff;
            border: none;
            border-radius: 8px;
            font-weight: 700;
            font-size: 0.8rem;
            cursor: pointer;
          }

          .btn-cancel-step {
            background: none;
            border: none;
            color: var(--text-secondary, #8e8e93);
            font-size: 0.8rem;
            cursor: pointer;
          }
        }
      }
    }

    .care-symbols-box {
      h4 { font-size: 0.95rem; margin-bottom: 0.5rem; }
      .symbols-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
      }
      .symbol-card {
        padding: 0.5rem;
        background: var(--bg-tertiary, #2c2c2e);
        border-radius: 8px;
        .symbol-img { width: 28px; height: 28px; margin-bottom: 0.25rem; }
        strong { display: block; font-size: 0.75rem; }
        p { font-size: 0.65rem; color: var(--text-secondary, #8e8e93); margin: 0.1rem 0 0; }
      }
    }

    .tips-section {
      background: rgba(10, 132, 255, 0.1);
      border: 1px solid rgba(10, 132, 255, 0.25);
      border-radius: var(--input-radius, 12px);
      padding: 0.75rem;

      h4 { font-size: 0.85rem; color: #0a84ff; margin: 0 0 0.4rem; }
      ul { padding-left: 1.15rem; font-size: 0.75rem; color: var(--text-secondary, #8e8e93); margin: 0; }
      li { margin-bottom: 0.2rem; }
    }

    /* ─── Modal Styles ─── */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
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
      max-width: 520px;
      max-height: 90dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border, #38383a);

        .modal-header-title {
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

      .create-type-selector {
        display: flex;
        padding: 0.5rem 1.25rem;
        gap: 0.5rem;
        background: var(--bg-tertiary, #2c2c2e);

        .type-btn {
          flex: 1;
          padding: 0.5rem;
          border: none;
          background: transparent;
          color: var(--text-secondary, #8e8e93);
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;

          &.active {
            background: var(--bg-secondary, #1c1c1e);
            color: #fff;
          }
        }
      }

      .modal-body-scroll {
        padding: 1rem 1.25rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;

        label {
          font-size: 0.75rem;
          color: var(--text-secondary, #8e8e93);
          font-weight: 600;
          margin-top: 0.25rem;
        }

        .modal-input, .modal-textarea, .modal-select {
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid var(--border, #38383a);
          border-radius: 8px;
          color: #fff;
          padding: 0.55rem 0.75rem;
          font-size: 0.85rem;
          &:focus { outline: none; border-color: var(--accent, #ff3b30); }
        }

        .grid-2-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .flex-1 { flex: 1; }
        .flex-2 { flex: 2; }
        .flex-3 { flex: 3; }
      }

      .ing-add-row, .step-add-row {
        display: flex;
        gap: 0.4rem;
        margin-bottom: 0.4rem;
      }

      .btn-sub-add {
        background: var(--accent, #ff3b30);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.75rem;
        padding: 0 0.75rem;
        cursor: pointer;
      }

      .ing-draft-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;

        .draft-chip {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.3rem;

          button {
            background: none;
            border: none;
            color: var(--text-secondary, #8e8e93);
            font-size: 0.8rem;
            cursor: pointer;
          }
        }
      }

      .draft-steps-list {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        .draft-step-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--bg-tertiary, #2c2c2e);
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          font-size: 0.8rem;

          .step-num { font-weight: 700; color: var(--accent, #ff3b30); }
          .step-text { flex: 1; }
          .step-mins { font-size: 0.7rem; color: #ffd60a; }
          .btn-del-step {
            background: none;
            border: none;
            color: var(--text-secondary, #8e8e93);
            font-size: 0.75rem;
            cursor: pointer;
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
          padding: 0.55rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .btn-save-item {
          background: var(--accent, #ff3b30);
          color: #fff;
          border: none;
          padding: 0.55rem 1.25rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }
      }
    }

    @keyframes rotomFloat {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-3px) rotate(1deg); }
      100% { transform: translateY(-6px) rotate(-1deg); }
    }
  `],
})
export class WikiComponent implements OnInit {
  readonly catalog = inject(CatalogService);
  readonly storage = inject(StorageService);
  private readonly route = inject(ActivatedRoute);

  activeType = signal<'all' | 'recipe' | 'laundry'>('all');
  searchQuery = '';
  selectedItem = signal<CatalogItem | null>(null);
  stepProgressMap = signal<Map<number, boolean>>(new Map());
  pushMessage = signal<string | null>(null);
  targetPushStore: SupermarketStore = 'D1';

  // Inline step adding
  showAddStepInput = false;
  newStepText = '';
  newStepDuration: number | null = null;

  // Create Modal
  isCreating = signal(false);
  createType: 'recipe' | 'laundry' = 'recipe';
  createTitle = '';
  createDesc = '';
  createTagsStr = '';

  // Recipe draft fields
  createPrepTime = 15;
  createCookTime = 25;
  createServings = 4;
  createDifficulty: 'fácil' | 'intermedio' | 'avanzado' = 'fácil';
  newIngName = '';
  newIngQty = '';
  draftIngredients: Ingredient[] = [];

  // Laundry draft fields
  createWashTemp = '30°C / Fría';
  createDryMethod = 'A la sombra';
  createIronTemp = 'Plancha tibia';
  createTipsStr = '';

  // Common draft steps
  draftStepText = '';
  draftStepMins: number | null = null;
  draftSteps: Step[] = [];

  readonly filteredItems = computed(() => {
    let list = this.catalog.allItems();
    const type = this.activeType();
    if (type !== 'all') {
      list = list.filter((i) => i.type === type);
    }
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  });

  ngOnInit(): void {
    const itemId = this.route.snapshot.paramMap.get('id');
    if (itemId) {
      const item = this.catalog.getItemById(itemId);
      if (item) this.openDetail(item);
    }
  }

  isCustomItem(id: string): boolean {
    return this.storage.customCatalogItems().some((c) => c.id === id);
  }

  async openDetail(item: CatalogItem): Promise<void> {
    this.selectedItem.set(item);
    this.pushMessage.set(null);
    this.showAddStepInput = false;
    this.newStepText = '';
    this.newStepDuration = null;
    await this.loadStepProgress(item.id);
  }

  closeDetail(): void {
    this.selectedItem.set(null);
  }

  asRecipe(item: CatalogItem): Recipe {
    return item as Recipe;
  }

  asLaundry(item: CatalogItem): LaundryGuide {
    return item as LaundryGuide;
  }

  async loadStepProgress(itemId: string): Promise<void> {
    const list = await this.storage.getStepProgress(itemId);
    const map = new Map<number, boolean>();
    for (const p of list) {
      map.set(p.stepOrder, p.completed);
    }
    this.stepProgressMap.set(map);
  }

  isStepDone(order: number): boolean {
    return !!this.stepProgressMap().get(order);
  }

  async toggleStep(itemId: string, order: number): Promise<void> {
    await this.storage.toggleStep(itemId, order);
    await this.loadStepProgress(itemId);
  }

  async resetSteps(itemId: string): Promise<void> {
    await this.storage.resetSteps(itemId);
    await this.loadStepProgress(itemId);
  }

  async pushIngredients(recipe: Recipe): Promise<void> {
    const addedCount = await this.storage.pushIngredientsToShoppingList(recipe, this.targetPushStore);
    if (addedCount > 0) {
      this.pushMessage.set(`✓ ¡${addedCount} ingredientes enviados a ${this.targetPushStore}!`);
    } else {
      this.pushMessage.set(`Los ingredientes ya estaban en tu lista.`);
    }
  }

  async saveNewStep(baseItem: CatalogItem): Promise<void> {
    const text = this.newStepText.trim();
    if (!text) return;

    await this.storage.addStepToCatalogItem(
      baseItem.id,
      text,
      this.newStepDuration || undefined,
      baseItem
    );

    this.newStepText = '';
    this.newStepDuration = null;
    this.showAddStepInput = false;

    // Actualizar vista de detalle con el ítem actualizado
    const updated = this.catalog.getItemById(baseItem.id);
    if (updated) {
      this.selectedItem.set(updated);
      await this.loadStepProgress(updated.id);
    }
  }

  async deleteSelectedCustomItem(): Promise<void> {
    const item = this.selectedItem();
    if (!item) return;
    if (confirm(`¿Eliminar "${item.title}"?`)) {
      await this.storage.deleteCustomItem(item.id);
      this.closeDetail();
    }
  }

  // ─── Modal Crear Guía / Receta ───
  openCreateModal(): void {
    this.isCreating.set(true);
    this.createType = this.activeType() === 'laundry' ? 'laundry' : 'recipe';
    this.createTitle = '';
    this.createDesc = '';
    this.createTagsStr = '';
    this.draftIngredients = [];
    this.draftSteps = [];
    this.newIngName = '';
    this.newIngQty = '';
    this.draftStepText = '';
    this.draftStepMins = null;
  }

  closeCreateModal(): void {
    this.isCreating.set(false);
  }

  addIngredientToDraft(): void {
    const name = this.newIngName.trim();
    if (!name) return;
    this.draftIngredients.push({
      name,
      quantity: this.newIngQty.trim() || '1 porción',
      category: 'otro',
      optional: false,
    });
    this.newIngName = '';
    this.newIngQty = '';
  }

  removeIngredientFromDraft(index: number): void {
    this.draftIngredients.splice(index, 1);
  }

  addStepToDraft(): void {
    const text = this.draftStepText.trim();
    if (!text) return;
    this.draftSteps.push({
      order: this.draftSteps.length + 1,
      instruction: text,
      durationMinutes: this.draftStepMins || undefined,
    });
    this.draftStepText = '';
    this.draftStepMins = null;
  }

  removeStepFromDraft(index: number): void {
    this.draftSteps.splice(index, 1);
    this.draftSteps.forEach((s, idx) => (s.order = idx + 1));
  }

  async saveCreatedItem(): Promise<void> {
    const title = this.createTitle.trim();
    if (!title) {
      alert('Por favor escribe un título.');
      return;
    }

    const tags = this.createTagsStr
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const isRec = this.createType === 'recipe';
    const id = isRec ? `rec-user-${Date.now()}` : `laundry-user-${Date.now()}`;
    const defaultCover = isRec ? 'assets/images/rotom/rotom-heat.webp' : 'assets/images/rotom/rotom-wash.webp';

    const newItem: CustomCatalogItem = {
      id,
      type: this.createType,
      title,
      description: this.createDesc.trim() || (isRec ? 'Receta casera' : 'Guía de lavado'),
      coverImage: defaultCover,
      tags: tags.length > 0 ? tags : [isRec ? 'cocina' : 'ropa'],
      createdAt: new Date().toISOString(),
      steps: this.draftSteps.length > 0 ? this.draftSteps : [{ order: 1, instruction: 'Seguir instrucciones generales.' }],
    };

    if (isRec) {
      newItem.servings = this.createServings;
      newItem.prepTimeMinutes = this.createPrepTime;
      newItem.cookTimeMinutes = this.createCookTime;
      newItem.difficulty = this.createDifficulty;
      newItem.ingredients = this.draftIngredients;
    } else {
      newItem.washTemp = this.createWashTemp;
      newItem.dryMethod = this.createDryMethod;
      newItem.ironTemp = this.createIronTemp;
      newItem.fabricCare = [];
      newItem.tips = this.createTipsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    await this.storage.addCustomItem(newItem);
    this.closeCreateModal();

    // Abrir de inmediato en vista de detalle
    const saved = this.catalog.getItemById(id);
    if (saved) {
      this.openDetail(saved);
    }
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }
}
