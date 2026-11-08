import { Injectable, signal, computed, inject } from '@angular/core';
import { StorageService } from './storage.service';
import type { Catalog, CatalogItem, Recipe, LaundryGuide } from '../models/catalog.models';
import type { CustomCatalogItem } from '../models/state.models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly storage = inject(StorageService);

  readonly staticCatalog = signal<Catalog | null>(null);
  readonly isLoaded = signal(false);
  readonly loadError = signal<string | null>(null);

  /**
   * Catálogo unificado y reactivo: fusiona el catálogo estático con los ítems y pasos
   * personalizados creados en IndexedDB (los custom sobreescriben o agregan a los estáticos).
   * Filtra cualquier elemento marcado con deleted: true.
   */
  readonly allItems = computed<CatalogItem[]>(() => {
    const staticItems = this.staticCatalog()?.items || [];
    const customItems = this.storage.customCatalogItems();

    const customMap = new Map<string, CustomCatalogItem>();
    for (const c of customItems) {
      customMap.set(c.id, c);
    }

    const merged: CatalogItem[] = [];
    for (const s of staticItems) {
      if (customMap.has(s.id)) {
        const custom = customMap.get(s.id)!;
        customMap.delete(s.id);
        if (!custom.deleted) {
          merged.push(custom as unknown as CatalogItem);
        }
      } else {
        merged.push(s);
      }
    }

    // Items completamente nuevos creados por el usuario (no eliminados)
    for (const c of customMap.values()) {
      if (!c.deleted) {
        merged.push(c as unknown as CatalogItem);
      }
    }

    return merged;
  });

  // Aliases reactivos para compatibilidad con vistas existentes
  readonly items = computed(() => this.allItems());
  readonly allRecipes = computed<Recipe[]>(() =>
    this.allItems().filter((i): i is Recipe => i.type === 'recipe')
  );
  readonly recipes = computed(() => this.allRecipes());
  readonly allLaundryGuides = computed<LaundryGuide[]>(() =>
    this.allItems().filter((i): i is LaundryGuide => i.type === 'laundry')
  );
  readonly laundryGuides = computed(() => this.allLaundryGuides());

  constructor() {
    this.loadCatalog();
  }

  async loadCatalog(): Promise<void> {
    try {
      const response = await fetch('assets/data/catalog.json');
      if (!response.ok) throw new Error('Failed to load catalog');

      const data: Catalog = await response.json();
      this.staticCatalog.set(data);
      this.isLoaded.set(true);
    } catch (err) {
      console.error('Error loading catalog:', err);
      this.loadError.set('No se pudo cargar el catálogo estático');
    }
  }

  getItemById(id: string): CatalogItem | undefined {
    return this.allItems().find((i) => i.id === id);
  }

  getRecipeById(id: string): Recipe | undefined {
    return this.allRecipes().find((r) => r.id === id);
  }

  getLaundryGuideById(id: string): LaundryGuide | undefined {
    return this.allLaundryGuides().find((g) => g.id === id);
  }
}
