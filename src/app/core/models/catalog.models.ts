// ─── Catálogo Polimórfico: Recetas de Cocina y Guías de Lavado ───

export type CatalogItemType = 'recipe' | 'laundry';

/** Base compartida para todo ítem del catálogo estático */
export interface CatalogItemBase {
  id: string;
  type: CatalogItemType;
  title: string;
  description: string;
  coverImage: string;        // ruta relativa dentro de assets/images/
  tags: string[];
  createdAt: string;         // ISO 8601
}

/** Ingrediente de una receta */
export interface Ingredient {
  name: string;
  quantity: string;          // "200g", "2 tazas", "al gusto"
  category: IngredientCategory;
  optional: boolean;
}

export type IngredientCategory =
  | 'proteína'
  | 'vegetal'
  | 'lácteo'
  | 'grano'
  | 'condimento'
  | 'líquido'
  | 'otro';

/** Paso con imagen opcional */
export interface Step {
  order: number;
  instruction: string;
  image?: string;            // ruta relativa dentro de assets/images/
  durationMinutes?: number;
}

/** Receta de cocina */
export interface Recipe extends CatalogItemBase {
  type: 'recipe';
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: 'fácil' | 'intermedio' | 'avanzado';
  ingredients: Ingredient[];
  steps: Step[];
  nutrition?: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

/** Símbolo de cuidado de lavado */
export interface CareSymbol {
  icon: string;              // ruta a SVG del símbolo
  label: string;
  description: string;
}

/** Guía de lavado */
export interface LaundryGuide extends CatalogItemBase {
  type: 'laundry';
  garmentType: string;       // "Algodón blanco", "Lana delicada", etc.
  fabricCare: CareSymbol[];
  washTemp: string;
  dryMethod: string;
  ironTemp: string;
  steps: Step[];
  tips: string[];
}

/** Unión discriminada — el catálogo completo */
export type CatalogItem = Recipe | LaundryGuide;

export interface Catalog {
  version: string;
  lastUpdated: string;
  items: CatalogItem[];
}
