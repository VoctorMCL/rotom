import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Dexie, { type Table } from 'dexie';
import type {
  StepProgress,
  ShoppingItem,
  SupermarketStore,
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
      shoppingItems: '++id, name, store, category, checked, sourceRecipeId',
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

  // ─── Safari & Storage Status Signals ───
  readonly isPersistent = signal(false);
  readonly isStandalone = signal(false);

  // ─── Computed Values ───
  readonly uncheckedShoppingCount = computed(
    () => this.shoppingList().filter((i) => !i.checked).length
  );
  readonly pendingTodoCount = computed(
    () => this.todoList().filter((t) => !t.completed).length
  );

  readonly shoppingByStore = computed(() => {
    const list = this.shoppingList();
    return {
      exito: list.filter((i) => i.store === 'Éxito'),
      d1: list.filter((i) => i.store === 'D1'),
      otro: list.filter((i) => i.store !== 'Éxito' && i.store !== 'D1'),
    };
  });

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
      this.detectStandalone();
      this.db = new RotomDB();
      this.initializeData();
    }
  }

  private detectStandalone(): void {
    if (typeof window !== 'undefined') {
      const isStandalonePwa =
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
      this.isStandalone.set(isStandalonePwa);
    }
  }

  private async initializeData(): Promise<void> {
    if (!this.db) return;
    await Promise.all([
      this.refreshShoppingList(),
      this.refreshTodoList(),
      this.refreshCheckIns(),
      this.refreshCalendarEvents(),
      this.checkPersistedStatus(),
    ]);
  }

  // ─── Safari WebKit Persistent Storage Check ───
  /**
   * En iOS Safari, persist() SOLO se puede ejecutar ante un gesto de usuario explícito.
   * Al iniciar, usamos persisted() que es de solo lectura y no arroja error.
   */
  async checkPersistedStatus(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
      try {
        const persisted = await navigator.storage.persisted();
        this.isPersistent.set(persisted);
        return persisted;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Llamado únicamente al pulsar el botón del usuario (Touch event).
   * En iOS Safari, las PWAs instaladas en la pantalla de inicio tienen aislamiento permanente.
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      try {
        const granted = await navigator.storage.persist();
        this.isPersistent.set(granted);
        return granted;
      } catch (err) {
        console.warn('Storage persist request ignored by browser:', err);
      }
    }
    // Si está en Standalone PWA en iOS, WebKit preserva los datos
    if (this.isStandalone()) {
      this.isPersistent.set(true);
      return true;
    }
    return false;
  }

  // ─── Step Progress (Wiki) ───
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
    await this.db.stepProgress.where('catalogItemId').equals(catalogItemId).delete();
  }

  // ─── Shopping List (Éxito & D1) ───
  async refreshShoppingList(): Promise<void> {
    if (!this.db) return;
    const items = await this.db.shoppingItems.toArray();
    // Compatibilidad: si algún ítem viejo no tiene store, asignar D1
    const normalized = items.map((i) => ({
      ...i,
      store: i.store || ('D1' as SupermarketStore),
    }));
    this.shoppingList.set(normalized);
  }

  async addShoppingItem(item: Omit<ShoppingItem, 'id'>): Promise<void> {
    if (!this.db) return;
    await this.db.shoppingItems.add(item as ShoppingItem);
    await this.refreshShoppingList();
  }

  async updateShoppingItem(id: number, updates: Partial<Omit<ShoppingItem, 'id'>>): Promise<void> {
    if (!this.db) return;
    await this.db.shoppingItems.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await this.refreshShoppingList();
  }

  async toggleShoppingItem(id: number): Promise<void> {
    if (!this.db) return;
    const item = await this.db.shoppingItems.get(id);
    if (item) {
      await this.db.shoppingItems.update(id, {
        checked: !item.checked,
        updatedAt: new Date().toISOString(),
      });
      await this.refreshShoppingList();
    }
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
   * Empuja los ingredientes de una receta hacia la lista de compras.
   * Por defecto asigna D1 (o la tienda que el usuario elija).
   */
  async pushIngredientsToShoppingList(recipe: Recipe, targetStore: SupermarketStore = 'D1'): Promise<number> {
    if (!this.db) return 0;
    const existing = await this.db.shoppingItems.toArray();
    const existingNames = new Set(existing.map((i) => i.name.toLowerCase().trim()));

    const newItems: ShoppingItem[] = recipe.ingredients
      .filter((ing: Ingredient) => !existingNames.has(ing.name.toLowerCase().trim()))
      .map((ing: Ingredient) => ({
        name: ing.name,
        quantity: ing.quantity,
        store: targetStore,
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

  /**
   * Sincronización masiva desde PC o archivo JSON.
   */
  async bulkSyncShoppingItems(remoteItems: ShoppingItem[]): Promise<void> {
    if (!this.db) return;
    await this.db.shoppingItems.clear();
    const cleanItems = remoteItems.map(({ id, ...rest }) => ({
      ...rest,
      store: rest.store || ('D1' as SupermarketStore),
    }));
    await this.db.shoppingItems.bulkAdd(cleanItems as ShoppingItem[]);
    await this.refreshShoppingList();
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

  // ─── Daily Check-Ins & Calendar ───
  async refreshCheckIns(): Promise<void> {
    if (!this.db) return;
    const items = await this.db.dailyCheckIns.orderBy('date').reverse().toArray();
    this.checkIns.set(items);
  }

  async getCheckInForDate(date: string): Promise<DailyCheckIn | undefined> {
    if (!this.db) return undefined;
    return this.db.dailyCheckIns.where('date').equals(date).first();
  }

  async addCheckIn(checkIn: Omit<DailyCheckIn, 'id'>): Promise<void> {
    if (!this.db) return;
    await this.db.dailyCheckIns.put(checkIn as DailyCheckIn);
    await this.refreshCheckIns();
  }

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
      await this.db.calendarEvents.update(id, { completed: !event.completed });
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
    const existing = await this.db.userSettings.where('key').equals(key).first();
    if (existing) {
      await this.db.userSettings.update(existing.id!, { value });
    } else {
      await this.db.userSettings.add({ key, value });
    }
  }

  // ─── Backup / Restore (JSON para Archivos de iOS) ───
  async exportDatabase(): Promise<string> {
    if (!this.db) return '{}';
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.1.0',
      tables: {
        stepProgress: await this.db.stepProgress.toArray(),
        shoppingItems: await this.db.shoppingItems.toArray(),
        todoItems: await this.db.todoItems.toArray(),
        calendarEvents: await this.db.calendarEvents.toArray(),
        userSettings: await this.db.userSettings.toArray(),
      },
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotom-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return jsonStr;
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
        this.db.calendarEvents,
        this.db.userSettings,
      ],
      async () => {
        await this.db!.stepProgress.clear();
        await this.db!.shoppingItems.clear();
        await this.db!.todoItems.clear();
        await this.db!.calendarEvents.clear();
        await this.db!.userSettings.clear();

        const stripId = <T extends { id?: number }>(items: T[]): T[] =>
          items.map(({ id, ...rest }) => rest as T);

        if (data.tables?.stepProgress) await this.db!.stepProgress.bulkAdd(stripId(data.tables.stepProgress));
        if (data.tables?.shoppingItems) await this.db!.shoppingItems.bulkAdd(stripId(data.tables.shoppingItems));
        if (data.tables?.todoItems) await this.db!.todoItems.bulkAdd(stripId(data.tables.todoItems));
        if (data.tables?.calendarEvents) await this.db!.calendarEvents.bulkAdd(stripId(data.tables.calendarEvents));
        if (data.tables?.userSettings) await this.db!.userSettings.bulkAdd(stripId(data.tables.userSettings));
      }
    );
    await this.initializeData();
  }
}
