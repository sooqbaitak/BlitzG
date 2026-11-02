import type { StoreSettings } from './types';
import type { Lang } from './i18n';
export function loyaltyPointsName(store: StoreSettings, lang: Lang): string {
  if (lang === 'ar') return store.loyaltyPointsNameAr?.trim() || 'نقاط BLITZ';
  if (lang === 'he') return store.loyaltyPointsNameHe?.trim() || 'נקודות BLITZ';
  return store.loyaltyPointsNameEn?.trim() || 'BLITZ Points';
}
