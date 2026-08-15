import type {
  CategoryDefinition,
  ArchetypeDefinition,
  ActorTaxonomy,
  CompositeTaxonomyResolution
} from './types';

export const DEFAULT_CATEGORY_ID = 'individual';

export const BUILT_IN_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'individual',
    label: 'Individual',
    description: 'A personal account representing an individual user or autonomous persona.',
    metadata: {}
  },
  {
    id: 'institution',
    label: 'Institution',
    description: 'An organizational or institutional account such as a company, agency, or official entity.',
    metadata: {}
  },
  {
    id: 'media',
    label: 'Media',
    description: 'A news, publication, broadcasting, or content distribution outlet.',
    metadata: {}
  },
  {
    id: 'novelty',
    label: 'Novelty & Entertainment',
    description: 'A satire, meme, parody, or novelty character account.',
    metadata: {}
  }
];

export const BUILT_IN_ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'commentator',
    label: 'Commentator',
    description: 'Provides opinions, reactions, and analysis on ongoing social discourse.',
    category_id: 'individual'
  },
  {
    id: 'journalist',
    label: 'Journalist',
    description: 'Reports on events, publishes updates, and investigates facts.',
    category_id: 'media'
  },
  {
    id: 'satirist',
    label: 'Satirist',
    description: 'Uses humor, irony, and parody to comment on topics.',
    category_id: 'novelty'
  },
  {
    id: 'spokesperson',
    label: 'Official Spokesperson',
    description: 'Represents an organization and communicates formal releases.',
    category_id: 'institution'
  },
  {
    id: 'enthusiast',
    label: 'Enthusiast / Hobbyist',
    description: 'Passionate participant focused on specific niche interests.',
    category_id: 'individual'
  }
];

// In-memory registry maps
const categoryRegistry = new Map<string, CategoryDefinition>();
const archetypeRegistry = new Map<string, ArchetypeDefinition>();

function resetRegistry(): void {
  categoryRegistry.clear();
  archetypeRegistry.clear();
  for (const cat of BUILT_IN_CATEGORIES) {
    categoryRegistry.set(cat.id, { ...cat });
  }
  for (const arch of BUILT_IN_ARCHETYPES) {
    archetypeRegistry.set(arch.id, { ...arch });
  }
}

// Initial populate
resetRegistry();

/**
 * Creates a safe fallback definition for unknown or custom categories.
 */
export function createDefaultCategoryDefinition(categoryId: string): CategoryDefinition {
  return {
    id: categoryId,
    label: categoryId.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: `Custom or user-defined category: ${categoryId}`,
    metadata: { isCustom: true }
  };
}

/**
 * Creates a safe fallback definition for unknown or custom archetypes.
 */
export function createDefaultArchetypeDefinition(archetypeId: string, categoryId?: string): ArchetypeDefinition {
  return {
    id: archetypeId,
    label: archetypeId.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: `Custom or user-defined archetype: ${archetypeId}`,
    ...(categoryId ? { category_id: categoryId } : {}),
    metadata: { isCustom: true }
  };
}

/**
 * Looks up a category definition by ID.
 * Unknown categories return a safe fallback definition rather than throwing.
 */
export function getCategoryDefinition(categoryId: string): CategoryDefinition {
  const existing = categoryRegistry.get(categoryId);
  if (existing) {
    return { ...existing };
  }
  return createDefaultCategoryDefinition(categoryId);
}

/**
 * Looks up an archetype definition by ID.
 * Returns undefined if the archetype is unknown (unknown archetypes remain valid string IDs on Actors).
 */
export function getArchetypeDefinition(archetypeId: string): ArchetypeDefinition | undefined {
  const existing = archetypeRegistry.get(archetypeId);
  return existing ? { ...existing } : undefined;
}

/**
 * Registers or overrides a category definition in the registry.
 */
export function registerCategory(definition: CategoryDefinition): void {
  categoryRegistry.set(definition.id, { ...definition });
}

/**
 * Registers or overrides an archetype definition in the registry.
 */
export function registerArchetype(definition: ArchetypeDefinition): void {
  archetypeRegistry.set(definition.id, { ...definition });
}

/**
 * Lists all registered category definitions.
 */
export function listCategories(): CategoryDefinition[] {
  return Array.from(categoryRegistry.values()).map(c => ({ ...c }));
}

/**
 * Lists all registered archetype definitions.
 */
export function listArchetypes(): ArchetypeDefinition[] {
  return Array.from(archetypeRegistry.values()).map(a => ({ ...a }));
}

/**
 * Utility for tests: resets the registry to built-in state.
 */
export function resetTaxonomyRegistry(): void {
  resetRegistry();
}

export interface RawTaxonomyInput {
  category?: string;
  archetypes?: string[] | string;
  tags?: string[] | string;
}

export type TaxonomyInput =
  | RawTaxonomyInput
  | string
  | undefined
  | null;

/**
 * Normalizes a list of strings (archetypes, tags) by:
 * - Parsing JSON array strings if applicable
 * - Splitting comma-separated strings
 * - Trimming whitespace
 * - Removing empty strings
 * - Deduplicating while preserving first-seen order
 */
function normalizeStringList(input: string[] | string | undefined | null): string[] {
  if (!input) return [];

  let rawList: string[] = [];

  if (Array.isArray(input)) {
    rawList = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          rawList = parsed;
        } else {
          rawList = [trimmed];
        }
      } catch {
        rawList = trimmed.split(',');
      }
    } else {
      rawList = trimmed.split(',');
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of rawList) {
    const clean = typeof item === 'string' ? item.trim() : String(item).trim();
    if (clean.length > 0 && !seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }

  return result;
}

/**
 * Pure normalization and composition helper for ActorTaxonomy.
 * Deduplicates archetype IDs while preserving first-seen order, trims whitespace,
 * and defaults category to 'individual' when omitted or empty.
 */
export function composeTaxonomy(input?: TaxonomyInput): ActorTaxonomy {
  if (!input) {
    return {
      category: DEFAULT_CATEGORY_ID,
      archetypes: []
    };
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    return {
      category: trimmed || DEFAULT_CATEGORY_ID,
      archetypes: []
    };
  }

  const rawCat = typeof input.category === 'string' ? input.category.trim() : '';
  const category = rawCat || DEFAULT_CATEGORY_ID;
  const archetypes = normalizeStringList(input.archetypes);
  const tags = normalizeStringList(input.tags);

  return {
    category,
    archetypes,
    ...(tags.length > 0 ? { tags } : {})
  };
}

/**
 * Resolves an ActorTaxonomy into its full constituent category and archetype definitions.
 * Custom/unknown categories and archetypes receive safe fallback definitions.
 */
export function resolveTaxonomyComposition(
  taxonomy?: ActorTaxonomy | null
): CompositeTaxonomyResolution {
  const normalized = taxonomy ? composeTaxonomy(taxonomy) : composeTaxonomy();

  const categoryDef = getCategoryDefinition(normalized.category);

  const archetypeDefs: ArchetypeDefinition[] = normalized.archetypes.map(archId => {
    const found = getArchetypeDefinition(archId);
    if (found) {
      return { ...found };
    }
    return createDefaultArchetypeDefinition(archId, normalized.category);
  });

  const tags = normalized.tags ? [...normalized.tags] : [];

  return {
    category: categoryDef,
    archetypes: archetypeDefs,
    tags
  };
}

/**
 * Pure semantic description formatter for composite taxonomy.
 * Generates clean descriptive text without LLM system prompt directives.
 */
export function renderTaxonomyDescription(taxonomy?: ActorTaxonomy | null): string {
  if (!taxonomy) return '';

  const normalized = composeTaxonomy(taxonomy);
  const lines: string[] = [];

  if (normalized.category) {
    lines.push(`Category: ${normalized.category}`);
  }

  if (normalized.archetypes && normalized.archetypes.length > 0) {
    lines.push(`Archetypes: ${normalized.archetypes.join(', ')}`);
  }

  if (normalized.tags && normalized.tags.length > 0) {
    lines.push(`Tags: ${normalized.tags.join(', ')}`);
  }

  return lines.join('\n');
}
