import type { Category } from './types';

/** Returns a category and every nested descendant without looping on malformed parent cycles. */
export function categoryTreeIds(categories: Category[], rootId: string): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    result.push(id);
    for (const child of categories) {
      if (child.parentId === id && !visited.has(child.id)) queue.push(child.id);
    }
  }
  return result;
}

export function categoryDescendantIds(categories: Category[], rootId: string): string[] {
  return categoryTreeIds(categories, rootId).filter((id) => id !== rootId);
}

/** True when a product is assigned directly to a category or any of its descendants. */
export function productMatchesCategoryTree(product: { categoryId: string; categoryIds?: string[] }, treeIds: string[]): boolean {
  const assigned = new Set([product.categoryId, ...(product.categoryIds ?? [])].filter(Boolean));
  return treeIds.some((id) => assigned.has(id));
}

/** Returns directly assigned category IDs plus every ancestor, for memberships and order snapshots. */
export function productCategoryMembershipIds(
  categories: Category[],
  product: { categoryId: string; categoryIds?: string[] },
): string[] {
  const ids = new Set([product.categoryId, ...(product.categoryIds ?? [])].filter(Boolean));
  const queue = [...ids];
  while (queue.length) {
    const id = queue.pop()!;
    const category = categories.find((c) => c.id === id);
    if (category?.parentId && !ids.has(category.parentId)) {
      ids.add(category.parentId);
      queue.push(category.parentId);
    }
  }
  return [...ids];
}

/** Public availability only; never expose the numeric inventory count. Variant stock controls products with variants. */
export function productIsAvailable(product: { stock: number; variants?: { stock: number }[] }): boolean {
  return product.variants?.length ? product.variants.some((variant) => variant.stock > 0) : product.stock > 0;
}
