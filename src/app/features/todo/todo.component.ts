import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../core/services/storage.service';
import type { TodoItem } from '../../core/models/state.models';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="todo-container">
      <header class="page-header">
        <div class="header-text">
          <h2>Tareas Pendientes</h2>
          <span class="count-badge">
            {{ storage.pendingTodoCount() }} activa{{ storage.pendingTodoCount() === 1 ? '' : 's' }}
          </span>
        </div>

        <div class="filter-pills">
          <button
            type="button"
            class="pill-btn"
            [class.active]="filterMode() === 'pending'"
            (click)="filterMode.set('pending')"
          >
            Pendientes
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="filterMode() === 'all'"
            (click)="filterMode.set('all')"
          >
            Todas
          </button>
        </div>
      </header>

      <!-- Quick Add Input Bar -->
      <div class="add-card">
        <input
          type="text"
          [(ngModel)]="newTodoTitle"
          placeholder="¿Qué necesitas hacer hoy?"
          (keyup.enter)="addTodo()"
          class="title-input"
        />

        <div class="add-options">
          <div class="priority-selector">
            <button
              type="button"
              class="pri-btn"
              [class.active]="newTodoPriority === 'alta'"
              (click)="newTodoPriority = 'alta'"
            >
              🔴 Alta
            </button>
            <button
              type="button"
              class="pri-btn"
              [class.active]="newTodoPriority === 'media'"
              (click)="newTodoPriority = 'media'"
            >
              🟡 Media
            </button>
            <button
              type="button"
              class="pri-btn"
              [class.active]="newTodoPriority === 'baja'"
              (click)="newTodoPriority = 'baja'"
            >
              🟢 Baja
            </button>
          </div>

          <button class="btn-create" (click)="addTodo()">
            Agregar
          </button>
        </div>
      </div>

      <!-- Todo List -->
      @if (filteredTodos().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">🎉</span>
          <h3>¡Todo al día!</h3>
          <p>No tienes tareas pendientes en esta vista.</p>
        </div>
      } @else {
        <div class="todos-list">
          @for (todo of filteredTodos(); track todo.id) {
            <div
              class="todo-row"
              [class.completed]="todo.completed"
              (click)="storage.toggleTodo(todo.id!)"
            >
              <div class="checkbox-box">
                @if (todo.completed) {
                  <span>✓</span>
                }
              </div>

              <div class="todo-content">
                <span class="todo-title">{{ todo.title }}</span>
                <div class="todo-meta">
                  <span class="pri-tag" [class]="todo.priority">
                    {{ todo.priority | titlecase }}
                  </span>
                  @if (todo.category) {
                    <span class="cat-tag">{{ todo.category }}</span>
                  }
                </div>
              </div>

              <button
                type="button"
                class="btn-delete"
                (click)="$event.stopPropagation(); storage.removeTodo(todo.id!)"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .todo-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 { font-size: 1.7rem; font-weight: 800; margin: 0; }
      .count-badge { font-size: 0.8rem; color: var(--accent, #ff3b30); font-weight: 600; }
    }

    .filter-pills {
      display: flex;
      background: var(--bg-tertiary, #2c2c2e);
      padding: 3px;
      border-radius: 20px;

      .pill-btn {
        padding: 0.35rem 0.75rem;
        border: none;
        background: transparent;
        color: var(--text-secondary, #8e8e93);
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 16px;
        cursor: pointer;

        &.active {
          background: var(--bg-secondary, #1c1c1e);
          color: var(--text-primary, #fff);
        }
      }
    }

    .add-card {
      background: var(--bg-secondary, #1c1c1e);
      border: 1px solid var(--border, #38383a);
      border-radius: var(--card-radius, 16px);
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      .title-input {
        background: transparent;
        border: none;
        color: var(--text-primary, #fff);
        font-size: 0.95rem;
        padding: 0.25rem 0;
        &:focus { outline: none; }
      }

      .add-options {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .priority-selector {
        display: flex;
        gap: 0.35rem;

        .pri-btn {
          background: var(--bg-tertiary, #2c2c2e);
          border: 1px solid var(--border, #38383a);
          color: var(--text-secondary, #8e8e93);
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          border-radius: 8px;
          cursor: pointer;

          &.active {
            border-color: var(--accent, #ff3b30);
            color: var(--text-primary, #fff);
            background: rgba(255, 59, 48, 0.15);
          }
        }
      }

      .btn-create {
        background: var(--accent, #ff3b30);
        color: #fff;
        border: none;
        padding: 0.35rem 0.85rem;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
      }
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      background: var(--bg-secondary, #1c1c1e);
      border-radius: var(--card-radius, 16px);
      border: 1px dashed var(--border, #38383a);

      .empty-icon { font-size: 3rem; display: block; margin-bottom: 0.75rem; }
      h3 { font-size: 1.15rem; margin: 0 0 0.5rem; }
      p { font-size: 0.85rem; color: var(--text-secondary, #8e8e93); margin: 0; }
    }

    .todos-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .todo-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-height: 52px;
      padding: 0.75rem 0.85rem;
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

      &.completed {
        opacity: 0.45;
        background: transparent;

        .checkbox-box {
          background: var(--success, #30d158);
          border-color: var(--success, #30d158);
          color: #000;
        }

        .todo-title {
          text-decoration: line-through;
        }
      }

      .checkbox-box {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        border: 2px solid var(--border, #555);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        font-weight: 800;
        flex-shrink: 0;
      }

      .todo-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        .todo-title { font-size: 0.95rem; font-weight: 500; }
        .todo-meta { display: flex; gap: 0.4rem; }

        .pri-tag {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;

          &.alta { background: rgba(255, 59, 48, 0.2); color: #ff3b30; }
          &.media { background: rgba(255, 214, 10, 0.2); color: #ffd60a; }
          &.baja { background: rgba(48, 209, 88, 0.2); color: #30d158; }
        }

        .cat-tag {
          font-size: 0.65rem;
          color: var(--text-secondary, #8e8e93);
        }
      }

      .btn-delete {
        background: none;
        border: none;
        color: var(--text-tertiary, #636366);
        font-size: 0.9rem;
        padding: 0.5rem;
        cursor: pointer;
      }
    }
  `],
})
export class TodoComponent {
  readonly storage = inject(StorageService);

  filterMode = signal<'pending' | 'all'>('pending');
  newTodoTitle = '';
  newTodoPriority: 'alta' | 'media' | 'baja' = 'media';

  readonly filteredTodos = computed(() => {
    const list = this.storage.todoList();
    if (this.filterMode() === 'pending') {
      return list.filter((t) => !t.completed);
    }
    return list;
  });

  async addTodo(): Promise<void> {
    const title = this.newTodoTitle.trim();
    if (!title) return;

    await this.storage.addTodo({
      title,
      category: 'General',
      priority: this.newTodoPriority,
      completed: false,
      createdAt: new Date().toISOString(),
    });

    this.newTodoTitle = '';
    this.newTodoPriority = 'media';
  }
}
