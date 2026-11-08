import { Injectable, signal } from '@angular/core';
import type { Catalog, CatalogItem, Recipe, LaundryGuide } from '../models/catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  readonly catalog = signal<Catalog | null>(null);
  readonly items = signal<CatalogItem[]>([]);
  readonly recipes = signal<Recipe[]>([]);
  readonly laundryGuides = signal<LaundryGuide[]>([]);
  readonly isLoaded = signal(false);
  readonly loadError = signal<string | null>(null);

  constructor() {
    this.loadCatalog();
  }

  async loadCatalog(): Promise<void> {
    try {
      const response = await fetch('assets/data/catalog.json');
      if (!response.ok) throw new Error('Failed to load catalog');

      const data: Catalog = await response.json();
      this.catalog.set(data);
      this.items.set(data.items);
      this.recipes.set(
        data.items.filter((i): i is Recipe => i.type === 'recipe')
      );
      this.laundryGuides.set(
        data.items.filter((i): i is LaundryGuide => i.type === 'laundry')
      );
      this.isLoaded.set(true);
    } catch (err) {
      console.error('Error loading catalog:', err);
      this.loadError.set('No se pudo cargar el catálogo');
    }
  }

  getItemById(id: string): CatalogItem | undefined {
    return this.items().find((i) => i.id === id);
  }

  getRecipeById(id: string): Recipe | undefined {
    return this.recipes().find((r) => r.id === id);
  }

  getLaundryGuideById(id: string): LaundryGuide | undefined {
    return this.laundryGuides().find((g) => g.id === id);
  }
}
