/**
 * Visual Identity Kit Types
 * Types for project-specific image generation reference system.
 */

export type ImageReferenceCategory =
  | 'character'    // Personaje/mascota de marca
  | 'background'   // Fondos recurrentes
  | 'product'      // Productos fisicos
  | 'element'      // Elementos graficos repetibles (iconos, patrones)
  | 'style'        // Referencia de estilo visual
  | 'environment'  // Entorno/escenario
  | 'prop'         // Objetos/atrezzo
  | 'lighting';    // Referencia de iluminacion

export interface VisualReference {
  id: string;
  projectId: string;
  category: ImageReferenceCategory;
  label: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  aiPromptHint?: string;
  usage: 'always' | 'optional' | 'contextual';
  contextualTriggers?: string[];
  position?: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface VisualIdentityKit {
  projectId: string;
  references: VisualReference[];
  updatedAt: string;
}

/** Labels for each category (for UI display) */
export const IMAGE_REFERENCE_CATEGORY_LABELS: Record<ImageReferenceCategory, string> = {
  character: 'Personaje',
  background: 'Fondo',
  product: 'Producto',
  element: 'Elemento',
  style: 'Estilo',
  environment: 'Entorno',
  prop: 'Atrezzo',
  lighting: 'Iluminacion',
};

/** Color classes for category badges */
export const IMAGE_REFERENCE_CATEGORY_COLORS: Record<ImageReferenceCategory, string> = {
  character: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  background: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  product: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  element: 'bg-green-500/20 text-green-300 border-green-500/30',
  style: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  environment: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  prop: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  lighting: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};
