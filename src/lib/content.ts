import type { Lang } from './i18n';
import type { StoreSettings } from './types';

export const HOME_COPY = {
  heroBadge: { en: 'YOUR GAMING DESTINATION', ar: 'وجهتك لعالم القيمنق', he: 'יעד הגיימינג שלך' },
  heroHeadlineOne: { en: 'PLAY LOUD.', ar: 'العب بقوة.', he: 'שחק בעוצמה.' },
  heroHeadlineTwo: { en: 'PLAY FASTER.', ar: 'العب بسرعة.', he: 'שחק מהר יותר.' },
  heroSubtitle: { en: 'The latest keyboards, mice, headsets and full PC builds from the world’s best brands — BLITZ prices, delivery across Palestine, cash on delivery.', ar: 'أحدث لوحات المفاتيح، الفئران، السماعات والكمبيوترات من الماركات العالمية — بأسعار بلتز، توصيل لكل فلسطين والدفع عند الاستلام.', he: 'מקלדות, עכברים, אוזניות ומחשבים ממותגים מובילים — במחירי BLITZ, משלוחים ברחבי פלסטין ותשלום במזומן במסירה.' },
  heroShopButton: { en: 'Shop Now', ar: 'تسوّق الآن', he: 'קנה עכשיו' },
  heroBenefitOne: { en: '✓ Gear for your setup', ar: '✓ فئات متنوعة للاعبين', he: '✓ ציוד לכל עמדת גיימינג' },
  heroBenefitTwo: { en: '✓ Clear regional delivery fees', ar: '✓ رسوم توصيل واضحة حسب المنطقة', he: '✓ דמי משלוח ברורים לפי אזור' },
  heroBenefitThree: { en: '✓ Cash on delivery', ar: '✓ دفع عند الاستلام', he: '✓ תשלום במזומן במסירה' },
  dealsSubtitle: { en: 'Selected deals on gaming gear', ar: 'عروض مختارة على معدات القيمنق', he: 'מבצעים נבחרים על ציוד גיימינג' },
  dealsButton: { en: 'View all deals', ar: 'كل العروض', he: 'לכל המבצעים' },
  setupBadge: { en: 'Interactive Feature', ar: 'ميزة تفاعلية', he: 'חוויה אינטראקטיבית' },
  setupSubtitle: { en: 'Browse every product in each category, choose your favorites, watch the total update live, then add your complete setup to the cart.', ar: 'تصفح جميع المنتجات في كل فئة، اختر المفضلة، وشاهد الإجمالي يتحدث لحظياً — ثم أضف التجميعة كاملة للسلة.', he: 'עיינו בכל המוצרים בכל קטגוריה, בחרו את המועדפים וצפו בסכום מתעדכן בזמן אמת — ואז הוסיפו את כל הסטאפ לסל.' },
  setupButton: { en: 'Start Building', ar: 'ابدأ التجهيز', he: 'התחילו לבנות' },
  pcBuildBadge: { en: 'Ready-Built PCs', ar: 'تجميعات جاهزة', he: 'מחשבים מורכבים' },
  pcBuildTitle: { en: 'BLITZ Battle-Ready Rigs', ar: 'أجهزة بلتز الجاهزة للألعاب', he: 'מחשבי BLITZ מוכנים לקרב' },
  pcBuildSubtitle: { en: 'Assembled, tuned and stress-tested in-house. Contact us to confirm build and delivery details.', ar: 'أجهزة مجمعة ومضبوطة ومختبرة من فريق بلتز — تواصل معنا لتأكيد تفاصيل التجميع والتوصيل.', he: 'מחשבים שהורכבו ונבדקו על ידי צוות BLITZ. פנו אלינו לקבלת פרטי הרכבה ומשלוח.' },
  pcBuildButton: { en: 'Browse Full PCs', ar: 'تصفح الأجهزة', he: 'לצפייה במחשבים' },
} as const;
export type HomeCopyKey = keyof typeof HOME_COPY;

export function getHomeCopy(store: StoreSettings, key: HomeCopyKey, lang: Lang): string {
  const override = store.homeContent?.[key]?.[lang];
  return override && override.trim() ? override : HOME_COPY[key][lang];
}

export function getFooterCopy(store: StoreSettings, key: keyof NonNullable<StoreSettings['footerContent']>, lang: Lang, fallback: { en: string; ar: string; he: string }): string {
  const value = store.footerContent?.[key];
  return typeof value === 'string' && value.trim() ? value : fallback[lang];
}
