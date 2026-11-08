import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Dexie, { type Table } from 'dexie';
import type {
  StepProgress,
  ShoppingItem,
  TodoItem,
  DailyCheckIn,
  CalendarEvent,
  UserSettings,
} from '../models/state.models';
import type { Recipe, Ingredient } from '../models/catalog.models';

// ─── Dexie Database Definition ───
export class RotomDB extends Dexie {
  stepProgress!: Table<StepProgress, number>;
  shoppingItems!: Table<ShoppingItem, number>;
  todoItems!: Table<TodoItem, number>;
  dailyCheckIns!: Table<DailyCheckIn, number>;
  calendarEvents!: Table<CalendarEvent, number>;
  userSettings!: Table<UserSettings, number>;

  constructor() {
    super('Rotom');
    this.version(1).stores({
      stepProgress: '++id, catalogItemId, [catalogItemId+stepOrder]',
      shoppingItems: '++id, name, category, checked, sourceRecipeId',
      todoItems: '++id, category, priority, completed, dueDate',
      dailyCheckIns: '++id, &date',
      calendarEvents: '++id, date, type, completed',
      userSettings: '++id, &key',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private db?: RotomDB;

  // ─── Reactive Signals ───
  readonly shoppingList = signal<ShoppingItem[]>([]);
  readonly todoList = signal<TodoItem[]>([]);
  readonly checkIns = signal<DailyCheckIn[]>([]);
  readonly calendarEvents = signal<CalendarEvent[]>([]);
  readonly isPersistent = signal(false);

  // ─── Computed ───
  readonly uncheckedShoppingCount = computed(
    () => this.shoppingList().filter((i) => !i.checked).length
  );
  readonly pendingTodoCount = computed(
    () => this.todoList().filter((t) => !t.completed).length
  );
  readonly shoppingByCategory = computed(() => {
    const items = this.shoppingList();
    const grouped = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const cat = item.category || 'Otros';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(item);
    }
    return grouped;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.db = new RotomDB();
      this.initializeData();
    }
  }

  private async initializeData(): Promise<void> {
    if (!this.db) return;
    await Promise.all([
      this.refreshShoppingList(),
      this.refreshTodoList(),
      this.refreshCheckIns(),
      this.refreshCalendarEvents(),
      this.requestPersistentStorage(),
    ]);
  }

  // ─── Persistent Storage (Safari purge protection) ───
  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      const granted = await navigator.storage.persist();
      this.isPersistent.set(granted);
      return granted;
    }
    return false;
  }

  // ─── Step Progress ───
  async getStepProgress(catalogItemId: string): Promise<StepProgress[]> {
    if (!this.db) return [];
    return this.db.stepProgress
      .where('catalogItemId')
      .equals(catalogItemId)
      .sortBy('stepOrder');
  }

  async toggleStep(catalogItemId: string, stepOrder: number): Promise<void> {
    if (!this.db) return;
    const existing = await this.db.stepProgress
      .where('[catalogItemId+stepOrder]')
      .equals([catalogItemId, stepOrder])
      .first();

    if (existing) {
      await this.db.stepProgress.update(existing.id!, {
        completed: !existing.completed,
        completedAt: !existing.completed ? new Date().toISOString() : undefined,
      });
    } else {
      await this.db.stepProgress.add({
        catalogItemId,
        stepOrder,
        completed: true,
        completedAt: new Date().toISOString(),
      });
    }
  }

  async resetSteps(catalogItemId: string): Promise<void> {
    if (!this.db) return;
    await this.db.stepProgress
      .where('catalogItemId')
      .equals(catalogItemId)
      .delete();
  }

  // ─── Shopping List ───
  async refreshShoppingList(): Promise<void> {
    if (!this.db) return;
    const items = await this.db.shoppingItems.toArray();
    this.shoppingList.set(items);
  }

  async addShoppingItem(item: Omit<ShoppingItem, 'id'>): Promise<void> {
    if (!this.db) return;
    await this.db.shoppingItems.add(item as ShoppingItem);
    await this.refreshShoppingList();
  }

  async toggleShoppingItem(id: number): Promise<void> {
    if (!this.db) return;
    const item = await this.db.shoppingItems.get(id);
    if (item) {
      await this.db.shoppingItems.update(id, { checked: !item.checked });
      await this.refreshShoppingList();
    }
  }

  async updateShoppingItem(id: number, updates: Partial<Omit<ShoppingItem, 'id'>>): Promise<void> {
    if (!this.db) return;
    await this.db.shoppingItems.update(id, updates);
    await this.refreshShoppingList();
  }

  async removeShoppingItem(id: number): Promise<void> {
    if (!this.db) return;
    await this.db.shoppingItems.delete(id);
    await this.refreshShoppingList();
  }

  async clearCheckedItems(): Promise<void> {
    if (!this.db) return;
    const checked = this.shoppingList().filter((i) => i.checked);
    await this.db.shoppingItems.bulkDelete(checked.map((i) => i.id!));
    await this.refreshShoppingList();
  }

  /**
   * Empuja los ingredientes de una receta estática hacia la lista de compras dinámica.
   * Valida duplicados por nombre de manera insensible a mayúsculas/minúsculas y espacios.
   */
  async pushIngredientsToShoppingList(recipe: Recipe): Promise<number> {
    if (!this.db) return 0;
    const existing = await this.db.shoppingItems.toArray();
    const existingNames = new Set(
      existing.map((i) => i.name.toLowerCase().trim())
    );

    const newItems: ShoppingItem[] = recipe.ingredients
      .filter(
        (ing: Ingredient) =>
          !existingNames.has(ing.name.toLowerCase().trim())
      )
      .map((ing: Ingredient) => ({
        name: ing.name,
        quantity: ing.quantity,
        category: ing.category,
        checked: false,
        sourceRecipeId: recipe.id,
        addedAt: new Date().toISOString(),
      }));

    if (newItems.length > 0) {
      await this.db.shoppingItems.bulkAdd(newItems);
      await this.refreshShoppingList();
    }

    return newItems.length;
  }

  // ─── To-Do List ───
  async refreshTodoList(): Promise<void> {
    if (!this.db) return;
    const items = await this.db.todoItems.orderBy('createdAt').reverse().toArray();
    this.todoList.set(items);
  }

  async addTodo(item: Omit<TodoItem, 'id'>): Promise<void> {
    if (!this.db) return;
    await this.db.todoItems.add(item as TodoItem);
    await this.refreshTodoList();
  }

  async toggleTodo(id: number): Promise<void> {
    if (!this.db) return;
    const item = await this.db.todoItems.get(id);
    if (item) {
      await this.db.todoItems.update(id, {
        completed: !item.completed,
        completedAt: !item.completed ? new Date().toISOString() : undefined,
      });
      await this.refreshTodoList();
    }
  }

  async removeTodo(id: number): Promise<void> {
    if (!this.db) return;
    await this.db.todoItems.delete(id);
    await this.refreshTodoList();
  }

  // ─── Daily Check-Ins ───
  async refreshCheckIns(): Promise<void> {
    if (!this.db) return;
    const items = await this.db.dailyCheckIns.orderBy('date').reverse().toArray();
    this.checkIns.set(items);
  }

  async addCheckIn(checkIn: Omit<DailyCheckIn, 'id'>): Promise<void> {
    if (!this.db) return;
    await this.db.dailyCheckIns.put(checkIn as DailyCheckIn);
    await this.refreshCheckIns();
  }

  async getCheckInForDate(date: string): Promise<DailyCheckIn | undefined> {
    if (!this.db) return undefined;
    return this.db.dailyCheckIns.where('date').equals(date).first();
  }

  // ─── Calendar Events ───
  async refreshCalendarEvents(): Promise<void> {
    if (!this.db) return;
    const items = await this.db.calendarEvents.orderBy('date').toArray();
    this.calendarEvents.set(items);
  }

  async addCalendarEvent(event: Omit<CalendarEvent, 'id'>): Promise<void> {
    if (!this.db) return;
    await this.db.calendarEvents.add(event as CalendarEvent);
    await this.refreshCalendarEvents();
  }

  async toggleCalendarEvent(id: number): Promise<void> {
    if (!this.db) return;
    const event = await this.db.calendarEvents.get(id);
    if (event) {
      await this.db.calendarEvents.update(id, {
        completed: !event.completed,
      });
      await this.refreshCalendarEvents();
    }
  }

  async removeCalendarEvent(id: number): Promise<void> {
    if (!this.db) return;
    await this.db.calendarEvents.delete(id);
    await this.refreshCalendarEvents();
  }

  async getEventsForDate(date: string): Promise<CalendarEvent[]> {
    if (!this.db) return [];
    return this.db.calendarEvents.where('date').equals(date).toArray();
  }

  // ─── User Settings ───
  async getSetting(key: string): Promise<string | undefined> {
    if (!this.db) return undefined;
    const setting = await this.db.userSettings.where('key').equals(key).first();
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) return;
    const existing = await this.db.userSettings
      .where('key')
      .equals(key)
      .first();
    if (existing) {
      await this.db.userSettings.update(existing.id!, { value });
    } else {
      await this.db.userSettings.add({ key, value });
    }
  }

  // ─── Backup / Restore (Export/Import JSON directo a iOS Files) ───
  async exportDatabase(): Promise<void> {
    if (!this.db) return;
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      tables: {
        stepProgress: await this.db.stepProgress.toArray(),
        shoppingItems: await this.db.shoppingItems.toArray(),
        todoItems: await this.db.todoItems.toArray(),
        dailyCheckIns: await this.db.dailyCheckIns.toArray(),
        calendarEvents: await this.db.calendarEvents.toArray(),
        userSettings: await this.db.userSettings.toArray(),
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotom-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importDatabase(file: File): Promise<void> {
    if (!this.db) return;
    const text = await file.text();
    const data = JSON.parse(text);

    await this.db.transaction(
      'rw',
      [
        this.db.stepProgress,
        this.db.shoppingItems,
        this.db.todoItems,
        this.db.dailyCheckIns,
        this.db.calendarEvents,
        this.db.userSettings,
      ],
      async () => {
        // Clear all tables
        await this.db!.stepProgress.clear();
        await this.db!.shoppingItems.clear();
        await this.db!.todoItems.clear();
        await this.db!.dailyCheckIns.clear();
        await this.db!.calendarEvents.clear();
        await this.db!.userSettings.clear();

        // Strip auto-generated IDs so Dexie creates fresh sequential ones
        const stripId = <T extends { id?: number }>(items: T[]): T[] =>
          items.map(({ id, ...rest }) => rest as T);

        if (data.tables?.stepProgress)
          await this.db!.stepProgress.bulkAdd(stripId(data.tables.stepProgress));
        if (data.tables?.shoppingItems)
          await this.db!.shoppingItems.bulkAdd(
            stripId(data.tables.shoppingItems)
          );
        if (data.tables?.todoItems)
          await this.db!.todoItems.bulkAdd(stripId(data.tables.todoItems));
        if (data.tables?.dailyCheckIns)
          await this.db!.dailyCheckIns.bulkAdd(
            stripId(data.tables.dailyCheckIns)
          );
        if (data.tables?.calendarEvents)
          await this.db!.calendarEvents.bulkAdd(
            stripId(data.tables.calendarEvents)
          );
        if (data.tables?.userSettings)
          await this.db!.userSettings.bulkAdd(stripId(data.tables.userSettings));
      }
    );

    // Refresh all signals
    await this.initializeData();
  }
}
