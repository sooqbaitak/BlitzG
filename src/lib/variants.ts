import type { ProductVariant } from './types';

/** Normalizes modern attributes and older slash-separated option fields into filter facets. */
export function variantAttributes(variant: ProductVariant): Record<string, string> {
  const direct = variant.attributes ?? {};
  if (Object.keys(direct).length) return Object.fromEntries(Object.entries(direct).map(([k, v]) => [k.trim(), String(v).trim()]).filter(([k, v]) => k && v));
  const names = String(variant.optionName ?? '').split(/[|,;/]+/).map((x) => x.trim()).filter(Boolean);
  const values = String(variant.optionValue ?? '').split(/[|,;/]+/).map((x) => x.trim()).filter(Boolean);
  if (names.length && names.length === values.length) return Object.fromEntries(names.map((name, index) => [name, values[index]]));
  if (names.length === 1 && values.length === 1) return { [names[0]]: values[0] };
  return {};
}

export function variantFacets(variants: ProductVariant[]): { name: string; values: string[] }[] {
  const facets = new Map<string, Set<string>>();
  for (const variant of variants) for (const [name, value] of Object.entries(variantAttributes(variant))) {
    if (!name || !value) continue;
    if (!facets.has(name)) facets.set(name, new Set());
    facets.get(name)!.add(value);
  }
  return [...facets.entries()].map(([name, values]) => ({ name, values: [...values].sort((a, b) => a.localeCompare(b)) })).filter((facet) => facet.values.length > 1).sort((a, b) => a.name.localeCompare(b.name));
}

export function variantMatches(variant: ProductVariant, selected: Record<string, string>): boolean {
  const attrs = variantAttributes(variant);
  return Object.entries(selected).filter(([, value]) => value).every(([name, value]) => attrs[name] === value);
}
