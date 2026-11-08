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
            <h2>Lista de Compras</h2>
          </div>
          <span class="count-badge">
            {{ storage.uncheckedShoppingCount() }} pendiente{{ storage.uncheckedShoppingCount() === 1 ? '' : 's' }}
          </span>
        </div>

        <div class="header-actions">
          @if (storage.shoppingList().length > 0) {
            <button class="btn-clear" (click)="storage.clearCheckedItems()" title="Quitar productos comprados">
              Limpiar comprados
            </button>
          }
        </div>
      </header>

      <!-- PC ↔ Celular Sync Bar -->
      <div class="sync-strip" (click)="triggerSync()">
        <div class="sync-status-info">
          <span class="status-circle" [class]="sync.syncState()"></span>
          <span class="status-label">{{ sync.statusMessage() }}</span>
        </div>
        <button class="btn-mini-sync" [disabled]="sync.syncState() === 'syncing'">
          {{ sync.syncState() === 'syncing' ? 'Bajando cambios...' : 'Bajar cambios del PC ⬇️' }}
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
          <span class="tab-badge-all">🌐</span>
          Todos ({{ storage.shoppingList().length }})
        </button>

        <button
          type="button"
          class="store-tab tab-d1"
          [class.active]="activeStoreFilter() === 'D1'"
          (click)="activeStoreFilter.set('D1')"
        >
          <span class="store-dot dot-d1"></span>
          D1 ({{ storage.shoppingByStore().d1.length }})
        </button>

        <button
          type="button"
          class="store-tab tab-exito"
          [class.active]="activeStoreFilter() === 'Éxito'"
          (click)="activeStoreFilter.set('Éxito')"
        >
          <span class="store-dot dot-exito"></span>
          Éxito ({{ storage.shoppingByStore().exito.length }})
        </button>
      </div>

      <!-- Search Bar (Buscar) -->
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          placeholder="Buscar en {{ activeStoreLabel() }}..."
          class="search-input"
        />
        @if (searchQuery) {
          <button class="btn-clear-search" (click)="searchQuery = ''">✕</button>
        }
      </div>

      <!-- Quick Add Section (Añadir con selección D1 / Éxito) -->
      <div class="add-section">
        <div class="store-selector-row">
          <span class="add-label">Comprar en:</span>
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
              🔴 Éxito
            </button>
            <button
              type="button"
              class="btn-store-pick otro"
              [class.selected]="newItemStore === 'Otro'"
              (click)="newItemStore = 'Otro'"
            >
              📦 Otro
            </button>
          </div>
        </div>

        <div class="add-inputs-row">
          <input
            type="text"
            [(ngModel)]="newItemName"
            placeholder="Ej: Leche, Arroz, Pollo..."
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
            + Añadir
          </button>
        </div>

        <!-- Optional Category Chips (Vegetal, Carne, etc.) -->
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
            <div class="sheet-handle"></div>
            <div class="sheet-header">
              <h3>✏️ Editar Producto</h3>
              <button class="btn-close-sheet" (click)="closeEdit()">✕</button>
            </div>

            <div class="edit-form">
              <label>Supermercado</label>
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
                  🔴 Éxito
                </button>
                <button
                  type="button"
                  class="btn-store-pick otro"
                  [class.selected]="editStore === 'Otro'"
                  (click)="editStore = 'Otro'"
                >
                  📦 Otro
                </button>
              </div>

              <label>Nombre del producto</label>
              <input
                type="text"
                [(ngModel)]="editName"
                placeholder="Nombre"
                class="sheet-input"
              />

              <label>Cantidad o formato</label>
              <input
                type="text"
                [(ngModel)]="editQty"
                placeholder="Ej: 500g, 2 unid, 1 litro"
                class="sheet-input"
              />

              <label>Categoría</label>
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
                  🗑️ Quitar
                </button>
                <button
                  type="button"
                  class="btn-save-confirm"
                  (click)="saveEdit(item.id!)"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Items List by Store & Empty State -->
      @if (filteredItems().length === 0) {
        <div class="empty-state">
          <img src="assets/images/rotom/rotom-default.webp" alt="Rotom" class="empty-rotom-img" />
          @if (searchQuery) {
            <h3>Sin resultados</h3>
            <p>No se encontraron productos para "{{ searchQuery }}".</p>
          } @else {
            <h3>¡Nada pendiente en {{ activeStoreLabel() }}!</h3>
            <p>Añade lo que necesitas arriba o usa "Enviar a compras" desde las recetas.</p>
          }
        </div>
      } @else {
        <!-- Grouped by Store (in 'all' mode) or Single List -->
        <div class="store-sections-list">
          @for (group of storeGroups(); track group.storeName) {
            @if (group.items.length > 0) {
              <section class="store-group-card">
                <div class="store-group-header">
                  <div class="store-title-badge" [class.d1-badge]="group.storeName === 'D1'" [class.exito-badge]="group.storeName === 'Éxito'">
                    <span class="store-icon">{{ group.storeName === 'D1' ? '🟡' : (group.storeName === 'Éxito' ? '🔴' : '📦') }}</span>
                    <strong>{{ group.storeName }}</strong>
                  </div>
                  <span class="store-items-count">{{ group.items.length }} producto{{ group.items.length === 1 ? '' : 's' }}</span>
                </div>

                <div class="items-list">
                  @for (item of group.items; track item.id) {
                    <div
                      class="shopping-row"
                      [class.checked]="item.checked"
                      (click)="toggleItem(item.id!)"
                    >
                      <!-- One-handed Large Tap Circle -->
                      <div class="checkbox-circle">
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
                          title="Editar producto"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          class="btn-icon-action btn-delete"
                          (click)="deleteItem(item.id!)"
                          title="Quitar producto"
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
      gap: 1.15rem;
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

        h2 { font-size: 1.6rem; font-weight: 800; margin: 0; }
      }

      .count-badge {
        font-size: 0.8rem;
        color: var(--accent, #ff3b30);
        font-weight: 600;
      }

      .btn-clear {
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px solid var(--border, #38383a);
        color: var(--text-secondary, #8e8e93);
        font-size: 0.75rem;
        padding: 0.4rem 0.75rem;
        border-radius: 20px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;

        &:active { opacity: 0.7; }
      }
    }

    /* ─── Sync Status Bar (PC ↔ Celular) ─── */
    .sync-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: 12px;
      padding: 0.5rem 0.85rem;
      cursor: pointer;

      .sync-status-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .status-circle {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #8e8e93;

          &.synced { background: var(--success, #30d158); }
          &.syncing { background: var(--warning, #ffd60a); }
          &.offline { background: #636366; }
        }

        .status-label {
          font-size: 0.75rem;
          color: var(--text-secondary, #8e8e93);
        }
      }

      .btn-mini-sync {
        background: none;
        border: none;
        color: var(--accent, #ff3b30);
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
      }
    }

    .sync-toast-bar {
      background: rgba(48, 209, 88, 0.15);
      border: 1px solid rgba(48, 209, 88, 0.35);
      color: var(--success, #30d158);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.55rem 0.85rem;
      border-radius: 10px;
      text-align: center;
      animation: fadeIn 0.2s ease;
    }

    /* ─── Supermarket Store Filter (D1 vs Éxito vs Todos) ─── */
    .store-filter-bar {
      display: flex;
      background: var(--bg-tertiary, #2c2c2e);
      padding: 3px;
      border-radius: 14px;
      gap: 3px;

      .store-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        padding: 0.6rem 0.25rem;
        border: none;
        background: transparent;
        color: var(--text-secondary, #8e8e93);
        font-size: 0.8rem;
        font-weight: 700;
        border-radius: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
        -webkit-tap-highlight-color: transparent;

        .store-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;

          &.dot-d1 { background: #ffd60a; }
          &.dot-exito { background: #ff3b30; }
        }

        &.active {
          background: var(--bg-secondary, #1c1c1e);
          color: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);

          &.tab-d1 { color: #ffd60a; }
          &.tab-exito { color: #ff3b30; }
        }
      }
    }

    /* ─── Search Bar ─── */
    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--input-radius, 12px);
      padding: 0.6rem 0.85rem;

      .search-icon { font-size: 0.9rem; opacity: 0.6; }
      .search-input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-primary, #fff);
        font-size: 0.9rem;
        &:focus { outline: none; }
      }
      .btn-clear-search {
        background: none;
        border: none;
        color: var(--text-secondary, #8e8e93);
        font-size: 0.85rem;
        cursor: pointer;
      }
    }

    /* ─── Add Section ─── */
    .add-section {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      .store-selector-row {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .add-label {
          font-size: 0.75rem;
          color: var(--text-secondary, #8e8e93);
          font-weight: 600;
        }
      }

      .store-toggle-group {
        display: flex;
        gap: 0.35rem;

        .btn-store-pick {
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid var(--border, #38383a);
          color: var(--text-secondary, #8e8e93);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.35rem 0.6rem;
          border-radius: 8px;
          cursor: pointer;

          &.selected {
            &.d1 {
              background: rgba(255, 214, 10, 0.2);
              border-color: #ffd60a;
              color: #ffd60a;
            }
            &.exito {
              background: rgba(255, 59, 48, 0.2);
              border-color: #ff3b30;
              color: #ff3b30;
            }
            &.otro {
              background: var(--bg-elevated, #3a3a3c);
              border-color: #fff;
              color: #fff;
            }
          }
        }
      }

      .add-inputs-row {
        display: flex;
        gap: 0.5rem;
      }

      .input-name {
        flex: 2;
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px solid var(--border, #38383a);
        border-radius: 8px;
        padding: 0.6rem 0.75rem;
        color: #fff;
        font-size: 0.9rem;
        &:focus { outline: none; border-color: var(--accent, #ff3b30); }
      }

      .input-qty {
        width: 70px;
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px solid var(--border, #38383a);
        border-radius: 8px;
        padding: 0.6rem 0.5rem;
        color: #fff;
        font-size: 0.9rem;
        text-align: center;
        &:focus { outline: none; border-color: var(--accent, #ff3b30); }
      }

      .btn-add-primary {
        background: var(--accent, #ff3b30);
        color: #fff;
        border: none;
        padding: 0.6rem 0.85rem;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        white-space: nowrap;
        &:active { opacity: 0.8; }
      }
    }

    .category-chips {
      display: flex;
      gap: 0.4rem;
      overflow-x: auto;
      padding-bottom: 0.2rem;
      -webkit-overflow-scrolling: touch;
      &::-webkit-scrollbar { display: none; }

      .cat-chip {
        flex: 0 0 auto;
        background: var(--bg-tertiary, #2c2c2e);
        border: 1px solid var(--border, #38383a);
        color: var(--text-secondary, #8e8e93);
        font-size: 0.75rem;
        padding: 0.35rem 0.6rem;
        border-radius: 14px;
        cursor: pointer;

        &.selected {
          background: rgba(255, 59, 48, 0.2);
          border-color: var(--accent, #ff3b30);
          color: #fff;
          font-weight: 600;
        }
      }
    }

    /* ─── Store Sections & Rows ─── */
    .store-sections-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .store-group-card {
      .store-group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.6rem;

        .store-title-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.95rem;

          &.d1-badge { color: #ffd60a; }
          &.exito-badge { color: #ff3b30; }
        }

        .store-items-count {
          font-size: 0.75rem;
          color: var(--text-secondary, #8e8e93);
        }
      }

      .items-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
    }

    .shopping-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-height: 54px;
      padding: 0.65rem 0.85rem;
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--input-radius, 12px);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      transition: all 0.15s ease;

      &:active {
        background: var(--bg-tertiary, #2c2c2e);
      }

      &.checked {
        opacity: 0.45;
        background: transparent;

        .checkbox-circle {
          background: var(--success, #30d158);
          border-color: var(--success, #30d158);
          color: #000;
        }

        .item-name {
          text-decoration: line-through;
        }
      }

      .checkbox-circle {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid var(--border, #555);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        font-weight: 800;
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
          gap: 0.4rem;
          overflow: hidden;
        }

        .item-name {
          font-size: 0.95rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cat-pill-mini {
          font-size: 0.8rem;
        }

        .item-qty {
          font-size: 0.85rem;
          color: var(--accent, #ff3b30);
          font-weight: 700;
          margin-left: 0.5rem;
          flex-shrink: 0;
        }
      }

      .row-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        flex-shrink: 0;

        .btn-icon-action {
          background: none;
          border: none;
          font-size: 0.95rem;
          padding: 0.4rem;
          border-radius: 8px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;

          &:active {
            transform: scale(0.9);
            background: var(--bg-tertiary, #2c2c2e);
          }
        }
      }
    }

    /* ─── Edit Bottom Sheet ─── */
    .edit-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .edit-sheet {
      background: var(--bg-secondary, #1c1c1e);
      width: 100%;
      max-width: 500px;
      border-radius: 20px 20px 0 0;
      padding: 1rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom)) 1.25rem;
      border-top: 1px solid var(--border, #38383a);
      animation: slideUp 0.25s cubic-bezier(0.1, 0.9, 0.2, 1);

      .sheet-handle {
        width: 36px;
        height: 4px;
        background: #555;
        border-radius: 2px;
        margin: 0 auto 0.75rem auto;
      }

      .sheet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        h3 { font-size: 1.15rem; margin: 0; }
        .btn-close-sheet {
          background: none;
          border: none;
          color: var(--text-secondary, #8e8e93);
          font-size: 1.1rem;
          cursor: pointer;
        }
      }

      .edit-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;

        label {
          font-size: 0.75rem;
          color: var(--text-secondary, #8e8e93);
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 0.25rem;
        }

        .sheet-input {
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid var(--border, #38383a);
          border-radius: 10px;
          color: #fff;
          padding: 0.75rem;
          font-size: 0.95rem;
          &:focus { outline: none; border-color: var(--accent, #ff3b30); }
        }

        .sheet-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;

          .btn-delete-confirm {
            flex: 1;
            background: rgba(255, 59, 48, 0.15);
            border: 1px solid rgba(255, 59, 48, 0.3);
            color: #ff3b30;
            padding: 0.85rem;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
          }

          .btn-save-confirm {
            flex: 2;
            background: var(--accent, #ff3b30);
            border: none;
            color: #fff;
            padding: 0.85rem;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
          }
        }
      }
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .empty-state {
      text-align: center;
      padding: 2.5rem 1rem;
      background: var(--bg-secondary, #1c1c1e);
      border-radius: var(--card-radius, 16px);
      border: 1px dashed var(--border, #38383a);

      .empty-rotom-img {
        width: 80px;
        height: 80px;
        object-fit: contain;
        margin-bottom: 0.75rem;
      }
      h3 { font-size: 1.15rem; margin: 0 0 0.5rem; }
      p { font-size: 0.85rem; color: var(--text-secondary, #8e8e93); margin: 0; }
    }
  `],
})
export class ShoppingComponent {
  readonly storage = inject(StorageService);
  readonly sync = inject(SyncService);

  activeStoreFilter = signal<'all' | 'D1' | 'Éxito'>('all');
  searchQuery = '';

  newItemName = '';
  newItemQty = '';
  newItemStore: SupermarketStore = 'D1';
  newItemCategory = 'vegetal';

  editingItem = signal<ShoppingItem | null>(null);
  editName = '';
  editQty = '';
  editStore: SupermarketStore = 'D1';
  editCategory = 'vegetal';

  readonly availableCategories = [
    { id: 'vegetal', name: 'Vegetales', emoji: '🥦' },
    { id: 'proteína', name: 'Carnes / Prot', emoji: '🥩' },
    { id: 'lácteo', name: 'Lácteos', emoji: '🧀' },
    { id: 'grano', name: 'Granos / Harina', emoji: '🌾' },
    { id: 'condimento', name: 'Condimentos', emoji: '🧂' },
    { id: 'líquido', name: 'Líquidos', emoji: '💧' },
    { id: 'otro', name: 'Otros', emoji: '📦' },
  ];

  activeStoreLabel = computed(() => {
    switch (this.activeStoreFilter()) {
      case 'D1': return 'D1';
      case 'Éxito': return 'Éxito';
      default: return 'Todas las tiendas';
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

    // Modo 'all': agrupar por D1, Éxito y Otros
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

    // Auto-sync a la nube en segundo plano si hay red
    this.sync.pushToCloud();
  }

  async toggleItem(id: number): Promise<void> {
    await this.storage.toggleShoppingItem(id);
    this.sync.pushToCloud();
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
    this.sync.pushToCloud();
  }

  async deleteItem(id: number): Promise<void> {
    await this.storage.removeShoppingItem(id);
    this.closeEdit();
    this.sync.pushToCloud();
  }

  async triggerSync(): Promise<void> {
    await this.sync.pullFromCloud();
  }

  getCategoryEmoji(cat: string): string {
    const found = this.availableCategories.find((c) => c.id === cat.toLowerCase());
    return found ? found.emoji : '📦';
  }
}
