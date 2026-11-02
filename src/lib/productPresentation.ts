import type { Product } from './types';
import type { Lang } from './i18n';

export function categoryName(category: { nameEn: string; nameAr: string; nameHe?: string }, lang: Lang): string {
  return lang === 'ar' ? category.nameAr : lang === 'he' ? (category.nameHe || category.nameEn) : category.nameEn;
}

// Product/model names intentionally stay in their brand's original display language.
export function productName(product: Product, lang: Lang): string {
  return lang === 'ar' ? product.nameAr : product.nameEn;
}
