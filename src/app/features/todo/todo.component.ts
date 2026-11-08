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
        <div class="title-with-sprite">
          <img src="assets/images/rotom/rotom-sprite.webp" alt="Rotom" class="header-sprite" />
          <div class="header-text">
            <h2>MISIONES</h2>
            <span class="count-badge">
              {{ storage.pendingTodoCount() }} PENDIENTE{{ storage.pendingTodoCount() === 1 ? '' : 'S' }}
            </span>
          </div>
        </div>

        <div class="filter-pills">
          <button
            type="button"
            class="pill-btn"
            [class.active]="filterMode() === 'pending'"
            (click)="filterMode.set('pending')"
          >
            PENDIENTES
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="filterMode() === 'all'"
            (click)="filterMode.set('all')"
          >
            TODAS
          </button>
        </div>
      </header>

      <!-- Quick Add Input Bar -->
      <div class="add-card">
        <div class="input-line">
          <span class="prompt-symbol">▶</span>
          <input
            type="text"
            [(ngModel)]="newTodoTitle"
            placeholder="NUEVA MISIÓN O TAREA..."
            (keyup.enter)="addTodo()"
            class="title-input"
          />
        </div>

        <div class="add-options">
          <div class="priority-selector">
            <span class="pri-label">PRIORIDAD:</span>
            <button
              type="button"
              class="pri-btn pri-alta"
              [class.active]="newTodoPriority === 'alta'"
              (click)="newTodoPriority = 'alta'"
            >
              ALTA
            </button>
            <button
              type="button"
              class="pri-btn pri-media"
              [class.active]="newTodoPriority === 'media'"
              (click)="newTodoPriority = 'media'"
            >
              MEDIA
            </button>
            <button
              type="button"
              class="pri-btn pri-baja"
              [class.active]="newTodoPriority === 'baja'"
              (click)="newTodoPriority = 'baja'"
            >
              BAJA
            </button>
          </div>

          <button class="btn-create" (click)="addTodo()">
            + AGREGAR
          </button>
        </div>
      </div>

      <!-- Todo List -->
      @if (filteredTodos().length === 0) {
        <div class="empty-state">
          <img src="assets/images/rotom/rotom-sprite.webp" alt="Rotom" class="empty-rotom-img" />
          <h3>¡MISIONES COMPLETADAS!</h3>
          <p>No tienes tareas pendientes en esta vista. ¡Rotom descansando!</p>
        </div>
      } @else {
        <div class="todos-list">
          @for (todo of filteredTodos(); track todo.id) {
            <div
              class="todo-row"
              [class.completed]="todo.completed"
              (click)="storage.toggleTodo(todo.id!)"
            >
              <div class="checkbox-box" [class.checked]="todo.completed">
                {{ todo.completed ? '✓' : '' }}
              </div>

              <div class="todo-content">
                <span class="todo-title">{{ todo.title }}</span>
                <div class="todo-meta">
                  <span class="pri-tag" [class]="todo.priority">
                    {{ todo.priority | uppercase }}
                  </span>
                  @if (todo.category) {
                    <span class="cat-tag">#{{ todo.category }}</span>
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
      gap: 1rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;

      .title-with-sprite {
        display: flex;
        align-items: center;
        gap: 0.6rem;

        .header-sprite {
          width: 32px;
          height: 32px;
          image-rendering: pixelated;
        }

        h2 {
          font-family: var(--font-pixel, monospace);
          font-size: 0.95rem;
          color: var(--accent, #00ff66);
          margin: 0;
          letter-spacing: 0.05em;
        }

        .count-badge {
          font-family: var(--font-pixel, monospace);
          font-size: 0.55rem;
          color: var(--text-secondary, #74ad74);
          display: block;
          margin-top: 0.15rem;
        }
      }
    }

    .filter-pills {
      display: flex;
      background: #020502;
      border: 2px solid var(--border, #184218);
      box-shadow: 2px 2px 0px #000;
      padding: 2px;

      .pill-btn {
        padding: 0.35rem 0.65rem;
        border: none;
        background: transparent;
        color: var(--text-secondary, #74ad74);
        font-family: var(--font-pixel, monospace);
        font-size: 0.55rem;
        cursor: pointer;
        transition: all 0.1s ease;

        &.active {
          background: var(--accent, #00ff66);
          color: #000;
          box-shadow: inset 1px 1px 0px rgba(255, 255, 255, 0.4);
        }
      }
    }

    .add-card {
      background: #081408;
      border: 2px solid var(--border-bright, #00ff66);
      box-shadow: 3px 3px 0px #000;
      padding: 0.75rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;

      .input-line {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #030603;
        border: 2px solid var(--border, #184218);
        padding: 0.4rem 0.6rem;

        .prompt-symbol {
          color: var(--accent, #00ff66);
          font-family: var(--font-pixel, monospace);
          font-size: 0.75rem;
        }

        .title-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          font-family: var(--font-terminal, monospace);
          font-size: 1.15rem;
          padding: 0.1rem 0;
          &:focus { outline: none; }
          &::placeholder {
            color: #436b43;
          }
        }
      }

      .add-options {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .priority-selector {
        display: flex;
        align-items: center;
        gap: 0.35rem;

        .pri-label {
          font-family: var(--font-pixel, monospace);
          font-size: 0.5rem;
          color: var(--text-secondary, #74ad74);
          margin-right: 0.2rem;
        }

        .pri-btn {
          background: #040904;
          border: 1px solid var(--border, #184218);
          color: var(--text-secondary, #74ad74);
          font-family: var(--font-pixel, monospace);
          font-size: 0.55rem;
          padding: 0.25rem 0.5rem;
          cursor: pointer;

          &.pri-alta.active {
            border-color: #ff3b30;
            color: #ff3b30;
            background: rgba(255, 59, 48, 0.2);
          }

          &.pri-media.active {
            border-color: #ffd60a;
            color: #ffd60a;
            background: rgba(255, 214, 10, 0.2);
          }

          &.pri-baja.active {
            border-color: var(--accent, #00ff66);
            color: var(--accent, #00ff66);
            background: rgba(0, 255, 102, 0.2);
          }
        }
      }

      .btn-create {
        background: var(--accent, #00ff66);
        color: #000;
        border: 2px solid #000;
        box-shadow: 2px 2px 0px #000;
        padding: 0.35rem 0.75rem;
        font-family: var(--font-pixel, monospace);
        font-size: 0.6rem;
        font-weight: 700;
        cursor: pointer;

        &:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px #000;
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 2.5rem 1rem;
      background: #081408;
      border: 2px dashed var(--border, #184218);
      box-shadow: 2px 2px 0px #000;

      .empty-rotom-img {
        width: 48px;
        height: 48px;
        image-rendering: pixelated;
        margin-bottom: 0.75rem;
        filter: drop-shadow(0 0 6px rgba(0, 255, 102, 0.4));
      }

      h3 {
        font-family: var(--font-pixel, monospace);
        font-size: 0.8rem;
        color: var(--accent, #00ff66);
        margin: 0 0 0.5rem;
      }

      p {
        font-family: var(--font-terminal, monospace);
        font-size: 1.15rem;
        color: var(--text-secondary, #74ad74);
        margin: 0;
      }
    }

    .todos-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .todo-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-height: 48px;
      padding: 0.65rem 0.75rem;
      background: #081408;
      border: 2px solid var(--border, #184218);
      box-shadow: 2px 2px 0px #000;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      transition: all 0.1s ease;

      &:hover {
        border-color: var(--accent, #00ff66);
      }

      &:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0px #000;
      }

      &.completed {
        opacity: 0.5;
        background: #030603;
        border-color: #0f290f;

        .checkbox-box {
          background: var(--accent, #00ff66);
          border-color: var(--accent, #00ff66);
          color: #000;
        }

        .todo-title {
          text-decoration: line-through;
          color: var(--text-secondary, #74ad74);
        }
      }

      .checkbox-box {
        width: 22px;
        height: 22px;
        border: 2px solid var(--accent, #00ff66);
        background: #020502;
        color: var(--accent, #00ff66);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-pixel, monospace);
        font-size: 0.75rem;
        flex-shrink: 0;
        box-shadow: 1px 1px 0px #000;

        &.checked {
          background: var(--accent, #00ff66);
          color: #000;
        }
      }

      .todo-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;

        .todo-title {
          font-family: var(--font-terminal, monospace);
          font-size: 1.25rem;
          font-weight: 500;
          color: #fff;
          line-height: 1.2;
        }

        .todo-meta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .pri-tag {
          font-family: var(--font-pixel, monospace);
          font-size: 0.5rem;
          font-weight: 700;
          padding: 0.1rem 0.35rem;
          border: 1px solid currentColor;

          &.alta { background: rgba(255, 59, 48, 0.15); color: #ff3b30; }
          &.media { background: rgba(255, 214, 10, 0.15); color: #ffd60a; }
          &.baja { background: rgba(0, 255, 102, 0.15); color: var(--accent, #00ff66); }
        }

        .cat-tag {
          font-family: var(--font-pixel, monospace);
          font-size: 0.5rem;
          color: var(--text-secondary, #74ad74);
        }
      }

      .btn-delete {
        background: none;
        border: 1px solid transparent;
        color: var(--text-secondary, #74ad74);
        font-family: var(--font-pixel, monospace);
        font-size: 0.75rem;
        padding: 0.35rem;
        cursor: pointer;

        &:hover {
          color: #ff3b30;
          border-color: #ff3b30;
        }
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
