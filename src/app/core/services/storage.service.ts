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
  CustomCatalogItem,
} from '../models/state.models';
import type { Recipe, Ingredient, Step, CatalogItem, LaundryGuide } from '../models/catalog.models';

// ─── Dexie Database Definition ───
export class RotomDB extends Dexie {
  stepProgress!: Table<StepProgress, number>;
  shoppingItems!: Table<ShoppingItem, number>;
  todoItems!: Table<TodoItem, number>;
  dailyCheckIns!: Table<DailyCheckIn, number>;
  calendarEvents!: Table<CalendarEvent, number>;
  userSettings!: Table<UserSettings, number>;
  customCatalogItems!: Table<CustomCatalogItem, string>;

  constructor() {
    super('Rotom');
    this.version(2).stores({
      stepProgress: '++id, catalogItemId, [catalogItemId+stepOrder]',
      shoppingItems: '++id, name, store, category, checked, sourceRecipeId',
      todoItems: '++id, category, priority, completed, dueDate',
      dailyCheckIns: '++id, &date',
      calendarEvents: '++id, date, type, completed',
      userSettings: '++id, &key',
      customCatalogItems: '&id, type, title',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private db?: RotomDB;

  /**
   * Callback invocado ante cualquier mutación de datos en Dexie
   * para disparar el guardado automático del PC en segundo plano.
   */
  onDataChanged?: () => void;

  // ─── Reactive Signals ───
  readonly shoppingList = signal<ShoppingItem[]>([]);
  readonly todoList = signal<TodoItem[]>([]);
  readonly checkIns = signal<DailyCheckIn[]>([]);
  readonly calendarEvents = signal<CalendarEvent[]>([]);
  readonly customCatalogItems = signal<CustomCatalogItem[]>([]);

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
      this.refreshCustomItems(),
      this.checkPersistedStatus(),
    ]);
  }

  private notifyChange(): void {
    if (this.onDataChanged) {
      this.onDataChanged();
    }
  }

  // ─── Safari WebKit Persistent Storage Check ───
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

  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      try {
        const granted = await navigator.storage.persist();
        this.isPersistent.set(granted);
        return granted;
      } catch (err) {
        console.warn('Storage persist request ignored:', err);
      }
    }
    if (this.isStandalone()) {
      this.isPersistent.set(true);
      return true;
    }
    return false;
  }

  // ─── Custom Catalog Items (Crear Recetas & Lavado por Usuario) ───
  async refreshCustomItems(): Promise<void> {
    if (!this.db) return;
    const items = await this.db.customCatalogItems.toArray();
    this.customCatalogItems.set(items);
  }

  async addCustomItem(item: CustomCatalogItem): Promise<void> {
    if (!this.db) return;
    await this.db.customCatalogItems.put(item);
    await this.refreshCustomItems();
    this.notifyChange();
  }

  async updateCustomItem(item: CustomCatalogItem): Promise<void> {
    if (!this.db) return;
    await this.db.customCatalogItems.put(item);
    await this.refreshCustomItems();
    this.notifyChange();
  }

  async deleteCustomItem(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.customCatalogItems.delete(id);
    await this.refreshCustomItems();
    this.notifyChange();
  }

  /**
   * Añade un paso tanto a una receta/guía creada por el usuario como a una del catálogo base.
   */
  async addStepToCatalogItem(
    itemId: string,
    newStepText: string,
    duration?: number,
    baseItem?: CatalogItem
  ): Promise<void> {
    if (!this.db) return;
    const existing = await this.db.customCatalogItems.get(itemId);
    if (existing) {
      const order = existing.steps.length + 1;
      existing.steps.push({
        order,
        instruction: newStepText,
        durationMinutes: duration,
      });
      await this.db.customCatalogItems.put(existing);
      await this.refreshCustomItems();
      this.notifyChange();
      return;
    }

    // Si es un ítem default del bundle; lo convertimos en editable en Dexie preservando todo su contenido
    if (baseItem) {
      const clonedSteps = [...baseItem.steps];
      const newOrder = clonedSteps.length + 1;
      clonedSteps.push({
        order: newOrder,
        instruction: newStepText,
        durationMinutes: duration,
      });

      const customWrapper: CustomCatalogItem = {
        id: baseItem.id,
        type: baseItem.type,
        title: baseItem.title,
        description: baseItem.description,
        coverImage: baseItem.coverImage,
        tags: [...baseItem.tags],
        createdAt: new Date().toISOString(),
        steps: clonedSteps,
      };

      if (baseItem.type === 'recipe') {
        const r = baseItem as Recipe;
        customWrapper.servings = r.servings;
        customWrapper.prepTimeMinutes = r.prepTimeMinutes;
        customWrapper.cookTimeMinutes = r.cookTimeMinutes;
        customWrapper.difficulty = r.difficulty;
        customWrapper.ingredients = [...r.ingredients];
      } else {
        const l = baseItem as LaundryGuide;
        customWrapper.garmentType = l.garmentType;
        customWrapper.fabricCare = [...l.fabricCare];
        customWrapper.washTemp = l.washTemp;
        customWrapper.dryMethod = l.dryMethod;
        customWrapper.ironTemp = l.ironTemp;
        customWrapper.tips = l.tips ? [...l.tips] : [];
      }

      await this.db.customCatalogItems.put(customWrapper);
      await this.refreshCustomItems();
      this.notifyChange();
      return;
    }

    // Fallback básico
    const customWrapper: CustomCatalogItem = {
      id: itemId,
      type: itemId.startsWith('rec') ? 'recipe' : 'laundry',
      title: itemId,
      description: '',
      tags: [],
      createdAt: new Date().toISOString(),
      steps: [{ order: 1, instruction: newStepText, durationMinutes: duration }],
    };
    await this.db.customCatalogItems.put(customWrapper);
    await this.refreshCustomItems();
    this.notifyChange();
  }

  // ─── Step Progress (Checkmarks en Pasos) ───
  async getStepProgress(catalogItemId: string): Promise<StepProgress[]> {
    if (!this.db) return [];
    return this.db.stepProgress
      .where('catalogItemId')
      .equals(catalogItemId)
      .sortBy('stepOrder');
  }

  async getAllStepProgress(): Promise<StepProgress[]> {
    if (!this.db) return [];
    return this.db.stepProgress.toArray();
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
    this.notifyChange();
  }

  async resetSteps(catalogItemId: string): Promise<void> {
    if (!this.db) return;
    await this.db.stepProgress.where('catalogItemId').equals(catalogItemId).delete();
    this.notifyChange();
  }

  // ─── Shopping List (Éxito & D1) ───
  async refreshShoppingList(): Promise<void> {
    if (!this.db) return;
    const items = await this.db.shoppingItems.toArray();
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
    this.notifyChange();
  }

  async updateShoppingItem(id: number, updates: Partial<Omit<ShoppingItem, 'id'>>): Promise<void> {
    if (!this.db) return;
    await this.db.shoppingItems.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await this.refreshShoppingList();
    this.notifyChange();
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
      this.notifyChange();
    }
  }

  async removeShoppingItem(id: number): Promise<void> {
    if (!this.db) return;
    await this.db.shoppingItems.delete(id);
    await this.refreshShoppingList();
    this.notifyChange();
  }

  async clearCheckedItems(): Promise<void> {
    if (!this.db) return;
    const checked = this.shoppingList().filter((i) => i.checked);
    await this.db.shoppingItems.bulkDelete(checked.map((i) => i.id!));
    await this.refreshShoppingList();
    this.notifyChange();
  }

  async pushIngredientsToShoppingList(
    recipe: Recipe | CustomCatalogItem,
    targetStore: SupermarketStore = 'D1'
  ): Promise<number> {
    if (!this.db || !recipe.ingredients) return 0;
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
      this.notifyChange();
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
    this.notifyChange();
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
      this.notifyChange();
    }
  }

  async removeTodo(id: number): Promise<void> {
    if (!this.db) return;
    await this.db.todoItems.delete(id);
    await this.refreshTodoList();
    this.notifyChange();
  }

  // ─── Daily Check-Ins & Calendar con Recurrencia Semanal ───
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
    this.notifyChange();
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
    this.notifyChange();
  }

  /**
   * Agenda una receta en un día y permite programar su repetición en semanas siguientes
   */
  async scheduleRecipeWithRecurrence(params: {
    recipeId: string;
    recipeTitle: string;
    startDate: string;        // YYYY-MM-DD
    time?: string;
    repeatWeeks: number;      // 0 = solo ese día, 1 = la próxima semana, 4 = próximas 4 semanas
  }): Promise<number> {
    if (!this.db) return 0;
    const seriesId = `series-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const [year, month, day] = params.startDate.split('-').map(Number);
    const eventsToAdd: Omit<CalendarEvent, 'id'>[] = [];

    const totalWeeks = Math.max(1, params.repeatWeeks + 1);
    for (let w = 0; w < totalWeeks; w++) {
      const d = new Date(year, month - 1, day + w * 7);
      const dateStr = d.toISOString().slice(0, 10);
      eventsToAdd.push({
        title: params.recipeTitle,
        date: dateStr,
        time: params.time || 'Almuerzo',
        type: 'comida',
        linkedItemId: params.recipeId,
        linkedItemTitle: params.recipeTitle,
        recurrenceSeriesId: params.repeatWeeks > 0 ? seriesId : undefined,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }

    await this.db.calendarEvents.bulkAdd(eventsToAdd as CalendarEvent[]);
    await this.refreshCalendarEvents();
    this.notifyChange();
    return eventsToAdd.length;
  }

  async toggleCalendarEvent(id: number): Promise<void> {
    if (!this.db) return;
    const event = await this.db.calendarEvents.get(id);
    if (event) {
      await this.db.calendarEvents.update(id, { completed: !event.completed });
      await this.refreshCalendarEvents();
      this.notifyChange();
    }
  }

  async removeCalendarEvent(id: number): Promise<void> {
    if (!this.db) return;
    await this.db.calendarEvents.delete(id);
    await this.refreshCalendarEvents();
    this.notifyChange();
  }

  async getEventsForDate(date: string): Promise<CalendarEvent[]> {
    if (!this.db) return [];
    return this.db.calendarEvents.where('date').equals(date).toArray();
  }

  async getEventsForMonth(year: number, month: number): Promise<CalendarEvent[]> {
    if (!this.db) return [];
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return this.db.calendarEvents
      .filter((e) => e.date.startsWith(prefix))
      .toArray();
  }

  // ─── Bulk Sync Methods (PULL desde la nube hacia el teléfono) ───
  async bulkSyncShoppingItems(remoteItems: ShoppingItem[]): Promise<void> {
    if (!this.db) return;
    await this.db.shoppingItems.clear();
    const cleanItems = remoteItems.map(({ id, ...rest }) => ({
      ...rest,
      store: rest.store || ('D1' as SupermarketStore),
    }));
    if (cleanItems.length > 0) {
      await this.db.shoppingItems.bulkAdd(cleanItems as ShoppingItem[]);
    }
    await this.refreshShoppingList();
  }

  async bulkSyncCustomItems(remoteItems: CustomCatalogItem[]): Promise<void> {
    if (!this.db) return;
    await this.db.customCatalogItems.clear();
    if (remoteItems.length > 0) {
      await this.db.customCatalogItems.bulkAdd(remoteItems);
    }
    await this.refreshCustomItems();
  }

  async bulkSyncCalendarEvents(remoteEvents: CalendarEvent[]): Promise<void> {
    if (!this.db) return;
    await this.db.calendarEvents.clear();
    const clean = remoteEvents.map(({ id, ...rest }) => rest as CalendarEvent);
    if (clean.length > 0) {
      await this.db.calendarEvents.bulkAdd(clean);
    }
    await this.refreshCalendarEvents();
  }

  async bulkSyncTodos(remoteTodos: TodoItem[]): Promise<void> {
    if (!this.db) return;
    await this.db.todoItems.clear();
    const clean = remoteTodos.map(({ id, ...rest }) => rest as TodoItem);
    if (clean.length > 0) {
      await this.db.todoItems.bulkAdd(clean);
    }
    await this.refreshTodoList();
  }

  async bulkSyncStepProgress(remoteProgress: StepProgress[]): Promise<void> {
    if (!this.db) return;
    await this.db.stepProgress.clear();
    const clean = remoteProgress.map(({ id, ...rest }) => rest as StepProgress);
    if (clean.length > 0) {
      await this.db.stepProgress.bulkAdd(clean);
    }
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

  // ─── Backup / Restore (JSON) ───
  async exportDatabase(): Promise<string> {
    if (!this.db) return '{}';
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.2.0',
      tables: {
        stepProgress: await this.db.stepProgress.toArray(),
        shoppingItems: await this.db.shoppingItems.toArray(),
        todoItems: await this.db.todoItems.toArray(),
        calendarEvents: await this.db.calendarEvents.toArray(),
        customCatalogItems: await this.db.customCatalogItems.toArray(),
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
        this.db.customCatalogItems,
        this.db.userSettings,
      ],
      async () => {
        await this.db!.stepProgress.clear();
        await this.db!.shoppingItems.clear();
        await this.db!.todoItems.clear();
        await this.db!.calendarEvents.clear();
        await this.db!.customCatalogItems.clear();
        await this.db!.userSettings.clear();

        const stripId = <T extends { id?: number }>(items: T[]): T[] =>
          items.map(({ id, ...rest }) => rest as T);

        if (data.tables?.stepProgress) await this.db!.stepProgress.bulkAdd(stripId(data.tables.stepProgress));
        if (data.tables?.shoppingItems) await this.db!.shoppingItems.bulkAdd(stripId(data.tables.shoppingItems));
        if (data.tables?.todoItems) await this.db!.todoItems.bulkAdd(stripId(data.tables.todoItems));
        if (data.tables?.calendarEvents) await this.db!.calendarEvents.bulkAdd(stripId(data.tables.calendarEvents));
        if (data.tables?.customCatalogItems) await this.db!.customCatalogItems.bulkAdd(data.tables.customCatalogItems);
        if (data.tables?.userSettings) await this.db!.userSettings.bulkAdd(stripId(data.tables.userSettings));
      }
    );
    await this.initializeData();
    this.notifyChange();
  }
}
