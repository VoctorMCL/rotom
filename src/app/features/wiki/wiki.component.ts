import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { StorageService } from '../../core/services/storage.service';
import type { Recipe, LaundryGuide, CatalogItem } from '../../core/models/catalog.models';

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
            <h2>Wiki de Vida</h2>
            <div class="rotom-modes-preview">
              <img src="assets/images/rotom/rotom-heat-sprite.webp" alt="Rotom Horno" title="Modo Cocina" class="mode-sprite" />
              <img src="assets/images/rotom/rotom-wash-sprite.webp" alt="Rotom Lavadora" title="Modo Lavado" class="mode-sprite" />
            </div>
          </div>
          <p class="subtitle">Recetas y manuales de lavado guardados en tu iPhone</p>

          <!-- Type Filter Tabs -->
          <div class="segmented-control">
            <button
              type="button"
              [class.active]="activeType() === 'all'"
              (click)="activeType.set('all')"
            >
              Todos ({{ catalog.items().length }})
            </button>
            <button
              type="button"
              [class.active]="activeType() === 'recipe'"
              (click)="activeType.set('recipe')"
            >
              <img src="assets/images/rotom/rotom-heat-sprite.webp" class="tab-sprite" alt="" />
              Recetas ({{ catalog.recipes().length }})
            </button>
            <button
              type="button"
              [class.active]="activeType() === 'laundry'"
              (click)="activeType.set('laundry')"
            >
              <img src="assets/images/rotom/rotom-wash-sprite.webp" class="tab-sprite" alt="" />
              Lavado ({{ catalog.laundryGuides().length }})
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
                  [src]="item.coverImage"
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
                <h3>{{ item.title }}</h3>
                <p class="desc">{{ item.description }}</p>

                <div class="card-footer">
                  <div class="tags">
                    @for (tag of item.tags; track tag) {
                      <span class="tag">#{{ tag }}</span>
                    }
                  </div>
                  @if (item.type === 'recipe') {
                    <span class="meta-time">⏱️ {{ asRecipe(item).cookTimeMinutes }}m</span>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      } @else {
        <!-- Detail View -->
        <div class="detail-view">
          <button class="btn-back" (click)="closeDetail()">
            ← Volver al catálogo
          </button>

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
                <img [src]="r.coverImage" [alt]="r.title" (error)="onImgError($event)" />
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
                    <span class="stat-val">{{ r.servings }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Prep</span>
                    <span class="stat-val">{{ r.prepTimeMinutes }}m</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Cocción</span>
                    <span class="stat-val">{{ r.cookTimeMinutes }}m</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Dificultad</span>
                    <span class="stat-val">{{ r.difficulty }}</span>
                  </div>
                </div>

                <!-- Push Ingredients to Shopping List -->
                <div class="action-box">
                  <button class="btn-push-shopping" (click)="pushIngredients(r)">
                    🛒 Enviar ingredientes a la Lista de Compras
                  </button>
                  @if (pushMessage()) {
                    <p class="push-alert">{{ pushMessage() }}</p>
                  }
                </div>

                <!-- Ingredients Section -->
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

                <!-- Steps Section with Checkable Progress -->
                <section class="steps-section">
                  <div class="steps-header">
                    <div class="steps-title-with-mascot">
                      <img src="assets/images/rotom/rotom-heat-sprite.webp" class="step-mascot-sprite" alt="" />
                      <h3>Pasos de Preparación</h3>
                    </div>
                    <button class="btn-reset-steps" (click)="resetSteps(r.id)">
                      Reiniciar pasos
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
                <img [src]="l.coverImage" [alt]="l.title" (error)="onImgError($event)" />
                <div class="img-overlay">
                  <span class="badge-type">🧺 Guía de Lavado</span>
                  <h2>{{ l.title }}</h2>
                </div>
              </div>

              <div class="detail-content">
                <p class="detail-desc">{{ l.description }}</p>

                <!-- Fabric Care Symbols -->
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

                <div class="stats-row">
                  <div class="stat">
                    <span class="stat-label">Temperatura</span>
                    <span class="stat-val">{{ l.washTemp }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Secado</span>
                    <span class="stat-val">{{ l.dryMethod }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Planchado</span>
                    <span class="stat-val">{{ l.ironTemp }}</span>
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
                      Reiniciar pasos
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

        h2 { font-size: 1.7rem; font-weight: 800; margin: 0; }

        .rotom-modes-preview {
          display: flex;
          gap: 0.25rem;

          .mode-sprite {
            width: 28px;
            height: 28px;
            image-rendering: pixelated;
          }
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
          gap: 0.3rem;
          padding: 0.25rem 0.6rem;
          border-radius: 20px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 700;

          .badge-icon {
            width: 20px;
            height: 20px;
            image-rendering: pixelated;
          }

          &.heat {
            border: 1px solid rgba(255, 69, 58, 0.6);
            color: #ff6b35;
          }
          &.wash {
            border: 1px solid rgba(10, 132, 255, 0.6);
            color: #0a84ff;
          }
        }
      }

      .card-body {
        padding: 1rem;
        h3 { font-size: 1.15rem; margin: 0 0 0.35rem; }
        .desc {
          font-size: 0.85rem;
          color: var(--text-secondary, #8e8e93);
          margin: 0 0 0.75rem;
          line-height: 1.4;
        }
      }

      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .tags { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .tag {
          font-size: 0.7rem;
          color: var(--accent, #ff3b30);
          background: rgba(255, 59, 48, 0.1);
          padding: 0.15rem 0.4rem;
          border-radius: 6px;
        }
        .meta-time {
          font-size: 0.75rem;
          color: var(--text-secondary, #8e8e93);
          font-weight: 600;
        }
      }
    }

    /* ─── Detail View ─── */
    .detail-view {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .btn-back {
      align-self: flex-start;
      background: none;
      border: none;
      color: var(--accent, #ff3b30);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.25rem 0;
    }

    .detail-card {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      overflow: hidden;
    }

    /* ─── Rotom Companion Mascot Banner ─── */
    .rotom-companion-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border, #38383a);

      &.heat-mode {
        background: linear-gradient(135deg, rgba(255, 69, 58, 0.18), rgba(255, 107, 53, 0.08));
        border-color: rgba(255, 69, 58, 0.3);
        .companion-tag { color: #ff6b35; }
      }

      &.wash-mode {
        background: linear-gradient(135deg, rgba(10, 132, 255, 0.18), rgba(90, 200, 250, 0.08));
        border-color: rgba(10, 132, 255, 0.3);
        .companion-tag { color: #0a84ff; }
      }

      .companion-avatar-wrap {
        width: 70px;
        height: 70px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .rotom-companion-img {
          width: 65px;
          height: 65px;
          object-fit: contain;
          animation: rotomFloat 3s ease-in-out infinite alternate;

          &.heat-glow {
            filter: drop-shadow(0 0 14px rgba(255, 69, 58, 0.6));
          }
          &.wash-glow {
            filter: drop-shadow(0 0 14px rgba(10, 132, 255, 0.6));
          }
        }
      }

      .companion-info {
        flex: 1;

        .companion-tag {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        h4 {
          font-size: 1rem;
          margin: 0.15rem 0 0.25rem;
          color: #fff;
        }

        p {
          font-size: 0.8rem;
          color: var(--text-secondary, #8e8e93);
          margin: 0;
          line-height: 1.35;
        }
      }
    }

    .detail-header-img {
      position: relative;
      height: 200px;
      background: #2c2c2e;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .img-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 1.25rem;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);

        .badge-type {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--accent, #ff3b30);
          text-transform: uppercase;
        }

        h2 {
          font-size: 1.5rem;
          color: #fff;
          margin: 0.25rem 0 0;
        }
      }
    }

    .detail-content {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .detail-desc {
      font-size: 0.95rem;
      color: var(--text-secondary, #8e8e93);
      line-height: 1.5;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      background: var(--bg-tertiary, #2c2c2e);
      border-radius: var(--input-radius, 12px);
      padding: 0.75rem 0.5rem;
      text-align: center;

      .stat {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .stat-label {
        font-size: 0.65rem;
        color: var(--text-secondary, #8e8e93);
        text-transform: uppercase;
      }

      .stat-val { font-size: 0.9rem; font-weight: 700; }
    }

    .action-box {
      .btn-push-shopping {
        width: 100%;
        padding: 0.85rem;
        border-radius: var(--input-radius, 12px);
        border: none;
        background: var(--accent, #ff3b30);
        color: #fff;
        font-weight: 700;
        font-size: 0.95rem;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;

        &:active { opacity: 0.8; }
      }

      .push-alert {
        margin-top: 0.5rem;
        font-size: 0.8rem;
        color: var(--success, #30d158);
        text-align: center;
        font-weight: 600;
      }
    }

    .ingredients-section {
      h3 { font-size: 1.15rem; margin-bottom: 0.75rem; }
      .ingredients-list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .ingredient-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.6rem 0.75rem;
        background: var(--bg-tertiary, #2c2c2e);
        border-radius: 8px;
        font-size: 0.85rem;

        .ing-name { font-weight: 500; }
        .ing-qty { font-weight: 700; color: var(--accent, #ff3b30); }
        .ing-optional { font-size: 0.7rem; color: var(--text-secondary, #8e8e93); }
      }
    }

    .steps-section {
      .steps-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;

        .steps-title-with-mascot {
          display: flex;
          align-items: center;
          gap: 0.4rem;

          .step-mascot-sprite {
            width: 24px;
            height: 24px;
            image-rendering: pixelated;
          }

          h3 { font-size: 1.15rem; margin: 0; }
        }

        .btn-reset-steps {
          background: none;
          border: none;
          color: var(--text-secondary, #8e8e93);
          font-size: 0.75rem;
          cursor: pointer;
          text-decoration: underline;
        }
      }

      .steps-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .step-item {
        display: flex;
        gap: 0.75rem;
        padding: 0.85rem;
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px solid var(--border, #38383a);
        border-radius: var(--input-radius, 12px);
        cursor: pointer;
        transition: all 0.2s ease;

        &.completed {
          opacity: 0.45;
          border-color: var(--success, #30d158);

          .step-checkbox {
            background: var(--success, #30d158);
            border-color: var(--success, #30d158);
            color: #000;
          }

          .step-text p { text-decoration: line-through; }
        }
      }

      .step-checkbox {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid var(--text-secondary, #8e8e93);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 700;
        flex-shrink: 0;
      }

      .step-text {
        flex: 1;
        p { font-size: 0.9rem; margin: 0 0 0.35rem; line-height: 1.4; }
        .step-timer {
          font-size: 0.75rem;
          color: var(--warning, #ffd60a);
          font-weight: 600;
        }
        .step-img {
          margin-top: 0.5rem;
          width: 100%;
          border-radius: 8px;
          max-height: 160px;
          object-fit: cover;
        }
      }
    }

    .care-symbols-box {
      h4 { font-size: 1rem; margin-bottom: 0.5rem; }
      .symbols-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
      }
      .symbol-card {
        padding: 0.6rem;
        background: var(--bg-tertiary, #2c2c2e);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;

        .symbol-img {
          width: 32px;
          height: 32px;
          margin-bottom: 0.35rem;
        }
        strong { display: block; font-size: 0.8rem; }
        p { font-size: 0.7rem; color: var(--text-secondary, #8e8e93); margin: 0.15rem 0 0; }
      }
    }

    .tips-section {
      background: rgba(10, 132, 255, 0.1);
      border: 1px solid rgba(10, 132, 255, 0.25);
      border-radius: var(--input-radius, 12px);
      padding: 0.85rem;

      h4 { font-size: 0.9rem; color: #0a84ff; margin-bottom: 0.5rem; }
      ul { padding-left: 1.25rem; font-size: 0.8rem; color: var(--text-secondary, #8e8e93); }
      li { margin-bottom: 0.25rem; }
    }

    @keyframes rotomFloat {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-4px) rotate(2deg); }
      100% { transform: translateY(-8px) rotate(-2deg); }
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

  readonly filteredItems = computed(() => {
    let list = this.catalog.items();
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

  async openDetail(item: CatalogItem): Promise<void> {
    this.selectedItem.set(item);
    this.pushMessage.set(null);
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
    const addedCount = await this.storage.pushIngredientsToShoppingList(recipe);
    if (addedCount > 0) {
      this.pushMessage.set(`✓ ¡${addedCount} ingredientes añadidos a la lista de compras!`);
    } else {
      this.pushMessage.set('Los ingredientes ya estaban en tu lista.');
    }
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }
}
