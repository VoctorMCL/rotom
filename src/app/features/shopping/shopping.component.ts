import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../core/services/storage.service';
import { SyncService } from '../../core/services/sync.service';
import type { ShoppingItem, SupermarketStore } from '../../core/models/state.models';

@Component({
  selector: 'app-shopping',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="shopping-container">
      <!-- Page Header & Sync Status -->
      <header class="page-header">
        <div class="header-text">
          <div class="title-with-sprite">
            <img src="assets/images/rotom/rotom-sprite.webp" alt="Rotom" class="header-sprite" />
            <h2>ITEMS / COMPRAS</h2>
          </div>
          <span class="count-badge">
            [{{ storage.uncheckedShoppingCount() }} PENDIENTES]
          </span>
        </div>

        <div class="header-actions">
          @if (storage.shoppingList().length > 0) {
            <button class="pixel-btn-clear" (click)="storage.clearCheckedItems()" title="Quitar productos comprados">
              LIMPIAR COMPRADOS
            </button>
          }
        </div>
      </header>

      <!-- PC ↔ Celular Sync Bar (Link Cable) -->
      <div class="sync-strip" (click)="triggerSync()">
        <div class="sync-status-info">
          <span class="status-circle" [class]="sync.syncState()"></span>
          <span class="status-label">{{ sync.statusMessage() }}</span>
        </div>
        <button class="btn-mini-sync" [disabled]="sync.syncState() === 'syncing'">
          {{ sync.syncState() === 'syncing' ? 'BAJANDO...' : 'BAJAR CAMBIOS PC ⬇️' }}
        </button>
      </div>

      @if (sync.toastMessage()) {
        <div class="sync-toast-bar">
          {{ sync.toastMessage() }}
        </div>
      }

      <!-- Supermarket Store Filter (D1 vs Éxito vs Todos) -->
      <div class="store-filter-bar">
        <button
          type="button"
          class="store-tab"
          [class.active]="activeStoreFilter() === 'all'"
          (click)="activeStoreFilter.set('all')"
        >
          TODOS ({{ storage.shoppingList().length }})
        </button>

        <button
          type="button"
          class="store-tab tab-d1"
          [class.active]="activeStoreFilter() === 'D1'"
          (click)="activeStoreFilter.set('D1')"
        >
          🟡 D1 ({{ storage.shoppingByStore().d1.length }})
        </button>

        <button
          type="button"
          class="store-tab tab-exito"
          [class.active]="activeStoreFilter() === 'Éxito'"
          (click)="activeStoreFilter.set('Éxito')"
        >
          🔴 ÉXITO ({{ storage.shoppingByStore().exito.length }})
        </button>
      </div>

      <!-- Search Bar (Buscar) -->
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          placeholder="BUSCAR EN {{ activeStoreLabel() }}..."
          class="search-input"
        />
        @if (searchQuery) {
          <button class="btn-clear-search" (click)="searchQuery = ''">✕</button>
        }
      </div>

      <!-- Quick Add Section (Añadir con selección D1 / Éxito) -->
      <div class="add-section">
        <div class="store-selector-row">
          <span class="add-label">COMPRAR EN:</span>
          <div class="store-toggle-group">
            <button
              type="button"
              class="btn-store-pick d1"
              [class.selected]="newItemStore === 'D1'"
              (click)="newItemStore = 'D1'"
            >
              🟡 D1
            </button>
            <button
              type="button"
              class="btn-store-pick exito"
              [class.selected]="newItemStore === 'Éxito'"
              (click)="newItemStore = 'Éxito'"
            >
              🔴 ÉXITO
            </button>
            <button
              type="button"
              class="btn-store-pick otro"
              [class.selected]="newItemStore === 'Otro'"
              (click)="newItemStore = 'Otro'"
            >
              📦 OTRO
            </button>
          </div>
        </div>

        <div class="add-inputs-row">
          <input
            type="text"
            [(ngModel)]="newItemName"
            placeholder="Item (Leche, Arroz...)"
            (keyup.enter)="addItem()"
            class="input-name"
          />
          <input
            type="text"
            [(ngModel)]="newItemQty"
            placeholder="Cant."
            (keyup.enter)="addItem()"
            class="input-qty"
          />
          <button class="btn-add-primary" (click)="addItem()">
            + AÑADIR
          </button>
        </div>

        <!-- Category Chips -->
        <div class="category-chips">
          @for (cat of availableCategories; track cat.id) {
            <button
              type="button"
              class="cat-chip"
              [class.selected]="newItemCategory === cat.id"
              (click)="newItemCategory = cat.id"
            >
              {{ cat.emoji }} {{ cat.name }}
            </button>
          }
        </div>
      </div>

      <!-- Edit Modal / Bottom Sheet (Editar) -->
      @if (editingItem(); as item) {
        <div class="edit-backdrop" (click)="closeEdit()">
          <div class="edit-sheet" (click)="$event.stopPropagation()">
            <div class="sheet-header">
              <h3>✏️ EDITAR ITEM</h3>
              <button class="btn-close-sheet" (click)="closeEdit()">✕</button>
            </div>

            <div class="edit-form">
              <label>SUPERMERCADO</label>
              <div class="store-toggle-group sheet-store-toggle">
                <button
                  type="button"
                  class="btn-store-pick d1"
                  [class.selected]="editStore === 'D1'"
                  (click)="editStore = 'D1'"
                >
                  🟡 D1
                </button>
                <button
                  type="button"
                  class="btn-store-pick exito"
                  [class.selected]="editStore === 'Éxito'"
                  (click)="editStore = 'Éxito'"
                >
                  🔴 ÉXITO
                </button>
                <button
                  type="button"
                  class="btn-store-pick otro"
                  [class.selected]="editStore === 'Otro'"
                  (click)="editStore = 'Otro'"
                >
                  📦 OTRO
                </button>
              </div>

              <label>NOMBRE DEL ITEM</label>
              <input
                type="text"
                [(ngModel)]="editName"
                placeholder="Nombre"
                class="sheet-input"
              />

              <label>CANTIDAD O FORMATO</label>
              <input
                type="text"
                [(ngModel)]="editQty"
                placeholder="Ej: 500g, 2 unid, 1 litro"
                class="sheet-input"
              />

              <label>CATEGORÍA</label>
              <div class="category-chips sheet-categories">
                @for (cat of availableCategories; track cat.id) {
                  <button
                    type="button"
                    class="cat-chip"
                    [class.selected]="editCategory === cat.id"
                    (click)="editCategory = cat.id"
                  >
                    {{ cat.emoji }} {{ cat.name }}
                  </button>
                }
              </div>

              <div class="sheet-actions">
                <button
                  type="button"
                  class="btn-delete-confirm"
                  (click)="deleteItem(item.id!)"
                >
                  🗑️ ELIMINAR
                </button>
                <button
                  type="button"
                  class="btn-save-confirm"
                  (click)="saveEdit(item.id!)"
                >
                  ✓ GUARDAR
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Items List by Store & Empty State -->
      @if (filteredItems().length === 0) {
        <div class="empty-state">
          <img src="assets/images/rotom/rotom-sprite.webp" alt="Rotom" class="empty-rotom-img" />
          @if (searchQuery) {
            <h3>SIN RESULTADOS</h3>
            <p>No se encontraron items para "{{ searchQuery }}".</p>
          } @else {
            <h3>¡MOCHILA VACÍA EN {{ activeStoreLabel() }}!</h3>
            <p>Añade lo que necesitas arriba o usa "Enviar a compras" desde la Wiki.</p>
          }
        </div>
      } @else {
        <!-- Grouped by Store -->
        <div class="store-sections-list">
          @for (group of storeGroups(); track group.storeName) {
            @if (group.items.length > 0) {
              <section class="store-group-card">
                <div class="store-group-header">
                  <div class="store-title-badge" [class.d1-badge]="group.storeName === 'D1'" [class.exito-badge]="group.storeName === 'Éxito'">
                    <span class="store-icon">{{ group.storeName === 'D1' ? '🟡' : (group.storeName === 'Éxito' ? '🔴' : '📦') }}</span>
                    <strong>{{ group.storeName }}</strong>
                  </div>
                  <span class="store-items-count">{{ group.items.length }} ITEM{{ group.items.length === 1 ? '' : 'S' }}</span>
                </div>

                <div class="items-list">
                  @for (item of group.items; track item.id) {
                    <div
                      class="shopping-row"
                      [class.checked]="item.checked"
                      (click)="toggleItem(item.id!)"
                    >
                      <!-- Pixel Square Checkbox -->
                      <div class="pixel-checkbox">
                        @if (item.checked) {
                          <span>✓</span>
                        }
                      </div>

                      <div class="item-info">
                        <div class="item-name-row">
                          <span class="item-name">{{ item.name }}</span>
                          @if (item.category) {
                            <span class="cat-pill-mini">{{ getCategoryEmoji(item.category) }}</span>
                          }
                        </div>
                        @if (item.quantity) {
                          <span class="item-qty">{{ item.quantity }}</span>
                        }
                      </div>

                      <!-- Row Action Buttons: Editar y Quitar -->
                      <div class="row-actions" (click)="$event.stopPropagation()">
                        <button
                          type="button"
                          class="btn-icon-action btn-edit"
                          (click)="startEdit(item)"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          class="btn-icon-action btn-delete"
                          (click)="deleteItem(item.id!)"
                          title="Quitar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </section>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .shopping-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title-with-sprite {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .header-sprite {
          width: 32px;
          height: 32px;
          image-rendering: pixelated;
        }

        h2 { font-size: 0.95rem; margin: 0; }
      }

      .count-badge {
        font-family: var(--font-pixel, monospace);
        font-size: 0.6rem;
        color: var(--accent, #00ff66);
      }

      .pixel-btn-clear {
        background: #091709;
        border: 2px solid var(--border, #184218);
        color: var(--text-secondary, #74ad74);
        font-family: var(--font-pixel, monospace);
        font-size: 0.55rem;
        padding: 0.35rem 0.55rem;
        box-shadow: 2px 2px 0px #000;
        cursor: pointer;

        &:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px #000;
        }
      }
    }

    /* ─── Sync Status Bar (Link Cable) ─── */
    .sync-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #081408;
      border: 2px solid var(--border, #184218);
      border-left: 5px solid var(--border-bright, #00ff66);
      box-shadow: 2px 2px 0px #000;
      padding: 0.55rem 0.75rem;
      cursor: pointer;

      .sync-status-info {
        display: flex;
        align-items: center;
        gap: 0.45rem;

        .status-circle {
          width: 8px;
          height: 8px;
          background: #3e683e;
          border: 1px solid #000;

          &.synced { background: var(--success, #00ff66); box-shadow: 0 0 4px #00ff66; }
          &.syncing { background: var(--warning, #ffd60a); animation: blink 0.5s infinite; }
          &.offline { background: #3e683e; }
        }

        .status-label {
          font-family: var(--font-terminal, monospace);
          font-size: 1.05rem;
          color: var(--text-secondary, #74ad74);
        }
      }

      .btn-mini-sync {
        background: #0f2b0f;
        border: 2px solid var(--border-bright, #00ff66);
        box-shadow: 2px 2px 0px #000;
        color: var(--accent, #00ff66);
        font-family: var(--font-pixel, monospace);
        font-size: 0.55rem;
        padding: 0.35rem 0.55rem;
        cursor: pointer;

        &:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px #000;
        }
      }
    }

    .sync-toast-bar {
      background: #0f2b0f;
      border: 2px solid var(--accent, #00ff66);
      box-shadow: 2px 2px 0px #000;
      color: var(--accent, #00ff66);
      font-family: var(--font-terminal, monospace);
      font-size: 1.15rem;
      padding: 0.5rem 0.75rem;
      text-align: center;
    }

    /* ─── Supermarket Store Filter ─── */
    .store-filter-bar {
      display: flex;
      background: #050d05;
      border: 2px solid var(--border, #184218);
      gap: 3px;
      padding: 3px;

      .store-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem 0.25rem;
        border: 1px solid transparent;
        background: transparent;
        color: var(--text-secondary, #74ad74);
        font-family: var(--font-pixel, monospace);
        font-size: 0.55rem;
        cursor: pointer;
        transition: all 0.15s ease;

        &.active {
          background: #0d220d;
          border-color: var(--border-bright, #00ff66);
          color: #fff;
          box-shadow: 2px 2px 0px #000;

          &.tab-d1 { color: #ffd60a; border-color: #ffd60a; }
          &.tab-exito { color: #ff3b30; border-color: #ff3b30; }
        }
      }
    }

    /* ─── Search Bar ─── */
    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #081408;
      border: 2px solid var(--border-bright, #00ff66);
      box-shadow: 2px 2px 0px #000;
      padding: 0.45rem 0.75rem;

      .search-icon { font-size: 1.1rem; }
      .search-input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-primary, #e6ffe6);
        font-family: var(--font-terminal, monospace);
        font-size: 1.25rem;
        &:focus { outline: none; }
      }
      .btn-clear-search {
        background: none;
        border: none;
        color: var(--text-secondary, #74ad74);
        font-family: var(--font-pixel, monospace);
        font-size: 0.75rem;
        cursor: pointer;
      }
    }

    /* ─── Add Section ─── */
    .add-section {
      background: #081408;
      border: 2px solid var(--border-bright, #00ff66);
      box-shadow: 3px 3px 0px #000;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;

      .store-selector-row {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .add-label {
          font-family: var(--font-pixel, monospace);
          font-size: 0.6rem;
          color: var(--text-secondary, #74ad74);
        }
      }

      .store-toggle-group {
        display: flex;
        gap: 0.35rem;

        .btn-store-pick {
          background: #050d05;
          border: 1px solid var(--border, #184218);
          color: var(--text-secondary, #74ad74);
          font-family: var(--font-pixel, monospace);
          font-size: 0.55rem;
          padding: 0.3rem 0.5rem;
          cursor: pointer;

          &.selected {
            box-shadow: 2px 2px 0px #000;
            &.d1 {
              background: #2a2200;
              border-color: #ffd60a;
              color: #ffd60a;
            }
            &.exito {
              background: #2b0806;
              border-color: #ff3b30;
              color: #ff3b30;
            }
            &.otro {
              background: #0e240e;
              border-color: var(--accent, #00ff66);
              color: var(--accent, #00ff66);
            }
          }
        }
      }

      .add-inputs-row {
        display: flex;
        gap: 0.4rem;
      }

      .input-name {
        flex: 2;
        background: #040804;
        border: 2px solid var(--border, #184218);
        padding: 0.45rem 0.65rem;
        color: #fff;
        font-family: var(--font-terminal, monospace);
        font-size: 1.25rem;
        &:focus { outline: none; border-color: var(--accent, #00ff66); }
      }

      .input-qty {
        width: 75px;
        background: #040804;
        border: 2px solid var(--border, #184218);
        padding: 0.45rem 0.45rem;
        color: #fff;
        font-family: var(--font-terminal, monospace);
        font-size: 1.25rem;
        text-align: center;
        &:focus { outline: none; border-color: var(--accent, #00ff66); }
      }

      .btn-add-primary {
        background: #0f2b0f;
        border: 2px solid var(--border-bright, #00ff66);
        box-shadow: 2px 2px 0px #000;
        color: var(--accent, #00ff66);
        font-family: var(--font-pixel, monospace);
        font-size: 0.65rem;
        padding: 0.45rem 0.75rem;
        cursor: pointer;
        white-space: nowrap;

        &:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px #000;
        }
      }
    }

    .category-chips {
      display: flex;
      gap: 0.35rem;
      overflow-x: auto;
      padding-bottom: 0.2rem;
      -webkit-overflow-scrolling: touch;
      &::-webkit-scrollbar { display: none; }

      .cat-chip {
        flex: 0 0 auto;
        background: #050d05;
        border: 1px solid var(--border, #184218);
        color: var(--text-secondary, #74ad74);
        font-family: var(--font-terminal, monospace);
        font-size: 1rem;
        padding: 0.2rem 0.5rem;
        cursor: pointer;

        &.selected {
          border-color: var(--accent, #00ff66);
          color: #fff;
          background: #0d220d;
        }
      }
    }

    /* ─── Store Sections & Rows ─── */
    .store-sections-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .store-group-card {
      .store-group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.45rem;

        .store-title-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--font-pixel, monospace);
          font-size: 0.75rem;

          &.d1-badge { color: #ffd60a; }
          &.exito-badge { color: #ff3b30; }
        }

        .store-items-count {
          font-family: var(--font-pixel, monospace);
          font-size: 0.55rem;
          color: var(--text-secondary, #74ad74);
        }
      }

      .items-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
    }

    .shopping-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-height: 48px;
      padding: 0.5rem 0.75rem;
      background: #081408;
      border: 2px solid var(--border, #184218);
      box-shadow: 2px 2px 0px #000;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;

      &:active {
        background: #0d220d;
      }

      &.checked {
        opacity: 0.45;
        background: #040804;

        .pixel-checkbox {
          background: var(--accent, #00ff66);
          border-color: var(--accent, #00ff66);
          color: #000;
        }

        .item-name {
          text-decoration: line-through;
        }
      }

      .pixel-checkbox {
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-bright, #00ff66);
        background: #040804;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-pixel, monospace);
        font-size: 0.65rem;
        font-weight: 700;
        flex-shrink: 0;
      }

      .item-info {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        overflow: hidden;

        .item-name-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          overflow: hidden;
        }

        .item-name {
          font-family: var(--font-terminal, monospace);
          font-size: 1.25rem;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cat-pill-mini {
          font-size: 1rem;
        }

        .item-qty {
          font-family: var(--font-pixel, monospace);
          font-size: 0.6rem;
          color: #ffd60a;
          margin-left: 0.5rem;
          flex-shrink: 0;
        }
      }

      .row-actions {
        display: flex;
        align-items: center;
        gap: 0.2rem;
        flex-shrink: 0;

        .btn-icon-action {
          background: #050d05;
          border: 1px solid var(--border, #184218);
          font-size: 0.9rem;
          padding: 0.25rem;
          cursor: pointer;

          &:active {
            transform: scale(0.9);
            background: #0d220d;
          }
        }
      }
    }

    /* ─── Edit Bottom Sheet ─── */
    .edit-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 1000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .edit-sheet {
      background: #081408;
      width: 100%;
      max-width: 500px;
      border-top: 3px solid var(--border-bright, #00ff66);
      box-shadow: 0 -4px 0px #000;
      padding: 1rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom)) 1.25rem;

      .sheet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.85rem;
        h3 { font-size: 0.85rem; margin: 0; }
        .btn-close-sheet {
          background: none;
          border: none;
          color: var(--text-secondary, #74ad74);
          font-family: var(--font-pixel, monospace);
          font-size: 0.9rem;
          cursor: pointer;
        }
      }

      .edit-form {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;

        label {
          font-family: var(--font-pixel, monospace);
          font-size: 0.55rem;
          color: var(--text-secondary, #74ad74);
          margin-top: 0.25rem;
        }

        .sheet-input {
          background: #040804;
          border: 2px solid var(--border, #184218);
          color: #fff;
          padding: 0.55rem;
          font-family: var(--font-terminal, monospace);
          font-size: 1.25rem;
          &:focus { outline: none; border-color: var(--accent, #00ff66); }
        }

        .sheet-actions {
          display: flex;
          gap: 0.65rem;
          margin-top: 0.75rem;

          .btn-delete-confirm {
            flex: 1;
            background: #2b0806;
            border: 2px solid #ff3b30;
            color: #ff3b30;
            padding: 0.65rem;
            font-family: var(--font-pixel, monospace);
            font-size: 0.65rem;
            cursor: pointer;
          }

          .btn-save-confirm {
            flex: 1;
            background: #0f2b0f;
            border: 2px solid var(--border-bright, #00ff66);
            color: var(--accent, #00ff66);
            padding: 0.65rem;
            font-family: var(--font-pixel, monospace);
            font-size: 0.65rem;
            cursor: pointer;
          }
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      background: #081408;
      border: 2px solid var(--border, #184218);
      box-shadow: 2px 2px 0px #000;

      .empty-rotom-img {
        width: 64px;
        height: 64px;
        margin-bottom: 0.75rem;
        image-rendering: pixelated;
      }

      h3 { font-size: 0.85rem; margin-bottom: 0.35rem; }
      p { font-family: var(--font-terminal, monospace); font-size: 1.15rem; color: var(--text-secondary, #74ad74); margin: 0; }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }
  `],
})
export class ShoppingComponent {
  readonly storage = inject(StorageService);
  readonly sync = inject(SyncService);

  activeStoreFilter = signal<SupermarketStore | 'all'>('all');
  searchQuery = '';

  newItemName = '';
  newItemQty = '';
  newItemStore: SupermarketStore = 'D1';
  newItemCategory = 'otro';

  editingItem = signal<ShoppingItem | null>(null);
  editName = '';
  editQty = '';
  editStore: SupermarketStore = 'D1';
  editCategory = 'otro';

  readonly availableCategories = [
    { id: 'vegetal', name: 'Vegetales', emoji: '🥦' },
    { id: 'proteína', name: 'Carnes', emoji: '🥩' },
    { id: 'lácteo', name: 'Lácteos', emoji: '🧀' },
    { id: 'grano', name: 'Granos', emoji: '🌾' },
    { id: 'condimento', name: 'Condimentos', emoji: '🧂' },
    { id: 'líquido', name: 'Líquidos', emoji: '💧' },
    { id: 'otro', name: 'Otros', emoji: '📦' },
  ];

  activeStoreLabel = computed(() => {
    switch (this.activeStoreFilter()) {
      case 'D1': return 'D1';
      case 'Éxito': return 'ÉXITO';
      default: return 'TODAS';
    }
  });

  readonly filteredItems = computed(() => {
    let list = this.storage.shoppingList();
    const store = this.activeStoreFilter();
    if (store !== 'all') {
      list = list.filter((item) => item.store === store);
    }

    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.quantity && item.quantity.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q) ||
          item.store.toLowerCase().includes(q)
      );
    }
    return list;
  });

  readonly storeGroups = computed(() => {
    const items = this.filteredItems();
    const filter = this.activeStoreFilter();

    if (filter === 'D1') {
      return [{ storeName: 'D1' as SupermarketStore, items }];
    }
    if (filter === 'Éxito') {
      return [{ storeName: 'Éxito' as SupermarketStore, items }];
    }

    return [
      { storeName: 'D1' as SupermarketStore, items: items.filter((i) => i.store === 'D1') },
      { storeName: 'Éxito' as SupermarketStore, items: items.filter((i) => i.store === 'Éxito') },
      { storeName: 'Otro' as SupermarketStore, items: items.filter((i) => i.store !== 'D1' && i.store !== 'Éxito') },
    ];
  });

  async addItem(): Promise<void> {
    const name = this.newItemName.trim();
    if (!name) return;

    await this.storage.addShoppingItem({
      name,
      quantity: this.newItemQty.trim(),
      store: this.newItemStore,
      category: this.newItemCategory,
      checked: false,
      addedAt: new Date().toISOString(),
    });

    this.newItemName = '';
    this.newItemQty = '';
  }

  async toggleItem(id: number): Promise<void> {
    await this.storage.toggleShoppingItem(id);
  }

  startEdit(item: ShoppingItem): void {
    this.editingItem.set(item);
    this.editName = item.name;
    this.editQty = item.quantity || '';
    this.editStore = item.store || 'D1';
    this.editCategory = item.category || 'otro';
  }

  closeEdit(): void {
    this.editingItem.set(null);
  }

  async saveEdit(id: number): Promise<void> {
    const name = this.editName.trim();
    if (!name) return;

    await this.storage.updateShoppingItem(id, {
      name,
      quantity: this.editQty.trim(),
      store: this.editStore,
      category: this.editCategory,
    });

    this.closeEdit();
  }

  async deleteItem(id: number): Promise<void> {
    await this.storage.removeShoppingItem(id);
    this.closeEdit();
  }

  async triggerSync(): Promise<void> {
    await this.sync.pullFromCloud();
  }

  getCategoryEmoji(cat: string): string {
    const found = this.availableCategories.find((c) => c.id === cat.toLowerCase());
    return found ? found.emoji : '📦';
  }
}
