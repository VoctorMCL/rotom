// ─── Estado Dinámico Persistido en IndexedDB ───
import type { Ingredient, Step, CareSymbol } from './catalog.models';

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

/** Recetas o guías de lavado creadas o modificadas por el usuario */
export interface CustomCatalogItem {
  id: string;                // ej: user-rec-1234 o user-lnd-1234
  type: 'recipe' | 'laundry';
  title: string;
  description: string;
  coverImage?: string;
  tags: string[];
  createdAt: string;

  // Campos específicos de Receta
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  difficulty?: 'fácil' | 'intermedio' | 'avanzado';
  ingredients?: Ingredient[];

  // Campos específicos de Lavado
  garmentType?: string;
  fabricCare?: CareSymbol[];
  washTemp?: string;
  dryMethod?: string;
  ironTemp?: string;
  tips?: string[];

  // Pasos comunes
  steps: Step[];
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

/** Evento del calendario con vinculación a recetas y repetición semanal */
export interface CalendarEvent {
  id?: number;
  title: string;
  date: string;              // YYYY-MM-DD
  time?: string;             // HH:mm o "almuerzo" | "cena"
  type: 'comida' | 'lavado' | 'tarea' | 'evento';
  linkedItemId?: string;     // ID de receta o lavado de la Wiki
  linkedItemTitle?: string;  // Título para navegación directa
  recurrenceSeriesId?: string; // ID único si es una serie recurrente
  completed: boolean;
  createdAt: string;
}

/** Settings del usuario (PIN hash, sync key, etc.) */
export interface UserSettings {
  id?: number;
  key: string;
  value: string;
}
