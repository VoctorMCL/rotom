// ─── Estado Dinámico Persistido en IndexedDB ───

/** Tiendas de compras frecuentes */
export type SupermarketStore = 'Éxito' | 'D1' | 'Otro';

/** Progreso de un step checkeable (receta o lavado) */
export interface StepProgress {
  id?: number;               // auto-increment PK en Dexie
  catalogItemId: string;
  stepOrder: number;
  completed: boolean;
  completedAt?: string;
}

/** Ítem en la lista de compras */
export interface ShoppingItem {
  id?: number;
  name: string;
  quantity: string;
  store: SupermarketStore;   // 'Éxito' | 'D1' | 'Otro'
  category: string;          // vegetal, proteína, lácteo, etc.
  checked: boolean;
  sourceRecipeId?: string;   // de qué receta se empujó
  addedAt: string;
  updatedAt?: string;
}

/** Tarea en la To-Do list */
export interface TodoItem {
  id?: number;
  title: string;
  notes?: string;
  category: string;
  priority: 'alta' | 'media' | 'baja';
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

/** Check-in diario */
export interface DailyCheckIn {
  id?: number;
  date: string;              // YYYY-MM-DD
  mood: 1 | 2 | 3 | 4 | 5;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  createdAt: string;
}

/** Evento del calendario */
export interface CalendarEvent {
  id?: number;
  title: string;
  date: string;              // YYYY-MM-DD
  time?: string;             // HH:mm
  type: 'comida' | 'lavado' | 'tarea' | 'evento' | 'check-in';
  linkedItemId?: string;     // ID de receta/lavado/todo vinculado
  notes?: string;
  completed: boolean;
  createdAt: string;
}

/** Settings del usuario (PIN hash, sync key, etc.) */
export interface UserSettings {
  id?: number;
  key: string;
  value: string;
}
