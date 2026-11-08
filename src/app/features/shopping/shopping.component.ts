import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../core/services/storage.service';
import type { ShoppingItem } from '../../core/models/state.models';

@Component({
  selector: 'app-shopping',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="shopping-container">
      <!-- Page Header -->
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
            <button class="btn-clear" (click)="storage.clearCheckedItems()" title="Quitar productos ya comprados">
              Limpiar comprados
            </button>
          }
        </div>
      </header>

      <!-- Search Bar (Buscar) -->
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          placeholder="Buscar en la lista (ej: leche, cebolla)..."
          class="search-input"
        />
        @if (searchQuery) {
          <button class="btn-clear-search" (click)="searchQuery = ''">✕</button>
        }
      </div>

      <!-- Quick Add Section (Añadir) -->
      <div class="add-section">
        <div class="add-inputs-row">
          <input
            type="text"
            [(ngModel)]="newItemName"
            placeholder="Añadir producto..."
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

        <!-- Category Selector Chips -->
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
                  🗑️ Quitar producto
                </button>
                <button
                  type="button"
                  class="btn-save-confirm"
                  (click)="saveEdit(item.id!)"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Items List & Empty State -->
      @if (filteredList().length === 0) {
        <div class="empty-state">
          <img src="assets/images/rotom/rotom-default.webp" alt="Rotom" class="empty-rotom-img" />
          @if (searchQuery) {
            <h3>Sin resultados</h3>
            <p>No se encontraron productos para "{{ searchQuery }}".</p>
          } @else {
            <h3>¡Tu lista está vacía!</h3>
            <p>Añade lo que necesitas arriba o pulsa "Enviar a compras" en las recetas de la Wiki.</p>
          }
        </div>
      } @else {
        <div class="categories-list">
          @for (entry of groupedFilteredItems() | keyvalue; track entry.key) {
            <section class="category-group">
              <div class="category-header">
                <span class="cat-pill">
                  {{ getCategoryEmoji(entry.key) }} {{ entry.key | titlecase }}
                </span>
                <span class="cat-count">{{ entry.value.length }}</span>
              </div>

              <div class="items-list">
                @for (item of entry.value; track item.id) {
                  <div
                    class="shopping-row"
                    [class.checked]="item.checked"
                    (click)="storage.toggleShoppingItem(item.id!)"
                  >
                    <!-- One-handed Large Tap Circle -->
                    <div class="checkbox-circle">
                      @if (item.checked) {
                        <span>✓</span>
                      }
                    </div>

                    <div class="item-info">
                      <span class="item-name">{{ item.name }}</span>
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
                        (click)="storage.removeShoppingItem(item.id!)"
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
        </div>
      }
    </div>
  `,
  styles: [`
    .shopping-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
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

    /* ─── Search Bar (Buscar) ─── */
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

    /* ─── Add Section (Añadir) ─── */
    .add-section {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;

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
        transition: all 0.15s ease;

        &.selected {
          background: rgba(255, 59, 48, 0.2);
          border-color: var(--accent, #ff3b30);
          color: #fff;
          font-weight: 600;
        }
      }
    }

    /* ─── Edit Bottom Sheet (Editar) ─── */
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

    /* ─── Empty State ─── */
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
        animation: rotomFloat 3s ease-in-out infinite alternate;
      }
      h3 { font-size: 1.15rem; margin: 0 0 0.5rem; }
      p { font-size: 0.85rem; color: var(--text-secondary, #8e8e93); margin: 0; }
    }

    /* ─── Shopping Rows (Quitar & Editar) ─── */
    .categories-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .category-group {
      .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;

        .cat-pill {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary, #8e8e93);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .cat-count {
          font-size: 0.75rem;
          background: var(--bg-tertiary, #2c2c2e);
          padding: 0.15rem 0.5rem;
          border-radius: 10px;
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

        .item-name {
          font-size: 0.95rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
  `],
})
export class ShoppingComponent {
  readonly storage = inject(StorageService);

  searchQuery = '';
  newItemName = '';
  newItemQty = '';
  newItemCategory = 'vegetal';

  editingItem = signal<ShoppingItem | null>(null);
  editName = '';
  editQty = '';
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

  readonly filteredList = computed(() => {
    let list = this.storage.shoppingList();
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.quantity && item.quantity.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q)
      );
    }
    return list;
  });

  readonly groupedFilteredItems = computed(() => {
    const items = this.filteredList();
    const grouped = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const cat = item.category || 'otro';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(item);
    }
    return grouped;
  });

  async addItem(): Promise<void> {
    const name = this.newItemName.trim();
    if (!name) return;

    await this.storage.addShoppingItem({
      name,
      quantity: this.newItemQty.trim(),
      category: this.newItemCategory,
      checked: false,
      addedAt: new Date().toISOString(),
    });

    this.newItemName = '';
    this.newItemQty = '';
  }

  startEdit(item: ShoppingItem): void {
    this.editingItem.set(item);
    this.editName = item.name;
    this.editQty = item.quantity || '';
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
      category: this.editCategory,
    });

    this.closeEdit();
  }

  async deleteItem(id: number): Promise<void> {
    await this.storage.removeShoppingItem(id);
    this.closeEdit();
  }

  getCategoryEmoji(cat: string): string {
    const found = this.availableCategories.find((c) => c.id === cat.toLowerCase());
    return found ? found.emoji : '📦';
  }
}
