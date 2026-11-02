import type { ProductVariant } from './types';
import type { Lang } from './i18n';

export function localizedVariantLabel(variant: ProductVariant, lang: Lang): string {
  if (lang === 'ar') return variant.labelAr?.trim() || variant.label;
  if (lang === 'he') return variant.labelHe?.trim() || variant.labelEn?.trim() || variant.label;
  return variant.labelEn?.trim() || variant.label;
}

/** Normalizes modern attributes and older slash-separated option fields into filter facets. */
export function variantAttributes(variant: ProductVariant, lang: Lang = 'en'): Record<string, string> {
  const localized = lang === 'ar' ? variant.attributesAr : lang === 'he' ? variant.attributesHe : variant.attributesEn;
  const direct = localized && Object.keys(localized).length ? localized : (variant.attributes ?? {});
  if (Object.keys(direct).length) return Object.fromEntries(Object.entries(direct).map(([k, v]) => [k.trim(), String(v).trim()]).filter(([k, v]) => k && v));
  const optionNames = lang === 'ar' ? (variant.optionNameAr || variant.optionName) : lang === 'he' ? (variant.optionNameHe || variant.optionNameEn || variant.optionName) : (variant.optionNameEn || variant.optionName);
  const optionValues = lang === 'ar' ? (variant.optionValueAr || variant.optionValue) : lang === 'he' ? (variant.optionValueHe || variant.optionValueEn || variant.optionValue) : (variant.optionValueEn || variant.optionValue);
  const names = String(optionNames ?? '').split(/[|,;/]+/).map((x) => x.trim()).filter(Boolean);
  const values = String(optionValues ?? '').split(/[|,;/]+/).map((x) => x.trim()).filter(Boolean);
  if (names.length && names.length === values.length) return Object.fromEntries(names.map((name, index) => [name, values[index]]));
  if (names.length === 1 && values.length === 1) return { [names[0]]: values[0] };
  return {};
}

export function variantFacets(variants: ProductVariant[], lang: Lang = 'en'): { name: string; values: string[] }[] {
  const facets = new Map<string, Set<string>>();
  for (const variant of variants) for (const [name, value] of Object.entries(variantAttributes(variant, lang))) {
    if (!name || !value) continue;
    if (!facets.has(name)) facets.set(name, new Set());
    facets.get(name)!.add(value);
  }
  return [...facets.entries()].map(([name, values]) => ({ name, values: [...values].sort((a, b) => a.localeCompare(b)) })).filter((facet) => facet.values.length > 1).sort((a, b) => a.name.localeCompare(b.name));
}

export function variantMatches(variant: ProductVariant, selected: Record<string, string>, lang: Lang = 'en'): boolean {
  const attrs = variantAttributes(variant, lang);
  return Object.entries(selected).filter(([, value]) => value).every(([name, value]) => attrs[name] === value);
}
